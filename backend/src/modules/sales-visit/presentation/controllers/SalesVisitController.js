const SalesVisitService = require('../../application/services/SalesVisitService');
const ResponseHelper = require('../../../../helpers/response.helper');

class SalesVisitController {
  constructor() {
    this.createVisit = this.createVisit.bind(this);
    this.listVisits = this.listVisits.bind(this);
    this.getVisit = this.getVisit.bind(this);
    this.checkIn = this.checkIn.bind(this);
    this.recordStockCount = this.recordStockCount.bind(this);
    this.recordOrder = this.recordOrder.bind(this);
    this.recordDelivery = this.recordDelivery.bind(this);
    this.checkOut = this.checkOut.bind(this);
    this.complete = this.complete.bind(this);
    this.cancel = this.cancel.bind(this);
    this.addNote = this.addNote.bind(this);
    this.addPhoto = this.addPhoto.bind(this);
    this.getTimeline = this.getTimeline.bind(this);
    this.getInventory = this.getInventory.bind(this);
    this.getSalesHistory = this.getSalesHistory.bind(this);
  }

  async createVisit(req, res, next) {
    try {
      const result = await SalesVisitService.createVisit(req.body, req.user);
      return ResponseHelper.created(res, result, null, 'Sales Visit Planned');
    } catch (error) {
      next(error);
    }
  }

  async listVisits(req, res, next) {
    try {
      const result = await SalesVisitService.listVisits(req.query, req.user);
      return ResponseHelper.success(res, result.data, result.pagination, 'Get Sales Visits');
    } catch (error) {
      next(error);
    }
  }

  async getVisit(req, res, next) {
    try {
      const result = await SalesVisitService.getVisit(req.params.id, req.user);
      return ResponseHelper.success(res, result, null, 'Get Sales Visit');
    } catch (error) {
      next(error);
    }
  }

  async checkIn(req, res, next) {
    try {
      const result = await SalesVisitService.checkIn(req.params.id, req.body, req.user);
      return ResponseHelper.success(res, result, null, 'Sales Visit Checked In');
    } catch (error) {
      next(error);
    }
  }

  async recordStockCount(req, res, next) {
    try {
      const result = await SalesVisitService.recordStockCount(req.params.id, req.body, req.user);
      return ResponseHelper.success(res, result, null, 'Stock Count Recorded');
    } catch (error) {
      next(error);
    }
  }

  async recordOrder(req, res, next) {
    try {
      const result = await SalesVisitService.recordOrder(req.params.id, req.body, req.user);
      return ResponseHelper.success(res, result, null, 'Order Recorded');
    } catch (error) {
      next(error);
    }
  }

  async recordDelivery(req, res, next) {
    try {
      const result = await SalesVisitService.recordDelivery(req.params.id, req.body, req.user);
      return ResponseHelper.success(res, result, null, 'Delivery Recorded');
    } catch (error) {
      next(error);
    }
  }

  async checkOut(req, res, next) {
    try {
      const result = await SalesVisitService.checkOut(req.params.id, req.body, req.user);
      return ResponseHelper.success(res, result, null, 'Sales Visit Checked Out');
    } catch (error) {
      next(error);
    }
  }

  async complete(req, res, next) {
    try {
      const result = await SalesVisitService.complete(req.params.id, req.user);
      return ResponseHelper.success(res, result, null, 'Sales Visit Completed');
    } catch (error) {
      next(error);
    }
  }

  async cancel(req, res, next) {
    try {
      const result = await SalesVisitService.cancel(req.params.id, req.body, req.user);
      return ResponseHelper.success(res, result, null, 'Sales Visit Cancelled');
    } catch (error) {
      next(error);
    }
  }

  async addNote(req, res, next) {
    try {
      const result = await SalesVisitService.addNote(req.params.id, req.body, req.user);
      return ResponseHelper.success(res, result, null, 'Note Added');
    } catch (error) {
      next(error);
    }
  }

  async addPhoto(req, res, next) {
    try {
      const result = await SalesVisitService.addPhoto(req.params.id, req.body, req.user);
      return ResponseHelper.success(res, result, null, 'Photo Added');
    } catch (error) {
      next(error);
    }
  }

  async getTimeline(req, res, next) {
    try {
      const result = await SalesVisitService.getTimeline(req.params.id, req.user);
      return ResponseHelper.success(res, result, null, 'Get Sales Visit Timeline');
    } catch (error) {
      next(error);
    }
  }

  async getInventory(req, res, next) {
    try {
      const result = await SalesVisitService.getInventory(req.params.id, req.user);
      return ResponseHelper.success(res, result, null, 'Get Outlet Stock Projection');
    } catch (error) {
      next(error);
    }
  }

  async getSalesHistory(req, res, next) {
    try {
      const result = await SalesVisitService.getSalesHistory(req.params.id, req.user, req.query);
      return ResponseHelper.success(res, result.data, result.pagination, 'Get Outlet Sales History');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SalesVisitController();
