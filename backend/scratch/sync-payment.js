const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query(`ALTER TYPE "PaymentStatus" RENAME VALUE 'PARTIAL' TO 'PARTIALLY_PAID';`);
    console.log("Renamed PARTIAL to PARTIALLY_PAID");
  } catch (err) {
    console.log("Enum rename error:", err.message);
  }
  
  try {
    await client.query(`
      CREATE TABLE "Payment" (
        "id" SERIAL PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "transaction_id" INTEGER NOT NULL REFERENCES "SalesTransaction"("id") ON DELETE RESTRICT,
        "payment_date" DATE NOT NULL,
        "payment_method" "PaymentMethod" NOT NULL,
        "amount" DECIMAL(18,2) NOT NULL,
        "notes" TEXT,
        "created_by" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX "Payment_transaction_id_idx" ON "Payment"("transaction_id");
      CREATE INDEX "Payment_created_by_idx" ON "Payment"("created_by");
      CREATE INDEX "Payment_code_idx" ON "Payment"("code");
    `);
    console.log("Created Payment table");
  } catch (err) {
    console.log("Create Payment table error:", err.message);
  }

  try {
    await client.query(`ALTER TABLE "SalesTransaction" ADD COLUMN "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;`);
    await client.query(`ALTER TABLE "SalesTransaction" ADD COLUMN "outstanding_amount" DECIMAL(18,2) NOT NULL DEFAULT 0;`);
    console.log("Added paid_amount and outstanding_amount");
  } catch (err) {
    console.log("Alter SalesTransaction error:", err.message);
  }

  await client.end();
}
run();
