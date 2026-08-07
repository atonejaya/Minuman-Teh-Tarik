const bcrypt = require('bcrypt');
const prisma = require('../src/config/database');

async function main() {
  console.log('Seeding database...');
  
  // Seed Setting
  await prisma.setting.upsert({
    where: { key: 'company_name' },
    update: {},
    create: { key: 'company_name', value: '@One Consignment', type: 'string' },
  });
  
  await prisma.setting.upsert({
    where: { key: 'commission_per_cup' },
    update: {},
    create: { key: 'commission_per_cup', value: '500', type: 'number' },
  });
  
  await prisma.setting.upsert({
    where: { key: 'fuel_daily' },
    update: {},
    create: { key: 'fuel_daily', value: '10000', type: 'number' },
  });

  // Seed Owner
  const passwordHash = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { username: 'owner' },
    update: {},
    create: {
      username: 'owner',
      password_hash: passwordHash,
      name: 'Bapak Owner',
      phone: '081122334455',
      role: 'OWNER',
    },
  });

  // Seed Sales
  const salesPasswordHash = await bcrypt.hash('sales123', 12);
  await prisma.user.upsert({
    where: { username: 'andi' },
    update: {},
    create: {
      username: 'andi',
      password_hash: salesPasswordHash,
      name: 'Andi Surya',
      phone: '081234567890',
      role: 'SALES',
    },
  });

  // Seed Product
  const product1 = await prisma.product.upsert({
    where: {
      code: 'PRD-001'
    },
    update: {},
    create: {
      code: 'PRD-001',
      name: 'Teh Tarik Original',
      category: 'MINUMAN',
      unit: 'Cup',
      selling_price: 5000,
      cost_price: 3000,
      shelf_life: 3,
      display_order: 1
    }
  });

  // Seed Warehouse
  const warehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-001' },
    update: {},
    create: {
      code: 'WH-001',
      name: 'Gudang Utama',
      address: 'Jl. Pusat Minuman No.1'
    }
  });

  // Seed ProductBatch
  const expDate = new Date();
  expDate.setDate(expDate.getDate() + 30);
  const prodDate = new Date();

  const batch = await prisma.productBatch.upsert({
    where: { product_id_batch_number: { product_id: product1.id, batch_number: 'BCH-001' } },
    update: {},
    create: {
      product_id: product1.id,
      batch_number: 'BCH-001',
      production_date: prodDate,
      expired_at: expDate
    }
  });

  // Seed WarehouseStock
  await prisma.warehouseStock.upsert({
    where: { warehouse_id_product_id_batch_id_condition: { warehouse_id: warehouse.id, product_id: product1.id, batch_id: batch.id, condition: 'GOOD' } },
    update: {},
    create: {
      warehouse_id: warehouse.id,
      product_id: product1.id,
      batch_id: batch.id,
      condition: 'GOOD',
      qty_available: 1000
    }
  });

  // Seed 20 Warungs assigned to Andi (Sales)
  // Andi's user ID will be 2 assuming owner is 1, but let's fetch it first
  const andi = await prisma.user.findUnique({ where: { username: 'andi' } });
  
  const days = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  
  for (let i = 1; i <= 20; i++) {
    const paddedIndex = i.toString().padStart(3, '0');
    const code = `WRG-${paddedIndex}`;
    const dayIndex = (i - 1) % 6; // Spread across 6 days
    const visit_day = days[dayIndex];
    const visit_order = Math.floor((i - 1) / 6) + 1; // 1-4 per day
    
    await prisma.warung.upsert({
      where: { code },
      update: {},
      create: {
        code,
        name: `Warung Dummy ${i}`,
        owner_name: `Bapak/Ibu Dummy ${i}`,
        phone: `08550000${paddedIndex}`,
        address: `Jl. Dummy No ${i}`,
        latitude: -6.2000000 + (i * 0.001),
        longitude: 106.8166660 + (i * 0.001),
        visit_day,
        visit_order,
        target_cups: 10 + (i % 5),
        status: 'ACTIVE',
        assigned_sales_id: andi.id,
      },
    });
  }

  console.log('Seeding completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
