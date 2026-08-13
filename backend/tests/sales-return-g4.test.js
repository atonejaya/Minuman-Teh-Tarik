const request = require('supertest');
const { expect } = require('chai');
const bcrypt = require('bcrypt');
const app = require('../src/app');
const prisma = require('../src/config/database');

const API = '/api/v1';
const PASSWORD = 'password123';

describe('G4 - SalesReturn Business Invariants', function () {
  this.timeout(30000);

  let salesAToken, salesBToken, managerToken;
  let salesA, salesB;
  let warungA, productA, batchA, batchB;
  let visitA;
  let trxConfirmed, trxDraft, trxCancelled, trxCeiling, trxIdor;
  const createdReturnIds = [];

  const returnPayload = (transactionId, items = [], overrides = {}) => ({
    reference_type: 'SALES',
    transaction_id: transactionId,
    return_date: new Date().toISOString().split('T')[0],
    items,
    ...overrides
  });

  const item = (batchId, qty, overrides = {}) => ({
    product_id: productA.id,
    batch_id: batchId,
    qty,
    condition: 'GOOD',
    reason: 'WRONG_ITEM',
    item_price: 10000,
    return_type: 'GOOD',
    ...overrides
  });

  const createReturn = (token, payload) =>
    request(app)
      .post(`${API}/sales/returns`)
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

  before(async () => {
    salesA = await prisma.user.create({
      data: { username: 'g4_sales_a', password_hash: await bcrypt.hash(PASSWORD, 10), name: 'G4 Sales A', role: 'SALES', phone: '081234599101', is_active: true }
    });
    salesB = await prisma.user.create({
      data: { username: 'g4_sales_b', password_hash: await bcrypt.hash(PASSWORD, 10), name: 'G4 Sales B', role: 'SALES', phone: '081234599102', is_active: true }
    });
    const manager = await prisma.user.create({
      data: { username: 'g4_manager', password_hash: await bcrypt.hash(PASSWORD, 10), name: 'G4 Manager', role: 'OWNER', phone: '081234599103', is_active: true }
    });

    const login = async (username) => {
      const res = await request(app).post(`${API}/auth/login`).send({ username, password: PASSWORD });
      expect(res.body.data.token, 'login should return token').to.exist;
      return res.body.data.token;
    };
    salesAToken = await login('g4_sales_a');
    salesBToken = await login('g4_sales_b');
    managerToken = await login('g4_manager');

    warungA = await prisma.warung.create({
      data: { code: 'WRG-G4-001', name: 'Warung G4', owner_name: 'Owner G4', latitude: -6.2, longitude: 106.8, status: 'ACTIVE', assigned_sales_id: salesA.id }
    });

    productA = await prisma.product.create({
      data: {
        code: 'PRD-G4-001',
        name: 'Produk G4',
        category: { connectOrCreate: { where: { code: 'CAT-G4-001' }, create: { code: 'CAT-G4-001', name: 'MINUMAN' } } },
        unit: { connectOrCreate: { where: { code: 'UNT-G4-001' }, create: { code: 'UNT-G4-001', name: 'PCS', symbol: 'pcs' } } },
        cost_price: 1000,
        shelf_life_days: 30,
        is_active: true,
        brand: { connectOrCreate: { where: { code: 'BRD-G4-001' }, create: { code: 'BRD-G4-001', name: 'Brand G4' } } },
        packaging: { connectOrCreate: { where: { code: 'PKG-G4-001' }, create: { code: 'PKG-G4-001', name: 'Bottle' } } }
      }
    });

    batchA = await prisma.productBatch.create({
      data: { product_id: productA.id, batch_number: 'BATCH-G4-001', production_date: new Date(), expired_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    });
    batchB = await prisma.productBatch.create({
      data: { product_id: productA.id, batch_number: 'BATCH-G4-002', production_date: new Date(), expired_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    });

    visitA = await prisma.visit.create({
      data: { code: 'VST-G4-001', sales_id: salesA.id, warung_id: warungA.id, status: 'CHECKED_OUT', visit_date: new Date() }
    });

    const trxData = (code, status, withItems = true) => ({
      code,
      visit_id: visitA.id,
      sales_id: salesA.id,
      warung_id: warungA.id,
      customer_name: warungA.name,
      customer_code: warungA.code,
      salesman_name: salesA.name,
      payment_method: 'CREDIT',
      payment_status: 'UNPAID',
      status,
      subtotal: 100000,
      item_discount: 0,
      transaction_discount: 0,
      tax: 0,
      grand_total: 100000,
      outstanding_amount: 100000,
      ...(withItems
        ? {
            items: {
              create: [
                {
                  product_id: productA.id,
                  batch_id: batchA.id,
                  qty: 10,
                  unit: 'PCS',
                  category_name: 'MINUMAN',
                  selling_price: 10000,
                  discount: 0,
                  subtotal: 100000,
                  product_code: productA.code,
                  product_name: productA.name,
                  batch_number: batchA.batch_number,
                  expired_at: batchA.expired_at
                }
              ]
            }
          }
        : {})
    });

    trxConfirmed = await prisma.salesTransaction.create({ data: trxData('TRX-G4-CONF', 'CONFIRMED') });
    trxCeiling = await prisma.salesTransaction.create({ data: trxData('TRX-G4-CEIL', 'CONFIRMED') });
    trxIdor = await prisma.salesTransaction.create({ data: trxData('TRX-G4-IDOR', 'CONFIRMED') });
    trxDraft = await prisma.salesTransaction.create({ data: trxData('TRX-G4-DRAFT', 'DRAFT', false) });
    trxCancelled = await prisma.salesTransaction.create({ data: trxData('TRX-G4-CANCL', 'CANCELLED', false) });
  });

  after(async () => {
    await prisma.salesReturnItem.deleteMany({ where: { sales_return_id: { in: createdReturnIds } } });
    await prisma.creditNote.deleteMany({ where: { sales_return_id: { in: createdReturnIds } } });
    await prisma.salesReturn.deleteMany({ where: { id: { in: createdReturnIds } } });
    if (createdReturnIds.length) {
      await prisma.outboxEvent.deleteMany({ where: { aggregate_id: { in: createdReturnIds.map(String) } } });
    }
    const trxIds = [trxConfirmed?.id, trxDraft?.id, trxCancelled?.id, trxCeiling?.id, trxIdor?.id].filter(Boolean);
    await prisma.salesTransactionItem.deleteMany({ where: { sales_transaction_id: { in: trxIds } } });
    await prisma.salesTransaction.deleteMany({ where: { id: { in: trxIds } } });
    await prisma.visit.deleteMany({ where: { id: visitA?.id } });
    await prisma.mobileStock.deleteMany({ where: { sales_id: { in: [salesA?.id, salesB?.id].filter(Boolean) } } });
    await prisma.productBatch.deleteMany({ where: { id: { in: [batchA?.id, batchB?.id].filter(Boolean) } } });
    await prisma.product.deleteMany({ where: { id: productA?.id } });
    await prisma.warung.deleteMany({ where: { id: warungA?.id } });
    await prisma.auditLog.deleteMany({ where: { user_id: { in: [salesA?.id, salesB?.id].filter(Boolean) } } });
    await prisma.user.deleteMany({ where: { username: { in: ['g4_sales_a', 'g4_sales_b', 'g4_manager'] } } });
    await prisma.$disconnect();
  });

  describe('A. Invoice status invariant', () => {
    it('rejects return from DRAFT invoice with 409', async () => {
      const res = await createReturn(salesAToken, returnPayload(trxDraft.id));
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('INVALID_INVOICE_STATUS');
    });

    it('rejects return from CANCELLED invoice with 409', async () => {
      const res = await createReturn(salesAToken, returnPayload(trxCancelled.id));
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('INVALID_INVOICE_STATUS');
    });

    it('accepts return from CONFIRMED invoice (201, DRAFT)', async () => {
      const res = await createReturn(salesAToken, returnPayload(trxConfirmed.id, [item(batchA.id, 1)]));
      expect(res.status).to.equal(201);
      expect(res.body.data.status).to.equal('DRAFT');
      expect(res.body.data.sales_id).to.equal(salesA.id);
      createdReturnIds.push(res.body.data.id);
    });
  });

  describe('B. Batch membership invariant', () => {
    it('rejects a batch not present on the invoice with 409 (same product, foreign batch)', async () => {
      const res = await createReturn(salesAToken, returnPayload(trxConfirmed.id, [item(batchB.id, 1)]));
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('BATCH_NOT_ON_INVOICE');
      expect(res.body.message).to.include('not found in the original invoice');
    });

    it('rejects product not present on the invoice with 409', async () => {
      const res = await createReturn(salesAToken, returnPayload(trxConfirmed.id, [
        { product_id: productA.id + 999999, batch_id: batchB.id, qty: 1, condition: 'GOOD', reason: 'WRONG_ITEM', item_price: 10000, return_type: 'GOOD' }
      ]));
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('BATCH_NOT_ON_INVOICE');
    });
  });

  describe('C. Quantity ceiling invariant', () => {
    it('rejects qty greater than invoice qty with 409', async () => {
      const res = await createReturn(salesAToken, returnPayload(trxConfirmed.id, [item(batchA.id, 11)]));
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('RETURN_QTY_EXCEEDS_INVOICE');
    });

    it('rejects qty <= 0 with 400', async () => {
      const zero = await createReturn(salesAToken, returnPayload(trxConfirmed.id, [item(batchA.id, 0)]));
      expect(zero.status).to.equal(400);
      const negative = await createReturn(salesAToken, returnPayload(trxConfirmed.id, [item(batchA.id, -3)]));
      expect(negative.status).to.equal(400);
    });

    it('accepts a partial return within invoice qty', async () => {
      const res = await createReturn(salesAToken, returnPayload(trxConfirmed.id, [item(batchA.id, 3)]));
      expect(res.status).to.equal(201);
      createdReturnIds.push(res.body.data.id);
    });

    it('rejects aggregate qty exceeding the invoice ceiling across returns', async () => {
      const full = await createReturn(salesAToken, returnPayload(trxCeiling.id, [item(batchA.id, 10)]));
      expect(full.status).to.equal(201);
      createdReturnIds.push(full.body.data.id);

      const overflow = await createReturn(salesAToken, returnPayload(trxCeiling.id, [item(batchA.id, 1)]));
      expect(overflow.status).to.equal(409);
      expect(overflow.body.code).to.equal('RETURN_QTY_EXCEEDS_INVOICE');
    });
  });

  describe('D. Return is not a Payment', () => {
    it('creates no Payment and leaves outstanding_amount unchanged', async () => {
      const before = await prisma.salesTransaction.findUnique({ where: { id: trxConfirmed.id } });
      const outstandingBefore = Number(before.outstanding_amount);
      const paymentCountBefore = await prisma.payment.count();

      const createRes = await createReturn(salesAToken, returnPayload(trxConfirmed.id, [item(batchA.id, 2)]));
      expect(createRes.status).to.equal(201);
      const returnId = createRes.body.data.id;
      createdReturnIds.push(returnId);

      const approveRes = await request(app)
        .post(`${API}/sales/returns/${returnId}/approve`)
        .set('Authorization', `Bearer ${salesAToken}`)
        .send();
      expect(approveRes.status).to.equal(200);

      const after = await prisma.salesTransaction.findUnique({ where: { id: trxConfirmed.id } });
      expect(Number(after.outstanding_amount)).to.equal(outstandingBefore);
      const paymentCountAfter = await prisma.payment.count();
      expect(paymentCountAfter).to.equal(paymentCountBefore);
    });
  });

  describe('E. Credit Note boundary', () => {
    it('does not auto-create a CreditNote on APPROVE (explicit issuance required)', async () => {
      const createRes = await createReturn(salesAToken, returnPayload(trxConfirmed.id, [item(batchA.id, 1)]));
      expect(createRes.status).to.equal(201);
      const returnId = createRes.body.data.id;
      createdReturnIds.push(returnId);

      const approveRes = await request(app)
        .post(`${API}/sales/returns/${returnId}/approve`)
        .set('Authorization', `Bearer ${salesAToken}`)
        .send();
      expect(approveRes.status).to.equal(200);
      expect(approveRes.body.data.status).to.equal('APPROVED');

      const cn = await prisma.creditNote.findFirst({ where: { sales_return_id: returnId } });
      expect(cn).to.equal(null);
    });
  });

  describe('F. Authorization / IDOR', () => {
    it('rejects a SALES user creating a return for another sales invoice with 403', async () => {
      const res = await createReturn(salesBToken, returnPayload(trxIdor.id, [item(batchA.id, 1)]));
      expect(res.status).to.equal(403);
      expect(res.body.code).to.equal('ACCESS_DENIED');
    });

    it('allows a MANAGER (OWNER) to create a return on behalf of a sales invoice', async () => {
      const res = await createReturn(managerToken, returnPayload(trxIdor.id, [item(batchA.id, 1)], { sales_id: salesA.id }));
      expect(res.status).to.equal(201);
      expect(res.body.data.sales_id).to.equal(salesA.id);
      createdReturnIds.push(res.body.data.id);
    });

    it('rejects a return for an unknown invoice with 404', async () => {
      const res = await createReturn(salesAToken, returnPayload(999999999));
      expect(res.status).to.equal(404);
    });

    it('rejects unauthenticated requests with 401', async () => {
      const res = await request(app)
        .post(`${API}/sales/returns`)
        .send(returnPayload(trxConfirmed.id, [item(batchA.id, 1)]));
      expect(res.status).to.equal(401);
    });
  });
});
