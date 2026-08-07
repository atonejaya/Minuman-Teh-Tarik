const assert = require('assert');
const app = require('../src/app');
const prisma = require('../src/config/database');

const baseUrl = '/api/v1';

describe('Load Management Integration Tests', function() {
  this.timeout(15000); // Set timeout for all hooks and tests in this block
  let ownerToken, salesToken, salesId;
  let server;
  let product1, product2;
  let warehouse, batch1, batch2;
  let loadId;

  before(async function() {
    this.timeout(20000);
    // Clear data
    await prisma.inventoryMovement.deleteMany({});
    await prisma.mobileStock.deleteMany({});
    await prisma.warehouseStock.deleteMany({});
    await prisma.loadItem.deleteMany({});
    await prisma.load.deleteMany({});
    await prisma.visit.deleteMany({});
    await prisma.warung.deleteMany({});
    await prisma.productBatch.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.warehouse.deleteMany({});
    await prisma.refreshToken.deleteMany({});
    await prisma.user.deleteMany({});

    server = app.listen(0);

    // Create OWNER
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('password123', 10);
    const owner = await prisma.user.create({
      data: { username: 'owner_load', password_hash: hash, name: 'Owner Load', role: 'OWNER' }
    });

    // Create SALES
    const sales = await prisma.user.create({
      data: { username: 'sales_load', password_hash: hash, name: 'Sales Load', role: 'SALES' }
    });
    salesId = sales.id;

    // Login OWNER
    const resOwner = await fetch(`http://localhost:${server.address().port}${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner_load', password: 'password123' })
    });
    const bodyOwner = await resOwner.json();
    ownerToken = bodyOwner.data.token;

    // Login SALES
    const resSales = await fetch(`http://localhost:${server.address().port}${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'sales_load', password: 'password123' })
    });
    const bodySales = await resSales.json();
    salesToken = bodySales.data.token;

    // Create Warehouse
    warehouse = await prisma.warehouse.create({
      data: { code: 'WH-TEST', name: 'Gudang Test', address: 'Jl. Test' }
    });

    // Create Products
    product1 = await prisma.product.create({
      data: { code: 'P01', name: 'Product A', category: 'MINUMAN', unit: 'PCS', cost_price: 1000, selling_price: 2000, shelf_life: 7 }
    });
    product2 = await prisma.product.create({
      data: { code: 'P02', name: 'Product B', category: 'MINUMAN', unit: 'PCS', cost_price: 1500, selling_price: 2500, shelf_life: 7 }
    });

    // Create Batches
    batch1 = await prisma.productBatch.create({
      data: { product_id: product1.id, batch_number: 'BCH-P01-1', production_date: new Date(), expired_at: new Date(Date.now() + 86400000 * 30) }
    });
    batch2 = await prisma.productBatch.create({
      data: { product_id: product2.id, batch_number: 'BCH-P02-1', production_date: new Date(), expired_at: new Date(Date.now() + 86400000 * 30) }
    });

    // Create Warehouse Stock
    await prisma.warehouseStock.create({
      data: { warehouse_id: warehouse.id, product_id: product1.id, batch_id: batch1.id, qty_available: 50 }
    });
    await prisma.warehouseStock.create({
      data: { warehouse_id: warehouse.id, product_id: product2.id, batch_id: batch2.id, qty_available: 50 }
    });
  });

  after(async () => {
    if (server) {
      server.close();
    }
  });

  it('should reject create load for non-OWNER (Authorization)', async () => {
    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/loads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` },
      body: JSON.stringify({
        warehouse_id: warehouse.id,
        sales_id: salesId,
        load_date: '2026-08-01',
        items: [{ product_id: product1.id, batch_id: batch1.id, qty: 10 }]
      })
    });
    assert.strictEqual(res.status, 403);
  });

  it('should allow create load (DRAFT) by OWNER', async () => {
    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/loads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
      body: JSON.stringify({
        warehouse_id: warehouse.id,
        sales_id: salesId,
        load_date: '2026-08-01',
        notes: 'Test load',
        items: [
          { product_id: product1.id, batch_id: batch1.id, qty: 10 },
          { product_id: product2.id, batch_id: batch2.id, qty: 5 }
        ]
      })
    });
    const body = await res.json();
    if (res.status !== 201) console.error(body);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.status, 'DRAFT');
    assert.strictEqual(body.data.items.length, 2);
    loadId = body.data.id;
  });

  it('should allow cancel draft load', async () => {
    // Create temporary load
    const tempLoadRes = await fetch(`http://localhost:${server.address().port}${baseUrl}/loads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
      body: JSON.stringify({ warehouse_id: warehouse.id, sales_id: salesId, load_date: '2026-08-01', items: [{ product_id: product1.id, batch_id: batch1.id, qty: 1 }] })
    });
    const tempLoadId = (await tempLoadRes.json()).data.id;

    // Cancel
    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/loads/${tempLoadId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 200);
    const body = await res.json();
    assert.strictEqual(body.data.status, 'CANCELLED');
  });

  it('should reject confirm load if insufficient warehouse stock', async () => {
    // Create load with qty 1000 (more than 50 available)
    const overLoadRes = await fetch(`http://localhost:${server.address().port}${baseUrl}/loads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
      body: JSON.stringify({ warehouse_id: warehouse.id, sales_id: salesId, load_date: '2026-08-01', items: [{ product_id: product1.id, batch_id: batch1.id, qty: 1000 }] })
    });
    const overLoadId = (await overLoadRes.json()).data.id;

    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/loads/${overLoadId}/confirm`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 409); // INSUFFICIENT_STOCK
  });

  it('should allow confirm load by OWNER & Record Ledger, Reduce WH Stock, Increase Mobile Stock', async () => {
    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/loads/${loadId}/confirm`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.status, 'CONFIRMED');

    // Verify WH Stock Decreased (50 - 10 = 40)
    const whStock = await prisma.warehouseStock.findFirst({ where: { product_id: product1.id } });
    assert.strictEqual(whStock.qty_available, 40);

    // Verify Mobile Stock Increased
    const mobileStock = await prisma.mobileStock.findFirst({ where: { product_id: product1.id } });
    assert.strictEqual(mobileStock.qty_available, 10);

    // Verify Inventory Movement Logged
    const movementOut = await prisma.inventoryMovement.findFirst({ where: { product_id: product1.id, movement_type: 'LOAD_OUT' } });
    assert.strictEqual(movementOut.movement_type, 'LOAD_OUT');
    assert.strictEqual(movementOut.qty_change, -10);
    assert.strictEqual(movementOut.source_type, 'WAREHOUSE');
    
    const movementIn = await prisma.inventoryMovement.findFirst({ where: { product_id: product1.id, movement_type: 'LOAD_IN' } });
    assert.strictEqual(movementIn.movement_type, 'LOAD_IN');
    assert.strictEqual(movementIn.qty_change, 10);
    assert.strictEqual(movementIn.destination_type, 'SALES');
  });

  it('should reject double confirm (Double Confirm)', async () => {
    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/loads/${loadId}/confirm`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 409); // ConflictError for INVALID_STATUS
  });

  it('should reject cancel confirmed load (Cancel Confirmed (Rejected))', async () => {
    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/loads/${loadId}/cancel`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    assert.strictEqual(res.status, 409); // ConflictError
  });

});
