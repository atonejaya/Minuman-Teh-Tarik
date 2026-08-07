const prisma = require('../../../config/database');
const PiutangService = require('./PiutangService');

class PaymentService {
  async addPayment(transactionId, paymentAmount, paymentDetails = {}) {
    const result = await prisma.$transaction(async (tx) => {
      const transaction = await tx.salesTransaction.findUnique({
        where: { id: transactionId }
      });

      if (!transaction) {
        throw new Error('Transaction not found');
      }

      const newOutstanding = Number(transaction.outstanding_amount) - Number(paymentAmount);
      const newPaid = Number(transaction.paid_amount) + Number(paymentAmount);
      
      let paymentStatus = 'PARTIALLY_PAID';
      if (newOutstanding === 0) {
        paymentStatus = 'PAID';
      } else if (newOutstanding < 0) {
        paymentStatus = 'OVERPAID';
      }

      // Decrement outstanding_amount and update payment_status
      const updatedTransaction = await tx.salesTransaction.update({
        where: { id: transactionId },
        data: {
          outstanding_amount: newOutstanding,
          paid_amount: newPaid,
          payment_status: paymentStatus
        }
      });

      // Record the payment
      const payment = await tx.payment.create({
        data: {
          transaction_id: transactionId,
          amount: paymentAmount,
          payment_date: new Date(),
          ...paymentDetails
        }
      });

      // Emit PaymentReceived outbox event
      await tx.outboxEvent.create({
        data: {
          event_name: 'PaymentReceived',
          aggregate_id: transactionId.toString(),
          aggregate_type: 'SalesTransaction',
          correlation_id: transactionId.toString(),
          causation_id: payment.id.toString(),
          payload: { payment, transaction: updatedTransaction },
          occurred_at: new Date()
        }
      });

      return { payment, transaction: updatedTransaction };
    });

    await PiutangService.syncAccountsReceivable(transactionId);

    return result;
  }
}

module.exports = new PaymentService();
