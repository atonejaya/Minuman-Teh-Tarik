const warehouseSettlementService = require('../services/warehouse-settlement.service');
const ResponseHelper = require('../helpers/response.helper');

class WarehouseSettlementController {
  async createSettlement(req, res) {
    try {
      console.log('req.user:', req.user);
      const salesId = req.user.id;
      const { warehouse_id } = req.body;
      const settlement = await warehouseSettlementService.createSettlement(salesId, warehouse_id);
      return ResponseHelper.created(res, settlement, 'Warehouse settlement created successfully');
    } catch (error) {
      return ResponseHelper.error(res, error, error.status || 500);
    }
  }

  async startCounting(req, res) {
    try {
      const settlementId = parseInt(req.params.id);
      const userId = req.user.id; // User who starts counting
      const settlement = await warehouseSettlementService.startCounting(settlementId, userId);
      return ResponseHelper.success(res, settlement, 'Settlement status updated to COUNTING');
    } catch (error) {
      return ResponseHelper.error(res, error, error.status || 500);
    }
  }

  async verifySettlement(req, res) {
    try {
      const settlementId = parseInt(req.params.id);
      const verifierId = req.user.id;
      const settlement = await warehouseSettlementService.verifySettlement(settlementId, verifierId, req.body);
      return ResponseHelper.success(res, settlement, 'Settlement verified successfully');
    } catch (error) {
      return ResponseHelper.error(res, error, error.status || 500);
    }
  }

  async completeSettlement(req, res) {
    try {
      const settlementId = parseInt(req.params.id);
      const approverId = req.user.id; // Could be supervisor
      const settlement = await warehouseSettlementService.completeSettlement(settlementId, approverId);
      return ResponseHelper.success(res, settlement, 'Settlement completed successfully');
    } catch (error) {
      return ResponseHelper.error(res, error, error.status || 500);
    }
  }
}

module.exports = new WarehouseSettlementController();
