### Task 1: Migrasi kolom `baseline_set` + RPC `get_warung_baselines`

**Files:**
- Create: `supabase/migrations/202608150003_stok_baseline.sql`

**Interfaces:**
- Produces: kolom `public."OutletStockProjection".baseline_set boolean not null default false`; fungsi `public.get_warung_baselines(p_warung_id integer) returns jsonb` mengembalikan array `[{product_id, baseline_set, opening_stock}]`.

- [ ] **Step 1: Tulis file migrasi**

```sql
-- ============================================================================
-- Minuman @One - Stok titip jual berbasis baseline
-- Date: 2026-08-15
-- Applies via: Supabase SQL Editor.
-- Contents:
--   1. OutletStockProjection.baseline_set (penanda baseline per warung+produk)
--   2. Enum OutletMovementType + 'ADJUSTMENT' (ledger stok warung)
--   3. get_warung_baselines(integer) - RPC baca status baseline (sales-safe)
-- ============================================================================

alter table public."OutletStockProjection"
  add column if not exists baseline_set boolean not null default false;

alter type public."OutletMovementType"
  add value if not exists 'ADJUSTMENT';

drop function if exists public.get_warung_baselines(integer);

create or replace function public.get_warung_baselines(p_warung_id integer)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id int := public.current_user_id();
  v_role    text := public.current_user_role();
  v_result  jsonb;
begin
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if v_role <> 'OWNER' and not public.user_can_access_warung(p_warung_id) then
    raise exception 'Not authorized';
  end if;

  select coalesce(jsonb_agg(to_jsonb(t) order by t.product_id), '[]'::jsonb)
    into v_result
  from (
    select op.product_id, op.baseline_set, op.opening_stock
    from public."OutletStockProjection" op
    where op.warung_id = p_warung_id
  ) t;

  return v_result;
end;
$$;

revoke execute on function public.get_warung_baselines(integer) from public, anon;
grant execute on function public.get_warung_baselines(integer) to authenticated;
```

- [ ] **Step 2: Jalankan di SQL Editor**

User menjalankan seluruh isi file di atas di Supabase SQL Editor. Diharapkan: `Success. No rows returned`.

- [ ] **Step 3: Verifikasi**

Jalankan di SQL Editor:

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'OutletStockProjection' and column_name = 'baseline_set';
```

Expected: satu baris `baseline_set` / `boolean` / `NO` / `false`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202608150003_stok_baseline.sql
git commit -m "feat(stok): kolom baseline_set + RPC get_warung_baselines"
```

---


