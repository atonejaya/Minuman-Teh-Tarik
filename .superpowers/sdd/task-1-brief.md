### Task 1: RPC `get_payroll_summary` & `get_payroll_detail`

**Files:**
- Create: `supabase/migrations/202608160003_payroll.sql`

**Interfaces:**
- Produces: RPC `get_payroll_summary(p_month text)` → kolom `sales_id int, sales_name text, cups bigint, hari_aktif int, komisi numeric, uang_operasional numeric, total numeric`; RPC `get_payroll_detail(p_sales_id int, p_month text)` → kolom `tanggal date, jumlah_transaksi bigint, cups bigint, komisi_hari numeric, uang_op_hari numeric`. Keduanya hanya untuk role OWNER, `p_month` format `YYYY-MM`.

- [ ] **Step 1: Tulis migration**

Buat `supabase/migrations/202608160003_payroll.sql`:

```sql
-- ============================================================================
-- Minuman @One - Payroll RPC (Gajih & Biaya Operasional)
-- Date: 2026-08-16
-- Applies via: Supabase SQL Editor (or `npx supabase db push` after login).
--
-- Contents:
--   1. get_payroll_summary  - ringkasan per sales per bulan (OWNER only)
--   2. get_payroll_detail   - rincian per tanggal untuk satu sales (OWNER only)
--   Keduanya menghitung langsung dari transaksi valid (status <> 'CANCELLED').
-- ============================================================================

create or replace function public.get_payroll_summary(p_month text)
returns table (
  sales_id integer,
  sales_name text,
  cups bigint,
  hari_aktif integer,
  komisi numeric,
  uang_operasional numeric,
  total numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_komisi_per_cup numeric;
  v_fuel_allowance numeric;
  v_month_start date;
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'forbidden';
  end if;
  if p_month !~ '^\d{4}-\d{2}$' then
    raise exception 'invalid month';
  end if;
  v_month_start := to_date(p_month, 'YYYY-MM');

  select coalesce(nullif(value, '')::numeric, 500) into v_komisi_per_cup
  from public."Setting" where key = 'commission_per_cup';
  v_komisi_per_cup := coalesce(v_komisi_per_cup, 500);

  select coalesce(nullif(value, '')::numeric, 10000) into v_fuel_allowance
  from public."Setting" where key = 'fuel_allowance';
  v_fuel_allowance := coalesce(v_fuel_allowance, 10000);

  return query
  select
    u.id::integer,
    coalesce(u.name, u.username)::text,
    coalesce(agg.cups, 0)::bigint,
    coalesce(agg.hari_aktif, 0)::integer,
    coalesce(agg.cups, 0) * v_komisi_per_cup,
    coalesce(agg.hari_aktif, 0) * v_fuel_allowance,
    coalesce(agg.cups, 0) * v_komisi_per_cup + coalesce(agg.hari_aktif, 0) * v_fuel_allowance
  from public."User" u
  left join (
    select t.sales_id,
           sum(i.qty) as cups,
           count(distinct t.created_at::date) as hari_aktif
    from public."SalesTransaction" t
    join public."SalesTransactionItem" i on i.sales_transaction_id = t.id
    where t.status <> 'CANCELLED'
      and date_trunc('month', t.created_at) = v_month_start
    group by t.sales_id
  ) agg on agg.sales_id = u.id
  where u.role::text = 'SALES'
    and u.is_active
  order by sales_name;
end;
$$;

create or replace function public.get_payroll_detail(p_sales_id integer, p_month text)
returns table (
  tanggal date,
  jumlah_transaksi bigint,
  cups bigint,
  komisi_hari numeric,
  uang_op_hari numeric
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_komisi_per_cup numeric;
  v_fuel_allowance numeric;
  v_month_start date;
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'forbidden';
  end if;
  if p_month !~ '^\d{4}-\d{2}$' then
    raise exception 'invalid month';
  end if;
  v_month_start := to_date(p_month, 'YYYY-MM');

  select coalesce(nullif(value, '')::numeric, 500) into v_komisi_per_cup
  from public."Setting" where key = 'commission_per_cup';
  v_komisi_per_cup := coalesce(v_komisi_per_cup, 500);

  select coalesce(nullif(value, '')::numeric, 10000) into v_fuel_allowance
  from public."Setting" where key = 'fuel_allowance';
  v_fuel_allowance := coalesce(v_fuel_allowance, 10000);

  return query
  select
    t.created_at::date,
    count(distinct t.id)::bigint,
    coalesce(sum(i.qty), 0)::bigint,
    coalesce(sum(i.qty), 0) * v_komisi_per_cup,
    v_fuel_allowance
  from public."SalesTransaction" t
  left join public."SalesTransactionItem" i on i.sales_transaction_id = t.id
  where t.sales_id = p_sales_id
    and t.status <> 'CANCELLED'
    and date_trunc('month', t.created_at) = v_month_start
  group by t.created_at::date
  order by t.created_at::date;
end;
$$;

revoke execute on function public.get_payroll_summary(text) from public, anon;
grant execute on function public.get_payroll_summary(text) to authenticated;

revoke execute on function public.get_payroll_detail(integer, text) from public, anon;
grant execute on function public.get_payroll_detail(integer, text) to authenticated;
```

- [ ] **Step 2: Periksa isi file**

Run: `Select-String -Path "supabase\migrations\202608160003_payroll.sql" -Pattern "get_payroll_summary|get_payroll_detail|security definer|grant execute"`
Expected: 6+ baris match, tidak ada placeholder.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/202608160003_payroll.sql
git commit -m "feat(payroll): RPC get_payroll_summary & get_payroll_detail (OWNER)"
```

- [ ] **Step 4: Verifikasi manual (oleh USER, setelah PR di-deploy)**

Apply file di Supabase SQL Editor, lalu jalankan:

```sql
select * from public.get_payroll_summary(to_char(current_date, 'YYYY-MM'));
select * from public.get_payroll_detail(1, to_char(current_date, 'YYYY-MM'));
```

Expected: baris per sales aktif (angka 0 kalau tak ada transaksi); detail per tanggal hanya untuk sales yang bertransaksi. Non-OWNER → error `forbidden`.

---

