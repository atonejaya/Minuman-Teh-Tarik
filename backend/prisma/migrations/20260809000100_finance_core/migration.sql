-- CreateEnum
CREATE TYPE "AREntryType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "ARReferenceType" AS ENUM ('INVOICE', 'PAYMENT', 'CREDIT_NOTE', 'REVERSAL');

-- AlterTable
ALTER TABLE "Payment" ALTER COLUMN "transaction_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SalesTransaction" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "ARLedger" (
    "id" SERIAL NOT NULL,
    "customer_id" INTEGER NOT NULL,
    "sales_transaction_id" INTEGER,
    "entry_type" "AREntryType" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "reference_type" "ARReferenceType" NOT NULL,
    "reference_id" TEXT NOT NULL,
    "balance_after" DECIMAL(18,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ARLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" SERIAL NOT NULL,
    "payment_id" INTEGER NOT NULL,
    "sales_transaction_id" INTEGER NOT NULL,
    "allocated_amount" DECIMAL(18,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FinanceIdempotencyKey" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "request_method" TEXT NOT NULL,
    "request_path" TEXT NOT NULL,
    "response_body" TEXT,
    "response_code" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinanceIdempotencyKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ARLedger_customer_id_idx" ON "ARLedger"("customer_id");

-- CreateIndex
CREATE INDEX "ARLedger_sales_transaction_id_idx" ON "ARLedger"("sales_transaction_id");

-- CreateIndex
CREATE INDEX "ARLedger_created_at_idx" ON "ARLedger"("created_at");

-- CreateIndex
CREATE INDEX "PaymentAllocation_payment_id_idx" ON "PaymentAllocation"("payment_id");

-- CreateIndex
CREATE INDEX "PaymentAllocation_sales_transaction_id_idx" ON "PaymentAllocation"("sales_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "FinanceIdempotencyKey_key_key" ON "FinanceIdempotencyKey"("key");

-- CreateIndex
CREATE INDEX "FinanceIdempotencyKey_key_idx" ON "FinanceIdempotencyKey"("key");

-- AddForeignKey
ALTER TABLE "ARLedger" ADD CONSTRAINT "ARLedger_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ARLedger" ADD CONSTRAINT "ARLedger_sales_transaction_id_fkey" FOREIGN KEY ("sales_transaction_id") REFERENCES "SalesTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_payment_id_fkey" FOREIGN KEY ("payment_id") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_sales_transaction_id_fkey" FOREIGN KEY ("sales_transaction_id") REFERENCES "SalesTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
