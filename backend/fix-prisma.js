const fs = require('fs');
const path = require('path');

const dirs = ['category', 'regional', 'area', 'route'];
dirs.forEach(dir => {
  const servicePath = path.join(__dirname, \`src/modules/master/\${dir}/services\`);
  const files = fs.readdirSync(servicePath);
  files.forEach(file => {
    if (file.endsWith('.js')) {
      const fullPath = path.join(servicePath, file);
      let content = fs.readFileSync(fullPath, 'utf8');
      content = content.replace("const { PrismaClient } = require('@prisma/client');\\nconst prisma = new PrismaClient();", "const prisma = require('../../../../config/database');");
      // Fallback if they used single quotes or different formatting
      content = content.replace(/const { PrismaClient } = require\\('@prisma\\/client'\\);[\\r\\n]+const prisma = new PrismaClient\\(\\);/g, "const prisma = require('../../../../config/database');");
      fs.writeFileSync(fullPath, content);
    }
  });
});
console.log('Fixed Prisma imports');
