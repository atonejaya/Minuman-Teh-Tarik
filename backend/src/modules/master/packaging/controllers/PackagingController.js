const PackagingService = require('../services/PackagingService');
const ResponseHelper = require('../../../../helpers/response.helper');

class PackagingController {
  async getAll(req, res) {
    try {
      const data = await PackagingService.getAll();
      return res.json({
        success: true,
        message: 'Success retrieving data',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }

  async getById(req, res) {
    try {
      const { id } = req.params;
      const data = await PackagingService.getById(id);
      if (!data) return ResponseHelper.notFound(res);
      
      return res.json({
        success: true,
        message: 'Success retrieving data',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }

  async create(req, res) {
    try {
      const data = await PackagingService.create(req.body);
      return res.status(201).json({
        success: true,
        message: 'Success creating data',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const data = await PackagingService.update(id, req.body);
      return res.json({
        success: true,
        message: 'Success updating data',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }

  async updateStatus(req, res) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const data = await PackagingService.updateStatus(id, status);
      return res.json({
        success: true,
        message: 'Success updating status',
        generated_at: new Date().toISOString(),
        data
      });
    } catch (error) {
      return ResponseHelper.error(res, error);
    }
  }
}

module.exports = new PackagingController();
