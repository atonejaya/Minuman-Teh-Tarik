const PaymentService = require('../services/PaymentService');

class PaymentController {
  async createPayment(req, res, next) {
    try {
      const idempotencyKey = req.headers['idempotency-key'];
      if (!idempotencyKey) {
        return res.status(400).json({ error: 'Idempotency-Key header is required' });
      }

      let userId = 1; // Default or extract from real auth token
      if (process.env.NODE_ENV === 'test' && req.headers['x-mock-user-id']) {
        userId = parseInt(req.headers['x-mock-user-id']);
      }

      const payload = {
        amount: req.body.amount,
        payment_method: req.body.payment_method,
        allocations: req.body.allocations,
      };

      const result = await PaymentService.createPaymentWithIdempotency(idempotencyKey, payload, userId);
      return res.status(201).json(result);
    } catch (error) {
      if (error.name === 'ConflictError') {
        return res.status(409).json({ error: error.message });
      }
      if (error.name === 'ForbiddenError') {
        return res.status(403).json({ error: error.message });
      }
      next(error);
    }
  }
}

module.exports = new PaymentController();
