const request = require('supertest');
const assert = require('assert');
const app = require('../src/app');
const prisma = require('../src/config/database');
const { SECRET, EXPIRES_IN } = require('../src/config/jwt');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const dayjs = require('dayjs');
const QueryCache = require('../src/infrastructure/cache/QueryCache');

function generateToken(user) {
  return jwt.sign({ sub: user.id, username: user.username, role: user.role, warung_id: user.warung_id }, SECRET, { expiresIn: EXPIRES_IN });
}
const DashboardOwnerRepository = require('../src/modules/dashboard/repositories/DashboardOwnerRepository');
const DashboardSalesRepository = require('../src/modules/dashboard/repositories/DashboardSalesRepository');

describe('Dashboard Integration Tests (Sprint 11.4A)', function() {
  this.timeout(10000);
  let ownerToken, salesToken, salesId;
  let initialNilaiPersediaan = 0;
  let initialMobileStock = 0;
  const today = dayjs('2099-01-01').startOf('day').add(12, 'hour').toDate();
  const yesterday = dayjs('2098-12-25').startOf('day').add(12, 'hour').toDate();
  const tomorrow = dayjs('2099-01-02').startOf('day').add(12, 'hour').toDate();

  before(async () => {
    // 1. Clean DB (Targeted to avoid FK errors)
    await prisma.outletStockLedger.deleteMany({ where: { created_at: today } });
    const strayDate = dayjs('2098-12-31').startOf('day').add(12, 'hour').toDate();
    await prisma.salesVisit.deleteMany({ where: { visit_date: { in: [today, yesterday, strayDate] } } });
    await prisma.dailySalesSummary.deleteMany({ where: { date: { in: [today, yesterday, strayDate] } } });
    await prisma.accountsReceivableProjection.deleteMany({ where: { sales_transaction_id: { in: [101, 102] } } });
    // Removed destructive global deleteMany for mobileStock and warehouseStock
    const password_hash = await bcrypt.hash('password123', 10);
    const owner = await prisma.user.create({
      data: { name: 'Owner', username: `owner_${Date.now()}`, password_hash, role: 'OWNER', is_active: true }
    });
    ownerToken = generateToken(owner);

    const sales = await prisma.user.create({
      data: { name: 'Sales1', username: `sales_${Date.now()}`, password_hash, role: 'SALES', is_active: true }
    });
    salesId = sales.id;
    salesToken = generateToken(sales);

    // Create Warungs
    const w1 = await prisma.warung.create({ data: { code: `W1_${Date.now()}`, name: 'W1', owner_name: 'O1', address: 'A1', phone: '1', latitude: 0, longitude: 0 } });
    const w2 = await prisma.warung.create({ data: { code: `W2_${Date.now()}`, name: 'W2', owner_name: 'O2', address: 'A2', phone: '2', latitude: 0, longitude: 0 } });
    const w3 = await prisma.warung.create({ data: { code: `W3_${Date.now()}`, name: 'W3', owner_name: 'O3', address: 'A3', phone: '3', latitude: 0, longitude: 0 } });

    const existingWHStock = await prisma.warehouseStock.findMany({ where: { condition: 'GOOD', qty_available: { gt: 0 } }, include: { product: { select: { average_cost: true } } } });
    initialNilaiPersediaan = existingWHStock.reduce((acc, stock) => acc + (Number(stock.qty_available) * (stock.product ? Number(stock.product.average_cost) : 0)), 0);

    const p1Id = 12;
    await prisma.product.update({ where: { id: p1Id }, data: { average_cost: 2000 } });

    // 4. Warehouse Stock (for Nilai Persediaan = 100 * 2000 = 200000)
    const warehouse = await prisma.warehouse.create({
      data: { name: 'WH1', code: `WH_${Date.now()}` }
    });

    // 5. Product Batch
    // Expiring Soon
    const b1 = await prisma.productBatch.create({
      data: { product_id: p1Id, batch_number: `B001_${Date.now()}`, production_date: yesterday, expired_at: dayjs().add(10, 'day').toDate() }
    });
    // Not Expiring Soon (35 days)
    const b2 = await prisma.productBatch.create({
      data: { product_id: p1Id, batch_number: `B002_${Date.now()}`, production_date: yesterday, expired_at: dayjs().add(35, 'day').toDate() }
    });

    await prisma.warehouseStock.create({
      data: { warehouse: { connect: { id: warehouse.id } }, product: { connect: { id: p1Id } }, batch: { connect: { id: b1.id } }, qty_available: 100, condition: 'GOOD' }
    });

    // 6. DailySalesSummary (Omzet = 500000, Kas Masuk = 400000)
    await prisma.dailySalesSummary.create({
      data: { date: today, sales_id: salesId, warehouse_id: warehouse.id, invoice_count: 5, sales_amount: 500000, paid_amount: 400000, outstanding_amount: 100000 }
    });
    // Yesterday's sales (should be excluded if date is today)
    await prisma.dailySalesSummary.create({
      data: { date: yesterday, sales_id: salesId, warehouse_id: warehouse.id, invoice_count: 1, sales_amount: 100000, paid_amount: 100000, outstanding_amount: 0 }
    });

    // 7. AccountsReceivableProjection (Piutang = 150000)
    await prisma.accountsReceivableProjection.create({
      data: { sales_transaction_id: 101, invoice_number: `INV1_${Date.now()}`, customer_code: 'C1', customer_name: 'C1', outstanding_amount: 100000, status: 'PARTIALLY_PAID', invoice_amount: 200000, paid_amount: 100000, last_invoice_date: new Date() }
    });
    await prisma.accountsReceivableProjection.create({
      data: { sales_transaction_id: 102, invoice_number: `INV2_${Date.now()}`, customer_code: 'C2', customer_name: 'C2', outstanding_amount: 50000, status: 'UNPAID', invoice_amount: 50000, paid_amount: 0, last_invoice_date: new Date() }
    });

    // 8. Refill & Visits
    const sv1 = await prisma.salesVisit.create({
      data: { sales_id: salesId, warung_id: w1.id, visit_date: today, status: 'COMPLETED', code: `SV_${Date.now()}` }
    });
    await prisma.salesVisit.create({
      data: { sales_id: salesId, warung_id: w2.id, visit_date: today, status: 'PLANNED', code: `SV_${Date.now()+1}` }
    });
    await prisma.salesVisit.create({
      data: { sales_id: salesId, warung_id: w3.id, visit_date: yesterday, status: 'COMPLETED', code: `SV_${Date.now()+2}` } // Excluded
    });

    // REFILL = 5, ISSUE = 7, SALE = 10
    // Expected Refill = 12
    await prisma.outletStockLedger.create({
      data: { warung_id: w1.id, product_id: p1Id, movement_type: 'REFILL', qty_before: 0, qty_change: 5, qty_after: 5, reference_type: 'SALES_VISIT', reference_id: sv1.id, created_at: today }
    });
    await prisma.outletStockLedger.create({
      data: { warung_id: w1.id, product_id: p1Id, movement_type: 'ISSUE_TO_OUTLET', qty_before: 5, qty_change: 7, qty_after: 12, reference_type: 'SALES_VISIT', reference_id: sv1.id, created_at: today }
    });
    await prisma.outletStockLedger.create({
      data: { warung_id: w1.id, product_id: p1Id, movement_type: 'SALE', qty_before: 12, qty_change: -10, qty_after: 2, reference_type: 'SALES_VISIT', reference_id: sv1.id, created_at: today }
    });

    // 9. Mobile Stock
    const existingMobileStock = await prisma.mobileStock.findMany({ where: { sales_id: salesId, condition: 'GOOD', qty_available: { gt: 0 } } });
    initialMobileStock = existingMobileStock.reduce((acc, stock) => acc + Number(stock.qty_available), 0);

    await prisma.mobileStock.create({
      data: { sales: { connect: { id: salesId } }, product: { connect: { id: p1Id } }, batch: { connect: { id: b1.id } }, qty_available: 50, condition: 'GOOD' }
    });

    // Clear Cache before tests
    QueryCache.invalidate();
  });

  after(async () => {
    // Restore mocks if any
  });

  const originalMethods = {};
  
  beforeEach(() => {
    // Guard against write queries
    const methods = ['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'];
    for (const model of Object.keys(prisma)) {
      if (typeof prisma[model] === 'object' && !model.startsWith('$')) {
        for (const method of methods) {
          if (prisma[model][method]) {
            const key = `${model}.${method}`;
            if (!originalMethods[key]) originalMethods[key] = prisma[model][method];
            
            prisma[model][method] = function() {
              throw new Error(`Write operation detected in read-only API: ${model}.${method}`);
            };
          }
        }
      }
    }
    QueryCache.invalidate();
  });

  afterEach(() => {
    // Restore write methods
    const methods = ['create', 'update', 'delete', 'upsert', 'createMany', 'updateMany', 'deleteMany'];
    for (const model of Object.keys(prisma)) {
      if (typeof prisma[model] === 'object' && !model.startsWith('$')) {
        for (const method of methods) {
          const key = `${model}.${method}`;
          if (originalMethods[key]) {
            prisma[model][method] = originalMethods[key];
          }
        }
      }
    }
  });

  describe('GET /api/v1/dashboard/owner/summary', () => {
    it('should return aggregated data based on locked metric definition', async () => {
      const dateStr = dayjs(today).format('YYYY-MM-DD');
      const res = await request(app)
        .get(`/api/v1/dashboard/owner/summary?date=${dateStr}`)
        .set('Authorization', `Bearer ${ownerToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.success, true);
      
      const d = res.body.data;
      assert.strictEqual(d.omzet, 500000); // Only today
      assert.strictEqual(d.kas_masuk, 400000);
      assert.strictEqual(d.piutang, 150000); // 100k + 50k
      assert.strictEqual(d.nilai_persediaan, initialNilaiPersediaan + 200000); // 100 * 2000 + existing
      assert.strictEqual(d.barang_direfill, 12); // REFILL (5) + ISSUE_TO_OUTLET (7)
    });

    it('should use deterministic caching for identical requests', async () => {
      const dateStr = dayjs(today).format('YYYY-MM-DD');
      
      let repoCalls = 0;
      const originalGetSummary = DashboardOwnerRepository.getSummary;
      DashboardOwnerRepository.getSummary = async function(...args) {
        repoCalls++;
        return originalGetSummary.apply(this, args);
      };

      // Request 1: cache miss
      const res1 = await request(app)
        .get(`/api/v1/dashboard/owner/summary?date=${dateStr}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      
      assert.strictEqual(res1.status, 200);
      assert.strictEqual(repoCalls, 1);

      // Request 2: cache hit
      const res2 = await request(app)
        .get(`/api/v1/dashboard/owner/summary?date=${dateStr}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      
      assert.strictEqual(res2.status, 200);
      assert.strictEqual(repoCalls, 1); // No additional query!

      DashboardOwnerRepository.getSummary = originalGetSummary; // Restore
    });
  });

  describe('GET /api/v1/dashboard/owner/visits', () => {
    it('should aggregate only visits for the requested date', async () => {
      const dateStr = dayjs(today).format('YYYY-MM-DD');
      const res = await request(app)
        .get(`/api/v1/dashboard/owner/visits?date=${dateStr}`)
        .set('Authorization', `Bearer ${ownerToken}`);
      
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.completed, 1);
      assert.strictEqual(res.body.data.planned, 1);
      assert.strictEqual(res.body.data.total, 2);
    });
  });

  describe('Sales Data Isolation', () => {
    it('should forbid Sales from accessing Owner endpoints', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/owner/summary')
        .set('Authorization', `Bearer ${salesToken}`);
      
      assert.strictEqual(res.status, 403);
    });

    it('should return sales summary scoped to logged-in salesId', async () => {
      const dateStr = dayjs(today).format('YYYY-MM-DD');
      const res = await request(app)
        .get(`/api/v1/dashboard/sales/summary?date=${dateStr}`)
        .set('Authorization', `Bearer ${salesToken}`);

      assert.strictEqual(res.status, 200);
      const d = res.body.data;
      assert.strictEqual(d.omzet, 500000);
      assert.strictEqual(d.kas_masuk, 400000);
      assert.strictEqual(d.barang_direfill, 12);
    });

    it('should return inventory scoped to logged-in salesId', async () => {
      const res = await request(app)
        .get('/api/v1/dashboard/sales/inventory')
        .set('Authorization', `Bearer ${salesToken}`);

      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.body.data.total_items, 1);
      assert.strictEqual(res.body.data.items[0].qty_available, 50);
    });
  });
});
