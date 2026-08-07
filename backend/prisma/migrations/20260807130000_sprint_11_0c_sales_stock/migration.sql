-- AlterEnum
ALTER TYPE "MovementType" ADD VALUE 'ISSUE_FROM_WAREHOUSE';
ALTER TYPE "MovementType" ADD VALUE 'RETURN_TO_WAREHOUSE';
ALTER TYPE "MovementType" ADD VALUE 'ADJUSTMENT';

-- CreateEnum
CREATE TYPE "SalesStockIssueStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CLOSED');

-- CreateTable
CREATE TABLE "SalesStockIssue" (
    "id" SERIAL NOT NULL,
    "issue_number" TEXT NOT NULL,
    "issue_date" DATE NOT NULL,
    "warehouse_id" INTEGER NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "status" "SalesStockIssueStatus" NOT NULL DEFAULT 'DRAFT',
    "total_item" INTEGER NOT NULL DEFAULT 0,
    "total_qty" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_by" INTEGER,
    "confirmed_by" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "closed_by" INTEGER,
    "closed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesStockIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesStockIssueItem" (
    "id" SERIAL NOT NULL,
    "issue_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "unit_id" INTEGER NOT NULL,
    "remark" TEXT,

    CONSTRAINT "SalesStockIssueItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesStockIssueHistory" (
    "id" SERIAL NOT NULL,
    "issue_id" INTEGER NOT NULL,
    "status_from" "SalesStockIssueStatus",
    "status_to" "SalesStockIssueStatus" NOT NULL,
    "changed_by" INTEGER,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "remarks" TEXT,

    CONSTRAINT "SalesStockIssueHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesStockLedger" (
    "id" SERIAL NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "movement_type" "MovementType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "document_type" TEXT NOT NULL,
    "document_id" INTEGER NOT NULL,
    "transaction_date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesStockLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesStockProjection" (
    "id" SERIAL NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "qty_available" INTEGER NOT NULL DEFAULT 0,
    "qty_damaged" INTEGER NOT NULL DEFAULT 0,
    "qty_expired" INTEGER NOT NULL DEFAULT 0,
    "last_update" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesStockProjection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SalesStockIssue_issue_number_key" ON "SalesStockIssue"("issue_number");

-- CreateIndex
CREATE INDEX "SalesStockIssue_sales_id_idx" ON "SalesStockIssue"("sales_id");

-- CreateIndex
CREATE INDEX "SalesStockIssue_warehouse_id_idx" ON "SalesStockIssue"("warehouse_id");

-- CreateIndex
CREATE INDEX "SalesStockIssue_status_idx" ON "SalesStockIssue"("status");

-- CreateIndex
CREATE INDEX "SalesStockIssue_issue_date_idx" ON "SalesStockIssue"("issue_date");

-- CreateIndex
CREATE INDEX "SalesStockIssueItem_issue_id_idx" ON "SalesStockIssueItem"("issue_id");

-- CreateIndex
CREATE INDEX "SalesStockIssueItem_product_id_idx" ON "SalesStockIssueItem"("product_id");

-- CreateIndex
CREATE INDEX "SalesStockIssueHistory_issue_id_idx" ON "SalesStockIssueHistory"("issue_id");

-- CreateIndex
CREATE INDEX "SalesStockLedger_sales_id_idx" ON "SalesStockLedger"("sales_id");

-- CreateIndex
CREATE INDEX "SalesStockLedger_product_id_idx" ON "SalesStockLedger"("product_id");

-- CreateIndex
CREATE INDEX "SalesStockLedger_transaction_date_idx" ON "SalesStockLedger"("transaction_date");

-- CreateIndex
CREATE INDEX "SalesStockProjection_sales_id_idx" ON "SalesStockProjection"("sales_id");

-- CreateIndex
CREATE INDEX "SalesStockProjection_product_id_idx" ON "SalesStockProjection"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalesStockProjection_sales_id_product_id_key" ON "SalesStockProjection"("sales_id", "product_id");

-- AddForeignKey
ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockIssue" ADD CONSTRAINT "SalesStockIssue_closed_by_fkey" FOREIGN KEY ("closed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockIssueItem" ADD CONSTRAINT "SalesStockIssueItem_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "SalesStockIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockIssueItem" ADD CONSTRAINT "SalesStockIssueItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockIssueItem" ADD CONSTRAINT "SalesStockIssueItem_unit_id_fkey" FOREIGN KEY ("unit_id") REFERENCES "Unit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockIssueHistory" ADD CONSTRAINT "SalesStockIssueHistory_issue_id_fkey" FOREIGN KEY ("issue_id") REFERENCES "SalesStockIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockIssueHistory" ADD CONSTRAINT "SalesStockIssueHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockLedger" ADD CONSTRAINT "SalesStockLedger_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockLedger" ADD CONSTRAINT "SalesStockLedger_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockProjection" ADD CONSTRAINT "SalesStockProjection_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesStockProjection" ADD CONSTRAINT "SalesStockProjection_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
