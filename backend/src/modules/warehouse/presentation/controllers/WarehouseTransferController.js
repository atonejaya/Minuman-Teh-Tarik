const WarehouseTransferService = require('../../application/services/WarehouseTransferService');
const ResponseHelper = require('../../../../helpers/response.helper');

class WarehouseTransferController {
  constructor() {
    this.issueStockToSales = this.issueStockToSales.bind(this);
    this.receiveReturnedStock = this.receiveReturnedStock.bind(this);
    this.closeSalesDay = this.closeSalesDay.bind(this);
    this.listTransfers = this.listTransfers.bind(this);
    this.getTransfer = this.getTransfer.bind(this);
    this.getLedger = this.getLedger.bind(this);
    this.getSalesDays = this.getSalesDays.bind(this);
  }

  async issueStockToSales(req, res, next) {
    try {
      const result = await WarehouseTransferService.issueStockToSales(req.body, req.user?.id || 1);
      return ResponseHelper.success(res, result, null, 'Stock Issue dari Gudang ke Sales');
    } catch (error) {
      next(error);
    }
  }

  async receiveReturnedStock(req, res, next) {
    try {
      const result = await WarehouseTransferService.receiveReturnedStock(req.body, req.user?.id || 1);
      return ResponseHelper.success(res, result, null, 'Stock Return dari Sales ke Gudang');
    } catch (error) {
      next(error);
    }
  }

  async closeSalesDay(req, res, next) {
    try {
      const result = await WarehouseTransferService.closeSalesDay(req.body, req.user?.id || 1);
      return ResponseHelper.success(res, result, null, 'Sales Day Ditutup');
    } catch (error) {
      next(error);
    }
  }

  async listTransfers(req, res, next) {
    try {
      const result = await WarehouseTransferService.getTransfers(req.query);
      return ResponseHelper.success(res, result.data, result.pagination, 'Get Warehouse Transfers');
    } catch (error) {
      next(error);
    }
  }

  async getTransfer(req, res, next) {
    try {
      const result = await WarehouseTransferService.getTransfer(req.params.id);
      return ResponseHelper.success(res, result, null, 'Get Warehouse Transfer');
    } catch (error) {
      next(error);
    }
  }

  async getLedger(req, res, next) {
    try {
      const result = await WarehouseTransferService.getLedger(req.query);
      return ResponseHelper.success(res, result.data, result.pagination, 'Get Warehouse Ledger');
    } catch (error) {
      next(error);
    }
  }

  async getSalesDays(req, res, next) {
    try {
      const result = await WarehouseTransferService.getSalesDays(req.query);
      return ResponseHelper.success(res, result.data, result.pagination, 'Get Sales Days');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WarehouseTransferController();
