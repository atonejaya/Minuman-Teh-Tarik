const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  
  try {
    await client.query(`CREATE TYPE "CollectionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');`);
    await client.query(`CREATE TYPE "CollectionResult" AS ENUM ('FULL', 'PARTIAL', 'NONE');`);
    await client.query(`CREATE TYPE "CollectionFailureReason" AS ENUM ('CUSTOMER_NOT_FOUND', 'CUSTOMER_CLOSED', 'CUSTOMER_REFUSED', 'CUSTOMER_NO_CASH', 'CUSTOMER_PROMISE_TO_PAY', 'OTHER');`);
    console.log("Enums created");
  } catch (err) {
    console.log("Enum create error:", err.message);
  }
  
  try {
    await client.query(`
      CREATE TABLE "Collection" (
        "id" SERIAL PRIMARY KEY,
        "code" TEXT UNIQUE NOT NULL,
        "sales_id" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
        "warung_id" INTEGER NOT NULL REFERENCES "Warung"("id") ON DELETE RESTRICT,
        "visit_id" INTEGER NOT NULL REFERENCES "Visit"("id") ON DELETE RESTRICT,
        "collection_date" DATE NOT NULL,
        "status" "CollectionStatus" NOT NULL DEFAULT 'PENDING',
        "result" "CollectionResult",
        "failure_reason" "CollectionFailureReason",
        "notes" TEXT,
        "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMP(3) NOT NULL
      );
      CREATE INDEX "Collection_sales_id_idx" ON "Collection"("sales_id");
      CREATE INDEX "Collection_warung_id_idx" ON "Collection"("warung_id");
      CREATE INDEX "Collection_visit_id_idx" ON "Collection"("visit_id");
      CREATE INDEX "Collection_status_idx" ON "Collection"("status");
      CREATE INDEX "Collection_code_idx" ON "Collection"("code");
    `);
    console.log("Created Collection table");
  } catch (err) {
    console.log("Create Collection table error:", err.message);
  }

  try {
    await client.query(`
      CREATE TABLE "CollectionItem" (
        "id" SERIAL PRIMARY KEY,
        "collection_id" INTEGER NOT NULL REFERENCES "Collection"("id") ON DELETE RESTRICT,
        "sales_transaction_id" INTEGER NOT NULL REFERENCES "SalesTransaction"("id") ON DELETE RESTRICT,
        "invoice_total" DECIMAL(18,2) NOT NULL,
        "outstanding_before" DECIMAL(18,2) NOT NULL,
        "payment_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
        "outstanding_after" DECIMAL(18,2) NOT NULL DEFAULT 0
      );
      CREATE INDEX "CollectionItem_collection_id_idx" ON "CollectionItem"("collection_id");
      CREATE INDEX "CollectionItem_sales_transaction_id_idx" ON "CollectionItem"("sales_transaction_id");
    `);
    console.log("Created CollectionItem table");
  } catch (err) {
    console.log("Create CollectionItem table error:", err.message);
  }

  try {
    await client.query(`ALTER TABLE "Payment" ADD COLUMN "collection_id" INTEGER REFERENCES "Collection"("id") ON DELETE RESTRICT;`);
    await client.query(`CREATE INDEX "Payment_collection_id_idx" ON "Payment"("collection_id");`);
    console.log("Added collection_id to Payment");
  } catch (err) {
    console.log("Alter Payment error:", err.message);
  }

  await client.end();
}
run();
