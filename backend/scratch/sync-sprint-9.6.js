const prisma = require('../src/config/database');

async function main() {
  console.log('Starting Sprint 9.6 schema sync...');

  // 1. Create Enums
  try {
    await prisma.$executeRawUnsafe(`CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'LEAKED', 'WRONG_ITEM', 'EXPIRED', 'NOT_SOLD', 'OTHER');`);
    console.log('Created ReturnReason');
  } catch(e) { console.log('ReturnReason exists', e.message); }

  try {
    await prisma.$executeRawUnsafe(`CREATE TYPE "ReturnCondition" AS ENUM ('GOOD', 'DAMAGED');`);
    console.log('Created ReturnCondition');
  } catch(e) { console.log('ReturnCondition exists'); }

  try {
    await prisma.$executeRawUnsafe(`CREATE TYPE "CreditNoteStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED');`);
    console.log('Created CreditNoteStatus');
  } catch(e) { console.log('CreditNoteStatus exists'); }

  try {
    await prisma.$executeRawUnsafe(`CREATE TYPE "ItemCondition" AS ENUM ('GOOD', 'DAMAGED');`);
    console.log('Created ItemCondition');
  } catch(e) { console.log('ItemCondition exists'); }

  // 2. Alter MovementType Enum
  try {
    await prisma.$executeRawUnsafe(`ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'SALE_RETURN_GOOD';`);
    await prisma.$executeRawUnsafe(`ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'SALE_RETURN_DAMAGED';`);
    console.log('Added SALE_RETURN_GOOD/DAMAGED to MovementType');
  } catch(e) { console.log('SALE_RETURN_GOOD/DAMAGED exists'); }

  // 3. Alter WarehouseStock & MobileStock
  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "WarehouseStock" ADD COLUMN "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "WarehouseStock" DROP CONSTRAINT IF EXISTS "WarehouseStock_warehouse_id_product_id_batch_id_key";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouse_id_product_id_batch_id_condition_key" UNIQUE ("warehouse_id", "product_id", "batch_id", "condition");`);
    console.log('Altered WarehouseStock');
  } catch(e) { console.log('WarehouseStock alter error:', e.message); }

  try {
    await prisma.$executeRawUnsafe(`ALTER TABLE "MobileStock" ADD COLUMN "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD';`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "MobileStock" DROP CONSTRAINT IF EXISTS "MobileStock_sales_id_product_id_batch_id_key";`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "MobileStock" ADD CONSTRAINT "MobileStock_sales_id_product_id_batch_id_condition_key" UNIQUE ("sales_id", "product_id", "batch_id", "condition");`);
    console.log('Altered MobileStock');
  } catch(e) { console.log('MobileStock alter error:', e.message); }

  console.log('Schema sync prep completed.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
