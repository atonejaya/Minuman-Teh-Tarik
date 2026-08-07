-- CreateTable
CREATE TABLE "Supplier" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contact" TEXT,
    "address" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tax" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rate" DECIMAL(5,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tax_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceLevel" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PriceLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductPrice" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "price_level_id" INTEGER NOT NULL,
    "price" DECIMAL(18,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_code_key" ON "Supplier"("code");
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");
CREATE UNIQUE INDEX "Tax_code_key" ON "Tax"("code");
CREATE INDEX "Tax_status_idx" ON "Tax"("status");
CREATE UNIQUE INDEX "PriceLevel_code_key" ON "PriceLevel"("code");
CREATE INDEX "PriceLevel_status_idx" ON "PriceLevel"("status");
CREATE INDEX "ProductPrice_status_idx" ON "ProductPrice"("status");
CREATE UNIQUE INDEX "ProductPrice_product_id_price_level_id_key" ON "ProductPrice"("product_id", "price_level_id");

-- Seed Default Price Levels
INSERT INTO "PriceLevel" (id, code, name, status, created_at, updated_at) VALUES (1, 'PL-RETAIL', 'Retail', 'ACTIVE', NOW(), NOW()) ON CONFLICT DO NOTHING;
INSERT INTO "PriceLevel" (id, code, name, status, created_at, updated_at) VALUES (2, 'PL-GROSIR', 'Grosir', 'ACTIVE', NOW(), NOW()) ON CONFLICT DO NOTHING;
SELECT setval(pg_get_serial_sequence('"PriceLevel"', 'id'), 3);

-- Migrate Existing Selling Prices to ProductPrice (Retail)
INSERT INTO "ProductPrice" (product_id, price_level_id, price, status, created_at, updated_at)
SELECT id, 1, selling_price, 'ACTIVE', NOW(), NOW() FROM "Product";

-- DropIndex
DROP INDEX IF EXISTS "Product_code_idx";
DROP INDEX IF EXISTS "Product_is_active_idx";
DROP INDEX IF EXISTS "Product_name_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN IF EXISTS "deleted_at",
DROP COLUMN IF EXISTS "selling_price",
ADD COLUMN     "supplier_id" INTEGER,
ADD COLUMN     "tax_id" INTEGER,
ADD COLUMN     "warehouse_id" INTEGER,
ALTER COLUMN "shelf_life" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductDashboardProjection" ADD COLUMN     "current_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "days_of_inventory" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN     "last_stock_movement_date" TIMESTAMP(3),
ADD COLUMN     "margin" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductInventoryProjection" ADD COLUMN     "incoming_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "outgoing_stock" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Product_supplier_id_idx" ON "Product"("supplier_id");
CREATE INDEX "Product_warehouse_id_idx" ON "Product"("warehouse_id");

-- AddForeignKey
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductPrice" ADD CONSTRAINT "ProductPrice_price_level_id_fkey" FOREIGN KEY ("price_level_id") REFERENCES "PriceLevel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_tax_id_fkey" FOREIGN KEY ("tax_id") REFERENCES "Tax"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;
