/**
 * Sprint 11.3A — Production Readiness Test Suite
 *
 * Tests: /health, /ready, /version, request-id, security headers,
 *        body size limit, rate limit headers, error response shape.
 *
 * These tests validate infrastructure behaviour — not business logic.
 * All existing regression tests must remain green alongside these.
 */

const { expect } = require('chai');
const request = require('supertest');
const app = require('../src/app');

describe('Sprint 11.3A — Production Readiness', () => {
  let server;

  before((done) => {
    // Use a separate port to avoid conflict with integration tests
    server = app.listen(3099, done);
  });

  after((done) => {
    server.close(done);
  });

  // ─── GET /health ──────────────────────────────────────────────────────────

  describe('GET /health (liveness probe)', () => {
    it('returns 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).to.equal(200);
    });

    it('has required fields: status, version, environment, uptime, timestamp', async () => {
      const res = await request(app).get('/health');
      const body = res.body;
      expect(body).to.have.property('status', 'ok');
      expect(body).to.have.property('version').that.is.a('string');
      expect(body).to.have.property('environment').that.is.oneOf(['development', 'production', 'test']);
      expect(body).to.have.property('uptime').that.is.a('number');
      expect(body).to.have.property('timestamp').that.is.a('string');
    });

    it('does NOT include database field (liveness only — no DB query)', async () => {
      const res = await request(app).get('/health');
      // /health is pure liveness — database field belongs in /ready
      expect(res.body).to.not.have.property('database');
    });

    it('responds quickly (< 200ms) — no I/O blocking', async () => {
      const start = Date.now();
      await request(app).get('/health');
      const elapsed = Date.now() - start;
      expect(elapsed).to.be.lessThan(200);
    });
  });

  // ─── GET /ready ───────────────────────────────────────────────────────────

  describe('GET /ready (readiness probe)', () => {
    it('returns 200 or 503', async () => {
      const res = await request(app).get('/ready');
      expect([200, 503]).to.include(res.status);
    });

    it('returns status field', async () => {
      const res = await request(app).get('/ready');
      expect(res.body).to.have.property('status').that.is.oneOf(['ready', 'unavailable']);
    });

    it('returns database field', async () => {
      const res = await request(app).get('/ready');
      expect(res.body).to.have.property('database');
    });
  });

  // ─── GET /version ─────────────────────────────────────────────────────────

  describe('GET /version', () => {
    it('returns 200', async () => {
      const res = await request(app).get('/version');
      expect(res.status).to.equal(200);
    });

    it('has required fields: version, commit, buildDate, node, environment', async () => {
      const res = await request(app).get('/version');
      const body = res.body;
      expect(body).to.have.property('version').that.is.a('string');
      expect(body).to.have.property('commit').that.is.a('string');
      expect(body).to.have.property('buildDate').that.is.a('string');
      expect(body).to.have.property('node').that.is.a('string').and.matches(/^v\d+\./);
      expect(body).to.have.property('environment').that.is.oneOf(['development', 'production', 'test']);
    });
  });

  // ─── Request ID ───────────────────────────────────────────────────────────

  describe('X-Request-ID middleware', () => {
    it('generates X-Request-ID if not provided by client', async () => {
      const res = await request(app).get('/health');
      expect(res.headers).to.have.property('x-request-id');
      expect(res.headers['x-request-id']).to.match(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('honors X-Request-ID from client', async () => {
      const clientId = 'test-trace-id-12345';
      const res = await request(app).get('/health').set('X-Request-ID', clientId);
      expect(res.headers['x-request-id']).to.equal(clientId);
    });

    it('each request without client ID gets a unique ID', async () => {
      const [res1, res2] = await Promise.all([
        request(app).get('/health'),
        request(app).get('/health'),
      ]);
      expect(res1.headers['x-request-id']).to.not.equal(res2.headers['x-request-id']);
    });
  });

  // ─── Security Headers (Helmet) ────────────────────────────────────────────

  describe('Security Headers (Helmet)', () => {
    it('sets X-Frame-Options', async () => {
      const res = await request(app).get('/health');
      expect(res.headers).to.have.property('x-frame-options');
    });

    it('sets X-Content-Type-Options: nosniff', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).to.equal('nosniff');
    });

    it('sets X-DNS-Prefetch-Control', async () => {
      const res = await request(app).get('/health');
      expect(res.headers).to.have.property('x-dns-prefetch-control');
    });

    it('sets X-API-Version header', async () => {
      const res = await request(app).get('/health');
      expect(res.headers).to.have.property('x-api-version');
    });
  });

  // ─── Body Size Limit ──────────────────────────────────────────────────────

  describe('Body Size Limit (10MB)', () => {
    it('accepts normal-sized JSON body', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({ username: 'test', password: 'test' });
      // We expect 4xx (invalid creds) not 413
      expect(res.status).to.not.equal(413);
    });

    it('rejects payload exceeding 10MB (server does not hang or crash)', async () => {
      // Generate a body slightly over 10MB
      const oversized = { data: 'x'.repeat(11 * 1024 * 1024) };
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send(oversized);
      // Express 5 may return 413 or bubble through error handler (4xx/5xx)
      // The key assertion: server responds (does not hang) and rejects the request
      expect(res.status).to.be.oneOf([400, 413, 422, 500]);
    });
  });

  // ─── Rate Limit Headers ───────────────────────────────────────────────────

  describe('API Rate Limiter', () => {
    it('returns RateLimit-Limit header on API routes', async () => {
      const res = await request(app).get('/api/v1/auth/login');
      // express-rate-limit with standardHeaders: true returns RateLimit-* headers
      const hasRateLimitHeader =
        res.headers['ratelimit-limit'] ||
        res.headers['x-ratelimit-limit'];
      expect(hasRateLimitHeader).to.exist;
    });
  });

  // ─── Error Response Shape ─────────────────────────────────────────────────

  describe('Error Response Shape', () => {
    it('404 on unknown endpoint has consistent shape', async () => {
      const res = await request(app).get('/api/v1/this-does-not-exist');
      expect(res.status).to.equal(404);
      expect(res.body).to.have.property('success', false);
    });

    it('401 on protected route without token has consistent shape', async () => {
      // /api/v1/me/dashboard is the protected route (see me.routes.js)
      const res = await request(app).get('/api/v1/me/dashboard');
      expect(res.status).to.equal(401);
      expect(res.body).to.have.property('success', false);
    });
  });
});
