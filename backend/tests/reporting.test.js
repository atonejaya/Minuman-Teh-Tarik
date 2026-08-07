const request = require('supertest');
const assert = require('assert');
const app = require('../src/app');

describe('Reporting API Tests (Sprint 10.4)', () => {
  let token;
  const baseUrl = '/api/v1/reports';

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

  describe('GET /daily-sales', () => {
    it('should return daily sales report with summary and pagination', (done) => {
      request(app)
        .get(`${baseUrl}/daily-sales`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.success, true);
          assert.ok(Array.isArray(body.data));
          assert.ok(body.summary);
          assert.ok(body.pagination);
          assert.ok('total_invoice' in body.summary);
          assert.ok('total_sales' in body.summary);
          assert.ok('total_paid' in body.summary);
          assert.ok('outstanding' in body.summary);
          done();
        });
    });

    it('should support pagination and filtering', (done) => {
      request(app)
        .get(`${baseUrl}/daily-sales?page=1&limit=5&sort=date&order=desc`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.pagination.limit, 5);
          assert.strictEqual(body.pagination.page, 1);
          done();
        });
    });
  });

  describe('GET /customer-ledger', () => {
    it('should return customer ledger report with summary and pagination', (done) => {
      request(app)
        .get(`${baseUrl}/customer-ledger`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.success, true);
          assert.ok(Array.isArray(body.data));
          assert.ok(body.summary);
          assert.ok('total_ar' in body.summary);
          assert.ok('credit_note' in body.summary);
          assert.ok('outstanding' in body.summary);
          done();
        });
    });

    it('should filter outstanding_only properly', (done) => {
      request(app)
        .get(`${baseUrl}/customer-ledger?outstanding_only=true`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          assert.strictEqual(res.body.success, true);
          res.body.data.forEach(row => {
            assert.ok(row.outstanding > 0);
          });
          done();
        });
    });
  });

  describe('GET /product-sales', () => {
    it('should return product sales report with summary and pagination', (done) => {
      request(app)
        .get(`${baseUrl}/product-sales`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.success, true);
          assert.ok(Array.isArray(body.data));
          assert.ok(body.summary);
          assert.ok('qty_sold' in body.summary);
          assert.ok('revenue' in body.summary);
          assert.ok('average_price' in body.summary);
          done();
        });
    });
  });

  describe('GET /sales-performance', () => {
    it('should return sales performance report with summary and pagination', (done) => {
      request(app)
        .get(`${baseUrl}/sales-performance`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .end((err, res) => {
          if (err) return done(err);
          const body = res.body;
          assert.strictEqual(body.success, true);
          assert.ok(Array.isArray(body.data));
          assert.ok(body.summary);
          assert.ok('invoice_count' in body.summary);
          assert.ok('revenue' in body.summary);
          assert.ok('collection' in body.summary);
          assert.ok('outstanding' in body.summary);
          done();
        });
    });
  });

  describe('Authorization', () => {
    it('should reject requests without token', (done) => {
      request(app)
        .get(`${baseUrl}/daily-sales`)
        .expect(401, done);
    });
  });

  describe('Validation', () => {
    it('should reject invalid query params', (done) => {
      request(app)
        .get(`${baseUrl}/daily-sales?page=-1`)
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
