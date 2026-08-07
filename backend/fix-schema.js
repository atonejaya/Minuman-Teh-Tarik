const fs = require('fs');

const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

// Fix Area -> Warung (Wait, I will add area_id to Warung)
schema = schema.replace(
  '  route_id          Int?\n  deleted_at        DateTime?',
  `  route_id          Int?
  area_id           Int?
  deleted_at        DateTime?`
);

schema = schema.replace(
  '  route              Route?             @relation(fields: [route_id], references: [id], onDelete: Restrict)\n  sales_histories',
  `  route              Route?             @relation(fields: [route_id], references: [id], onDelete: Restrict)
  area               Area?              @relation(fields: [area_id], references: [id], onDelete: Restrict)
  sales_histories`
);

// Fix Route -> CustomerSalesHistory
schema = schema.replace(
  '  area        Area     @relation(fields: [area_id], references: [id], onDelete: Restrict)\n  warungs     Warung[]\n}',
  `  area        Area     @relation(fields: [area_id], references: [id], onDelete: Restrict)
  warungs     Warung[]
  old_sales_histories CustomerSalesHistory[] @relation("OldRouteHistory")
  new_sales_histories CustomerSalesHistory[] @relation("NewRouteHistory")
}`
);

fs.writeFileSync(schemaPath, schema);
console.log('Schema relationships fixed.');
