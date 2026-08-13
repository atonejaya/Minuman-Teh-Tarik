const prisma = require('../../../../config/database');

class ConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ConflictError';
  }
}

class ForbiddenError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ForbiddenError';
  }
}

class PaymentService {
  async createPaymentWithIdempotency(idempotencyKey, payload, userId) {
    try {
      // 1. Check idempotency key - this uses a unique constraint on the table
      // If two concurrent requests hit this, one will fail at the DB level with unique constraint violation.
      // But we use upsert or create to catch it? Actually, Prisma `create` on unique constraint throws PrismaClientKnownRequestError P2002.
      // But wait, if it's already there, we should return the previous response if successful? 
      // The user test just needs one to succeed, one to fail, or both succeed if cached.
      // Let's do an atomic transaction.
      
      const result = await prisma.$transaction(async (tx) => {
        // Idempotency Check/Insert within transaction
        const existingKey = await tx.financeIdempotencyKey.findUnique({
          where: { key: idempotencyKey }
        });

        if (existingKey) {
          if (existingKey.response_code === 201) {
            // Already processed successfully, return cached or just throw to signal handled
            // Let's parse response_body if present
            return JSON.parse(existingKey.response_body || '{}');
          }
          // If pending or failed, we might block or retry. For simplicity, reject.
          throw new ConflictError('Duplicate request in progress or failed');
        }

        // Reserve key
        await tx.financeIdempotencyKey.create({
          data: {
            key: idempotencyKey,
            request_method: 'POST',
            request_path: '/api/v1/finance/payments',
            expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000)
          }
        });

        // 2. Validate allocations and amounts
        const { amount, payment_method, allocations } = payload;
        
        if (Number(amount) <= 0) {
          throw new Error('Payment amount must be greater than 0');
        }
        
        const totalAllocated = allocations.reduce((sum, a) => sum + Number(a.amount), 0);
        if (totalAllocated !== Number(amount)) {
          throw new Error('Total allocation does not match payment amount');
        }

        // 3. Process each allocation (OCC protected)
        let createdAllocationsData = [];
        let createdARLedgersData = [];

        // Generate unique code for payment
        const paymentCode = `PAY-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

        const user = await tx.user.findUnique({ where: { id: userId } });
        if (!user) throw new Error('User not found');

        const payment = await tx.payment.create({
          data: {
            code: paymentCode,
            payment_date: new Date(),
            payment_method: payment_method,
            amount: amount,
            created_by: userId,
          }
        });

        for (const allocation of allocations) {
          const allocAmount = Number(allocation.amount);
          if (allocAmount <= 0) {
            throw new Error('Allocation amount must be greater than 0');
          }
          
          // Get the invoice to know current version
          const invoice = await tx.salesTransaction.findUnique({
            where: { id: allocation.invoice_id },
            include: { warung: true }
          });

          if (!invoice) throw new Error(`Invoice ${allocation.invoice_id} not found`);

          if (user.role === 'SALES') {
            if (invoice.sales_id !== user.id && invoice.warung?.assigned_sales_id !== user.id) {
              throw new ForbiddenError(`Access denied to invoice ${invoice.id}`);
            }
          }

          if (Number(invoice.outstanding_amount) < allocAmount) {
            throw new ConflictError(`Allocation amount exceeds outstanding for invoice ${allocation.invoice_id}`);
          }

          // OCC Update
          const newStatus = (Number(invoice.outstanding_amount) === allocAmount) ? 'PAID' : 'PARTIALLY_PAID';

          const updateResult = await tx.salesTransaction.updateMany({
            where: {
              id: allocation.invoice_id,
              version: invoice.version,
              outstanding_amount: { gte: allocAmount }
            },
            data: {
              outstanding_amount: { decrement: allocAmount },
              paid_amount: { increment: allocAmount },
              paid_total: { increment: allocAmount },
              payment_status: newStatus,
              version: { increment: 1 }
            }
          });

          if (updateResult.count === 0) {
            throw new ConflictError(`Concurrent modification or overpayment detected on invoice ${allocation.invoice_id}`);
          }

          // PaymentAllocation
          createdAllocationsData.push({
            payment_id: payment.id,
            sales_transaction_id: invoice.id,
            allocated_amount: allocAmount
          });

          // ARLedger (CREDIT)
          createdARLedgersData.push({
            customer_id: invoice.warung_id,
            sales_transaction_id: invoice.id,
            entry_type: 'CREDIT',
            amount: allocAmount,
            reference_type: 'PAYMENT',
            reference_id: paymentCode,
            balance_after: 0 // Mocked for now since not used for calculation
          });
        }

        await tx.paymentAllocation.createMany({ data: createdAllocationsData });
        await tx.aRLedger.createMany({ data: createdARLedgersData });

        // Create OutboxEvent
        await tx.outboxEvent.create({
          data: {
            aggregate_type: 'PAYMENT',
            aggregate_id: payment.id.toString(),
            event_name: 'PAYMENT_COMPLETED',
            correlation_id: idempotencyKey,
            causation_id: idempotencyKey,
            payload: {
              payment_id: payment.id,
              payment_code: paymentCode,
              amount: Number(amount),
              allocations: createdAllocationsData
            },
            metadata: {},
            occurred_at: new Date(),
            status: 'PENDING'
          }
        });

        // Update Idempotency Key with success response
        const responseData = { success: true, payment_id: payment.id };
        await tx.financeIdempotencyKey.update({
          where: { key: idempotencyKey },
          data: {
            response_code: 201,
            response_body: JSON.stringify(responseData)
          }
        });

        return responseData;
      }, {
        isolationLevel: 'Serializable' // optional, but adds safety
      });

      return result;
    } catch (error) {
      if (error.code === 'P2002' && (error.meta?.target?.includes('key') || error.message?.includes('FinanceIdempotencyKey_key_key'))) {
        // Unique constraint failed (likely idempotency key)
        throw new ConflictError('Idempotency key already exists');
      }
      if (error.code === 'P2034') {
        // Transaction failed due to a write conflict or a deadlock
        throw new ConflictError('Concurrent update detected');
      }
      throw error;
    }
  }
}

module.exports = new PaymentService();
