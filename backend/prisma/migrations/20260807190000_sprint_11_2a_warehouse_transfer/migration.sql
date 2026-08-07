-- Sprint 11.2A - Warehouse <-> Sales Stock Transfer
-- Bounded context Warehouse sebagai sumber stok utama perusahaan:
-- WarehouseLedger (warehouse source of truth), WarehouseTransfer(+Item) sebagai
-- dokumen idempotent issue/return, SalesDay untuk ringkasan harian.
-- Sales stock movement baru: RECEIVED_FROM_WAREHOUSE (issue masuk sales)
-- dan RESTOCK_OUTLET (sales -> outlet), ditambahkan secara additive ke
-- enum MovementType yang sudah ada.

ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'RECEIVED_FROM_WAREHOUSE';
ALTER TYPE "MovementType" ADD VALUE IF NOT EXISTS 'RESTOCK_OUTLET';

CREATE TYPE "WarehouseMovementType" AS ENUM ('ISSUE_TO_SALES', 'RETURN_FROM_SALES');
CREATE TYPE "WarehouseTransferType" AS ENUM ('ISSUE', 'RETURN');
CREATE TYPE "WarehouseTransferStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED');
CREATE TYPE "SalesDayStatus" AS ENUM ('OPEN', 'CLOSED');

CREATE TABLE "WarehouseLedger" (
  "id" SERIAL NOT NULL,
  "warehouse_id" INTEGER NOT NULL,
  "sales_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "movement_type" "WarehouseMovementType" NOT NULL,
  "qty" INTEGER NOT NULL,
  "balance" INTEGER NOT NULL,
  "reference_type" TEXT NOT NULL,
  "reference_id" TEXT NOT NULL,
  "notes" TEXT,
  "created_by" INTEGER,
  "transaction_date" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WarehouseLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseTransfer" (
  "id" SERIAL NOT NULL,
  "transfer_number" TEXT NOT NULL,
  "type" "WarehouseTransferType" NOT NULL,
  "warehouse_id" INTEGER NOT NULL,
  "sales_id" INTEGER NOT NULL,
  "transaction_date" DATE NOT NULL,
  "status" "WarehouseTransferStatus" NOT NULL DEFAULT 'PENDING',
  "reference_type" TEXT NOT NULL,
  "reference_id" TEXT NOT NULL,
  "notes" TEXT,
  "created_by" INTEGER,
  "posted_at" TIMESTAMP(3),
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WarehouseTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WarehouseTransferItem" (
  "id" SERIAL NOT NULL,
  "transfer_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "qty" INTEGER NOT NULL,

  CONSTRAINT "WarehouseTransferItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesDay" (
  "id" SERIAL NOT NULL,
  "sales_id" INTEGER NOT NULL,
  "sales_date" DATE NOT NULL,
  "status" "SalesDayStatus" NOT NULL DEFAULT 'OPEN',
  "summary" JSONB,
  "closed_by" INTEGER,
  "closed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesDay_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "WarehouseTransfer_type_reference_type_reference_id_key" ON "WarehouseTransfer"("type", "reference_type", "reference_id");
CREATE UNIQUE INDEX "SalesDay_sales_id_sales_date_key" ON "SalesDay"("sales_id", "sales_date");

CREATE INDEX "WarehouseLedger_warehouse_id_idx" ON "WarehouseLedger"("warehouse_id");
CREATE INDEX "WarehouseLedger_sales_id_idx" ON "WarehouseLedger"("sales_id");
CREATE INDEX "WarehouseLedger_product_id_idx" ON "WarehouseLedger"("product_id");
CREATE INDEX "WarehouseLedger_transaction_date_idx" ON "WarehouseLedger"("transaction_date");

CREATE INDEX "WarehouseTransfer_warehouse_id_idx" ON "WarehouseTransfer"("warehouse_id");
CREATE INDEX "WarehouseTransfer_sales_id_idx" ON "WarehouseTransfer"("sales_id");
CREATE INDEX "WarehouseTransfer_status_idx" ON "WarehouseTransfer"("status");
CREATE INDEX "WarehouseTransfer_transaction_date_idx" ON "WarehouseTransfer"("transaction_date");

CREATE INDEX "WarehouseTransferItem_transfer_id_idx" ON "WarehouseTransferItem"("transfer_id");
CREATE INDEX "WarehouseTransferItem_product_id_idx" ON "WarehouseTransferItem"("product_id");

CREATE INDEX "SalesDay_sales_id_idx" ON "SalesDay"("sales_id");
CREATE INDEX "SalesDay_sales_date_idx" ON "SalesDay"("sales_date");

-- Foreign Keys
ALTER TABLE "WarehouseLedger" ADD CONSTRAINT "WarehouseLedger_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseLedger" ADD CONSTRAINT "WarehouseLedger_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseLedger" ADD CONSTRAINT "WarehouseLedger_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseLedger" ADD CONSTRAINT "WarehouseLedger_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransfer" ADD CONSTRAINT "WarehouseTransfer_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WarehouseTransferItem" ADD CONSTRAINT "WarehouseTransferItem_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "WarehouseTransfer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WarehouseTransferItem" ADD CONSTRAINT "WarehouseTransferItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalesDay" ADD CONSTRAINT "SalesDay_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesDay" ADD CONSTRAINT "SalesDay_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
