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

  -- urutan child -> parent (aman FK), satu transaksi otomatis.
  -- SalesTransaction (terakhir-2) & SalesVisit (terakhir) dihapus paling akhir
  -- karena banyak tabel mereferensikannya (visit_id / sales_transaction_id / last_visit_id).
  -- Semua delete diberi `where true` agar lolos guard pg_safeupdate
  -- (Supabase memblokir DELETE/UPDATE tanpa WHERE).
  delete from public."PaymentAllocation" where true;
  delete from public."SalesTransactionItem" where true;
  delete from public."SalesStockIssueItem" where true;
  delete from public."SalesStockIssueHistory" where true;
  delete from public."SalesVisitActivity" where true;
  delete from public."OutletStockCountItem" where true;
  delete from public."OutletStockCount" where true;
  delete from public."SalesVisitPhoto" where true;
  delete from public."SalesReturnItem" where true;
  delete from public."ARLedger" where true;
  delete from public."CustomerARProjection" where true;
  delete from public."AccountsReceivableProjection" where true;
  delete from public."Payment" where true;
  delete from public."SalesReturn" where true;
  delete from public."OutletStockLedger" where true;
  delete from public."OutletStockProjection" where true;
  delete from public."SalesStockLedger" where true;
  delete from public."CollectionItem" where true;
  delete from public."Collection" where true;
  delete from public."SalesStockProjection" where true;
  delete from public."SalesStockIssue" where true;
  delete from public."WarehouseLedger" where true;
  delete from public."WarehouseStock" where true;
  delete from public."WarehouseStockInItem" where true;
  delete from public."WarehouseStockIn" where true;
  delete from public."ProductBatch" where true;
  delete from public."FinanceIdempotencyKey" where true;
  delete from public."NumberSequence" where true;
  delete from public."SalesTransaction" where true;
  delete from public."SalesVisit" where true;

  -- CATATAN: foto kunjungan TIDAK dihapus di sini.
  -- Supabase memblokir `delete` langsung dari storage.objects
  -- (wajib lewat Storage API). Frontend menghapusnya setelah RPC sukses.

  return jsonb_build_object('success', true, 'message', 'Semua data operasional berhasil direset');
exception
  when others then
    raise exception 'admin_reset_data failed: %', SQLERRM;
end;
$$;

revoke execute on function public.admin_reset_data(text) from public, anon;
grant execute on function public.admin_reset_data(text) to authenticated;

-- Izinkan OWNER menghapus objek di bucket visit-photos lewat Storage API.
drop policy if exists p_visit_photos_delete_owner on storage.objects;
create policy p_visit_photos_delete_owner on storage.objects
  for delete to authenticated
  using (bucket_id = 'visit-photos' and public.current_user_role() = 'OWNER');
```

Poin penting:
- **Satu transaksi:** RPC plpgsql tanpa `begin` eksplisit tetap dalam satu transaksi; error di tengah → rollback total (tidak setengah-setengah).
- **Urutan FK** child → parent menghindari error constraint.
- `ProductBatch` dihapus karena isinya otomatis dibuat saat retur (format `B-{produk}-{tanggal}`), tidak ada data master; setelah `SalesReturnItem` dihapus, `ProductBatch` menjadi data yatim → dihapus agar bersih. Tidak ada tabel yang mereferensikannya setelah retur dihapus.
- `NumberSequence` direset → nomor dokumen mulai dari awal lagi.
- Semua `delete` diberi `where true` agar lolos guard **`pg_safeupdate`** (Supabase memblokir `DELETE`/`UPDATE` tanpa `WHERE`, kode error 21000).
- Foto storage dihapus lewat **Storage API** dari frontend (`storage.from('visit-photos').remove(paths)`), bukan via SQL — Supabase memblokir `delete` langsung ke `storage.objects`. Butuh policy DELETE baru `p_visit_photos_delete_owner` agar OWNER bisa memanggil Storage API.
- Master data (`Product`, `Warung`, `User`, `OutletParStock`, dll) tidak tersentuh.

## 3. Frontend — Tab "Reset Data" di SettingsPage

### 3.1 `SettingsApiService.js`

Tambah method:

```js
async resetData(confirm) {
  const { data, error } = await supabase.rpc('admin_reset_data', { p_confirm: confirm });
  if (error) throw error;

  await this.removeAllVisitPhotos();
  return data;
},

async removeAllVisitPhotos() {
  const paths = [];
  const bucket = supabase.storage.from('visit-photos');
  const walk = async (prefix) => {
    const { data: items, error } = await bucket.list(prefix, { limit: 1000, offset: 0 });
    if (error) throw error;
    for (const item of items || []) {
      if (item.metadata) {
        paths.push(prefix ? `${prefix}/${item.name}` : item.name);
      } else {
        await walk(prefix ? `${prefix}/${item.name}` : item.name);
      }
    }
  };
  await walk('');
  if (paths.length === 0) return;
  const { error } = await bucket.remove(paths);
  if (error) throw error;
},
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
