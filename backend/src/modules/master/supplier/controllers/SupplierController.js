const SupplierService = require('../services/SupplierService');

class SupplierController {
  async getAll(req, res) {
    try {
      const data = await SupplierService.getAll(req.query);
      res.json({ success: true, message: 'Suppliers retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const data = await SupplierService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Supplier not found' });
      res.json({ success: true, message: 'Supplier retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req, res) {
    try {
      const data = await SupplierService.create(req.body);
      res.status(201).json({ success: true, message: 'Supplier created successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const data = await SupplierService.update(req.params.id, req.body);
      res.json({ success: true, message: 'Supplier updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const data = await SupplierService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, message: 'Supplier status updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new SupplierController();
