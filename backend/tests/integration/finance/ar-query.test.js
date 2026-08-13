const request = require('supertest');
process.env.NODE_ENV = 'test';
const { expect } = require('chai');
const app = require('../../../src/app');
const prisma = require('../../../src/config/database');

describe('V11.7 AR Visibility & Collection API', () => {
  let userOwner, userSales1, userSales2;
  let warung1, warung2;
  let tokenOwner, tokenSales1, tokenSales2;

  before(async () => {
    // Generate auth tokens manually or use existing auth service.
    // For simplicity in this suite, we'll assume we can mock or generate them.
    const ts = Date.now();
    userOwner = await prisma.user.create({ data: { username: `owner_ar_${ts}`, password_hash: 'hash', name: 'Owner', role: 'OWNER' } });
    userSales1 = await prisma.user.create({ data: { username: `sales_ar1_${ts}`, password_hash: 'hash', name: 'Sales 1', role: 'SALES' } });
    userSales2 = await prisma.user.create({ data: { username: `sales_ar2_${ts}`, password_hash: 'hash', name: 'Sales 2', role: 'SALES' } });

    warung1 = await prisma.warung.create({ data: { name: `W1_${ts}`, code: `W1_${ts}`, owner_name: 'O', address: 'A', latitude: 0, longitude: 0, assigned_sales_id: userSales1.id } });
    warung2 = await prisma.warung.create({ data: { name: `W2_${ts}`, code: `W2_${ts}`, owner_name: 'O', address: 'B', latitude: 0, longitude: 0, assigned_sales_id: userSales2.id } });

    // Mock CustomerARProjection for testing read without triggering core mutations
    await prisma.customerARProjection.create({
      data: {
        customer_code: warung1.code,
        customer_name: warung1.name,
        total_outstanding: 5000000,
        total_invoice: 3,
        overdue_amount: 2500000,
        last_payment_date: new Date()
      }
    });

    await prisma.accountsReceivableProjection.create({
      data: {
        sales_transaction_id: ts,
        invoice_number: `INV_${ts}`,
        customer_code: warung1.code,
        customer_name: warung1.name,
        invoice_amount: 5000000,
        outstanding_amount: 5000000,
        aging_days: 10,
        due_date: new Date()
      }
    });
    
    // We would fetch actual JWTs here. Using a bypass or mock for tests:
    const jwt = require('jsonwebtoken');
    const { JWT_SECRET } = require('../../../src/config/env');
    tokenOwner = jwt.sign({ id: userOwner.id, username: userOwner.username, role: userOwner.role }, JWT_SECRET);
    tokenSales1 = jwt.sign({ id: userSales1.id, username: userSales1.username, role: userSales1.role }, JWT_SECRET);
    tokenSales2 = jwt.sign({ id: userSales2.id, username: userSales2.username, role: userSales2.role }, JWT_SECRET);
  });

  describe('AR-01 Sales Outlet Outstanding', () => {
    it('Sales authorized outlet ➔ 200', async () => {
      const res = await request(app)
        .get(`/api/v1/outlets/${warung1.id}/ar`)
        .set('Authorization', `Bearer ${tokenSales1}`);
      
      expect(res.status).to.equal(200);
      expect(res.body.data.total_outstanding).to.equal(5000000);
      expect(res.body.data.has_overdue).to.be.true;
    });

    it('Sales unauthorized outlet ➔ 403', async () => {
      const res = await request(app)
        .get(`/api/v1/outlets/${warung2.id}/ar`)
        .set('Authorization', `Bearer ${tokenSales1}`);
      
      expect(res.status).to.equal(403);
    });

    it('Owner / Admin ➔ 200 (can access any outlet)', async () => {
      const res = await request(app)
        .get(`/api/v1/outlets/${warung2.id}/ar`)
        .set('Authorization', `Bearer ${tokenOwner}`);
      
      expect(res.status).to.equal(200);
    });

    it('Invalid token ➔ 401', async () => {
      const res = await request(app)
        .get(`/api/v1/outlets/${warung1.id}/ar`)
        .set('Authorization', `Bearer invalid`);
      
      expect(res.status).to.equal(401);
    });

    it('Outlet tanpa AR ➔ 200 (Zero values)', async () => {
      const res = await request(app)
        .get(`/api/v1/outlets/${warung2.id}/ar`)
        .set('Authorization', `Bearer ${tokenSales2}`);
      
      expect(res.status).to.equal(200);
      expect(res.body.data.total_outstanding).to.equal(0);
    });
  });

  describe('AR-02 Owner Collection Dashboard', () => {
    it('Owner / Admin ➔ 200', async () => {
      const res = await request(app)
        .get(`/api/v1/ar/collection`)
        .set('Authorization', `Bearer ${tokenOwner}`);
      
      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array');
    });

    it('Sales ➔ 403', async () => {
      const res = await request(app)
        .get(`/api/v1/ar/collection`)
        .set('Authorization', `Bearer ${tokenSales1}`);
      
      expect(res.status).to.equal(403);
    });

    it('Invalid aging_bucket / sort_by / sort_dir ➔ 422', async () => {
      const res = await request(app)
        .get(`/api/v1/ar/collection?aging_bucket=INVALID`)
        .set('Authorization', `Bearer ${tokenOwner}`);
      
      expect(res.status).to.equal(422);
    });

    it('Empty result / min_outstanding filter ➔ 200 (Empty array)', async () => {
      const res = await request(app)
        .get(`/api/v1/ar/collection?min_outstanding=999999999`)
        .set('Authorization', `Bearer ${tokenOwner}`);
      
      expect(res.status).to.equal(200);
      expect(res.body.data).to.have.lengthOf(0);
    });
  });

  describe('Financial Safety - Pure Observational Tests', () => {
    let initialLedgerCount, initialOutboxCount;

    before(async () => {
      initialLedgerCount = await prisma.aRLedger.count();
      initialOutboxCount = await prisma.outboxEvent ? await prisma.outboxEvent.count() : 0;
    });

    it('AR query tidak membuat ledger mutation', async () => {
      await request(app).get(`/api/v1/ar/collection`).set('Authorization', `Bearer ${tokenOwner}`);
      const finalLedgerCount = await prisma.aRLedger.count();
      expect(finalLedgerCount).to.equal(initialLedgerCount);
    });

    it('AR query tidak membuat outbox event', async () => {
      if (prisma.outboxEvent) {
        const finalOutboxCount = await prisma.outboxEvent.count();
        expect(finalOutboxCount).to.equal(initialOutboxCount);
      }
    });

    it('Concurrent read tidak menghasilkan perubahan data (Observationally Pure)', async () => {
      const promises = [
        request(app).get(`/api/v1/ar/collection`).set('Authorization', `Bearer ${tokenOwner}`),
        request(app).get(`/api/v1/outlets/${warung1.id}/ar`).set('Authorization', `Bearer ${tokenOwner}`),
        request(app).get(`/api/v1/ar/collection`).set('Authorization', `Bearer ${tokenOwner}`)
      ];
      await Promise.all(promises);

      const finalLedgerCount = await prisma.aRLedger.count();
      expect(finalLedgerCount).to.equal(initialLedgerCount);
    });
  });
});
