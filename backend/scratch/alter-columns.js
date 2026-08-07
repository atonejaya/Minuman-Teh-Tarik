const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function alterTable() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  });
  await client.connect();
  try {
    await client.query(`
      ALTER TABLE "SalesTransactionItem" ALTER COLUMN "batch_id" DROP NOT NULL;
      ALTER TABLE "SalesTransactionItem" ALTER COLUMN "batch_number" DROP NOT NULL;
      ALTER TABLE "SalesTransactionItem" ALTER COLUMN "expired_at" DROP NOT NULL;
    `);
    console.log("Successfully altered columns to be optional");
  } catch (err) {
    console.error("Error altering columns:", err);
  } finally {
    await client.end();
  }
}
alterTable();
