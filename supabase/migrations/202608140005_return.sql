-- ============================================================================
-- Minuman @One - Sales Return lifecycle migration
-- Date: 2026-08-14
-- Applies via: Supabase SQL Editor (or `npx supabase db push` after login).
--
-- Contents (all security definer, transactional):
--   1. sales_return_submit   - SALES: buat SalesReturn DRAFT + items (RET-)
--   2. sales_return_approve  - OWNER: DRAFT -> APPROVED
--   3. sales_return_receive  - OWNER: APPROVED/DRAFT -> COMPLETED + ledger posting
--                              (OutletStockLedger RETURN_GOOD/RETURN_BAD,
--                               SalesStockLedger SALE_RETURN_GOOD/SALE_RETURN_DAMAGED,
--                               SalesStockProjection & OutletStockProjection update)
-- NOTE: Return yang dibuat otomatis oleh visit flow (expired) sudah berstatus
--       COMPLETED dan ledger-nya sudah diposting di visit_save_stock_count,
--       sehingga tidak akan diproses ulang oleh sales_return_receive.
-- ============================================================================

drop function if exists public.sales_return_submit(jsonb);

create or replace function public.sales_return_submit(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id   int := public.current_user_id();
  v_warung_id int := (p_payload->>'warung_id')::int;
  v_date      date := coalesce((p_payload->>'return_date')::date, current_date);
  v_notes     text := nullif(p_payload->>'notes', '');
  v_code      text;
  v_ret_id    int;
  v_total     numeric := 0;
  v_item      record;
  v_count     int := 0;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_warung_id is null then
    raise exception 'warung_id wajib diisi';
  end if;

  perform 1 from public."Warung" w where w.id = v_warung_id;
  if not found then
    raise exception 'Warung % tidak ditemukan', v_warung_id;
  end if;

  if (select count(*) from jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb))) = 0 then
    raise exception 'Minimal satu item return';
  end if;

  v_code := public.next_document_number('SalesReturn', 'RET-', to_char(v_date, 'YYYY'), to_char(v_date, 'MM'));

  insert into public."SalesReturn"
    (code, sales_id, warung_id, status, return_date, total_amount, notes, reference_type)
  values
    (v_code, v_user_id, v_warung_id, 'DRAFT'::public."ReturnStatus", v_date, 0, v_notes, 'SALES'::public."SalesReturnReferenceType")
  returning id into v_ret_id;

  for v_item in
    select value as j from jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb)) value
  loop
    v_count := v_count + 1;
    insert into public."SalesReturnItem"
      (sales_return_id, product_id, qty, reason, item_price, subtotal, return_type, condition)
    values
      (v_ret_id,
       (v_item.j->>'product_id')::int,
       greatest((v_item.j->>'qty')::int, 1),
       coalesce(nullif(v_item.j->>'reason', ''), 'OTHER')::public."ReturnReason",
       coalesce((v_item.j->>'item_price')::numeric, 0),
       coalesce((v_item.j->>'item_price')::numeric, 0) * greatest((v_item.j->>'qty')::int, 1),
       case
         when (v_item.j->>'condition')::text = 'DAMAGED'
           or nullif(v_item.j->>'reason', '') = 'EXPIRED' then 'BAD'::public."ReturnType"
         else 'GOOD'::public."ReturnType"
       end,
       coalesce(nullif(v_item.j->>'condition', ''), 'GOOD')::public."ItemCondition");

    v_total := v_total + coalesce((v_item.j->>'item_price')::numeric, 0) * greatest((v_item.j->>'qty')::int, 1);
  end loop;

  update public."SalesReturn"
     set total_amount = v_total
   where id = v_ret_id;

  return jsonb_build_object('success', true, 'id', v_ret_id, 'code', v_code, 'total_amount', v_total, 'item_count', v_count);
exception
  when others then
    raise exception 'sales_return_submit failed: %', SQLERRM;
end;
$$;

drop function if exists public.sales_return_approve(integer);

create or replace function public.sales_return_approve(p_return_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_status public."ReturnStatus";
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'Only OWNER can approve return';
  end if;

  select status into v_status
  from public."SalesReturn"
  where id = p_return_id;

  if not found then
    raise exception 'Return % tidak ditemukan', p_return_id;
  end if;

  if v_status <> 'DRAFT' then
    raise exception 'Hanya return berstatus DRAFT yang dapat disetujui (saat ini %)', v_status;
  end if;

  update public."SalesReturn"
     set status = 'APPROVED'::public."ReturnStatus",
         updated_at = now()
   where id = p_return_id;

  return jsonb_build_object('success', true, 'id', p_return_id, 'status', 'APPROVED');
exception
  when others then
    raise exception 'sales_return_approve failed: %', SQLERRM;
end;
$$;

drop function if exists public.sales_return_receive(integer);

create or replace function public.sales_return_receive(p_return_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id  int := public.current_user_id();
  v_status   public."ReturnStatus";
  v_sales_id int;
  v_warung_id int;
  v_item     record;
  v_outlet_cur int;
  v_van_balance int;
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'Only OWNER can receive return';
  end if;

  select status, sales_id, warung_id into v_status, v_sales_id, v_warung_id
  from public."SalesReturn"
  where id = p_return_id;

  if not found then
    raise exception 'Return % tidak ditemukan', p_return_id;
  end if;

  if v_status not in ('DRAFT', 'APPROVED') then
    raise exception 'Return % sudah selesai/dibatalkan (status %)', p_return_id, v_status;
  end if;

  for v_item in
    select i.product_id, i.qty, i.return_type
    from public."SalesReturnItem" i
    where i.sales_return_id = p_return_id
    order by i.id
  loop
    select coalesce(current_stock, 0) into v_outlet_cur
    from public."OutletStockProjection"
    where warung_id = v_warung_id and product_id = v_item.product_id;

    insert into public."OutletStockLedger"
      (warung_id, product_id, movement_type, qty_before, qty_change, qty_after,
       reference_type, reference_id, created_by, notes)
    values
      (v_warung_id, v_item.product_id,
       case when v_item.return_type = 'GOOD' then 'RETURN_GOOD' else 'RETURN_BAD' end::public."OutletMovementType",
       v_outlet_cur, -v_item.qty, greatest(v_outlet_cur - v_item.qty, 0),
       'SalesReturn', p_return_id, v_user_id, null);

    select coalesce((
      select balance from public."SalesStockLedger"
      where sales_id = v_sales_id and product_id = v_item.product_id
      order by id desc
      limit 1
    ), 0) into v_van_balance;

    v_van_balance := v_van_balance + v_item.qty;

    insert into public."SalesStockLedger"
      (sales_id, product_id, movement_type, qty, balance, document_type, document_id, transaction_date)
    values
      (v_sales_id, v_item.product_id,
       case when v_item.return_type = 'GOOD' then 'SALE_RETURN_GOOD' else 'SALE_RETURN_DAMAGED' end::public."MovementType",
       v_item.qty, v_van_balance,
       'SalesReturn', p_return_id, current_date);

    update public."SalesStockProjection"
       set qty_available = qty_available + case when v_item.return_type = 'GOOD' then v_item.qty else 0 end,
           qty_damaged = qty_damaged + case when v_item.return_type = 'BAD' then v_item.qty else 0 end,
           last_update = now()
     where sales_id = v_sales_id
       and product_id = v_item.product_id;

    update public."OutletStockProjection"
       set current_stock = greatest(current_stock - v_item.qty, 0),
           total_return = total_return + v_item.qty,
           version = version + 1,
           updated_at = now()
     where warung_id = v_warung_id
       and product_id = v_item.product_id;
  end loop;

  update public."SalesReturn"
     set status = 'COMPLETED'::public."ReturnStatus",
         updated_at = now()
   where id = p_return_id;

  return jsonb_build_object('success', true, 'id', p_return_id, 'status', 'COMPLETED');
exception
  when others then
    raise exception 'sales_return_receive failed: %', SQLERRM;
end;
$$;

revoke execute on function public.sales_return_submit(jsonb) from public, anon;
grant execute on function public.sales_return_submit(jsonb) to authenticated;

revoke execute on function public.sales_return_approve(integer) from public, anon;
grant execute on function public.sales_return_approve(integer) to authenticated;

revoke execute on function public.sales_return_receive(integer) from public, anon;
grant execute on function public.sales_return_receive(integer) to authenticated;
