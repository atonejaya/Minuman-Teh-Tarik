-- CreateEnum
CREATE TYPE "CollectionFailureReason" AS ENUM ('CUSTOMER_NOT_FOUND', 'CUSTOMER_CLOSED', 'CUSTOMER_REFUSED', 'CUSTOMER_NO_CASH', 'CUSTOMER_PROMISE_TO_PAY', 'OTHER');

-- CreateEnum
CREATE TYPE "CollectionResult" AS ENUM ('FULL', 'PARTIAL', 'NONE');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "CreditNoteStatus" AS ENUM ('ACTIVE', 'USED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DifferenceReason" AS ENUM ('LOST', 'DAMAGED_IN_TRANSIT', 'DATA_ENTRY_ERROR', 'THEFT', 'EXPIRED', 'BROKEN', 'OTHER');

-- CreateEnum
CREATE TYPE "ItemCondition" AS ENUM ('GOOD', 'DAMAGED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'PROCESSING', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "PriceSource" AS ENUM ('RETAIL', 'PRICE_LEVEL', 'PROMOTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "ReturnReason" AS ENUM ('DAMAGED', 'LEAKED', 'WRONG_ITEM', 'EXPIRED', 'NOT_SOLD', 'OTHER');

-- CreateEnum
CREATE TYPE "ReturnType" AS ENUM ('GOOD', 'BAD');

-- CreateEnum
CREATE TYPE "SalesReturnReferenceType" AS ENUM ('DELIVERY', 'SALES');

-- CreateEnum
CREATE TYPE "SettlementResult" AS ENUM ('MATCH', 'DIFFERENCE');

-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('DRAFT', 'COUNTING', 'VERIFIED', 'COMPLETED', 'CANCELLED');

-- AlterEnum (rebuild PaymentStatus: PARTIAL -> PARTIALLY_PAID, +OVERPAID)
ALTER TABLE "SalesTransaction" ALTER COLUMN "payment_status" DROP DEFAULT;
ALTER TYPE "PaymentStatus" RENAME TO "PaymentStatus_old";
CREATE TYPE "PaymentStatus" AS ENUM ('UNPAID', 'PARTIALLY_PAID', 'PAID', 'OVERPAID');
ALTER TABLE "SalesTransaction" ALTER COLUMN "payment_status" TYPE "PaymentStatus" USING ("payment_status"::text::"PaymentStatus");
ALTER TABLE "SalesTransaction" ALTER COLUMN "payment_status" SET DEFAULT 'UNPAID';
DROP TYPE "PaymentStatus_old";

-- AlterEnum (rebuild ReturnStatus: CONFIRMED -> CHECKED/APPROVED/COMPLETED/CANCELLED)
DROP TYPE "ReturnStatus";
CREATE TYPE "ReturnStatus" AS ENUM ('DRAFT', 'CHECKED', 'APPROVED', 'COMPLETED', 'CANCELLED');

-- AlterEnum (rebuild ReferenceType: +SETTLEMENT; TRANSFER added later by migration 20260807190200)
ALTER TYPE "ReferenceType" RENAME TO "ReferenceType_old";
CREATE TYPE "ReferenceType" AS ENUM ('LOAD', 'SALE', 'RETURN', 'ADJUSTMENT', 'OPENING', 'SETTLEMENT');
ALTER TABLE "InventoryMovement" ALTER COLUMN "reference_type" TYPE "ReferenceType" USING ("reference_type"::text::"ReferenceType");
DROP TYPE "ReferenceType_old";

-- AlterEnum (rebuild MovementType: +SALE_RETURN_GOOD/SALE_RETURN_DAMAGED/SETTLEMENT_*; 5 values added later by migrations 20260807130000 & 20260807190000)
ALTER TYPE "MovementType" RENAME TO "MovementType_old";
CREATE TYPE "MovementType" AS ENUM ('STOCK_IN', 'LOAD_OUT', 'LOAD_IN', 'SALE', 'RETURN', 'SALE_RETURN_GOOD', 'SALE_RETURN_DAMAGED', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'SETTLEMENT_GOOD', 'SETTLEMENT_DAMAGED', 'SETTLEMENT_ADJUSTMENT');
ALTER TABLE "InventoryMovement" ALTER COLUMN "movement_type" TYPE "MovementType" USING ("movement_type"::text::"MovementType");
DROP TYPE "MovementType_old";

-- AlterTable (column drift: header/totals/payment snapshots on SalesTransaction)
ALTER TABLE "SalesTransaction" ADD COLUMN "customer_name" TEXT NOT NULL,
ADD COLUMN "customer_code" TEXT NOT NULL,
ADD COLUMN "customer_display_name" TEXT,
ADD COLUMN "customer_address" TEXT,
ADD COLUMN "customer_phone" TEXT,
ADD COLUMN "salesman_name" TEXT NOT NULL,
ADD COLUMN "salesman_code" TEXT,
ADD COLUMN "warehouse_code" TEXT,
ADD COLUMN "warehouse_name" TEXT,
ADD COLUMN "payment_term" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "payment_term_name" TEXT,
ADD COLUMN "price_level_name" TEXT,
ADD COLUMN "tax_name" TEXT,
ADD COLUMN "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "due_date" DATE,
ADD COLUMN "header_discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "header_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "tax_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "paid_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "paid_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "outstanding_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "outstanding_total" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "credit_balance" DECIMAL(18,2) NOT NULL DEFAULT 0;

-- AlterTable (column drift: ordering/pricing/tax/promotion snapshots on SalesTransactionItem)
ALTER TABLE "SalesTransactionItem" ADD COLUMN "line_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN "display_name" TEXT,
ADD COLUMN "sku" TEXT,
ADD COLUMN "barcode" TEXT,
ADD COLUMN "brand_name" TEXT,
ADD COLUMN "packaging_name" TEXT,
ADD COLUMN "unit_name" TEXT,
ADD COLUMN "unit_price" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "price_source" "PriceSource" NOT NULL DEFAULT 'RETAIL',
ADD COLUMN "price_level_id" INTEGER,
ADD COLUMN "price_level_name" TEXT,
ADD COLUMN "line_discount_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "line_discount_percent" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "tax_id" INTEGER,
ADD COLUMN "tax_code" TEXT,
ADD COLUMN "tax_name" TEXT,
ADD COLUMN "tax_rate" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "tax_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN "promotion_id" INTEGER,
ADD COLUMN "promotion_code" TEXT,
ADD COLUMN "promotion_name" TEXT,
ADD COLUMN "promotion_type" TEXT,
ADD COLUMN "promotion_discount" DECIMAL(18,2),
ADD COLUMN "is_manual_price" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "manual_price_reason" TEXT,
ADD COLUMN "approved_by" INTEGER,
ADD COLUMN "expiration_date" DATE,
ADD COLUMN "remarks" TEXT;

-- AlterTable (nullability drift: batch relation optional in schema)
ALTER TABLE "SalesTransactionItem" ALTER COLUMN "batch_id" DROP NOT NULL;
ALTER TABLE "SalesTransactionItem" ALTER COLUMN "batch_number" DROP NOT NULL;
ALTER TABLE "SalesTransactionItem" ALTER COLUMN "expired_at" DROP NOT NULL;

-- AlterTable (column drift: condition on MobileStock)
ALTER TABLE "MobileStock" ADD COLUMN "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD';

-- AlterTable (column drift: condition on WarehouseStock)
ALTER TABLE "WarehouseStock" ADD COLUMN "condition" "ItemCondition" NOT NULL DEFAULT 'GOOD';

-- AlterIndex (unique 3-col -> 4-col incl. condition)
DROP INDEX "MobileStock_sales_id_product_id_batch_id_key";
CREATE UNIQUE INDEX "MobileStock_sales_id_product_id_batch_id_condition_key" ON "MobileStock"("sales_id", "product_id", "batch_id", "condition");

-- AlterIndex
DROP INDEX "WarehouseStock_warehouse_id_product_id_batch_id_key";
CREATE UNIQUE INDEX "WarehouseStock_warehouse_id_product_id_batch_id_condition_key" ON "WarehouseStock"("warehouse_id", "product_id", "batch_id", "condition");

-- CreateTable
CREATE TABLE "SalesDashboardProjection" (
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

-- CreateTable
CREATE TABLE "PiutangDashboardProjection" (
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

-- CreateTable
CREATE TABLE "AccountsReceivableProjection" (
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

-- CreateTable
CREATE TABLE "CustomerARProjection" (
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

-- CreateTable
CREATE TABLE "Payment" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "transaction_id" INTEGER NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "reference_number" TEXT,
    "amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PAID',
    "collected_by" INTEGER,
    "transfer_bank" TEXT,
    "receipt_number" TEXT,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collection_id" INTEGER,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "warung_id" INTEGER NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "collection_date" DATE NOT NULL,
    "status" "CollectionStatus" NOT NULL DEFAULT 'PENDING',
    "result" "CollectionResult",
    "failure_reason" "CollectionFailureReason",
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionItem" (
    "id" SERIAL NOT NULL,
    "collection_id" INTEGER NOT NULL,
    "sales_transaction_id" INTEGER NOT NULL,
    "invoice_total" DECIMAL(18,2) NOT NULL,
    "outstanding_before" DECIMAL(18,2) NOT NULL,
    "payment_amount" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "outstanding_after" DECIMAL(18,2) NOT NULL DEFAULT 0,

    CONSTRAINT "CollectionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturn" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "reference_type" "SalesReturnReferenceType" NOT NULL DEFAULT 'SALES',
    "transaction_id" INTEGER,
    "delivery_id" INTEGER,
    "visit_id" INTEGER,
    "sales_id" INTEGER NOT NULL,
    "warung_id" INTEGER NOT NULL,
    "status" "ReturnStatus" NOT NULL DEFAULT 'DRAFT',
    "return_date" DATE NOT NULL,
    "total_amount" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesReturnItem" (
    "id" SERIAL NOT NULL,
    "sales_return_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "condition" "ItemCondition" NOT NULL,
    "reason" "ReturnReason" NOT NULL,
    "item_price" DECIMAL(18,2) NOT NULL,
    "subtotal" DECIMAL(18,2) NOT NULL,
    "return_type" "ReturnType" NOT NULL,

    CONSTRAINT "SalesReturnItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditNote" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "warung_id" INTEGER NOT NULL,
    "sales_return_id" INTEGER NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "remaining_amount" DECIMAL(18,2) NOT NULL,
    "status" "CreditNoteStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseSettlement" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "result" "SettlementResult",
    "sales_name" TEXT NOT NULL,
    "warehouse_name" TEXT NOT NULL,
    "invoice_amount" DECIMAL(15,2) NOT NULL,
    "payment_received" DECIMAL(15,2) NOT NULL,
    "deposit" DECIMAL(15,2) NOT NULL,
    "cash_on_hand" DECIMAL(15,2) NOT NULL,
    "cash_difference" DECIMAL(15,2) NOT NULL,
    "verified_by" INTEGER,
    "verified_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by" INTEGER,

    CONSTRAINT "WarehouseSettlement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseSettlementItem" (
    "id" SERIAL NOT NULL,
    "warehouse_settlement_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "product_code" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "batch_number" TEXT NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "inventory_value" DECIMAL(15,2) NOT NULL,
    "condition" "ItemCondition" NOT NULL,
    "qty_expected" INTEGER NOT NULL,
    "qty_actual" INTEGER NOT NULL,
    "qty_difference" INTEGER NOT NULL,

    CONSTRAINT "WarehouseSettlementItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettlementDifference" (
    "id" SERIAL NOT NULL,
    "warehouse_settlement_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "batch_id" INTEGER NOT NULL,
    "condition" "ItemCondition" NOT NULL,
    "qty" INTEGER NOT NULL,
    "reason" "DifferenceReason" NOT NULL,
    "notes" TEXT,
    "resolved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SettlementDifference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OutboxEvent" (
    "id" TEXT NOT NULL,
    "event_name" TEXT NOT NULL,
    "aggregate_id" TEXT NOT NULL,
    "aggregate_type" TEXT NOT NULL,
    "event_version" INTEGER NOT NULL DEFAULT 1,
    "correlation_id" TEXT NOT NULL,
    "causation_id" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "next_retry_at" TIMESTAMP(3),
    "error_message" TEXT,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "processing_started_at" TIMESTAMP(3),
    "published_at" TIMESTAMP(3),
    "published_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OutboxEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySalesSummary" (
    "id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "invoice_count" INTEGER NOT NULL DEFAULT 0,
    "sales_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paid_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "outstanding_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "return_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "settlement_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailySalesSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerLedgerSummary" (
    "id" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "receivable" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "credit_note" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "paid" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "last_transaction_date" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerLedgerSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSalesSummary" (
    "id" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "sales_qty" INTEGER NOT NULL DEFAULT 0,
    "return_qty" INTEGER NOT NULL DEFAULT 0,
    "net_sales_qty" INTEGER NOT NULL DEFAULT 0,
    "sales_value" DECIMAL(15,2) NOT NULL DEFAULT 0,

    CONSTRAINT "ProductSalesSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesPerformanceSummary" (
    "id" TEXT NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "total_customer" INTEGER NOT NULL DEFAULT 0,
    "total_invoice" INTEGER NOT NULL DEFAULT 0,
    "total_sales" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_collection" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_return" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total_settlement" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "assigned_customer" INTEGER NOT NULL DEFAULT 0,
    "visited_customer" INTEGER NOT NULL DEFAULT 0,
    "productive_customer" INTEGER NOT NULL DEFAULT 0,
    "invoice_customer" INTEGER NOT NULL DEFAULT 0,
    "collection_customer" INTEGER NOT NULL DEFAULT 0,
    "new_customer" INTEGER NOT NULL DEFAULT 0,
    "lost_customer" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SalesPerformanceSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProcessedEvent" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "projector_name" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesDashboardProjection_date_key" ON "SalesDashboardProjection"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PiutangDashboardProjection_date_key" ON "PiutangDashboardProjection"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivableProjection_sales_transaction_id_key" ON "AccountsReceivableProjection"("sales_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "AccountsReceivableProjection_invoice_number_key" ON "AccountsReceivableProjection"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_code_key" ON "Payment"("code");

-- CreateIndex
CREATE INDEX "Payment_transaction_id_idx" ON "Payment"("transaction_id");

-- CreateIndex
CREATE INDEX "Payment_created_by_idx" ON "Payment"("created_by");

-- CreateIndex
CREATE INDEX "Payment_collection_id_idx" ON "Payment"("collection_id");

-- CreateIndex
CREATE INDEX "Payment_code_idx" ON "Payment"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_code_key" ON "Collection"("code");

-- CreateIndex
CREATE INDEX "Collection_sales_id_idx" ON "Collection"("sales_id");

-- CreateIndex
CREATE INDEX "Collection_warung_id_idx" ON "Collection"("warung_id");

-- CreateIndex
CREATE INDEX "Collection_visit_id_idx" ON "Collection"("visit_id");

-- CreateIndex
CREATE INDEX "Collection_status_idx" ON "Collection"("status");

-- CreateIndex
CREATE INDEX "Collection_code_idx" ON "Collection"("code");

-- CreateIndex
CREATE INDEX "CollectionItem_collection_id_idx" ON "CollectionItem"("collection_id");

-- CreateIndex
CREATE INDEX "CollectionItem_sales_transaction_id_idx" ON "CollectionItem"("sales_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalesReturn_code_key" ON "SalesReturn"("code");

-- CreateIndex
CREATE INDEX "SalesReturn_sales_id_idx" ON "SalesReturn"("sales_id");

-- CreateIndex
CREATE INDEX "SalesReturn_warung_id_idx" ON "SalesReturn"("warung_id");

-- CreateIndex
CREATE INDEX "SalesReturn_transaction_id_idx" ON "SalesReturn"("transaction_id");

-- CreateIndex
CREATE INDEX "SalesReturn_code_idx" ON "SalesReturn"("code");

-- CreateIndex
CREATE INDEX "SalesReturnItem_sales_return_id_idx" ON "SalesReturnItem"("sales_return_id");

-- CreateIndex
CREATE INDEX "SalesReturnItem_product_id_idx" ON "SalesReturnItem"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_code_key" ON "CreditNote"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CreditNote_sales_return_id_key" ON "CreditNote"("sales_return_id");

-- CreateIndex
CREATE INDEX "CreditNote_warung_id_idx" ON "CreditNote"("warung_id");

-- CreateIndex
CREATE INDEX "CreditNote_code_idx" ON "CreditNote"("code");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseSettlement_code_key" ON "WarehouseSettlement"("code");

-- CreateIndex
CREATE INDEX "OutboxEvent_status_created_at_idx" ON "OutboxEvent"("status", "created_at");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregate_id_idx" ON "OutboxEvent"("aggregate_id");

-- CreateIndex
CREATE INDEX "OutboxEvent_aggregate_type_idx" ON "OutboxEvent"("aggregate_type");

-- CreateIndex
CREATE INDEX "OutboxEvent_correlation_id_idx" ON "OutboxEvent"("correlation_id");

-- CreateIndex
CREATE INDEX "OutboxEvent_next_retry_at_idx" ON "OutboxEvent"("next_retry_at");

-- CreateIndex
CREATE UNIQUE INDEX "DailySalesSummary_date_sales_id_warehouse_id_key" ON "DailySalesSummary"("date", "sales_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerLedgerSummary_customer_id_key" ON "CustomerLedgerSummary"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSalesSummary_product_id_key" ON "ProductSalesSummary"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalesPerformanceSummary_sales_id_key" ON "SalesPerformanceSummary"("sales_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedEvent_event_id_projector_name_key" ON "ProcessedEvent"("event_id", "projector_name");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "SalesTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_collection_id_fkey" FOREIGN KEY ("collection_id") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionItem" ADD CONSTRAINT "CollectionItem_sales_transaction_id_fkey" FOREIGN KEY ("sales_transaction_id") REFERENCES "SalesTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturn" ADD CONSTRAINT "SalesReturn_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "SalesTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_sales_return_id_fkey" FOREIGN KEY ("sales_return_id") REFERENCES "SalesReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesReturnItem" ADD CONSTRAINT "SalesReturnItem_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_sales_return_id_fkey" FOREIGN KEY ("sales_return_id") REFERENCES "SalesReturn"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSettlement" ADD CONSTRAINT "WarehouseSettlement_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSettlement" ADD CONSTRAINT "WarehouseSettlement_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSettlement" ADD CONSTRAINT "WarehouseSettlement_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSettlement" ADD CONSTRAINT "WarehouseSettlement_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSettlementItem" ADD CONSTRAINT "WarehouseSettlementItem_warehouse_settlement_id_fkey" FOREIGN KEY ("warehouse_settlement_id") REFERENCES "WarehouseSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSettlementItem" ADD CONSTRAINT "WarehouseSettlementItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseSettlementItem" ADD CONSTRAINT "WarehouseSettlementItem_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementDifference" ADD CONSTRAINT "SettlementDifference_warehouse_settlement_id_fkey" FOREIGN KEY ("warehouse_settlement_id") REFERENCES "WarehouseSettlement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementDifference" ADD CONSTRAINT "SettlementDifference_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettlementDifference" ADD CONSTRAINT "SettlementDifference_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "ProductBatch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
