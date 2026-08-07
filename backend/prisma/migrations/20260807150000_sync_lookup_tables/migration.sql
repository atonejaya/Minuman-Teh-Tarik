-- Sync lookup + projection tables to match schema.prisma (columns added to schema without migration)
ALTER TABLE "Tax"
  ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Supplier"
  ADD COLUMN IF NOT EXISTS "pic_name" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "city" TEXT,
  ADD COLUMN IF NOT EXISTS "province" TEXT;

ALTER TABLE "PriceLevel"
  ADD COLUMN IF NOT EXISTS "priority" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "ProductInventoryProjection"
  ADD COLUMN IF NOT EXISTS "damaged_stock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "returned_stock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "on_order_stock" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "in_transit_stock" INTEGER NOT NULL DEFAULT 0;
