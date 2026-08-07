const { execSync } = require('child_process');
const fs = require('fs');

try {
  const output = execSync('npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma --script');
  fs.writeFileSync('prisma/migrations/20260807000000_sprint_10_5a_final/migration.sql', output);
  console.log('Migration generated.');
} catch (e) {
  console.error(e.stdout ? e.stdout.toString() : e.message);
}
