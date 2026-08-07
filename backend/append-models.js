const fs = require('fs');

const schemaPath = 'prisma/schema.prisma';
let schema = fs.readFileSync(schemaPath, 'utf8');

const modelsToAppend = `
// ==========================================
// MASTER DATA FOUNDATION (SPRINT 10.5A)
// ==========================================

model Regional {
  id          Int      @id @default(autoincrement())
  code        String   @unique
  name        String
  description String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  areas       Area[]
}

model Area {
  id          Int      @id @default(autoincrement())
  code        String   @unique
  name        String
  regional_id Int
  description String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  regional    Regional @relation(fields: [regional_id], references: [id], onDelete: Restrict)
  routes      Route[]
  warungs     Warung[]
  users       User[]
}

model Route {
  id          Int      @id @default(autoincrement())
  code        String   @unique
  name        String
  area_id     Int
  description String?
  is_active   Boolean  @default(true)
  created_at  DateTime @default(now())
  updated_at  DateTime @updatedAt

  area        Area     @relation(fields: [area_id], references: [id], onDelete: Restrict)
  warungs     Warung[]
}

model CustomerCategory {
  id            Int      @id @default(autoincrement())
  code          String   @unique
  name          String
  description   String?
  is_active     Boolean  @default(true)
  created_at    DateTime @default(now())
  updated_at    DateTime @updatedAt

  warungs       Warung[]
}

enum TransferType {
  AUTO
  MANUAL
}

model CustomerSalesHistory {
  id              Int          @id @default(autoincrement())
  customer_id     Int
  old_sales_id    Int?
  new_sales_id    Int
  old_route_id    Int?
  new_route_id    Int?
  effective_from  DateTime     @default(now())
  effective_until DateTime?
  reason          String?
  transfer_type   TransferType @default(MANUAL)
  created_by      Int?
  created_at      DateTime     @default(now())

  customer        Warung       @relation(fields: [customer_id], references: [id], onDelete: Cascade)
  old_sales       User?        @relation("OldSalesHistory", fields: [old_sales_id], references: [id], onDelete: SetNull)
  new_sales       User         @relation("NewSalesHistory", fields: [new_sales_id], references: [id], onDelete: Restrict)
  old_route       Route?       @relation("OldRouteHistory", fields: [old_route_id], references: [id], onDelete: SetNull)
  new_route       Route?       @relation("NewRouteHistory", fields: [new_route_id], references: [id], onDelete: Restrict)
  creator         User?        @relation("HistoryCreator", fields: [created_by], references: [id], onDelete: SetNull)
}

model CustomerTransactionProjection {
  id               String   @id @default(uuid())
  customer_id      Int
  transaction_date DateTime @db.Date
  type             String   // INVOICE, PAYMENT, RETURN
  reference_id     Int
  reference_no     String
  amount           Decimal  @db.Decimal(15, 2)
  balance_after    Decimal  @db.Decimal(15, 2)
  running_credit_note Decimal @default(0) @db.Decimal(15, 2)
  status           String   // e.g. COMPLETED
  sales_id         Int
  created_at       DateTime @default(now())

  @@index([customer_id, transaction_date])
  @@index([sales_id])
}

model VisitLocation {
  id           Int      @id @default(autoincrement())
  visit_id     Int
  latitude     Decimal  @db.Decimal(10, 7)
  longitude    Decimal  @db.Decimal(10, 7)
  accuracy     Decimal? @db.Decimal(10, 2)
  captured_at  DateTime @default(now())

  visit        Visit    @relation(fields: [visit_id], references: [id], onDelete: Cascade)
}

model VisitPhoto {
  id           Int      @id @default(autoincrement())
  visit_id     Int
  photo_url    String
  photo_type   String   // BEFORE, AFTER, DISPLAY
  captured_at  DateTime @default(now())

  visit        Visit    @relation(fields: [visit_id], references: [id], onDelete: Cascade)
}

model VisitNote {
  id           Int      @id @default(autoincrement())
  visit_id     Int
  note         String
  created_by   Int
  created_at   DateTime @default(now())

  visit        Visit    @relation(fields: [visit_id], references: [id], onDelete: Cascade)
  creator      User     @relation(fields: [created_by], references: [id], onDelete: Restrict)
}
`;

fs.appendFileSync(schemaPath, modelsToAppend);
console.log('Appended master data models to schema.prisma');
