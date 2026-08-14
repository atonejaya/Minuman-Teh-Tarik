-- ============================================================================
-- Minuman @One - Stock operations migration
-- Date: 2026-08-14
-- Applies via: Supabase SQL Editor (or `npx supabase db push` after login).
--
-- Contents:
--   1. sales_stock_issue_confirm: posts WarehouseLedger (ISSUE_TO_SALES) +
--      SalesStockLedger (ISSUE_FROM_WAREHOUSE), decrements WarehouseStock,
--      increments SalesStockProjection, marks issue CONFIRMED.
--   2. sales_stock_issue_close: marks issue CLOSED (admin/owner).
--   3. sales_stock_return: leftover sales stock back to warehouse
--      (RETURN_FROM_SALES / RETURN_TO_WAREHOUSE).
-- All mutations run in a single transaction (plpgsql function).
-- ============================================================================

drop function if exists public.sales_stock_issue_confirm(integer);

create or replace function public.sales_stock_issue_confirm(p_issue_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_issue    record;
  v_item     record;
  v_user_id  int := public.current_user_id();
  v_qty      int;
  v_wh_stock int;
  v_wh_balance int;
  v_sales_balance int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_issue
  from public."SalesStockIssue"
  where id = p_issue_id
  for update;

  if not found then
    raise exception 'Sales stock issue % not found', p_issue_id;
  end if;

  if v_issue.status <> 'DRAFT' then
    raise exception 'Sales stock issue % is already %', p_issue_id, v_issue.status;
  end if;

  if v_issue.warehouse_id is null then
    raise exception 'Warehouse is required';
  end if;
  if v_issue.sales_id is null then
    raise exception 'Sales is required';
  end if;

  for v_item in
    select i.id, i.product_id, i.qty
    from public."SalesStockIssueItem" i
    where i.issue_id = p_issue_id
    order by i.id
  loop
    if v_item.qty is null or v_item.qty <= 0 then
      continue;
    end if;

    select ws.qty_available into v_wh_stock
    from public."WarehouseStock" ws
    where ws.warehouse_id = v_issue.warehouse_id
      and ws.product_id = v_item.product_id
    for update;

    if not found or v_wh_stock < v_item.qty then
      raise exception 'Insufficient warehouse stock for product % (need %, have %)',
        v_item.product_id, v_item.qty, coalesce(v_wh_stock, 0);
    end if;

    v_wh_balance := v_wh_stock - v_item.qty;

    update public."WarehouseStock"
       set qty_available = v_wh_balance,
           version = version + 1,
           updated_at = now()
     where warehouse_id = v_issue.warehouse_id
       and product_id = v_item.product_id;

    insert into public."WarehouseLedger"
      (warehouse_id, sales_id, product_id, movement_type, qty, balance,
       reference_type, reference_id, notes, created_by, transaction_date)
    values
      (v_issue.warehouse_id, v_issue.sales_id, v_item.product_id,
       'ISSUE_TO_SALES'::public."WarehouseMovementType", v_item.qty, v_wh_balance,
       'SalesStockIssue', v_issue.issue_number, null, v_user_id, v_issue.issue_date);

    select coalesce(max(balance), 0) into v_sales_balance
    from public."SalesStockLedger"
    where sales_id = v_issue.sales_id and product_id = v_item.product_id;

    v_sales_balance := v_sales_balance + v_item.qty;

    insert into public."SalesStockLedger"
      (sales_id, product_id, movement_type, qty, balance,
       document_type, document_id, transaction_date)
    values
      (v_issue.sales_id, v_item.product_id,
       'ISSUE_FROM_WAREHOUSE'::public."MovementType", v_item.qty, v_sales_balance,
       'SalesStockIssue', v_issue.id, v_issue.issue_date);

    begin
      insert into public."SalesStockProjection" (sales_id, product_id, qty_available, qty_damaged, qty_expired, last_update)
      values (v_issue.sales_id, v_item.product_id, v_item.qty, 0, 0, now());
    exception
      when unique_violation then
        update public."SalesStockProjection"
           set qty_available = qty_available + v_item.qty,
               last_update = now()
         where sales_id = v_issue.sales_id
           and product_id = v_item.product_id;
    end;
  end loop;

  update public."SalesStockIssue"
     set status = 'CONFIRMED',
         confirmed_by = v_user_id,
         confirmed_at = now(),
         updated_at = now()
   where id = p_issue_id;

  insert into public."SalesStockIssueHistory"
    (issue_id, status_from, status_to, changed_by, changed_at, remarks)
  values
    (p_issue_id, 'DRAFT', 'CONFIRMED', v_user_id, now(), 'Confirmed');

  return jsonb_build_object('success', true, 'issue_id', p_issue_id, 'status', 'CONFIRMED');
exception
  when others then
    raise exception 'sales_stock_issue_confirm failed: %', SQLERRM;
end;
$$;

drop function if exists public.sales_stock_issue_close(integer);

create or replace function public.sales_stock_issue_close(p_issue_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_user_id int := public.current_user_id();
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select status into v_status
  from public."SalesStockIssue"
  where id = p_issue_id
  for update;

  if not found then
    raise exception 'Sales stock issue % not found', p_issue_id;
  end if;

  if v_status <> 'CONFIRMED' then
    raise exception 'Only CONFIRMED issues can be closed (current: %)', v_status;
  end if;

  update public."SalesStockIssue"
     set status = 'CLOSED',
         closed_by = v_user_id,
         closed_at = now(),
         updated_at = now()
   where id = p_issue_id;

  insert into public."SalesStockIssueHistory"
    (issue_id, status_from, status_to, changed_by, changed_at, remarks)
  values
    (p_issue_id, 'CONFIRMED', 'CLOSED', v_user_id, now(), 'Closed');

  return jsonb_build_object('success', true, 'issue_id', p_issue_id, 'status', 'CLOSED');
exception
  when others then
    raise exception 'sales_stock_issue_close failed: %', SQLERRM;
end;
$$;

drop function if exists public.sales_stock_return(jsonb);

create or replace function public.sales_stock_return(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_sales_id      int := (p_payload->>'sales_id')::int;
  v_warehouse_id  int := (p_payload->>'warehouse_id')::int;
  v_date          date := coalesce(nullif(p_payload->>'return_date','')::date, current_date);
  v_issue_id      int := nullif(p_payload->>'issue_id', '')::int;
  v_user_id       int := public.current_user_id();
  v_item          record;
  v_qty           int;
  v_wh_stock      int;
  v_wh_balance    int;
  v_sales_balance int;
  v_ref_type      text := 'SalesStockReturn';
  v_ref_id        text := coalesce(nullif(p_payload->>'reference_number',''), 'SR-' || to_char(now(), 'YYYYMMDD-HH24MISS'));
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_sales_id is null then
    raise exception 'sales_id is required';
  end if;
  if v_warehouse_id is null then
    raise exception 'warehouse_id is required';
  end if;

  for v_item in
    select value as j
    from jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb)) value
  loop
    v_qty := (v_item.j->>'qty')::int;
    if v_qty is null or v_qty <= 0 then
      continue;
    end if;

    select ws.qty_available into v_wh_stock
    from public."WarehouseStock" ws
    where ws.warehouse_id = v_warehouse_id
      and ws.product_id = (v_item.j->>'product_id')::int
    for update;

    v_wh_balance := coalesce(v_wh_stock, 0) + v_qty;

    if not found then
      insert into public."WarehouseStock"
        (warehouse_id, product_id, batch_id, qty_available, version, updated_at, condition)
      values
        (v_warehouse_id, (v_item.j->>'product_id')::int, null, v_qty, 1, now(), 'GOOD');
    else
      update public."WarehouseStock"
         set qty_available = v_wh_balance,
             version = version + 1,
             updated_at = now()
       where warehouse_id = v_warehouse_id
         and product_id = (v_item.j->>'product_id')::int;
    end if;

    insert into public."WarehouseLedger"
      (warehouse_id, sales_id, product_id, movement_type, qty, balance,
       reference_type, reference_id, notes, created_by, transaction_date)
    values
      (v_warehouse_id, v_sales_id, (v_item.j->>'product_id')::int,
       'RETURN_FROM_SALES'::public."WarehouseMovementType", v_qty, v_wh_balance,
       v_ref_type, v_ref_id, null, v_user_id, v_date);

    select coalesce(max(balance), 0) into v_sales_balance
    from public."SalesStockLedger"
    where sales_id = v_sales_id and product_id = (v_item.j->>'product_id')::int;

    v_sales_balance := greatest(v_sales_balance - v_qty, 0);

    insert into public."SalesStockLedger"
      (sales_id, product_id, movement_type, qty, balance,
       document_type, document_id, transaction_date)
    values
      (v_sales_id, (v_item.j->>'product_id')::int,
       'RETURN_TO_WAREHOUSE'::public."MovementType", v_qty, v_sales_balance,
       v_ref_type, v_issue_id, v_date);

    update public."SalesStockProjection"
       set qty_available = greatest(qty_available - v_qty, 0),
           last_update = now()
     where sales_id = v_sales_id
       and product_id = (v_item.j->>'product_id')::int;
  end loop;

  if v_issue_id is not null then
    update public."SalesStockIssue"
       set total_qty = greatest(total_qty - (
         select coalesce(sum((i.value->>'qty')::int), 0)
         from jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb)) i
       ), 0),
           updated_at = now()
     where id = v_issue_id;
  end if;

  return jsonb_build_object('success', true, 'reference_number', v_ref_id);
exception
  when others then
    raise exception 'sales_stock_return failed: %', SQLERRM;
end;
$$;

revoke execute on function public.sales_stock_issue_confirm(integer) from public, anon;
grant execute on function public.sales_stock_issue_confirm(integer) to authenticated;

revoke execute on function public.sales_stock_issue_close(integer) from public, anon;
grant execute on function public.sales_stock_issue_close(integer) to authenticated;

revoke execute on function public.sales_stock_return(jsonb) from public, anon;
grant execute on function public.sales_stock_return(jsonb) to authenticated;
