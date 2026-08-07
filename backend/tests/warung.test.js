const assert = require('assert');
const prisma = require('../src/config/database');

const app = require('../src/app');

const PORT = 3001; // use different port from product test if running concurrently, but they run sequentially usually. Let's use 3002.
const baseUrl = `http://localhost:3002/api/v1`;
let ownerToken = '';
let salesToken = '';
let server;
const uniqueCode1 = `TEST-WRG-1-${Date.now()}`;
const uniqueCode2 = `TEST-WRG-2-${Date.now()}`;
const uniqueCodeForbidden = `TEST-WRG-F-${Date.now()}`;
const randomVisitOrder = Math.floor(Math.random() * 10000) + 100;

describe('Warung Management Integration Tests', function () {
  this.timeout(15000); // Allow time for DB connections

  before((done) => {
    server = app.listen(3002, async () => {
      try {
        // Authenticate OWNER
    const ownerRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'owner', password: 'admin123' }) // Seeded password is admin123
    });
    const ownerData = await ownerRes.json();
    ownerToken = ownerData.data.token;

    // Authenticate SALES
    const salesRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'andi', password: 'sales123' })
    });
    const salesData = await salesRes.json();
    salesToken = salesData.data.token;

        // Get sales ID for later
        const andi = await prisma.user.findUnique({ where: { username: 'andi' } });
        salesId = andi.id;
        done();
      } catch (err) {
        done(err);
      }
    });
  });

  after(async () => {
    if (server) {
      server.close();
    }
    await prisma.$disconnect();
  });

  it('should create a new warung (OWNER)', async () => {
    console.log('ownerToken:', ownerToken);
    const res = await fetch(`${baseUrl}/warungs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        code: uniqueCode1,
        name: `Test Warung ${uniqueCode1}`,
        owner_name: 'Bapak Test',
        phone: '081111111111',
        address: 'Jl. Test No. 1',
        latitude: -6.1234567,
        longitude: 106.1234567,
        visit_day: 'MONDAY',
        visit_order: randomVisitOrder,
        target_cups: 20,
        status: 'ACTIVE',
        assigned_sales_id: salesId
      })
    });
    const result = await res.json();
    if (res.status !== 201) console.log('POST warung failed:', result);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.code, uniqueCode1);
    assert.strictEqual(result.data.status, 'ACTIVE');
    createdWarungId = result.data.id;
  });

  it('should reject duplicate warung code', async () => {
    const res = await fetch(`${baseUrl}/warungs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        code: uniqueCode1,
        name: `Test Warung 2 ${uniqueCode1}`,
        owner_name: 'Bapak Test 2',
        latitude: 0,
        longitude: 0,
      })
    });
    const result = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(result.success, false);
    assert.match(result.message, /already exists/);
  });

  it('should reject overlapping visit order for same sales on same day', async () => {
    const res = await fetch(`${baseUrl}/warungs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        code: uniqueCode2,
        name: `Test Warung Overlap ${uniqueCode2}`,
        owner_name: 'Bapak Test',
        latitude: 0,
        longitude: 0,
        visit_day: 'MONDAY',
        visit_order: randomVisitOrder, // Already taken by TEST-WRG-001
        assigned_sales_id: salesId
      })
    });
    const result = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(result.success, false);
    assert.match(result.message, /already taken/);
  });

  it('should allow SALES to fetch warungs list', async () => {
    const res = await fetch(`${baseUrl}/warungs`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const result = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(result.success, true);
    assert.ok(Array.isArray(result.data));
    assert.ok(result.meta);
  });

  it('should return 403 when SALES tries to create warung', async () => {
    const res = await fetch(`${baseUrl}/warungs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${salesToken}`
      },
      body: JSON.stringify({
        code: uniqueCodeForbidden,
        name: `Test Warung Forbidden ${uniqueCodeForbidden}`,
        owner_name: 'Bapak Forbidden',
        latitude: 0,
        longitude: 0
      })
    });
    assert.strictEqual(res.status, 403);
  });

  it('should fetch today route for SALES', async () => {
    const res = await fetch(`${baseUrl}/warungs/today`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const result = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(result.success, true);
    assert.ok(Array.isArray(result.data));
    if (result.data.length > 0) {
      assert.ok(result.data[0].code);
      assert.ok(result.data[0].visit_order);
    }
  });

  it('should fetch specific route for OWNER', async () => {
    const res = await fetch(`${baseUrl}/warungs/route?day=MONDAY&sales_id=${salesId}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const result = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(result.success, true);
    assert.ok(Array.isArray(result.data));
  });

  it('should update warung details (OWNER)', async () => {
    const res = await fetch(`${baseUrl}/warungs/${createdWarungId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ownerToken}`
      },
      body: JSON.stringify({
        target_cups: 50,
        address: 'Jl. Updated No 1'
      })
    });
    const result = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(result.data.target_cups, 50);
    assert.strictEqual(result.data.address, 'Jl. Updated No 1');
  });

  it('should soft delete warung (OWNER)', async () => {
    const res = await fetch(`${baseUrl}/warungs/${createdWarungId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const result = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(result.success, true);
  });

  it('should not find deleted warung in list by default', async () => {
    const res = await fetch(`${baseUrl}/warungs?search=${uniqueCode1}`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const result = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(result.data.length, 0);
  });

  it('should restore soft deleted warung (OWNER)', async () => {
    const res = await fetch(`${baseUrl}/warungs/${createdWarungId}/restore`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const result = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.data.status, 'ACTIVE');
  });
});
