const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcrypt');
const prisma = require('../src/config/database');
const app = require('../src/app');

const API = '/api/v1';
const PRODUCT_ID = 12;
const PAR_QTY = 10;
const SALES_USERNAME = 'sv_unit_test';
const SALES_PASSWORD = 'password123';
const OTHER_SALES_USERNAME = 'sv_unit_other';

describe('Sprint 11.0E - Sales Visit', () => {
  let token;
  let auth;
  let salesId;
  let warungId;
  let stockVisitId;
  let visitSeq = 0;

  async function cleanupWarung(wid) {
    await prisma.salesVisit.deleteMany({ where: { warung_id: wid } });
    await prisma.outletStockLedger.deleteMany({ where: { warung_id: wid } });
    const counts = await prisma.outletStockCount.findMany({ where: { warung_id: wid } });
    const ids = counts.map((c) => c.id);
    if (ids.length > 0) {
      await prisma.outletStockCountItem.deleteMany({ where: { stock_count_id: { in: ids } } });
    }
    await prisma.outletStockCount.deleteMany({ where: { warung_id: wid } });
    await prisma.outletStockProjection.deleteMany({ where: { warung_id: wid } });
    await prisma.outletParStock.deleteMany({ where: { warung_id: wid } });
    await prisma.warung.delete({ where: { id: wid } });
  }

  async function purgeOutlierData() {
    const warungs = await prisma.warung.findMany({ where: { code: { startsWith: 'SV-' } } });
    for (const w of warungs) {
      await cleanupWarung(w.id);
    }
    await prisma.outboxEvent.deleteMany({ where: { aggregate_type: { in: ['SalesVisit', 'OutletInventory'] } } });
    for (const username of [SALES_USERNAME, OTHER_SALES_USERNAME]) {
      const user = await prisma.user.findUnique({ where: { username } });
      if (user) await prisma.user.delete({ where: { id: user.id } });
    }
  }

  async function createVisit(overrides = {}) {
    visitSeq += 1;
    const res = await request(app)
      .post(`${API}/sales-visits`)
      .set(auth)
      .send({
        warung_id: warungId,
        visit_date: new Date(Date.now() + visitSeq * 86400000).toISOString(),
        ...overrides
      });
    return res;
  }

  async function checkIn(visitId) {
    return request(app)
      .post(`${API}/sales-visits/${visitId}/check-in`)
      .set(auth)
      .send({ latitude: -6.2, longitude: 106.8 });
  }

  async function setupParStock() {
    await prisma.outletParStock.create({ data: { warung_id: warungId, product_id: PRODUCT_ID, par_qty: PAR_QTY, min_qty: 0 } });
    await prisma.outletStockProjection.create({ data: { warung_id: warungId, product_id: PRODUCT_ID, current_stock: 0, par_qty: PAR_QTY, version: 1 } });
  }

  before(async () => {
    await purgeOutlierData();

    const user = await prisma.user.create({
      data: {
        username: SALES_USERNAME,
        password_hash: await bcrypt.hash(SALES_PASSWORD, 10),
        name: 'SV Unit Test',
        role: 'SALES',
        is_active: true
      }
    });
    salesId = user.id;

    const warung = await prisma.warung.create({
      data: {
        code: `SV-TEST-${Date.now()}`,
        name: 'SV Outlet Test',
        owner_name: 'Owner Test',
        latitude: -6.2,
        longitude: 106.8,
        status: 'ACTIVE'
      }
    });
    warungId = warung.id;

    const loginRes = await request(app).post(`${API}/auth/login`).send({ username: SALES_USERNAME, password: SALES_PASSWORD });
    token = loginRes.body.data.token;
    expect(token, 'login should return token').to.exist;
    auth = { Authorization: `Bearer ${token}` };
  });

  after(async () => {
    if (warungId) {
      await cleanupWarung(warungId);
    }
    await prisma.outboxEvent.deleteMany({ where: { aggregate_type: { in: ['SalesVisit', 'OutletInventory'] } } });
    for (const username of [SALES_USERNAME, OTHER_SALES_USERNAME]) {
      const user = await prisma.user.findUnique({ where: { username } });
      if (user) await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.$disconnect();
  });

  it('plans a visit (201, PLANNED, SV code)', async () => {
    const res = await createVisit();
    expect(res.status).to.equal(201);
    expect(res.body.success).to.be.true;
    expect(res.body.data.status).to.equal('PLANNED');
    expect(res.body.data.code).to.match(/^SV-\d{8}-\d{4}$/);
    expect(res.body.data.warung_id).to.equal(warungId);
    expect(res.body.data.sales_id).to.equal(salesId);
  });

  it('rejects a duplicate visit for the same sales/outlet/date', async () => {
    const date = new Date(Date.now() + 500 * 86400000).toISOString();
    await createVisit({ visit_date: date });
    const res = await createVisit({ visit_date: date });
    expect(res.status).to.equal(409);
    expect(res.body.code).to.equal('DUPLICATE_VISIT');
  });

  it('rejects planning for an inactive outlet', async () => {
    const inactive = await prisma.warung.create({
      data: {
        code: `SV-INACTIVE-${Date.now()}`,
        name: 'Inactive',
        owner_name: 'Owner',
        latitude: -6.2,
        longitude: 106.8,
        status: 'INACTIVE'
      }
    });
    try {
      const res = await request(app)
        .post(`${API}/sales-visits`)
        .set(auth)
        .send({ warung_id: inactive.id, visit_date: new Date().toISOString() });
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('WARUNG_INACTIVE');
    } finally {
      await prisma.warung.delete({ where: { id: inactive.id } });
    }
  });

  it('lists visits with pagination', async () => {
    const res = await request(app).get(`${API}/sales-visits`).set(auth);
    expect(res.status).to.equal(200);
    expect(res.body.data).to.be.an('array');
    expect(res.body.meta.total).to.be.a('number').that.is.greaterThan(0);
  });

  it('checks in with GPS (distance validated)', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;

    const res = await checkIn(visitId);
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('CHECKED_IN');
    expect(res.body.data.check_in_time).to.exist;
    expect(res.body.data.distance_meter).to.be.a('number');
  });

  it('rejects check-in without GPS coordinates', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;

    const res = await request(app).post(`${API}/sales-visits/${visitId}/check-in`).set(auth).send({});
    expect(res.status).to.equal(422);
  });

  it('rejects a second check-in', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);

    const res = await checkIn(visitId);
    expect(res.status).to.equal(409);
    expect(res.body.code).to.equal('INVALID_TRANSITION');
  });

  it('cancels a planned visit (PLANNED only)', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;

    const res = await request(app)
      .post(`${API}/sales-visits/${visitId}/cancel`)
      .set(auth)
      .send({ reason: 'outlet tutup' });
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('CANCELLED');
  });

  it('rejects cancelling a checked-in visit', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);

    const res = await request(app).post(`${API}/sales-visits/${visitId}/cancel`).set(auth).send({ reason: 'x' });
    expect(res.status).to.equal(409);
  });

  it('records stock count through the outlet inventory public API', async () => {
    await setupParStock();
    const created = await createVisit();
    const visitId = created.body.data.id;
    stockVisitId = visitId;
    await checkIn(visitId);

    const res = await request(app)
      .post(`${API}/sales-visits/${visitId}/stock-count`)
      .set(auth)
      .send({
        counted_at: new Date().toISOString(),
        items: [{ product_id: PRODUCT_ID, physical_qty: 4 }]
      });

    expect(res.status).to.equal(200);
    expect(res.body.data.visit_status).to.equal('STOCK_COUNTED');
    expect(res.body.data.sales[0].qty_sold).to.equal(0);
    expect(res.body.data.sales[0].qty_after).to.equal(4);
    expect(res.body.data.refills[0].required_refill).to.equal(PAR_QTY - 4);
    const projection = res.body.data.projection.find((p) => p.product_id === PRODUCT_ID);
    expect(projection.current_stock).to.equal(4);

    const visit = await prisma.salesVisit.findUnique({ where: { id: visitId } });
    expect(visit.status).to.equal('STOCK_COUNTED');
  });

  it('calculates sales on a follow-up visit stock count', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);

    const res = await request(app)
      .post(`${API}/sales-visits/${visitId}/stock-count`)
      .set(auth)
      .send({
        counted_at: new Date().toISOString(),
        items: [{ product_id: PRODUCT_ID, physical_qty: 3 }]
      });

    expect(res.status).to.equal(200);
    expect(res.body.data.sales[0].qty_sold).to.equal(1);
    expect(res.body.data.sales[0].qty_after).to.equal(3);
    expect(res.body.data.refills[0].required_refill).to.equal(PAR_QTY - 3);
  });

  it('exposes sales history (SALE ledger) for the outlet', async () => {
    const res = await request(app).get(`${API}/sales-visits/${stockVisitId}/sales-history`).set(auth);
    expect(res.status).to.equal(200);
    const rows = res.body.data.filter((r) => r.product_id === PRODUCT_ID);
    expect(rows).to.have.length(2);
    expect(rows[0].movement_type).to.equal('SALE');
    expect(rows[0].reference_type).to.equal('STOCK_COUNT');
  });

  it('returns the outlet projection read model', async () => {
    const list = await request(app).get(`${API}/sales-visits`).set(auth);
    const visitId = list.body.data[0].id;

    const res = await request(app).get(`${API}/sales-visits/${visitId}/inventory`).set(auth);
    expect(res.status).to.equal(200);
    const projection = res.body.data.find((p) => p.product_id === PRODUCT_ID);
    expect(projection).to.exist;
    expect(projection.current_stock).to.equal(3);
    expect(projection.total_sales).to.equal(1);
  });

  it('records order then delivery (no stock mutation in 11.0E)', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);

    const orderRes = await request(app)
      .post(`${API}/sales-visits/${visitId}/order`)
      .set(auth)
      .send({ order_number: 'ORD-001', items: [{ product_id: PRODUCT_ID, qty: 5 }] });
    expect(orderRes.status).to.equal(200);
    expect(orderRes.body.data.status).to.equal('ORDER_CREATED');

    const deliveryRes = await request(app)
      .post(`${API}/sales-visits/${visitId}/delivery`)
      .set(auth)
      .send({ items: [{ product_id: PRODUCT_ID, qty: 5 }], reference_type: 'ORDER', reference_id: 'ORD-001' });
    expect(deliveryRes.status).to.equal(200);
    expect(deliveryRes.body.data.status).to.equal('DELIVERED');
  });

  it('rejects delivery with empty items', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);

    const res = await request(app)
      .post(`${API}/sales-visits/${visitId}/delivery`)
      .set(auth)
      .send({ items: [] });
    expect(res.status).to.equal(422);
  });

  it('checks out with computed duration then completes', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);

    const checkOutRes = await request(app)
      .post(`${API}/sales-visits/${visitId}/check-out`)
      .set(auth)
      .send({ closing_note: 'selesai kunjungan' });
    expect(checkOutRes.status).to.equal(200);
    expect(checkOutRes.body.data.status).to.equal('CHECKED_OUT');
    expect(checkOutRes.body.data.duration_seconds).to.be.a('number').that.is.gte(0);
    expect(checkOutRes.body.data.closing_note).to.equal('selesai kunjungan');

    const completeRes = await request(app)
      .post(`${API}/sales-visits/${visitId}/complete`)
      .set(auth);
    expect(completeRes.status).to.equal(200);
    expect(completeRes.body.data.status).to.equal('COMPLETED');
  });

  it('rejects completing before check-out', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);

    const res = await request(app).post(`${API}/sales-visits/${visitId}/complete`).set(auth);
    expect(res.status).to.equal(409);
  });

  it('rejects check-in on a completed visit', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);
    await request(app).post(`${API}/sales-visits/${visitId}/check-out`).set(auth).send({});
    await request(app).post(`${API}/sales-visits/${visitId}/complete`).set(auth);

    const res = await checkIn(visitId);
    expect(res.status).to.equal(409);
  });

  it('adds notes and photo metadata (append-only)', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;

    const noteRes = await request(app)
      .post(`${API}/sales-visits/${visitId}/notes`)
      .set(auth)
      .send({ note: 'outlet ramai, stok menipis' });
    expect(noteRes.status).to.equal(200);
    expect(noteRes.body.data.note).to.equal('outlet ramai, stok menipis');

    const photoRes = await request(app)
      .post(`${API}/sales-visits/${visitId}/photos`)
      .set(auth)
      .send({ filename: 'shelf.jpg', file_path: '/uploads/shelf.jpg', mime_type: 'image/jpeg' });
    expect(photoRes.status).to.equal(200);
    expect(photoRes.body.data.filename).to.equal('shelf.jpg');

    const visitRes = await request(app).get(`${API}/sales-visits/${visitId}`).set(auth);
    expect(visitRes.body.data.notes).to.have.length(1);
    expect(visitRes.body.data.photos).to.have.length(1);
  });

  it('rejects notes on a cancelled visit', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await request(app).post(`${API}/sales-visits/${visitId}/cancel`).set(auth).send({});

    const res = await request(app).post(`${API}/sales-visits/${visitId}/notes`).set(auth).send({ note: 'x' });
    expect(res.status).to.equal(409);
  });

  it('builds a chronological immutable timeline', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);
    await request(app).post(`${API}/sales-visits/${visitId}/check-out`).set(auth).send({});
    await request(app).post(`${API}/sales-visits/${visitId}/complete`).set(auth);

    const res = await request(app).get(`${API}/sales-visits/${visitId}/timeline`).set(auth);
    expect(res.status).to.equal(200);
    const types = res.body.data.map((a) => a.type);
    expect(types).to.deep.equal(['VISIT_CREATED', 'CHECK_IN', 'CHECK_OUT', 'COMPLETED']);
  });

  it('enforces ownership for SALES role (403 for another sales visit)', async () => {
    const other = await prisma.user.create({
      data: {
        username: OTHER_SALES_USERNAME,
        password_hash: await bcrypt.hash(SALES_PASSWORD, 10),
        name: 'Other Sales',
        role: 'SALES',
        is_active: true
      }
    });
    const loginRes = await request(app).post(`${API}/auth/login`).send({ username: OTHER_SALES_USERNAME, password: SALES_PASSWORD });
    const otherAuth = { Authorization: `Bearer ${loginRes.body.data.token}` };

    const created = await createVisit();
    const visitId = created.body.data.id;

    const getRes = await request(app).get(`${API}/sales-visits/${visitId}`).set(otherAuth);
    expect(getRes.status).to.equal(403);

    const checkInRes = await request(app)
      .post(`${API}/sales-visits/${visitId}/check-in`)
      .set(otherAuth)
      .send({ latitude: -6.2, longitude: 106.8 });
    expect(checkInRes.status).to.equal(403);

    await prisma.user.delete({ where: { id: other.id } });
  });

  it('emits SalesVisit domain events to the outbox', async () => {
    const events = await prisma.outboxEvent.findMany({
      where: { aggregate_type: 'SalesVisit' }
    });
    const names = events.map((e) => e.event_name);
    expect(names).to.include('SalesVisitPlannedEvent');
    expect(names).to.include('SalesVisitCheckedInEvent');
    expect(names).to.include('SalesVisitStockCountedEvent');
    expect(names).to.include('SalesVisitCheckedOutEvent');
    expect(names).to.include('SalesVisitCompletedEvent');
    expect(names).to.include('SalesVisitCancelledEvent');
  });
});
