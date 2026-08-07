const OutletInventoryService = require('../../application/services/OutletInventoryService');
const ResponseHelper = require('../../../../helpers/response.helper');

class OutletInventoryController {
  constructor() {
    this.upsertParStock = this.upsertParStock.bind(this);
    this.getParStock = this.getParStock.bind(this);
    this.getProjection = this.getProjection.bind(this);
    this.getLedger = this.getLedger.bind(this);
    this.recordStockCount = this.recordStockCount.bind(this);
    this.getStockCounts = this.getStockCounts.bind(this);
  }

  async upsertParStock(req, res, next) {
    try {
      const warungId = req.body.warung_id || req.params.warungId;
      const result = await OutletInventoryService.upsertParStock(warungId, req.body.items, req.user?.id || 1);
      return ResponseHelper.success(res, result, null, 'Par Stock Updated');
    } catch (error) {
      next(error);
    }
  }

  async getParStock(req, res, next) {
    try {
      const warungId = req.query.warung_id || req.params.warungId;
      const result = await OutletInventoryService.getParStock(warungId, req.query);
      return ResponseHelper.success(res, result, null, 'Get Par Stock');
    } catch (error) {
      next(error);
    }
  }

  async getProjection(req, res, next) {
    try {
      const { warungId } = req.params;
      const result = await OutletInventoryService.getProjection(warungId, req.query);
      return ResponseHelper.success(res, result, null, 'Get Outlet Stock Projection');
    } catch (error) {
      next(error);
    }
  }

  async getLedger(req, res, next) {
    try {
      const { warungId } = req.params;
      const result = await OutletInventoryService.getLedger(warungId, req.query);
      return ResponseHelper.success(res, result.data, result.pagination, 'Get Outlet Stock Ledger');
    } catch (error) {
      next(error);
    }
  }

  async recordStockCount(req, res, next) {
    try {
      const { warungId } = req.params;
      const result = await OutletInventoryService.recordStockCount(warungId, req.body, req.user?.id || 1);
      return ResponseHelper.success(res, result, null, 'Stock Count Recorded');
    } catch (error) {
      next(error);
    }
  }

  async getStockCounts(req, res, next) {
    try {
      const { warungId } = req.params;
      const result = await OutletInventoryService.getStockCounts(warungId, req.query);
      return ResponseHelper.success(res, result.data, result.pagination, 'Get Stock Counts');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OutletInventoryController();
