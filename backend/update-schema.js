const fs = require('fs');

const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

// Update User Model
schema = schema.replace(
  '  updated_at    DateTime  @updatedAt\n\n  refresh_tokens',
  `  updated_at    DateTime  @updatedAt
  area_id       Int?

  area          Area?     @relation(fields: [area_id], references: [id], onDelete: Restrict)
  old_sales_histories CustomerSalesHistory[] @relation("OldSalesHistory")
  new_sales_histories CustomerSalesHistory[] @relation("NewSalesHistory")
  history_created     CustomerSalesHistory[] @relation("HistoryCreator")
  visit_notes         VisitNote[]

  refresh_tokens`
);

// Update Warung Model
schema = schema.replace(
  '  notes             String?\n  deleted_at        DateTime?\n  created_at        DateTime     @default(now())',
  `  notes             String?
  whatsapp          String?
  email             String?
  province          String?
  city              String?
  district          String?
  village           String?
  postal_code       String?
  visit_week        Int?
  payment_term      Int      @default(0)
  credit_limit      Decimal  @default(0) @db.Decimal(18, 2)
  last_visit_date   DateTime?
  last_invoice_date DateTime?
  last_payment_date DateTime?
  last_return_date  DateTime?
  merged_to_customer_id Int?
  category_id       Int?
  route_id          Int?
  deleted_at        DateTime?
  created_at        DateTime     @default(now())`
);

// Warung Relations
schema = schema.replace(
  '  assignedSales      User?              @relation(fields: [assigned_sales_id], references: [id], onDelete: Restrict)\n  visits             Visit[]',
  `  assignedSales      User?              @relation(fields: [assigned_sales_id], references: [id], onDelete: Restrict)
  category           CustomerCategory?  @relation(fields: [category_id], references: [id], onDelete: Restrict)
  route              Route?             @relation(fields: [route_id], references: [id], onDelete: Restrict)
  sales_histories    CustomerSalesHistory[]
  visits             Visit[]`
);

// Rename visit_order to visit_sequence
schema = schema.replace(/visit_order/g, 'visit_sequence');

// Update Visit Model
schema = schema.replace(
  '  updated_at          DateTime    @updatedAt\n\n  sales',
  `  updated_at          DateTime    @updatedAt

  visit_locations     VisitLocation[]
  visit_photos        VisitPhoto[]
  visit_notes         VisitNote[]

  sales`
);

// Update SalesPerformanceSummary Model
schema = schema.replace(
  '  total_settlement Decimal @default(0) @db.Decimal(15, 2)\n}',
  `  total_settlement Decimal @default(0) @db.Decimal(15, 2)
  assigned_customer Int     @default(0)
  visited_customer  Int     @default(0)
  productive_customer Int   @default(0)
  invoice_customer  Int     @default(0)
  collection_customer Int   @default(0)
  new_customer      Int     @default(0)
  lost_customer     Int     @default(0)
}`
);

fs.writeFileSync(schemaPath, schema);
console.log('Schema successfully updated.');
