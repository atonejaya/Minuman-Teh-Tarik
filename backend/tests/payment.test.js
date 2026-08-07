const request = require('supertest');
const assert = require('assert');
const app = require('../src/app');
const prisma = require('../src/config/database');

describe('Payment Integration Tests', () => {
  let adminToken;
  let testTransaction;
  let testUser;
  let testWarung;

  before(async () => {
    // 1. Create User
    testUser = await prisma.user.create({
      data: {
        username: 'test_payment_sales',
        password_hash: 'hashed',
        name: 'Payment Sales',
        role: 'SALES',
      }
    });

    // 2. Generate Token
    const authRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'test_payment_sales', password: 'password' });
    // In our test environment, we might bypass real auth or just generate token manually.
    // Let's generate a token directly using jwt
    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign({ sub: testUser.id, role: testUser.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    // 3. Create Warung & Visit
    testWarung = await prisma.warung.create({
      data: {
        code: 'WRG-PAY-001',
        name: 'Warung Payment',
        owner_name: 'Bapak Pay',
        latitude: 0,
        longitude: 0
      }
    });

    const visit = await prisma.visit.create({
      data: {
        code: 'VIS-PAY-001',
        sales_id: testUser.id,
        warung_id: testWarung.id,
        status: 'COMPLETED',
        visit_date: new Date()
      }
    });

    // 4. Create CONFIRMED SalesTransaction
    testTransaction = await prisma.salesTransaction.create({
      data: {
        code: 'INV-PAY-001',
        visit_id: visit.id,
        sales_id: testUser.id,
        warung_id: testWarung.id,
        payment_method: 'CASH',
        status: 'CONFIRMED',
        payment_status: 'UNPAID',
        subtotal: 300000,
        item_discount: 0,
        transaction_discount: 0,
        tax: 0,
        grand_total: 300000,
        paid_amount: 0,
        outstanding_amount: 300000
      }
    });
  });

  after(async () => {
    await prisma.auditLog.deleteMany({ where: { user_id: testUser.id } });
    await prisma.payment.deleteMany({ where: { created_by: testUser.id } });
    await prisma.salesTransaction.deleteMany({ where: { id: testTransaction.id } });
    await prisma.visit.deleteMany({ where: { sales_id: testUser.id } });
    await prisma.warung.deleteMany({ where: { code: 'WRG-PAY-001' } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
  });

  it('1. Should fail if payment exceeds outstanding', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transaction_id: testTransaction.id,
        payment_method: 'CASH',
        payment_date: new Date().toISOString(),
        amount: 350000 // Exceeds 300000
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.success, false);
    assert.strictEqual(res.body.code, 'PAYMENT_EXCEEDS_OUTSTANDING');
  });

  it('2. Should create partial payment successfully', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transaction_id: testTransaction.id,
        payment_method: 'CASH',
        payment_date: new Date().toISOString(),
        amount: 100000
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(Number(res.body.data.amount), 100000);
    assert.ok(res.body.data.code.includes('PAY-'));

    // Verify DB state
    const tx = await prisma.salesTransaction.findUnique({ where: { id: testTransaction.id } });
    assert.strictEqual(Number(tx.paid_amount), 100000);
    assert.strictEqual(Number(tx.outstanding_amount), 200000);
    assert.strictEqual(tx.payment_status, 'PARTIALLY_PAID');
  });

  it('3. Should complete the payment on second payment', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transaction_id: testTransaction.id,
        payment_method: 'TRANSFER',
        payment_date: new Date().toISOString(),
        amount: 200000
      });

    assert.strictEqual(res.status, 201);
    
    const tx = await prisma.salesTransaction.findUnique({ where: { id: testTransaction.id } });
    assert.strictEqual(Number(tx.paid_amount), 300000);
    assert.strictEqual(Number(tx.outstanding_amount), 0);
    assert.strictEqual(tx.payment_status, 'PAID');
  });

  it('4. Should fetch payments by transaction', async () => {
    const res = await request(app)
      .get(`/api/v1/sales-transactions/${testTransaction.id}/payments`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.strictEqual(res.body.data.length, 2);
    assert.strictEqual(res.body.data[0].created_by, undefined); // Validating DTO
  });
});
