'use strict';

const prisma = require('../../../../config/database');
const NumberGeneratorService = require('../../../../services/number-generator.service');
const InventoryService = require('../../../../services/inventory.service');
const SalesStockService = require('../../../sales/services/SalesStockService');
const { NotFoundError, ConflictError } = require('../../../../exceptions/api-error');
const WarehouseTransfer = require('../../domain/entities/WarehouseTransfer');
const SalesDay = require('../../domain/entities/SalesDay');
const { WarehouseTransferStatus, RETRYABLE_STATUSES } = require('../../domain/constants/WarehouseTransferStatus');
const { WarehouseTransferType } = require('../../domain/constants/WarehouseTransferType');
const { WarehouseMovementType } = require('../../domain/constants/WarehouseMovementType');
const { SalesDayStatus } = require('../../domain/constants/SalesDayStatus');
const WarehouseTransferRepository = require('../../domain/repositories/WarehouseTransferRepository');
const WarehouseLedgerRepository = require('../../domain/repositories/WarehouseLedgerRepository');
const SalesDayRepository = require('../../domain/repositories/SalesDayRepository');
const WarehouseTransferPostedEvent = require('../../domain/events/WarehouseTransferPostedEvent');
const WarehouseReturnReceivedEvent = require('../../domain/events/WarehouseReturnReceivedEvent');
const SalesDayClosedEvent = require('../../domain/events/SalesDayClosedEvent');

const SALES_STOCK_MOVEMENTS = {
  [WarehouseTransferType.ISSUE]: 'RECEIVED_FROM_WAREHOUSE',
  [WarehouseTransferType.RETURN]: 'RETURN_TO_WAREHOUSE'
};

/**
 * In-process async lock per sales.
 * Setiap transfer (issue/return) memutasi SalesStockProjection sales yang
 * sama, dan closeSalesDay mengunci ringkasan harian sales yang sama,
 * sehingga command untuk sales yang sama diserialisasi (mencegah lost
 * update pada read-modify-write projection). Berlaku per instance
 * (single-instance deployment). Concurrency lintas warehouse diamankan
 * optimistic locking (version) pada WarehouseStock.
 */
const salesLocks = new Map();

function _withSalesLock(salesId, fn) {
  const key = Number(salesId);
  const prev = salesLocks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  salesLocks.set(key, next);
  next.finally(() => {
    if (salesLocks.get(key) === next) {
      salesLocks.delete(key);
    }
  });
  return next;
}

function _normalizeItems(items) {
  return (Array.isArray(items) ? items : []).map(item => ({
    productId: Number(item.product_id),
    qty: Number(item.qty),
    batchId: item.batch_id === null || item.batch_id === undefined ? null : Number(item.batch_id)
  }));
}

class WarehouseTransferService {
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

  async _ensureWarehouse(tx, warehouseId) {
    const warehouse = await tx.warehouse.findUnique({ where: { id: Number(warehouseId) } });
    if (!warehouse) throw new NotFoundError('WAREHOUSE_NOT_FOUND', 'Gudang tidak ditemukan');
    return warehouse;
  }

  async _ensureSales(tx, salesId) {
    const sales = await tx.user.findUnique({ where: { id: Number(salesId) } });
    if (!sales) throw new NotFoundError('SALES_NOT_FOUND', 'Sales tidak ditemukan');
    return sales;
  }

  async _warehouseProductBalance(tx, warehouseId, productId) {
    const aggregate = await tx.warehouseStock.aggregate({
      where: { warehouse_id: Number(warehouseId), product_id: Number(productId) },
      _sum: { qty_available: true }
    });
    return Number(aggregate._sum.qty_available || 0);
  }

  async _validateReferences(tx, entity) {
    await this._ensureWarehouse(tx, entity.warehouseId);
    await this._ensureSales(tx, entity.salesId);
    for (const item of entity.items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new NotFoundError('PRODUCT_NOT_FOUND', `Produk ${item.productId} tidak ditemukan`);
      }
    }
  }

  /**
   * POST /issue - ISSUE stok gudang ke sales (Warehouse -> Sales).
   * Idempotent berdasarkan (type=ISSUE, reference_type, reference_id).
   */
  async issueStockToSales(payload, userId) {
    const entity = new WarehouseTransfer({
      type: WarehouseTransferType.ISSUE,
      warehouseId: payload.warehouse_id,
      salesId: payload.sales_id,
      transactionDate: payload.transaction_date,
      referenceType: payload.reference_type,
      referenceId: payload.reference_id,
      notes: payload.notes,
      performedBy: userId || payload.performed_by,
      items: _normalizeItems(payload.items)
    });

    return _withSalesLock(entity.salesId, async () => {
      await prisma.$transaction(async (tx) => {
        await this._validateReferences(tx, entity);
      });

      const transfer = await prisma.$transaction(async (tx) => {
        const existing = await WarehouseTransferRepository.findByReference(tx, WarehouseTransferType.ISSUE, entity.referenceType, entity.referenceId);
        if (existing) return existing;
        const transferNumber = await NumberGeneratorService.generateCode('WT', entity.transactionDate, tx);
        return WarehouseTransferRepository.create(tx, {
          ...entity.toPrisma(),
          transfer_number: transferNumber,
          status: WarehouseTransferStatus.PENDING
        });
      });

      if (!RETRYABLE_STATUSES.includes(transfer.status)) {
        return this._serializeTransfer(transfer, true);
      }

      try {
        const posted = await prisma.$transaction(async (tx) => {
          const items = [];

          for (const item of transfer.items) {
            const productId = Number(item.product_id);
            const qty = Number(item.qty);

            const reserved = await InventoryService.reserveBatchFEFO(productId, entity.warehouseId, qty, tx);
            const batches = [];
            for (const batch of reserved) {
              const snapshot = await InventoryService.decreaseWarehouseStock(entity.warehouseId, productId, batch.batch_id, batch.qty, 'GOOD', tx);
              batches.push({
                batchId: batch.batch_id,
                batchNumber: snapshot.batch_number,
                expiredAt: snapshot.expired_at,
                qty: batch.qty,
                qtyBefore: snapshot.qty_before,
                qtyAfter: snapshot.qty_after
              });
            }

            const balance = await this._warehouseProductBalance(tx, entity.warehouseId, productId);
            await WarehouseLedgerRepository.create(tx, {
              warehouse_id: entity.warehouseId,
              sales_id: entity.salesId,
              product_id: productId,
              movement_type: WarehouseMovementType.ISSUE_TO_SALES,
              qty,
              balance,
              reference_type: entity.referenceType,
              reference_id: entity.referenceId,
              notes: entity.notes,
              created_by: userId,
              transaction_date: entity.transactionDate
            });

            const salesLedger = await SalesStockService.addLedgerEntry({
              sales_id: entity.salesId,
              product_id: productId,
              movement_type: SALES_STOCK_MOVEMENTS[WarehouseTransferType.ISSUE],
              qty,
              document_type: 'WAREHOUSE_TRANSFER',
              document_id: transfer.id,
              transaction_date: entity.transactionDate
            }, tx);

            for (const batch of batches) {
              await InventoryService.createInventoryMovement({
                movement_type: 'LOAD_OUT',
                source_type: 'WAREHOUSE',
                source_id: entity.warehouseId,
                destination_type: 'SALES',
                destination_id: entity.salesId,
                qty_before: batch.qtyBefore,
                qty_change: -batch.qty,
                qty_after: batch.qtyAfter,
                reference_document: transfer.transfer_number,
                reference_type: 'TRANSFER',
                product_id: productId,
                batch_id: batch.batchId,
                batch_number: batch.batchNumber,
                expired_at: batch.expiredAt,
                created_by: userId
              }, tx);
            }

            items.push({
              product_id: productId,
              qty,
              warehouse_balance: balance,
              sales_balance: Number(salesLedger.balance),
              batches: batches.map(b => ({ batch_id: b.batchId, batch_number: b.batchNumber, qty: b.qty }))
            });
          }

          await WarehouseTransferRepository.updateStatus(tx, transfer.id, WarehouseTransferStatus.POSTED, {
            posted_at: new Date(),
            error_message: null
          });

          await this._emit(tx, new WarehouseTransferPostedEvent(transfer.id, {
            transferId: transfer.id,
            transferNumber: transfer.transfer_number,
            type: WarehouseTransferType.ISSUE,
            warehouseId: entity.warehouseId,
            salesId: entity.salesId,
            transactionDate: entity.transactionDate.toISOString(),
            referenceType: entity.referenceType,
            referenceId: entity.referenceId,
            items: items.map(i => ({ productId: i.product_id, qty: i.qty, warehouseBalance: i.warehouse_balance, salesBalance: i.sales_balance })),
            performedBy: userId,
            timestamp: new Date().toISOString()
          }, { userId }));

          return { transfer_id: transfer.id, items };
        });

        return {
          transfer_id: posted.transfer_id,
          transfer_number: transfer.transfer_number,
          status: WarehouseTransferStatus.POSTED,
          type: WarehouseTransferType.ISSUE,
          reference_type: entity.referenceType,
          reference_id: entity.referenceId,
          transaction_date: entity.transactionDate,
          items: posted.items,
          idempotent: false
        };
      } catch (error) {
        await prisma.$transaction((tx) =>
          WarehouseTransferRepository.updateStatus(tx, transfer.id, WarehouseTransferStatus.FAILED, {
            error_message: error && error.message ? String(error.message).slice(0, 500) : 'UNKNOWN'
          })
        ).catch(() => {});
        throw error;
      }
    });
  }

  /**
   * POST /return - RETURN stok dari sales ke gudang (Sales -> Warehouse).
   * Item wajib membawa batch_id tujuan stok gudang. Idempotent berdasarkan
   * (type=RETURN, reference_type, reference_id).
   */
  async receiveReturnedStock(payload, userId) {
    const entity = new WarehouseTransfer({
      type: WarehouseTransferType.RETURN,
      warehouseId: payload.warehouse_id,
      salesId: payload.sales_id,
      transactionDate: payload.transaction_date,
      referenceType: payload.reference_type,
      referenceId: payload.reference_id,
      notes: payload.notes,
      performedBy: userId || payload.performed_by,
      items: _normalizeItems(payload.items)
    });

    return _withSalesLock(entity.salesId, async () => {
      await prisma.$transaction(async (tx) => {
        await this._validateReferences(tx, entity);
      });

      const transfer = await prisma.$transaction(async (tx) => {
        const existing = await WarehouseTransferRepository.findByReference(tx, WarehouseTransferType.RETURN, entity.referenceType, entity.referenceId);
        if (existing) return existing;
        const transferNumber = await NumberGeneratorService.generateCode('WT', entity.transactionDate, tx);
        return WarehouseTransferRepository.create(tx, {
          ...entity.toPrisma(),
          transfer_number: transferNumber,
          status: WarehouseTransferStatus.PENDING
        });
      });

      if (!RETRYABLE_STATUSES.includes(transfer.status)) {
        return this._serializeTransfer(transfer, true);
      }

      try {
        const posted = await prisma.$transaction(async (tx) => {
          const items = [];

          for (const item of transfer.items) {
            const productId = Number(item.product_id);
            const qty = Number(item.qty);
            const batchId = Number(item.batch_id);

            if (!batchId) {
              throw new ConflictError('BATCH_REQUIRED', `batch_id wajib diisi untuk RETURN produk ${productId}`);
            }

            const stock = await tx.warehouseStock.findUnique({
              where: {
                warehouse_id_product_id_batch_id_condition: {
                  warehouse_id: entity.warehouseId,
                  product_id: productId,
                  batch_id: batchId,
                  condition: 'GOOD'
                }
              }
            });
            if (!stock) {
              throw new NotFoundError('STOCK_NOT_FOUND', `Stok gudang batch ${batchId} untuk produk ${productId} tidak ditemukan`);
            }

            const projection = await tx.salesStockProjection.findUnique({
              where: {
                sales_id_product_id: {
                  sales_id: entity.salesId,
                  product_id: productId
                }
              }
            });
            const salesQty = projection ? Number(projection.qty_available) : 0;
            if (salesQty < qty) {
              throw new ConflictError('INSUFFICIENT_STOCK', `Stok sales untuk produk ${productId} tidak mencukupi untuk pengembalian`);
            }

            const snapshot = await InventoryService.increaseWarehouseStock(entity.warehouseId, productId, batchId, qty, 'GOOD', tx);

            const balance = await this._warehouseProductBalance(tx, entity.warehouseId, productId);
            await WarehouseLedgerRepository.create(tx, {
              warehouse_id: entity.warehouseId,
              sales_id: entity.salesId,
              product_id: productId,
              movement_type: WarehouseMovementType.RETURN_FROM_SALES,
              qty,
              balance,
              reference_type: entity.referenceType,
              reference_id: entity.referenceId,
              notes: entity.notes,
              created_by: userId,
              transaction_date: entity.transactionDate
            });

            const salesLedger = await SalesStockService.addLedgerEntry({
              sales_id: entity.salesId,
              product_id: productId,
              movement_type: SALES_STOCK_MOVEMENTS[WarehouseTransferType.RETURN],
              qty,
              document_type: 'WAREHOUSE_TRANSFER',
              document_id: transfer.id,
              transaction_date: entity.transactionDate
            }, tx);

            await InventoryService.createInventoryMovement({
              movement_type: 'LOAD_IN',
              source_type: 'SALES',
              source_id: entity.salesId,
              destination_type: 'WAREHOUSE',
              destination_id: entity.warehouseId,
              qty_before: snapshot.qty_before,
              qty_change: snapshot.qty_change,
              qty_after: snapshot.qty_after,
              reference_document: transfer.transfer_number,
              reference_type: 'TRANSFER',
              product_id: productId,
              batch_id: batchId,
              batch_number: snapshot.batch_number,
              expired_at: snapshot.expired_at,
              created_by: userId
            }, tx);

            items.push({
              product_id: productId,
              qty,
              batch_id: batchId,
              warehouse_balance: balance,
              sales_balance: Number(salesLedger.balance)
            });
          }

          await WarehouseTransferRepository.updateStatus(tx, transfer.id, WarehouseTransferStatus.POSTED, {
            posted_at: new Date(),
            error_message: null
          });

          await this._emit(tx, new WarehouseReturnReceivedEvent(transfer.id, {
            transferId: transfer.id,
            transferNumber: transfer.transfer_number,
            type: WarehouseTransferType.RETURN,
            warehouseId: entity.warehouseId,
            salesId: entity.salesId,
            transactionDate: entity.transactionDate.toISOString(),
            referenceType: entity.referenceType,
            referenceId: entity.referenceId,
            items: items.map(i => ({ productId: i.product_id, qty: i.qty, batchId: i.batch_id, warehouseBalance: i.warehouse_balance, salesBalance: i.sales_balance })),
            performedBy: userId,
            timestamp: new Date().toISOString()
          }, { userId }));

          return { transfer_id: transfer.id, items };
        });

        return {
          transfer_id: posted.transfer_id,
          transfer_number: transfer.transfer_number,
          status: WarehouseTransferStatus.POSTED,
          type: WarehouseTransferType.RETURN,
          reference_type: entity.referenceType,
          reference_id: entity.referenceId,
          transaction_date: entity.transactionDate,
          items: posted.items,
          idempotent: false
        };
      } catch (error) {
        await prisma.$transaction((tx) =>
          WarehouseTransferRepository.updateStatus(tx, transfer.id, WarehouseTransferStatus.FAILED, {
            error_message: error && error.message ? String(error.message).slice(0, 500) : 'UNKNOWN'
          })
        ).catch(() => {});
        throw error;
      }
    });
  }

  /**
   * POST /sales-days/close - Tutup ringkasan harian stock sales.
   * Idempotent: hari yang sudah CLOSED dikembalikan apa adanya.
   */
  async closeSalesDay(payload, userId) {
    const entity = new SalesDay({
      salesId: payload.sales_id,
      salesDate: payload.sales_date,
      closedBy: userId || payload.closed_by
    });

    return _withSalesLock(entity.salesId, () => prisma.$transaction(async (tx) => {
      await this._ensureSales(tx, entity.salesId);

      const day = await SalesDayRepository.upsertOpen(tx, {
        sales_id: entity.salesId,
        sales_date: entity.salesDate
      });

      if (day.status === SalesDayStatus.CLOSED) {
        return {
          sales_day_id: day.id,
          status: SalesDayStatus.CLOSED,
          sales_id: entity.salesId,
          sales_date: entity.salesDate,
          summary: day.summary,
          idempotent: true
        };
      }

      const rows = await tx.warehouseLedger.findMany({
        where: {
          sales_id: entity.salesId,
          transaction_date: entity.salesDate
        },
        include: { product: { select: { id: true, name: true, code: true } } }
      });

      const byProduct = new Map();
      let totalIssue = 0;
      let totalReturn = 0;
      for (const row of rows) {
        const key = row.product_id;
        const agg = byProduct.get(key) || {
          productId: key,
          productCode: row.product ? row.product.code : null,
          productName: row.product ? row.product.name : null,
          issueQty: 0,
          returnQty: 0
        };
        if (row.movement_type === WarehouseMovementType.ISSUE_TO_SALES) {
          agg.issueQty += Number(row.qty);
          totalIssue += Number(row.qty);
        } else {
          agg.returnQty += Number(row.qty);
          totalReturn += Number(row.qty);
        }
        byProduct.set(key, agg);
      }

      const products = [...byProduct.values()].map(p => ({ ...p, net: p.issueQty - p.returnQty }));
      const summary = {
        total_issue: totalIssue,
        total_return: totalReturn,
        net: totalIssue - totalReturn,
        products
      };

      const updated = await SalesDayRepository.update(tx, day.id, {
        status: SalesDayStatus.CLOSED,
        summary,
        closed_by: entity.closedBy,
        closed_at: new Date()
      });

      await this._emit(tx, new SalesDayClosedEvent(updated.id, {
        salesDayId: updated.id,
        salesId: entity.salesId,
        salesDate: entity.salesDate.toISOString(),
        summary,
        closedBy: entity.closedBy,
        timestamp: new Date().toISOString()
      }, { userId }));

      return {
        sales_day_id: updated.id,
        status: SalesDayStatus.CLOSED,
        sales_id: entity.salesId,
        sales_date: entity.salesDate,
        summary,
        idempotent: false
      };
    }));
  }

  async getTransfers(query = {}) {
    return WarehouseTransferRepository.list(prisma, query);
  }

  async getTransfer(id) {
    const transfer = await WarehouseTransferRepository.findById(prisma, id);
    if (!transfer) throw new NotFoundError('TRANSFER_NOT_FOUND', 'Warehouse Transfer tidak ditemukan');
    return transfer;
  }

  async getLedger(query = {}) {
    return WarehouseLedgerRepository.list(prisma, query);
  }

  async getSalesDays(query = {}) {
    return SalesDayRepository.list(prisma, query);
  }

  _serializeTransfer(transfer, idempotent = false) {
    return {
      transfer_id: transfer.id,
      transfer_number: transfer.transfer_number,
      status: transfer.status,
      type: transfer.type,
      reference_type: transfer.reference_type,
      reference_id: transfer.reference_id,
      transaction_date: transfer.transaction_date,
      items: transfer.items.map(i => ({
        product_id: i.product_id,
        qty: i.qty,
        batch_id: i.batch_id || null
      })),
      idempotent: Boolean(idempotent)
    };
  }
}

module.exports = new WarehouseTransferService();
