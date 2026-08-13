const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcrypt');
const prisma = require('../src/config/database');
const app = require('../src/app');
const OutletInventoryService = require('../src/modules/outlet-inventory/application/services/OutletInventoryService');

const API = '/api/v1';
const PRODUCT_ID = 12;
const SALES_USERNAME = 'od_unit_test';
const SALES_PASSWORD = 'password123';

describe('Sprint 11.1A - Delivery -> Outlet Inventory', () => {
  let token;
  let auth;
  let salesId;
  let warungId;
  let visitSeq = 0;

  async function cleanupWarung(wid) {
    await prisma.salesVisit.deleteMany({ where: { warung_id: wid } });
    await prisma.outletStockLedger.deleteMany({ where: { warung_id: wid } });
    const deliveries = await prisma.outletDelivery.findMany({ where: { warung_id: wid } });
    const deliveryIds = deliveries.map((d) => d.id);
    if (deliveryIds.length > 0) {
      await prisma.outletDeliveryItem.deleteMany({ where: { delivery_id: { in: deliveryIds } } });
    }
    await prisma.outletDelivery.deleteMany({ where: { warung_id: wid } });
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
    const warungs = await prisma.warung.findMany({ where: { code: { startsWith: 'OD-' } } });
    for (const w of warungs) {
      await cleanupWarung(w.id);
    }
    await prisma.outboxEvent.deleteMany({ where: { aggregate_type: { in: ['SalesVisit', 'OutletInventory'] } } });
    const user = await prisma.user.findUnique({ where: { username: SALES_USERNAME } });
    if (user) await prisma.user.delete({ where: { id: user.id } });
  }

  async function createVisit() {
    visitSeq += 1;
    return request(app)
      .post(`${API}/sales-visits`)
      .set(auth)
      .send({
        warung_id: warungId,
        visit_date: new Date(Date.now() + visitSeq * 86400000).toISOString()
      });
  }

  async function checkIn(visitId) {
    return request(app)
      .post(`${API}/sales-visits/${visitId}/check-in`)
      .set(auth)
      .send({ latitude: -6.2, longitude: 106.8 });
  }

  before(async () => {
    await purgeOutlierData();

    const user = await prisma.user.create({
      data: {
        username: SALES_USERNAME,
        password_hash: await bcrypt.hash(SALES_PASSWORD, 10),
        name: 'OD Unit Test',
        role: 'SALES',
        is_active: true
      }
    });
    salesId = user.id;

    const warung = await prisma.warung.create({
      data: {
        code: `OD-TEST-${Date.now()}`,
        name: 'OD Outlet Test',
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
    const user = await prisma.user.findUnique({ where: { username: SALES_USERNAME } });
    if (user) await prisma.user.delete({ where: { id: user.id } });
    await prisma.$disconnect();
  });

  it('posts delivery to outlet stock via the visit endpoint (ISSUE_TO_OUTLET ledger + projection)', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);

    const res = await request(app)
      .post(`${API}/sales-visits/${visitId}/delivery`)
      .set(auth)
      .send({ items: [{ product_id: PRODUCT_ID, qty: 5 }], note: 'drop 5 pcs' });
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('DELIVERED');

    const delivery = await prisma.outletDelivery.findFirst({ where: { warung_id: warungId }, include: { items: true } });
    expect(delivery).to.exist;
    expect(delivery.status).to.equal('POSTED');
    expect(delivery.reference_type).to.equal('SALES_VISIT');
    expect(Number(delivery.reference_id)).to.equal(visitId);
    expect(delivery.notes).to.equal('drop 5 pcs');
    expect(delivery.items[0]).to.include({ product_id: PRODUCT_ID, quantity: 5 });

    const ledger = await prisma.outletStockLedger.findFirst({
      where: { warung_id: warungId, product_id: PRODUCT_ID },
      orderBy: { id: 'desc' }
    });
    expect(ledger.movement_type).to.equal('ISSUE_TO_OUTLET');
    expect(ledger.qty_before).to.equal(0);
    expect(ledger.qty_change).to.equal(5);
    expect(ledger.qty_after).to.equal(5);
    expect(ledger.reference_type).to.equal('SALES_VISIT');
    expect(Number(ledger.reference_id)).to.equal(visitId);
    expect(ledger.notes).to.equal('drop 5 pcs');

    const projection = await prisma.outletStockProjection.findUnique({
      where: { warung_id_product_id: { warung_id: warungId, product_id: PRODUCT_ID } }
    });
    expect(projection.current_stock).to.equal(5);
    expect(projection.total_refill).to.equal(5);

    const event = await prisma.outboxEvent.findFirst({
      where: { aggregate_type: 'OutletInventory', event_name: 'OutletDeliveryRecordedEvent' },
      orderBy: { created_at: 'desc' }
    });
    expect(event).to.exist;
    expect(event.payload.visitId).to.equal(visitId);
    expect(event.payload.outletId).to.equal(warungId);
    expect(event.payload.items[0].quantity).to.equal(5);
    expect(event.payload.actor ?? event.metadata.userId).to.equal(salesId);
  });

  it('is idempotent per (reference_type, reference_id): no double stock', async () => {
    const payload = {
      warungId,
      deliveryDate: new Date(),
      referenceType: 'SALES_VISIT',
      referenceId: 999991,
      performedBy: salesId,
      notes: 'idempotency check',
      items: [{ productId: PRODUCT_ID, quantity: 3 }]
    };

    const first = await OutletInventoryService.recordDelivery(payload);
    const second = await OutletInventoryService.recordDelivery(payload);

    expect(first.delivery_id).to.equal(second.delivery_id);
    expect(first.status).to.equal('POSTED');
    expect(second.idempotent).to.be.true;

    const rows = await prisma.outletStockLedger.count({
      where: { warung_id: warungId, reference_type: 'SALES_VISIT', reference_id: 999991 }
    });
    expect(rows).to.equal(1);

    const projection = await prisma.outletStockProjection.findUnique({
      where: { warung_id_product_id: { warung_id: warungId, product_id: PRODUCT_ID } }
    });
    expect(projection.current_stock).to.equal(8);
    expect(projection.total_refill).to.equal(8);

    const different = await OutletInventoryService.recordDelivery({
      ...payload,
      referenceId: 999992,
      items: [{ productId: PRODUCT_ID, quantity: 2 }]
    });
    expect(different.idempotent).to.be.false;
    const projectionAfter = await prisma.outletStockProjection.findUnique({
      where: { warung_id_product_id: { warung_id: warungId, product_id: PRODUCT_ID } }
    });
    expect(projectionAfter.current_stock).to.equal(10);
    expect(projectionAfter.total_refill).to.equal(10);
  });

  it('rejects unknown products before persisting anything (atomic validation)', async () => {
    const payload = {
      warungId,
      deliveryDate: new Date(),
      referenceType: 'SALES_VISIT',
      referenceId: 999993,
      performedBy: salesId,
      items: [{ productId: 999999, quantity: 1 }]
    };

    let thrown = null;
    try {
      await OutletInventoryService.recordDelivery(payload);
    } catch (error) {
      thrown = error;
    }
    expect(thrown).to.exist;
    expect(thrown.code).to.equal('PRODUCT_NOT_FOUND');

    const delivery = await prisma.outletDelivery.findFirst({
      where: { warung_id: warungId, reference_id: '999993' }
    });
    expect(delivery).to.not.exist;

    const rows = await prisma.outletStockLedger.count({
      where: { warung_id: warungId, reference_type: 'SALES_VISIT', reference_id: 999993 }
    });
    expect(rows).to.equal(0);
  });

  it('retries a FAILED delivery into POSTED without double-posting', async () => {
    await prisma.outletDelivery.create({
      data: {
        warung_id: warungId,
        delivery_date: new Date(),
        status: 'FAILED',
        reference_type: 'SALES_VISIT',
        reference_id: '999993',
        performed_by: salesId,
        error_message: 'simulated crash',
        items: { create: [{ product_id: PRODUCT_ID, quantity: 2 }] }
      }
    });

    const result = await OutletInventoryService.recordDelivery({
      warungId,
      deliveryDate: new Date(),
      referenceType: 'SALES_VISIT',
      referenceId: 999993,
      performedBy: salesId,
      items: [{ productId: PRODUCT_ID, quantity: 2 }]
    });

    expect(result.status).to.equal('POSTED');
    expect(result.idempotent).to.be.false;

    const delivery = await prisma.outletDelivery.findFirst({
      where: { warung_id: warungId, reference_id: '999993' }
    });
    expect(delivery.status).to.equal('POSTED');
    expect(delivery.posted_at).to.exist;
    expect(delivery.error_message).to.be.null;

    const rows = await prisma.outletStockLedger.count({
      where: { warung_id: warungId, reference_type: 'SALES_VISIT', reference_id: 999993 }
    });
    expect(rows).to.equal(1);
  });

  it('rejects quantity <= 0 and duplicate product ids (422)', async () => {
    const created = await createVisit();
    const visitId = created.body.data.id;
    await checkIn(visitId);

    const zero = await request(app)
      .post(`${API}/sales-visits/${visitId}/delivery`)
      .set(auth)
      .send({ items: [{ product_id: PRODUCT_ID, qty: 0 }] });
    expect(zero.status).to.equal(422);

    const dup = await request(app)
      .post(`${API}/sales-visits/${visitId}/delivery`)
      .set(auth)
      .send({ items: [{ product_id: PRODUCT_ID, qty: 2 }, { product_id: PRODUCT_ID, qty: 3 }] });
    expect(dup.status).to.equal(422);
  });
});
