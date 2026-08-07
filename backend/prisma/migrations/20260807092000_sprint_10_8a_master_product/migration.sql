-- DropEnum and DropIndex first
DROP INDEX IF EXISTS "Product_category_idx";
DROP TYPE IF EXISTS "ProductCategory" CASCADE;

-- CreateTable
CREATE TABLE "ProductCategory" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Packaging" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Packaging_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Unit" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Unit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductCategory_code_key" ON "ProductCategory"("code");
CREATE INDEX "ProductCategory_status_idx" ON "ProductCategory"("status");

CREATE UNIQUE INDEX "Brand_code_key" ON "Brand"("code");
CREATE INDEX "Brand_status_idx" ON "Brand"("status");

CREATE UNIQUE INDEX "Packaging_code_key" ON "Packaging"("code");
CREATE INDEX "Packaging_status_idx" ON "Packaging"("status");

CREATE UNIQUE INDEX "Unit_code_key" ON "Unit"("code");
CREATE INDEX "Unit_status_idx" ON "Unit"("status");

-- Seed Default Data (id = 1) so we can satisfy NOT NULL constraints
INSERT INTO "ProductCategory" (id, code, name, status, created_at, updated_at) VALUES (1, 'CAT-00', 'Default', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;
INSERT INTO "Brand" (id, code, name, status, created_at, updated_at) VALUES (1, 'BR-00', 'Default', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;
INSERT INTO "Packaging" (id, code, name, status, created_at, updated_at) VALUES (1, 'PKG-00', 'Default', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;
INSERT INTO "Unit" (id, code, name, symbol, status, created_at, updated_at) VALUES (1, 'UNT-00', 'Default', '-', 'ACTIVE', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) ON CONFLICT DO NOTHING;

-- Reset sequence to continue from 2
SELECT setval(pg_get_serial_sequence('"ProductCategory"', 'id'), 2);
SELECT setval(pg_get_serial_sequence('"Brand"', 'id'), 2);
SELECT setval(pg_get_serial_sequence('"Packaging"', 'id'), 2);
SELECT setval(pg_get_serial_sequence('"Unit"', 'id'), 2);

-- AlterTable
ALTER TABLE "Product" DROP COLUMN IF EXISTS "category",
DROP COLUMN IF EXISTS "unit",
ADD COLUMN     "barcode" TEXT,
ADD COLUMN     "brand_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "category_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "is_sellable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "maximum_stock" INTEGER,
ADD COLUMN     "minimum_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "packaging_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "reorder_level" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "short_name" TEXT,
ADD COLUMN     "unit_id" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "volume" DECIMAL(10,2),
ADD COLUMN     "weight" DECIMAL(10,2);

-- Remove defaults after applying
ALTER TABLE "Product" ALTER COLUMN "brand_id" DROP DEFAULT,
ALTER COLUMN "category_id" DROP DEFAULT,
ALTER COLUMN "packaging_id" DROP DEFAULT,
ALTER COLUMN "unit_id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SalesTransactionItem" DROP COLUMN IF EXISTS "category",
ADD COLUMN     "category_name" TEXT NOT NULL DEFAULT 'Default';

ALTER TABLE "SalesTransactionItem" ALTER COLUMN "category_name" DROP DEFAULT;

-- CreateTable
CREATE TABLE "ProductDashboardProjection" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "total_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_revenue" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "total_qty_sold" INTEGER NOT NULL DEFAULT 0,
    "average_selling_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "last_sale_date" TIMESTAMP(3),
    "last_purchase_date" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductDashboardProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductInventoryProjection" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER NOT NULL,
    "current_stock" INTEGER NOT NULL DEFAULT 0,
    "reserved_stock" INTEGER NOT NULL DEFAULT 0,
    "available_stock" INTEGER NOT NULL DEFAULT 0,
    "low_stock_indicator" BOOLEAN NOT NULL DEFAULT false,
    "last_stock_update" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductInventoryProjection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductDashboardProjection_product_id_key" ON "ProductDashboardProjection"("product_id");
CREATE UNIQUE INDEX "ProductInventoryProjection_product_id_key" ON "ProductInventoryProjection"("product_id");
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");
CREATE INDEX "Product_category_id_idx" ON "Product"("category_id");
CREATE INDEX "Product_brand_id_idx" ON "Product"("brand_id");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "ProductCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_brand_id_fkey" FOREIGN KEY ("brand_id") REFERENCES "Brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_packaging_id_fkey" FOREIGN KEY ("packaging_id") REFERENCES "Packaging"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Product" ADD CONSTRAINT "Product_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductDashboardProjection" ADD CONSTRAINT "ProductDashboardProjection_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductInventoryProjection" ADD CONSTRAINT "ProductInventoryProjection_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
