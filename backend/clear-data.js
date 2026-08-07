const prisma = require('./src/config/database');

async function main() {
  await prisma.mobileStock.deleteMany({});
  await prisma.loadItem.deleteMany({});
  await prisma.load.deleteMany({});
  console.log('Cleared Load, LoadItem, and MobileStock tables.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
