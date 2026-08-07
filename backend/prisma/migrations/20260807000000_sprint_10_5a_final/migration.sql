-- CreateEnum
CREATE TYPE "TransferType" AS ENUM ('AUTO', 'MANUAL');

-- AlterEnum
ALTER TYPE "WarungStatus" ADD VALUE 'CLOSED';

-- AlterTable
ALTER TABLE "SalesPerformanceSummary" ADD COLUMN     "assigned_customer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "collection_customer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "invoice_customer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lost_customer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "new_customer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "productive_customer" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visited_customer" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "area_id" INTEGER;

-- AlterTable
ALTER TABLE "Warung" ADD COLUMN     "area_id" INTEGER,
ADD COLUMN     "category_id" INTEGER,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "credit_limit" DECIMAL(18,2) NOT NULL DEFAULT 0,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "last_invoice_date" TIMESTAMP(3),
ADD COLUMN     "last_payment_date" TIMESTAMP(3),
ADD COLUMN     "last_return_date" TIMESTAMP(3),
ADD COLUMN     "last_visit_date" TIMESTAMP(3),
ADD COLUMN     "merged_to_customer_id" INTEGER,
ADD COLUMN     "payment_term" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "postal_code" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "route_id" INTEGER,
ADD COLUMN     "village" TEXT,
ADD COLUMN     "visit_week" INTEGER,
ADD COLUMN     "whatsapp" TEXT;

-- CreateTable
CREATE TABLE "Regional" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Regional_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Area" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "regional_id" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Area_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Route" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "area_id" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Route_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerCategory" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerSalesHistory" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "old_sales_id" INTEGER,
    "new_sales_id" INTEGER NOT NULL,
    "old_route_id" INTEGER,
    "new_route_id" INTEGER,
    "effective_from" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effective_until" TIMESTAMP(3),
    "reason" TEXT,
    "transfer_type" "TransferType" NOT NULL DEFAULT 'MANUAL',
    "created_by" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerSalesHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerTransactionProjection" (
    "id" TEXT NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "transaction_date" DATE NOT NULL,
    "type" TEXT NOT NULL,
    "reference_id" INTEGER NOT NULL,
    "reference_no" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "balance_after" DECIMAL(15,2) NOT NULL,
    "running_credit_note" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerTransactionProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitLocation" (
    "id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "latitude" DECIMAL(10,7) NOT NULL,
    "longitude" DECIMAL(10,7) NOT NULL,
    "accuracy" DECIMAL(10,2),
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitPhoto" (
    "id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "photo_url" TEXT NOT NULL,
    "photo_type" TEXT NOT NULL,
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VisitNote" (
    "id" SERIAL NOT NULL,
    "visit_id" INTEGER NOT NULL,
    "note" TEXT NOT NULL,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Regional_code_key" ON "Regional"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Area_code_key" ON "Area"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Route_code_key" ON "Route"("code");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerCategory_code_key" ON "CustomerCategory"("code");

-- CreateIndex
CREATE INDEX "CustomerTransactionProjection_customer_id_transaction_date_idx" ON "CustomerTransactionProjection"("customer_id", "transaction_date");

-- CreateIndex
CREATE INDEX "CustomerTransactionProjection_sales_id_idx" ON "CustomerTransactionProjection"("sales_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warung" ADD CONSTRAINT "Warung_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "CustomerCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warung" ADD CONSTRAINT "Warung_route_id_fkey" FOREIGN KEY ("route_id") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warung" ADD CONSTRAINT "Warung_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Area" ADD CONSTRAINT "Area_regional_id_fkey" FOREIGN KEY ("regional_id") REFERENCES "Regional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Route" ADD CONSTRAINT "Route_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "Area"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSalesHistory" ADD CONSTRAINT "CustomerSalesHistory_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Warung"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSalesHistory" ADD CONSTRAINT "CustomerSalesHistory_old_sales_id_fkey" FOREIGN KEY ("old_sales_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSalesHistory" ADD CONSTRAINT "CustomerSalesHistory_new_sales_id_fkey" FOREIGN KEY ("new_sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSalesHistory" ADD CONSTRAINT "CustomerSalesHistory_old_route_id_fkey" FOREIGN KEY ("old_route_id") REFERENCES "Route"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSalesHistory" ADD CONSTRAINT "CustomerSalesHistory_new_route_id_fkey" FOREIGN KEY ("new_route_id") REFERENCES "Route"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerSalesHistory" ADD CONSTRAINT "CustomerSalesHistory_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitLocation" ADD CONSTRAINT "VisitLocation_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitPhoto" ADD CONSTRAINT "VisitPhoto_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitNote" ADD CONSTRAINT "VisitNote_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

