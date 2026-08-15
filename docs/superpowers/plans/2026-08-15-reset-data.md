# Fitur Reset Data Operasional Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menyediakan tombol "Reset Data" di menu Pengaturan yang menghapus seluruh data operasional (transaksi, kunjungan, retur, stok, piutang, setoran, foto) dalam satu transaksi atomik, sambil mempertahankan seluruh data master.

**Architecture:** Backend RPC PostgreSQL `admin_reset_data(p_confirm text)` (security definer, OWNER-only, satu transaksi, delete child→parent + hapus storage foto + reset NumberSequence), dipanggil dari tab baru "Reset Data" di `SettingsPage.jsx` dengan konfirmasi ketik `RESET`. Fitur sementara; akan dihapus saat aplikasi rilis.

**Tech Stack:** PostgreSQL/PLpgSQL, Supabase RPC, React (Vite), supabase-js.

## Global Constraints

- Semua fungsi RPC baru: `security definer`, `set search_path = public, pg_temp`, `language plpgsql`.
- Grant pattern wajib: `revoke execute on function public.<name>(...) from public, anon;` lalu `grant execute on function public.<name>(...) to authenticated;`
- Cek otorisasi pakai `public.current_user_role() <> 'OWNER'` → `raise exception 'Not authorized'` (pola sama seperti RPC lain di `202608140003_visit.sql`).
- Master data (`Product`, `Warung`, `User`, `OutletParStock`, `Warehouse`, `ProductCategory`, `Brand`, `Unit`, `PriceLevel`, `Packaging`, `Supplier`, `Tax`, `Route`, `Area`, `Regional`) TIDAK boleh terhapus.
- App memakai `BrowserRouter` — tidak ada hash link.
- Spec: `docs/superpowers/specs/2026-08-15-reset-data-design.md`
- Bahasa UI konsisten dengan app: Bahasa Indonesia.

---

### Task 1: RPC `admin_reset_data`

**Files:**
- Create: `supabase/migrations/202608150004_reset_data.sql`

**Interfaces:**
- Consumes: `public.current_user_role()` (dari `202608140001_foundation.sql`), `storage.objects` (bucket `visit-photos`).
- Produces: RPC `public.admin_reset_data(p_confirm text) returns jsonb` — dipanggil Task 2 via `supabase.rpc('admin_reset_data', { p_confirm: confirm })`. Return shape: `{ success: boolean, message: string }`. Error → `raise exception`.

- [ ] **Step 1: Buat file migration**

Buat `supabase/migrations/202608150004_reset_data.sql` dengan isi persis berikut:

```sql
-- ============================================================================
-- Minuman @One - Reset data operasional
-- Date: 2026-08-15
-- Applies via: Supabase SQL Editor.
--
-- Menghapus SELURUH data operasional (transaksi, kunjungan, retur, stok
-- masuk/keluar, piutang, setoran, ledger, projection, foto kunjungan, batch,
-- penomoran) dalam SATU transaksi atomik. Data master tetap dipertahankan.
-- Fitur sementara untuk masa development; tombol UI dihapus saat rilis.
-- ============================================================================

drop function if exists public.admin_reset_data(text);

create or replace function public.admin_reset_data(p_confirm text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if public.current_user_role() <> 'OWNER' then
    raise exception 'Not authorized';
  end if;
  if p_confirm is distinct from 'RESET' then
    raise exception 'Konfirmasi tidak sesuai. Ketik RESET untuk melanjutkan.';
  end if;

  -- urutan child -> parent (aman FK), satu transaksi otomatis.
  -- SalesTransaction (terakhir-2) & SalesVisit (terakhir) dihapus paling akhir
  -- karena banyak tabel mereferensikannya (visit_id / sales_transaction_id / last_visit_id).
  delete from public."PaymentAllocation";
  delete from public."SalesTransactionItem";
  delete from public."SalesStockIssueItem";
  delete from public."SalesStockIssueHistory";
  delete from public."SalesVisitActivity";
  delete from public."OutletStockCountItem";
  delete from public."OutletStockCount";
  delete from public."SalesVisitPhoto";
  delete from public."SalesReturnItem";
  delete from public."ARLedger";
  delete from public."CustomerARProjection";
  delete from public."AccountsReceivableProjection";
  delete from public."Payment";
  delete from public."SalesReturn";
  delete from public."OutletStockLedger";
  delete from public."OutletStockProjection";
  delete from public."SalesStockLedger";
  delete from public."CollectionItem";
  delete from public."Collection";
  delete from public."SalesStockProjection";
  delete from public."SalesStockIssue";
  delete from public."WarehouseLedger";
  delete from public."WarehouseStock";
  delete from public."WarehouseStockInItem";
  delete from public."WarehouseStockIn";
  delete from public."ProductBatch";
  delete from public."FinanceIdempotencyKey";
  delete from public."NumberSequence";
  delete from public."SalesTransaction";
  delete from public."SalesVisit";

  -- hapus foto kunjungan dari storage
  delete from storage.objects where bucket_id = 'visit-photos';

  return jsonb_build_object('success', true, 'message', 'Semua data operasional berhasil direset');
exception
  when others then
    raise exception 'admin_reset_data failed: %', SQLERRM;
end;
$$;

revoke execute on function public.admin_reset_data(text) from public, anon;
grant execute on function public.admin_reset_data(text) to authenticated;
```

- [ ] **Step 2: Self-review struktur**

Baca ulang file. Verifikasi:
- `security definer`, `set search_path = public, pg_temp`, `language plpgsql` ada.
- `revoke`/`grant` ada di akhir dengan signature `(text)`.
- Tidak ada `CREATE TABLE` — hanya fungsi.
- Urutan delete: `SalesTransaction` dan `SalesVisit` benar-benar dua baris terakhir sebelum `return`.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/202608150004_reset_data.sql
git commit -m "feat(reset): RPC admin_reset_data hapus data operasional"
```

---

### Task 2: Tab "Reset Data" di SettingsPage

**Files:**
- Modify: `frontend/src/modules/settings/services/SettingsApiService.js`
- Modify: `frontend/src/modules/settings/pages/SettingsPage.jsx`
- Modify: `frontend/src/styles/components.css:388-393`

**Interfaces:**
- Consumes: RPC `public.admin_reset_data(text)` dari Task 1; `useToast()` (dari `../../../components/toast/ToastContext`) dan `supabase` (dari `../../../utils/supabase`) yang sudah dipakai di SettingsPage.
- Produces: Tab `reset` baru di `SettingsPage.jsx`; method `SettingsApiService.resetData(confirm)`.

- [ ] **Step 1: Tambah method reset di SettingsApiService**

Edit `frontend/src/modules/settings/services/SettingsApiService.js`. Tambah method di dalam objek `SettingsApiService`, setelah `uploadLogo`:

```js
  async resetData(confirm) {
    const { data, error } = await supabase.rpc('admin_reset_data', { p_confirm: confirm });
    if (error) throw error;
    return data;
  },
```

Jangan lupa koma setelah blok `uploadLogo` yang sudah ada (metode sebelumnya ditutup `},`).

- [ ] **Step 2: Tambah import & state di SettingsPage**

Edit `frontend/src/modules/settings/pages/SettingsPage.jsx`:

Baris 2 — ganti import lucide-react menjadi:

```js
import { Building2, Coins, Hash, Users, Upload, Save, Loader2, ImageOff, Trash2, RefreshCw } from 'lucide-react';
```

Baris 8-13 — ganti `TABS` menjadi (tambah `reset` di akhir):

```js
const TABS = [
  { key: 'perusahaan', label: 'Perusahaan', icon: Building2 },
  { key: 'payroll', label: 'Penggajian', icon: Coins },
  { key: 'penomoran', label: 'Penomoran', icon: Hash },
  { key: 'user', label: 'Manajemen Pengguna', icon: Users },
  { key: 'reset', label: 'Reset Data', icon: Trash2 },
];
```

Baris 32-33 — tambah state setelah `const [saving, setSaving] = useState(false);`:

```js
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetDone, setResetDone] = useState(false);
```

- [ ] **Step 3: Tambah handler reset**

Edit `frontend/src/modules/settings/pages/SettingsPage.jsx`. Tambah handler setelah fungsi `toggleUser` (sebelum `return (`):

```js
  const handleReset = async () => {
    setResetting(true);
    try {
      await SettingsApiService.resetData(resetConfirm);
      toast.success('Semua data operasional berhasil direset');
      setResetDone(true);
    } catch (err) {
      toast.error(err.message || 'Gagal mereset data');
    } finally {
      setResetting(false);
    }
  };
```

- [ ] **Step 4: Tambah render tab reset**

Edit `frontend/src/modules/settings/pages/SettingsPage.jsx`. Di dalam `return`, SETELAH blok `{tab === 'user' && (...)}` dan SEBELUM penutup `</div>` (baris ~249), tambah:

```jsx
      {tab === 'reset' && (
        <div className="card-custom" style={{ maxWidth: '640px' }}>
          <h5 style={{ marginBottom: '16px' }}>Reset Data Operasional</h5>
          <div
            style={{
              padding: '12px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--danger)',
              backgroundColor: 'color-mix(in srgb, var(--danger) 8%, var(--surface))',
              color: 'var(--danger)',
              fontSize: '13px',
              marginBottom: '16px',
            }}
          >
            Menghapus seluruh transaksi, kunjungan, retur, stok masuk/keluar, setoran,
            piutang, ledger, stok warung &amp; sales, batch, dan foto kunjungan.
            Data master (produk, warung, pengguna, par stock, warehouse) tetap dipertahankan.
            Tindakan ini tidak dapat dibatalkan.
          </div>

          {resetDone ? (
            <button
              className="btn btn-primary"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={() => window.location.reload()}
            >
              <RefreshCw size={16} /> Muat Ulang Halaman
            </button>
          ) : (
            <>
              <label style={LABEL}>Konfirmasi Reset</label>
              <input
                style={INPUT}
                type="text"
                placeholder="Ketik RESET untuk mengonfirmasi"
                value={resetConfirm}
                onChange={(e) => setResetConfirm(e.target.value)}
              />
              <button
                className="btn btn-danger"
                style={{ marginTop: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                disabled={resetConfirm !== 'RESET' || resetting}
                onClick={handleReset}
              >
                {resetting ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                {resetting ? 'Menghapus...' : 'Hapus Semua Data'}
              </button>
            </>
          )}
        </div>
      )}
```

- [ ] **Step 5: Tambah CSS btn-danger**

Edit `frontend/src/styles/components.css`. Setelah baris `.btn-ghost { background: none; color: var(--text-muted); }` (baris 393), tambah:

```css
.btn-danger { background-color: var(--danger); color: #fff; }
.btn-danger:hover { background-color: color-mix(in srgb, var(--danger) 80%, #000); }
.btn-danger:disabled { opacity: 0.55; cursor: not-allowed; }
```

- [ ] **Step 6: Verifikasi build**

Run (workdir `frontend/`):

```bash
npm run build
```

Expected: `✓ built in ...` tanpa error.

- [ ] **Step 7: Verifikasi lint**

Run (workdir `frontend/`):

```bash
npx oxlint src/modules/settings/pages/SettingsPage.jsx src/modules/settings/services/SettingsApiService.js
```

Expected: hanya warning pre-existing (jika ada), tanpa error baru.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/modules/settings/services/SettingsApiService.js frontend/src/modules/settings/pages/SettingsPage.jsx frontend/src/styles/components.css
git commit -m "feat(reset): tab reset data di pengaturan dengan konfirmasi RESET"
```

---

### Task 3: Uji manual di SQL Editor & deploy

**Files:**
- (tidak ada file baru)

**Interfaces:**
- Consumes: Task 1 & 2.

- [ ] **Step 1: Jalankan migration di SQL Editor**

User menjalankan `supabase/migrations/202608150004_reset_data.sql` di Supabase SQL Editor.
Expected: `Success`. No rows returned (create function).

- [ ] **Step 2: Uji penolakan non-OWNER / konfirmasi salah**

User menjalankan (masih sebagai OWNER di SQL Editor) untuk memverifikasi guard:

```sql
select public.admin_reset_data('SALAH');
```

Expected: error `Konfirmasi tidak sesuai. Ketik RESET untuk melanjutkan.` — data TIDAK terhapus (cek mis. `select count(*) from public."SalesVisit";` masih > 0).

- [ ] **Step 3: Uji reset lewat UI**

1. Login OWNER (user id 839) di https://operasional.atonejaya.workers.dev.
2. Buka Pengaturan → tab **Reset Data**.
3. Tombol "Hapus Semua Data" harus nonaktif sampai mengetik `RESET`.
4. Ketik `RESET` → klik tombol → toast sukses.
5. Klik "Muat Ulang Halaman".

- [ ] **Step 4: Verifikasi data di SQL Editor**

```sql
select
  (select count(*) from public."SalesVisit") as visits,
  (select count(*) from public."SalesTransaction") as transactions,
  (select count(*) from public."SalesReturn") as returns,
  (select count(*) from public."OutletStockProjection") as outlet_proj,
  (select count(*) from public."SalesStockProjection") as sales_proj,
  (select count(*) from public."WarehouseStock") as wh_stock,
  (select count(*) from public."NumberSequence") as sequences,
  (select count(*) from storage.objects where bucket_id = 'visit-photos') as photos;
```

Expected: semua 0.

- [ ] **Step 5: Verifikasi master data tetap**

```sql
select
  (select count(*) from public."Product") as products,
  (select count(*) from public."Warung") as warungs,
  (select count(*) from public."User") as users,
  (select count(*) from public."OutletParStock") as par_stock;
```

Expected: semua > 0 (tidak berubah).

- [ ] **Step 6: Deploy**

```bash
cd frontend
npm run build
npx wrangler deploy --config wrangler.toml
```

Expected: deploy sukses ke https://operasional.atonejaya.workers.dev.
