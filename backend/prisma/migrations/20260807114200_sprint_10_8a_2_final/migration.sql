-- AlterTable
ALTER TABLE "Supplier" 
ADD COLUMN "city" TEXT,
ADD COLUMN "email" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "pic_name" TEXT,
ADD COLUMN "province" TEXT;

-- AlterTable
ALTER TABLE "Tax" ADD COLUMN "is_default" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PriceLevel" ADD COLUMN "priority" INTEGER NOT NULL DEFAULT 0;

-- DropIndex
DROP INDEX IF EXISTS "ProductPrice_product_id_price_level_id_key";

-- AlterTable
ALTER TABLE "ProductPrice" 
ADD COLUMN "created_by" INTEGER,
ADD COLUMN "effective_from" TIMESTAMP(3),
ADD COLUMN "effective_until" TIMESTAMP(3),
ADD COLUMN "updated_by" INTEGER;

-- AlterTable
ALTER TABLE "Product" 
ADD COLUMN "average_cost" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "barcode" TEXT,
ADD COLUMN "display_name" TEXT,
ADD COLUMN "is_consignment" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "is_purchasable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "last_purchase_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "search_keywords" TEXT,
ADD COLUMN "sku" TEXT;

-- DropColumn
ALTER TABLE "Product" RENAME COLUMN "shelf_life" TO "shelf_life_days";

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX "Product_barcode_key" ON "Product"("barcode");

-- AlterTable
ALTER TABLE "ProductDashboardProjection" 
ADD COLUMN "profit_percentage" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "stock_turnover" DECIMAL(10,2) NOT NULL DEFAULT 0,
ADD COLUMN "total_cost" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "ProductInventoryProjection" 
ADD COLUMN "damaged_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "in_transit_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "on_order_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "returned_stock" INTEGER NOT NULL DEFAULT 0;
