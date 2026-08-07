const paymentService = require('../services/payment.service');
const ResponseHelper = require('../helpers/response.helper');
const { createPaymentSchema } = require('../validators/payment.validator');
const DTOHelper = require('../helpers/dto.helper');

class PaymentController {
  async create(req, res, next) {
    try {
      const validatedData = createPaymentSchema.parse(req.body);
      const payment = await paymentService.createPayment(validatedData, req.user.sub);
      
      return ResponseHelper.created(res, DTOHelper.toPayment(payment), 'Pembayaran berhasil dicatat');
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const paymentId = Number(req.params.id);
      const payment = await paymentService.getPaymentById(paymentId);
      
      return ResponseHelper.success(res, DTOHelper.toPayment(payment), 'Detail pembayaran berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  async getByTransaction(req, res, next) {
    try {
      const transactionId = Number(req.params.id);
      const payments = await paymentService.getPaymentsByTransaction(transactionId);
      
      return ResponseHelper.success(res, DTOHelper.toPaymentList(payments), 'Daftar pembayaran berhasil diambil');
    } catch (error) {
      next(error);
    }
  }

  async getAll(req, res, next) {
    try {
      const payments = await paymentService.getAllPayments();
      
      return ResponseHelper.success(res, DTOHelper.toPaymentList(payments), 'Daftar semua pembayaran berhasil diambil');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentController();
