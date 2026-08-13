const prisma = require('../config/database');
const VisitRepository = require('../repositories/visit.repository');
const warungRepository = require('../repositories/warung.repository');
const GpsService = require('./gps.service');
const NumberGeneratorService = require('./number-generator.service');
const AuditLogService = require('./audit-log.service');
const { BadRequestError, NotFoundError, ConflictError, ValidationError, ForbiddenError } = require('../exceptions/api-error');

class VisitService {
  static async getVisitsBySales(salesId, date) {
    return VisitRepository.findTodayVisitsBySalesId(salesId, date);
  }

  static async getVisitById(id, user) {
    const visit = await VisitRepository.findById(id);
    if (!visit) throw new NotFoundError('VISIT_NOT_FOUND', 'Visit tidak ditemukan');

    if (user.role === 'SALES' && visit.sales_id !== user.id) {
      throw new ForbiddenError('VISIT_ACCESS_DENIED', 'Tidak berhak mengakses visit ini');
    }

    return visit;
  }

  static async generateVisitPlan(salesId, dateStr, user) {
    // Generate pending visits for today based on warung assigned
    // Ensure dateStr is a valid date or defaults to today
    const targetDate = new Date(dateStr);
    targetDate.setUTCHours(0, 0, 0, 0);

    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const visitDay = days[targetDate.getDay()];

    // Find warungs
    const warungs = await warungRepository.findRoute({
      assigned_sales_id: salesId,
      visit_day: visitDay
    });

    if (warungs.length === 0) return { generated: 0 };

    let generatedCount = 0;

    await prisma.$transaction(async (tx) => {
      for (const warung of warungs) {
        // Check if visit already exists
        const endOfDay = new Date(targetDate);
        endOfDay.setUTCHours(23, 59, 59, 999);

        const existingVisits = await VisitRepository.findMany({
          sales_id: salesId,
          warung_id: warung.id,
          visit_date: {
            gte: targetDate,
            lte: endOfDay
          }
        }, tx);

        if (existingVisits.length === 0) {
          const code = await NumberGeneratorService.generateCode('VIS', targetDate, tx);
          
          const visit = await VisitRepository.create({
            code,
            sales_id: salesId,
            warung_id: warung.id,
            visit_date: targetDate,
            status: 'PENDING',
            planned_sequence: warung.visit_order || 0
          }, tx);

          await AuditLogService.log('GENERATE_VISIT_PLAN', 'Visit', visit.id, {
            warung_code: warung.code
          }, user.id, tx);

          generatedCount++;
        }
      }
    });

    return { generated: generatedCount };
  }

  static async checkIn(salesId, warungId, lat, lng, beforePhotoUrl, date, user) {
    if (!lat || !lng) throw new BadRequestError('GPS_REQUIRED', 'Koordinat GPS wajib diisi');
    if (!beforePhotoUrl) throw new BadRequestError('PHOTO_REQUIRED', 'Foto Before wajib disertakan');

    return prisma.$transaction(async (tx) => {
      // 1. Warung aktif?
      const warung = await tx.warung.findUnique({ where: { id: warungId } });
      if (!warung) throw new NotFoundError('WARUNG_NOT_FOUND', 'Warung tidak ditemukan');
      if (warung.status !== 'ACTIVE') throw new BadRequestError('WARUNG_INACTIVE', 'Warung tidak aktif');

      // 2. Ada visit pending hari ini?
      const targetDate = new Date(date);
      targetDate.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setUTCHours(23, 59, 59, 999);

      const visits = await VisitRepository.findMany({
        sales_id: salesId,
        warung_id: warungId,
        visit_date: { gte: targetDate, lte: endOfDay }
      }, tx);

      let visit = visits[0];
      
      // If no visit exists, we will create one (assuming sales can check-in on the fly)
      if (!visit) {
        const code = await NumberGeneratorService.generateCode('VIS', targetDate, tx);
        visit = await VisitRepository.create({
          code,
          sales_id: salesId,
          warung_id: warungId,
          visit_date: targetDate,
          status: 'PENDING'
        }, tx);
      } else {
        if (visit.status !== 'PENDING') {
          throw new ConflictError('INVALID_STATUS', 'Visit sudah di-check in atau dibatalkan');
        }
      }

      // 3. No other active visit
      const activeVisit = await VisitRepository.findActiveVisitBySalesId(salesId, tx);
      if (activeVisit && activeVisit.id !== visit.id) {
        throw new ConflictError('ACTIVE_VISIT_EXISTS', `Anda masih memiliki kunjungan aktif di warung ${activeVisit.warung.name}`);
      }

      // 4. GPS Validation
      if (warung.latitude && warung.longitude) {
        const distance = GpsService.calculateDistance(warung.latitude, warung.longitude, lat, lng);
        const { valid, maxRadius } = await GpsService.validateRadius(distance);
        if (!valid) {
          throw new ValidationError(`Posisi Anda terlalu jauh dari warung (${distance}m). Maksimal ${maxRadius}m.`);
        }
        
        await VisitRepository.update(visit.id, {
          distance_meter: distance
        }, tx);
      }

      // 5. Update
      const checkInTime = new Date();
      const updatedVisit = await VisitRepository.update(visit.id, {
        status: 'CHECKED_IN',
        check_in_time: checkInTime,
        check_in_latitude: lat,
        check_in_longitude: lng,
        before_photo_url: beforePhotoUrl
      }, tx);

      await AuditLogService.log('CHECK_IN', 'Visit', visit.id, {
        check_in_time: checkInTime,
        lat, lng
      }, user.id, tx);

      return updatedVisit;
    });
  }

  static async startSelling(visitId, user) {
    return prisma.$transaction(async (tx) => {
      const visit = await VisitRepository.findById(visitId, tx);
      if (!visit) throw new NotFoundError('VISIT_NOT_FOUND', 'Visit tidak ditemukan');
      if (visit.sales_id !== user.id && user.role !== 'OWNER') {
        throw new ForbiddenError('VISIT_ACCESS_DENIED', 'Bukan pemilik visit');
      }

      if (visit.status !== 'CHECKED_IN') {
        throw new ConflictError('INVALID_STATUS', 'Status harus CHECKED_IN untuk start selling');
      }

      const updated = await VisitRepository.update(visit.id, {
        status: 'SELLING'
      }, tx);

      await AuditLogService.log('START_SELLING', 'Visit', visit.id, null, user.id, tx);
      return updated;
    });
  }

  static async checkOut(visitId, lat, lng, afterPhotoUrl, signatureUrl, user) {
    if (!afterPhotoUrl) throw new BadRequestError('PHOTO_REQUIRED', 'Foto After wajib disertakan');

    return prisma.$transaction(async (tx) => {
      const visit = await VisitRepository.findById(visitId, tx);
      if (!visit) throw new NotFoundError('VISIT_NOT_FOUND', 'Visit tidak ditemukan');
      if (visit.sales_id !== user.id && user.role !== 'OWNER') {
        throw new ForbiddenError('VISIT_ACCESS_DENIED', 'Bukan pemilik visit');
      }

      if (visit.status !== 'SELLING') {
        throw new ConflictError('INVALID_STATUS', 'Check out hanya bisa dilakukan saat status SELLING');
      }

      const checkOutTime = new Date();
      const updated = await VisitRepository.update(visit.id, {
        status: 'CHECKED_OUT',
        check_out_time: checkOutTime,
        check_out_latitude: lat,
        check_out_longitude: lng,
        after_photo_url: afterPhotoUrl,
        signature_url: signatureUrl
      }, tx);

      await AuditLogService.log('CHECK_OUT', 'Visit', visit.id, {
        check_out_time: checkOutTime,
        lat, lng
      }, user.id, tx);

      return updated;
    });
  }

  static async complete(visitId, user) {
    return prisma.$transaction(async (tx) => {
      const visit = await VisitRepository.findById(visitId, tx);
      if (!visit) throw new NotFoundError('VISIT_NOT_FOUND', 'Visit tidak ditemukan');

      if (visit.status !== 'CHECKED_OUT') {
        throw new ConflictError('INVALID_STATUS', 'Status harus CHECKED_OUT');
      }

      const updated = await VisitRepository.update(visit.id, {
        status: 'COMPLETED'
      }, tx);

      await AuditLogService.log('COMPLETE', 'Visit', visit.id, null, user.id, tx);
      return updated;
    });
  }

  static async cancel(visitId, reason, user) {
    return prisma.$transaction(async (tx) => {
      const visit = await VisitRepository.findById(visitId, tx);
      if (!visit) throw new NotFoundError('VISIT_NOT_FOUND', 'Visit tidak ditemukan');

      if (visit.status === 'COMPLETED' || visit.status === 'CANCELLED') {
        throw new ConflictError('INVALID_STATUS', 'Visit sudah selesai atau dibatalkan');
      }

      const updated = await VisitRepository.update(visit.id, {
        status: 'CANCELLED',
        notes: reason || visit.notes
      }, tx);

      await AuditLogService.log('CANCEL', 'Visit', visit.id, { reason }, user.id, tx);
      return updated;
    });
  }
}

module.exports = VisitService;
