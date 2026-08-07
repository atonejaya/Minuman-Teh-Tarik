-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VisitStatus" ADD VALUE 'CHECKED_IN';
ALTER TYPE "VisitStatus" ADD VALUE 'SELLING';
ALTER TYPE "VisitStatus" ADD VALUE 'CHECKED_OUT';
ALTER TYPE "VisitStatus" ADD VALUE 'CANCELLED';

-- CreateTable
CREATE TABLE "NumberSequence" (
    "id" TEXT NOT NULL,
    "last_value" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NumberSequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Visit" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "sales_id" INTEGER NOT NULL,
    "warung_id" INTEGER NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'PENDING',
    "visit_date" DATE NOT NULL,
    "planned_sequence" INTEGER,
    "check_in_time" TIMESTAMP(3),
    "check_out_time" TIMESTAMP(3),
    "check_in_latitude" DECIMAL(10,7),
    "check_in_longitude" DECIMAL(10,7),
    "check_out_latitude" DECIMAL(10,7),
    "check_out_longitude" DECIMAL(10,7),
    "before_photo_url" TEXT,
    "after_photo_url" TEXT,
    "signature_url" TEXT,
    "distance_meter" INTEGER,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Visit_code_key" ON "Visit"("code");

-- CreateIndex
CREATE INDEX "Visit_sales_id_idx" ON "Visit"("sales_id");

-- CreateIndex
CREATE INDEX "Visit_warung_id_idx" ON "Visit"("warung_id");

-- CreateIndex
CREATE INDEX "Visit_visit_date_idx" ON "Visit"("visit_date");

-- CreateIndex
CREATE INDEX "Visit_status_idx" ON "Visit"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_sales_id_warung_id_visit_date_key" ON "Visit"("sales_id", "warung_id", "visit_date");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
