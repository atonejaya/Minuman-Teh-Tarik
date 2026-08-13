const request = require('supertest');
process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const app = require('../../src/app');
const prisma = require('../../src/config/database');

describe('Financial Core - Payment Allocation Matrix', () => {
  let userOwner, userSales1, userSales2;
  let warung1, warung2;
  let visit1, visit2;
  let invoice1, invoice2, invoice3;

  before(async () => {
    // Setup users with unique names
    const ts = Date.now();
    userOwner = await prisma.user.create({ data: { username: `owner_pay_${ts}`, password_hash: 'hash', name: 'Owner', role: 'OWNER' } });
    userSales1 = await prisma.user.create({ data: { username: `sales_pay1_${ts}`, password_hash: 'hash', name: 'Sales 1', role: 'SALES' } });
    userSales2 = await prisma.user.create({ data: { username: `sales_pay2_${ts}`, password_hash: 'hash', name: 'Sales 2', role: 'SALES' } });

    // Setup warungs
    warung1 = await prisma.warung.create({ data: { name: `W1_${ts}`, code: `W1_${ts}`, owner_name: 'O', address: 'A', latitude: 0, longitude: 0, assigned_sales_id: userSales1.id } });
    warung2 = await prisma.warung.create({ data: { name: `W2_${ts}`, code: `W2_${ts}`, owner_name: 'O', address: 'B', latitude: 0, longitude: 0, assigned_sales_id: userSales2.id } });

    // Setup visits
    visit1 = await prisma.visit.create({ data: { code: `V1_${ts}`, sales_id: userSales1.id, warung_id: warung1.id, visit_date: new Date(), status: 'COMPLETED' } });
    visit2 = await prisma.visit.create({ data: { code: `V2_${ts}`, sales_id: userSales2.id, warung_id: warung2.id, visit_date: new Date(), status: 'COMPLETED' } });

    // Setup invoices
    invoice1 = await prisma.salesTransaction.create({
      data: {
        code: `INV-${Date.now()}-1`, visit_id: visit1.id, sales_id: userSales1.id, warung_id: warung1.id,
        customer_name: 'W1', customer_code: 'W1', salesman_name: 'S1', payment_method: 'CASH',
        subtotal: 100000, item_discount: 0, transaction_discount: 0, tax: 0, grand_total: 100000,
        outstanding_amount: 100000, paid_amount: 0, paid_total: 0, payment_status: 'UNPAID', version: 1
      }
    });

    invoice2 = await prisma.salesTransaction.create({
      data: {
        code: `INV-${Date.now()}-2`, visit_id: visit1.id, sales_id: userSales1.id, warung_id: warung1.id,
        customer_name: 'W1', customer_code: 'W1', salesman_name: 'S1', payment_method: 'CASH',
        subtotal: 50000, item_discount: 0, transaction_discount: 0, tax: 0, grand_total: 50000,
        outstanding_amount: 50000, paid_amount: 0, paid_total: 0, payment_status: 'UNPAID', version: 1
      }
    });

    invoice3 = await prisma.salesTransaction.create({
      data: {
        code: `INV-${Date.now()}-3`, visit_id: visit2.id, sales_id: userSales2.id, warung_id: warung2.id,
        customer_name: 'W2', customer_code: 'W2', salesman_name: 'S2', payment_method: 'CASH',
        subtotal: 200000, item_discount: 0, transaction_discount: 0, tax: 0, grand_total: 200000,
        outstanding_amount: 200000, paid_amount: 0, paid_total: 0, payment_status: 'UNPAID', version: 1
      }
    });
  });

  after(async () => {
    // Cleanup (FK-ordered: allocations -> payments -> ARLedger -> transactions -> visit -> warung -> user)
    if (invoice1) {
      const invoiceIds = [invoice1.id, invoice2.id, invoice3.id];
      const paymentIds = (await prisma.payment.findMany({
        where: { OR: [{ transaction_id: { in: invoiceIds } }, { allocations: { some: { sales_transaction_id: { in: invoiceIds } } } }] },
        select: { id: true }
      })).map((p) => p.id);
      await prisma.paymentAllocation.deleteMany({ where: { OR: [{ payment_id: { in: paymentIds } }, { sales_transaction_id: { in: invoiceIds } }] } });
      if (paymentIds.length > 0) {
        await prisma.outboxEvent.deleteMany({ where: { aggregate_id: { in: paymentIds.map(String) } } });
        await prisma.payment.deleteMany({ where: { id: { in: paymentIds } } });
      }
      await prisma.financeIdempotencyKey.deleteMany({ where: { key: { startsWith: 'idem-alloc-' } } });
      await prisma.aRLedger.deleteMany({ where: { sales_transaction_id: { in: invoiceIds } } });
      await prisma.salesTransaction.deleteMany({ where: { id: { in: invoiceIds } } });
    }
    if (visit1) await prisma.visit.deleteMany({ where: { id: { in: [visit1.id, visit2.id] } } });
    if (warung1) await prisma.warung.deleteMany({ where: { id: { in: [warung1.id, warung2.id] } } });
    if (userOwner) await prisma.user.deleteMany({ where: { id: { in: [userOwner.id, userSales1.id, userSales2.id] } } });
    await prisma.$disconnect();
  });

  it('Partial Payment - reduces outstanding and sets status PARTIALLY_PAID', async () => {
    const payload = {
      amount: 40000,
      payment_method: 'CASH',
      allocations: [{ invoice_id: invoice1.id, amount: 40000 }]
    };

    const res = await request(app)
      .post('/api/v1/finance/payments')
      .set('X-Mock-User-Id', userSales1.id)
      .set('Idempotency-Key', `idem-alloc-1-${Date.now()}`)
      .send(payload);

    expect(res.status).to.equal(201);
    
    const inv = await prisma.salesTransaction.findUnique({ where: { id: invoice1.id } });
    expect(Number(inv.outstanding_amount)).to.equal(60000);
    expect(Number(inv.paid_amount)).to.equal(40000);
    expect(inv.payment_status).to.equal('PARTIALLY_PAID');
    expect(inv.version).to.equal(2);
  });

  it('Full Payment (N:1 Allocation part 2) - clears outstanding and sets status PAID', async () => {
    const payload = {
      amount: 60000,
      payment_method: 'CASH',
      allocations: [{ invoice_id: invoice1.id, amount: 60000 }]
    };

    const res = await request(app)
      .post('/api/v1/finance/payments')
      .set('X-Mock-User-Id', userSales1.id)
      .set('Idempotency-Key', `idem-alloc-2-${Date.now()}`)
      .send(payload);

    expect(res.status).to.equal(201);
    
    const inv = await prisma.salesTransaction.findUnique({ where: { id: invoice1.id } });
    expect(Number(inv.outstanding_amount)).to.equal(0);
    expect(Number(inv.paid_amount)).to.equal(100000);
    expect(inv.payment_status).to.equal('PAID');
    expect(inv.version).to.equal(3);
  });

  it('Overpayment - returns 409 Conflict', async () => {
    // invoice2 has 50k outstanding. Pay 60k.
    const payload = {
      amount: 60000,
      payment_method: 'CASH',
      allocations: [{ invoice_id: invoice2.id, amount: 60000 }]
    };

    const res = await request(app)
      .post('/api/v1/finance/payments')
      .set('X-Mock-User-Id', userSales1.id)
      .set('Idempotency-Key', `idem-alloc-3-${Date.now()}`)
      .send(payload);

    expect(res.status).to.equal(409);
    
    const inv = await prisma.salesTransaction.findUnique({ where: { id: invoice2.id } });
    expect(Number(inv.outstanding_amount)).to.equal(50000); // Unchanged
  });

  it('1:N Allocation - correctly splits payment across multiple invoices', async () => {
    // invoice2 has 50k. invoice3 has 200k.
    // Sales1 pays 30k for invoice2, and 100k for invoice3? Wait, Sales1 can't pay invoice3.
    // Let OWNER pay both.
    const payload = {
      amount: 130000,
      payment_method: 'CASH',
      allocations: [
        { invoice_id: invoice2.id, amount: 30000 },
        { invoice_id: invoice3.id, amount: 100000 }
      ]
    };

    const res = await request(app)
      .post('/api/v1/finance/payments')
      .set('X-Mock-User-Id', userOwner.id)
      .set('Idempotency-Key', `idem-alloc-4-${Date.now()}`)
      .send(payload);

    expect(res.status).to.equal(201);
    
    const inv2 = await prisma.salesTransaction.findUnique({ where: { id: invoice2.id } });
    expect(Number(inv2.outstanding_amount)).to.equal(20000);
    expect(inv2.payment_status).to.equal('PARTIALLY_PAID');

    const inv3 = await prisma.salesTransaction.findUnique({ where: { id: invoice3.id } });
    expect(Number(inv3.outstanding_amount)).to.equal(100000);
    expect(inv3.payment_status).to.equal('PARTIALLY_PAID');
  });

  it('IDOR - Sales cannot pay invoice belonging to another sales', async () => {
    // Sales1 tries to pay Invoice3 (belongs to Sales2)
    const payload = {
      amount: 10000,
      payment_method: 'CASH',
      allocations: [{ invoice_id: invoice3.id, amount: 10000 }]
    };

    const res = await request(app)
      .post('/api/v1/finance/payments')
      .set('X-Mock-User-Id', userSales1.id)
      .set('Idempotency-Key', `idem-alloc-5-${Date.now()}`)
      .send(payload);

    expect(res.status).to.equal(403);
    
    const inv3 = await prisma.salesTransaction.findUnique({ where: { id: invoice3.id } });
    expect(Number(inv3.outstanding_amount)).to.equal(100000); // Unchanged from previous test
  });
});
