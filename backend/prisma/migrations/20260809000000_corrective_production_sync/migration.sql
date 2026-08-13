-- ============================================================
-- Corrective migration: reconcile production schema with schema.prisma
-- IDEMPOTENT: safe on fresh replay (objects created by earlier fixed
-- migrations) AND on legacy schemas (objects missing from production).
-- No-op where the target state already exists.
-- ============================================================

-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PriceSource') THEN
    CREATE TYPE "PriceSource" AS ENUM ('RETAIL', 'PRICE_LEVEL', 'PROMOTION', 'MANUAL');
  END IF;
END $$;

-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SalesReturnReferenceType') THEN
    CREATE TYPE "SalesReturnReferenceType" AS ENUM ('DELIVERY', 'SALES');
  END IF;
END $$;

-- CreateEnum (guarded)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ReturnType') THEN
    CREATE TYPE "ReturnType" AS ENUM ('GOOD', 'BAD');
  END IF;
END $$;

-- AlterEnum (guarded): ensure PaymentStatus has OVERPAID
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'PaymentStatus' AND e.enumlabel = 'OVERPAID'
  ) THEN
    EXECUTE 'ALTER TYPE "PaymentStatus" ADD VALUE ''OVERPAID''';
  END IF;
END $$;

-- AlterEnum (guarded): rebuild ReturnStatus to canonical set
-- Only runs when the old enum shape is still present (e.g. legacy prod).
DO $$
DECLARE has_check boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'ReturnStatus' AND e.enumlabel = 'CHECKED'
  ) INTO has_check;
  IF NOT has_check THEN
    EXECUTE 'ALTER TABLE "public"."SalesReturn" ALTER COLUMN "status" DROP DEFAULT';
    EXECUTE 'ALTER TYPE "ReturnStatus" RENAME TO "ReturnStatus_old"';
    EXECUTE 'CREATE TYPE "ReturnStatus" AS ENUM (''DRAFT'',''CHECKED'',''APPROVED'',''COMPLETED'',''CANCELLED'')';
    EXECUTE 'ALTER TABLE "SalesReturn" ALTER COLUMN "status" TYPE "ReturnStatus" USING ("status"::text::"ReturnStatus")';
    EXECUTE 'DROP TYPE "ReturnStatus_old"';
    EXECUTE 'ALTER TABLE "SalesReturn" ALTER COLUMN "status" SET DEFAULT ''DRAFT''';
  END IF;
END $$;

-- DropIndex (guarded)
DROP INDEX IF EXISTS "WarehouseTransferItem_batch_id_idx";

-- AlterTable (guarded)
ALTER TABLE "Payment"
  ADD COLUMN IF NOT EXISTS "collected_by" INTEGER,
  ADD COLUMN IF NOT EXISTS "receipt_number" TEXT,
  ADD COLUMN IF NOT EXISTS "reference_number" TEXT,
  ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
  ADD COLUMN IF NOT EXISTS "transfer_bank" TEXT;

-- AlterTable (guarded)
ALTER TABLE "Product"
  DROP COLUMN IF EXISTS "shelf_life_days_legacy",
  ALTER COLUMN "sku" SET DATA TYPE TEXT;

-- AlterTable (guarded)
ALTER TABLE "SalesReturn"
  ADD COLUMN IF NOT EXISTS "delivery_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "reference_type" "SalesReturnReferenceType" NOT NULL DEFAULT 'SALES',
  ALTER COLUMN "transaction_id" DROP NOT NULL;

-- AlterTable (guarded)
ALTER TABLE "SalesReturnItem"
  ADD COLUMN IF NOT EXISTS "return_type" "ReturnType" NOT NULL,
  DROP COLUMN IF EXISTS "condition",
  ADD COLUMN IF NOT EXISTS "condition" "ItemCondition" NOT NULL;

-- AlterTable (guarded) — columns added if absent; backfill before NOT NULL
ALTER TABLE "SalesTransaction"
  ADD COLUMN IF NOT EXISTS "customer_name" TEXT,
  ADD COLUMN IF NOT EXISTS "customer_code" TEXT,
  ADD COLUMN IF NOT EXISTS "customer_display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "customer_address" TEXT,
  ADD COLUMN IF NOT EXISTS "customer_phone" TEXT,
  ADD COLUMN IF NOT EXISTS "salesman_name" TEXT,
  ADD COLUMN IF NOT EXISTS "salesman_code" TEXT,
  ADD COLUMN IF NOT EXISTS "warehouse_code" TEXT,
  ADD COLUMN IF NOT EXISTS "warehouse_name" TEXT,
  ADD COLUMN IF NOT EXISTS "payment_term" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "payment_term_name" TEXT,
  ADD COLUMN IF NOT EXISTS "price_level_name" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_name" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "due_date" DATE,
  ADD COLUMN IF NOT EXISTS "header_discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "header_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paid_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "outstanding_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "credit_balance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- Backfill customer_name / customer_code from Warung (idempotent)
UPDATE "SalesTransaction" st
SET customer_name = COALESCE(w."name", ''),
    customer_code = COALESCE(w."code", '')
FROM "Warung" w
WHERE st."warung_id" = w."id"
  AND (st."customer_name" IS NULL OR st."customer_code" IS NULL);

-- Backfill salesman_name from User (idempotent)
UPDATE "SalesTransaction" st
SET salesman_name = COALESCE(u."name", '')
FROM "User" u
WHERE st."sales_id" = u."id"
  AND st."salesman_name" IS NULL;

-- Fallback for any rows without join target
UPDATE "SalesTransaction" SET customer_name = '', customer_code = '' WHERE customer_name IS NULL OR customer_code IS NULL;
UPDATE "SalesTransaction" SET salesman_name = '' WHERE salesman_name IS NULL;

-- Enforce NOT NULL (no-op when already enforced)
ALTER TABLE "SalesTransaction" ALTER COLUMN "customer_name" SET NOT NULL,
ALTER COLUMN "customer_code" SET NOT NULL,
ALTER COLUMN "salesman_name" SET NOT NULL;

-- AlterTable (guarded)
ALTER TABLE "SalesTransactionItem"
  ADD COLUMN IF NOT EXISTS "approved_by" INTEGER,
  ADD COLUMN IF NOT EXISTS "barcode" TEXT,
  ADD COLUMN IF NOT EXISTS "brand_name" TEXT,
  ADD COLUMN IF NOT EXISTS "display_name" TEXT,
  ADD COLUMN IF NOT EXISTS "expiration_date" DATE,
  ADD COLUMN IF NOT EXISTS "is_manual_price" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "line_discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "line_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "line_number" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "manual_price_reason" TEXT,
  ADD COLUMN IF NOT EXISTS "packaging_name" TEXT,
  ADD COLUMN IF NOT EXISTS "price_level_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "price_level_name" TEXT,
  ADD COLUMN IF NOT EXISTS "price_source" "PriceSource" NOT NULL DEFAULT 'RETAIL',
  ADD COLUMN IF NOT EXISTS "promotion_code" TEXT,
  ADD COLUMN IF NOT EXISTS "promotion_discount" DECIMAL(18,2),
  ADD COLUMN IF NOT EXISTS "promotion_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "promotion_name" TEXT,
  ADD COLUMN IF NOT EXISTS "promotion_type" TEXT,
  ADD COLUMN IF NOT EXISTS "remarks" TEXT,
  ADD COLUMN IF NOT EXISTS "sku" TEXT,
  ADD COLUMN IF NOT EXISTS "sort_order" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "tax_code" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_id" INTEGER,
  ADD COLUMN IF NOT EXISTS "tax_name" TEXT,
  ADD COLUMN IF NOT EXISTS "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "unit_name" TEXT,
  ADD COLUMN IF NOT EXISTS "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- DropEnum (guarded)
DROP TYPE IF EXISTS "ReturnCondition";

-- CreateTable (guarded)
CREATE TABLE IF NOT EXISTS "SalesDashboardProjection" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "today_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "monthly_sales" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paid" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "average_transaction" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "top_customer_id" INTEGER,
    "top_product_id" INTEGER,
    "sales_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesDashboardProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable (guarded)
CREATE TABLE IF NOT EXISTS "PiutangDashboardProjection" (
    "id" SERIAL NOT NULL,
    "date" DATE NOT NULL,
    "piutang_hari_ini" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "piutang_jatuh_tempo" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "invoice_belum_lunas" INTEGER NOT NULL DEFAULT 0,
    "invoice_lewat_tempo" INTEGER NOT NULL DEFAULT 0,
    "total_outstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PiutangDashboardProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable (guarded)
CREATE TABLE IF NOT EXISTS "AccountsReceivableProjection" (
    "id" SERIAL NOT NULL,
    "sales_transaction_id" INTEGER NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "customer_code" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "invoice_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "due_date" DATE,
    "aging_days" INTEGER NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "last_payment_date" DATE,
    "last_invoice_date" DATE,
    "last_visit_date" DATE,
    "credit_limit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "available_credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountsReceivableProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable (guarded)
CREATE TABLE IF NOT EXISTS "CustomerARProjection" (
    "customer_code" TEXT NOT NULL,
    "customer_name" TEXT NOT NULL,
    "total_invoice" INTEGER NOT NULL DEFAULT 0,
    "total_outstanding" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "overdue_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "credit_limit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "available_credit" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "last_payment_date" DATE,
    "last_visit_date" DATE,
    "average_payment_delay" INTEGER NOT NULL DEFAULT 0,
    "collection_success_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "average_invoice" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerARProjection_pkey" PRIMARY KEY ("customer_code")
);

-- CreateIndex (guarded)
CREATE UNIQUE INDEX IF NOT EXISTS "SalesDashboardProjection_date_key" ON "SalesDashboardProjection"("date");

-- CreateIndex (guarded)
CREATE UNIQUE INDEX IF NOT EXISTS "PiutangDashboardProjection_date_key" ON "PiutangDashboardProjection"("date");

-- CreateIndex (guarded)
CREATE UNIQUE INDEX IF NOT EXISTS "AccountsReceivableProjection_sales_transaction_id_key" ON "AccountsReceivableProjection"("sales_transaction_id");

-- CreateIndex (guarded)
CREATE UNIQUE INDEX IF NOT EXISTS "AccountsReceivableProjection_invoice_number_key" ON "AccountsReceivableProjection"("invoice_number");

-- CreateIndex (guarded)
CREATE UNIQUE INDEX IF NOT EXISTS "WarehouseTransfer_transfer_number_key" ON "WarehouseTransfer"("transfer_number");
