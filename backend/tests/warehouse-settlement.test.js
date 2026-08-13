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
  let ts;
  let stockSnapshot = [];

  async function captureStock() {
    const rows = await prisma.warehouseStock.findMany({
      where: { warehouse_id: warehouseId, batch_id: { in: [batchA1?.id, batchA2?.id, batchB1?.id].filter(Boolean) } }
    });
    stockSnapshot = rows.map((r) => ({ batch_id: r.batch_id, condition: r.condition, qty_available: Number(r.qty_available) }));
  }

  async function restoreStock() {
    for (const s of stockSnapshot) {
      await prisma.warehouseStock.updateMany({
        where: { warehouse_id: warehouseId, batch_id: s.batch_id, condition: s.condition },
        data: { qty_available: s.qty_available }
      });
    }
  }

  before(async () => {
    // Dedicated fixtures per run (no global teardown of shared tables)
    ts = Date.now();
    salesUser = await prisma.user.create({ data: { username: `wst_sales_${ts}`, password_hash: 'x', name: 'WST Sales', role: 'SALES', is_active: true } });
    warehouseUser = await prisma.user.create({ data: { username: `wst_wh_${ts}`, password_hash: 'x', name: 'WST WH', role: 'OWNER', is_active: true } });
    supervisorUser = await prisma.user.create({ data: { username: `wst_sup_${ts}`, password_hash: 'x', name: 'WST Sup', role: 'OWNER', is_active: true } });

    salesToken = jwt.sign({ sub: salesUser.id, role: 'SALES' }, process.env.JWT_SECRET || 'secret');
    warehouseToken = jwt.sign({ sub: warehouseUser.id, role: 'OWNER' }, process.env.JWT_SECRET || 'secret');
    supervisorToken = jwt.sign({ sub: supervisorUser.id, role: 'OWNER' }, process.env.JWT_SECRET || 'secret');

    const warung = await prisma.warung.create({
      data: { code: `WRG-WST-${ts}`, name: 'Warung WST', owner_name: 'WST', latitude: 0, longitude: 0, assigned_sales_id: salesUser.id }
    });

    // 3. Prepare Products & Batches
    productA = await prisma.product.findFirst({ skip: 0 });
    productB = await prisma.product.findFirst({ skip: 1 });

    const batchesA = await prisma.productBatch.findMany({ where: { product_id: productA.id } });
    batchA1 = batchesA[0];
    if (batchesA.length > 1) {
      batchA2 = batchesA[1];
    } else {
      batchA2 = await prisma.productBatch.create({
        data: { product_id: productA.id, batch_number: `BCH-WST-${ts}`, production_date: new Date(), expired_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) }
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
        code: `VST-WST-${ts}`,
        sales_id: salesUser.id,
        warung_id: warung.id,
        status: 'CHECKED_OUT',
        visit_date: new Date()
      }
    });

    const st = await prisma.salesTransaction.create({
      data: {
        code: `INV-WST-${ts}`,
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
          create: [{ product_id: productA.id, product_code: productA.code, product_name: productA.name, batch_id: batchA1.id, batch_number: batchA1.batch_number, expired_at: batchA1.expired_at, qty: 1, unit: 'PCS', category_name: 'MINUMAN', selling_price: 15000, discount: 0, subtotal: 15000 }]
        },
        customer_name: 'Bapak TX',
        customer_code: 'WRG-TX-001',
        salesman_name: 'Salesman TX'
      }
    });

    await prisma.payment.create({
      data: {
        code: `PAY-WST-${ts}`,
        transaction_id: st.id,
        created_by: salesUser.id,
        payment_method: 'CASH',
        amount: 10000,
        payment_date: new Date()
      }
    });

    await captureStock();
  });

  afterEach(async () => {
    // Clear pending blockers created by this suite (scoped to own sales user)
    await prisma.visit.deleteMany({ where: { sales_id: salesUser?.id, status: 'SELLING' } });
    await prisma.salesTransaction.deleteMany({ where: { sales_id: salesUser?.id, status: 'DRAFT' } });
    await prisma.salesReturn.deleteMany({ where: { sales_id: salesUser?.id, status: 'DRAFT' } });
    await prisma.collection.deleteMany({ where: { sales_id: salesUser?.id, status: 'PENDING' } });
  });

  after(async () => {
    // Scoped teardown of this suite's fixtures (FK-ordered)
    const ownSettlements = await prisma.warehouseSettlement.findMany({ where: { sales_id: salesUser?.id }, select: { id: true, code: true } });
    const settlementIds = ownSettlements.map((s) => s.id);
    const settlementCodes = ownSettlements.map((s) => s.code);
    if (settlementIds.length > 0) {
      await prisma.settlementDifference.deleteMany({ where: { warehouse_settlement_id: { in: settlementIds } } });
      await prisma.warehouseSettlementItem.deleteMany({ where: { warehouse_settlement_id: { in: settlementIds } } });
      await prisma.outboxEvent.deleteMany({ where: { aggregate_id: { in: settlementIds.map(String) } } });
      await prisma.warehouseSettlement.deleteMany({ where: { id: { in: settlementIds } } });
    }
    if (settlementCodes.length > 0) {
      await prisma.inventoryMovement.deleteMany({ where: { reference_document: { in: settlementCodes } } });
    }
    const ownTxIds = (await prisma.salesTransaction.findMany({ where: { sales_id: salesUser?.id }, select: { id: true } })).map((t) => t.id);
    if (ownTxIds.length > 0) {
      const ownPaymentIds = (await prisma.payment.findMany({ where: { transaction_id: { in: ownTxIds } }, select: { id: true } })).map((p) => p.id);
      if (ownPaymentIds.length > 0) {
        await prisma.paymentAllocation.deleteMany({ where: { payment_id: { in: ownPaymentIds } } });
        await prisma.payment.deleteMany({ where: { id: { in: ownPaymentIds } } });
      }
      await prisma.salesTransactionItem.deleteMany({ where: { sales_transaction_id: { in: ownTxIds } } });
      await prisma.salesTransaction.deleteMany({ where: { id: { in: ownTxIds } } });
    }
    await prisma.mobileStock.deleteMany({ where: { sales_id: salesUser?.id } });
    await prisma.visit.deleteMany({ where: { sales_id: salesUser?.id } });
    await prisma.auditLog.deleteMany({ where: { user_id: { in: [salesUser?.id, warehouseUser?.id, supervisorUser?.id].filter(Boolean) } } });
    await prisma.warung.deleteMany({ where: { code: `WRG-WST-${ts}` } });
    if (batchA2 && batchA2.batch_number === `BCH-WST-${ts}`) {
      await prisma.warehouseStock.deleteMany({ where: { batch_id: batchA2.id } });
      await prisma.mobileStock.deleteMany({ where: { batch_id: batchA2.id } });
      await prisma.productBatch.deleteMany({ where: { id: batchA2.id } });
    }
    await prisma.user.deleteMany({ where: { id: { in: [salesUser?.id, warehouseUser?.id, supervisorUser?.id].filter(Boolean) } } });
    await restoreStock();
    await prisma.$disconnect();
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
          code: `VST-BLOCK-${ts}`,
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
      await prisma.settlementDifference.deleteMany({ where: { warehouse_settlement_id: settlementId } });
      await prisma.warehouseSettlementItem.deleteMany({ where: { warehouse_settlement_id: settlementId } });
      await prisma.warehouseSettlement.deleteMany({ where: { id: settlementId } });
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
