const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/app');
const prisma = require('../src/config/database');

const API = '/api/v1';
const PASSWORD = 'password123';

describe('Sprint 9.6 - Sales Return & Credit Note (current contract /api/v1/sales/returns)', function () {
  this.timeout(30000);
  let salesToken, salesUser, warungA, productA, batchA, batchB, transactionA;
  let visitIdForTest;
  const createdReturnIds = [];

  const auth = () => ({ Authorization: `Bearer ${salesToken}` });

  const returnPayload = (transactionId, items = []) => ({
    reference_type: 'SALES',
    transaction_id: transactionId,
    return_date: new Date().toISOString().split('T')[0],
    items
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

  before(async () => {
    await prisma.salesReturnItem.deleteMany({ where: { sales_return: { transaction_id: { not: null } } } });
    await prisma.creditNote.deleteMany({});
    await prisma.salesReturn.deleteMany({ where: { transaction_id: { not: null } } });
    await prisma.salesTransaction.deleteMany({ where: { code: { startsWith: 'TRX-TEST-RTN' } } });
    await prisma.salesTransaction.deleteMany({ where: { code: { in: ['TRX-DRAFT', 'TRX-CANCEL'] } } });
    await prisma.visit.deleteMany({ where: { code: 'VST-TEST-1' } });
    await prisma.inventoryMovement.deleteMany({ where: { reference_type: 'RETURN' } });
    await prisma.mobileStock.deleteMany({});

    const jwtConfig = require('../src/config/jwt');
    const admin = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    salesUser = await prisma.user.findFirst({ where: { role: 'SALES' } });

    const login = async (username) => {
      const res = await request(app).post(`${API}/auth/login`).send({ username, password: PASSWORD });
      return res.body.data.token;
    };

    if (admin) {
      await prisma.user.update({ where: { id: admin.id }, data: { password_hash: require('bcrypt').hashSync(PASSWORD, 10) } });
    }
    if (salesUser) {
      await prisma.user.update({ where: { id: salesUser.id }, data: { password_hash: require('bcrypt').hashSync(PASSWORD, 10) } });
      salesToken = await login(salesUser.username);
      expect(salesToken, 'sales login token').to.exist;
    }

    const warungs = await prisma.warung.findMany({ take: 2 });
    warungA = warungs[0];

    productA = await prisma.product.findFirst();
    const batches = await prisma.productBatch.findMany({ where: { product_id: productA.id }, take: 2 });
    batchA = batches[0];
    if (batches.length > 1) {
      batchB = batches[1];
    } else {
      batchB = await prisma.productBatch.create({
        data: {
          product_id: productA.id,
          batch_number: 'BCH-TEST-2',
          production_date: new Date(),
          expired_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1))
        }
      });
    }

    const visit = await prisma.visit.create({
      data: {
        code: 'VST-TEST-1',
        sales_id: salesUser.id,
        warung_id: warungA.id,
        visit_date: new Date(),
        status: 'CHECKED_OUT'
      }
    });
    visitIdForTest = visit.id;

    transactionA = await prisma.salesTransaction.create({
      data: {
        code: 'TRX-TEST-RTN',
        visit_id: visitIdForTest,
        sales_id: salesUser.id,
        warung_id: warungA.id,
        customer_name: warungA.name,
        customer_code: warungA.code,
        salesman_name: salesUser.name,
        payment_method: 'CREDIT',
        payment_status: 'UNPAID',
        status: 'CONFIRMED',
        subtotal: 100000,
        item_discount: 0,
        transaction_discount: 0,
        tax: 0,
        grand_total: 100000,
        outstanding_amount: 100000,
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
    });
  });

  after(async () => {
    await prisma.salesReturnItem.deleteMany({ where: { sales_return_id: { in: createdReturnIds } } });
    await prisma.creditNote.deleteMany({ where: { sales_return_id: { in: createdReturnIds } } });
    await prisma.salesReturn.deleteMany({ where: { id: { in: createdReturnIds } } });
    if (createdReturnIds.length) {
      await prisma.outboxEvent.deleteMany({ where: { aggregate_id: { in: createdReturnIds.map(String) } } });
    }
    if (transactionA) {
      await prisma.salesTransactionItem.deleteMany({ where: { sales_transaction_id: transactionA.id } });
      await prisma.salesTransaction.deleteMany({ where: { id: transactionA.id } });
    }
    await prisma.visit.deleteMany({ where: { id: visitIdForTest } });
    await prisma.mobileStock.deleteMany({});
    await prisma.$disconnect();
  });

  describe('1. Validation and Constraints (invoice status)', () => {
    it('should reject return if invoice is not CONFIRMED (e.g., DRAFT) with 409', async () => {
      const draftTrx = await prisma.salesTransaction.create({
        data: {
          code: 'TRX-DRAFT', visit_id: visitIdForTest, sales_id: salesUser.id, warung_id: warungA.id,
          customer_name: warungA.name, customer_code: warungA.code, salesman_name: salesUser.name,
          payment_method: 'CASH', status: 'DRAFT', subtotal: 1, item_discount: 0, transaction_discount: 0, tax: 0, grand_total: 1
        }
      });
      const res = await request(app)
        .post(`${API}/sales/returns`)
        .set(auth())
        .send(returnPayload(draftTrx.id));
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('INVALID_INVOICE_STATUS');
      await prisma.salesTransaction.delete({ where: { id: draftTrx.id } });
    });

    it('should reject return if invoice is CANCELLED with 409', async () => {
      const cancelTrx = await prisma.salesTransaction.create({
        data: {
          code: 'TRX-CANCEL', visit_id: visitIdForTest, sales_id: salesUser.id, warung_id: warungA.id,
          customer_name: warungA.name, customer_code: warungA.code, salesman_name: salesUser.name,
          payment_method: 'CASH', status: 'CANCELLED', subtotal: 1, item_discount: 0, transaction_discount: 0, tax: 0, grand_total: 1
        }
      });
      const res = await request(app)
        .post(`${API}/sales/returns`)
        .set(auth())
        .send(returnPayload(cancelTrx.id));
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('INVALID_INVOICE_STATUS');
      await prisma.salesTransaction.delete({ where: { id: cancelTrx.id } });
    });
  });

  describe('2. Return Flow (Partial)', () => {
    let returnId;

    it('should create a DRAFT sales return from a CONFIRMED invoice', async () => {
      const res = await request(app)
        .post(`${API}/sales/returns`)
        .set(auth())
        .send(returnPayload(transactionA.id, [item(batchA.id, 2)]));
      expect(res.status).to.equal(201);
      expect(res.body.data.status).to.equal('DRAFT');
      expect(res.body.data.transaction_id).to.equal(transactionA.id);
      returnId = res.body.data.id;
      createdReturnIds.push(returnId);
    });

    it('should reject item if batch is not present on the original invoice', async () => {
      const res = await request(app)
        .post(`${API}/sales/returns`)
        .set(auth())
        .send(returnPayload(transactionA.id, [item(batchB.id, 1)]));
      expect(res.status).to.equal(409);
      expect(res.body.message).to.include('not found in the original invoice');
    });

    it('should reject item if qty exceeds invoice qty', async () => {
      const res = await request(app)
        .post(`${API}/sales/returns`)
        .set(auth())
        .send(returnPayload(transactionA.id, [item(batchA.id, 11)]));
      expect(res.status).to.equal(409);
      expect(res.body.code).to.equal('RETURN_QTY_EXCEEDS_INVOICE');
    });

    it('should advance lifecycle CHECKED -> APPROVED -> COMPLETED', async () => {
      const checkRes = await request(app)
        .post(`${API}/sales/returns/${returnId}/check`)
        .set(auth())
        .send();
      expect(checkRes.status).to.equal(200);
      expect(checkRes.body.data.status).to.equal('CHECKED');

      const approveRes = await request(app)
        .post(`${API}/sales/returns/${returnId}/approve`)
        .set(auth())
        .send();
      expect(approveRes.status).to.equal(200);
      expect(approveRes.body.data.status).to.equal('APPROVED');

      const completeRes = await request(app)
        .post(`${API}/sales/returns/${returnId}/complete`)
        .set(auth())
        .send();
      expect(completeRes.status).to.equal(200);
      expect(completeRes.body.data.status).to.equal('COMPLETED');
    });

    it('should be retrievable via list and detail', async () => {
      const list = await request(app).get(`${API}/sales/returns`).set(auth());
      expect(list.status).to.equal(200);
      expect(list.body.data.some(r => r.id === returnId)).to.be.true;

      const detail = await request(app).get(`${API}/sales/returns/${returnId}`).set(auth());
      expect(detail.status).to.equal(200);
      expect(detail.body.data.id).to.equal(returnId);
    });

    it('should not reduce invoice outstanding and should not create a Payment', async () => {
      const before = await prisma.salesTransaction.findUnique({ where: { id: transactionA.id } });
      const paymentsBefore = await prisma.payment.count();

      const res = await request(app)
        .post(`${API}/sales/returns`)
        .set(auth())
        .send(returnPayload(transactionA.id, [item(batchA.id, 1)]));
      expect(res.status).to.equal(201);
      const id2 = res.body.data.id;
      createdReturnIds.push(id2);

      await request(app).post(`${API}/sales/returns/${id2}/approve`).set(auth()).send();

      const after = await prisma.salesTransaction.findUnique({ where: { id: transactionA.id } });
      expect(Number(after.outstanding_amount)).to.equal(Number(before.outstanding_amount));
      expect(await prisma.payment.count()).to.equal(paymentsBefore);
    });
  });

  describe('3. Credit Note Boundary', () => {
    it('should NOT auto-create a CreditNote on APPROVE', async () => {
      const res = await request(app)
        .post(`${API}/sales/returns`)
        .set(auth())
        .send(returnPayload(transactionA.id, [item(batchA.id, 1)]));
      expect(res.status).to.equal(201);
      const returnId = res.body.data.id;
      createdReturnIds.push(returnId);

      const approveRes = await request(app)
        .post(`${API}/sales/returns/${returnId}/approve`)
        .set(auth())
        .send();
      expect(approveRes.status).to.equal(200);

      const cn = await prisma.creditNote.findFirst({ where: { sales_return_id: returnId } });
      expect(cn).to.equal(null);
    });
  });
});
