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

CREATE OR REPLACE FUNCTION public.track_sales_gps(
  p_latitude double precision,
  p_longitude double precision,
  p_visit_id integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id int := public.current_user_id();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;
  INSERT INTO public."SalesGpsTrack" (sales_id, latitude, longitude, visit_id)
  VALUES (v_user_id, p_latitude, p_longitude, p_visit_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.track_sales_gps(double precision, double precision, integer) TO authenticated;
