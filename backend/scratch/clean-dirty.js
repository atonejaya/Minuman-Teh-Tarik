const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const res = await client.query('SELECT id FROM "User" WHERE username IN ($1, $2)', ['sales_tx_tester', 'admin_tx_tester']);
    const ids = res.rows.map(r => r.id);
    if (ids.length > 0) {
      await client.query('DELETE FROM "AuditLog" WHERE user_id = ANY($1::int[])', [ids]);
      await client.query('DELETE FROM "User" WHERE id = ANY($1::int[])', [ids]);
    }
    await client.query('DELETE FROM "Warung" WHERE code = $1', ['WRG-TX-001']);
    await client.query('DELETE FROM "Product" WHERE code = $1', ['PRD-TX-001']);
    console.log("Cleaned up");
  } finally {
    await client.end();
  }
}
run();
