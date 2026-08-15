# Design: Fitur "Reset Data" di Pengaturan

- **Tanggal:** 2026-08-15
- **Status:** Disetujui user
- **Tujuan:** Tombol reset seluruh data operasional dari menu Pengaturan, agar bisa menguji aplikasi "dari nol" selama masa development. Tombol akan dihapus setelah aplikasi benar-benar selesai.

## 1. Kebutuhan

User ingin menghapus semua data operasional (seolah-olah aplikasi baru) lewat satu tombol di menu **Pengaturan Sistem**, dengan konfirmasi ketat. Data master tetap dipertahankan.

### Yang DIHAPUS (data operasional)

- Transaksi: `SalesTransaction`, `SalesTransactionItem`, `Payment`, `PaymentAllocation`
- Retur: `SalesReturn`, `SalesReturnItem`
- Kunjungan: `SalesVisit`, `SalesVisitPhoto`, `SalesVisitActivity`, `OutletStockCount`, `OutletStockCountItem`
- Stok keluar masuk sales: `SalesStockIssue`, `SalesStockIssueItem`, `SalesStockIssueHistory`
- Stok gudang: `WarehouseStock`, `WarehouseLedger`, `WarehouseStockIn`, `WarehouseStockInItem`
- Stok warung: `OutletStockProjection`, `OutletStockLedger`
- Stok sales: `SalesStockProjection`, `SalesStockLedger`
- Piutang: `AccountsReceivableProjection`, `CustomerARProjection`, `ARLedger`
- Setoran: `Collection`, `CollectionItem`
- Batch (otomatis, terkait retur): `ProductBatch`
- Idempotency & penomoran: `FinanceIdempotencyKey`, `NumberSequence`
- Foto kunjungan di Storage bucket `visit-photos`

### Yang TETAP (data master)

- `Product`, `ProductCategory`, `Brand`, `Unit`, `PriceLevel`, `Packaging`, `Supplier`, `Tax`
- `Warung`, `Route`, `Area`, `Regional`
- `User`
- `Warehouse`
- `OutletParStock`

### Konfirmasi

- Hanya OWNER yang bisa menjalankan (cek di RPC).
- User harus mengetik `RESET` pada input di UI sebelum tombol aktif.
- RPC juga menerima parameter `p_confirm` dan menolak bila bukan `'RESET'` (defense-in-depth).

## 2. Backend — RPC `admin_reset_data`

File baru: `supabase/migrations/202608150004_reset_data.sql`

```sql
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

  -- urutan child -> parent (aman FK), satu transaksi otomatis
  delete from public."PaymentAllocation";
  delete from public."Payment";
  delete from public."SalesTransactionItem";
  delete from public."SalesTransaction";
  delete from public."SalesReturnItem";
  delete from public."SalesReturn";
  delete from public."SalesStockIssueItem";
  delete from public."SalesStockIssueHistory";
  delete from public."SalesStockIssue";
  delete from public."SalesVisitActivity";
  delete from public."OutletStockCountItem";
  delete from public."OutletStockCount";
  delete from public."SalesVisitPhoto";
  delete from public."SalesVisit";
  delete from public."CollectionItem";
  delete from public."Collection";
  delete from public."ARLedger";
  delete from public."CustomerARProjection";
  delete from public."AccountsReceivableProjection";
  delete from public."OutletStockLedger";
  delete from public."OutletStockProjection";
  delete from public."SalesStockLedger";
  delete from public."SalesStockProjection";
  delete from public."WarehouseLedger";
  delete from public."WarehouseStock";
  delete from public."WarehouseStockInItem";
  delete from public."WarehouseStockIn";
  delete from public."ProductBatch";
  delete from public."FinanceIdempotencyKey";
  delete from public."NumberSequence";

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

Poin penting:
- **Satu transaksi:** RPC plpgsql tanpa `begin` eksplisit tetap dalam satu transaksi; error di tengah → rollback total (tidak setengah-setengah).
- **Urutan FK** child → parent menghindari error constraint.
- `ProductBatch` dihapus karena isinya otomatis dibuat saat retur (format `B-{produk}-{tanggal}`), tidak ada data master; setelah `SalesReturnItem` dihapus, `ProductBatch` menjadi data yatim → dihapus agar bersih. Tidak ada tabel yang mereferensikannya setelah retur dihapus.
- `NumberSequence` direset → nomor dokumen mulai dari awal lagi.
- Foto storage dihapus via `delete from storage.objects` (definer punya akses).
- Master data (`Product`, `Warung`, `User`, `OutletParStock`, dll) tidak tersentuh.

## 3. Frontend — Tab "Reset Data" di SettingsPage

### 3.1 `SettingsApiService.js`

Tambah method:

```js
async resetData(confirm) {
  return supabase.rpc('admin_reset_data', { p_confirm: confirm });
}
```

### 3.2 `SettingsPage.jsx`

- Impor `Trash2`, `RefreshCw` dari `lucide-react`.
- Tambah ke `TABS`: `{ key: 'reset', label: 'Reset Data', icon: Trash2 }`.
- State baru: `resetConfirm` (string input), `resetting` (bool), `resetDone` (bool).
- Handler:

```js
const handleReset = async () => {
  setResetting(true);
  try {
    const { data, error } = await SettingsApiService.resetData(resetConfirm);
    if (error) throw error;
    toast.success('Semua data operasional berhasil direset');
    setResetDone(true);
  } catch (err) {
    toast.error(err.message || 'Gagal mereset data');
  } finally {
    setResetting(false);
  }
};
```

- Render tab `reset`:
  - Judul "Reset Data Operasional".
  - Paragraf penjelasan: menghapus seluruh transaksi, kunjungan, retur, stok masuk/keluar, setoran, piutang, ledger, stok warung & sales, dan foto kunjungan. Data master (produk, warung, pengguna, par stock) tetap.
  - Kotak peringatan merah (pakai `--danger`).
  - Input teks placeholder "Ketik RESET untuk mengonfirmasi", `value={resetConfirm}`, onChange update.
  - Tombol merah "Hapus Semua Data" — `disabled` bila `resetConfirm !== 'RESET' || resetting`, tampilkan spinner saat `resetting`.
  - Setelah `resetDone`: tombol "Muat Ulang Halaman" → `window.location.reload()`.

### 3.3 CSS

- `--danger` sudah ada di tema. Belum ada class `btn-danger` → tambah di `frontend/src/styles/components.css` (dekat definisi `.btn`):

```css
.btn-danger {
  background-color: var(--danger);
  color: #fff;
  border: 1px solid var(--danger);
}
.btn-danger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
```

## 4. Alur

1. OWNER buka Pengaturan → tab Reset Data.
2. Ketik `RESET` → tombol aktif.
3. Klik tombol → RPC `admin_reset_data('RESET')` berjalan atomik.
4. Sukses → toast hijau → user klik "Muat Ulang Halaman".
5. Gagal/rolback → toast merah, data tetap utuh.

## 5. Batasan & Keamanan

- Hanya OWNER (dicek di RPC via `current_user_role()`).
- Konfirmasi ganda: UI (ketik `RESET`) + RPC (`p_confirm`).
- Fitur ini sementara; akan dihapus saat aplikasi selesai (tidak masuk release final).

## 6. Verifikasi

- `npm run build` (workdir `frontend/`) sukses.
- `npx oxlint` pada file yang diubah.
- Uji manual di SQL Editor: jalankan migration, panggil RPC sebagai OWNER → success; coba dengan `p_confirm` salah → error; cek beberapa tabel (SalesTransaction, OutletStockProjection, dst.) kosong dan master (Product, Warung, OutletParStock) tetap.
