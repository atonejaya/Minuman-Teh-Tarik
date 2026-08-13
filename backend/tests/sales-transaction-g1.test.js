const assert = require('assert');
const app = require('../src/app');
const prisma = require('../src/config/database');
const bcrypt = require('bcrypt');

const baseUrl = '/api/v1';

describe('G1 - SalesTransaction Snapshot Contract', function () {
  this.timeout(15000);
  let server;
  let salesToken;
  let otherSalesToken;
  let salesUser;
  let otherSalesUser;
  let warung;
  let inactiveWarung;
  let product;
  let batch;
  let visit;
  let createdId;

  before(async () => {
    server = app.listen(0);
    const port = server.address().port;

    salesUser = await prisma.user.create({
      data: { username: 'g1_sales_tx', password_hash: await bcrypt.hash('password123', 10), name: 'G1 Sales Person', role: 'SALES', phone: '081234599001', is_active: true }
    });
    otherSalesUser = await prisma.user.create({
      data: { username: 'g1_sales_other', password_hash: await bcrypt.hash('password123', 10), name: 'G1 Other Sales', role: 'SALES', phone: '081234599002', is_active: true }
    });

    const login = async (username) => {
      const res = await fetch(`http://localhost:${port}${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password: 'password123' })
      });
      return (await res.json()).data.token;
    };
    salesToken = await login('g1_sales_tx');
    otherSalesToken = await login('g1_sales_other');

    warung = await prisma.warung.create({
      data: { code: 'WRG-G1-001', name: 'Warung G1 Snapshot', owner_name: 'Bapak G1', latitude: -6.2, longitude: 106.8, status: 'ACTIVE', assigned_sales_id: salesUser.id }
    });
    inactiveWarung = await prisma.warung.create({
      data: { code: 'WRG-G1-002', name: 'Warung G1 Inactive', owner_name: 'Bapak G1B', latitude: -6.3, longitude: 106.9, status: 'INACTIVE', assigned_sales_id: salesUser.id }
    });

    product = await prisma.product.create({
      data: {
        code: 'PRD-G1-001',
        name: 'Produk G1',
        category: { connectOrCreate: { where: { code: 'CAT-G1-001' }, create: { code: 'CAT-G1-001', name: 'MINUMAN' } } },
        unit: { connectOrCreate: { where: { code: 'UNT-G1-001' }, create: { code: 'UNT-G1-001', name: 'PCS', symbol: 'pcs' } } },
        cost_price: 1000,
        shelf_life_days: 30,
        is_active: true,
        brand: { connectOrCreate: { where: { code: 'BRD-G1-001' }, create: { code: 'BRD-G1-001', name: 'Brand G1' } } },
        packaging: { connectOrCreate: { where: { code: 'PKG-G1-001' }, create: { code: 'PKG-G1-001', name: 'Bottle' } } }
      }
    });

    batch = await prisma.productBatch.create({
      data: { product_id: product.id, batch_number: 'BATCH-G1-001', production_date: new Date(), expired_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) }
    });

    await prisma.mobileStock.create({
      data: { sales_id: salesUser.id, product_id: product.id, batch_id: batch.id, qty_available: 100, version: 1 }
    });

    visit = await prisma.visit.create({
      data: { code: 'VST-G1-001', sales_id: salesUser.id, warung_id: warung.id, status: 'SELLING', visit_date: new Date() }
    });
  });

  after(async () => {
    if (salesUser) {
      await prisma.inventoryMovement.deleteMany({ where: { created_by: salesUser.id } });
      if (createdId) await prisma.outboxEvent.deleteMany({ where: { aggregate_id: String(createdId) } });
      await prisma.salesTransactionItem.deleteMany({ where: { sales_transaction: { sales_id: salesUser.id } } });
      await prisma.salesTransaction.deleteMany({ where: { sales_id: salesUser.id } });
      await prisma.visit.deleteMany({ where: { sales_id: salesUser.id } });
      await prisma.mobileStock.deleteMany({ where: { sales_id: salesUser.id } });
    }
    if (inactiveWarung) await prisma.warung.deleteMany({ where: { id: inactiveWarung.id } });
    if (warung) await prisma.warung.deleteMany({ where: { id: warung.id } });
    if (batch) await prisma.productBatch.deleteMany({ where: { id: batch.id } });
    if (product) await prisma.product.deleteMany({ where: { id: product.id } });
    await prisma.auditLog.deleteMany({ where: { user_id: { in: [salesUser?.id, otherSalesUser?.id].filter(Boolean) } } });
    if (salesUser) await prisma.user.deleteMany({ where: { id: salesUser.id } });
    if (otherSalesUser) await prisma.user.deleteMany({ where: { id: otherSalesUser.id } });
    if (server) server.close();
  });

  const createTransaction = async (token, visitId, warungStatusExpected) => {
    return fetch(`http://localhost:${server.address().port}${baseUrl}/sales-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        visit_id: visitId,
        payment_method: 'CASH',
        items: [{ product_id: product.id, qty: 5, discount: 0 }]
      })
    });
  };

  it('creates DRAFT with snapshot fields correctly persisted (header + item)', async () => {
    const res = await createTransaction(salesToken, visit.id);
    const body = await res.json();
    if (res.status !== 201) console.error(body);
    assert.strictEqual(res.status, 201);
    assert.strictEqual(body.data.status, 'DRAFT');
    assert.strictEqual(body.data.customer_name, 'Warung G1 Snapshot');
    assert.strictEqual(body.data.customer_code, 'WRG-G1-001');
    assert.strictEqual(body.data.salesman_name, 'G1 Sales Person');

    const persisted = await prisma.salesTransaction.findUnique({
      where: { id: body.data.id },
      include: { items: true }
    });
    assert.strictEqual(persisted.customer_name, 'Warung G1 Snapshot');
    assert.strictEqual(persisted.customer_code, 'WRG-G1-001');
    assert.strictEqual(persisted.salesman_name, 'G1 Sales Person');
    assert.strictEqual(persisted.items[0].category_name, 'MINUMAN');
    assert.strictEqual(persisted.items[0].product_name, 'Produk G1');

    createdId = body.data.id;
  });

  it('rejects creation for visit not in SELLING status', async () => {
    const badVisit = await prisma.visit.create({
      data: { code: 'VST-G1-002', sales_id: salesUser.id, warung_id: warung.id, status: 'CHECKED_IN', visit_date: new Date(Date.now() + 24 * 60 * 60 * 1000) }
    });
    const res = await createTransaction(salesToken, badVisit.id);
    const body = await res.json();
    if (res.status !== 409) console.error(body);
    assert.strictEqual(res.status, 409);
    assert.strictEqual(body.code, 'INVALID_VISIT_STATUS');
    await prisma.visit.deleteMany({ where: { id: badVisit.id } });
  });

  it('rejects creation for inactive warung', async () => {
    const badVisit = await prisma.visit.create({
      data: { code: 'VST-G1-003', sales_id: salesUser.id, warung_id: inactiveWarung.id, status: 'SELLING', visit_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) }
    });
    const res = await createTransaction(salesToken, badVisit.id);
    const body = await res.json();
    if (res.status !== 409) console.error(body);
    assert.strictEqual(res.status, 409);
    assert.strictEqual(body.code, 'WARUNG_INACTIVE');
    await prisma.visit.deleteMany({ where: { id: badVisit.id } });
  });

  it('existing behavior preserved: DRAFT can be retrieved and cancelled', async () => {
    const getRes = await fetch(`http://localhost:${server.address().port}${baseUrl}/sales-transactions/${createdId}`, {
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const getBody = await getRes.json();
    if (getRes.status !== 200) console.error(getBody);
    assert.strictEqual(getRes.status, 200);
    assert.strictEqual(getBody.data.id, createdId);
    assert.strictEqual(getBody.data.customer_name, 'Warung G1 Snapshot');

    const cancelRes = await fetch(`http://localhost:${server.address().port}${baseUrl}/sales-transactions/${createdId}/cancel`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const cancelBody = await cancelRes.json();
    if (cancelRes.status !== 200) console.error(cancelBody);
    assert.strictEqual(cancelRes.status, 200);
    assert.strictEqual(cancelBody.data.status, 'CANCELLED');
  });

  it('another SALES cannot confirm someone elses transaction (IDOR preserved)', async () => {
    const createRes = await createTransaction(salesToken, visit.id);
    const created2 = (await createRes.json()).data.id;

    const res = await fetch(`http://localhost:${server.address().port}${baseUrl}/sales-transactions/${created2}/confirm`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${otherSalesToken}` }
    });
    const body = await res.json();
    if (res.status !== 409) console.error(body);
    assert.strictEqual(res.status, 409);
    assert.strictEqual(body.code, 'UNAUTHORIZED');
  });
});
