const DashboardOwnerService = require('../services/DashboardOwnerService');
const DashboardSalesService = require('../services/DashboardSalesService');

class DashboardController {
  async getOwnerSummary(req, res, next) {
    try {
      const date = req.query.date ? new Date(req.query.date) : new Date();
      const response = await DashboardOwnerService.getSummary(date);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getOwnerProducts(req, res, next) {
    try {
      const date = req.query.date ? new Date(req.query.date) : new Date();
      const response = await DashboardOwnerService.getProducts(date);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getOwnerVisits(req, res, next) {
    try {
      const date = req.query.date ? new Date(req.query.date) : new Date();
      const response = await DashboardOwnerService.getVisits(date);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getSalesSummary(req, res, next) {
    try {
      const date = req.query.date ? new Date(req.query.date) : new Date();
      const salesId = req.user.id;
      const response = await DashboardSalesService.getSummary(salesId, date);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getSalesVisits(req, res, next) {
    try {
      const date = req.query.date ? new Date(req.query.date) : new Date();
      const salesId = req.user.id;
      const response = await DashboardSalesService.getVisits(salesId, date);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async getSalesInventory(req, res, next) {
    try {
      const salesId = req.user.id;
      const response = await DashboardSalesService.getInventory(salesId);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DashboardController();
