const ReportingService = require('../services/ReportingService');
const reportingValidator = require('../validators/reporting.validator');
const ResponseHelper = require('../../../helpers/response.helper');

class ReportingController {
  async getDailySales(req, res, next) {
    try {
      const { value, error } = reportingValidator.dailySales.validate(req.query);
      if (error) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.details[0].message);
      }

      const { page, limit, sort, order, ...filters } = value;
      const pagination = { page, limit, sort, order };

      const result = await ReportingService.getDailySales(filters, pagination);

      // Construct exactly as requested
      return res.status(200).json({
        success: true,
        message: 'Success retrieving daily sales report',
        data: result.data,
        summary: result.summary,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getCustomerLedger(req, res, next) {
    try {
      const { value, error } = reportingValidator.customerLedger.validate(req.query);
      if (error) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.details[0].message);
      }

      const { page, limit, sort, order, ...filters } = value;
      const pagination = { page, limit, sort, order };

      const result = await ReportingService.getCustomerLedger(filters, pagination);

      return res.status(200).json({
        success: true,
        message: 'Success retrieving customer ledger report',
        data: result.data,
        summary: result.summary,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getProductSales(req, res, next) {
    try {
      const { value, error } = reportingValidator.productSales.validate(req.query);
      if (error) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.details[0].message);
      }

      const { page, limit, sort, order, ...filters } = value;
      const pagination = { page, limit, sort, order };

      const result = await ReportingService.getProductSales(filters, pagination);

      return res.status(200).json({
        success: true,
        message: 'Success retrieving product sales report',
        data: result.data,
        summary: result.summary,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }

  async getSalesPerformance(req, res, next) {
    try {
      const { value, error } = reportingValidator.salesPerformance.validate(req.query);
      if (error) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.details[0].message);
      }

      const { page, limit, sort, order, ...filters } = value;
      const pagination = { page, limit, sort, order };

      const result = await ReportingService.getSalesPerformance(filters, pagination);

      return res.status(200).json({
        success: true,
        message: 'Success retrieving sales performance report',
        data: result.data,
        summary: result.summary,
        pagination: result.pagination
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ReportingController();
