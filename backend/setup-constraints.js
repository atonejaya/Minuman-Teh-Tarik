const prisma = require('./src/config/database');

async function main() {
  try {
    console.log('Adding check constraints...');
    await prisma.$executeRaw`ALTER TABLE "WarehouseStock" DROP CONSTRAINT IF EXISTS "whs_qty_check";`;
    await prisma.$executeRaw`ALTER TABLE "WarehouseStock" ADD CONSTRAINT "whs_qty_check" CHECK (qty_available >= 0);`;
    console.log('WarehouseStock check constraint added.');

    await prisma.$executeRaw`ALTER TABLE "MobileStock" DROP CONSTRAINT IF EXISTS "ms_qty_check";`;
    await prisma.$executeRaw`ALTER TABLE "MobileStock" ADD CONSTRAINT "ms_qty_check" CHECK (qty_available >= 0);`;
    console.log('MobileStock check constraint added.');
  } catch (error) {
    console.error('Failed to add constraints:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
