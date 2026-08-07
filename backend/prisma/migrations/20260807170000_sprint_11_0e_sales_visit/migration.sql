-- Sprint 11.0E - Sales Visit bounded context
-- SalesVisit, SalesVisitActivity, SalesVisitNote, SalesVisitPhoto

CREATE TYPE "SalesVisitStatus" AS ENUM ('PLANNED', 'CHECKED_IN', 'STOCK_COUNTED', 'ORDER_CREATED', 'DELIVERED', 'CHECKED_OUT', 'COMPLETED', 'CANCELLED');

CREATE TYPE "SalesVisitActivityType" AS ENUM ('VISIT_CREATED', 'CHECK_IN', 'STOCK_COUNT', 'ORDER_CREATED', 'DELIVERED', 'CHECK_OUT', 'COMPLETED', 'NOTE_ADDED', 'PHOTO_ADDED', 'CANCELLED');

CREATE TABLE "SalesVisit" (
  "id" SERIAL NOT NULL,
  "code" TEXT NOT NULL,
  "sales_id" INTEGER NOT NULL,
  "warung_id" INTEGER NOT NULL,
  "status" "SalesVisitStatus" NOT NULL DEFAULT 'PLANNED',
  "visit_date" DATE NOT NULL,
  "planned_sequence" INTEGER,
  "check_in_time" TIMESTAMP(3),
  "check_out_time" TIMESTAMP(3),
  "duration_seconds" INTEGER,
  "check_in_latitude" DECIMAL(10, 7),
  "check_in_longitude" DECIMAL(10, 7),
  "check_out_latitude" DECIMAL(10, 7),
  "check_out_longitude" DECIMAL(10, 7),
  "distance_meter" INTEGER,
  "opening_note" TEXT,
  "closing_note" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SalesVisit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesVisitActivity" (
  "id" SERIAL NOT NULL,
  "visit_id" INTEGER NOT NULL,
  "type" "SalesVisitActivityType" NOT NULL,
  "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "metadata" JSONB,
  "created_by" INTEGER,

  CONSTRAINT "SalesVisitActivity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesVisitNote" (
  "id" SERIAL NOT NULL,
  "visit_id" INTEGER NOT NULL,
  "note" TEXT NOT NULL,
  "created_by" INTEGER NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SalesVisitNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesVisitPhoto" (
  "id" SERIAL NOT NULL,
  "visit_id" INTEGER NOT NULL,
  "filename" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "mime_type" TEXT,
  "size_bytes" INTEGER,
  "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_by" INTEGER NOT NULL,

  CONSTRAINT "SalesVisitPhoto_pkey" PRIMARY KEY ("id")
);

-- Unique & Indexes
CREATE UNIQUE INDEX "SalesVisit_code_key" ON "SalesVisit"("code");
CREATE UNIQUE INDEX "SalesVisit_sales_id_warung_id_visit_date_key" ON "SalesVisit"("sales_id", "warung_id", "visit_date");
CREATE INDEX "SalesVisit_sales_id_idx" ON "SalesVisit"("sales_id");
CREATE INDEX "SalesVisit_warung_id_idx" ON "SalesVisit"("warung_id");
CREATE INDEX "SalesVisit_visit_date_idx" ON "SalesVisit"("visit_date");
CREATE INDEX "SalesVisit_status_idx" ON "SalesVisit"("status");

CREATE INDEX "SalesVisitActivity_visit_id_idx" ON "SalesVisitActivity"("visit_id");
CREATE INDEX "SalesVisitActivity_type_idx" ON "SalesVisitActivity"("type");

CREATE INDEX "SalesVisitNote_visit_id_idx" ON "SalesVisitNote"("visit_id");

CREATE INDEX "SalesVisitPhoto_visit_id_idx" ON "SalesVisitPhoto"("visit_id");

-- Foreign Keys
ALTER TABLE "SalesVisit" ADD CONSTRAINT "SalesVisit_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SalesVisit" ADD CONSTRAINT "SalesVisit_warung_id_fkey" FOREIGN KEY ("warung_id") REFERENCES "Warung"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalesVisitActivity" ADD CONSTRAINT "SalesVisitActivity_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "SalesVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesVisitActivity" ADD CONSTRAINT "SalesVisitActivity_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "SalesVisitNote" ADD CONSTRAINT "SalesVisitNote_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "SalesVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesVisitNote" ADD CONSTRAINT "SalesVisitNote_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalesVisitPhoto" ADD CONSTRAINT "SalesVisitPhoto_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "SalesVisit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesVisitPhoto" ADD CONSTRAINT "SalesVisitPhoto_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
