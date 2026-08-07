const assert = require('assert');
const app = require('../src/app');

describe('Product Management Integration Tests', () => {
  let server;
  let PORT = 3003;
  const baseUrl = `http://localhost:${PORT}/api/v1`;
  let token = '';
  let salesToken = '';
  let createdProductId = null;
  const uniqueCode = `PRD-${Date.now()}`;

  before(async function() {
    this.timeout(10000);
    return new Promise((resolve, reject) => {
      server = app.listen(PORT, async () => {
        try {
          let res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'owner', password: 'admin123' })
          });
          let data = await res.json();
          if (data.success && data.data && data.data.token) {
            token = data.data.token;
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    });
  });

  after(() => {
    if (server) server.close();
  });

  it('should create a new product', async () => {
    const payload = {
      code: uniqueCode,
      name: `Test Drink ${Date.now()}`,
      category: 'MINUMAN',
      unit: 'pcs',
      cost_price: 3000,
      selling_price: 5000,
      shelf_life: 30,
      display_order: 1,
      description: 'Test description'
    };

    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.success, true);
    assert.ok(body.request_id);
    assert.ok(body.data.id);
    createdProductId = body.data.id;
  });

  it('should prevent duplicate product code', async () => {
    const payload = {
      code: uniqueCode, // duplicate
      name: `Another Drink`,
      category: 'MINUMAN',
      unit: 'pcs',
      cost_price: 3000,
      selling_price: 5000,
      shelf_life: 30
    };

    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    assert.strictEqual(res.status, 400);
    assert.strictEqual(body.success, false);
    assert.match(body.message, /already exists/);
  });

  it('should reject selling_price lower than cost_price', async () => {
    const payload = {
      code: `FAIL-${Date.now()}`,
      name: `Fail Drink`,
      category: 'MINUMAN',
      unit: 'pcs',
      cost_price: 6000,
      selling_price: 5000, // lower
      shelf_life: 30
    };

    const res = await fetch(`${baseUrl}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const body = await res.json();
    assert.strictEqual(res.status, 400); // Bad request or Validation error
    assert.strictEqual(body.success, false);
  });

  it('should list products with pagination and meta', async () => {
    const res = await fetch(`${baseUrl}/products?page=1&limit=5`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.success, true);
    assert.ok(Array.isArray(body.data));
    assert.ok(body.meta);
    assert.strictEqual(body.meta.page, 1);
  });

  it('should retrieve active products only via /active', async () => {
    const res = await fetch(`${baseUrl}/products/active`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    body.data.forEach(p => {
      assert.strictEqual(p.is_active, true);
    });
  });

  it('should soft delete product', async () => {
    const res = await fetch(`${baseUrl}/products/${createdProductId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.is_active, false);
  });

  it('should restore soft deleted product', async () => {
    const res = await fetch(`${baseUrl}/products/${createdProductId}/restore`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.is_active, true);
  });
});
