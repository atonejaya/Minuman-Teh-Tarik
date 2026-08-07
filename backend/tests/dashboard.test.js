const request = require('supertest');
const assert = require('assert');
const app = require('../src/app');

describe('Dashboard API Tests (Sprint 10.5)', () => {
  let token;
  const baseUrl = '/api/v1/dashboard';

  before((done) => {
    request(app)
      .post('/api/v1/auth/login')
      .send({ username: 'owner', password: 'admin123' })
      .end((err, res) => {
        if (err) return done(err);
        token = res.body.data.token;
        done();
      });
  });

  describe('GET /dashboard', () => {
    it('should return dashboard summary', (done) => {
      request(app)
        .get(`${baseUrl}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.success, true);
          assert.ok(body.data);
          assert.ok('omzet_hari_ini' in body.data);
          assert.ok('omzet_bulan_berjalan' in body.data);
          assert.ok('total_invoice_hari_ini' in body.data);
          assert.ok('total_piutang' in body.data);
          done();
        });
    });

    it('should return cached response on subsequent calls', (done) => {
      request(app)
        .get(`${baseUrl}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          assert.strictEqual(res.body.success, true);
          done();
        });
    });
  });

  describe('GET /dashboard/sales', () => {
    it('should return sales analytics', (done) => {
      request(app)
        .get(`${baseUrl}/sales`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.success, true);
          assert.ok(Array.isArray(body.data.daily_sales_trend));
          assert.ok(Array.isArray(body.data.invoice_trend));
          assert.ok('average_transaction_value' in body.data);
          done();
        });
    });
  });

  describe('GET /dashboard/products', () => {
    it('should return product analytics', (done) => {
      request(app)
        .get(`${baseUrl}/products`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.success, true);
          assert.ok(Array.isArray(body.data.top_10_product));
          assert.ok('qty_sold' in body.data);
          done();
        });
    });
  });

  describe('GET /dashboard/customers', () => {
    it('should return customer analytics', (done) => {
      request(app)
        .get(`${baseUrl}/customers`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.success, true);
          assert.ok(Array.isArray(body.data.top_customer));
          assert.ok('active_customer' in body.data);
          done();
        });
    });
  });

  describe('GET /dashboard/receivables', () => {
    it('should return receivable analytics', (done) => {
      request(app)
        .get(`${baseUrl}/receivables`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.success, true);
          assert.ok('total_outstanding' in body.data);
          assert.ok('collection_rate' in body.data);
          done();
        });
    });
  });

  describe('Authorization & Validation', () => {
    it('should reject requests without token', (done) => {
      request(app)
        .get(`${baseUrl}`)
        .expect(401, done);
    });

    it('should validate query parameters', (done) => {
      request(app)
        .get(`${baseUrl}/sales?period=invalid`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400)
        .end((err, res) => {
          if (err) return done(err);
          assert.strictEqual(res.body.code, 'VALIDATION_ERROR');
          done();
        });
    });
  });
});
