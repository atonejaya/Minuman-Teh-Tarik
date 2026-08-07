const SalesStockIssueService = require('../services/SalesStockIssueService');
const ResponseHelper = require('../../../helpers/response.helper');

class SalesStockIssueController {
  constructor() {
    this.createDraft = this.createDraft.bind(this);
    this.confirm = this.confirm.bind(this);
    this.close = this.close.bind(this);
    this.getAll = this.getAll.bind(this);
    this.getById = this.getById.bind(this);
  }

  async createDraft(req, res, next) {
    try {
      const data = req.body;
      const userId = req.user?.id || 1;
      const issue = await SalesStockIssueService.createDraft(data, userId);
      return ResponseHelper.created(res, issue, 'Sales Stock Issue Draft Created');
    } catch (error) {
      next(error);
    }
  }

  async confirm(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 1;
      const result = await SalesStockIssueService.confirm(id, userId);
      return ResponseHelper.success(res, result, null, 'Sales Stock Issue Confirmed');
    } catch (error) {
      next(error);
    }
  }

  async close(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || 1;
      const result = await SalesStockIssueService.close(id, userId);
      return ResponseHelper.success(res, result, null, 'Sales Stock Issue Closed');
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const result = await SalesStockIssueService.getAll(req.query);
      return ResponseHelper.success(res, result.data, result.pagination, 'Get Sales Stock Issues');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      const result = await SalesStockIssueService.getById(id);
      return ResponseHelper.success(res, result, null, 'Get Sales Stock Issue');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SalesStockIssueController();
