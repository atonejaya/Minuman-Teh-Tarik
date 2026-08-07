const PriceLevelService = require('../services/PriceLevelService');

class PriceLevelController {
  async getAll(req, res) {
    try {
      const data = await PriceLevelService.getAll(req.query);
      res.json({ success: true, message: 'Price levels retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const data = await PriceLevelService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Price level not found' });
      res.json({ success: true, message: 'Price level retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req, res) {
    try {
      const data = await PriceLevelService.create(req.body);
      res.status(201).json({ success: true, message: 'Price level created successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const data = await PriceLevelService.update(req.params.id, req.body);
      res.json({ success: true, message: 'Price level updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const data = await PriceLevelService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, message: 'Price level status updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new PriceLevelController();
