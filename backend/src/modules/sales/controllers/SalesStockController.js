const SalesStockService = require('../services/SalesStockService');
const ResponseHelper = require('../../../helpers/response.helper');

class SalesStockController {
  constructor() {
    this.getProjection = this.getProjection.bind(this);
    this.getLedger = this.getLedger.bind(this);
  }

  async getProjection(req, res, next) {
    try {
      const { salesId } = req.params;
      const { productId } = req.query;

      const result = await SalesStockService.getProjection(salesId, productId);
      return ResponseHelper.success(res, result, null, 'Get Sales Stock Projection');
    } catch (error) {
      next(error);
    }
  }

  async getLedger(req, res, next) {
    try {
      const { salesId } = req.params;
      const { productId } = req.query;

      const result = await SalesStockService.getLedgerEntries(salesId, productId);
      return ResponseHelper.success(res, result, null, 'Get Sales Stock Ledger');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SalesStockController();
