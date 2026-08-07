const fs = require('fs');
const path = require('path');

const dirs = [
  'src/modules/master/category/controllers',
  'src/modules/master/category/services',
  'src/modules/master/category/routes',
  'src/modules/master/regional/controllers',
  'src/modules/master/regional/services',
  'src/modules/master/regional/routes',
  'src/modules/master/area/controllers',
  'src/modules/master/area/services',
  'src/modules/master/area/routes',
  'src/modules/master/route/controllers',
  'src/modules/master/route/services',
  'src/modules/master/route/routes',
  'src/modules/master/customer/controllers',
  'src/modules/master/customer/services',
  'src/modules/master/customer/routes',
  'src/modules/master/customer/dto',
];

dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

console.log('Directories created successfully.');
