const prisma = require('../config/database');
const paymentRepository = require('../repositories/payment.repository');
const NumberGeneratorService = require('./number-generator.service');
const AuditLogService = require('./audit-log.service');
const { ConflictError, NotFoundError } = require('../exceptions/api-error');
const outboxRepository = require('../repositories/outbox.repository');
const PaymentCreatedEvent = require('../domain/events/PaymentCreatedEvent');

class PaymentService {
  async createPayment(data, userId) {
    return prisma.$transaction(async (tx) => {
      // 1. Ambil transaksi penjualan
      const transaction = await tx.salesTransaction.findUnique({
        where: { id: data.transaction_id }
      });

      if (!transaction) {
        throw new NotFoundError('TRANSACTION_NOT_FOUND', 'Transaksi tidak ditemukan');
      }

      // 2. Validasi status invoice harus CONFIRMED
      if (transaction.status !== 'CONFIRMED') {
        throw new ConflictError('INVALID_STATUS', 'Pembayaran hanya bisa dilakukan pada transaksi CONFIRMED');
      }

      // 3. Validasi Payment Date tidak boleh di masa depan
      const paymentDate = new Date(data.payment_date);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (paymentDate > today) {
        throw new ConflictError('INVALID_DATE', 'Tanggal pembayaran tidak boleh di masa depan');
      }

      // 4. Validasi amount tidak melebih outstanding
      const outstandingAmount = Number(transaction.outstanding_amount);
      const paymentAmount = Number(data.amount);

      if (paymentAmount <= 0) {
        throw new ConflictError('INVALID_AMOUNT', 'Nominal pembayaran harus lebih besar dari 0');
      }

      if (paymentAmount > outstandingAmount) {
        throw new ConflictError('PAYMENT_EXCEEDS_OUTSTANDING', 'Nominal pembayaran melebihi sisa tagihan (Outstanding)');
      }

      // 5. Generate Code
      const code = await NumberGeneratorService.generateCode('PAY', paymentDate, tx);

      // 6. Catat Payment (append-only)
      const payment = await paymentRepository.create({
        code,
        transaction_id: transaction.id,
        payment_date: paymentDate,
        payment_method: data.payment_method,
        amount: data.amount,
        notes: data.notes,
        collection_id: data.collection_id,
        created_by: userId
      }, tx);

      // 7. Hitung saldo baru
      const newPaidAmount = Number(transaction.paid_amount) + paymentAmount;
      const newOutstandingAmount = Number(transaction.grand_total) - newPaidAmount;
      
      // Tentukan payment_status
      let newPaymentStatus = 'PARTIALLY_PAID';
      if (newOutstandingAmount <= 0) {
        newPaymentStatus = 'PAID';
      }

      // 8. Update SalesTransaction
      await tx.salesTransaction.update({
        where: { id: transaction.id },
        data: {
          paid_amount: newPaidAmount,
          outstanding_amount: newOutstandingAmount,
          payment_status: newPaymentStatus
        }
      });

      // 9. Audit Log
      const action = newPaymentStatus === 'PAID' ? 'CREATE_PAYMENT_FULL' : 'CREATE_PAYMENT_PARTIAL';
      await AuditLogService.log(action, 'Payment', payment.id, { 
        transaction_id: transaction.id, 
        amount: paymentAmount, 
        method: data.payment_method 
      }, userId, tx);

      // Enrich event context
      const stock = await tx.mobileStock.findFirst({
        where: { sales_id: transaction.sales_id }
      });
      const warehouse_id = stock ? stock.warehouse_id : 1;

      // 10. Insert Outbox Event
      const event = new PaymentCreatedEvent(payment.id, {
        code,
        transaction_id: transaction.id,
        sales_id: transaction.sales_id,
        warung_id: transaction.warung_id,
        warehouse_id: warehouse_id,
        amount: paymentAmount,
        payment_method: data.payment_method
      }, { userId });
      await outboxRepository.insert(event, tx);

      return payment;
    });
  }

  async getPaymentById(id) {
    const payment = await paymentRepository.findById(id);
    if (!payment) throw new NotFoundError('PAYMENT_NOT_FOUND', 'Data pembayaran tidak ditemukan');
    return payment;
  }

  async getPaymentsByTransaction(transactionId) {
    return paymentRepository.findByTransaction(transactionId);
  }

  async getAllPayments() {
    return paymentRepository.findMany();
  }
}

module.exports = new PaymentService();
