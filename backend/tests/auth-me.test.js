const assert = require('assert');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const jwtConfig = require('../src/config/jwt');

describe('Auth /me/dashboard contract (G3: req.user.id)', function () {
  this.timeout(10000);

  let server;
  let ownerToken;
  const PORT = 3013;
  const baseUrl = `http://localhost:${PORT}/api/v1`;

  before(async function () {
    return new Promise((resolve, reject) => {
      server = app.listen(PORT, async () => {
        try {
          const res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'owner', password: 'admin123' })
          });
          const body = await res.json();
          ownerToken = body.data.token;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  after(async () => {
    server.close();
  });

  it('returns authenticated profile via req.user.id contract', async () => {
    const res = await fetch(`${baseUrl}/me/dashboard`, {
      headers: { 'Authorization': `Bearer ${ownerToken}` }
    });
    const body = await res.json();
    if (res.status !== 200) console.error('me/dashboard:', body);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.profile.username, 'owner');
  });

  it('rejects token whose identity does not resolve to a user', async () => {
    const bogus = jwt.sign({ sub: 999999999, username: 'ghost', role: 'OWNER' }, jwtConfig.SECRET, { expiresIn: '1h' });
    const res = await fetch(`${baseUrl}/me/dashboard`, {
      headers: { 'Authorization': `Bearer ${bogus}` }
    });
    assert.strictEqual(res.status, 401);
  });
});
