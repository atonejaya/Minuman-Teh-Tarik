const SalesTransactionService = require('../services/SalesTransactionService');

class SalesTransactionController {
  constructor() {
    this.createDraft = this.createDraft.bind(this);
    this.addItems = this.addItems.bind(this);
    this.confirmTransaction = this.confirmTransaction.bind(this);
    this.receivePayment = this.receivePayment.bind(this);
  }

  formatResponse(data = null, errors = null, meta = null, pagination = null) {
    return {
      data,
      pagination,
      meta,
      errors
    };
  }

  async createDraft(req, res) {
    try {
      const data = req.body;
      const userId = req.user?.id || 1; // Fallback if no auth middleware
      const transaction = await SalesTransactionService.createDraft(data, userId);
      
      res.status(201).json(this.formatResponse(transaction));
    } catch (error) {
      res.status(400).json(this.formatResponse(null, [{ message: error.message }]));
    }
  }

  async addItems(req, res) {
    try {
      const { id } = req.params;
      const { items } = req.body;
      
      const transaction = await SalesTransactionService.addItems(Number(id), items);
      
      res.status(200).json(this.formatResponse(transaction));
    } catch (error) {
      res.status(400).json(this.formatResponse(null, [{ message: error.message }]));
    }
  }

  async confirmTransaction(req, res) {
    try {
      const { id } = req.params;
      
      const transaction = await SalesTransactionService.confirmTransaction(Number(id));
      
      res.status(200).json(this.formatResponse(transaction));
    } catch (error) {
      res.status(400).json(this.formatResponse(null, [{ message: error.message }]));
    }
  }

  async receivePayment(req, res) {
    try {
      const { id } = req.params;
      const paymentData = req.body;
      const userId = req.user?.id || 1;
      
      const result = await SalesTransactionService.receivePayment(Number(id), paymentData, userId);
      
      res.status(200).json(this.formatResponse(result));
    } catch (error) {
      res.status(400).json(this.formatResponse(null, [{ message: error.message }]));
    }
  }
}

module.exports = new SalesTransactionController();
