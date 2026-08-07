'use strict';

const prisma = require('../../../../config/database');
const NumberGeneratorService = require('../../../../services/number-generator.service');
const GpsService = require('../../../../services/gps.service');
const OutletInventoryService = require('../../../outlet-inventory/application/services/OutletInventoryService');
const { NotFoundError, ConflictError, ValidationError, ForbiddenError } = require('../../../../exceptions/api-error');
const SalesVisit = require('../../domain/entities/SalesVisit');
const VisitValidationService = require('../../domain/services/VisitValidationService');
const VisitTimelineService = require('../../domain/services/VisitTimelineService');
const { VisitStatus } = require('../../domain/constants/VisitStatus');
const { VisitActivityType } = require('../../domain/constants/VisitActivityType');
const SalesVisitRepository = require('../../domain/repositories/SalesVisitRepository');
const SalesVisitActivityRepository = require('../../domain/repositories/SalesVisitActivityRepository');
const SalesVisitNoteRepository = require('../../domain/repositories/SalesVisitNoteRepository');
const SalesVisitPhotoRepository = require('../../domain/repositories/SalesVisitPhotoRepository');
const SalesVisitPlannedEvent = require('../../domain/events/SalesVisitPlannedEvent');
const SalesVisitCheckedInEvent = require('../../domain/events/SalesVisitCheckedInEvent');
const SalesVisitStockCountedEvent = require('../../domain/events/SalesVisitStockCountedEvent');
const SalesVisitOrderCreatedEvent = require('../../domain/events/SalesVisitOrderCreatedEvent');
const SalesVisitDeliveredEvent = require('../../domain/events/SalesVisitDeliveredEvent');
const SalesVisitCheckedOutEvent = require('../../domain/events/SalesVisitCheckedOutEvent');
const SalesVisitCompletedEvent = require('../../domain/events/SalesVisitCompletedEvent');
const SalesVisitCancelledEvent = require('../../domain/events/SalesVisitCancelledEvent');

/**
 * In-process async lock per kunjungan.
 * SalesVisit adalah satu aggregate per kunjungan, sehingga command untuk
 * kunjungan yang sama diserialisasi (mencegah duplicate check-in/check-out
 * dalam kondisi konkuren). Berlaku per instance (single-instance deployment).
 */
const visitLocks = new Map();

function _withVisitLock(visitId, fn) {
  const key = Number(visitId);
  const prev = visitLocks.get(key) || Promise.resolve();
  const next = prev.then(fn, fn);
  visitLocks.set(key, next);
  next.finally(() => {
    if (visitLocks.get(key) === next) {
      visitLocks.delete(key);
    }
  });
  return next;
}

class SalesVisitService {
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

  async _recordActivity(tx, visitId, type, metadata, userId) {
    return SalesVisitActivityRepository.create(tx, {
      visit_id: Number(visitId),
      type,
      metadata: metadata || null,
      created_by: userId || null
    });
  }

  async _loadVisit(visitId, user, client) {
    const c = client || prisma;
    const visit = await SalesVisitRepository.findById(c, visitId, { includeActivities: false });
    if (!visit) throw new NotFoundError('VISIT_NOT_FOUND', 'Visit tidak ditemukan');
    this._ensureOwnership(visit, user);
    return visit;
  }

  _ensureOwnership(visit, user) {
    if (user && user.role === 'SALES' && Number(visit.sales_id) !== Number(user.id)) {
      throw new ForbiddenError('VISIT_ACCESS_DENIED', 'Tidak berhak mengakses visit ini');
    }
  }

  /**
   * POST /sales-visits - Rencanakan kunjungan (PLANNED).
   */
  async createVisit(payload, user) {
    const salesId = user.role === 'SALES' ? Number(user.id) : Number(payload.sales_id || user.id);
    const warungId = Number(payload.warung_id);
    if (!warungId) throw new ValidationError('warung_id wajib diisi');

    const entity = new SalesVisit({
      salesId,
      warungId,
      visitDate: payload.visit_date,
      plannedSequence: payload.planned_sequence,
      openingNote: payload.opening_note
    });

    return prisma.$transaction(async (tx) => {
      const warung = await tx.warung.findUnique({ where: { id: warungId } });
      if (!warung) throw new NotFoundError('WARUNG_NOT_FOUND', 'Outlet (Warung) tidak ditemukan');
      if (warung.status !== 'ACTIVE') throw new ConflictError('WARUNG_INACTIVE', 'Outlet tidak aktif');

      const sales = await tx.user.findUnique({ where: { id: salesId } });
      if (!sales) throw new NotFoundError('SALES_NOT_FOUND', 'Sales tidak ditemukan');
      if (sales.role !== 'SALES' && sales.role !== 'ADMIN' && sales.role !== 'OWNER') {
        throw new ValidationError('Sales harus memiliki role SALES');
      }

      const existing = await SalesVisitRepository.findForDate(tx, salesId, warungId, entity.visitDate);
      if (existing) {
        throw new ConflictError('DUPLICATE_VISIT', `Sudah ada kunjungan untuk outlet ini pada tanggal tersebut (${existing.code})`);
      }

      const code = await NumberGeneratorService.generateCode('SV', entity.visitDate, tx);
      const visit = await SalesVisitRepository.create(tx, { ...entity.toPrisma(), code });

      await this._recordActivity(tx, visit.id, VisitActivityType.VISIT_CREATED, {
        warung_id: warungId,
        sales_id: salesId
      }, user.id);

      await this._emit(tx, new SalesVisitPlannedEvent(visit.id, {
        visitId: visit.id,
        code,
        warungId,
        salesId,
        visitDate: entity.visitDate.toISOString()
      }, { userId: user.id }));

      return SalesVisitRepository.findById(tx, visit.id);
    });
  }

  /**
   * POST /sales-visits/:id/check-in - Check-In dengan GPS.
   */
  async checkIn(visitId, payload, user) {
    return _withVisitLock(visitId, () => prisma.$transaction(async (tx) => {
      const visit = await this._loadVisit(visitId, user, tx);
      VisitValidationService.assertCanCheckIn(visit, {
        latitude: payload.latitude,
        longitude: payload.longitude
      });

      const warung = await tx.warung.findUnique({ where: { id: visit.warung_id } });
      if (!warung) throw new NotFoundError('WARUNG_NOT_FOUND', 'Outlet (Warung) tidak ditemukan');
      if (warung.status !== 'ACTIVE') throw new ConflictError('WARUNG_INACTIVE', 'Outlet tidak aktif');

      const latitude = Number(payload.latitude);
      const longitude = Number(payload.longitude);
      let distance = null;
      if (warung.latitude && warung.longitude) {
        distance = GpsService.calculateDistance(
          Number(warung.latitude), Number(warung.longitude), latitude, longitude
        );
        const { valid, maxRadius } = await GpsService.validateRadius(distance);
        if (!valid) {
          throw new ValidationError(`Posisi Anda terlalu jauh dari outlet (${distance}m). Maksimal ${maxRadius}m.`);
        }
      }

      const checkInTime = new Date();
      const updated = await SalesVisitRepository.update(tx, visitId, {
        status: VisitStatus.CHECKED_IN,
        check_in_time: checkInTime,
        check_in_latitude: latitude,
        check_in_longitude: longitude,
        distance_meter: distance,
        opening_note: payload.note || visit.opening_note
      });

      await this._recordActivity(tx, visitId, VisitActivityType.CHECK_IN, {
        latitude,
        longitude,
        distance_meter: distance
      }, user.id);

      await this._emit(tx, new SalesVisitCheckedInEvent(visitId, {
        visitId,
        warungId: visit.warung_id,
        checkedInAt: checkInTime.toISOString(),
        distance_meter: distance
      }, { userId: user.id }));

      return updated;
    }));
  }

  /**
   * POST /sales-visits/:id/stock-count
   * Integrasi Outlet Inventory: mendelegasikan perhitungan ke
   * OutletInventoryService.recordStockCount (public API 11.0D).
   */
  async recordStockCount(visitId, payload, user) {
    return _withVisitLock(visitId, async () => {
      const visit = await this._loadVisit(visitId, user);
      VisitValidationService.assertCanRecordStockCount(visit);

      const result = await OutletInventoryService.recordStockCount(visit.warung_id, {
        sales_id: visit.sales_id,
        visit_id: visit.id,
        counted_at: payload.counted_at,
        items: payload.items
      }, user.id);

      await prisma.$transaction(async (tx) => {
        await SalesVisitRepository.update(tx, visitId, { status: VisitStatus.STOCK_COUNTED });
        await this._recordActivity(tx, visitId, VisitActivityType.STOCK_COUNT, {
          item_count: payload.items ? payload.items.length : 0,
          total_sold: result.sales.reduce((sum, s) => sum + s.qty_sold, 0)
        }, user.id);
        await this._emit(tx, new SalesVisitStockCountedEvent(visitId, {
          visitId,
          warungId: visit.warung_id,
          itemCount: payload.items ? payload.items.length : 0,
          sales: result.sales.map(s => ({ productId: s.product_id, qtySold: s.qty_sold }))
        }, { userId: user.id }));
      });

      return {
        visit_id: visitId,
        visit_status: VisitStatus.STOCK_COUNTED,
        sales: result.sales,
        refills: result.refills,
        projection: result.projection
      };
    });
  }

  /**
   * POST /sales-visits/:id/order - Catat order kunjungan (ORDER_CREATED).
   */
  async recordOrder(visitId, payload, user) {
    const { items, note, order_number } = payload;
    if (items !== undefined && !Array.isArray(items)) throw new ValidationError('items harus berupa array');
    if (Array.isArray(items)) {
      for (const item of items) {
        const qty = Number(item.qty);
        if (!item.product_id) throw new ValidationError('product_id wajib diisi');
        if (!Number.isInteger(qty) || qty < 0) throw new ValidationError(`qty produk ${item.product_id} harus bilangan bulat >= 0`);
      }
    }

    return _withVisitLock(visitId, () => prisma.$transaction(async (tx) => {
      const visit = await this._loadVisit(visitId, user, tx);
      VisitValidationService.assertCanRecordOrder(visit);

      await SalesVisitRepository.update(tx, visitId, { status: VisitStatus.ORDER_CREATED });
      await this._recordActivity(tx, visitId, VisitActivityType.ORDER_CREATED, {
        order_number: order_number || null,
        items: items || [],
        note: note || null
      }, user.id);

      await this._emit(tx, new SalesVisitOrderCreatedEvent(visitId, {
        visitId,
        warungId: visit.warung_id,
        orderNumber: order_number || null,
        itemCount: items ? items.length : 0
      }, { userId: user.id }));

      return SalesVisitRepository.findById(tx, visitId);
    }));
  }

  /**
   * POST /sales-visits/:id/delivery
   * Catat delivery (DELIVERED) sebagai aktivitas kunjungan DAN memosting
   * stok ke Outlet Inventory (SPRINT 11.1A) melalui public API
   * OutletInventoryService.recordDelivery. Idempotent terhadap
   * (reference_type, reference_id): delivery yang sudah POSTED tidak akan
   * diposting ulang (tanpa double stock).
   */
  async recordDelivery(visitId, payload, user) {
    const { items, note, reference_type, reference_id } = payload;
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('items wajib diisi minimal 1 produk');
    }
    const seen = new Set();
    for (const item of items) {
      const productId = Number(item.product_id);
      const qty = Number(item.qty);
      if (!productId) throw new ValidationError('product_id wajib diisi');
      if (seen.has(productId)) throw new ValidationError(`product_id ${productId} terduplikasi dalam items`);
      seen.add(productId);
      if (!Number.isInteger(qty) || qty <= 0) throw new ValidationError(`qty produk ${productId} harus bilangan bulat > 0`);
    }

    return _withVisitLock(visitId, async () => {
      const visit = await this._loadVisit(visitId, user);
      VisitValidationService.assertCanRecordDelivery(visit);

      const delivery = await OutletInventoryService.recordDelivery({
        warungId: visit.warung_id,
        deliveryDate: payload.delivery_date || visit.visit_date,
        referenceType: reference_type || 'SALES_VISIT',
        referenceId: reference_id || visit.id,
        performedBy: user.id,
        notes: note || null,
        items: items.map(i => ({ productId: Number(i.product_id), quantity: Number(i.qty) }))
      });

      await prisma.$transaction(async (tx) => {
        await SalesVisitRepository.update(tx, visitId, { status: VisitStatus.DELIVERED });
        await this._recordActivity(tx, visitId, VisitActivityType.DELIVERED, {
          items,
          note: note || null,
          reference_type: reference_type || 'SALES_VISIT',
          reference_id: reference_id || visit.id,
          delivery_id: delivery.delivery_id,
          delivery_status: delivery.status
        }, user.id);

        await this._emit(tx, new SalesVisitDeliveredEvent(visitId, {
          visitId,
          warungId: visit.warung_id,
          itemCount: items.length,
          referenceType: reference_type || 'SALES_VISIT',
          referenceId: reference_id || visit.id,
          deliveryId: delivery.delivery_id,
          deliveryStatus: delivery.status
        }, { userId: user.id }));
      });

      return SalesVisitRepository.findById(prisma, visitId, { includeActivities: true });
    });
  }

  /**
   * POST /sales-visits/:id/check-out - Check-Out dengan durasi.
   */
  async checkOut(visitId, payload, user) {
    return _withVisitLock(visitId, () => prisma.$transaction(async (tx) => {
      const visit = await this._loadVisit(visitId, user, tx);
      VisitValidationService.assertCanCheckOut(visit);

      const checkOutTime = new Date();
      const duration = VisitTimelineService.computeDuration(visit.check_in_time, checkOutTime);

      const updated = await SalesVisitRepository.update(tx, visitId, {
        status: VisitStatus.CHECKED_OUT,
        check_out_time: checkOutTime,
        check_out_latitude: payload.latitude === undefined ? null : Number(payload.latitude),
        check_out_longitude: payload.longitude === undefined ? null : Number(payload.longitude),
        duration_seconds: duration,
        closing_note: payload.closing_note || null
      });

      await this._recordActivity(tx, visitId, VisitActivityType.CHECK_OUT, {
        duration_seconds: duration,
        latitude: payload.latitude === undefined ? null : Number(payload.latitude),
        longitude: payload.longitude === undefined ? null : Number(payload.longitude)
      }, user.id);

      await this._emit(tx, new SalesVisitCheckedOutEvent(visitId, {
        visitId,
        warungId: visit.warung_id,
        checkedOutAt: checkOutTime.toISOString(),
        durationSeconds: duration
      }, { userId: user.id }));

      return updated;
    }));
  }

  /**
   * POST /sales-visits/:id/complete - Selesaikan kunjungan (COMPLETED).
   */
  async complete(visitId, user) {
    return _withVisitLock(visitId, () => prisma.$transaction(async (tx) => {
      const visit = await this._loadVisit(visitId, user, tx);
      VisitValidationService.assertCanComplete(visit);

      const updated = await SalesVisitRepository.update(tx, visitId, { status: VisitStatus.COMPLETED });
      await this._recordActivity(tx, visitId, VisitActivityType.COMPLETED, null, user.id);

      await this._emit(tx, new SalesVisitCompletedEvent(visitId, {
        visitId,
        warungId: visit.warung_id
      }, { userId: user.id }));

      return updated;
    }));
  }

  /**
   * POST /sales-visits/:id/cancel - Batalkan rencana kunjungan (PLANNED only).
   */
  async cancel(visitId, payload, user) {
    return _withVisitLock(visitId, () => prisma.$transaction(async (tx) => {
      const visit = await this._loadVisit(visitId, user, tx);
      VisitValidationService.assertCanCancel(visit);

      const updated = await SalesVisitRepository.update(tx, visitId, { status: VisitStatus.CANCELLED });
      await this._recordActivity(tx, visitId, VisitActivityType.CANCELLED, {
        reason: payload.reason || null
      }, user.id);

      await this._emit(tx, new SalesVisitCancelledEvent(visitId, {
        visitId,
        warungId: visit.warung_id,
        reason: payload.reason || null
      }, { userId: user.id }));

      return updated;
    }));
  }

  /**
   * POST /sales-visits/:id/notes - Tambah catatan (append-only / immutable).
   */
  async addNote(visitId, payload, user) {
    if (!payload.note || !String(payload.note).trim()) {
      throw new ValidationError('note wajib diisi');
    }

    return _withVisitLock(visitId, () => prisma.$transaction(async (tx) => {
      const visit = await this._loadVisit(visitId, user, tx);
      VisitValidationService.assertVisitActive(visit);

      const note = await SalesVisitNoteRepository.create(tx, {
        visit_id: Number(visitId),
        note: String(payload.note).trim(),
        created_by: Number(user.id)
      });

      await this._recordActivity(tx, visitId, VisitActivityType.NOTE_ADDED, {
        note_id: note.id
      }, user.id);

      return note;
    }));
  }

  /**
   * POST /sales-visits/:id/photos - Tambah metadata foto (tanpa upload).
   */
  async addPhoto(visitId, payload, user) {
    if (!payload.filename || !String(payload.filename).trim()) {
      throw new ValidationError('filename wajib diisi');
    }
    if (!payload.file_path || !String(payload.file_path).trim()) {
      throw new ValidationError('file_path wajib diisi');
    }

    return _withVisitLock(visitId, () => prisma.$transaction(async (tx) => {
      const visit = await this._loadVisit(visitId, user, tx);
      VisitValidationService.assertVisitActive(visit);

      const photo = await SalesVisitPhotoRepository.create(tx, {
        visit_id: Number(visitId),
        filename: String(payload.filename).trim(),
        file_path: String(payload.file_path).trim(),
        mime_type: payload.mime_type || null,
        size_bytes: payload.size_bytes === undefined ? null : Number(payload.size_bytes),
        captured_at: payload.captured_at ? new Date(payload.captured_at) : new Date(),
        created_by: Number(user.id)
      });

      await this._recordActivity(tx, visitId, VisitActivityType.PHOTO_ADDED, {
        photo_id: photo.id,
        filename: photo.filename
      }, user.id);

      return photo;
    }));
  }

  /**
   * GET /sales-visits/:id - Detail kunjungan (termasuk timeline, notes, photos).
   */
  async getVisit(visitId, user) {
    await this._loadVisit(visitId, user);
    return SalesVisitRepository.findById(prisma, visitId, { includeActivities: true });
  }

  /**
   * GET /sales-visits - Daftar kunjungan (SALES hanya melihat miliknya).
   */
  async listVisits(query, user) {
    const effectiveQuery = { ...query };
    if (user.role === 'SALES') {
      effectiveQuery.sales_id = Number(user.id);
    }
    return SalesVisitRepository.list(prisma, effectiveQuery);
  }

  /**
   * GET /sales-visits/:id/timeline - Timeline kronologis (immutable).
   */
  async getTimeline(visitId, user) {
    await this._loadVisit(visitId, user);
    const activities = await SalesVisitActivityRepository.listByVisit(prisma, visitId);
    return VisitTimelineService.buildTimeline(activities).map(a => VisitTimelineService.toTimelineEntry(a));
  }

  /**
   * GET /sales-visits/:id/inventory - Query proyeksi stok outlet (public API 11.0D).
   */
  async getInventory(visitId, user) {
    const visit = await this._loadVisit(visitId, user);
    return OutletInventoryService.getProjection(visit.warung_id);
  }

  /**
   * GET /sales-visits/:id/sales-history - Riwayat penjualan outlet (ledger SALE 11.0D).
   */
  async getSalesHistory(visitId, user, query = {}) {
    const visit = await this._loadVisit(visitId, user);
    return OutletInventoryService.getLedger(visit.warung_id, { ...query, movement_type: 'SALE' });
  }
}

module.exports = new SalesVisitService();
