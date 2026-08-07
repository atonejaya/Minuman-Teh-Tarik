-- CreateEnum
CREATE TYPE "LoadStatus" AS ENUM ('DRAFT', 'CONFIRMED', 'CANCELLED');

-- CreateTable
CREATE TABLE "Load" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "load_date" DATE NOT NULL,
    "status" "LoadStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "confirmed_by" INTEGER,
    "confirmed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Load_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoadItem" (
    "id" SERIAL NOT NULL,
    "load_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoadItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileStock" (
    "id" SERIAL NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "product_id" INTEGER NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileStock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Load_code_key" ON "Load"("code");

-- CreateIndex
CREATE INDEX "Load_sales_id_idx" ON "Load"("sales_id");

-- CreateIndex
CREATE INDEX "Load_status_idx" ON "Load"("status");

-- CreateIndex
CREATE INDEX "Load_load_date_idx" ON "Load"("load_date");

-- CreateIndex
CREATE INDEX "LoadItem_load_id_idx" ON "LoadItem"("load_id");

-- CreateIndex
CREATE INDEX "LoadItem_product_id_idx" ON "LoadItem"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "LoadItem_load_id_product_id_key" ON "LoadItem"("load_id", "product_id");

-- CreateIndex
CREATE INDEX "MobileStock_sales_id_idx" ON "MobileStock"("sales_id");

-- CreateIndex
CREATE INDEX "MobileStock_product_id_idx" ON "MobileStock"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "MobileStock_sales_id_product_id_key" ON "MobileStock"("sales_id", "product_id");

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Load" ADD CONSTRAINT "Load_confirmed_by_fkey" FOREIGN KEY ("confirmed_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadItem" ADD CONSTRAINT "LoadItem_load_id_fkey" FOREIGN KEY ("load_id") REFERENCES "Load"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoadItem" ADD CONSTRAINT "LoadItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileStock" ADD CONSTRAINT "MobileStock_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MobileStock" ADD CONSTRAINT "MobileStock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
