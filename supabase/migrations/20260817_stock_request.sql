-- Migration: StockRequest tables + notification RPC
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS "StockRequest" (
  id BIGSERIAL PRIMARY KEY,
  request_number TEXT UNIQUE NOT NULL,
  sales_id BIGINT REFERENCES "User"(id),
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  total_qty INT DEFAULT 0,
  notes TEXT,
  approved_by BIGINT REFERENCES "User"(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS "StockRequestItem" (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT REFERENCES "StockRequest"(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES "Product"(id),
  qty INT NOT NULL DEFAULT 1,
  unit_id BIGINT REFERENCES "Unit"(id),
  remark TEXT
);

-- RPC: Submit stock request
CREATE OR REPLACE FUNCTION public.stock_request_submit(p_sales_id BIGINT, p_items JSONB, p_notes TEXT DEFAULT NULL)
RETURNS BIGINT AS $$
DECLARE
  v_request_id BIGINT;
  v_number TEXT;
  v_total INT := 0;
  v_item JSONB;
BEGIN
  SELECT 'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(request_number FROM 12) AS INT)), 0) + 1, 4, '0')
  INTO v_number FROM public."StockRequest" WHERE request_number LIKE 'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';

  INSERT INTO public."StockRequest" (request_number, sales_id, request_date, status, notes)
  VALUES (v_number, p_sales_id, CURRENT_DATE, 'PENDING', p_notes)
  RETURNING id INTO v_request_id;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    v_total := v_total + (v_item->>'qty')::INT;
    INSERT INTO public."StockRequestItem" (request_id, product_id, qty, unit_id, remark)
    VALUES (v_request_id, (v_item->>'product_id')::BIGINT, (v_item->>'qty')::INT,
            (v_item->>'unit_id')::BIGINT, v_item->>'remark');
  END LOOP;

  UPDATE public."StockRequest" SET total_qty = v_total WHERE id = v_request_id;
  RETURN v_request_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Approve stock request
CREATE OR REPLACE FUNCTION public.stock_request_approve(p_request_id BIGINT, p_approved_by BIGINT)
RETURNS VOID AS $$
BEGIN
  UPDATE public."StockRequest" SET status = 'APPROVED', approved_by = p_approved_by, approved_at = NOW()
  WHERE id = p_request_id AND status = 'PENDING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Reject stock request
CREATE OR REPLACE FUNCTION public.stock_request_reject(p_request_id BIGINT, p_approved_by BIGINT, p_reason TEXT DEFAULT NULL)
RETURNS VOID AS $$
BEGIN
  UPDATE public."StockRequest" SET status = 'REJECTED', approved_by = p_approved_by, approved_at = NOW(), notes = COALESCE(p_reason, notes)
  WHERE id = p_request_id AND status = 'PENDING';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS policies
ALTER TABLE "StockRequest" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "StockRequestItem" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sales can view own requests" ON "StockRequest"
  FOR SELECT USING (sales_id = public.current_user_id());

CREATE POLICY "Sales can insert own requests" ON "StockRequest"
  FOR INSERT WITH CHECK (sales_id = public.current_user_id());

CREATE POLICY "Owner can view all requests" ON "StockRequest"
  FOR SELECT USING (public.current_user_role() = 'OWNER');

CREATE POLICY "Owner can update all requests" ON "StockRequest"
  FOR UPDATE USING (public.current_user_role() = 'OWNER');

CREATE POLICY "Sales can view own request items" ON "StockRequestItem"
  FOR SELECT USING (request_id IN (SELECT id FROM "StockRequest" WHERE sales_id = public.current_user_id()));

CREATE POLICY "Sales can insert own request items" ON "StockRequestItem"
  FOR INSERT WITH CHECK (request_id IN (SELECT id FROM "StockRequest" WHERE sales_id = public.current_user_id()));

CREATE POLICY "Owner can view all request items" ON "StockRequestItem"
  FOR SELECT USING (public.current_user_role() = 'OWNER');
