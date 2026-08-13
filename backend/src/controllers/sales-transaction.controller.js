const SalesTransactionService = require('../services/sales-transaction.service');
const ResponseHelper = require('../helpers/response.helper');
const { createSalesTransactionSchema } = require('../validators/sales-transaction.validator');
const DTOHelper = require('../helpers/dto.helper');

class SalesTransactionController {
  async create(req, res, next) {
    try {
      const validatedData = createSalesTransactionSchema.parse(req.body);
      const transaction = await SalesTransactionService.createSalesTransaction(validatedData, req.user.id);
      
      return ResponseHelper.created(res, DTOHelper.toSalesTransaction(transaction), 'Sales Transaction created successfully');
    } catch (error) {
      next(error);
    }
  }

  async confirm(req, res, next) {
    try {
      const transactionId = Number(req.params.id);
      const transaction = await SalesTransactionService.confirmTransaction(transactionId, req.user.id);
      
      return ResponseHelper.success(res, DTOHelper.toSalesTransaction(transaction), 'Sales Transaction confirmed successfully');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const transactionId = Number(req.params.id);
      const transaction = await SalesTransactionService.cancelTransaction(transactionId, req.user.id);
      
      return ResponseHelper.success(res, DTOHelper.toSalesTransaction(transaction), 'Sales Transaction cancelled successfully');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const transactionId = Number(req.params.id);
      const transaction = await SalesTransactionService.getTransactionById(transactionId);
      
      return ResponseHelper.success(res, DTOHelper.toSalesTransaction(transaction), 'Sales Transaction retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SalesTransactionController();
