const salesReturnService = require('../services/sales-return.service');
const ResponseHelper = require('../helpers/response.helper');
const { createReturnSchema, addReturnItemSchema } = require('../validators/sales-return.validator');
const DTOHelper = require('../helpers/dto.helper');

class SalesReturnController {
  async getReturns(req, res, next) {
    try {
      const filters = {};
      if (req.query.status) filters.status = req.query.status;
      if (req.query.warung_id) filters.warung_id = parseInt(req.query.warung_id, 10);

      const returns = await salesReturnService.getReturns(filters);
      return ResponseHelper.success(res, returns.map(DTOHelper.toSalesReturn), null, 'Sales Returns retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async getReturnById(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const sr = await salesReturnService.getReturnById(id);
      return ResponseHelper.success(res, DTOHelper.toSalesReturn(sr), null, 'Sales Return retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  async createReturn(req, res, next) {
    try {
      const data = createReturnSchema.parse(req.body);
      const sr = await salesReturnService.createReturn(data, req.user.id);
      return ResponseHelper.created(res, DTOHelper.toSalesReturn(sr), 'Sales Return created successfully');
    } catch (error) {
      next(error);
    }
  }

  async addReturnItem(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const data = addReturnItemSchema.parse(req.body);
      const item = await salesReturnService.addReturnItem(id, data, req.user.id);
      return ResponseHelper.created(res, DTOHelper.toSalesReturnItem(item), 'Sales Return Item added successfully');
    } catch (error) {
      next(error);
    }
  }

  async confirmReturn(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const sr = await salesReturnService.confirmReturn(id, req.user.id);
      return ResponseHelper.success(res, DTOHelper.toSalesReturn(sr), null, 'Sales Return confirmed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SalesReturnController();
