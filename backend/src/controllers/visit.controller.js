const VisitService = require('../services/visit.service');
const ResponseHelper = require('../helpers/response.helper');
const { checkInSchema, checkOutSchema, cancelSchema, generatePlanSchema } = require('../validators/visit.validator');
const DTOHelper = require('../helpers/dto.helper');

class VisitController {
  static async getTodayVisits(req, res, next) {
    try {
      const date = new Date();
      const visits = await VisitService.getVisitsBySales(req.user.sub, date);
      
      const dtos = visits.map(v => {
        const { ...safe } = v;
        if (safe.sales) safe.sales = DTOHelper.toUser(safe.sales);
        if (safe.warung) safe.warung = DTOHelper.toWarung(safe.warung);
        return safe;
      });

      return ResponseHelper.success(res, dtos, null, 'Visits retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async getVisitById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const visit = await VisitService.getVisitById(id, req.user);
      
      const safe = { ...visit };
      if (safe.sales) safe.sales = DTOHelper.toUser(safe.sales);
      if (safe.warung) safe.warung = DTOHelper.toWarung(safe.warung);

      return ResponseHelper.success(res, safe, null, 'Visit retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  static async generateVisitPlan(req, res, next) {
    try {
      const parsed = generatePlanSchema.safeParse(req.body);
      if (!parsed.success) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validasi gagal', parsed.error.flatten().fieldErrors);
      }

      const dateStr = parsed.data.date || new Date().toISOString();
      const result = await VisitService.generateVisitPlan(req.user.sub, dateStr, req.user);
      
      return ResponseHelper.success(res, result, null, `Visit plan generated (${result.generated} visits)`);
    } catch (error) {
      next(error);
    }
  }

  static async checkIn(req, res, next) {
    try {
      const parsed = checkInSchema.safeParse(req.body);
      if (!parsed.success) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validasi gagal', parsed.error.flatten().fieldErrors);
      }

      const { warung_id, latitude, longitude, before_photo_url, date } = parsed.data;
      const targetDate = date || new Date().toISOString();

      const visit = await VisitService.checkIn(
        req.user.sub,
        warung_id,
        latitude,
        longitude,
        before_photo_url,
        targetDate,
        req.user
      );

      return ResponseHelper.success(res, visit, null, 'Check-in berhasil');
    } catch (error) {
      next(error);
    }
  }

  static async startSelling(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const visit = await VisitService.startSelling(id, req.user);

      return ResponseHelper.success(res, visit, null, 'Status diperbarui menjadi SELLING');
    } catch (error) {
      next(error);
    }
  }

  static async checkOut(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const parsed = checkOutSchema.safeParse(req.body);
      if (!parsed.success) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validasi gagal', parsed.error.flatten().fieldErrors);
      }

      const { latitude, longitude, after_photo_url, signature_url } = parsed.data;
      const visit = await VisitService.checkOut(
        id,
        latitude,
        longitude,
        after_photo_url,
        signature_url,
        req.user
      );

      return ResponseHelper.success(res, visit, null, 'Check-out berhasil');
    } catch (error) {
      next(error);
    }
  }

  static async complete(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const visit = await VisitService.complete(id, req.user);

      return ResponseHelper.success(res, visit, null, 'Visit berhasil diselesaikan');
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const parsed = cancelSchema.safeParse(req.body);
      if (!parsed.success) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validasi gagal', parsed.error.flatten().fieldErrors);
      }

      const visit = await VisitService.cancel(id, parsed.data.reason, req.user);

      return ResponseHelper.success(res, visit, null, 'Visit dibatalkan');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = VisitController;
