const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcrypt');
const prisma = require('../src/config/database');
const app = require('../src/app');

const API = '/api/v1';
const WAREHOUSE_ID = 4;
const PRODUCT_ID = 12;
const BATCH_ID = 12;
const USERNAME = 'wt_unit_test';
const PASSWORD = 'password123';

describe('Sprint 11.2A - Warehouse <-> Sales Stock Transfer', () => {
  let token;
  let auth;
  let salesId;
  let initialStock;
  let totalWarehouseQty;

  async function purgeUserData() {
    const user = await prisma.user.findUnique({ where: { username: USERNAME } });
    if (!user) return;

    const transfers = await prisma.warehouseTransfer.findMany({ where: { sales_id: user.id } });
    const transferIds = transfers.map((t) => t.id);
    const transferNumbers = transfers.map((t) => t.transfer_number);

    if (transferIds.length > 0) {
      await prisma.warehouseTransferItem.deleteMany({ where: { transfer_id: { in: transferIds } } });
    }
    await prisma.warehouseLedger.deleteMany({ where: { sales_id: user.id } });
    await prisma.warehouseTransfer.deleteMany({ where: { id: { in: transferIds } } });
    await prisma.salesDay.deleteMany({ where: { sales_id: user.id } });
    if (transferIds.length > 0) {
      await prisma.salesStockLedger.deleteMany({
        where: { document_type: 'WAREHOUSE_TRANSFER', document_id: { in: transferIds } }
      });
    }
    await prisma.salesStockProjection.deleteMany({ where: { sales_id: user.id } });
    if (transferNumbers.length > 0) {
      await prisma.inventoryMovement.deleteMany({ where: { reference_document: { in: transferNumbers } } });
    }
    await prisma.outboxEvent.deleteMany({ where: { aggregate_type: { in: ['WarehouseTransfer', 'SalesDay'] } } });
    await prisma.user.delete({ where: { id: user.id } });
  }

  async function restoreStock() {
    if (initialStock === undefined) return;
    await prisma.warehouseStock.update({
      where: {
        warehouse_id_product_id_batch_id_condition: {
          warehouse_id: WAREHOUSE_ID,
          product_id: PRODUCT_ID,
          batch_id: BATCH_ID,
          condition: 'GOOD'
        }
      },
      data: { qty_available: initialStock }
    });
  }

  async function issue(body, overrides = {}) {
    return request(app)
      .post(`${API}/warehouse/transfers/issue`)
      .set(auth)
      .send({
        warehouse_id: WAREHOUSE_ID,
        sales_id: salesId,
        reference_type: 'SALES_STOCK',
        reference_id: body.referenceId,
        notes: 'unit test 11.2a',
        items: [{ product_id: PRODUCT_ID, qty: body.qty }],
        ...overrides
      });
  }

  async function ret(body, overrides = {}) {
    return request(app)
      .post(`${API}/warehouse/transfers/return`)
      .set(auth)
      .send({
        warehouse_id: WAREHOUSE_ID,
        sales_id: salesId,
        reference_type: 'SALES_STOCK',
        reference_id: body.referenceId,
        notes: 'return unit test 11.2a',
        items: [{ product_id: PRODUCT_ID, qty: body.qty, batch_id: BATCH_ID }],
        ...overrides
      });
  }

  async function stockOf() {
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
    return Number(stock.qty_available);
  }

  async function salesQty() {
    const proj = await prisma.salesStockProjection.findUnique({
      where: { sales_id_product_id: { sales_id: salesId, product_id: PRODUCT_ID } }
    });
    return proj ? Number(proj.qty_available) : 0;
  }

  before(async () => {
    await purgeUserData();

    const user = await prisma.user.create({
      data: {
        username: USERNAME,
        password_hash: await bcrypt.hash(PASSWORD, 10),
        name: 'WT Unit Test',
        role: 'SALES',
        is_active: true
      }
    });
    salesId = user.id;

    const loginRes = await request(app).post(`${API}/auth/login`).send({ username: USERNAME, password: PASSWORD });
    token = loginRes.body.data.token;
    expect(token, 'login should return token').to.exist;
    auth = { Authorization: `Bearer ${token}` };

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
    initialStock = Number(stock.qty_available);

    const aggregate = await prisma.warehouseStock.aggregate({
      where: { warehouse_id: WAREHOUSE_ID, product_id: PRODUCT_ID },
      _sum: { qty_available: true }
    });
    totalWarehouseQty = Number(aggregate._sum.qty_available || 0);
  });

  after(async () => {
    await purgeUserData();
    await restoreStock();
    await prisma.$disconnect();
  });

  it('issues stock to sales: transfer POSTED, warehouse stock berkurang, sales stock bertambah, ledger immutable', async () => {
    const before = await stockOf();
    const res = await issue({ referenceId: 'ISS-001', qty: 10 });
    expect(res.status).to.equal(200);
    expect(res.body.success).to.equal(true);
    expect(res.body.data.status).to.equal('POSTED');
    expect(res.body.data.type).to.equal('ISSUE');
    expect(res.body.data.transfer_number).to.include('WT-');
    expect(res.body.data.idempotent).to.equal(false);
    expect(res.body.data.items[0].product_id).to.equal(PRODUCT_ID);
    expect(res.body.data.items[0].qty).to.equal(10);
    expect(res.body.data.items[0].warehouse_balance).to.equal(before - 10);
    expect(res.body.data.items[0].sales_balance).to.equal(10);

    expect(await stockOf()).to.equal(before - 10);
    expect(await salesQty()).to.equal(10);

    const transfer = await prisma.warehouseTransfer.findFirst({ where: { sales_id: salesId } });
    expect(transfer.status).to.equal('POSTED');
    expect(transfer.reference_id).to.equal('ISS-001');

    const ledger = await prisma.warehouseLedger.findFirst({ where: { sales_id: salesId, product_id: PRODUCT_ID } });
    expect(ledger.movement_type).to.equal('ISSUE_TO_SALES');
    expect(Number(ledger.qty)).to.equal(10);
    expect(Number(ledger.balance)).to.equal(before - 10);

    const salesLedger = await prisma.salesStockLedger.findFirst({
      where: { document_type: 'WAREHOUSE_TRANSFER', sales_id: salesId, product_id: PRODUCT_ID }
    });
    expect(salesLedger.movement_type).to.equal('RECEIVED_FROM_WAREHOUSE');
    expect(Number(salesLedger.balance)).to.equal(10);

    const movements = await prisma.inventoryMovement.findMany({ where: { reference_document: transfer.transfer_number } });
    expect(movements).to.not.be.empty;
    expect(movements[0].movement_type).to.equal('LOAD_OUT');
    expect(movements[0].source_type).to.equal('WAREHOUSE');
    expect(movements[0].destination_type).to.equal('SALES');
  });

  it('is idempotent for the same (type, reference_type, reference_id): no double stock mutation', async () => {
    const before = await stockOf();
    const salesBefore = await salesQty();

    const res = await issue({ referenceId: 'ISS-001', qty: 10 });
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('POSTED');
    expect(res.body.data.idempotent).to.equal(true);

    expect(await stockOf()).to.equal(before);
    expect(await salesQty()).to.equal(salesBefore);
  });

  it('is safe under concurrent duplicate issue: hanya satu POSTED, stok terpotong sekali', async () => {
    const before = await stockOf();
    const salesBefore = await salesQty();

    const [a, b] = await Promise.all([
      issue({ referenceId: 'ISS-CONC', qty: 5 }),
      issue({ referenceId: 'ISS-CONC', qty: 5 })
    ]);

    const statuses = [a.body.data.status, b.body.data.status];
    const idempotentFlags = [a.body.data.idempotent, b.body.data.idempotent];
    expect(statuses).to.include('POSTED');
    expect(idempotentFlags.filter(Boolean).length).to.be.greaterThanOrEqual(1);

    expect(await stockOf()).to.equal(before - 5);
    expect(await salesQty()).to.equal(salesBefore + 5);

    const count = await prisma.warehouseTransfer.count({
      where: { sales_id: salesId, reference_id: 'ISS-CONC' }
    });
    expect(count).to.equal(1);
  });

  it('rejects issue when warehouse stock insufficient (transfer FAILED, sales stock tidak berubah)', async () => {
    const salesBefore = await salesQty();

    const res = await issue({ referenceId: 'ISS-INSUF', qty: totalWarehouseQty + 1000 });
    expect(res.status).to.equal(409);
    expect(res.body.code).to.equal('INSUFFICIENT_STOCK');

    const transfer = await prisma.warehouseTransfer.findFirst({ where: { sales_id: salesId, reference_id: 'ISS-INSUF' } });
    expect(transfer.status).to.equal('FAILED');
    expect(transfer.error_message).to.not.be.null;
    expect(await salesQty()).to.equal(salesBefore);
  });

  it('receives returned stock: warehouse stock bertambah, sales stock berkurang, ledger RETURN_FROM_SALES', async () => {
    const before = await stockOf();
    const salesBefore = await salesQty();
    expect(salesBefore).to.be.greaterThanOrEqual(6);

    const res = await ret({ referenceId: 'RET-001', qty: 6 });
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('POSTED');
    expect(res.body.data.type).to.equal('RETURN');
    expect(res.body.data.idempotent).to.equal(false);
    expect(res.body.data.items[0].batch_id).to.equal(BATCH_ID);

    expect(await stockOf()).to.equal(before + 6);
    expect(await salesQty()).to.equal(salesBefore - 6);

    const ledger = await prisma.warehouseLedger.findFirst({
      where: { sales_id: salesId, product_id: PRODUCT_ID, movement_type: 'RETURN_FROM_SALES' }
    });
    expect(ledger).to.exist;
    expect(Number(ledger.qty)).to.equal(6);
    expect(Number(ledger.balance)).to.equal(before + 6);

    const salesLedger = await prisma.salesStockLedger.findFirst({
      where: { document_type: 'WAREHOUSE_TRANSFER', sales_id: salesId, product_id: PRODUCT_ID, movement_type: 'RETURN_TO_WAREHOUSE' }
    });
    expect(salesLedger).to.exist;
    expect(Number(salesLedger.balance)).to.equal(salesBefore - 6);

    const transfer = await prisma.warehouseTransfer.findFirst({ where: { sales_id: salesId, reference_id: 'RET-001' } });
    const movements = await prisma.inventoryMovement.findMany({ where: { reference_document: transfer.transfer_number } });
    expect(movements[0].movement_type).to.equal('LOAD_IN');
    expect(movements[0].source_type).to.equal('SALES');
    expect(movements[0].destination_type).to.equal('WAREHOUSE');
  });

  it('is idempotent for the same return reference', async () => {
    const before = await stockOf();
    const salesBefore = await salesQty();

    const res = await ret({ referenceId: 'RET-001', qty: 6 });
    expect(res.status).to.equal(200);
    expect(res.body.data.idempotent).to.equal(true);

    expect(await stockOf()).to.equal(before);
    expect(await salesQty()).to.equal(salesBefore);
  });

  it('rejects return exceeding sales stock (INSUFFICIENT_STOCK, transfer FAILED)', async () => {
    const salesBefore = await salesQty();
    const before = await stockOf();

    const res = await ret({ referenceId: 'RET-INSUF', qty: salesBefore + 500 });
    expect(res.status).to.equal(409);
    expect(res.body.code).to.equal('INSUFFICIENT_STOCK');

    const transfer = await prisma.warehouseTransfer.findFirst({ where: { sales_id: salesId, reference_id: 'RET-INSUF' } });
    expect(transfer.status).to.equal('FAILED');
    expect(await salesQty()).to.equal(salesBefore);
    expect(await stockOf()).to.equal(before);
  });

  it('closes the sales day with summary issue/return and is idempotent on re-close', async () => {
    const dayDate = new Date();
    const res = await request(app)
      .post(`${API}/warehouse/transfers/sales-days/close`)
      .set(auth)
      .send({ sales_id: salesId, sales_date: dayDate.toISOString() });
    expect(res.status).to.equal(200);
    expect(res.body.data.status).to.equal('CLOSED');
    expect(res.body.data.idempotent).to.equal(false);
    expect(res.body.data.summary.total_issue).to.be.greaterThan(0);
    expect(res.body.data.summary.products[0].productId).to.equal(PRODUCT_ID);

    const day = await prisma.salesDay.findUnique({
      where: { sales_id_sales_date: { sales_id: salesId, sales_date: dayDate } }
    });
    expect(day.status).to.equal('CLOSED');
    expect(day.summary).to.not.be.null;

    const res2 = await request(app)
      .post(`${API}/warehouse/transfers/sales-days/close`)
      .set(auth)
      .send({ sales_id: salesId, sales_date: dayDate.toISOString() });
    expect(res2.status).to.equal(200);
    expect(res2.body.data.status).to.equal('CLOSED');
    expect(res2.body.data.idempotent).to.equal(true);
  });

  it('rejects missing batch_id on RETURN (422)', async () => {
    const res = await request(app)
      .post(`${API}/warehouse/transfers/return`)
      .set(auth)
      .send({
        warehouse_id: WAREHOUSE_ID,
        sales_id: salesId,
        reference_type: 'SALES_STOCK',
        reference_id: 'RET-NOBATCH',
        items: [{ product_id: PRODUCT_ID, qty: 1 }]
      });
    expect(res.status).to.equal(422);
    expect(res.body.code).to.equal('VALIDATION_ERROR');
  });

  it('lists transfers and ledger', async () => {
    const list = await request(app).get(`${API}/warehouse/transfers`).set(auth).query({ sales_id: salesId });
    expect(list.status).to.equal(200);
    expect(list.body.data).to.be.an('array').that.is.not.empty;

    const ledger = await request(app).get(`${API}/warehouse/transfers/ledger`).set(auth).query({ sales_id: salesId });
    expect(ledger.status).to.equal(200);
    expect(ledger.body.data).to.be.an('array').that.is.not.empty;

    const days = await request(app).get(`${API}/warehouse/transfers/sales-days`).set(auth).query({ sales_id: salesId });
    expect(days.status).to.equal(200);
    expect(days.body.data).to.be.an('array').that.is.not.empty;
  });
});
