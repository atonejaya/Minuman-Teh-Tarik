-- Simplify stock_request_approve: only change status, no auto-create SalesStockIssue
DROP FUNCTION IF EXISTS public.stock_request_approve(BIGINT, BIGINT);

CREATE OR REPLACE FUNCTION public.stock_request_approve(p_request_id BIGINT, p_approved_by BIGINT)
RETURNS JSONB AS $$
DECLARE
  v_request RECORD;
BEGIN
  SELECT * INTO v_request FROM public."StockRequest" WHERE id = p_request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF v_request.status <> 'PENDING' THEN RAISE EXCEPTION 'Request already processed'; END IF;

  UPDATE public."StockRequest"
  SET status = 'APPROVED',
      approved_by = p_approved_by,
      approved_at = NOW()
  WHERE id = p_request_id;

  RETURN jsonb_build_object(
    'success', true,
    'request_id', p_request_id,
    'request_number', v_request.request_number
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.stock_request_approve(BIGINT, BIGINT) TO authenticated;
