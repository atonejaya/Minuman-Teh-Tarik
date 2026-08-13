const prisma = require('../../../../config/database');
const { NotFoundError, ValidationError } = require('../../../../exceptions/api-error');
const OutletParStock = require('../../domain/entities/OutletParStock');
const OutletStockCount = require('../../domain/entities/OutletStockCount');
const OutletInventory = require('../../domain/aggregates/OutletInventory');
const OutletParStockRepository = require('../../domain/repositories/OutletParStockRepository');
const OutletStockLedgerRepository = require('../../domain/repositories/OutletStockLedgerRepository');
const OutletStockProjectionRepository = require('../../domain/repositories/OutletStockProjectionRepository');
const OutletStockCountRepository = require('../../domain/repositories/OutletStockCountRepository');
const OutletDelivery = require('../../domain/entities/OutletDelivery');
const OutletDeliveryRepository = require('../../domain/repositories/OutletDeliveryRepository');
const { OutletDeliveryStatus, RETRYABLE_STATUSES } = require('../../domain/constants/OutletDeliveryStatus');
const MovementType = require('../../domain/value-objects/MovementType');
const OutletParStockUpdatedEvent = require('../../domain/events/OutletParStockUpdatedEvent');
const StockCountRecordedEvent = require('../../domain/events/StockCountRecordedEvent');
const SalesCalculatedEvent = require('../../domain/events/SalesCalculatedEvent');
const RefillCalculatedEvent = require('../../domain/events/RefillCalculatedEvent');
const OutletProjectionUpdatedEvent = require('../../domain/events/OutletProjectionUpdatedEvent');
const OutletDeliveryRecordedEvent = require('../../domain/events/OutletDeliveryRecordedEvent');

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * In-process async lock per warung.
 * OutletInventory adalah satu aggregate per warung, sehingga command
 * (stock count / par stock) untuk warung yang sama diserialisasi.
 * Mencegah dua count konkuren membaca current_stock yang sama dan
 * memutus rantai ledger / meng-overcount total_sales.
 *
 * Catatan: lock berlaku per instance proses (single-instance deployment).
 */
const warungLocks = new Map();

function _withWarungLock(warungId, fn) {
  const key = Number(warungId);
  const prev = warungLocks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  warungLocks.set(key, next);
  next.finally(() => {
    if (warungLocks.get(key) === next) {
      warungLocks.delete(key);
    }
  });
  return next;
}

class OutletInventoryService {
  async _emit(tx, event) {
    await tx.outboxEvent.create({
      data: {
        event_name: event.eventName,
        aggregate_id: event.aggregateId.toString(),
        aggregate_type: event.aggregateType,
        correlation_id: event.correlationId,
        causation_id: event.causationId,
        payload: event.payload,
        metadata: event.metadata,
        occurred_at: new Date(event.occurredAt)
      }
    });
  }

  async _ensureWarung(tx, warungId) {
    const warung = await tx.warung.findUnique({ where: { id: Number(warungId) } });
    if (!warung) throw new NotFoundError('WARUNG_NOT_FOUND', 'Outlet (Warung) tidak ditemukan');
    return warung;
  }

  /**
   * Ledger "reference_id" adalah kolom integer; reference_id pada dokumen
   * delivery bersifat bebas (mis. nomor order alfanumerik). Hanya nilai
   * numerik yang dipetakan ke kolom integer, selain itu null.
   */
  _parseIntOrNull(value) {
    const text = String(value);
    if (/^\d+$/.test(text)) return Number(text);
    return null;
  }

  /**
   * POST delivery ke stok outlet (SPRINT 11.1A public API).
   *
   * 1. Validasi entitas OutletDelivery (warung, tanggal, reference, quantity > 0).
   * 2. Idempotent berbasis (referenceType, referenceId):
   *    - Sudah POSTED  -> dikembalikan hasil yang sudah ada (tanpa double stock).
   *    - PENDING/FAILED -> diposting ulang (retry), hanya status retryable.
   * 3. Ledger (Source of Truth) ditulis per item dengan movement
   *    ISSUE_TO_OUTLET; projection diperbarui dalam transaksi yang sama.
   * 4. Emit OutletDeliveryRecordedEvent (transactional outbox).
   */
  async recordDelivery({ warungId, deliveryDate, referenceType, referenceId, performedBy, notes, items }) {
    const entity = new OutletDelivery({
      warungId,
      deliveryDate,
      referenceType,
      referenceId,
      performedBy,
      notes,
      items
    });

    return _withWarungLock(warungId, async () => {
      // Phase 0: validasi prasyarat tanpa persistensi (warung + semua produk
      // harus ada). Produk tidak valid -> NotFoundError, tidak ada dokumen
      // delivery / ledger yang dibuat (atomic validation).
      await prisma.$transaction(async (tx) => {
        await this._ensureWarung(tx, warungId);
        for (const item of entity.items) {
          const productId = Number(item.productId);
          const product = await tx.product.findUnique({ where: { id: productId } });
          if (!product) {
            throw new NotFoundError('PRODUCT_NOT_FOUND', `Produk ${productId} tidak ditemukan`);
          }
        }
      });

      // Phase 1: buat / ambil dokumen delivery (idempotency key).
      const delivery = await prisma.$transaction(async (tx) => {
        const existing = await OutletDeliveryRepository.findByReference(tx, entity.referenceType, entity.referenceId);
        if (existing) return existing;
        return OutletDeliveryRepository.create(tx, { ...entity.toPrisma(), status: OutletDeliveryStatus.PENDING });
      });

      if (!RETRYABLE_STATUSES.includes(delivery.status)) {
        return this._serializeDelivery(delivery, true);
      }

      // Phase 2: post ledger + projection secara atomik, lalu tandai POSTED.
      // Item yang diposting adalah item tersimpan pada dokumen delivery
      // (source of truth) - retry memposting ulang dokumen yang sama.
      try {
        const posted = await prisma.$transaction(async (tx) => {
          const ledger = [];

          for (const item of delivery.items) {
            const productId = Number(item.product_id);
            const product = await tx.product.findUnique({ where: { id: productId } });
            if (!product) {
              throw new NotFoundError('PRODUCT_NOT_FOUND', `Produk ${productId} tidak ditemukan`);
            }

            const projection = await OutletStockProjectionRepository.findByWarungProduct(tx, warungId, productId);
            const qtyBefore = projection ? Number(projection.current_stock) : 0;
            const qty = Number(item.quantity);

            const ledgerRow = await OutletStockLedgerRepository.create(tx, {
              warung_id: Number(warungId),
              product_id: productId,
              batch_id: null,
              movement_type: MovementType.ISSUE_TO_OUTLET,
              qty_before: qtyBefore,
              qty_change: qty,
              qty_after: qtyBefore + qty,
              reference_type: entity.referenceType,
              reference_id: this._parseIntOrNull(entity.referenceId),
              visit_id: null,
              notes: entity.notes,
              created_by: entity.performedBy
            });

            const projRow = await OutletStockProjectionRepository.applyDelivery(tx, warungId, productId, {
              qty,
              deliveredAt: entity.deliveryDate
            });

            ledger.push({
              product_id: productId,
              qty_before: ledgerRow.qty_before,
              qty_change: ledgerRow.qty_change,
              qty_after: ledgerRow.qty_after,
              version: Number(projRow.version)
            });
          }

          await OutletDeliveryRepository.updateStatus(tx, delivery.id, OutletDeliveryStatus.POSTED, {
            posted_at: new Date(),
            error_message: null
          });

          const deliveryDateISO = entity.deliveryDate.toISOString();
          await this._emit(tx, new OutletDeliveryRecordedEvent(delivery.id, {
            deliveryId: delivery.id,
            outletId: Number(warungId),
            warungId: Number(warungId),
            visitId: entity.referenceType === 'SALES_VISIT' ? this._parseIntOrNull(entity.referenceId) : null,
            deliveryDate: deliveryDateISO,
            referenceType: entity.referenceType,
            referenceId: entity.referenceId,
            items: ledger.map(l => ({
              productId: l.product_id,
              quantity: l.qty_change,
              qtyBefore: l.qty_before,
              qtyAfter: l.qty_after,
              version: l.version
            })),
            performedBy: entity.performedBy,
            timestamp: deliveryDateISO
          }, { userId: entity.performedBy }));

          return {
            delivery_id: delivery.id,
            items: ledger
          };
        });

        return {
          delivery_id: posted.delivery_id,
          status: OutletDeliveryStatus.POSTED,
          reference_type: entity.referenceType,
          reference_id: entity.referenceId,
          delivery_date: entity.deliveryDate,
          items: posted.items,
          idempotent: false
        };
      } catch (error) {
        // Hanya FAILED yang boleh dicoba ulang; tandai lalu lempar ulang.
        await prisma.$transaction((tx) =>
          OutletDeliveryRepository.updateStatus(tx, delivery.id, OutletDeliveryStatus.FAILED, {
            error_message: error && error.message ? String(error.message).slice(0, 500) : 'UNKNOWN'
          })
        ).catch(() => {});
        throw error;
      }
    });
  }

  _serializeDelivery(delivery, idempotent = false) {
    return {
      delivery_id: delivery.id,
      status: delivery.status,
      reference_type: delivery.reference_type,
      reference_id: delivery.reference_id,
      delivery_date: delivery.delivery_date,
      items: delivery.items.map(i => ({
        productId: i.product_id,
        quantity: i.quantity
      })),
      idempotent: Boolean(idempotent)
    };
  }

  /**
   * PUT /par-stock - Batch upsert Par Stock.
   */
  async upsertParStock(warungId, items, userId) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('items wajib diisi minimal 1 produk');
    }

    const entities = items.map(item => new OutletParStock({
      warungId,
      productId: item.product_id,
      parQty: item.par_qty,
      minQty: item.min_qty,
      maxQty: item.max_qty,
      priority: item.priority,
      isActive: item.is_active
    }));

    return _withWarungLock(warungId, () => prisma.$transaction(async (tx) => {
      await this._ensureWarung(tx, warungId);

      const rows = [];
      const versionByProduct = {};
      for (const entity of entities) {
        const row = await OutletParStockRepository.upsert(tx, warungId, {
          ...entity.toPrisma(),
          created_by: userId
        });
        rows.push(row);
        const projRow = await OutletStockProjectionRepository.syncParQty(tx, warungId, entity.productId, entity.parQty);
        versionByProduct[entity.productId] = Number(projRow.version);
      }

      const event = new OutletParStockUpdatedEvent(Number(warungId), {
        warungId: Number(warungId),
        items: rows.map(r => ({
          productId: r.product_id,
          parQty: r.par_qty,
          minQty: r.min_qty,
          maxQty: r.max_qty,
          priority: r.priority,
          isActive: r.is_active,
          version: versionByProduct[r.product_id] ?? 1
        }))
      }, { userId });

      await this._emit(tx, event);

      return rows;
    }));
  }

  /**
   * GET /par-stock - Daftar par stock satu outlet.
   */
  async getParStock(warungId, query = {}) {
    const rows = await OutletParStockRepository.listByWarung(prisma, warungId, {
      activeOnly: query.active_only === 'true'
    });
    return rows;
  }

  /**
   * POST /:warungId/stock-count - Rekam counting fisik, jalankan engines,
   * update ledger (source of truth) & projection, emit domain events.
   */
  async recordStockCount(warungId, payload, userId) {
    const entity = new OutletStockCount({
      warungId,
      salesId: payload.sales_id,
      visitId: payload.visit_id,
      countedAt: payload.counted_at,
      items: payload.items
    });

    return _withWarungLock(warungId, () => prisma.$transaction(async (tx) => {
      await this._ensureWarung(tx, warungId);

      const count = await OutletStockCountRepository.create(tx, {
        warung_id: Number(warungId),
        sales_id: entity.salesId,
        visit_id: entity.visitId,
        counted_at: entity.countedAt,
        created_by: userId,
        items: entity.items.map(item => ({
          product_id: item.product_id,
          physical_qty: item.physical_qty
        }))
      });

      const aggregate = new OutletInventory(Number(warungId));

      const sales = [];
      const refills = [];

      for (const item of count.items) {
        const productId = item.product_id;
        const projection = await OutletStockProjectionRepository.findByWarungProduct(tx, warungId, productId);

        const currentBalance = projection ? Number(projection.current_stock) : 0;
        const parQty = projection ? Number(projection.par_qty) : 0;
        const physicalQty = item.physical_qty;

        const result = aggregate.processItem({
          productId,
          physicalQty,
          currentBalance,
          parQty,
          denominator: currentBalance
        });

        // Ledger - Source of Truth
        await OutletStockLedgerRepository.create(tx, {
          warung_id: Number(warungId),
          product_id: productId,
          batch_id: item.batch_id || null,
          movement_type: MovementType.SALE,
          qty_before: result.ledgerEntry.qtyBefore,
          qty_change: result.ledgerEntry.qtyChange,
          qty_after: result.ledgerEntry.qtyAfter,
          reference_type: 'STOCK_COUNT',
          reference_id: count.id,
          visit_id: entity.visitId,
          created_by: userId
        });

        // Projection - Read Model
        const now = new Date();
        const daysActive = projection && projection.last_count_at
          ? Math.max(1, Math.ceil((now.getTime() - new Date(projection.last_count_at).getTime()) / DAY_MS))
          : 1;
        const newTotalSales = (projection ? Number(projection.total_sales) : 0) + result.calculatedSales;
        const averageDailySales = Math.round((newTotalSales / daysActive) * 100) / 100;

        const projRow = await OutletStockProjectionRepository.applyCountResult(tx, warungId, productId, {
          currentStock: result.physicalQty,
          calculatedSales: result.calculatedSales,
          requiredRefill: result.requiredRefill,
          sellThrough: result.sellThrough,
          averageDailySales,
          salesIncrement: result.calculatedSales,
          lastVisitId: entity.visitId,
          lastCountAt: now
        });

        sales.push({
          product_id: productId,
          qty_before: result.ledgerEntry.qtyBefore,
          qty_sold: result.calculatedSales,
          qty_after: result.ledgerEntry.qtyAfter,
          physical_qty: result.physicalQty,
          version: Number(projRow.version)
        });

        refills.push({
          product_id: productId,
          par_qty: parQty,
          current_stock: result.physicalQty,
          required_refill: result.requiredRefill
        });
      }

      // Domain Events
      const salesById = new Map(sales.map(s => [s.product_id, s]));
      const events = [
        new StockCountRecordedEvent(count.id, {
          stockCountId: count.id,
          warungId: Number(warungId),
          salesId: entity.salesId,
          visitId: entity.visitId,
          countedAt: entity.countedAt,
          items: count.items.map(i => ({
            productId: i.product_id,
            physicalQty: i.physical_qty,
            version: salesById.get(i.product_id).version
          }))
        }, { userId }),
        new SalesCalculatedEvent(Number(warungId), {
          warungId: Number(warungId),
          stockCountId: count.id,
          items: sales.map(s => ({ productId: s.product_id, qtySold: s.qty_sold }))
        }, { userId }),
        new RefillCalculatedEvent(Number(warungId), {
          warungId: Number(warungId),
          stockCountId: count.id,
          items: refills.map(r => ({ productId: r.product_id, requiredRefill: r.required_refill }))
        }, { userId }),
        new OutletProjectionUpdatedEvent(Number(warungId), {
          warungId: Number(warungId),
          stockCountId: count.id,
          items: sales.map(s => ({
            productId: s.product_id,
            currentStock: s.qty_after,
            calculatedSales: s.qty_sold,
            requiredRefill: refills.find(r => r.product_id === s.product_id).required_refill,
            version: s.version
          }))
        }, { userId })
      ];

      for (const event of events) {
        await this._emit(tx, event);
      }

      const projectionRows = await OutletStockProjectionRepository.listByWarung(tx, warungId);

      return {
        sales,
        refills,
        projection: this._serializeProjection(projectionRows)
      };
    }));
  }

  /**
   * GET /:warungId/projection
   */
  async getProjection(warungId, query = {}) {
    const rows = await OutletStockProjectionRepository.listByWarung(prisma, warungId);
    const filtered = query.product_id ? rows.filter(r => r.product_id === Number(query.product_id)) : rows;
    return this._serializeProjection(filtered);
  }

  /**
   * GET /:warungId/ledger
   */
  async getLedger(warungId, query = {}) {
    return OutletStockLedgerRepository.listByWarung(prisma, warungId, query);
  }

  /**
   * GET /:warungId/stock-counts
   */
  async getStockCounts(warungId, query = {}) {
    return OutletStockCountRepository.listByWarung(prisma, warungId, query);
  }

  _serializeProjection(rows) {
    return rows.map(r => ({
      id: r.id,
      warung_id: r.warung_id,
      product_id: r.product_id,
      product_name: r.product ? r.product.name : null,
      product_code: r.product ? r.product.code : null,
      current_stock: r.current_stock,
      par_qty: r.par_qty,
      opening_stock: r.opening_stock,
      total_refill: r.total_refill,
      total_sales: r.total_sales,
      total_return: r.total_return,
      calculated_sales: r.calculated_sales,
      required_refill: r.required_refill,
      average_daily_sales: Number(r.average_daily_sales),
      sell_through: Number(r.sell_through),
      last_visit_id: r.last_visit_id,
      last_count_at: r.last_count_at,
      last_refill_at: r.last_refill_at,
      version: Number(r.version)
    }));
  }
}

module.exports = new OutletInventoryService();
