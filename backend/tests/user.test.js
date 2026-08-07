const assert = require('assert');
const http = require('http');
const app = require('../src/app');

describe('User Management Integration Tests', () => {
  let server;
  let PORT = 3002;
  const baseUrl = `http://localhost:${PORT}/api/v1`;
  let token = '';
  let createdUserId = null;
  const testUsername = `testsales_${Date.now()}`;

  before(function (done) {
    server = app.listen(PORT, () => {
      // Login first
      const req = http.request(`${baseUrl}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const json = JSON.parse(data);
          token = json.data.token;
          done();
        });
      });
      req.write(JSON.stringify({ username: 'owner', password: 'admin123' }));
      req.end();
    });
  });

  after(function (done) {
    server.close(done);
  });

  it('POST /users should create a new user', (done) => {
    const req = http.request(`${baseUrl}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        assert.strictEqual(res.statusCode, 201);
        const json = JSON.parse(data);
        assert.ok(json.success);
        assert.strictEqual(json.data.username, testUsername);
        createdUserId = json.data.id;
        assert.strictEqual(json.data.password_hash, undefined);
        done();
      });
    });
    req.write(JSON.stringify({ username: testUsername, password: 'password123', name: 'Test Sales', role: 'SALES' }));
    req.end();
  });

  it('GET /users should retrieve users with pagination', (done) => {
    http.get(`${baseUrl}/users`, { headers: { 'Authorization': `Bearer ${token}` } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        assert.strictEqual(res.statusCode, 200);
        const json = JSON.parse(data);
        assert.ok(json.success);
        assert.ok(Array.isArray(json.data));
        assert.ok(json.meta.total_pages >= 1);
        done();
      });
    });
  });

  it('PUT /users/:id should update user', (done) => {
    const req = http.request(`${baseUrl}/users/${createdUserId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        assert.strictEqual(res.statusCode, 200);
        const json = JSON.parse(data);
        assert.strictEqual(json.data.name, 'Updated Sales');
        done();
      });
    });
    req.write(JSON.stringify({ name: 'Updated Sales' }));
    req.end();
  });

  it('DELETE /users/:id should soft delete user', (done) => {
    const req = http.request(`${baseUrl}/users/${createdUserId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        assert.strictEqual(res.statusCode, 200);
        const json = JSON.parse(data);
        assert.strictEqual(json.data.is_active, false);
        done();
      });
    });
    req.end();
  });
});
