-- ============================================================================
-- Minuman @One - Foundation migration
-- Date: 2026-08-14
-- Applies via: Supabase SQL Editor (or `npx supabase db push` after login).
--
-- Contents:
--   1. Helper functions (current_user_role / current_user_id / access checks)
--   2. Document number generation via NumberSequence
--   3. RLS enable + policies (OWNER full, SALES self-scoped)
--   4. Fix get_dashboard_metrics (broken: referenced non-existent total_amount)
--   5. create_sales_transaction RPC (header + items + ledger-safe, definer)
--   6. Storage bucket visit-photos + object policies
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Helpers
-- ---------------------------------------------------------------------------

-- Role of the authenticated app user (map auth.uid() -> User.role).
-- SECURITY DEFINER so it bypasses RLS on "User" (avoids recursion in policies).
-- ADMIN is treated as OWNER-equivalent for authorization (owner-level back office).
-- NOTE: role column is a UserRole enum that may not contain 'ADMIN'; compare via
-- text cast to avoid enum-coercion errors (22P02). To actually create ADMIN
-- accounts, run first (once, standalone):  alter type public."UserRole" add value if not exists 'ADMIN';
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case when u.role::text = 'ADMIN' then 'OWNER'::text else u.role::text end
  from public."User" u
  where u.auth_id = auth.uid()
  limit 1;
$$;

-- App user id of the authenticated JWT (User.id, integer).
create or replace function public.current_user_id()
returns integer
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select u.id
  from public."User" u
  where u.auth_id = auth.uid()
  limit 1;
$$;

-- Scoped access checks used by child-table RLS policies.
create or replace function public.user_can_access_visit(p_id integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public."SalesVisit" v
    where v.id = p_id
      and (public.current_user_role() = 'OWNER' or v.sales_id = public.current_user_id())
  );
$$;

create or replace function public.user_can_access_transaction(p_id integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public."SalesTransaction" t
    where t.id = p_id
      and (public.current_user_role() = 'OWNER' or t.sales_id = public.current_user_id())
  );
$$;

create or replace function public.user_can_access_return(p_id integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public."SalesReturn" r
    where r.id = p_id
      and (public.current_user_role() = 'OWNER' or r.sales_id = public.current_user_id())
  );
$$;

create or replace function public.user_can_access_issue(p_id integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public."SalesStockIssue" i
    where i.id = p_id
      and (public.current_user_role() = 'OWNER' or i.sales_id = public.current_user_id())
  );
$$;

-- Sales may read anything for a warung assigned to them.
create or replace function public.user_can_access_warung(p_id integer)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.current_user_role() = 'OWNER'
      or exists (
        select 1 from public."Warung" w
        where w.id = p_id and w.assigned_sales_id = public.current_user_id()
      );
$$;

-- ---------------------------------------------------------------------------
-- 2. Document number generation
-- ---------------------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public."NumberSequence"'::regclass and contype = 'p'
  ) then
    alter table public."NumberSequence" add constraint number_sequence_pkey primary key (id);
  end if;
end $$;

drop function if exists public.next_document_number(text, text, text, text);

create or replace function public.next_document_number(
  p_seq    text,
  p_prefix text,
  p_year   text,
  p_month  text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_key  text := p_seq || ':' || p_year || ':' || p_month;
  v_next bigint;
begin
  insert into public."NumberSequence" (id, last_value, updated_at)
  values (v_key, 1, now())
  on conflict (id) do update
    set last_value = public."NumberSequence".last_value + 1,
        updated_at = now()
  returning last_value into v_next;

  return p_prefix || p_year || p_month || lpad(v_next::text, 4, '0');
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. RLS enable + policies
-- ---------------------------------------------------------------------------

-- ---- Master data: readable by all authenticated; written by OWNER ----
do $$
declare
  t text;
begin
  foreach t in array array[
    'Warung','Product','ProductCategory','Brand','Unit','PriceLevel','Warehouse',
    'Route','Area','Supplier','Tax','Packaging','Regional'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists p_%s_select_auth on public.%I', t, t);
    execute format(
      'create policy p_%s_select_auth on public.%I for select to authenticated using (true)',
      t, t
    );
    execute format('drop policy if exists p_%s_write_owner on public.%I', t, t);
    execute format(
      'create policy p_%s_write_owner on public.%I for all to authenticated using (public.current_user_role() = ''OWNER'') with check (public.current_user_role() = ''OWNER'')',
      t, t
    );
  end loop;
end $$;

-- ---- User: self-read (any role), write OWNER ----
alter table public."User" enable row level security;

drop policy if exists p_User_select on public."User";
create policy p_User_select on public."User"
  for select to authenticated
  using (auth_id = auth.uid() or public.current_user_role() = 'OWNER');

drop policy if exists p_User_write_owner on public."User";
create policy p_User_write_owner on public."User"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

-- ---- SalesVisit: OWNER all, SALES own ----
alter table public."SalesVisit" enable row level security;

drop policy if exists p_SalesVisit_select on public."SalesVisit";
create policy p_SalesVisit_select on public."SalesVisit"
  for select to authenticated
  using (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_SalesVisit_insert_sales on public."SalesVisit";
create policy p_SalesVisit_insert_sales on public."SalesVisit"
  for insert to authenticated
  with check (public.current_user_role() = 'OWNER'
    or sales_id = public.current_user_id());

drop policy if exists p_SalesVisit_update on public."SalesVisit";
create policy p_SalesVisit_update on public."SalesVisit"
  for update to authenticated
  using (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id())
  with check (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_SalesVisit_delete_owner on public."SalesVisit";
create policy p_SalesVisit_delete_owner on public."SalesVisit"
  for delete to authenticated
  using (public.current_user_role() = 'OWNER');

-- ---- Visit children (photo / activity / stock count) ----
do $$
declare
  t text;
  v_col text;
begin
  foreach t in array array['SalesVisitPhoto', 'SalesVisitActivity', 'OutletStockCount']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists p_%s_select on public.%I', t, t);
    execute format(
      'create policy p_%s_select on public.%I for select to authenticated using (public.user_can_access_visit(visit_id))',
      t, t
    );
    execute format('drop policy if exists p_%s_insert on public.%I', t, t);
    execute format(
      'create policy p_%s_insert on public.%I for insert to authenticated with check (public.user_can_access_visit(visit_id))',
      t, t
    );
    execute format('drop policy if exists p_%s_write_owner on public.%I', t, t);
    execute format(
      'create policy p_%s_write_owner on public.%I for update to authenticated using (public.current_user_role() = ''OWNER'') with check (public.current_user_role() = ''OWNER'')',
      t, t
    );
  end loop;

  -- OutletStockCountItem scopes via parent OutletStockCount
  execute format('alter table public."OutletStockCountItem" enable row level security');
  execute format('drop policy if exists p_OutletStockCountItem_select on public."OutletStockCountItem"');
  execute format(
    'create policy p_OutletStockCountItem_select on public."OutletStockCountItem" for select to authenticated using (exists (select 1 from public."OutletStockCount" c where c.id = stock_count_id and public.user_can_access_visit(c.visit_id)))'
  );
  execute format('drop policy if exists p_OutletStockCountItem_insert on public."OutletStockCountItem"');
  execute format(
    'create policy p_OutletStockCountItem_insert on public."OutletStockCountItem" for insert to authenticated with check (exists (select 1 from public."OutletStockCount" c where c.id = stock_count_id and public.user_can_access_visit(c.visit_id)))'
  );
end $$;

-- ---- OutletParStock: sales scoped to assigned warung, OWNER all ----
alter table public."OutletParStock" enable row level security;

drop policy if exists p_OutletParStock_select on public."OutletParStock";
create policy p_OutletParStock_select on public."OutletParStock"
  for select to authenticated
  using (public.current_user_role() = 'OWNER' or public.user_can_access_warung(warung_id));

drop policy if exists p_OutletParStock_write_owner on public."OutletParStock";
create policy p_OutletParStock_write_owner on public."OutletParStock"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

-- ---- SalesStockIssue tree: OWNER all, SALES own ----
do $$
declare
  t text;
begin
  foreach t in array array['SalesStockIssue', 'SalesStockIssueItem', 'SalesStockIssueHistory']
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

drop policy if exists p_SalesStockIssue_select on public."SalesStockIssue";
create policy p_SalesStockIssue_select on public."SalesStockIssue"
  for select to authenticated
  using (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_SalesStockIssue_write_owner on public."SalesStockIssue";
create policy p_SalesStockIssue_write_owner on public."SalesStockIssue"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_SalesStockIssueItem_select on public."SalesStockIssueItem";
create policy p_SalesStockIssueItem_select on public."SalesStockIssueItem"
  for select to authenticated
  using (public.user_can_access_issue(issue_id));

drop policy if exists p_SalesStockIssueItem_write_owner on public."SalesStockIssueItem";
create policy p_SalesStockIssueItem_write_owner on public."SalesStockIssueItem"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_SalesStockIssueHistory_select on public."SalesStockIssueHistory";
create policy p_SalesStockIssueHistory_select on public."SalesStockIssueHistory"
  for select to authenticated
  using (public.user_can_access_issue(issue_id));

drop policy if exists p_SalesStockIssueHistory_write_owner on public."SalesStockIssueHistory";
create policy p_SalesStockIssueHistory_write_owner on public."SalesStockIssueHistory"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

-- ---- SalesTransaction tree ----
alter table public."SalesTransaction" enable row level security;

drop policy if exists p_SalesTransaction_select on public."SalesTransaction";
create policy p_SalesTransaction_select on public."SalesTransaction"
  for select to authenticated
  using (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_SalesTransaction_insert on public."SalesTransaction";
create policy p_SalesTransaction_insert on public."SalesTransaction"
  for insert to authenticated
  with check (public.current_user_role() = 'OWNER'
    or sales_id = public.current_user_id());

drop policy if exists p_SalesTransaction_update on public."SalesTransaction";
create policy p_SalesTransaction_update on public."SalesTransaction"
  for update to authenticated
  using (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id())
  with check (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_SalesTransaction_delete_owner on public."SalesTransaction";
create policy p_SalesTransaction_delete_owner on public."SalesTransaction"
  for delete to authenticated
  using (public.current_user_role() = 'OWNER');

alter table public."SalesTransactionItem" enable row level security;

drop policy if exists p_SalesTransactionItem_select on public."SalesTransactionItem";
create policy p_SalesTransactionItem_select on public."SalesTransactionItem"
  for select to authenticated
  using (public.user_can_access_transaction(sales_transaction_id));

drop policy if exists p_SalesTransactionItem_write_owner on public."SalesTransactionItem";
create policy p_SalesTransactionItem_write_owner on public."SalesTransactionItem"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

-- ---- SalesReturn tree ----
alter table public."SalesReturn" enable row level security;

drop policy if exists p_SalesReturn_select on public."SalesReturn";
create policy p_SalesReturn_select on public."SalesReturn"
  for select to authenticated
  using (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_SalesReturn_insert on public."SalesReturn";
create policy p_SalesReturn_insert on public."SalesReturn"
  for insert to authenticated
  with check (public.current_user_role() = 'OWNER'
    or sales_id = public.current_user_id());

drop policy if exists p_SalesReturn_write_owner on public."SalesReturn";
create policy p_SalesReturn_write_owner on public."SalesReturn"
  for update to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_SalesReturn_delete_owner on public."SalesReturn";
create policy p_SalesReturn_delete_owner on public."SalesReturn"
  for delete to authenticated
  using (public.current_user_role() = 'OWNER');

alter table public."SalesReturnItem" enable row level security;

drop policy if exists p_SalesReturnItem_select on public."SalesReturnItem";
create policy p_SalesReturnItem_select on public."SalesReturnItem"
  for select to authenticated
  using (public.user_can_access_return(sales_return_id));

drop policy if exists p_SalesReturnItem_insert on public."SalesReturnItem";
create policy p_SalesReturnItem_insert on public."SalesReturnItem"
  for insert to authenticated
  with check (exists (
    select 1 from public."SalesReturn" r
    where r.id = sales_return_id
      and (public.current_user_role() = 'OWNER' or r.sales_id = public.current_user_id())
  ));

drop policy if exists p_SalesReturnItem_write_owner on public."SalesReturnItem";
create policy p_SalesReturnItem_write_owner on public."SalesReturnItem"
  for update to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

-- ---- Payment + PaymentAllocation ----
alter table public."Payment" enable row level security;

drop policy if exists p_Payment_select on public."Payment";
create policy p_Payment_select on public."Payment"
  for select to authenticated
  using (public.user_can_access_transaction(transaction_id) or public.current_user_role() = 'OWNER');

drop policy if exists p_Payment_insert on public."Payment";
create policy p_Payment_insert on public."Payment"
  for insert to authenticated
  with check (public.current_user_role() = 'OWNER'
    or exists (select 1 from public."SalesTransaction" t where t.id = transaction_id and t.sales_id = public.current_user_id()));

drop policy if exists p_Payment_write_owner on public."Payment";
create policy p_Payment_write_owner on public."Payment"
  for update to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

alter table public."PaymentAllocation" enable row level security;

drop policy if exists p_PaymentAllocation_select on public."PaymentAllocation";
create policy p_PaymentAllocation_select on public."PaymentAllocation"
  for select to authenticated
  using (exists (select 1 from public."Payment" pay where pay.id = payment_id and (public.current_user_role() = 'OWNER' or exists (select 1 from public."SalesTransaction" t where t.id = pay.transaction_id and t.sales_id = public.current_user_id()))));

drop policy if exists p_PaymentAllocation_write_owner on public."PaymentAllocation";
create policy p_PaymentAllocation_write_owner on public."PaymentAllocation"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

-- ---- Collection (setoran kas): OWNER all, SALES own ----
alter table public."Collection" enable row level security;

drop policy if exists p_Collection_select on public."Collection";
create policy p_Collection_select on public."Collection"
  for select to authenticated
  using (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_Collection_insert on public."Collection";
create policy p_Collection_insert on public."Collection"
  for insert to authenticated
  with check (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_Collection_write_owner on public."Collection";
create policy p_Collection_write_owner on public."Collection"
  for update to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

alter table public."CollectionItem" enable row level security;

drop policy if exists p_CollectionItem_select on public."CollectionItem";
create policy p_CollectionItem_select on public."CollectionItem"
  for select to authenticated
  using (exists (select 1 from public."Collection" c where c.id = collection_id and (public.current_user_role() = 'OWNER' or c.sales_id = public.current_user_id())));

drop policy if exists p_CollectionItem_write_owner on public."CollectionItem";
create policy p_CollectionItem_write_owner on public."CollectionItem"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

-- ---- Ledgers & projections: OWNER all; SALES self-scoped where possible ----
alter table public."WarehouseStock" enable row level security;
alter table public."WarehouseLedger" enable row level security;
alter table public."SalesStockLedger" enable row level security;
alter table public."SalesStockProjection" enable row level security;
alter table public."OutletStockLedger" enable row level security;
alter table public."OutletStockProjection" enable row level security;
alter table public."AccountsReceivableProjection" enable row level security;
alter table public."CustomerARProjection" enable row level security;
alter table public."ARLedger" enable row level security;
alter table public."NumberSequence" enable row level security;
alter table public."FinanceIdempotencyKey" enable row level security;

drop policy if exists p_WarehouseStock_owner on public."WarehouseStock";
create policy p_WarehouseStock_owner on public."WarehouseStock"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_WarehouseLedger_owner on public."WarehouseLedger";
create policy p_WarehouseLedger_owner on public."WarehouseLedger"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_SalesStockLedger_select on public."SalesStockLedger";
create policy p_SalesStockLedger_select on public."SalesStockLedger"
  for select to authenticated
  using (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_SalesStockLedger_owner on public."SalesStockLedger";
create policy p_SalesStockLedger_owner on public."SalesStockLedger"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_SalesStockProjection_select on public."SalesStockProjection";
create policy p_SalesStockProjection_select on public."SalesStockProjection"
  for select to authenticated
  using (public.current_user_role() = 'OWNER' or sales_id = public.current_user_id());

drop policy if exists p_SalesStockProjection_owner on public."SalesStockProjection";
create policy p_SalesStockProjection_owner on public."SalesStockProjection"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_OutletStockLedger_owner on public."OutletStockLedger";
create policy p_OutletStockLedger_owner on public."OutletStockLedger"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_OutletStockProjection_owner on public."OutletStockProjection";
create policy p_OutletStockProjection_owner on public."OutletStockProjection"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_AR_owner on public."AccountsReceivableProjection";
create policy p_AR_owner on public."AccountsReceivableProjection"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_CustomerAR_owner on public."CustomerARProjection";
create policy p_CustomerAR_owner on public."CustomerARProjection"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_ARLedger_owner on public."ARLedger";
create policy p_ARLedger_owner on public."ARLedger"
  for all to authenticated
  using (public.current_user_role() = 'OWNER')
  with check (public.current_user_role() = 'OWNER');

drop policy if exists p_NumberSequence_rpc on public."NumberSequence";
create policy p_NumberSequence_rpc on public."NumberSequence"
  for all to authenticated
  using (false)
  with check (false);

drop policy if exists p_FinanceIdempotency_rpc on public."FinanceIdempotencyKey";
create policy p_FinanceIdempotency_rpc on public."FinanceIdempotencyKey"
  for all to authenticated
  using (false)
  with check (false);

-- ---------------------------------------------------------------------------
-- 4. Fix get_dashboard_metrics
--    Old version referenced "total_amount" which does not exist on
--    SalesTransaction (actual column: grand_total / created_at).
-- ---------------------------------------------------------------------------

drop function if exists public.get_dashboard_metrics();

create or replace function public.get_dashboard_metrics()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'omzet_hari_ini', coalesce((select sum(grand_total) from public."SalesTransaction" where created_at::date = current_date and status <> 'CANCELLED'), 0),
    'omzet_bulan_ini', coalesce((select sum(grand_total) from public."SalesTransaction" where date_trunc('month', created_at) = date_trunc('month', current_date) and status <> 'CANCELLED'), 0),
    'total_piutang', coalesce((select sum(outstanding_amount) from public."AccountsReceivableProjection"), 0),
    'pembayaran_hari_ini', coalesce((select sum(amount) from public."Payment" where payment_date = current_date), 0),
    'stok_warehouse', coalesce((select sum(qty_available) from public."WarehouseStock"), 0),
    'visit_hari_ini', (select count(*) from public."SalesVisit" where visit_date = current_date),
    'transaksi_hari_ini', (select count(*) from public."SalesTransaction" where created_at::date = current_date and status <> 'CANCELLED')
  );
$$;

-- ---------------------------------------------------------------------------
-- 5. create_sales_transaction
--    Security definer + transactional: header, items, auto payment, AR
--    projection. No ledger mutation (manual sales entry); visit flow RPCs in
--    later migrations post stock ledgers.
-- ---------------------------------------------------------------------------

drop function if exists public.create_sales_transaction(jsonb);

create or replace function public.create_sales_transaction(p_payload jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id     int := public.current_user_id();
  v_warung_id   int := (p_payload->>'warung_id')::int;
  v_date        date := coalesce(nullif(p_payload->>'transaction_date','')::date, current_date);
  v_method      text := coalesce(nullif(p_payload->>'payment_method',''), 'CASH');
  v_notes       text := nullif(p_payload->>'notes', '');
  v_code        text;
  v_tx          int;
  v_subtotal    numeric := 0;
  v_item_disc   numeric := 0;
  v_total_qty   int := 0;
  v_grand_total numeric := 0;
  v_term        int;
  v_cust_name   text;
  v_cust_code   text;
  v_cust_addr   text;
  v_cust_phone  text;
  v_px          record;
  v_item        record;
  v_pay_code    text;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;
  if v_warung_id is null then
    raise exception 'warung_id is required';
  end if;
  if v_method not in ('CASH', 'QRIS', 'TRANSFER', 'CREDIT') then
    raise exception 'Invalid payment_method: %', v_method;
  end if;

  select w.payment_term, w.name, w.code, w.address, w.phone
    into v_term, v_cust_name, v_cust_code, v_cust_addr, v_cust_phone
  from public."Warung" w where w.id = v_warung_id;
  if not found then
    raise exception 'Warung % not found', v_warung_id;
  end if;

  v_code := public.next_document_number('SalesTransaction', 'SO-', to_char(v_date, 'YYYY'), to_char(v_date, 'MM'));

  insert into public."SalesTransaction"
    (code, visit_id, sales_id, warung_id, payment_method, payment_status, status,
     subtotal, item_discount, transaction_discount, tax, grand_total, notes,
     paid_amount, outstanding_amount, due_date,
     customer_name, customer_code, customer_display_name, customer_address, customer_phone,
     salesman_name, salesman_code, warehouse_code, warehouse_name,
     payment_term, payment_term_name, price_level_name, tax_name, tax_rate,
     tax_total, paid_total, outstanding_total, credit_balance, version)
  values
    (v_code, null, v_user_id, v_warung_id, v_method::public."PaymentMethod", 'UNPAID'::public."PaymentStatus", 'CONFIRMED'::public."SalesTransactionStatus",
     0, 0, 0, 0, 0, v_notes, 0, 0,
     case when v_method = 'CREDIT' then v_date + coalesce(v_term, 7) else null end,
     v_cust_name, v_cust_code, v_cust_name, v_cust_addr, v_cust_phone,
     (select name from public."User" u where u.id = v_user_id),
     (select username from public."User" u where u.id = v_user_id),
     null, null, v_term, null, null, null, null,
     0, 0, 0, 0, 1)
  returning id into v_tx;

  for v_item in select value as j from jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb)) value
  loop
    select p.id, p.name, p.code, p.sku, p.barcode, p.display_name, p.short_name,
           pc.name as category_name, b.name as brand_name, u.name as unit_name,
           pk.name as packaging_name, u.symbol as unit_symbol
      into v_px
    from public."Product" p
    left join public."ProductCategory" pc on pc.id = p.category_id
    left join public."Brand" b on b.id = p.brand_id
    left join public."Unit" u on u.id = p.unit_id
    left join public."Packaging" pk on pk.id = p.packaging_id
    where p.id = (v_item.j->>'product_id')::int;

    if not found then
      raise exception 'Product % not found', (v_item.j->>'product_id');
    end if;

    insert into public."SalesTransactionItem"
      (sales_transaction_id, product_id, qty, selling_price, discount, subtotal,
       product_code, product_name, display_name, sku, barcode, unit_name,
       unit_price, price_source, price_level_name, category_name, brand_name,
       packaging_name, is_manual_price, line_number, sort_order)
    values
      (v_tx, v_px.id, (v_item.j->>'qty')::int,
       (v_item.j->>'selling_price')::numeric,
       coalesce((v_item.j->>'discount')::numeric, 0),
       (v_item.j->>'qty')::numeric * (v_item.j->>'selling_price')::numeric - coalesce((v_item.j->>'discount')::numeric, 0),
       v_px.code, v_px.name, coalesce(v_px.display_name, v_px.name), v_px.sku, v_px.barcode,
       v_px.unit_name, (v_item.j->>'selling_price')::numeric,
       'RETAIL'::public."PriceSource", null, v_px.category_name,
       v_px.brand_name, v_px.packaging_name, false,
       (select count(*) from public."SalesTransactionItem" i where i.sales_transaction_id = v_tx) + 1,
       (select count(*) from public."SalesTransactionItem" i where i.sales_transaction_id = v_tx) + 1);

    v_subtotal  := v_subtotal  + (v_item.j->>'qty')::numeric * (v_item.j->>'selling_price')::numeric;
    v_item_disc := v_item_disc + coalesce((v_item.j->>'discount')::numeric, 0);
    v_total_qty := v_total_qty + (v_item.j->>'qty')::int;
  end loop;

  v_grand_total := v_subtotal - v_item_disc;

  update public."SalesTransaction"
     set subtotal = v_subtotal,
         item_discount = v_item_disc,
         tax = 0,
         grand_total = v_grand_total,
         paid_amount = case when v_method in ('CASH','QRIS','TRANSFER') then v_grand_total else 0 end,
         outstanding_amount = case when v_method = 'CREDIT' then v_grand_total else 0 end,
         payment_status = case when v_method in ('CASH','QRIS','TRANSFER') then 'PAID'::public."PaymentStatus" else 'UNPAID'::public."PaymentStatus" end,
         paid_total = case when v_method in ('CASH','QRIS','TRANSFER') then v_grand_total else 0 end,
         outstanding_total = case when v_method = 'CREDIT' then v_grand_total else 0 end
   where id = v_tx;

  if v_method in ('CASH', 'QRIS', 'TRANSFER') then
    v_pay_code := public.next_document_number('Payment', 'PAY-', to_char(v_date, 'YYYY'), to_char(v_date, 'MM'));
    insert into public."Payment"
      (code, transaction_id, payment_date, payment_method, amount, status, created_by, receipt_number)
    values
      (v_pay_code, v_tx, v_date, v_method::public."PaymentMethod", v_grand_total,
       'PAID'::public."PaymentStatus", v_user_id, v_code);
  else
    begin
      insert into public."AccountsReceivableProjection"
        (sales_transaction_id, invoice_number, customer_code, customer_name,
         invoice_amount, paid_amount, outstanding_amount, due_date, status,
         last_invoice_date, updated_at)
      values
        (v_tx, v_code, v_cust_code, v_cust_name, v_grand_total, 0, v_grand_total,
         v_date + coalesce(v_term, 7), 'UNPAID', v_date, now());
    exception
      when unique_violation then
        update public."AccountsReceivableProjection"
           set invoice_amount = v_grand_total,
               outstanding_amount = v_grand_total,
               due_date = v_date + coalesce(v_term, 7),
               status = 'UNPAID',
               updated_at = now()
         where sales_transaction_id = v_tx;
    end;
  end if;

  return jsonb_build_object('success', true, 'transaction_id', v_tx, 'code', v_code, 'grand_total', v_grand_total, 'total_item', v_total_qty);
exception
  when others then
    raise exception 'create_sales_transaction failed: %', SQLERRM;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC execution grants (block anon)
-- ---------------------------------------------------------------------------

revoke execute on function public.get_dashboard_metrics() from public, anon;
grant execute on function public.get_dashboard_metrics() to authenticated;

revoke execute on function public.next_document_number(text, text, text, text) from public, anon;
grant execute on function public.next_document_number(text, text, text, text) to authenticated;

revoke execute on function public.create_sales_transaction(jsonb) from public, anon;
grant execute on function public.create_sales_transaction(jsonb) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Storage bucket for visit photos
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('visit-photos', 'visit-photos', false, 10485760, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists p_visit_photos_insert on storage.objects;
create policy p_visit_photos_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'visit-photos');

drop policy if exists p_visit_photos_select_owner on storage.objects;
create policy p_visit_photos_select_owner on storage.objects
  for select to authenticated
  using (bucket_id = 'visit-photos' and public.current_user_role() = 'OWNER');

drop policy if exists p_visit_photos_select_own on storage.objects;
create policy p_visit_photos_select_own on storage.objects
  for select to authenticated
  using (bucket_id = 'visit-photos' and (storage.foldername(name))[1] = auth.uid()::text);
