# Model Stok Titip Jual Berbasis Baseline — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengganti model penjualan warung dari `PAR − fisik` ke model baseline (`stok awal titipan`), sehingga stok warung selalu kembali ke baseline, dan stok gudang/kendaraan/warung terpantau akurat dalam cup.

**Architecture:** Penambahan kolom `baseline_set` di `OutletStockProjection`; `visit_save_stock_count` menghitung `terjual = max(baseline − sisa − rusak, 0)` dengan baseline dari input `opening_qty` (kunjungan pertama) atau nilai tersimpan; `visit_check_out` menghitung `refill = baseline − fisik` (bukan `PAR − fisik`); RPC baru `get_warung_baselines` agar sales bisa baca status baseline (OutletStockProjection RLS owner-only). Frontend: input "Stok Awal Titipan" di VisitWizard saat belum baseline, dashboard owner + halaman `/stok` 3 tab.

**Tech Stack:** PostgreSQL PL/pgSQL (Supabase), React 19 + Vite, @supabase/supabase-js, react-router-dom v7, lucide-react.

## Global Constraints

- Tidak ada framework test. Verifikasi frontend = `npm run build` (vite build) + `npx oxlint`. Verifikasi SQL = user menjalankan di Supabase SQL Editor.
- Semua fungsi baru bersifat `security definer`, `set search_path = public, pg_temp`, dan di-`grant execute ... to authenticated`; di-`revoke ... from public, anon`.
- Semua tabel dinamis (hanya fungsi) ditulis apa adanya (tanpa `CREATE TABLE`); perubahan skema memakai `alter table ... add column if not exists`.
- RLS: `OutletStockProjection` hanya OWNER. Sales membaca baseline via RPC (security definer), TIDAK via SELECT langsung.
- Kolom `opening_stock`, `current_stock`, `total_sales`, `total_return`, `calculated_sales`, `required_refill`, `last_visit_id`, `last_count_at`, `version`, `updated_at` sudah ada di `OutletStockProjection`.
- Deploy: `npm run build` lalu `npx wrangler deploy --config wrangler.toml` (workdir `frontend/`), target `https://operasional.atonejaya.workers.dev`.
- Bahasa UI konsisten Bahasa Indonesia.

---

## Struktur File

| File | Tanggung Jawab |
|---|---|
| `supabase/migrations/202608150003_stok_baseline.sql` (baru) | `alter` kolom `baseline_set` + fungsi `get_warung_baselines` |
| `supabase/migrations/202608140003_visit.sql` (edit) | `visit_save_stock_count` & `visit_check_out` model baseline |
| `frontend/src/modules/visits/services/VisitApiService.js` (edit) | tambah `getWarungBaselines` |
| `frontend/src/modules/visits/pages/VisitWizard.jsx` (edit) | input stok awal titipan + perhitungan baseline |
| `frontend/src/modules/dashboard/components/OwnerDashboard.jsx` (edit) | 3 KPI stok klik-able |
| `frontend/src/modules/stok/pages/StokDashboard.jsx` (baru) | halaman `/stok` 3 tab (Gudang/Kendaraan/Warung) |
| `frontend/src/App.jsx` (edit) | route `/stok` owner-only + lazy import |
| `frontend/src/styles/components.css` (edit) | style tab halaman stok |

Urutan implementasi: SQL dulu (Task 1–3), frontend sales (Task 4), frontend owner (Task 5–6), deploy (Task 7).

---

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

### Task 2: `visit_save_stock_count` — hitung penjualan dari baseline

**Files:**
- Modify: `supabase/migrations/202608140003_visit.sql` (fungsi `visit_save_stock_count`, mulai baris `declare` ±158 sampai return ±440)

**Interfaces:**
- Consumes: `get_warung_baselines` (tidak langsung); kolom `baseline_set`, `opening_stock`; item JSON `p_items[i]` kini boleh berisi `opening_qty`.
- Produces: perilaku baru — `terjual = greatest(baseline − fisik − rusak, 0)`; ledger `ADJUSTMENT` bila fisik > baseline; `current_stock` projection di-set ke `fisik` (sebelum refill); transaksi tetap dibuat pada kunjungan pertama bila terjual > 0.

- [ ] **Step 1: Ubah deklarasi variabel**

Pada blok `declare` fungsi `visit_save_stock_count`, tambahkan variabel di dekat deklarasi `v_sold`:

```sql
  v_sold      int;
  v_opening   int;
  v_adjust    int;
  v_baseline_set boolean;
```

- [ ] **Step 2: Ganti blok perhitungan sold (JANGAN sentuh blok `if v_sold > 0` / `if v_expired > 0`)**

Di dalam `for v_item in ... loop`, ganti HANYA bagian perhitungan stok — dari baris `v_par := coalesce(v_par, 0);` sampai `end if;` yang menutup perhitungan `v_sold` (sebelum baris `if v_sold > 0 then`). Blok pembuatan `SalesTransaction`/`SalesReturn` (`if v_sold > 0`, `if v_expired > 0`) TIDAK BOLEH diubah.

BLOK LAMA (yang harus diganti):

```sql
    v_par   := coalesce(v_par, 0);
    v_price := coalesce(v_price, 0);

    select coalesce(current_stock, 0) into v_outlet_cur
    from public."OutletStockProjection"
    where warung_id = v_visit.warung_id and product_id = (v_item.j->>'product_id')::int;

    v_outlet_cur := coalesce(v_outlet_cur, 0);

    v_sold := 0;
    if (v_physical + v_expired) < v_par then
      v_sold := v_par - v_physical - v_expired;
    end if;
```

BLOK BARU:

```sql
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
```

Catatan:
- `v_par` tetap dipakai untuk insert `SalesTransactionItem` dan blok projection (PAR sebagai referensi); jangan dihapus.
- Semua blok setelah `end if;` ini (`if v_sold > 0 then` untuk transaksi, `if v_expired > 0 then` untuk retur) tetap memakai `v_outlet_cur`, `v_sold`, `v_expired` — tidak berubah.
- Cast `'ADJUSTMENT'::public."OutletMovementType"` aman karena nilai enum ditambahkan di Task 1.

- [ ] **Step 3: Update blok `if v_sold > 0 or v_expired > 0 then` (projection)**

Ganti blok insert/update `OutletStockProjection` (mulai `if v_sold > 0 or v_expired > 0 then` sampai `end if;` sebelum `end loop;`) dengan:

```sql
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
```

- [ ] **Step 4: Jalankan di SQL Editor**

User menjalankan ulang SELURUH file `202608140003_visit.sql` di Supabase SQL Editor. Diharapkan: `Success` tanpa error.

- [ ] **Step 5: Verifikasi sintaks fungsi**

Jalankan di SQL Editor:

```sql
select proname, pg_get_functiondef(oid) is not null as ok
from pg_proc where proname = 'visit_save_stock_count';
```

Expected: `visit_save_stock_count` / `true`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202608140003_visit.sql
git commit -m "feat(stok): visit_save_stock_count hitung penjualan dari baseline"
```

---

### Task 3: `visit_check_out` — refill dari baseline, bukan PAR

**Files:**
- Modify: `supabase/migrations/202608140003_visit.sql` (fungsi `visit_check_out`, blok `if v_count_id is not null then ... end loop`)

**Interfaces:**
- Consumes: `OutletStockProjection.opening_stock` (baseline).
- Produces: `refill = greatest(baseline − fisik, 0)`; ledger REFILL `qty_after = fisik + refill` (= baseline); blokir bila `refill > stok kendaraan` (sudah ada sejak sebelumnya).

- [ ] **Step 1: Ganti query loop stock count**

Ganti blok:

```sql
    for v_item in
      select i.product_id, i.physical_qty, coalesce(op.par_qty, 0) as par_qty
      from public."OutletStockCountItem" i
      left join public."OutletParStock" op
        on op.warung_id = v_visit.warung_id and op.product_id = i.product_id
      where i.stock_count_id = v_count_id
      order by i.id
    loop
      v_physical := coalesce(v_item.physical_qty, 0);
      v_par      := v_item.par_qty;
      v_refill   := greatest(v_par - v_physical, 0);
```

dengan:

```sql
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
```

(variabel `v_par` dipakai ulang sebagai baseline; deklarasi tetap ada.)

- [ ] **Step 2: Jalankan di SQL Editor**

User menjalankan ulang SELURUH file `202608140003_visit.sql` di Supabase SQL Editor. Diharapkan: `Success`.

- [ ] **Step 3: Verifikasi**

```sql
select proname from pg_proc where proname = 'visit_check_out';
```

Expected: `visit_check_out`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202608140003_visit.sql
git commit -m "feat(stok): visit_check_out refill dari baseline"
```

---

### Task 4: VisitWizard — input Stok Awal Titipan & perhitungan baseline

**Files:**
- Modify: `frontend/src/modules/visits/services/VisitApiService.js`
- Modify: `frontend/src/modules/visits/pages/VisitWizard.jsx`
- Modify: `frontend/src/styles/components.css` (grid `.stock-row` 4 kolom saat ada input Stok Awal)

**Interfaces:**
- Consumes: `get_warung_baselines` RPC (Task 1).
- Produces: state `stockRows` tiap baris kini memiliki `baseline_set`, `opening`; `handleSaveStock` mengirim `opening_qty`; `totalTagihan` memakai baseline.

- [ ] **Step 1: Tambah method di VisitApiService.js**

Tambahkan di object `VisitApiService` (setelah `getPlan`):

```js
  getWarungBaselines(warungId) {
    return supabase.rpc('get_warung_baselines', { p_warung_id: warungId });
  },
```

- [ ] **Step 2: Ubah `loadStock` di VisitWizard.jsx**

Ganti fungsi `loadStock` (mulai `const loadStock = async (targetWarungId) => {`) dengan:

```js
  const loadStock = async (targetWarungId) => {
    const [parRes, baselineRes] = await Promise.all([
      supabase
        .from('OutletParStock')
        .select('id, par_qty, product_id, product:Product(id, code, name, selling_price)')
        .eq('warung_id', targetWarungId)
        .eq('is_active', true)
        .order('id'),
      VisitApiService.getWarungBaselines(targetWarungId),
    ]);
    if (parRes.error) throw parRes.error;
    if (baselineRes.error) throw baselineRes.error;
    const baselineMap = new Map(
      (baselineRes.data || []).map((b) => [b.product_id, { baseline_set: b.baseline_set, opening_stock: Number(b.opening_stock || 0) }])
    );
    const rows = (parRes.data || []).map((row) => {
      const b = baselineMap.get(row.product_id) || { baseline_set: false, opening_stock: 0 };
      return {
        product_id: row.product_id,
        code: row.product?.code || '',
        name: row.product?.name || 'Produk',
        par_qty: Number(row.par_qty || 0),
        selling_price: Number(row.product?.selling_price || 0),
        baseline_set: b.baseline_set,
        opening: b.baseline_set ? b.opening_stock : Number(row.par_qty || 0),
        physical: Number(row.par_qty || 0),
        expired: 0,
      };
    });
    setStockRows(rows);
    return rows;
  };
```

- [ ] **Step 3: Ubah `totalTagihan`**

Ganti `useMemo` `totalTagihan` dengan:

```js
  const totalTagihan = useMemo(
    () =>
      stockRows.reduce((sum, r) => {
        const base = Number(r.opening || 0);
        const sold = Math.max(base - Number(r.physical || 0) - Number(r.expired || 0), 0);
        return sum + sold * r.selling_price;
      }, 0),
    [stockRows]
  );
```

- [ ] **Step 4: Ubah `handleSaveStock` items**

Ganti pembuatan `items` dengan:

```js
      const items = stockRows.map((r) => ({
        product_id: r.product_id,
        physical_qty: Number(r.physical || 0),
        expired_qty: Number(r.expired || 0),
        opening_qty: r.baseline_set ? undefined : Number(r.opening || 0),
      }));
```

- [ ] **Step 5: Ubah header tabel stok**

Ganti blok header (`{stockRows.length > 0 && (` sampai penutup) dengan:

```js
          {stockRows.length > 0 && (
            <div className={`stock-row stock-row-header ${!stockRows[0].baseline_set ? 'has-opening' : ''}`}>
              <div className="stock-row-info">
                <span>Produk</span>
              </div>
              {!stockRows[0].baseline_set && <span className="stock-col-label">Stok Awal</span>}
              <span className="stock-col-label">Sisa</span>
              <span className="stock-col-label">Rusak</span>
            </div>
          )}
```

- [ ] **Step 5b: Tambah CSS variasi grid 4 kolom**

Di `frontend/src/styles/components.css`, di dekat rule `.stock-row` (baris ±325), tambahkan:

```css
.stock-row.has-opening { grid-template-columns: 1fr 72px 72px 72px; }
```

Catatan: `.stock-row` default tetap `1fr 72px 72px` (3 kolom) untuk warung yang sudah baseline; warung yang belum baseline memakai 4 kolom via `.has-opening`.

- [ ] **Step 6: Ubah render baris stok**

Ganti blok `{stockRows.map((row, idx) => { ... })}` dengan:

```js
          {stockRows.map((row, idx) => {
            const base = Number(row.opening || 0);
            const sold = Math.max(base - Number(row.physical || 0) - Number(row.expired || 0), 0);
            return (
              <div className={`stock-row ${!row.baseline_set ? 'has-opening' : ''}`} key={row.product_id}>
                <div className="stock-row-info">
                  <p>{row.name}</p>
                  <span>
                    {row.baseline_set ? `Stok awal ${base}` : 'Kunjungan pertama (baseline)'} · {formatRupiah(row.selling_price)} · Terjual {sold}
                  </span>
                </div>
                {!row.baseline_set && (
                  <input
                    type="number"
                    min="0"
                    value={row.opening}
                    onChange={(e) =>
                      setStockRows((prev) => prev.map((r, i) => (i === idx ? { ...r, opening: e.target.value } : r)))
                    }
                    placeholder="0"
                    aria-label={`Stok awal titipan ${row.name}`}
                  />
                )}
                <input
                  type="number"
                  min="0"
                  value={row.physical}
                  onChange={(e) =>
                    setStockRows((prev) => prev.map((r, i) => (i === idx ? { ...r, physical: e.target.value } : r)))
                  }
                  placeholder="0"
                  aria-label={`Sisa stok ${row.name}`}
                />
                <input
                  type="number"
                  min="0"
                  value={row.expired}
                  onChange={(e) =>
                    setStockRows((prev) => prev.map((r, i) => (i === idx ? { ...r, expired: e.target.value } : r)))
                  }
                  placeholder="0"
                  aria-label={`Rusak/kadaluarsa ${row.name}`}
                />
              </div>
            );
          })}
```

- [ ] **Step 7: Verifikasi build**

Run (workdir `frontend/`): `npm run build`
Expected: `✓ built in ...` tanpa error.

- [ ] **Step 8: Verifikasi lint**

Run (workdir `frontend/`): `npx oxlint src/modules/visits/pages/VisitWizard.jsx src/modules/visits/services/VisitApiService.js`
Expected: tidak ada error.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/modules/visits/services/VisitApiService.js frontend/src/modules/visits/pages/VisitWizard.jsx
git commit -m "feat(stok): VisitWizard input stok awal titipan & hitung baseline"
```

---

### Task 5: Dashboard owner — 3 KPI stok klik-able

**Files:**
- Modify: `frontend/src/modules/dashboard/components/OwnerDashboard.jsx`

**Interfaces:**
- Consumes: `supabase` tables `WarehouseStock`, `SalesStockProjection`, `OutletStockProjection`.
- Produces: `data.stokKendaraan`, `data.stokWarung`; KPI cards navigasi ke `/stok?tab=...`.

- [ ] **Step 1: Tambah fetch stok kendaraan & warung**

Di dalam `Promise.all`, setelah `warehouseRes` dan sebelum `last7Res`, tambahkan dua query:

```js
          supabase.from('SalesStockProjection').select('qty_available').limit(5000),
          supabase.from('OutletStockProjection').select('current_stock').limit(5000),
```

Ubah destructuring `[... warehouseRes, last7Res]` menjadi:

```js
          visitsRes,
          warehouseRes,
          salesStockRes,
          outletStockRes,
          last7Res,
        ] = await Promise.all([
```

- [ ] **Step 2: Hitung & set state**

Di `setData({ ... })`, tambahkan:

```js
          stokKendaraan: sum(salesStockRes.data, 'qty_available'),
          stokWarung: sum(outletStockRes.data, 'current_stock'),
```

- [ ] **Step 3: Tambah KPI cards + navigasi (BrowserRouter)**

Aplikasi memakai `BrowserRouter` (lihat `frontend/src/main.jsx`) → TIDAK boleh pakai hash link. Gunakan `useNavigate` dari `react-router-dom`. Tambahkan import di bagian atas `OwnerDashboard.jsx`:

```js
import { useNavigate } from 'react-router-dom';
```

dan di dalam komponen (setelah `const [data, setData] = useState(null);`):

```js
  const navigate = useNavigate();
```

Lalu ganti blok grid KPI (baris `KpiCard ... Stok Gudang` dan `KpiCard ... Visit Hari Ini`) dengan:

```jsx
        <KpiCard label="Stok Gudang" value={`${data.stokGudang.toLocaleString('id-ID')} cup`} color="var(--secondary)" link={<a href="/stok?tab=gudang" onClick={(e) => { e.preventDefault(); navigate('/stok?tab=gudang'); }}>Lihat</a>} />
        <KpiCard label="Stok Kendaraan" value={`${data.stokKendaraan.toLocaleString('id-ID')} cup`} color="var(--warning)" link={<a href="/stok?tab=kendaraan" onClick={(e) => { e.preventDefault(); navigate('/stok?tab=kendaraan'); }}>Lihat</a>} />
        <KpiCard label="Stok Warung" value={`${data.stokWarung.toLocaleString('id-ID')} cup`} color="var(--primary)" link={<a href="/stok?tab=warung" onClick={(e) => { e.preventDefault(); navigate('/stok?tab=warung'); }}>Lihat</a>} />
```

- [ ] **Step 5: Verifikasi build**

Run (workdir `frontend/`): `npm run build`
Expected: sukses tanpa error.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/dashboard/components/OwnerDashboard.jsx
git commit -m "feat(stok): KPI stok gudang/kendaraan/warung di dashboard owner"
```

---

### Task 6: Halaman `/stok` 3 tab (Gudang / Kendaraan / Warung)

**Files:**
- Create: `frontend/src/modules/stok/pages/StokDashboard.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles/components.css`

**Interfaces:**
- Consumes: `supabase` tables `WarehouseStock`, `SalesStockProjection`, `OutletStockProjection` (owner-only RLS, aman untuk OWNER).
- Produces: route `/stok` owner-only; query param `?tab=`.

- [ ] **Step 1: Tulis halaman StokDashboard.jsx**

```jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';

const TABS = [
  { key: 'gudang', label: 'Gudang' },
  { key: 'kendaraan', label: 'Kendaraan' },
  { key: 'warung', label: 'Warung' },
];

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const fmtQty = (n) => `${(Number(n) || 0).toLocaleString('id-ID')} cup`;

const Section = ({ title, rows, qtyKey }) => {
  const total = rows.reduce((a, r) => a + (Number(r[qtyKey]) || 0), 0);
  return (
    <>
      <div className="stok-section-title">
        <strong>{title}</strong>
        <span className="stok-total">{fmtQty(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p style={{ padding: '16px', color: 'var(--text-muted)' }}>Tidak ada data.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--background)' }}>
            <tr>
              <th style={cell}>Produk</th>
              <th style={cell}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.group}-${r.product_id}`}>
                <td style={{ ...cell, fontWeight: '500' }}>
                  {r.group ? `${r.group} — ` : ''}{r.product?.name || '-'}
                </td>
                <td style={{ ...cell, fontWeight: '600' }}>{fmtQty(r[qtyKey])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

const StokDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'gudang';
  const [data, setData] = useState({ gudang: [], kendaraan: [], warung: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [gudang, kendaraan, warung] = await Promise.all([
          supabase
            .from('WarehouseStock')
            .select('*, product:Product(name), warehouse:Warehouse(name)')
            .limit(5000),
          supabase
            .from('SalesStockProjection')
            .select('*, product:Product(name), sales:User(name)')
            .limit(5000),
          supabase
            .from('OutletStockProjection')
            .select('*, product:Product(name), warung:Warung(name)')
            .limit(5000),
        ]);
        for (const res of [gudang, kendaraan, warung]) if (res.error) throw res.error;
        setData({
          gudang: (gudang.data || []).map((r) => ({ ...r, group: r.warehouse?.name })),
          kendaraan: (kendaraan.data || []).map((r) => ({ ...r, group: r.sales?.name })),
          warung: (warung.data || []).map((r) => ({ ...r, group: r.warung?.name })),
        });
      } catch (err) {
        setError(err.message || 'Gagal memuat stok');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="loading-screen">Memuat stok...</div>;
  if (error) return <div className="alert alert-danger m-3" role="alert">{error}</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '16px' }}>Pantauan Stok (cup)</h2>
      <div className="stok-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`stok-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setSearchParams({ tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="stok-panel">
        {tab === 'gudang' && <Section title="Stok Gudang Pusat" rows={data.gudang} qtyKey="qty_available" />}
        {tab === 'kendaraan' && <Section title="Stok Kendaraan Sales" rows={data.kendaraan} qtyKey="qty_available" />}
        {tab === 'warung' && <Section title="Stok Titipan Warung" rows={data.warung} qtyKey="current_stock" />}
      </div>
    </div>
  );
};

export default StokDashboard;
```

- [ ] **Step 2: Daftarkan route di App.jsx**

Tambahkan lazy import (dekat import lain):

```js
const StokDashboard = lazy(() => import('./modules/stok/pages/StokDashboard.jsx'));
```

Tambahkan route di blok Owner-only (di dekat `warehouse-stock`):

```jsx
              <Route path="stok" element={<StokDashboard />} />
```

- [ ] **Step 3: Tambah CSS**

Di `frontend/src/styles/components.css`, tambahkan:

```css
.stok-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.stok-tab { padding: 8px 16px; border: 1px solid var(--border); background: #fff; border-radius: 8px; cursor: pointer; font-weight: 600; }
.stok-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.stok-panel { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 16px; overflow-x: auto; }
.stok-section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.stok-total { background: var(--primary); color: #fff; padding: 4px 10px; border-radius: 999px; font-weight: 700; font-size: 13px; }
```

- [ ] **Step 4: Verifikasi build**

Run (workdir `frontend/`): `npm run build`
Expected: sukses.

- [ ] **Step 5: Verifikasi lint**

Run (workdir `frontend/`): `npx oxlint src/modules/stok/pages/StokDashboard.jsx`
Expected: tidak ada error.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/stok/pages/StokDashboard.jsx frontend/src/App.jsx frontend/src/styles/components.css
git commit -m "feat(stok): halaman pantauan stok 3 tab untuk owner"
```

---

### Task 7: Deploy & uji alur lengkap

**Files:**
- (tidak ada file baru)

**Interfaces:**
- Consumes: seluruh tugas sebelumnya.

- [ ] **Step 1: Build & deploy**

Run (workdir `frontend/`):

```bash
npm run build
npx wrangler deploy --config wrangler.toml
```

Expected: deploy sukses, URL `https://operasional.atonejaya.workers.dev`.

- [ ] **Step 2: Uji SQL alur baseline**

User menjalankan di SQL Editor (menggunakan akun test andi = SALES id 838):

```sql
-- pastikan baseline awal kosong utk warung test
select warung_id, product_id, baseline_set, opening_stock, current_stock
from public."OutletStockProjection" order by id;
```

Expected: `baseline_set` masih `false` untuk warung yang belum dikunjungi.

- [ ] **Step 3: Uji manual alur sales**

1. Login sales (andi), buka Kunjungan, mulai kunjungan warung test.
2. Layar hitung stok: muncul kolom **Stok Awal Titipan** + SISA + RUSAK (karena belum baseline).
3. Isi: Stok Awal = 50, Sisa = 40, Rusak = 2 → Terjual tampil 8, Total Tagihan = 8 × harga.
4. Simpan & Lanjut → transaksi dibuat; bayar → check-out.
5. Setelah check-out: `get_warung_baselines` mengembalikan `baseline_set=true`, `opening_stock=50`.
6. Kunjungan kedua warung yang sama: kolom **Stok Awal** hilang (diganti info "Stok awal 50"); isi Sisa = 45, Rusak = 0 → Terjual 5.

Verifikasi DB setelah kunjungan kedua:

```sql
select warung_id, product_id, baseline_set, opening_stock, current_stock, total_sales, total_return
from public."OutletStockProjection" order by id;
```

Expected: `opening_stock` tetap 50 (baseline), `total_sales` bertambah, `current_stock` = sisa fisik terakhir (sebelum refill).

- [ ] **Step 4: Uji dashboard owner**

1. Login owner (user id 839).
2. Dashboard menampilkan 3 kartu stok (Gudang / Kendaraan / Warung) dalam cup.
3. Klik masing-masing kartu → halaman `/stok?tab=...` menampilkan daftar produk.
4. Pastikan tab berpindah (Gudang/Kendaraan/Warung).

- [ ] **Step 5: Uji blokir refill > stok kendaraan**

1. Login sales, kunjungi warung yang baseline-nya > stok kendaraan yang tersisa.
2. Isi Sisa kecil sehingga refill besar.
3. Check-out → muncul error `Stok kendaraan tidak cukup: <produk> (butuh X, tersedia Y)`, kunjungan tidak COMPLETED.

- [ ] **Step 6: Commit perubahan frontend terakhir (jika ada hasil lint fix)**

```bash
git add -A
git commit -m "feat(stok): deploy model stok baseline"
```

---

## Self-Review

**1. Spec coverage:**
- Kolom `baseline_set` → Task 1.
- `visit_save_stock_count` hitung baseline + transaksi kunjungan pertama + ADJUSTMENT → Task 2.
- `visit_check_out` refill dari baseline + blokir → Task 3.
- VisitWizard input stok awal titipan → Task 4.
- KPI stok klik-able → Task 5.
- Halaman `/stok` 3 tab → Task 6.
- Deploy & uji → Task 7.
- Kasus khusus: sisa > baseline → ADJUSTMENT (Task 2); retur > baseline → `v_sold` guard `v_physical <= v_opening` menghasilkan terjual 0 dan rusak penuh (Task 2, cukup defensif); kunjungan terhenti tengah → baseline hanya ditulis saat save (Task 2); sales ganti → baseline milik warung+produk (Task 1, key warung_id+product_id). ✓

**2. Placeholder scan:** Semua step berisi kode lengkap; tidak ada TBD/TODO.

**3. Type consistency:** `baseline_set` boolean konsisten di Task 1/2/4; `opening_qty` integer di Task 2/4; `get_warung_baselines(integer) returns jsonb` konsisten; variabel `v_opening`, `v_adjust`, `v_baseline_set` dideklarasikan (Task 2 Step 1) dan dipakai di Step 2/3. ✓
