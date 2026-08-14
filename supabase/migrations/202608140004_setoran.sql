-- ============================================================================
-- Minuman @One - Setoran Kas (Cash deposit) migration
-- Date: 2026-08-14
-- Applies via: Supabase SQL Editor (or `npx supabase db push` after login).
--
-- Contents (all security definer, transactional):
--   1. get_setoran_summary(date)  - kas dibawa hari ini utk sales
--   2. sales_setoran_submit       - SALES: buat Collection PENDING + items utk
--                                    semua pembayaran CASH hari ini + tandai Payment
--   3. sales_setoran_verify       - OWNER: COMPLETED (FULL/PARTIAL) atau FAILED (NONE)
-- ============================================================================

drop function if exists public.get_setoran_summary(date);

create or replace function public.get_setoran_summary(p_date date)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id int := public.current_user_id();
  v_kas     numeric;
  v_count   int;
  v_submitted numeric;
  v_pending int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select coalesce(sum(p.amount), 0), count(*)
    into v_kas, v_count
  from public."Payment" p
  where p.created_by = v_user_id
    and p.payment_method = 'CASH'
    and p.payment_date = p_date
    and p.status = 'PAID'
    and p.collection_id is null;

  select coalesce(sum(p.amount), 0)
    into v_submitted
  from public."Payment" p
  where p.created_by = v_user_id
    and p.payment_method = 'CASH'
    and p.payment_date = p_date
    and p.status = 'PAID'
    and p.collection_id is not null;

  select count(*)
    into v_pending
  from public."Collection" c
  where c.sales_id = v_user_id
    and c.collection_date = p_date
    and c.status = 'PENDING';

  return jsonb_build_object(
    'kas_hari_ini', v_kas,
    'jumlah_transaksi', v_count,
    'sudah_disetor', v_submitted,
    'setoran_pending', v_pending > 0
  );
end;
$$;

drop function if exists public.sales_setoran_submit(date, text);

create or replace function public.sales_setoran_submit(p_date date, p_notes text default null)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id   int := public.current_user_id();
  v_code      text;
  v_col_id    int;
  v_total     numeric := 0;
  v_count     int := 0;
  v_tx        record;
  v_pending   int;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  select count(*) into v_pending
  from public."Collection" c
  where c.sales_id = v_user_id
    and c.collection_date = p_date
    and c.status = 'PENDING';

  if v_pending > 0 then
    raise exception 'Setoran hari ini sudah diajukan dan menunggu verifikasi';
  end if;

  perform 1 from public."Payment" p
  where p.created_by = v_user_id
    and p.payment_method = 'CASH'
    and p.payment_date = p_date
    and p.status = 'PAID'
    and p.collection_id is null
  limit 1;

  if not found then
    raise exception 'Tidak ada kas tunai yang belum disetor pada tanggal %', p_date;
  end if;

  v_code := public.next_document_number('Collection', 'SET-', to_char(p_date, 'YYYY'), to_char(p_date, 'MM'));

  insert into public."Collection"
    (code, sales_id, collection_date, status, notes)
  values
    (v_code, v_user_id, p_date, 'PENDING'::public."CollectionStatus", p_notes)
  returning id into v_col_id;

  for v_tx in
    select p.id as payment_id, p.amount, p.transaction_id,
           coalesce(t.grand_total, p.amount) as invoice_total,
           coalesce(t.outstanding_amount, 0) as outstanding_amount
    from public."Payment" p
    left join public."SalesTransaction" t on t.id = p.transaction_id
    where p.created_by = v_user_id
      and p.payment_method = 'CASH'
      and p.payment_date = p_date
      and p.status = 'PAID'
      and p.collection_id is null
    order by p.id
  loop
    insert into public."CollectionItem"
      (collection_id, sales_transaction_id, invoice_total, outstanding_before, payment_amount, outstanding_after)
    values
      (v_col_id, v_tx.transaction_id, v_tx.invoice_total,
       v_tx.outstanding_amount, v_tx.amount,
       greatest(v_tx.outstanding_amount - v_tx.amount, 0));

    update public."Payment"
       set collection_id = v_col_id
     where id = v_tx.payment_id;

    v_total := v_total + v_tx.amount;
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object(
    'success', true,
    'collection_id', v_col_id,
    'code', v_code,
    'total_amount', v_total,
    'item_count', v_count
  );
exception
  when others then
    raise exception 'sales_setoran_submit failed: %', SQLERRM;
end;
$$;

drop function if exists public.sales_setoran_verify(integer, text, text, text);
drop function if exists public.sales_setoran_verify(integer, text, text, text, numeric);

create or replace function public.sales_setoran_verify(
  p_collection_id   integer,
  p_result          text,
  p_failure_reason  text default null,
  p_notes           text default null,
  p_received_amount numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id  int := public.current_user_id();
  v_status   text;
  v_total    numeric;
  v_received numeric;
  v_running  numeric := 0;
  v_item     record;
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'Only OWNER can verify setoran';
  end if;

  if p_result not in ('FULL', 'PARTIAL', 'NONE') then
    raise exception 'Invalid result: %', p_result;
  end if;

  perform 1 from public."Collection" c
  where c.id = p_collection_id and c.status = 'PENDING';

  if not found then
    raise exception 'Collection % not found or not pending', p_collection_id;
  end if;

  select coalesce(sum(i.payment_amount), 0)
    into v_total
  from public."CollectionItem" i
  where i.collection_id = p_collection_id;

  v_received := coalesce(p_received_amount, v_total);

  if p_result = 'PARTIAL' then
    if v_received >= v_total then
      p_result := 'FULL';
    elsif v_received <= 0 then
      raise exception 'Received amount must be greater than 0 and less than total for PARTIAL result';
    end if;
  end if;

  if p_result = 'NONE' then
    v_status := 'FAILED';
  else
    v_status := 'COMPLETED';
  end if;

  update public."Collection"
     set status = v_status::public."CollectionStatus",
         result = p_result::public."CollectionResult",
         failure_reason = case when p_result = 'NONE' then p_failure_reason::public."CollectionFailureReason" else null end,
         notes = coalesce(p_notes, notes),
         updated_at = now()
   where id = p_collection_id;

  if p_result = 'NONE' then
    update public."Payment"
       set collection_id = null
     where collection_id = p_collection_id;
  else
    if p_result = 'PARTIAL' then
      for v_item in
        select i.id, i.payment_amount, i.sales_transaction_id
        from public."CollectionItem" i
        where i.collection_id = p_collection_id
        order by i.id
      loop
        if v_running + v_item.payment_amount <= v_received then
          v_running := v_running + v_item.payment_amount;
        else
          update public."Payment" p
             set collection_id = null
           where p.collection_id = p_collection_id
             and p.transaction_id in (
               select i2.sales_transaction_id
               from public."CollectionItem" i2
               where i2.collection_id = p_collection_id and i2.id >= v_item.id
             );
          delete from public."CollectionItem"
           where collection_id = p_collection_id and id >= v_item.id;
          exit;
        end if;
      end loop;
    end if;

    update public."Payment"
       set collected_by = v_user_id
     where collection_id = p_collection_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'collection_id', p_collection_id,
    'status', v_status,
    'result', p_result,
    'total_amount', v_total,
    'received_amount', case when p_result = 'PARTIAL' then v_received else v_total end
  );
exception
  when others then
    raise exception 'sales_setoran_verify failed: %', SQLERRM;
end;
$$;

revoke execute on function public.get_setoran_summary(date) from public, anon;
grant execute on function public.get_setoran_summary(date) to authenticated;

revoke execute on function public.sales_setoran_submit(date, text) from public, anon;
grant execute on function public.sales_setoran_submit(date, text) to authenticated;

revoke execute on function public.sales_setoran_verify(integer, text, text, text) from public, anon;
grant execute on function public.sales_setoran_verify(integer, text, text, text) to authenticated;
