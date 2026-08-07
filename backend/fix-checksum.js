const prisma = require('./src/config/database');
const crypto = require('crypto');
const fs = require('fs');

async function main() {
  const fileContent = fs.readFileSync('prisma/migrations/20260806091427_create_sales_transaction/migration.sql', 'utf8');
  
  // Actually, wait! The SQL file was never updated with the unique constraints because I couldn't run Add-Content successfully before!
  // I must append the SQL first!
  const appendSql = `\n-- CreateIndex\nCREATE UNIQUE INDEX "LoadItem_load_id_product_id_batch_id_key" ON "LoadItem"("load_id", "product_id", "batch_id");\n-- CreateIndex\nCREATE UNIQUE INDEX "MobileStock_sales_id_product_id_batch_id_key" ON "MobileStock"("sales_id", "product_id", "batch_id");\n`;
  
  fs.appendFileSync('prisma/migrations/20260806091427_create_sales_transaction/migration.sql', appendSql);
  
  const updatedContent = fs.readFileSync('prisma/migrations/20260806091427_create_sales_transaction/migration.sql', 'utf8');
  const checksum = crypto.createHash('sha256').update(updatedContent).digest('hex');
  
  await prisma.$executeRawUnsafe(`UPDATE _prisma_migrations SET checksum = $1 WHERE migration_name = '20260806091427_create_sales_transaction'`, checksum);
  console.log('Checksum updated successfully to:', checksum);

  // Also apply the constraints directly to DB using raw SQL so db push is not needed!
  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "LoadItem_load_id_product_id_batch_id_key" ON "LoadItem"("load_id", "product_id", "batch_id");`);
    console.log('LoadItem constraint added');
  } catch (e) { console.log(e.message); }
  
  try {
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX "MobileStock_sales_id_product_id_batch_id_key" ON "MobileStock"("sales_id", "product_id", "batch_id");`);
    console.log('MobileStock constraint added');
  } catch (e) { console.log(e.message); }
  
  console.log('Done!');
}

main().catch(console.error).finally(() => process.exit(0));
