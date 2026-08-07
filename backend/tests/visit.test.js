const assert = require('assert');
const prisma = require('../src/config/database');
const app = require('../src/app');

describe('Visit Management Integration Tests', function () {
  this.timeout(10000);

  let ownerToken;
  let salesToken;
  let warungId;
  let server;
  const PORT = 3004;
  const baseUrl = `http://localhost:${PORT}/api/v1`;

  before(async function() {
    return new Promise((resolve, reject) => {
      server = app.listen(PORT, async () => {
        try {
          // 1. Get tokens
          let res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'owner', password: 'admin123' })
          });
          let body = await res.json();
          ownerToken = body.data.token;

          res = await fetch(`${baseUrl}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: 'andi', password: 'sales123' })
          });
          body = await res.json();
          salesToken = body.data.token;

          // 2. Setup a warung
          const warungRes = await fetch(`${baseUrl}/warungs`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${ownerToken}` },
            body: JSON.stringify({
              code: `WRG-VISIT-${Date.now()}`,
              name: `Warung Visit Test ${Date.now()}`,
              owner_name: 'Bapak Test',
              latitude: -6.200000,
              longitude: 106.816666,
              status: 'ACTIVE',
              visit_day: ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'][new Date().getDay()],
              assigned_sales_id: 2
            })
          });
          const warungBody = await warungRes.json();
          if (!warungBody.data) {
            console.error('Failed to create warung:', warungBody);
            return reject(new Error('Warung creation failed'));
          }
          warungId = warungBody.data.id;
          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });

  after(async () => {
    // Cleanup the visits generated
    await prisma.auditLog.deleteMany({ where: { entity: 'Visit' } });
    if (warungId) {
      await prisma.visit.deleteMany({ where: { warung_id: warungId } });
      await prisma.warung.deleteMany({ where: { id: warungId } });
    }
    server.close();
  });

  it('should generate visit plan for sales today', async () => {
    const res = await fetch(`${baseUrl}/visits/generate-plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` },
      body: JSON.stringify({})
    });
    const body = await res.json();
    if (res.status !== 200) console.error('generate-plan:', body);
    assert.strictEqual(res.status, 200);
    assert.ok(body.data.generated >= 1);
  });

  it('should reject check-in if GPS is invalid (too far)', async () => {
    const res = await fetch(`${baseUrl}/visits/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` },
      body: JSON.stringify({
        warung_id: warungId,
        latitude: -6.210000, // Very far from -6.200000
        longitude: 106.816666,
        before_photo_url: 'http://example.com/before.jpg'
      })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 422);
    assert.ok(body.message && body.message.includes('terlalu jauh'));
  });

  it('should allow check-in if GPS is valid', async () => {
    const res = await fetch(`${baseUrl}/visits/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` },
      body: JSON.stringify({
        warung_id: warungId,
        latitude: -6.200050, // Close enough to -6.200000
        longitude: 106.816666,
        before_photo_url: 'http://example.com/before.jpg'
      })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.status, 'CHECKED_IN');
  });

  it('should reject double check-in', async () => {
    const res = await fetch(`${baseUrl}/visits/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` },
      body: JSON.stringify({
        warung_id: warungId,
        latitude: -6.200050,
        longitude: 106.816666,
        before_photo_url: 'http://example.com/before.jpg'
      })
    });
    assert.strictEqual(res.status, 409); // Conflict
  });

  it('should allow start selling', async () => {
    // Get today's visits to find the ID
    const todayRes = await fetch(`${baseUrl}/visits/today`, {
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const todayBody = await todayRes.json();
    const visitId = todayBody.data.find(v => v.warung_id === warungId).id;

    const res = await fetch(`${baseUrl}/visits/${visitId}/start-selling`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.status, 'SELLING');
  });

  it('should reject checkout without after_photo', async () => {
    const todayRes = await fetch(`${baseUrl}/visits/today`, {
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const todayBody = await todayRes.json();
    const visitId = todayBody.data.find(v => v.warung_id === warungId).id;

    const res = await fetch(`${baseUrl}/visits/${visitId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` },
      body: JSON.stringify({
        latitude: -6.200050,
        longitude: 106.816666
        // missing after_photo_url
      })
    });
    assert.strictEqual(res.status, 400); // Validation error
  });

  it('should allow checkout with valid data', async () => {
    const todayRes = await fetch(`${baseUrl}/visits/today`, {
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const todayBody = await todayRes.json();
    const visitId = todayBody.data.find(v => v.warung_id === warungId).id;

    const res = await fetch(`${baseUrl}/visits/${visitId}/checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${salesToken}` },
      body: JSON.stringify({
        latitude: -6.200050,
        longitude: 106.816666,
        after_photo_url: 'http://example.com/after.jpg'
      })
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.status, 'CHECKED_OUT');
  });

  it('should allow complete visit', async () => {
    const todayRes = await fetch(`${baseUrl}/visits/today`, {
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const todayBody = await todayRes.json();
    const visitId = todayBody.data.find(v => v.warung_id === warungId).id;

    const res = await fetch(`${baseUrl}/visits/${visitId}/complete`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${salesToken}` }
    });
    const body = await res.json();
    assert.strictEqual(res.status, 200);
    assert.strictEqual(body.data.status, 'COMPLETED');
  });
});
