-- Travel Monitor: fetch planned visits + GPS tracks for a salesperson on a date
-- Run this in Supabase SQL Editor

CREATE OR REPLACE FUNCTION public.get_travel_monitor(
  p_sales_id integer,
  p_date date
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT jsonb_build_object(
    'visits', (
      SELECT coalesce(jsonb_agg(row_to_json(v)), '[]'::jsonb)
      FROM (
        SELECT
          sv.id,
          sv.status,
          sv.visit_order,
          sv.check_in_time,
          sv.check_out_time,
          sv.check_in_latitude,
          sv.check_in_longitude,
          sv.check_out_latitude,
          sv.check_out_longitude,
          w.id AS warung_id,
          w.name AS warung_name,
          w.code AS warung_code,
          w.address AS warung_address,
          w.latitude AS warung_latitude,
          w.longitude AS warung_longitude
        FROM public."SalesVisit" sv
        JOIN public."Warung" w ON w.id = sv.warung_id
        WHERE sv.sales_id = p_sales_id
          AND sv.visit_date = p_date
        ORDER BY sv.visit_order ASC NULLS LAST, sv.id ASC
      ) v
    ),
    'gps_tracks', (
      SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT
          g.latitude,
          g.longitude,
          g.tracked_at,
          g.visit_id
        FROM public."SalesGpsTrack" g
        WHERE g.sales_id = p_sales_id
          AND g.tracked_at >= p_date::timestamptz
          AND g.tracked_at < (p_date + interval '1 day')::timestamptz
        ORDER BY g.tracked_at ASC
      ) t
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_travel_monitor(integer, date) TO authenticated;
