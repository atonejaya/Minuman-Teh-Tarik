const RegionalService = require('../services/RegionalService');
const ResponseHelper = require('../../../../helpers/response.helper');

class RegionalController {
  async getAll(req, res) {
    try {
      const data = await RegionalService.getAll();
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
      const data = await RegionalService.getById(id);
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
      const data = await RegionalService.create(req.body);
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
      const data = await RegionalService.update(id, req.body);
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
      const { is_active } = req.body;
      const data = await RegionalService.updateStatus(id, is_active);
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

module.exports = new RegionalController();
