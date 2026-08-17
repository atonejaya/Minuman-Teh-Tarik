-- Migration: GPS tracking for sales location
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "SalesGpsTrack" (
  id BIGSERIAL PRIMARY KEY,
  sales_id BIGINT REFERENCES "User"(id),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  visit_id BIGINT REFERENCES "SalesVisit"(id),
  tracked_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sales_gps_track_sales_id ON "SalesGpsTrack"(sales_id);
CREATE INDEX idx_sales_gps_track_tracked_at ON "SalesGpsTrack"(tracked_at DESC);

-- RLS
ALTER TABLE "SalesGpsTrack" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales can insert own GPS" ON "SalesGpsTrack"
  FOR INSERT WITH CHECK (sales_id = public.current_user_id());

CREATE POLICY "Owner can view all GPS" ON "SalesGpsTrack"
  FOR SELECT USING (public.current_user_role() = 'OWNER');

CREATE POLICY "Sales can view own GPS" ON "SalesGpsTrack"
  FOR SELECT USING (sales_id = public.current_user_id());
