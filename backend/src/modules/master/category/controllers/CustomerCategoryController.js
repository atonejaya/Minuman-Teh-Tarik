const CustomerCategoryService = require('../services/CustomerCategoryService');
const ResponseHelper = require('../../../../helpers/response.helper');

class CustomerCategoryController {
  async getAll(req, res) {
    try {
      const data = await CustomerCategoryService.getAll();
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
      const data = await CustomerCategoryService.getById(id);
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
      const data = await CustomerCategoryService.create(req.body);
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
      const data = await CustomerCategoryService.update(id, req.body);
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
      const data = await CustomerCategoryService.updateStatus(id, is_active);
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

module.exports = new CustomerCategoryController();
