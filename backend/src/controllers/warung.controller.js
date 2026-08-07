const WarungService = require('../services/warung.service');
const ResponseHelper = require('../helpers/response.helper');

class WarungController {
  async create(req, res, next) {
    try {
      const warung = await WarungService.createWarung(req.body, req.user.id);
      return ResponseHelper.created(res, warung, 'Warung created successfully');
    } catch (error) {
      if (error.message.includes('already exists') || error.message.includes('already taken')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const warung = await WarungService.updateWarung(req.params.id, req.body, req.user.id);
      return ResponseHelper.success(res, warung, 'Warung updated successfully');
    } catch (error) {
      if (error.message === 'Warung not found') {
        return ResponseHelper.notFound(res, 'WARUNG_NOT_FOUND', error.message);
      }
      if (error.message.includes('already exists') || error.message.includes('already taken') || error.message.includes('Invalid')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const warung = await WarungService.getWarungById(req.params.id);
      return ResponseHelper.success(res, warung);
    } catch (error) {
      if (error.message === 'Warung not found') {
        return ResponseHelper.notFound(res, 'WARUNG_NOT_FOUND', error.message);
      }
      if (error.message.includes('Invalid')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      next(error);
    }
  }

  async list(req, res, next) {
    try {
      const result = await WarungService.listWarungs(req.query);
      return ResponseHelper.success(res, result.data, result.meta, 'Warungs retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      await WarungService.softDeleteWarung(req.params.id, req.user.id);
      return ResponseHelper.success(res, null, 'Warung deleted successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, 'WARUNG_NOT_FOUND', error.message);
      }
      if (error.message.includes('Invalid')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      next(error);
    }
  }

  async restore(req, res, next) {
    try {
      const warung = await WarungService.restoreWarung(req.params.id, req.user.id);
      return ResponseHelper.success(res, warung, 'Warung restored successfully');
    } catch (error) {
      if (error.message.includes('not found')) {
        return ResponseHelper.notFound(res, 'WARUNG_NOT_FOUND', error.message);
      }
      if (error.message.includes('already active') || error.message.includes('Invalid')) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.message);
      }
      next(error);
    }
  }

  async getToday(req, res, next) {
    try {
      // The logged in sales person
      const salesId = req.user.id;
      const route = await WarungService.getTodayRoute(salesId);
      return ResponseHelper.success(res, route, 'Today route fetched successfully');
    } catch (error) {
      next(error);
    }
  }

  async getRoute(req, res, next) {
    try {
      const { day, sales_id } = req.query;
      if (!day || !sales_id) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'day and sales_id are required parameters');
      }
      const route = await WarungService.getRouteByDayAndSales(day, sales_id);
      return ResponseHelper.success(res, route, `Route for sales ${sales_id} on ${day} fetched successfully`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WarungController();
