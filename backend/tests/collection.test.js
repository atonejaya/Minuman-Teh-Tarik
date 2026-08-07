const request = require('supertest');
const assert = require('assert');
const app = require('../src/app');
const prisma = require('../src/config/database');

describe('Collection Integration Tests', () => {
  let adminToken;
  let testUser;
  let testWarung;
  let testVisit;
  let testTransaction1;
  let testTransaction2;
  let testCollection;

  before(async () => {
    // Create User
    testUser = await prisma.user.create({
      data: {
        username: 'test_collection_sales',
        password_hash: 'hashed',
        name: 'Collection Sales',
        role: 'SALES',
      }
    });

    const jwt = require('jsonwebtoken');
    adminToken = jwt.sign({ sub: testUser.id, role: testUser.role }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

    // Create Warung & Visit
    testWarung = await prisma.warung.create({
      data: {
        code: 'WRG-COL-001',
        name: 'Warung Collection',
        owner_name: 'Bapak Col',
        latitude: 0,
        longitude: 0
      }
    });

    testVisit = await prisma.visit.create({
      data: {
        code: 'VIS-COL-001',
        sales_id: testUser.id,
        warung_id: testWarung.id,
        status: 'COMPLETED',
        visit_date: new Date()
      }
    });

    // Create 2 CONFIRMED SalesTransactions (UNPAID)
    testTransaction1 = await prisma.salesTransaction.create({
      data: {
        code: 'INV-COL-001',
        visit_id: testVisit.id,
        sales_id: testUser.id,
        warung_id: testWarung.id,
        payment_method: 'CASH',
        status: 'CONFIRMED',
        payment_status: 'UNPAID',
        subtotal: 100000,
        item_discount: 0,
        transaction_discount: 0,
        tax: 0,
        grand_total: 100000,
        paid_amount: 0,
        outstanding_amount: 100000
      }
    });

    testTransaction2 = await prisma.salesTransaction.create({
      data: {
        code: 'INV-COL-002',
        visit_id: testVisit.id,
        sales_id: testUser.id,
        warung_id: testWarung.id,
        payment_method: 'CASH',
        status: 'CONFIRMED',
        payment_status: 'UNPAID',
        subtotal: 50000,
        item_discount: 0,
        transaction_discount: 0,
        tax: 0,
        grand_total: 50000,
        paid_amount: 0,
        outstanding_amount: 50000
      }
    });
  });

  after(async () => {
    await prisma.auditLog.deleteMany({ where: { user_id: testUser.id } });
    await prisma.payment.deleteMany({ where: { created_by: testUser.id } });
    await prisma.collectionItem.deleteMany({
      where: { sales_transaction_id: { in: [testTransaction1.id, testTransaction2.id] } }
    });
    await prisma.collection.deleteMany({ where: { sales_id: testUser.id } });
    await prisma.salesTransaction.deleteMany({
      where: { id: { in: [testTransaction1.id, testTransaction2.id] } }
    });
    await prisma.visit.deleteMany({ where: { sales_id: testUser.id } });
    await prisma.warung.deleteMany({ where: { code: 'WRG-COL-001' } });
    await prisma.user.deleteMany({ where: { id: testUser.id } });
  });

  it('1. Should create collection', async () => {
    const res = await request(app)
      .post('/api/v1/collections')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        warung_id: testWarung.id,
        visit_id: testVisit.id,
        collection_date: new Date().toISOString()
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'PENDING');
    assert.ok(res.body.data.code.includes('COL-'));
    testCollection = res.body.data;
  });

  it('2. Should add invoice to collection', async () => {
    const res = await request(app)
      .post(`/api/v1/collections/${testCollection.id}/invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transaction_id: testTransaction1.id
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(Number(res.body.data.invoice_total), 100000);
    assert.strictEqual(Number(res.body.data.outstanding_before), 100000);
    assert.strictEqual(Number(res.body.data.payment_amount), 0); // initial snapshot
  });

  it('3. Should add second invoice to collection', async () => {
    const res = await request(app)
      .post(`/api/v1/collections/${testCollection.id}/invoices`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transaction_id: testTransaction2.id
      });

    assert.strictEqual(res.status, 201);
  });

  it('4. Should make partial payment linked to collection', async () => {
    const res = await request(app)
      .post('/api/v1/payments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        transaction_id: testTransaction1.id,
        collection_id: testCollection.id,
        payment_method: 'CASH',
        payment_date: new Date().toISOString(),
        amount: 40000
      });

    assert.strictEqual(res.status, 201);
  });

  it('5. Should finish collection and result in PARTIAL', async () => {
    const res = await request(app)
      .post(`/api/v1/collections/${testCollection.id}/finish`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({});

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    assert.strictEqual(res.body.data.status, 'COMPLETED');
    assert.strictEqual(res.body.data.result, 'PARTIAL');
  });

  it('6. Should fetch collection details with summary', async () => {
    const res = await request(app)
      .get(`/api/v1/collections/${testCollection.id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    
    const summary = res.body.data.summary;
    assert.ok(summary);
    assert.strictEqual(summary.total_invoice, 150000); // 100k + 50k
    assert.strictEqual(summary.total_outstanding, 150000);
    assert.strictEqual(summary.total_collected, 40000); // We paid 40k
    assert.strictEqual(summary.remaining_outstanding, 110000);

    // Verify snapshot on item
    const item1 = res.body.data.items.find(i => i.sales_transaction.id === testTransaction1.id);
    assert.strictEqual(Number(item1.payment_amount), 40000);
    assert.strictEqual(Number(item1.outstanding_after), 60000);
  });
});
