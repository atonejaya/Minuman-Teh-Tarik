-- ============================================================================
-- Minuman @One - Sales Visit operations migration
-- Date: 2026-08-14
-- Applies via: Supabase SQL Editor (or `npx supabase db push` after login).
--
-- Contents (all security definer, transactional):
--   1. get_sales_visit_plan(date)      - assigned warungs for the day
--   2. visit_check_in                  - create visit CHECKED_IN + photo + activity
--   3. visit_save_stock_count          - OutletStockCount + auto SalesTransaction
--                                        + SalesReturn (expired) + ledgers
--   4. visit_record_payment            - Payment + Allocation + AR projection
--   5. visit_check_out                 - COMPLETED + REFILL ledgers + projection
-- ============================================================================

drop function if exists public.get_sales_visit_plan(date);

create or replace function public.get_sales_visit_plan(p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id  int := public.current_user_id();
  v_role     text := public.current_user_role();
  v_weekday  text := upper(trim(to_char(p_date, 'Day')));
  v_result   jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.visit_order, t.warung_name), '[]'::jsonb)
    into v_result
  from (
    select
      w.id as warung_id,
      w.code as warung_code,
      w.name as warung_name,
      w.address,
      w.latitude,
      w.longitude,
      w.target_cups,
      w.visit_order,
      su.name as sales_name,
      v.id as visit_id,
      v.status,
      v.check_in_time,
      v.check_out_time,
      coalesce(aps.outstanding_amount, 0) as outstanding_amount,
      coalesce(apc.last_visit_date, w.last_visit_date) as last_visit_date
    from public."Warung" w
    left join public."User" su on su.id = w.assigned_sales_id
    left join lateral (
      select sv.id, sv.status, sv.check_in_time, sv.check_out_time
      from public."SalesVisit" sv
      where sv.warung_id = w.id and sv.visit_date = p_date
      order by sv.id desc
      limit 1
    ) v on true
    left join lateral (
      select sum(outstanding_amount) as outstanding_amount
      from public."AccountsReceivableProjection"
      where customer_code = w.code
    ) aps on true
    left join public."CustomerARProjection" apc on apc.customer_code = w.code
    where w.status = 'ACTIVE'
      and w.deleted_at is null
      and (v_role = 'OWNER' or w.assigned_sales_id = v_user_id)
      and (w.visit_day is null or upper(trim(w.visit_day::text)) = v_weekday)
    order by w.visit_order nulls last, w.name
  ) t;

  return v_result;
end;
$$;

drop function if exists public.visit_check_in(integer, numeric, numeric, text, text, text);

create or replace function public.visit_check_in(
  p_warung_id     integer,
  p_latitude      numeric,
  p_longitude     numeric,
  p_opening_note  text,
  p_photo_path    text,
  p_photo_mime    text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id  int := public.current_user_id();
  v_visit_id int;
  v_code     text;
  v_existing int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select v.id into v_existing
  from public."SalesVisit" v
  where v.sales_id = v_user_id
    and v.warung_id = p_warung_id
    and v.visit_date = current_date
    and v.status <> 'CANCELLED'
  order by v.id desc
  limit 1;

  if v_existing is not null then
    return jsonb_build_object('success', true, 'visit_id', v_existing, 'code', (
      select code from public."SalesVisit" where id = v_existing
    ), 'existing', true);
  end if;

  v_code := public.next_document_number('SalesVisit', 'VIS-', to_char(current_date, 'YYYY'), to_char(current_date, 'MM'));

  insert into public."SalesVisit"
    (code, sales_id, warung_id, status, visit_date,
     check_in_time, check_in_latitude, check_in_longitude, opening_note,
     updated_at)
  values
    (v_code, v_user_id, p_warung_id, 'CHECKED_IN'::public."SalesVisitStatus", current_date,
     now(), p_latitude, p_longitude, p_opening_note,
     now())
  returning id into v_visit_id;

  insert into public."SalesVisitActivity"
    (visit_id, type, occurred_at, metadata, created_by)
  values
    (v_visit_id, 'CHECK_IN'::public."SalesVisitActivityType", now(),
     jsonb_build_object('latitude', p_latitude, 'longitude', p_longitude), v_user_id);

  if p_photo_path is not null and p_photo_path <> '' then
    insert into public."SalesVisitPhoto"
      (visit_id, filename, file_path, mime_type, captured_at, created_by)
    values
      (v_visit_id, 'checkin', p_photo_path, coalesce(p_photo_mime, 'image/jpeg'), now(), v_user_id);
  end if;

  return jsonb_build_object('success', true, 'visit_id', v_visit_id, 'code', v_code, 'existing', false);
exception
  when others then
    raise exception 'visit_check_in failed: %', SQLERRM;
end;
$$;

drop function if exists public.visit_save_stock_count(integer, jsonb);

create or replace function public.visit_save_stock_count(p_visit_id integer, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id   int := public.current_user_id();
  v_visit     record;
  v_item      record;
  v_count_id  int;
  v_tx_id     int := null;
  v_return_id int := null;
  v_batch_id  int;
  v_code      text;
  v_par       int;
  v_price     numeric;
  v_physical  int;
  v_expired   int;
  v_sold      int;
  v_opening   int;
  v_adjust    int;
  v_baseline_set boolean;
  v_sold_total numeric := 0;
  v_expired_total numeric := 0;
  v_sales_balance int;
  v_outlet_cur int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_visit
  from public."SalesVisit"
  where id = p_visit_id
  for update;

  if not found then
    raise exception 'Visit % not found', p_visit_id;
  end if;

  if v_visit.sales_id <> v_user_id and public.current_user_role() <> 'OWNER' then
    raise exception 'Not authorized';
  end if;

  if v_visit.status not in ('CHECKED_IN', 'PLANNED') then
    raise exception 'Visit status % does not allow stock count', v_visit.status;
  end if;

  insert into public."OutletStockCount"
    (warung_id, sales_id, visit_id, counted_at, created_by)
  values
    (v_visit.warung_id, v_visit.sales_id, v_visit.id, current_date, v_user_id)
  returning id into v_count_id;

  for v_item in
    select value as j from jsonb_array_elements(coalesce(p_items, '[]'::jsonb)) value
  loop
    v_physical := (v_item.j->>'physical_qty')::int;
    v_expired  := coalesce((v_item.j->>'expired_qty')::int, 0);

    insert into public."OutletStockCountItem"
      (stock_count_id, product_id, physical_qty)
    values
      (v_count_id, (v_item.j->>'product_id')::int, coalesce(v_physical, 0));

    select coalesce(op.par_qty, 0), coalesce(p.selling_price, 0)
      into v_par, v_price
    from public."Product" p
    left join public."OutletParStock" op
      on op.warung_id = v_visit.warung_id and op.product_id = p.id
    where p.id = (v_item.j->>'product_id')::int;

    v_par   := coalesce(v_par, 0);
    v_price := coalesce(v_price, 0);

    select coalesce(op.baseline_set, false), coalesce(op.opening_stock, 0)
      into v_baseline_set, v_opening
    from public."OutletStockProjection" op
    where op.warung_id = v_visit.warung_id and op.product_id = (v_item.j->>'product_id')::int;

    v_baseline_set := coalesce(v_baseline_set, false);
    v_opening      := coalesce(v_opening, 0);

    if not v_baseline_set then
      v_opening := coalesce((v_item.j->>'opening_qty')::int, v_physical);
      v_opening := greatest(v_opening, 0);
    end if;

    if v_expired > v_opening then
      raise exception 'Retur melebihi stok awal titipan % (stok awal %, rusak %)',
        (select name from public."Product" where id = (v_item.j->>'product_id')::int),
        v_opening, v_expired;
    end if;

    v_outlet_cur := v_opening;

    v_sold := 0;
    if v_physical <= v_opening then
      v_sold := greatest(v_opening - v_physical - v_expired, 0);
    end if;

    v_adjust := greatest(v_physical - v_opening, 0);
    if v_adjust > 0 then
      insert into public."OutletStockLedger"
        (warung_id, product_id, movement_type, qty_before, qty_change, qty_after,
         reference_type, reference_id, visit_id, created_by, notes)
      values
        (v_visit.warung_id, (v_item.j->>'product_id')::int,
         'ADJUSTMENT'::public."OutletMovementType", v_opening, v_adjust, v_physical,
         'SalesVisit', v_visit.id, v_visit.id, v_user_id, 'Stok lebih dari baseline');
    end if;

    if v_sold > 0 then
      if v_tx_id is null then
        v_code := public.next_document_number('SalesTransaction', 'SO-', to_char(current_date, 'YYYY'), to_char(current_date, 'MM'));

        insert into public."SalesTransaction"
          (code, visit_id, sales_id, warung_id, payment_method, payment_status, status,
           subtotal, item_discount, transaction_discount, tax, grand_total,
           paid_amount, outstanding_amount, due_date,
           customer_name, customer_code, customer_display_name, customer_address, customer_phone,
           salesman_name, salesman_code, version)
        values
          (v_code, v_visit.id, v_visit.sales_id, v_visit.warung_id,
           'CASH'::public."PaymentMethod", 'UNPAID'::public."PaymentStatus", 'CONFIRMED'::public."SalesTransactionStatus",
           0, 0, 0, 0, 0, 0, 0, null,
           (select name from public."Warung" w where w.id = v_visit.warung_id),
           (select code from public."Warung" w where w.id = v_visit.warung_id),
           (select name from public."Warung" w where w.id = v_visit.warung_id),
           (select address from public."Warung" w where w.id = v_visit.warung_id),
           (select phone from public."Warung" w where w.id = v_visit.warung_id),
           (select name from public."User" u where u.id = v_user_id),
           (select username from public."User" u where u.id = v_user_id),
           1)
        returning id into v_tx_id;
      end if;

      insert into public."SalesTransactionItem"
        (sales_transaction_id, product_id, qty, selling_price, discount, subtotal,
         product_code, product_name, display_name, sku, barcode, unit_name,
         unit_price, price_source, price_level_name, category_name, brand_name,
         packaging_name, is_manual_price, line_number, sort_order)
      select
        v_tx_id, p.id, v_sold, v_price, 0, v_sold * v_price,
        p.code, p.name, coalesce(p.display_name, p.name), p.sku, p.barcode, u.name,
        v_price, 'RETAIL'::public."PriceSource", null, pc.name, b.name,
        pk.name, false,
        (select count(*) from public."SalesTransactionItem" i where i.sales_transaction_id = v_tx_id) + 1,
        (select count(*) from public."SalesTransactionItem" i where i.sales_transaction_id = v_tx_id) + 1
      from public."Product" p
      left join public."ProductCategory" pc on pc.id = p.category_id
      left join public."Brand" b on b.id = p.brand_id
      left join public."Unit" u on u.id = p.unit_id
      left join public."Packaging" pk on pk.id = p.packaging_id
      where p.id = (v_item.j->>'product_id')::int;

      v_sold_total := v_sold_total + v_sold * v_price;

      insert into public."OutletStockLedger"
        (warung_id, product_id, movement_type, qty_before, qty_change, qty_after,
         reference_type, reference_id, visit_id, created_by, notes)
      values
        (v_visit.warung_id, (v_item.j->>'product_id')::int,
         'SALE', v_outlet_cur, -v_sold, v_outlet_cur - v_sold,
         'SalesTransaction', v_tx_id, v_visit.id, v_user_id, null);


    end if;

    if v_expired > 0 then
      if v_return_id is null then
        v_code := public.next_document_number('SalesReturn', 'SR-', to_char(current_date, 'YYYY'), to_char(current_date, 'MM'));

        insert into public."SalesReturn"
          (code, visit_id, sales_id, warung_id, transaction_id, status, return_date, total_amount, reference_type, updated_at)
        values
          (v_code, v_visit.id, v_visit.sales_id, v_visit.warung_id, v_tx_id,
           'COMPLETED'::public."ReturnStatus", current_date, 0,
           'SALES'::public."SalesReturnReferenceType", now())
        returning id into v_return_id;
      end if;

      select id into v_batch_id
      from public."ProductBatch"
      where product_id = (v_item.j->>'product_id')::int
      order by id
      limit 1;

      if v_batch_id is null then
        insert into public."ProductBatch"
          (product_id, batch_number, production_date, expired_at)
        values
          ((v_item.j->>'product_id')::int,
           'B-' || (v_item.j->>'product_id')::int || '-' || to_char(current_date, 'YYYYMMDD'),
           current_date, current_date)
        returning id into v_batch_id;
      end if;

      insert into public."SalesReturnItem"
        (sales_return_id, product_id, batch_id, qty, reason, item_price, subtotal, return_type, condition)
      values
        (v_return_id, (v_item.j->>'product_id')::int, v_batch_id, v_expired,
         'EXPIRED'::public."ReturnReason", v_price, v_expired * v_price,
         'BAD'::public."ReturnType", 'DAMAGED'::public."ItemCondition");

      v_expired_total := v_expired_total + v_expired * v_price;

      insert into public."OutletStockLedger"
        (warung_id, product_id, movement_type, qty_before, qty_change, qty_after,
         reference_type, reference_id, visit_id, created_by, notes)
      values
        (v_visit.warung_id, (v_item.j->>'product_id')::int,
         'RETURN_BAD', v_outlet_cur - v_sold, -v_expired, v_outlet_cur - v_sold - v_expired,
         'SalesReturn', v_return_id, v_visit.id, v_user_id, 'Expired');



      begin
        insert into public."SalesStockProjection" (sales_id, product_id, qty_available, qty_damaged, qty_expired, last_update)
        values (v_visit.sales_id, (v_item.j->>'product_id')::int, 0, 0, v_expired, now());
      exception
        when unique_violation then
          update public."SalesStockProjection"
             set qty_expired = qty_expired + v_expired,
                 last_update = now()
           where sales_id = v_visit.sales_id
             and product_id = (v_item.j->>'product_id')::int;
      end;
    end if;

    if v_sold > 0 or v_expired > 0 or v_adjust > 0 or not v_baseline_set then
      begin
        insert into public."OutletStockProjection" (warung_id, product_id, current_stock, par_qty, opening_stock, total_refill, total_sales, total_return, calculated_sales, required_refill, average_daily_sales, sell_through, last_visit_id, last_count_at, version, updated_at, baseline_set)
        values (v_visit.warung_id, (v_item.j->>'product_id')::int, v_physical, v_par, v_opening, 0, v_sold, v_expired, v_sold, greatest(v_opening - v_physical, 0), 0, 0, v_visit.id, now(), 1, now(), true);
      exception
        when unique_violation then
          update public."OutletStockProjection"
             set current_stock = v_physical,
                 par_qty = v_par,
                 opening_stock = v_opening,
                 total_sales = total_sales + v_sold,
                 calculated_sales = calculated_sales + v_sold,
                 total_return = total_return + v_expired,
                 required_refill = greatest(v_opening - v_physical, 0),
                 last_visit_id = v_visit.id,
                 last_count_at = now(),
                 version = version + 1,
                 baseline_set = true,
                 updated_at = now()
           where warung_id = v_visit.warung_id
             and product_id = (v_item.j->>'product_id')::int;
      end;
    end if;
  end loop;

  if v_tx_id is not null then
    update public."SalesTransaction"
       set subtotal = v_sold_total,
           grand_total = v_sold_total,
           outstanding_amount = v_sold_total,
           outstanding_total = v_sold_total
     where id = v_tx_id;
  end if;

  if v_return_id is not null then
    update public."SalesReturn" set total_amount = v_expired_total where id = v_return_id;
  end if;

  update public."SalesVisit"
     set status = 'STOCK_COUNTED'::public."SalesVisitStatus",
         updated_at = now()
   where id = p_visit_id;

  insert into public."SalesVisitActivity"
    (visit_id, type, occurred_at, metadata, created_by)
  values
    (p_visit_id, 'STOCK_COUNT'::public."SalesVisitActivityType", now(),
     jsonb_build_object('stock_count_id', v_count_id, 'transaction_id', v_tx_id), v_user_id);

  return jsonb_build_object(
    'success', true,
    'stock_count_id', v_count_id,
    'transaction_id', v_tx_id,
    'return_id', v_return_id,
    'grand_total', v_sold_total
  );
exception
  when others then
    raise exception 'visit_save_stock_count failed: %', SQLERRM;
end;
$$;

drop function if exists public.visit_record_payment(integer, text, numeric);

create or replace function public.visit_record_payment(
  p_visit_id         integer,
  p_payment_method   text,
  p_amount           numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id  int := public.current_user_id();
  v_visit    record;
  v_tx       record;
  v_pay_id   int;
  v_pay_code text;
  v_outstanding numeric;
  v_status   text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if p_payment_method not in ('CASH', 'QRIS', 'TRANSFER', 'CREDIT') then
    raise exception 'Invalid payment method %', p_payment_method;
  end if;

  select * into v_visit
  from public."SalesVisit"
  where id = p_visit_id
  for update;

  if not found then
    raise exception 'Visit % not found', p_visit_id;
  end if;

  if v_visit.sales_id <> v_user_id and public.current_user_role() <> 'OWNER' then
    raise exception 'Not authorized';
  end if;

  select * into v_tx
  from public."SalesTransaction"
  where visit_id = p_visit_id
  order by id desc
  limit 1;

  if v_tx.id is null then
    raise exception 'No sales transaction found for this visit';
  end if;

  if v_tx.status = 'CANCELLED' then
    raise exception 'Transaction is cancelled';
  end if;

  if p_payment_method = 'CREDIT' then
    update public."SalesTransaction"
       set payment_method = 'CREDIT'::public."PaymentMethod",
           payment_status = 'UNPAID'::public."PaymentStatus",
           paid_amount = 0,
           outstanding_amount = grand_total,
           paid_total = 0,
           outstanding_total = grand_total,
           due_date = current_date + coalesce((select payment_term from public."Warung" where id = v_tx.warung_id), 7),
           version = version + 1
     where id = v_tx.id;

    begin
      insert into public."AccountsReceivableProjection"
        (sales_transaction_id, invoice_number, customer_code, customer_name,
         invoice_amount, paid_amount, outstanding_amount, due_date, status,
         last_invoice_date, updated_at)
      values
        (v_tx.id, v_tx.code,
         (select code from public."Warung" where id = v_tx.warung_id),
         (select name from public."Warung" where id = v_tx.warung_id),
         v_tx.grand_total, 0, v_tx.grand_total,
         current_date + coalesce((select payment_term from public."Warung" where id = v_tx.warung_id), 7),
         'UNPAID'::public."PaymentStatus", current_date, now());
    exception
      when unique_violation then
        update public."AccountsReceivableProjection"
           set invoice_amount = v_tx.grand_total,
               outstanding_amount = v_tx.grand_total,
               paid_amount = 0,
               status = 'UNPAID'::public."PaymentStatus",
               due_date = current_date + coalesce((select payment_term from public."Warung" where id = v_tx.warung_id), 7),
               updated_at = now()
         where sales_transaction_id = v_tx.id;
    end;

    v_status := 'UNPAID';
  else
    if p_amount is null or p_amount <= 0 then
      raise exception 'Payment amount is required';
    end if;

    if p_amount > v_tx.grand_total then
      raise exception 'Pembayaran (Rp %) tidak boleh melebihi tagihan (Rp %)', p_amount, v_tx.grand_total;
    end if;

    v_pay_code := public.next_document_number('Payment', 'PAY-', to_char(current_date, 'YYYY'), to_char(current_date, 'MM'));

    insert into public."Payment"
      (code, transaction_id, payment_date, payment_method, amount, status, created_by, receipt_number)
    values
      (v_pay_code, v_tx.id, current_date, p_payment_method::public."PaymentMethod",
       p_amount, 'PAID'::public."PaymentStatus", v_user_id, v_tx.code)
    returning id into v_pay_id;

    insert into public."PaymentAllocation"
      (payment_id, sales_transaction_id, allocated_amount)
    values
      (v_pay_id, v_tx.id, p_amount);

    v_outstanding := greatest(v_tx.grand_total - p_amount, 0);

    if v_outstanding <= 0 then
      v_status := 'PAID';
    elsif p_amount < v_tx.grand_total then
      v_status := 'PARTIALLY_PAID';
    else
      v_status := 'OVERPAID';
    end if;

    update public."SalesTransaction"
       set payment_method = p_payment_method::public."PaymentMethod",
           payment_status = v_status::public."PaymentStatus",
           paid_amount = greatest(coalesce(paid_amount, 0) + p_amount, 0),
           outstanding_amount = greatest(v_outstanding, 0),
           paid_total = greatest(coalesce(paid_total, 0) + p_amount, 0),
           outstanding_total = greatest(v_outstanding, 0),
           version = version + 1
     where id = v_tx.id;
  end if;

  update public."SalesVisit"
     set status = 'DELIVERED'::public."SalesVisitStatus",
         updated_at = now()
   where id = p_visit_id;

  insert into public."SalesVisitActivity"
    (visit_id, type, occurred_at, metadata, created_by)
  values
    (p_visit_id, 'DELIVERED'::public."SalesVisitActivityType", now(),
     jsonb_build_object('payment_method', p_payment_method, 'amount', p_amount, 'payment_status', v_status, 'transaction_id', v_tx.id),
     v_user_id);

  return jsonb_build_object(
    'success', true,
    'visit_id', p_visit_id,
    'transaction_id', v_tx.id,
    'payment_id', v_pay_id,
    'payment_status', v_status
  );
exception
  when others then
    raise exception 'visit_record_payment failed: %', SQLERRM;
end;
$$;

drop function if exists public.visit_check_out(integer, numeric, numeric, text, text, text);

create or replace function public.visit_check_out(
  p_visit_id       integer,
  p_latitude       numeric,
  p_longitude      numeric,
  p_closing_note   text,
  p_photo_path     text,
  p_photo_mime     text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id   int := public.current_user_id();
  v_visit     record;
  v_count_id  int;
  v_item      record;
  v_par       int;
  v_physical  int;
  v_refill    int;
  v_sales_balance int;
  v_duration  int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select * into v_visit
  from public."SalesVisit"
  where id = p_visit_id
  for update;

  if not found then
    raise exception 'Visit % not found', p_visit_id;
  end if;

  if v_visit.sales_id <> v_user_id and public.current_user_role() <> 'OWNER' then
    raise exception 'Not authorized';
  end if;

  v_duration := coalesce(extract(epoch from (now() - v_visit.check_in_time))::int, 0);

  update public."SalesVisit"
     set status = 'COMPLETED'::public."SalesVisitStatus",
         check_out_time = now(),
         check_out_latitude = p_latitude,
         check_out_longitude = p_longitude,
         closing_note = p_closing_note,
         duration_seconds = v_duration,
         updated_at = now()
   where id = p_visit_id;

  insert into public."SalesVisitActivity"
    (visit_id, type, occurred_at, metadata, created_by)
  values
    (p_visit_id, 'CHECK_OUT'::public."SalesVisitActivityType", now(),
     jsonb_build_object('latitude', p_latitude, 'longitude', p_longitude), v_user_id);

  insert into public."SalesVisitActivity"
    (visit_id, type, occurred_at, metadata, created_by)
  values
    (p_visit_id, 'COMPLETED'::public."SalesVisitActivityType", now(), null, v_user_id);

  if p_photo_path is not null and p_photo_path <> '' then
    insert into public."SalesVisitPhoto"
      (visit_id, filename, file_path, mime_type, captured_at, created_by)
    values
      (p_visit_id, 'checkout', p_photo_path, coalesce(p_photo_mime, 'image/jpeg'), now(), v_user_id);
  end if;

  select id into v_count_id
  from public."OutletStockCount"
  where visit_id = p_visit_id
  order by id desc
  limit 1;

  if v_count_id is not null then
    for v_item in
      select i.product_id, i.physical_qty, coalesce(op.opening_stock, 0) as baseline_qty
      from public."OutletStockCountItem" i
      left join public."OutletStockProjection" op
        on op.warung_id = v_visit.warung_id and op.product_id = i.product_id
      where i.stock_count_id = v_count_id
      order by i.id
    loop
      v_physical := coalesce(v_item.physical_qty, 0);
      v_par      := v_item.baseline_qty;
      v_refill   := greatest(v_par - v_physical, 0);

      if v_refill > 0 then
        insert into public."OutletStockLedger"
          (warung_id, product_id, movement_type, qty_before, qty_change, qty_after,
           reference_type, reference_id, visit_id, created_by, notes)
        values
          (v_visit.warung_id, v_item.product_id,
           'REFILL', v_physical, v_refill, v_par,
           'SalesVisit', v_visit.id, v_visit.id, v_user_id, null);

        select coalesce((
          select balance from public."SalesStockLedger"
          where sales_id = v_visit.sales_id and product_id = v_item.product_id
          order by id desc
          limit 1
        ), 0) into v_sales_balance;

        if v_sales_balance < v_refill then
          raise exception 'Stok kendaraan tidak cukup: % (butuh % , tersedia %)',
            (select name from public."Product" where id = v_item.product_id),
            v_refill, v_sales_balance;
        end if;

        v_sales_balance := v_sales_balance - v_refill;

        insert into public."SalesStockLedger"
          (sales_id, product_id, movement_type, qty, balance, document_type, document_id, transaction_date)
        values
          (v_visit.sales_id, v_item.product_id,
           'RESTOCK_OUTLET'::public."MovementType", v_refill, v_sales_balance,
           'SalesVisit', v_visit.id, current_date);

        update public."SalesStockProjection"
           set qty_available = greatest(qty_available - v_refill, 0),
               last_update = now()
         where sales_id = v_visit.sales_id
           and product_id = v_item.product_id;

        update public."OutletStockProjection"
           set current_stock = v_par,
               total_refill = total_refill + v_refill,
               required_refill = 0,
               last_visit_id = v_visit.id,
               last_refill_at = now(),
               last_count_at = now(),
               version = version + 1,
               updated_at = now()
         where warung_id = v_visit.warung_id
           and product_id = v_item.product_id;
      end if;
    end loop;
  end if;

  update public."CustomerARProjection"
     set last_visit_date = current_date
   where customer_code = (select code from public."Warung" where id = v_visit.warung_id);

  update public."Warung"
     set last_visit_date = current_date,
         updated_at = now()
   where id = v_visit.warung_id;

  return jsonb_build_object('success', true, 'visit_id', p_visit_id, 'status', 'COMPLETED');
exception
  when others then
    raise exception 'visit_check_out failed: %', SQLERRM;
end;
$$;

revoke execute on function public.get_sales_visit_plan(date) from public, anon;
grant execute on function public.get_sales_visit_plan(date) to authenticated;

revoke execute on function public.visit_check_in(integer, numeric, numeric, text, text, text) from public, anon;
grant execute on function public.visit_check_in(integer, numeric, numeric, text, text, text) to authenticated;

revoke execute on function public.visit_save_stock_count(integer, jsonb) from public, anon;
grant execute on function public.visit_save_stock_count(integer, jsonb) to authenticated;

revoke execute on function public.visit_record_payment(integer, text, numeric) from public, anon;
grant execute on function public.visit_record_payment(integer, text, numeric) to authenticated;

revoke execute on function public.visit_check_out(integer, numeric, numeric, text, text, text) from public, anon;
grant execute on function public.visit_check_out(integer, numeric, numeric, text, text, text) to authenticated;
