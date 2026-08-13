const SalesReturnService = require('../services/SalesReturnService');
const ResponseHelper = require('../../../helpers/response.helper');

class SalesReturnController {
  async createDraft(req, res, next) {
    try {
      const data = req.body;
      const result = await SalesReturnService.createDraft(data, req.user);
      return ResponseHelper.created(res, result, 'Sales Return Draft Created');
    } catch (error) {
      next(error);
    }
  }

  async checkReturn(req, res, next) {
    try {
      const { id } = req.params;
      const result = await SalesReturnService.checkReturn(id, req.user);
      return ResponseHelper.success(res, result, null, 'Sales Return Checked');
    } catch (error) {
      next(error);
    }
  }

  async approveReturn(req, res, next) {
    try {
      const { id } = req.params;
      const result = await SalesReturnService.approveReturn(id, req.user);
      return ResponseHelper.success(res, result, null, 'Sales Return Approved');
    } catch (error) {
      next(error);
    }
  }

  async completeReturn(req, res, next) {
    try {
      const { id } = req.params;
      const result = await SalesReturnService.completeReturn(id, req.user);
      return ResponseHelper.success(res, result, null, 'Sales Return Completed');
    } catch (error) {
      next(error);
    }
  }

  async cancelReturn(req, res, next) {
    try {
      const { id } = req.params;
      const result = await SalesReturnService.cancelReturn(id, req.user);
      return ResponseHelper.success(res, result, null, 'Sales Return Cancelled');
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await SalesReturnService.getAll();
      return ResponseHelper.success(res, result, null, 'Get All Sales Returns');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await SalesReturnService.getById(id);
      if (!result) {
        return ResponseHelper.notFound(res, 'NOT_FOUND', 'Sales Return not found');
      }
      return ResponseHelper.success(res, result, null, 'Get Sales Return');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SalesReturnController();
