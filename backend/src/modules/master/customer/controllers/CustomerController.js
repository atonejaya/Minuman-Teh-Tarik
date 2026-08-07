const CustomerService = require('../services/CustomerService');
const { createCustomerSchema, updateCustomerSchema, updateCustomerStatusSchema } = require('../validators/CustomerValidator');

class CustomerController {
  async getAll(req, res) {
    try {
      const data = await CustomerService.getAll(req.query);
      res.json({ success: true, message: 'Customers retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async getById(req, res) {
    try {
      const data = await CustomerService.getById(req.params.id);
      if (!data) return res.status(404).json({ success: false, message: 'Customer not found' });
      res.json({ success: true, message: 'Customer retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  async create(req, res) {
    try {
      const { error, value } = createCustomerSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message });
      
      const data = await CustomerService.create(value, req.user.id);
      res.status(201).json({ success: true, message: 'Customer created successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async update(req, res) {
    try {
      const { error, value } = updateCustomerSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message });
      
      const data = await CustomerService.update(req.params.id, value, req.user.id);
      res.json({ success: true, message: 'Customer updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async updateStatus(req, res) {
    try {
      const { error, value } = updateCustomerStatusSchema.validate(req.body);
      if (error) return res.status(400).json({ success: false, message: error.details[0].message });
      
      const data = await CustomerService.update(req.params.id, { status: value.status }, req.user.id);
      res.json({ success: true, message: 'Customer status updated successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }

  async getDashboard(req, res) {
    try {
      const data = await CustomerService.getDashboardSummary(req.params.id);
      res.json({ success: true, message: 'Customer dashboard retrieved successfully', generated_at: new Date(), data });
    } catch (error) {
      res.status(400).json({ success: false, message: error.message });
    }
  }
}

module.exports = new CustomerController();
