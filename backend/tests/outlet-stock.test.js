const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcrypt');
const prisma = require('../src/config/database');
const app = require('../src/app');

const API = '/api/v1';
const PRODUCT_ID = 12;
const USERNAME = 'oi_unit_test';
const PASSWORD = 'password123';

describe('Sprint 11.0D - Outlet Inventory', () => {
  let token;
  let auth;
  let salesId;
  let warungId;

  const PAR_QTY = 10;

  async function purgeOutlierData() {
    const warungs = await prisma.warung.findMany({ where: { code: { startsWith: 'OI-' } } });
    for (const w of warungs) {
      await prisma.outletStockLedger.deleteMany({ where: { warung_id: w.id } });
      const counts = await prisma.outletStockCount.findMany({ where: { warung_id: w.id } });
      const countIds = counts.map((c) => c.id);
      if (countIds.length > 0) {
        await prisma.outletStockCountItem.deleteMany({ where: { stock_count_id: { in: countIds } } });
      }
      await prisma.outletStockCount.deleteMany({ where: { warung_id: w.id } });
      await prisma.outletStockProjection.deleteMany({ where: { warung_id: w.id } });
      await prisma.outletParStock.deleteMany({ where: { warung_id: w.id } });
      await prisma.warung.delete({ where: { id: w.id } });
    }
    await prisma.outboxEvent.deleteMany({ where: { aggregate_type: 'OutletInventory' } });
    const user = await prisma.user.findUnique({ where: { username: USERNAME } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
  }

  before(async () => {
    await purgeOutlierData();

    const user = await prisma.user.create({
      data: {
        username: USERNAME,
        password_hash: await bcrypt.hash(PASSWORD, 10),
        name: 'OI Unit Test',
        role: 'SALES',
        is_active: true
      }
    });
    salesId = user.id;

    const warung = await prisma.warung.create({
      data: {
        code: `OI-TEST-${Date.now()}`,
        name: 'Outlet Unit Test',
        owner_name: 'Owner Test',
        latitude: -6.2,
        longitude: 106.8,
        status: 'ACTIVE'
      }
    });
    warungId = warung.id;

    const loginRes = await request(app).post(`${API}/auth/login`).send({ username: USERNAME, password: PASSWORD });
    token = loginRes.body.data.token;
    expect(token, 'login should return token').to.exist;
    auth = { Authorization: `Bearer ${token}` };
  });

  after(async () => {
    if (warungId) {
      await prisma.outletStockLedger.deleteMany({ where: { warung_id: warungId } });
      const counts = await prisma.outletStockCount.findMany({ where: { warung_id: warungId } });
      const countIds = counts.map((c) => c.id);
      if (countIds.length > 0) {
        await prisma.outletStockCountItem.deleteMany({ where: { stock_count_id: { in: countIds } } });
      }
      await prisma.outletStockCount.deleteMany({ where: { warung_id: warungId } });
      await prisma.outletStockProjection.deleteMany({ where: { warung_id: warungId } });
      await prisma.outletParStock.deleteMany({ where: { warung_id: warungId } });
      await prisma.warung.delete({ where: { id: warungId } });
    }
    await prisma.outboxEvent.deleteMany({ where: { aggregate_type: 'OutletInventory' } });
    const user = await prisma.user.findUnique({ where: { username: USERNAME } });
    if (user) {
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  it('upserts outlet par stock (batch)', async () => {
    const res = await request(app)
      .put(`${API}/sales/outlet-stock/par-stock`)
      .set(auth)
      .send({
        warung_id: warungId,
        items: [{ product_id: PRODUCT_ID, par_qty: PAR_QTY, min_qty: 2 }]
      });

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.data).to.be.an('array');
    expect(res.body.data[0].par_qty).to.equal(PAR_QTY);
    expect(res.body.data[0].product_id).to.equal(PRODUCT_ID);
  });

  it('lists outlet par stock', async () => {
    const res = await request(app)
      .get(`${API}/sales/outlet-stock/par-stock?warung_id=${warungId}`)
      .set(auth);

    expect(res.status).to.equal(200);
    expect(res.body.data).to.be.an('array');
    const row = res.body.data.find((r) => r.product_id === PRODUCT_ID);
    expect(row).to.exist;
    expect(row.par_qty).to.equal(PAR_QTY);
  });

  it('rejects invalid par stock payload', async () => {
    const res = await request(app)
      .put(`${API}/sales/outlet-stock/par-stock`)
      .set(auth)
      .send({ warung_id: warungId, items: [{ product_id: PRODUCT_ID, par_qty: -1 }] });

    expect(res.status).to.equal(422);
    expect(res.body.success).to.be.false;
  });

  it('records first stock count (opening, no sales)', async () => {
    const res = await request(app)
      .post(`${API}/sales/outlet-stock/${warungId}/stock-count`)
      .set(auth)
      .send({
        sales_id: salesId,
        counted_at: new Date().toISOString(),
        items: [{ product_id: PRODUCT_ID, physical_qty: 4 }]
      });

    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.data.sales).to.be.an('array').with.length(1);
    expect(res.body.data.refills).to.be.an('array').with.length(1);

    expect(res.body.data.sales[0].product_id).to.equal(PRODUCT_ID);
    expect(res.body.data.sales[0].qty_sold).to.equal(0); // 0 - 4
    expect(res.body.data.refills[0].required_refill).to.equal(PAR_QTY - 4);

    const projection = res.body.data.projection.find((p) => p.product_id === PRODUCT_ID);
    expect(projection).to.exist;
    expect(projection.current_stock).to.equal(4);
    expect(projection.required_refill).to.equal(PAR_QTY - 4);
  });

  it('calculates sales and refill on the second count', async () => {
    const res = await request(app)
      .post(`${API}/sales/outlet-stock/${warungId}/stock-count`)
      .set(auth)
      .send({
        sales_id: salesId,
        counted_at: new Date().toISOString(),
        items: [{ product_id: PRODUCT_ID, physical_qty: 3 }]
      });

    expect(res.status).to.equal(200);
    expect(res.body.data.sales[0].qty_sold).to.equal(1); // 4 - 3
    expect(res.body.data.refills[0].required_refill).to.equal(PAR_QTY - 3);

    const projection = res.body.data.projection.find((p) => p.product_id === PRODUCT_ID);
    expect(projection.current_stock).to.equal(3);
    expect(projection.total_sales).to.equal(1);
    expect(projection.calculated_sales).to.equal(1);
    expect(projection.required_refill).to.equal(PAR_QTY - 3);
    expect(projection.version).to.be.a('number').that.is.greaterThan(1);
  });

  it('returns the outlet projection read model', async () => {
    const res = await request(app)
      .get(`${API}/sales/outlet-stock/${warungId}/projection`)
      .set(auth);

    expect(res.status).to.equal(200);
    const projection = res.body.data.find((p) => p.product_id === PRODUCT_ID);
    expect(projection).to.exist;
    expect(projection.current_stock).to.equal(3);
    expect(projection.total_sales).to.equal(1);
    expect(projection.par_qty).to.equal(PAR_QTY);
    expect(projection.sell_through).to.be.a('number');
    expect(projection.average_daily_sales).to.be.a('number');
  });

  it('writes the ledger as source of truth', async () => {
    const res = await request(app)
      .get(`${API}/sales/outlet-stock/${warungId}/ledger`)
      .set(auth);

    expect(res.status).to.equal(200);
    const rows = res.body.data.filter((r) => r.product_id === PRODUCT_ID);
    expect(rows).to.have.length(2);
    expect(rows[0].movement_type).to.equal('SALE');
    expect(rows[0].reference_type).to.equal('STOCK_COUNT');
    expect(rows[0].qty_after).to.equal(3); // latest first
    expect(rows[1].qty_after).to.equal(4);
  });

  it('serializes concurrent stock counts to keep the ledger chain intact', async () => {
    const warung = await prisma.warung.create({
      data: { code: `OI-CONC-${Date.now()}`, name: 'Concurrent Test', owner_name: 'Owner', latitude: -6.2, longitude: 106.8, status: 'ACTIVE' }
    });
    await prisma.outletParStock.create({ data: { warung_id: warung.id, product_id: PRODUCT_ID, par_qty: PAR_QTY, min_qty: 0 } });
    await prisma.outletStockProjection.create({ data: { warung_id: warung.id, product_id: PRODUCT_ID, current_stock: 10, par_qty: PAR_QTY, version: 1 } });

    const payload = (physical) => ({
      sales_id: salesId,
      counted_at: new Date().toISOString(),
      items: [{ product_id: PRODUCT_ID, physical_qty: physical }]
    });

    const [r1, r2] = await Promise.allSettled([
      request(app).post(`${API}/sales/outlet-stock/${warung.id}/stock-count`).set(auth).send(payload(3)),
      request(app).post(`${API}/sales/outlet-stock/${warung.id}/stock-count`).set(auth).send(payload(2))
    ]);
    try {
      expect(r1.value.status).to.equal(200);
      expect(r2.value.status).to.equal(200);

      const ledgerRes = await request(app).get(`${API}/sales/outlet-stock/${warung.id}/ledger`).set(auth);
      const rows = ledgerRes.body.data.filter((r) => r.product_id === PRODUCT_ID).sort((a, b) => a.id - b.id);
      expect(rows).to.have.length(2);
      expect(rows[0].qty_before).to.equal(10);
      expect(rows[1].qty_before).to.equal(rows[0].qty_after);
      expect(rows[1].qty_after).to.be.oneOf([2, 3]);

      const projRes = await request(app).get(`${API}/sales/outlet-stock/${warung.id}/projection`).set(auth);
      const proj = projRes.body.data.find((p) => p.product_id === PRODUCT_ID);
      expect(proj.current_stock).to.equal(rows[1].qty_after);
      expect(proj.total_sales).to.equal(8);
    } finally {
      await prisma.outletStockLedger.deleteMany({ where: { warung_id: warung.id } });
      const counts = await prisma.outletStockCount.findMany({ where: { warung_id: warung.id } });
      const ids = counts.map((c) => c.id);
      if (ids.length > 0) {
        await prisma.outletStockCountItem.deleteMany({ where: { stock_count_id: { in: ids } } });
      }
      await prisma.outletStockCount.deleteMany({ where: { warung_id: warung.id } });
      await prisma.outletStockProjection.deleteMany({ where: { warung_id: warung.id } });
      await prisma.outletParStock.deleteMany({ where: { warung_id: warung.id } });
      await prisma.warung.delete({ where: { id: warung.id } });
    }
  });

  it('emits domain events to the outbox', async () => {
    const events = await prisma.outboxEvent.findMany({
      where: { aggregate_type: 'OutletInventory' }
    });
    const names = events.map((e) => e.event_name);
    expect(names).to.include('OutletParStockUpdatedEvent');
    expect(names).to.include('StockCountRecordedEvent');
    expect(names).to.include('SalesCalculatedEvent');
    expect(names).to.include('RefillCalculatedEvent');
    expect(names).to.include('OutletProjectionUpdatedEvent');
  });
});
