const assert = require('assert');
const app = require('../src/app');
const prisma = require('../src/config/database');

const baseUrl = '/api/v1';

describe('Sales Transaction Integration Tests', function() {
  this.timeout(15000);
  let salesToken;
  let salesUser;
  let warung;
  let product;
  let batch;
  let visit;
  let adminToken;
  let server;
  let createdTransactionId;

  before(async () => {
    server = app.listen(0);

    const bcrypt = require('bcrypt');
    salesUser = await prisma.user.create({
      data: { username: 'sales_tx_tester', password_hash: await bcrypt.hash('password123', 10), name: 'Sales Tx Tester', role: 'SALES', phone: '081234500000', is_active: true }
    });
    
    const adminUser = await prisma.user.create({
      data: { username: 'admin_tx_tester', password_hash: await bcrypt.hash('password123', 10), name: 'Admin Tx Tester', role: 'OWNER', phone: '081234500001', is_active: true }
    });

    const resSales = await fetch(`http://localhost:${server.address().port}${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sales_tx_tester', password: 'password123' })
    });
    salesToken = (await resSales.json()).data.token;

    const resAdmin = await fetch(`http://localhost:${server.address().port}${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'admin_tx_tester', password: 'password123' })
    });
    adminToken = (await resAdmin.json()).data.token;

    warung = await prisma.warung.create({
      data: { code: 'WRG-TX-001', name: 'Warung TX', owner_name: 'Bapak TX', latitude: -6.123, longitude: 106.123, status: 'ACTIVE', assigned_sales_id: salesUser.id }
    });

    product = await prisma.product.create({
      data: { code: 'PRD-TX-001', name: 'Product TX', category: 'MINUMAN', unit: 'PCS', cost_price: 3000, selling_price: 5000, shelf_life: 30, is_active: true }
    });

    batch = await prisma.productBatch.create({
      data: { product_id: product.id, batch_number: 'BATCH-TX-001', production_date: new Date(), expired_at: new Date(new Date().getTime() + 30 * 24 * 60 * 60 * 1000) }
    });

    await prisma.mobileStock.create({
      data: { sales_id: salesUser.id, product_id: product.id, batch_id: batch.id, qty_available: 100, version: 1 }
    });

    visit = await prisma.visit.create({
      data: { code: 'VST-TX-001', sales_id: salesUser.id, warung_id: warung.id, status: 'SELLING', visit_date: new Date() }
    });
  });

  after(async () => {
    // Cleanup safely
    if (salesUser) {
      await prisma.inventoryMovement.deleteMany({ where: { created_by: salesUser.id } });
      await prisma.salesTransactionItem.deleteMany({ where: { sales_transaction: { sales_id: salesUser.id } } });
      await prisma.salesTransaction.deleteMany({ where: { sales_id: salesUser.id } });
      await prisma.visit.deleteMany({ where: { sales_id: salesUser.id } });
      await prisma.mobileStock.deleteMany({ where: { sales_id: salesUser.id } });
      if (warung) await prisma.warung.deleteMany({ where: { id: warung.id } });
    }
    if (batch) await prisma.productBatch.deleteMany({ where: { id: batch.id } });
    if (product) await prisma.product.deleteMany({ where: { id: product.id } });
    
    if (salesUser || adminToken) {
      await prisma.auditLog.deleteMany({ where: { user_id: { in: [salesUser?.id].filter(Boolean) } } });
      await prisma.auditLog.deleteMany({ where: { user: { username: 'admin_tx_tester' } } });
    }
    
    if (salesUser) await prisma.user.deleteMany({ where: { id: salesUser.id } });
    if (adminToken) await prisma.user.deleteMany({ where: { username: 'admin_tx_tester' } });
    if (server) server.close();
  });

  it('1. POST /api/v1/sales-transactions - Should create DRAFT transaction', async () => {
    const payload = {
      visit_id: visit.id,
      payment_method: 'CASH',
      transaction_discount: 1000,
      tax: 0,
      items: [
        { product_id: product.id, qty: 10, discount: 500 }
      ]
    };

    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/sales-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` },
      body: JSON.stringify(payload)
    });
    
    const body = await res.json();
    if (res.status !== 201) console.error(body);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'DRAFT');
    assert.strictEqual(body.data.payment_status, 'UNPAID');
    assert.strictEqual(body.data.subtotal, '50000'); // 10 * 5000
    assert.strictEqual(body.data.item_discount, '500'); 
    assert.strictEqual(body.data.transaction_discount, '1000');
    assert.strictEqual(body.data.grand_total, '48500'); // 50000 - 500 - 1000 + 0

    const item = body.data.items[0];
    assert.strictEqual(item.selling_price, '5000');
    assert.strictEqual(item.product_name, 'Product TX');
    assert.strictEqual(item.batch_number, null);

    createdTransactionId = body.data.id;
  });

  it('2. POST /api/v1/sales-transactions/:id/confirm - Should confirm and reduce MobileStock FEFO', async () => {
    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/sales-transactions/${createdTransactionId}/confirm`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });

    const body = await res.json();
    if (res.status !== 200) console.error(body);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.strictEqual(body.data.status, 'CONFIRMED');

    const item = body.data.items[0];
    assert.strictEqual(item.batch_number, 'BATCH-TX-001');

    const mStock = await prisma.mobileStock.findFirst({
      where: { sales_id: salesUser.id, product_id: product.id }
    });
    assert.strictEqual(mStock.qty_available, 90);

    const movement = await prisma.inventoryMovement.findFirst({
      where: { reference_document: body.data.code, reference_type: 'SALE' }
    });
    assert.notStrictEqual(movement, null);
    assert.strictEqual(movement.movement_type, 'SALE');
    assert.strictEqual(movement.source_type, 'SALES');
    assert.strictEqual(movement.destination_type, 'CUSTOMER');
    assert.strictEqual(movement.qty_change, -10);
    assert.strictEqual(movement.qty_after, 90);
  });
});
