-- Sprint 11.0D - Outlet Inventory bounded context
-- OutletParStock, OutletStockLedger, OutletStockProjection, OutletStockCount, OutletStockCountItem

CREATE TYPE "OutletMovementType" AS ENUM ('ISSUE_TO_OUTLET', 'REFILL', 'SALE', 'RETURN_GOOD', 'RETURN_BAD', 'ADJUSTMENT');

CREATE TABLE "OutletParStock" (
  "id" SERIAL NOT NULL,
  "warung_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "par_qty" INTEGER NOT NULL,
  "min_qty" INTEGER NOT NULL DEFAULT 0,
  "max_qty" INTEGER,
  "priority" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutletParStock_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutletStockLedger" (
  "id" SERIAL NOT NULL,
  "warung_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "batch_id" INTEGER,
  "movement_type" "OutletMovementType" NOT NULL,
  "qty_before" INTEGER NOT NULL,
  "qty_change" INTEGER NOT NULL,
  "qty_after" INTEGER NOT NULL,
  "reference_type" TEXT,
  "reference_id" INTEGER,
  "visit_id" INTEGER,
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OutletStockLedger_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutletStockProjection" (
  "id" SERIAL NOT NULL,
  "warung_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "current_stock" INTEGER NOT NULL DEFAULT 0,
  "par_qty" INTEGER NOT NULL DEFAULT 0,
  "opening_stock" INTEGER NOT NULL DEFAULT 0,
  "total_refill" INTEGER NOT NULL DEFAULT 0,
  "total_sales" INTEGER NOT NULL DEFAULT 0,
  "total_return" INTEGER NOT NULL DEFAULT 0,
  "calculated_sales" INTEGER NOT NULL DEFAULT 0,
  "required_refill" INTEGER NOT NULL DEFAULT 0,
  "average_daily_sales" DECIMAL(18, 2) NOT NULL DEFAULT 0,
  "sell_through" DECIMAL(5, 2) NOT NULL DEFAULT 0,
  "last_visit_id" INTEGER,
  "last_count_at" TIMESTAMP(3),
  "last_refill_at" TIMESTAMP(3),
  "version" BIGINT NOT NULL DEFAULT 1,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "OutletStockProjection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutletStockCount" (
  "id" SERIAL NOT NULL,
  "warung_id" INTEGER NOT NULL,
  "sales_id" INTEGER NOT NULL,
  "visit_id" INTEGER,
  "counted_at" DATE NOT NULL,
  "created_by" INTEGER,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "OutletStockCount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OutletStockCountItem" (
  "id" SERIAL NOT NULL,
  "stock_count_id" INTEGER NOT NULL,
  "product_id" INTEGER NOT NULL,
  "physical_qty" INTEGER NOT NULL,

  CONSTRAINT "OutletStockCountItem_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "OutletParStock_warung_id_product_id_key" ON "OutletParStock"("warung_id", "product_id");
CREATE INDEX "OutletParStock_warung_id_idx" ON "OutletParStock"("warung_id");
CREATE INDEX "OutletParStock_product_id_idx" ON "OutletParStock"("product_id");
CREATE INDEX "OutletParStock_is_active_idx" ON "OutletParStock"("is_active");

CREATE INDEX "OutletStockLedger_warung_id_idx" ON "OutletStockLedger"("warung_id");
CREATE INDEX "OutletStockLedger_product_id_idx" ON "OutletStockLedger"("product_id");
CREATE INDEX "OutletStockLedger_warung_id_product_id_idx" ON "OutletStockLedger"("warung_id", "product_id");
CREATE INDEX "OutletStockLedger_movement_type_idx" ON "OutletStockLedger"("movement_type");
CREATE INDEX "OutletStockLedger_created_at_idx" ON "OutletStockLedger"("created_at");

CREATE UNIQUE INDEX "OutletStockProjection_warung_id_product_id_key" ON "OutletStockProjection"("warung_id", "product_id");
CREATE INDEX "OutletStockProjection_warung_id_idx" ON "OutletStockProjection"("warung_id");
CREATE INDEX "OutletStockProjection_product_id_idx" ON "OutletStockProjection"("product_id");

CREATE INDEX "OutletStockCount_warung_id_idx" ON "OutletStockCount"("warung_id");
CREATE INDEX "OutletStockCount_sales_id_idx" ON "OutletStockCount"("sales_id");
CREATE INDEX "OutletStockCount_counted_at_idx" ON "OutletStockCount"("counted_at");

CREATE INDEX "OutletStockCountItem_stock_count_id_idx" ON "OutletStockCountItem"("stock_count_id");
CREATE INDEX "OutletStockCountItem_product_id_idx" ON "OutletStockCountItem"("product_id");

-- Foreign Keys
ALTER TABLE "OutletParStock" ADD CONSTRAINT "OutletParStock_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutletParStock" ADD CONSTRAINT "OutletParStock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OutletStockLedger" ADD CONSTRAINT "OutletStockLedger_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutletStockLedger" ADD CONSTRAINT "OutletStockLedger_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutletStockLedger" ADD CONSTRAINT "OutletStockLedger_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "OutletStockProjection" ADD CONSTRAINT "OutletStockProjection_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutletStockProjection" ADD CONSTRAINT "OutletStockProjection_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OutletStockCount" ADD CONSTRAINT "OutletStockCount_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OutletStockCount" ADD CONSTRAINT "OutletStockCount_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OutletStockCountItem" ADD CONSTRAINT "OutletStockCountItem_stock_count_id_fkey" FOREIGN KEY ("stock_count_id") REFERENCES "OutletStockCount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OutletStockCountItem" ADD CONSTRAINT "OutletStockCountItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
