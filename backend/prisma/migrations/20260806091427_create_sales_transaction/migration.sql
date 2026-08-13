/*
  Warnings:

  - You are about to drop the column `qty` on the `MobileStock` table. All the data in the column will be lost.
  - Added the required column `warehouse_id` to the `Load` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batch_id` to the `LoadItem` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batch_id` to the `MobileStock` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PAID', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SalesTransactionStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('STOCK_IN', 'LOAD_OUT', 'LOAD_IN', 'SALE', 'RETURN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT');

-- CreateEnum
CREATE TYPE "InventoryLocationType" AS ENUM ('WAREHOUSE', 'SALES', 'CUSTOMER', 'SUPPLIER', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "ReferenceType" AS ENUM ('LOAD', 'SALE', 'RETURN', 'ADJUSTMENT', 'OPENING');

-- DropIndex
DROP INDEX "LoadItem_load_id_product_id_key";

-- DropIndex
DROP INDEX "MobileStock_sales_id_product_id_key";

-- AlterTable
ALTER TABLE "Load" ADD COLUMN     "created_by" INTEGER,
ADD COLUMN     "warehouse_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "LoadItem" ADD COLUMN     "batch_id" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "MobileStock" DROP COLUMN "qty",
ADD COLUMN     "batch_id" INTEGER NOT NULL,
ADD COLUMN     "qty_available" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductBatch" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "batch_number" TEXT NOT NULL,
    "production_date" DATE NOT NULL,
    "expired_at" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseStock" (
    "id" SERIAL NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "qty_available" INTEGER NOT NULL DEFAULT 0,
    "version" INTEGER NOT NULL DEFAULT 1,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" SERIAL NOT NULL,
    "movement_number" TEXT NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "source_type" "InventoryLocationType" NOT NULL,
    "source_id" INTEGER,
    "destination_type" "InventoryLocationType" NOT NULL,
    "destination_id" INTEGER,
    "qty_before" INTEGER NOT NULL,
    "qty_change" INTEGER NOT NULL,
    "qty_after" INTEGER NOT NULL,
    "reference_document" TEXT,
    "reference_type" "ReferenceType",
    "product_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "batch_number" TEXT NOT NULL,
    "expired_at" DATE NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesTransaction" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "warung_id" INTEGER NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "status" "SalesTransactionStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotal" DECIMAL(18,2) NOT NULL,
    "item_discount" DECIMAL(18,2) NOT NULL,
    "transaction_discount" DECIMAL(18,2) NOT NULL,
    "tax" DECIMAL(18,2) NOT NULL,
    "grand_total" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesTransactionItem" (
    "id" SERIAL NOT NULL,
    "sales_transaction_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit" TEXT NOT NULL,
    "category" "ProductCategory" NOT NULL,
    "selling_price" DECIMAL(18,2) NOT NULL,
    "discount" DECIMAL(18,2) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "expired_at" DATE NOT NULL,

    CONSTRAINT "SalesTransactionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_code_key" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX "Warehouse_code_idx" ON "Warehouse"("code");

-- CreateIndex
CREATE INDEX "Warehouse_is_active_idx" ON "Warehouse"("is_active");

-- CreateIndex
CREATE INDEX "ProductBatch_product_id_idx" ON "ProductBatch"("product_id");

-- CreateIndex
CREATE INDEX "ProductBatch_expired_at_idx" ON "ProductBatch"("expired_at");

-- CreateIndex
CREATE UNIQUE INDEX "ProductBatch_product_id_batch_number_key" ON "ProductBatch"("product_id", "batch_number");

-- CreateIndex
CREATE INDEX "WarehouseStock_warehouse_id_idx" ON "WarehouseStock"("warehouse_id");

-- CreateIndex
CREATE INDEX "WarehouseStock_product_id_idx" ON "WarehouseStock"("product_id");

-- CreateIndex
CREATE INDEX "WarehouseStock_batch_id_idx" ON "WarehouseStock"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseStock_warehouse_id_product_id_batch_id_key" ON "WarehouseStock"("warehouse_id", "product_id", "batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryMovement_movement_number_key" ON "InventoryMovement"("movement_number");

-- CreateIndex
CREATE INDEX "InventoryMovement_movement_number_idx" ON "InventoryMovement"("movement_number");

-- CreateIndex
CREATE INDEX "InventoryMovement_movement_type_idx" ON "InventoryMovement"("movement_type");

-- CreateIndex
CREATE INDEX "InventoryMovement_source_type_source_id_idx" ON "InventoryMovement"("source_type", "source_id");

-- CreateIndex
CREATE INDEX "InventoryMovement_destination_type_destination_id_idx" ON "InventoryMovement"("destination_type", "destination_id");

-- CreateIndex
CREATE INDEX "InventoryMovement_product_id_idx" ON "InventoryMovement"("product_id");

-- CreateIndex
CREATE INDEX "InventoryMovement_batch_id_idx" ON "InventoryMovement"("batch_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalesTransaction_code_key" ON "SalesTransaction"("code");

-- CreateIndex
CREATE INDEX "SalesTransaction_visit_id_idx" ON "SalesTransaction"("visit_id");

-- CreateIndex
CREATE INDEX "SalesTransaction_sales_id_idx" ON "SalesTransaction"("sales_id");

-- CreateIndex
CREATE INDEX "SalesTransaction_warung_id_idx" ON "SalesTransaction"("warung_id");

-- CreateIndex
CREATE INDEX "SalesTransaction_status_idx" ON "SalesTransaction"("status");

-- CreateIndex
CREATE INDEX "SalesTransaction_payment_status_idx" ON "SalesTransaction"("payment_status");

-- CreateIndex
CREATE INDEX "SalesTransaction_code_idx" ON "SalesTransaction"("code");

-- CreateIndex
CREATE INDEX "SalesTransactionItem_sales_transaction_id_idx" ON "SalesTransactionItem"("sales_transaction_id");

-- CreateIndex
CREATE INDEX "SalesTransactionItem_product_id_idx" ON "SalesTransactionItem"("product_id");

-- CreateIndex
CREATE INDEX "SalesTransactionItem_batch_id_idx" ON "SalesTransactionItem"("batch_id");

-- CreateIndex
CREATE INDEX "Load_warehouse_id_idx" ON "Load"("warehouse_id");

-- CreateIndex
CREATE INDEX "LoadItem_batch_id_idx" ON "LoadItem"("batch_id");

-- CreateIndex
CREATE INDEX "MobileStock_batch_id_idx" ON "MobileStock"("batch_id");

-- AddForeignKey
ALTER TABLE "ProductBatch" ADD CONSTRAINT "ProductBatch_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileStock" ADD CONSTRAINT "MobileStock_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadItem" ADD CONSTRAINT "LoadItem_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransaction" ADD CONSTRAINT "SalesTransaction_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransactionItem" ADD CONSTRAINT "SalesTransactionItem_sales_transaction_id_fkey" FOREIGN KEY ("sales_transaction_id") REFERENCES "SalesTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransactionItem" ADD CONSTRAINT "SalesTransactionItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesTransactionItem" ADD CONSTRAINT "SalesTransactionItem_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
-- CreateIndex
CREATE UNIQUE INDEX "LoadItem_load_id_product_id_batch_id_key" ON "LoadItem"("load_id", "product_id", "batch_id");
-- CreateIndex
CREATE UNIQUE INDEX "MobileStock_sales_id_product_id_batch_id_key" ON "MobileStock"("sales_id", "product_id", "batch_id");
