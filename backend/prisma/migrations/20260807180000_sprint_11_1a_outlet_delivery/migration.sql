-- Sprint 11.1A - Delivery -> Outlet Inventory integration
-- OutletDelivery (idempotency key reference_type + reference_id),
-- OutletDeliveryItem, OutletDeliveryStatus enum, and notes on OutletStockLedger.

CREATE TYPE "OutletDeliveryStatus" AS ENUM ('PENDING', 'POSTED', 'FAILED');

ALTER TABLE "OutletStockLedger" ADD COLUMN "notes" TEXT;

CREATE TABLE "OutletDelivery" (
  "id" SERIAL NOT NULL,
  "warung_id" INTEGER NOT NULL,
  "delivery_date" DATE NOT NULL,
  "status" "OutletDeliveryStatus" NOT NULL DEFAULT 'PENDING',
  "reference_type" TEXT NOT NULL,
  "reference_id" TEXT NOT NULL,
  "notes" TEXT,
  "performed_by" INTEGER,
  "posted_at" TIMESTAMP(3),
  "error_message" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutletDelivery_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutletDeliveryItem" (
  "id" SERIAL NOT NULL,
  "delivery_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,

  CONSTRAINT "OutletDeliveryItem_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "OutletDelivery_reference_type_reference_id_key" ON "OutletDelivery"("reference_type", "reference_id");
CREATE INDEX "OutletDelivery_warung_id_idx" ON "OutletDelivery"("warung_id");
CREATE INDEX "OutletDelivery_status_idx" ON "OutletDelivery"("status");
CREATE INDEX "OutletDelivery_delivery_date_idx" ON "OutletDelivery"("delivery_date");

CREATE INDEX "OutletDeliveryItem_delivery_id_idx" ON "OutletDeliveryItem"("delivery_id");
CREATE INDEX "OutletDeliveryItem_product_id_idx" ON "OutletDeliveryItem"("product_id");

-- Foreign Keys
ALTER TABLE "OutletDelivery" ADD CONSTRAINT "OutletDelivery_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OutletDeliveryItem" ADD CONSTRAINT "OutletDeliveryItem_delivery_id_fkey" FOREIGN KEY ("delivery_id") REFERENCES "OutletDelivery"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutletDeliveryItem" ADD CONSTRAINT "OutletDeliveryItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
