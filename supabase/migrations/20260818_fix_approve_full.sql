-- Fix: tambah total_qty di INSERT SalesStockIssue + sequences

CREATE SEQUENCE IF NOT EXISTS stock_request_seq START 1;
CREATE SEQUENCE IF NOT EXISTS stock_issue_seq START 1;

CREATE OR REPLACE FUNCTION public.stock_request_submit(p_sales_id BIGINT, p_items JSONB, p_notes TEXT DEFAULT NULL)
RETURNS BIGINT AS $$
DECLARE
  v_request_id BIGINT;
  v_number TEXT;
  v_total INT := 0;
  v_item JSONB;
BEGIN
  v_number := 'SR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('stock_request_seq')::TEXT, 4, '0');

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

DROP FUNCTION IF EXISTS public.stock_request_approve(BIGINT, BIGINT);

CREATE OR REPLACE FUNCTION public.stock_request_approve(p_request_id BIGINT, p_approved_by BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
  v_item RECORD;
  v_issue_id BIGINT;
  v_issue_number TEXT;
  v_warehouse_id BIGINT;
  v_total_qty INT := 0;
  v_result JSONB;
BEGIN
  SELECT * INTO v_request FROM public."StockRequest" WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_request.status <> 'PENDING' THEN RAISE EXCEPTION 'Request already processed'; END IF;

  SELECT id INTO v_warehouse_id FROM public."Warehouse" WHERE is_active = true ORDER BY id LIMIT 1;
  IF v_warehouse_id IS NULL THEN RAISE EXCEPTION 'No active warehouse found'; END IF;

  SELECT COALESCE(SUM(qty), 0) INTO v_total_qty FROM public."StockRequestItem" WHERE request_id = p_request_id;

  v_issue_number := 'SI-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('stock_issue_seq')::TEXT, 4, '0');

  INSERT INTO public."SalesStockIssue"
    (issue_number, sales_id, warehouse_id, issue_date, status, notes, created_by, created_at, updated_at, total_qty)
  VALUES
    (v_issue_number, v_request.sales_id, v_warehouse_id, CURRENT_DATE, 'DRAFT',
     'Auto dari permintaan stok ' || v_request.request_number, p_approved_by, NOW(), NOW(), v_total_qty)
  RETURNING id INTO v_issue_id;

  FOR v_item IN SELECT * FROM public."StockRequestItem" WHERE request_id = p_request_id
  LOOP
    INSERT INTO public."SalesStockIssueItem"
      (issue_id, product_id, qty, unit_id, remark)
    VALUES
      (v_issue_id, v_item.product_id, v_item.qty, v_item.unit_id, v_item.remark);
  END LOOP;

  SELECT public.sales_stock_issue_confirm(v_issue_id::INTEGER) INTO v_result;

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

GRANT EXECUTE ON FUNCTION public.stock_request_submit(BIGINT, JSONB, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.stock_request_approve(BIGINT, BIGINT) TO authenticated;
