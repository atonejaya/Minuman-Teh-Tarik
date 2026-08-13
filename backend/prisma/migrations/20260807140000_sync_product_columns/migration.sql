-- Sync Product table to match schema.prisma (columns added to schema without migration)
ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "sku" VARCHAR(255),
  ADD COLUMN IF NOT EXISTS "display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "search_keywords" TEXT,
  ADD COLUMN IF NOT EXISTS "average_cost" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "last_purchase_price" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "shelf_life_days" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "is_purchasable" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "is_consignment" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS "Product_sku_key" ON "Product"("sku");
