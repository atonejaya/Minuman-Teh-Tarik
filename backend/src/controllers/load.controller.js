const LoadService = require('../services/load.service');
const ResponseHelper = require('../helpers/response.helper');
const { createLoadSchema } = require('../validators/load.validator');

class LoadController {
  static async create(req, res, next) {
    try {
      const parsed = createLoadSchema.safeParse(req.body);
      if (!parsed.success) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', 'Validation Failed', parsed.error.issues);
      }

      const { warehouse_id, sales_id, load_date, notes, items } = parsed.data;
      const load = await LoadService.createLoad(warehouse_id, sales_id, load_date, notes, items, req.user);
      
      return ResponseHelper.created(res, load, 'Load berhasil dibuat');
    } catch (error) {
      next(error);
    }
  }

  static async confirm(req, res, next) {
    try {
      const loadId = parseInt(req.params.id, 10);
      const load = await LoadService.confirmLoad(loadId, req.user);
      return ResponseHelper.success(res, load, null, 'Load berhasil dikonfirmasi');
    } catch (error) {
      next(error);
    }
  }

  static async cancel(req, res, next) {
    try {
      const loadId = parseInt(req.params.id, 10);
      const load = await LoadService.cancelLoad(loadId, req.user);
      return ResponseHelper.success(res, load, null, 'Load berhasil dibatalkan');
    } catch (error) {
      next(error);
    }
  }

  static async getLoads(req, res, next) {
    try {
      const query = {
        page: parseInt(req.query.page, 10) || 1,
        limit: parseInt(req.query.limit, 10) || 10,
        sales_id: req.query.sales_id ? parseInt(req.query.sales_id, 10) : undefined,
        status: req.query.status,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const result = await LoadService.getLoads(query);
      return ResponseHelper.success(res, result.data, result.meta, 'Data Load berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  static async getById(req, res, next) {
    try {
      const loadId = parseInt(req.params.id, 10);
      const load = await LoadService.getLoadById(loadId);
      return ResponseHelper.success(res, load, null, 'Data Load berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  static async getMobileStock(req, res, next) {
    try {
      // By default, if accessed by SALES, only get their own stock
      // If accessed by OWNER, can get any sales stock via query param
      let salesId = req.user.id;
      if (req.user.role === 'OWNER' && req.query.sales_id) {
        salesId = parseInt(req.query.sales_id, 10);
      }

      const stock = await LoadService.getMobileStock(salesId);
      return ResponseHelper.success(res, stock, null, 'Data Mobile Stock berhasil diambil');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = LoadController;
