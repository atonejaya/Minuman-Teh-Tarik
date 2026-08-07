const WarehouseService = require('../services/WarehouseService');

class WarehouseController {
  async getAll(req, res) {
    try {
      const data = await WarehouseService.getAll(req.query);
      res.json({ success: true, message: 'Warehouses retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const data = await WarehouseService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Warehouse not found' });
      res.json({ success: true, message: 'Warehouse retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req, res) {
    try {
      const data = await WarehouseService.create(req.body);
      res.status(201).json({ success: true, message: 'Warehouse created successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const data = await WarehouseService.update(req.params.id, req.body);
      res.json({ success: true, message: 'Warehouse updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const data = await WarehouseService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, message: 'Warehouse status updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new WarehouseController();
