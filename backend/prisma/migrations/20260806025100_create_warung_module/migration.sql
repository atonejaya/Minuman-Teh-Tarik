-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('MINUMAN', 'SIRUP', 'BUBUK', 'TOPPING', 'CUP', 'LID', 'SEDOTAN', 'BAHAN_LAIN');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "WarungStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BLACKLIST');

-- DropForeignKey
ALTER TABLE "LoginLog" DROP CONSTRAINT "LoginLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "RefreshToken" DROP CONSTRAINT "RefreshToken_user_id_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "category" "ProductCategory" NOT NULL,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "description" TEXT,
ALTER COLUMN "selling_price" SET DATA TYPE DECIMAL(18,2),
ALTER COLUMN "cost_price" SET DATA TYPE DECIMAL(18,2);

-- AlterTable
ALTER TABLE "Warung" DROP COLUMN "is_active",
ADD COLUMN     "assigned_sales_id" INTEGER,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "status" "WarungStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "target_cups" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "visit_day" "DayOfWeek",
ADD COLUMN     "visit_order" INTEGER,
ALTER COLUMN "latitude" SET NOT NULL,
ALTER COLUMN "latitude" SET DATA TYPE DECIMAL(10,7),
ALTER COLUMN "longitude" SET NOT NULL,
ALTER COLUMN "longitude" SET DATA TYPE DECIMAL(10,7);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" INTEGER,
    "details" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Product_code_idx" ON "Product"("code");

-- CreateIndex
CREATE INDEX "Product_name_idx" ON "Product"("name");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_is_active_idx" ON "Product"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE INDEX "User_is_active_idx" ON "User"("is_active");

-- CreateIndex
CREATE INDEX "Warung_code_idx" ON "Warung"("code");

-- CreateIndex
CREATE INDEX "Warung_visit_day_idx" ON "Warung"("visit_day");

-- CreateIndex
CREATE INDEX "Warung_visit_order_idx" ON "Warung"("visit_order");

-- CreateIndex
CREATE INDEX "Warung_assigned_sales_id_idx" ON "Warung"("assigned_sales_id");

-- CreateIndex
CREATE INDEX "Warung_status_idx" ON "Warung"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Warung_assigned_sales_id_visit_day_visit_order_key" ON "Warung"("assigned_sales_id", "visit_day", "visit_order");

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoginLog" ADD CONSTRAINT "LoginLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE NO ACTION ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warung" ADD CONSTRAINT "Warung_assigned_sales_id_fkey" FOREIGN KEY ("assigned_sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

