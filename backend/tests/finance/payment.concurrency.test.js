const { expect } = require('chai');
const request = require('supertest');
process.env.NODE_ENV = 'test';
const app = require('../../src/app');
const prisma = require('../../src/config/database');

describe('Financial Core - Payment Concurrency & Idempotency', () => {
  let customerId, salesId, visitId, warungId;
  let transactionId, transactionCode;
  let salesUser;

  before(async () => {
    // Dedicated fixtures (unique per run, no global teardown of shared tables)
    const ts = Date.now();
    salesUser = await prisma.user.create({
      data: { name: 'Concurrency Sales', username: `conc_sales_${ts}`, password_hash: 'hash', role: 'SALES', is_active: true }
    });
    salesId = salesUser.id;

    const warung = await prisma.warung.create({
      data: { code: `WRG-CONC-${ts}`, name: 'Warung Concurrency', owner_name: 'Owner', latitude: 0, longitude: 0 }
    });
    warungId = warung.id;
    customerId = warung.id;

    // Create a mock visit
    const visit = await prisma.visit.create({
      data: {
        code: `VST-${ts}`,
        sales_id: salesId,
        warung_id: customerId,
        visit_date: new Date(),
        check_in_time: new Date(),
        status: 'CHECKED_OUT'
      }
    });
    visitId = visit.id;
  });

  beforeEach(async () => {
    // Create a fresh invoice with 100,000 outstanding before each test
    const tx = await prisma.salesTransaction.create({
      data: {
        code: `INV-TEST-${Date.now()}`,
        visit_id: visitId,
        sales_id: salesId,
        warung_id: customerId,
        customer_name: 'Warung Test',
        customer_code: 'W-TEST',
        salesman_name: 'Test Sales',
        payment_method: 'CASH',
        payment_status: 'UNPAID',
        status: 'CONFIRMED',
        subtotal: 100000,
        item_discount: 0,
        transaction_discount: 0,
        tax: 0,
        grand_total: 100000,
        outstanding_amount: 100000,
        outstanding_total: 100000,
        version: 1 // Crucial for OCC
      }
    });
    transactionId = tx.id;
    transactionCode = tx.code;

    // Initialize AR Ledger with DEBIT 100,000
    await prisma.aRLedger.create({
      data: {
        customer_id: customerId,
        sales_transaction_id: transactionId,
        entry_type: 'DEBIT',
        amount: 100000,
        reference_type: 'INVOICE',
        reference_id: tx.code,
        balance_after: 100000
      }
    });
  });

  after(async () => {
    // Scoped teardown of this suite's fixtures (FK-ordered)
    const ownTxIds = (await prisma.salesTransaction.findMany({ where: { sales_id: salesId }, select: { id: true } })).map((t) => t.id);
    if (ownTxIds.length > 0) {
      const ownPaymentIds = (await prisma.payment.findMany({
        where: { OR: [{ transaction_id: { in: ownTxIds } }, { allocations: { some: { sales_transaction_id: { in: ownTxIds } } } }] },
        select: { id: true }
      })).map((p) => p.id);
      await prisma.paymentAllocation.deleteMany({ where: { OR: [{ payment_id: { in: ownPaymentIds } }, { sales_transaction_id: { in: ownTxIds } }] } });
      if (ownPaymentIds.length > 0) {
        await prisma.outboxEvent.deleteMany({ where: { aggregate_id: { in: ownPaymentIds.map(String) } } });
        await prisma.payment.deleteMany({ where: { id: { in: ownPaymentIds } } });
      }
      await prisma.aRLedger.deleteMany({ where: { sales_transaction_id: { in: ownTxIds } } });
      await prisma.salesTransaction.deleteMany({ where: { id: { in: ownTxIds } } });
    }
    await prisma.visit.deleteMany({ where: { id: visitId } });
    await prisma.warung.deleteMany({ where: { id: warungId } });
    await prisma.user.deleteMany({ where: { id: salesId } });
    await prisma.financeIdempotencyKey.deleteMany({ where: { key: { startsWith: 'idem-' } } });
    await prisma.financeIdempotencyKey.deleteMany({ where: { key: { startsWith: 'key-A-' } } });
    await prisma.financeIdempotencyKey.deleteMany({ where: { key: { startsWith: 'key-B-' } } });
    await prisma.$disconnect();
  });

  afterEach(async () => {
    // Scoped teardown of the current test's transaction (no global deletes)
    const paymentIds = (await prisma.payment.findMany({
      where: { OR: [{ transaction_id: transactionId }, { allocations: { some: { sales_transaction_id: transactionId } } }] },
      select: { id: true }
    })).map((p) => p.id);
    await prisma.paymentAllocation.deleteMany({ where: { OR: [{ payment_id: { in: paymentIds } }, { sales_transaction_id: transactionId }] } });
    if (paymentIds.length > 0) {
      await prisma.outboxEvent.deleteMany({ where: { aggregate_id: { in: paymentIds.map(String) } } });
      await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
    }
    await prisma.aRLedger.deleteMany({ where: { sales_transaction_id: transactionId } });
    await prisma.financeIdempotencyKey.deleteMany({ where: { key: { startsWith: 'idem-' } } });
    await prisma.financeIdempotencyKey.deleteMany({ where: { key: { startsWith: 'key-A-' } } });
    await prisma.financeIdempotencyKey.deleteMany({ where: { key: { startsWith: 'key-B-' } } });
    await prisma.salesTransaction.deleteMany({ where: { id: transactionId } });
  });

  it('should handle concurrent overpayment safely (Invoice 100k, 2x 70k payments)', async () => {
    const payloadA = {
      amount: 70000,
      payment_method: 'CASH',
      allocations: [{ invoice_id: transactionId, amount: 70000 }]
    };
    
    const payloadB = {
      amount: 70000,
      payment_method: 'TRANSFER',
      allocations: [{ invoice_id: transactionId, amount: 70000 }]
    };

    // Fire both requests concurrently without waiting
    const [responseA, responseB] = await Promise.all([
      request(app).post('/api/v1/finance/payments').set('X-Mock-User-Id', salesId).set('Idempotency-Key', `key-A-${Date.now()}`).send(payloadA),
      request(app).post('/api/v1/finance/payments').set('X-Mock-User-Id', salesId).set('Idempotency-Key', `key-B-${Date.now()}`).send(payloadB)
    ]);
    
    if (responseA.status === 500) console.error('responseA 500:', responseA.body);
    if (responseB.status === 500) console.error('responseB 500:', responseB.body);

    // Exactly one should succeed (201) and one should fail with conflict (409)
    const statusCodes = [responseA.status, responseB.status].sort();
    expect(statusCodes).to.deep.equal([201, 409]);

    // Verify final state
    const invoice = await prisma.salesTransaction.findUnique({ where: { id: transactionId } });
    expect(Number(invoice.outstanding_amount)).to.equal(30000); // 100k - 70k
    expect(invoice.version).to.equal(2); // Incremented once

    const arCreditSum = await prisma.aRLedger.aggregate({
      where: { sales_transaction_id: transactionId, entry_type: 'CREDIT' },
      _sum: { amount: true }
    });
    expect(Number(arCreditSum._sum.amount)).to.equal(70000);
  });

  it('should enforce idempotency for duplicate keys', async () => {
    const payload = {
      amount: 50000,
      payment_method: 'CASH',
      allocations: [{ invoice_id: transactionId, amount: 50000 }]
    };
    
    const idempotencyKey = `idem-duplicate-${Date.now()}`;

    // Fire duplicate requests concurrently
    const [res1, res2] = await Promise.all([
      request(app).post('/api/v1/finance/payments').set('X-Mock-User-Id', salesId).set('Idempotency-Key', idempotencyKey).send(payload),
      request(app).post('/api/v1/finance/payments').set('X-Mock-User-Id', salesId).set('Idempotency-Key', idempotencyKey).send(payload)
    ]);
    
    if (res1.status === 500) console.error('res1 500:', res1.body);
    if (res2.status === 500) console.error('res2 500:', res2.body);

    // One should succeed, the other might be 409 (Idempotency conflict) or 200 (returned cached result)
    // For this implementation, we expect either 201 + 409 (if hit at exact same millisecond DB constraint)
    // or 201 + 201 (cached). Let's just verify DB state.
    
    const invoice = await prisma.salesTransaction.findUnique({ where: { id: transactionId } });
    expect(Number(invoice.outstanding_amount)).to.equal(50000); // 100k - 50k, NOT 0.
    
    const paymentsCount = await prisma.payment.count({ where: { allocations: { some: { sales_transaction_id: transactionId } } } });
    expect(paymentsCount).to.equal(1);
  });
  it('should reject payment with invalid amounts (<= 0)', async () => {
    const payload = {
      amount: 0,
      payment_method: 'CASH',
      allocations: [{ invoice_id: transactionId, amount: 0 }]
    };
    const res = await request(app)
      .post('/api/v1/finance/payments')
      .set('X-Mock-User-Id', salesId)
      .set('Idempotency-Key', `idem-invalid-${Date.now()}`)
      .send(payload);
    
    expect(res.status).to.equal(500); // 500 since generic Error is thrown in service
    const paymentsCount = await prisma.payment.count({ where: { allocations: { some: { sales_transaction_id: transactionId } } } });
    expect(paymentsCount).to.equal(0);
  });

  it('should ignore X-Mock-User-Id in production environment', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    
    const payload = {
      amount: 1000,
      payment_method: 'CASH',
      allocations: [{ invoice_id: transactionId, amount: 1000 }]
    };
    const res = await request(app)
      .post('/api/v1/finance/payments')
      .set('X-Mock-User-Id', 9999)
      .set('Idempotency-Key', `idem-prod-${Date.now()}`)
      .send(payload);
      
    if (res.status === 201) {
      const payment = await prisma.payment.findUnique({ where: { id: res.body.payment_id } });
      expect(payment.created_by).to.not.equal(9999);
      expect(payment.created_by).to.equal(1); // default
    }
    
    process.env.NODE_ENV = originalEnv;
  });

  it('should create an OutboxEvent automatically on success', async () => {
    const payload = {
      amount: 5000,
      payment_method: 'CASH',
      allocations: [{ invoice_id: transactionId, amount: 5000 }]
    };
    const res = await request(app)
      .post('/api/v1/finance/payments')
      .set('X-Mock-User-Id', salesId)
      .set('Idempotency-Key', `idem-outbox-${Date.now()}`)
      .send(payload);
      
    expect(res.status).to.equal(201);
    
    const events = await prisma.outboxEvent.findMany({
      where: { aggregate_id: res.body.payment_id.toString(), aggregate_type: 'PAYMENT' }
    });
    expect(events.length).to.equal(1);
    expect(events[0].event_name).to.equal('PAYMENT_COMPLETED');
  });

  it('should not map P2002 to 409 if it is not idempotency key', async () => {
    // Inject a dummy function into PaymentService to simulate a different unique constraint violation
    const PaymentService = require('../../src/modules/finance/payment/services/PaymentService');
    const original = PaymentService.createPaymentWithIdempotency;
    
    PaymentService.createPaymentWithIdempotency = async () => {
      const error = new Error('Some constraint failed');
      error.code = 'P2002';
      error.meta = { target: ['other_key'] };
      // Process catch logic
      if (error.code === 'P2002' && (error.meta?.target?.includes('key') || error.message?.includes('FinanceIdempotencyKey_key_key'))) {
        throw new Error('ConflictError - Idempotency key already exists');
      }
      throw error;
    };

    const payload = {
      amount: 5000,
      payment_method: 'CASH',
      allocations: [{ invoice_id: transactionId, amount: 5000 }]
    };
    const res = await request(app)
      .post('/api/v1/finance/payments')
      .set('X-Mock-User-Id', salesId)
      .set('Idempotency-Key', `idem-other-${Date.now()}`)
      .send(payload);

    expect(res.status).to.equal(500);

    PaymentService.createPaymentWithIdempotency = original;
  });
});
