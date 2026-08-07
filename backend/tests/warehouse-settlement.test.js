const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/app');
const prisma = require('../src/config/database');
const jwt = require('jsonwebtoken');

describe('Sprint 9.7 - Warehouse Settlement', () => {
  let salesToken, warehouseToken, supervisorToken;
  let salesUser, warehouseUser, supervisorUser;
  let productA, productB;
  let batchA1, batchA2, batchB1;
  let warehouseId;

  before(async () => {
    // 1. Clear database
    await prisma.settlementDifference.deleteMany({});
    await prisma.warehouseSettlementItem.deleteMany({});
    await prisma.warehouseSettlement.deleteMany({});
    await prisma.creditNote.deleteMany({});
    await prisma.salesReturnItem.deleteMany({});
    await prisma.salesReturn.deleteMany({});
    await prisma.collection.deleteMany({});
    await prisma.payment.deleteMany({});
    await prisma.salesTransactionItem.deleteMany({});
    await prisma.salesTransaction.deleteMany({});
    await prisma.inventoryMovement.deleteMany({});
    await prisma.mobileStock.deleteMany({});
    await prisma.visit.deleteMany({});

    // 2. Prepare Users
    salesUser = await prisma.user.findFirst({ where: { role: 'SALES' } });
    warehouseUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });
    supervisorUser = await prisma.user.findFirst({ where: { role: 'OWNER' } });

    salesToken = jwt.sign({ sub: salesUser.id, role: 'SALES' }, process.env.JWT_SECRET || 'secret');
    warehouseToken = jwt.sign({ sub: warehouseUser.id, role: 'OWNER' }, process.env.JWT_SECRET || 'secret');
    supervisorToken = jwt.sign({ sub: supervisorUser.id, role: 'OWNER' }, process.env.JWT_SECRET || 'secret');

    // 3. Prepare Products & Batches
    productA = await prisma.product.findFirst({ skip: 0 });
    productB = await prisma.product.findFirst({ skip: 1 });

    const batchesA = await prisma.productBatch.findMany({ where: { product_id: productA.id } });
    batchA1 = batchesA[0];
    if (batchesA.length > 1) {
      batchA2 = batchesA[1];
    } else {
      batchA2 = await prisma.productBatch.create({
        data: { product_id: productA.id, batch_number: 'BCH-TEST-2', production_date: new Date(), expired_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) }
      });
    }

    const batchesB = await prisma.productBatch.findMany({ where: { product_id: productB.id } });
    batchB1 = batchesB[0];

    const wh = await prisma.warehouse.findFirst();
    warehouseId = wh.id;

    // 4. Seed MobileStock for Sales (GOOD & DAMAGED, different batches)
    await prisma.mobileStock.createMany({
      data: [
        { sales_id: salesUser.id, product_id: productA.id, batch_id: batchA1.id, qty_available: 10, condition: 'GOOD' },
        { sales_id: salesUser.id, product_id: productA.id, batch_id: batchA2.id, qty_available: 5, condition: 'GOOD' },
        { sales_id: salesUser.id, product_id: productB.id, batch_id: batchB1.id, qty_available: 7, condition: 'DAMAGED' }
      ]
    });

    // 5. Seed some fake transactions for Cash Reconciliation
    // Total Invoice = 15,000, Total Payment = 10,000
    const visit = await prisma.visit.create({
      data: {
        code: 'VST-TEST-SETTLE',
        sales_id: salesUser.id,
        warung_id: (await prisma.warung.findFirst()).id,
        status: 'CHECKED_OUT',
        visit_date: new Date()
      }
    });

    const st = await prisma.salesTransaction.create({
      data: {
        code: 'INV-TEST-SETTLE',
        visit_id: visit.id,
        sales_id: salesUser.id,
        warung_id: visit.warung_id,
        status: 'CONFIRMED',
        payment_method: 'CASH',
        subtotal: 15000,
        item_discount: 0,
        transaction_discount: 0,
        tax: 0,
        grand_total: 15000,
        paid_amount: 10000,
        outstanding_amount: 5000,
        items: {
          create: [{ product_id: productA.id, product_code: productA.code, product_name: productA.name, batch_id: batchA1.id, batch_number: batchA1.batch_number, expired_at: batchA1.expired_at, qty: 1, unit: productA.unit, category: productA.category, selling_price: productA.selling_price, discount: 0, subtotal: 15000 }]
        }
      }
    });

    await prisma.payment.create({
      data: {
        code: 'PAY-TEST-SETTLE',
        transaction_id: st.id,
        created_by: salesUser.id,
        payment_method: 'CASH',
        amount: 10000,
        payment_date: new Date()
      }
    });
  });

  afterEach(async () => {
    // Clear pending blockers if any test created them and didn't clean up
    await prisma.visit.deleteMany({ where: { status: 'SELLING' } });
    await prisma.salesTransaction.deleteMany({ where: { status: 'DRAFT' } });
    await prisma.salesReturn.deleteMany({ where: { status: 'DRAFT' } });
    await prisma.collection.deleteMany({ where: { status: 'PENDING' } });
  });

  describe('Validation (Blockers)', () => {
    it('should block COMPLETED if Visit is SELLING', async () => {
      // First, create a DRAFT settlement to test completion block
      const settleRes = await request(app).post('/api/v1/settlements').set('Authorization', `Bearer ${salesToken}`).send({ warehouse_id: warehouseId });
      console.log('settleRes:', settleRes.body);
      const settlementId = settleRes.body.data.id;
      
      // Move to VERIFIED
      await request(app).put(`/api/v1/settlements/${settlementId}/counting`).set('Authorization', `Bearer ${salesToken}`);
      await request(app).put(`/api/v1/settlements/${settlementId}/verify`).set('Authorization', `Bearer ${warehouseToken}`).send({
        deposit: 7000, cash_on_hand: 3000,
        items: settleRes.body.data.items.map(i => ({ id: i.id, qty_actual: i.qty_expected }))
      });

      // Create SELLING visit
      const visit = await prisma.visit.create({
        data: {
          code: 'VST-TEST-BLOCK',
          sales_id: salesUser.id,
          warung_id: (await prisma.warung.findFirst()).id,
          status: 'SELLING',
          planned_sequence: 99,
          visit_date: new Date(Date.now() + 86400000)
        }
      });

      const res = await request(app).put(`/api/v1/settlements/${settlementId}/complete`).set('Authorization', `Bearer ${supervisorToken}`);
      expect(res.status).to.equal(409);
      expect(res.body.message).to.include('open transactions');

      await prisma.visit.delete({ where: { id: visit.id } });
      await prisma.warehouseSettlementItem.deleteMany({});
      await prisma.warehouseSettlement.deleteMany({});
    });
  });

  describe('Core Flow & Reconciliation', () => {
    let settlementId;
    let itemsSnapshot;

    it('should create Settlement and snapshot MobileStock (Batch Traceability)', async () => {
      const res = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ warehouse_id: warehouseId });
        
      expect(res.status).to.equal(201);
      expect(res.body.data.status).to.equal('DRAFT');
      expect(Number(res.body.data.invoice_amount)).to.equal(15000);
      expect(Number(res.body.data.payment_received)).to.equal(10000);
      
      settlementId = res.body.data.id;
      itemsSnapshot = res.body.data.items;
      
      // Batch traceability: must have 3 items
      expect(itemsSnapshot.length).to.equal(3);
      expect(itemsSnapshot.find(i => i.condition === 'DAMAGED')).to.not.be.undefined;
    });

    it('should reject Double Settlement', async () => {
      const res = await request(app)
        .post('/api/v1/settlements')
        .set('Authorization', `Bearer ${salesToken}`)
        .send({ warehouse_id: warehouseId });
      expect(res.status).to.equal(409);
    });

    it('should start counting', async () => {
      const res = await request(app)
        .put(`/api/v1/settlements/${settlementId}/counting`)
        .set('Authorization', `Bearer ${warehouseToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.data.status).to.equal('COUNTING');
    });

    it('should verify with Cash Difference & Inventory Difference', async () => {
      // Payment = 10k. Deposit = 7k, Cash On Hand = 2k => Difference = 1k
      // Inventory: A1 (expected 10, actual 10), A2 (expected 5, actual 3 => Diff -2), B1 (expected 7, actual 7)
      const itemA2 = itemsSnapshot.find(i => i.batch_id === batchA2.id);

      const res = await request(app)
        .put(`/api/v1/settlements/${settlementId}/verify`)
        .set('Authorization', `Bearer ${warehouseToken}`)
        .send({
          deposit: 7000,
          cash_on_hand: 2000,
          items: itemsSnapshot.map(i => {
            if (i.id === itemA2.id) return { id: i.id, qty_actual: 3 };
            return { id: i.id, qty_actual: i.qty_expected };
          }),
          differences: [
            { item_id: itemA2.id, qty: 2, reason: 'LOST' }
          ]
        });

      expect(res.status).to.equal(200);
      expect(res.body.data.status).to.equal('VERIFIED');
      expect(res.body.data.result).to.equal('DIFFERENCE');
      expect(Number(res.body.data.cash_difference)).to.equal(1000); // 10000 - (7000 + 2000)
    });

    it('should complete Settlement & validate Double Entry / Ledger', async () => {
      const res = await request(app)
        .put(`/api/v1/settlements/${settlementId}/complete`)
        .set('Authorization', `Bearer ${supervisorToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.data.status).to.equal('COMPLETED');

      // 1. Mobile Stock Menjadi Nol
      const ms = await prisma.mobileStock.findMany({ where: { sales_id: salesUser.id } });
      for (const m of ms) {
        expect(m.qty_available).to.equal(0);
      }

      // 2. Warehouse Stock Bertambah
      // A1 GOOD +10, A2 GOOD +3, B1 DAMAGED +7
      const whA1 = await prisma.warehouseStock.findFirst({ where: { batch_id: batchA1.id, condition: 'GOOD', warehouse_id: warehouseId } });
      const whA2 = await prisma.warehouseStock.findFirst({ where: { batch_id: batchA2.id, condition: 'GOOD', warehouse_id: warehouseId } });
      const whB1 = await prisma.warehouseStock.findFirst({ where: { batch_id: batchB1.id, condition: 'DAMAGED', warehouse_id: warehouseId } });

      expect(whA1.qty_available).to.be.at.least(10);
      expect(whA2.qty_available).to.be.at.least(3);
      expect(whB1.qty_available).to.be.at.least(7);

      // 3. Inventory Ledger Validation
      const movements = await prisma.inventoryMovement.findMany({ where: { reference_document: res.body.data.code } });
      expect(movements.length).to.be.at.least(3);
      
      const goodMov = movements.find(m => m.movement_type === 'SETTLEMENT_GOOD');
      const dmgMov = movements.find(m => m.movement_type === 'SETTLEMENT_DAMAGED');
      const adjMov = movements.find(m => m.movement_type === 'SETTLEMENT_ADJUSTMENT');

      expect(goodMov).to.not.be.undefined;
      expect(goodMov.source_type).to.equal('SALES');
      expect(goodMov.destination_type).to.equal('WAREHOUSE');
      
      expect(dmgMov).to.not.be.undefined;
      
      expect(adjMov).to.not.be.undefined;
      expect(adjMov.source_type).to.equal('SALES');
      expect(adjMov.destination_type).to.equal('ADJUSTMENT'); // Lost stock
      expect(adjMov.qty_change).to.equal(2);
    });

    it('should reject modify after COMPLETE', async () => {
      const res = await request(app)
        .put(`/api/v1/settlements/${settlementId}/counting`)
        .set('Authorization', `Bearer ${warehouseToken}`);
      expect(res.status).to.equal(409);
    });
  });
});
