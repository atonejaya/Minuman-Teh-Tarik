const TaxService = require('../services/TaxService');

class TaxController {
  async getAll(req, res) {
    try {
      const data = await TaxService.getAll(req.query);
      res.json({ success: true, message: 'Taxes retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const data = await TaxService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Tax not found' });
      res.json({ success: true, message: 'Tax retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req, res) {
    try {
      const data = await TaxService.create(req.body);
      res.status(201).json({ success: true, message: 'Tax created successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const data = await TaxService.update(req.params.id, req.body);
      res.json({ success: true, message: 'Tax updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const data = await TaxService.updateStatus(req.params.id, req.body.status);
      res.json({ success: true, message: 'Tax status updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new TaxController();
