const fs = require('fs');

const models = `
model WarehouseSettlement {
  id               Int      @id @default(autoincrement())
  code             String   @unique
  sales_id         Int
  warehouse_id     Int
  status           SettlementStatus @default(DRAFT)
  result           SettlementResult?
  
  // Snapshot master
  sales_name       String
  warehouse_name   String

  // Cash Reconciliation
  invoice_amount   Decimal  @db.Decimal(15, 2)
  payment_received Decimal  @db.Decimal(15, 2)
  deposit          Decimal  @db.Decimal(15, 2)
  cash_on_hand     Decimal  @db.Decimal(15, 2)
  cash_difference  Decimal  @db.Decimal(15, 2)

  verified_by      Int?
  verified_at      DateTime?
  notes            String?

  created_at       DateTime @default(now())
  updated_at       DateTime @updatedAt
  created_by       Int?

  sales            User     @relation("SalesSettlements", fields: [sales_id], references: [id])
  warehouse        Warehouse @relation("WarehouseSettlements", fields: [warehouse_id], references: [id])
  creator          User?    @relation("SettlementCreator", fields: [created_by], references: [id])
  verifier         User?    @relation("SettlementVerifier", fields: [verified_by], references: [id])
  items            WarehouseSettlementItem[]
  differences      SettlementDifference[]
}

model WarehouseSettlementItem {
  id                     Int      @id @default(autoincrement())
  warehouse_settlement_id Int
  product_id             Int
  batch_id               Int
  
  // Snapshot Master Data
  product_code           String
  product_name           String
  batch_number           String
  unit_price             Decimal  @db.Decimal(15, 2)
  inventory_value        Decimal  @db.Decimal(15, 2)

  condition              ItemCondition
  qty_expected           Int
  qty_actual             Int
  qty_difference         Int

  settlement             WarehouseSettlement @relation(fields: [warehouse_settlement_id], references: [id])
  product                Product  @relation(fields: [product_id], references: [id])
  batch                  ProductBatch @relation(fields: [batch_id], references: [id])
}

model SettlementDifference {
  id                     Int      @id @default(autoincrement())
  warehouse_settlement_id Int
  product_id             Int
  batch_id               Int
  condition              ItemCondition
  qty                    Int
  reason                 DifferenceReason
  notes                  String?
  resolved               Boolean @default(false)

  settlement             WarehouseSettlement @relation(fields: [warehouse_settlement_id], references: [id])
  product                Product  @relation(fields: [product_id], references: [id])
  batch                  ProductBatch @relation(fields: [batch_id], references: [id])
}
`;

fs.appendFileSync('prisma/schema.prisma', models);
