const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcrypt');
const prisma = require('../src/config/database');
const app = require('../src/app');

const API = '/api/v1';
const WAREHOUSE_ID = 4;
const PRODUCT_ID = 12;
const BATCH_ID = 12;
const UNIT_ID = 1;
const USERNAME = 'ssi_unit_test';
const PASSWORD = 'password123';

describe('Sprint 11.0C - Sales Stock Issue', () => {
  let token;
  let salesId;
  let issueId;
  let auth;

  before(async () => {
    const existing = await prisma.user.findUnique({ where: { username: USERNAME } });
    if (existing) {
      await prisma.salesStockIssue.deleteMany({ where: { sales_id: existing.id } });
      await prisma.user.delete({ where: { id: existing.id } });
    }
    const user = await prisma.user.create({
      data: {
        username: USERNAME,
        password_hash: await bcrypt.hash(PASSWORD, 10),
        name: 'SSI Unit Test',
        role: 'SALES',
        is_active: true
      }
    });
    salesId = user.id;

    const loginRes = await request(app).post(`${API}/auth/login`).send({ username: USERNAME, password: PASSWORD });
    token = loginRes.body.data.token;
    expect(token, 'login should return token').to.exist;
    auth = { Authorization: `Bearer ${token}` };
  });

  after(async () => {
    const user = await prisma.user.findUnique({ where: { username: USERNAME } });
    if (user) {
      const issues = await prisma.salesStockIssue.findMany({ where: { sales_id: user.id } });
      const issueIds = issues.map((i) => i.id);
      await prisma.salesStockIssueHistory.deleteMany({ where: { issue_id: { in: issueIds } } });
      await prisma.salesStockLedger.deleteMany({ where: { document_type: 'SALES_STOCK_ISSUE', document_id: { in: issueIds } } });
      await prisma.salesStockIssueItem.deleteMany({ where: { issue_id: { in: issueIds } } });
      await prisma.salesStockIssue.deleteMany({ where: { id: { in: issueIds } } });
      await prisma.salesStockProjection.deleteMany({ where: { sales_id: user.id } });
      await prisma.inventoryMovement.deleteMany({
        where: { reference_document: { in: issues.map((i) => i.issue_number) } }
      });
      await prisma.outboxEvent.deleteMany({ where: { aggregate_type: 'SalesStockIssue' } });
      await prisma.user.delete({ where: { id: user.id } });
    }
    await prisma.warehouseStock.update({
      where: {
        warehouse_id_product_id_batch_id_condition: {
          warehouse_id: WAREHOUSE_ID,
          product_id: PRODUCT_ID,
          batch_id: BATCH_ID,
          condition: 'GOOD'
        }
      },
      data: { qty_available: 1000 }
    });
    await prisma.$disconnect();
  });

  it('exposes master lookups for the sales stock form', async () => {
    const res = await request(app).get(`${API}/master/lookups`);
    expect(res.status).to.equal(200);
    expect(res.body.data.warehouses).to.be.an('array').that.is.not.empty;
    expect(res.body.data.salesmen).to.be.an('array').that.is.not.empty;
    expect(res.body.data.units).to.be.an('array').that.is.not.empty;
  });

  it('exposes active products for the sales stock form', async () => {
    const res = await request(app)
      .get(`${API}/master/products`)
      .set(auth)
      .query({ status: 'ACTIVE', page: 1, limit: 100 });
    expect(res.status).to.equal(200);
    expect(res.body.data).to.be.an('array').that.is.not.empty;
  });

  it('creates a draft sales stock issue', async () => {
    const res = await request(app)
      .post(`${API}/sales/stock-issues`)
      .set(auth)
      .send({
        warehouse_id: WAREHOUSE_ID,
        sales_id: salesId,
        notes: 'unit test sprint 11.0c',
        items: [{ product_id: PRODUCT_ID, qty: 10, unit_id: UNIT_ID }]
      });
    expect(res.status).to.equal(201);
    expect(res.body.success).to.equal(true);
    expect(res.body.data.status).to.equal('DRAFT');
    expect(res.body.data.issue_number).to.include('SSI-');
    expect(res.body.data.total_item).to.equal(1);
    expect(res.body.data.total_qty).to.equal(10);
    issueId = res.body.data.id;
  });

  it('confirms the issue and reduces warehouse stock (FEFO)', async () => {
    const res = await request(app).post(`${API}/sales/stock-issues/${issueId}/confirm`).set(auth);
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('CONFIRMED');

    const stock = await prisma.warehouseStock.findUnique({
      where: {
        warehouse_id_product_id_batch_id_condition: {
          warehouse_id: WAREHOUSE_ID,
          product_id: PRODUCT_ID,
          batch_id: BATCH_ID,
          condition: 'GOOD'
        }
      }
    });
    expect(stock.qty_available).to.equal(990);
  });

  it('updates sales stock projection and ledger', async () => {
    const proj = await prisma.salesStockProjection.findUnique({
      where: { sales_id_product_id: { sales_id: salesId, product_id: PRODUCT_ID } }
    });
    expect(proj).to.exist;
    expect(proj.qty_available).to.equal(10);

    const led = await prisma.salesStockLedger.findFirst({
      where: { sales_id: salesId, product_id: PRODUCT_ID, movement_type: 'ISSUE_FROM_WAREHOUSE' }
    });
    expect(led).to.exist;
    expect(led.qty).to.equal(10);
    expect(led.balance).to.equal(10);
  });

  it('writes a warehouse inventory movement for audit', async () => {
    const issue = await prisma.salesStockIssue.findUnique({ where: { id: issueId } });
    const movement = await prisma.inventoryMovement.findFirst({
      where: { reference_document: issue.issue_number, movement_type: 'LOAD_OUT' }
    });
    expect(movement).to.exist;
    expect(movement.source_type).to.equal('WAREHOUSE');
    expect(movement.destination_type).to.equal('SALES');
    expect(movement.qty_change).to.equal(-10);
  });

  it('lists and returns detail with items and history', async () => {
    const listRes = await request(app).get(`${API}/sales/stock-issues`).set(auth);
    expect(listRes.status).to.equal(200);
    expect(listRes.body.data).to.be.an('array').that.is.not.empty;

    const detailRes = await request(app).get(`${API}/sales/stock-issues/${issueId}`).set(auth);
    expect(detailRes.status).to.equal(200);
    expect(detailRes.body.data.items).to.have.length(1);
    const statuses = detailRes.body.data.history.map((h) => `${h.status_from}->${h.status_to}`);
    expect(statuses).to.deep.equal(['null->DRAFT', 'DRAFT->CONFIRMED']);
  });

  it('closes the issue', async () => {
    const res = await request(app).post(`${API}/sales/stock-issues/${issueId}/close`).set(auth);
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('CLOSED');
  });

  it('rejects re-confirming a closed issue', async () => {
    const res = await request(app).post(`${API}/sales/stock-issues/${issueId}/confirm`).set(auth);
    expect(res.status).to.equal(409);
    expect(res.body.code).to.equal('INVALID_STATUS');
  });

  it('emits outbox events with metadata for the projector', async () => {
    const events = await prisma.outboxEvent.findMany({
      where: { aggregate_type: 'SalesStockIssue', aggregate_id: String(issueId) },
      orderBy: { occurred_at: 'asc' }
    });
    expect(events).to.have.length(3);
    expect(events.map((e) => e.event_name)).to.deep.equal([
      'SalesStockIssuedEvent',
      'SalesStockConfirmedEvent',
      'SalesStockClosedEvent'
    ]);
    expect(events[1].metadata).to.deep.include({ userId: salesId });
  });
});
