const request = require('supertest');
const { expect } = require('chai');
const app = require('../src/app');
const prisma = require('../src/config/database');

describe('Customer Master Data API', () => {
  let token;
  let testSales;
  let testSales2;
  let testCategory;
  let testRegional;
  let testArea;
  let testRoute;
  let customerId;

  before(async () => {
    // Cleanup any left-over data
    await prisma.customerSalesHistory.deleteMany();
    await prisma.warung.deleteMany({ where: { name: { contains: 'Test Customer API' } } });
    await prisma.route.deleteMany({ where: { name: 'Test Route' } });
    await prisma.area.deleteMany({ where: { name: 'Test Area' } });
    await prisma.regional.deleteMany({ where: { name: 'Test Regional' } });
    await prisma.customerCategory.deleteMany({ where: { name: 'Test Category' } });
    const testUsers = await prisma.user.findMany({ where: { username: { in: ['sales_test_cust', 'sales_test_cust2', 'admin_test_cust'] } } });
    const userIds = testUsers.map(u => u.id);
    await prisma.auditLog.deleteMany({ where: { user_id: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });

    // Setup test data
    testSales = await prisma.user.create({
      data: {
        username: 'sales_test_cust',
        password_hash: 'hashed',
        name: 'Test Sales Cust',
        role: 'SALES',
        is_active: true
      }
    });

    testSales2 = await prisma.user.create({
      data: {
        username: 'sales_test_cust2',
        password_hash: 'hashed',
        name: 'Test Sales Cust 2',
        role: 'SALES',
        is_active: true
      }
    });

    // Create admin token for auth
    const admin = await prisma.user.create({
      data: {
        username: 'admin_test_cust',
        password_hash: 'hashed',
        name: 'Test Admin Cust',
        role: 'OWNER',
        is_active: true
      }
    });
    const jwt = require('jsonwebtoken');
    const jwtConfig = require('../src/config/jwt');
    token = jwt.sign({ sub: admin.id, role: admin.role }, jwtConfig.SECRET);

    testCategory = await prisma.customerCategory.create({
      data: { code: 'CAT_TEST', name: 'Test Category' }
    });

    testRegional = await prisma.regional.create({
      data: { code: 'REG_TEST', name: 'Test Regional' }
    });

    testArea = await prisma.area.create({
      data: { code: 'AREA_TEST', name: 'Test Area', regional_id: testRegional.id }
    });

    testRoute = await prisma.route.create({
      data: { code: 'ROUTE_TEST', name: 'Test Route', area_id: testArea.id }
    });
  });

  after(async () => {
    try {
      await prisma.customerSalesHistory.deleteMany({ where: { customer_id: customerId } });
      await prisma.warung.deleteMany({ where: { id: customerId } });
      await prisma.route.deleteMany({ where: { id: testRoute?.id } });
      await prisma.area.deleteMany({ where: { id: testArea?.id } });
      await prisma.regional.deleteMany({ where: { id: testRegional?.id } });
      await prisma.customerCategory.deleteMany({ where: { id: testCategory?.id } });
      
      const testUsers = await prisma.user.findMany({ where: { username: { in: ['sales_test_cust', 'sales_test_cust2', 'admin_test_cust'] } } });
      const userIds = testUsers.map(u => u.id);
      await prisma.auditLog.deleteMany({ where: { user_id: { in: userIds } } });
      await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  });

  it('should create a customer with auto-generated code', async () => {
    const res = await request(app)
      .post('/api/v1/master/customers')
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: 'Test Customer API 1',
        owner_name: 'Test Owner',
        visit_day: 'MONDAY',
        latitude: -6.2,
        longitude: 106.8,
        assigned_sales_id: testSales.id,
        category_id: testCategory.id,
        area_id: testArea.id,
        route_id: testRoute.id
      });
    
    if (res.status !== 201) console.log(res.body);
    expect(res.status).to.equal(201);
    expect(res.body.success).to.be.true;
    expect(res.body.data.code).to.match(/^WRG-\d{6}$/);
    expect(res.body.data.name).to.equal('Test Customer API 1');
    customerId = res.body.data.id;
  });

  it('should get customer by id with relations', async () => {
    const res = await request(app)
      .get(`/api/v1/master/customers/${customerId}`)
      .set('Authorization', 'Bearer ' + token);
    
    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.data.area).to.exist;
    expect(res.body.data.route).to.exist;
    expect(res.body.data.category).to.exist;
  });

  it('should transfer sales and create history record', async () => {
    const res = await request(app)
      .put(`/api/v1/master/customers/${customerId}`)
      .set('Authorization', 'Bearer ' + token)
      .send({
        name: 'Test Customer API 1 Updated',
        owner_name: 'Test Owner',
        latitude: -6.2,
        longitude: 106.8,
        assigned_sales_id: testSales2.id,
        transfer_reason: 'Testing transfer'
      });
    
    if (res.status !== 200) console.log(res.body);
    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.data.assigned_sales_id).to.equal(testSales2.id);

    // Verify history
    const history = await prisma.customerSalesHistory.findFirst({
      where: { customer_id: customerId }
    });
    expect(history).to.exist;
    expect(history.old_sales_id).to.equal(testSales.id);
    expect(history.new_sales_id).to.equal(testSales2.id);
    expect(history.reason).to.equal('Testing transfer');
  });
  
  it('should search customers', async () => {
    const res = await request(app)
      .get(`/api/v1/master/customers/search?search=Test Customer API`)
      .set('Authorization', 'Bearer ' + token);
    
    expect(res.status).to.equal(200);
    expect(res.body.success).to.be.true;
    expect(res.body.data).to.be.an('array');
    expect(res.body.data.length).to.be.greaterThan(0);
  });

  it('should prevent transfer if outstanding > 0 unless overridden by OWNER', async () => {
    // 1. Create a dummy ledger entry with outstanding > 0
    await prisma.customerLedgerSummary.create({
      data: {
        customer_id: customerId,
        receivable: 500000
      }
    });

    // 2. Try to transfer without override, should fail
    let res = await request(app)
      .put(`/api/v1/master/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({
        assigned_sales_id: testSales.id
      });
    expect(res.status).to.equal(400);
    expect(res.body.message).to.contain('unless override is true');

    // 3. Try to transfer with override but as a normal user (SALES role)
    const salesToken = require('jsonwebtoken').sign({ sub: testSales.id, role: testSales.role }, require('../src/config/jwt').SECRET);
    res = await request(app)
      .put(`/api/v1/master/customers/${customerId}`)
      .set('Authorization', `Bearer ${salesToken}`)
      .send({
        assigned_sales_id: testSales.id,
        override_transfer_restriction: true
      });
    expect(res.status).to.equal(400);
    expect(res.body.message).to.contain('Only Supervisor/OWNER can override');

    // 4. Transfer with override as OWNER, should succeed
    res = await request(app)
      .put(`/api/v1/master/customers/${customerId}`)
      .set('Authorization', `Bearer ${token}`) // OWNER token
      .send({
        assigned_sales_id: testSales.id,
        override_transfer_restriction: true,
        transfer_reason: 'Supervisor override'
      });
    expect(res.status).to.equal(200);
    expect(res.body.data.assigned_sales_id).to.equal(testSales.id);

    // Cleanup ledger
    await prisma.customerLedgerSummary.delete({ where: { customer_id: customerId } });
  });
});
