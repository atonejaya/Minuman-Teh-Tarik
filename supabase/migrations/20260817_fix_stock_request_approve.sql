-- Migration: Update stock_request_approve to auto-create SalesStockIssue
-- Run this in Supabase SQL Editor

DROP FUNCTION IF EXISTS public.stock_request_approve(BIGINT, BIGINT);

CREATE OR REPLACE FUNCTION public.stock_request_approve(p_request_id BIGINT, p_approved_by BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_item RECORD;
  v_issue_id BIGINT;
  v_issue_number TEXT;
  v_warehouse_id BIGINT;
  v_result JSONB;
BEGIN
  -- Get request data
  SELECT * INTO v_request FROM public."StockRequest" WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_request.status <> 'PENDING' THEN RAISE EXCEPTION 'Request already processed'; END IF;

  -- Get default warehouse
  SELECT id INTO v_warehouse_id FROM public."Warehouse" WHERE is_active = true ORDER BY id LIMIT 1;
  IF v_warehouse_id IS NULL THEN RAISE EXCEPTION 'No active warehouse found'; END IF;

  -- Generate issue number
  SELECT 'SI-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(COALESCE(MAX(CAST(SUBSTRING(issue_number FROM 12) AS INT)), 0) + 1, 4, '0')
  INTO v_issue_number FROM public."SalesStockIssue" WHERE issue_number LIKE 'SI-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';

  -- Create SalesStockIssue
  INSERT INTO public."SalesStockIssue"
    (issue_number, sales_id, warehouse_id, issue_date, status, notes, created_by)
  VALUES
    (v_issue_number, v_request.sales_id, v_warehouse_id, CURRENT_DATE, 'DRAFT',
     'Auto dari permintaan stok ' || v_request.request_number, p_approved_by)
  RETURNING id INTO v_issue_id;

  -- Create SalesStockIssueItem for each request item
  FOR v_item IN SELECT * FROM public."StockRequestItem" WHERE request_id = p_request_id
  LOOP
    INSERT INTO public."SalesStockIssueItem"
      (issue_id, product_id, qty, unit_id, remark)
    VALUES
      (v_issue_id, v_item.product_id, v_item.qty, v_item.unit_id, v_item.remark);
  END LOOP;

  -- Confirm the issue (this will deduct warehouse stock + update sales stock projection)
  SELECT public.sales_stock_issue_confirm(v_issue_id) INTO v_result;

  -- Update request status
  UPDATE public."StockRequest"
  SET status = 'APPROVED',
      approved_by = p_approved_by,
      approved_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'issue_id', v_issue_id,
    'issue_number', v_issue_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.stock_request_approve(BIGINT, BIGINT) TO authenticated;
