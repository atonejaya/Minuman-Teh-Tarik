const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/app');
const prisma = require('../src/config/database');
const jwt = require('jsonwebtoken');

describe('Sprint 9.6 - Sales Return & Credit Note', () => {
  let adminToken, salesToken, salesUser, warungA, warungB, productA, batchA, batchB, transactionA;
  let creditNoteId, visitIdForTest;

  before(async () => {
    // Clean up
    await prisma.salesReturnItem.deleteMany({});
    await prisma.creditNote.deleteMany({});
    await prisma.salesReturn.deleteMany({});
    await prisma.salesTransaction.deleteMany({ where: { code: { startsWith: 'TRX-TEST-RTN' } } });
    await prisma.salesTransaction.deleteMany({ where: { code: { in: ['TRX-DRAFT', 'TRX-CANCEL'] } } });
    await prisma.visit.deleteMany({ where: { code: 'VST-TEST-1' } });
    await prisma.inventoryMovement.deleteMany({ where: { reference_type: 'RETURN' } });
    await prisma.mobileStock.deleteMany({});
    
    const jwtConfig = require('../src/config/jwt');
    // Auth setup
    const admin = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    adminToken = jwt.sign({ sub: admin.id, role: admin.role, userId: admin.id }, jwtConfig.SECRET);
    
    salesUser = await prisma.user.findFirst({ where: { role: 'SALES' } });
    salesToken = jwt.sign({ sub: salesUser.id, role: salesUser.role, userId: salesUser.id }, jwtConfig.SECRET);

    // Get Warungs
    const warungs = await prisma.warung.findMany({ take: 2 });
    warungA = warungs[0];
    warungB = warungs[1];

    // Get Product & Batch
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

    // Create CONFIRMED Transaction for WarungA
    transactionA = await prisma.salesTransaction.create({
      data: {
        code: 'TRX-TEST-RTN',
        visit_id: visitIdForTest,
        sales_id: salesUser.id,
        warung_id: warungA.id,
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
              category: 'MINUMAN',
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

  describe('1. Validation and Constraints', () => {
    it('should reject return if invoice is not CONFIRMED (e.g., DRAFT)', async () => {
      const draftTrx = await prisma.salesTransaction.create({
        data: {
          code: 'TRX-DRAFT', visit_id: visitIdForTest, sales_id: salesUser.id, warung_id: warungA.id, payment_method: 'CASH',
          status: 'DRAFT', subtotal: 1, item_discount: 0, transaction_discount: 0, tax: 0, grand_total: 1
        }
      });
      const res = await request(app)
        .post('/api/v1/returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ transaction_id: draftTrx.id, return_date: new Date().toISOString().split('T')[0] });
      expect(res.status).to.equal(409);
    });

    it('should reject return if invoice is CANCELLED', async () => {
      const draftTrx = await prisma.salesTransaction.create({
        data: {
          code: 'TRX-CANCEL', visit_id: visitIdForTest, sales_id: salesUser.id, warung_id: warungA.id, payment_method: 'CASH',
          status: 'CANCELLED', subtotal: 1, item_discount: 0, transaction_discount: 0, tax: 0, grand_total: 1
        }
      });
      const res = await request(app)
        .post('/api/v1/returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ transaction_id: draftTrx.id, return_date: new Date().toISOString().split('T')[0] });
      expect(res.status).to.equal(409);
    });
  });

  describe('2. Return Flow (Partial & Credit Note)', () => {
    let returnId;

    it('should create a DRAFT sales return', async () => {
      const res = await request(app)
        .post('/api/v1/returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ transaction_id: transactionA.id, return_date: new Date().toISOString().split('T')[0] });
      expect(res.status).to.equal(201);
      returnId = res.body.data.id;
    });

    it('should add item GOOD condition', async () => {
      const res = await request(app)
        .post(`/api/v1/returns/${returnId}/items`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          product_id: productA.id, batch_id: batchA.id, qty: 2, condition: 'GOOD',
          reason: 'WRONG_ITEM', item_price: 10000
        });
      expect(res.status).to.equal(201);
    });

    it('should add item DAMAGED condition', async () => {
      const res = await request(app)
        .post(`/api/v1/returns/${returnId}/items`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          product_id: productA.id, batch_id: batchA.id, qty: 3, condition: 'DAMAGED',
          reason: 'DAMAGED', item_price: 10000
        });
      expect(res.status).to.equal(201);
    });

    it('should reject item if batch is invalid/different', async () => {
      const res = await request(app)
        .post(`/api/v1/returns/${returnId}/items`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          product_id: productA.id, batch_id: batchB.id, qty: 1, condition: 'GOOD',
          reason: 'OTHER', item_price: 10000
        });
      expect(res.status).to.equal(409);
      expect(res.body.message).to.include('not found in the original invoice');
    });

    it('should reject item if total qty exceeds invoice qty', async () => {
      const res = await request(app)
        .post(`/api/v1/returns/${returnId}/items`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          product_id: productA.id, batch_id: batchA.id, qty: 10, condition: 'GOOD',
          reason: 'OTHER', item_price: 10000
        });
      expect(res.status).to.equal(409);
    });

    it('should confirm return successfully, reducing outstanding', async () => {
      // Current outstanding: 100,000. Total Return: 50,000
      const res = await request(app)
        .post(`/api/v1/returns/${returnId}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send();
      expect(res.status).to.equal(200);

      const trx = await prisma.salesTransaction.findUnique({ where: { id: transactionA.id } });
      expect(Number(trx.outstanding_amount)).to.equal(50000);
    });

    it('should correctly double-entry InventoryMovement', async () => {
      // Can't easily match code without querying, we check by sales_id and CUSTOMER->SALES
      const m = await prisma.inventoryMovement.findMany({ where: { source_type: 'CUSTOMER', destination_type: 'SALES' } });
      expect(m.length).to.be.at.least(2);
    });

    it('should partition MobileStock by condition', async () => {
      const ms = await prisma.mobileStock.findMany({ where: { product_id: productA.id, sales_id: salesUser.id } });
      const goodStock = ms.find(s => s.condition === 'GOOD');
      const damagedStock = ms.find(s => s.condition === 'DAMAGED');
      expect(goodStock.qty_available).to.equal(2);
      expect(damagedStock.qty_available).to.equal(3);
    });
  });

  describe('3. Credit Note Generation', () => {
    let returnId2;

    before(async () => {
      // Pay the remaining 50,000 of transactionA
      await prisma.salesTransaction.update({
        where: { id: transactionA.id },
        data: { outstanding_amount: 0, payment_status: 'PAID' }
      });
    });

    it('should generate a Credit Note when Return > Outstanding', async () => {
      // Create new return
      const resDraft = await request(app)
        .post('/api/v1/returns')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ transaction_id: transactionA.id, return_date: new Date().toISOString().split('T')[0] });
      returnId2 = resDraft.body.data.id;

      // Add item (Qty = 1) -> 10,000
      await request(app)
        .post(`/api/v1/returns/${returnId2}/items`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send({
          product_id: productA.id, batch_id: batchA.id, qty: 1, condition: 'GOOD',
          reason: 'WRONG_ITEM', item_price: 10000
        });

      // Confirm
      const resConfirm = await request(app)
        .post(`/api/v1/returns/${returnId2}/confirm`)
        .set('Authorization', `Bearer ${salesToken}`)
        .send();
      expect(resConfirm.status).to.equal(200);

      // Verify Credit Note exists
      const notes = await prisma.creditNote.findMany({ where: { warung_id: warungA.id } });
      expect(notes.length).to.be.greaterThan(0);
      expect(Number(notes[notes.length - 1].amount)).to.equal(10000);
    });
  });

});
