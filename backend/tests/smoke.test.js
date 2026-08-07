const assert = require('assert');
const http = require('http');
const app = require('../src/app');

// Very basic smoke test implementation using native Node.js asserts
describe('API Smoke Tests', () => {
  let server;
  let PORT = 3001;
  const baseUrl = `http://localhost:${PORT}`;

  before(function (done) {
    server = app.listen(PORT, () => {
      done();
    });
  });

  after(function (done) {
    server.close(() => {
      done();
    });
  });

  it('GET /health should return 200', (done) => {
    http.get(`${baseUrl}/health`, (res) => {
      assert.strictEqual(res.statusCode, 200);
      done();
    }).on('error', done);
  });

  it('GET /ready should return 200 or 503', (done) => {
    http.get(`${baseUrl}/ready`, (res) => {
      assert.ok([200, 503].includes(res.statusCode));
      done();
    }).on('error', done);
  });

  it('POST /api/v1/auth/login should return 200 and token for valid credentials', (done) => {
    const req = http.request(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        assert.strictEqual(res.statusCode, 200);
        const json = JSON.parse(data);
        assert.ok(json.success);
        assert.ok(json.data.token);
        done();
      });
    });
    req.write(JSON.stringify({ username: 'owner', password: 'admin123' }));
    req.end();
  });

  it('GET /api/v1/me/dashboard should return 401 without token', (done) => {
    http.get(`${baseUrl}/api/v1/me/dashboard`, (res) => {
      assert.strictEqual(res.statusCode, 401);
      done();
    }).on('error', done);
  });

  it('GET /api/v1/products should be tested when implemented', () => {
    assert.ok(true);
  });
});
