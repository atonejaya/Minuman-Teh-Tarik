const DashboardService = require('../services/DashboardService');
const dashboardValidator = require('../validators/dashboard.validator');
const ResponseHelper = require('../../../helpers/response.helper');

class DashboardController {
  async getSummary(req, res, next) {
    try {
      const { value, error } = dashboardValidator.summary.validate(req.query);
      if (error) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.details[0].message);
      }

      const result = await DashboardService.getSummary(value);
      return res.status(200).json(require('../dto/dashboard.dto').formatResponse(result, 'Success retrieving dashboard summary'));
    } catch (error) {
      next(error);
    }
  }

  async getSalesAnalytics(req, res, next) {
    try {
      const { value, error } = dashboardValidator.salesAnalytics.validate(req.query);
      if (error) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.details[0].message);
      }

      const result = await DashboardService.getSalesAnalytics(value);
      return res.status(200).json(require('../dto/dashboard.dto').formatResponse(result, 'Success retrieving sales analytics'));
    } catch (error) {
      next(error);
    }
  }

  async getProductAnalytics(req, res, next) {
    try {
      const { value, error } = dashboardValidator.productAnalytics.validate(req.query);
      if (error) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.details[0].message);
      }

      const result = await DashboardService.getProductAnalytics(value);
      return res.status(200).json(require('../dto/dashboard.dto').formatResponse(result, 'Success retrieving product analytics'));
    } catch (error) {
      next(error);
    }
  }

  async getCustomerAnalytics(req, res, next) {
    try {
      const { value, error } = dashboardValidator.customerAnalytics.validate(req.query);
      if (error) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.details[0].message);
      }

      const result = await DashboardService.getCustomerAnalytics(value);
      return res.status(200).json(require('../dto/dashboard.dto').formatResponse(result, 'Success retrieving customer analytics'));
    } catch (error) {
      next(error);
    }
  }

  async getReceivableAnalytics(req, res, next) {
    try {
      const { value, error } = dashboardValidator.receivableAnalytics.validate(req.query);
      if (error) {
        return ResponseHelper.badRequest(res, 'VALIDATION_ERROR', error.details[0].message);
      }

      const result = await DashboardService.getReceivableAnalytics(value);
      return res.status(200).json(require('../dto/dashboard.dto').formatResponse(result, 'Success retrieving receivable analytics'));
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
