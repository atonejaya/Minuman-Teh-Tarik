# Desain: Model Stok Titip Jual Berbasis Baseline

Tanggal: 2026-08-15
Status: Draft — menunggu review user

## Latar Belakang

Aplikasi Minuman @One menjalankan proses **titip jual** (konsinyasi): stok produk dititipkan di warung, sales mengunjungi berkala untuk menghitung sisa, mencatat penjualan, setoran, dan mengisi ulang yang terjual.

Model lama menghitung penjualan sebagai `PAR − fisik`. Ini meleset karena stok titipan nyata di rak tidak selalu sama dengan PAR. Kesalahan menumpuk setiap kunjungan, sehingga stok gudang pusat, kendaraan sales, dan warung tidak bisa dipantau akurat.

## Model Baru: Baseline (Stok Awal Titipan)

Prinsip: **stok titipan warung selalu konstan = stok awal yang dititipkan (baseline)**.

- **Baseline** ditetapkan dari **stok awal titipan** yang diinput sales pada kunjungan pertama warung+produk (atau saat baseline direset).
- Setiap kunjungan: `terjual = max(stok awal − sisa fisik − rusak, 0)`.
- Jika sisa fisik > stok awal → terjual 0, kelebihan dicatat sebagai **penyesuaian stok** (ledger `ADJUSTMENT`).
- **Refill = terjual + rusak**, sehingga stok warung kembali ke baseline.
- **PAR tidak lagi dipakai untuk refill.** (Bisa diisi 0 / diabaikan.)

Karena baseline akurat (dari kondisi nyata rak), identitas stok selalu konsisten: gudang → kendaraan → warung terpantau dalam satuan cup.

## Ruang Lingkup

1. Migrasi kolom `baseline_set` pada `OutletStockProjection`.
2. Ubah `visit_save_stock_count`:
   - Warung belum baseline (`baseline_set = false`): input stok awal titipan sebagai baseline, hitung terjual, buat transaksi + retur, tandai baseline.
   - Warung sudah baseline: stok awal dari baseline (tidak diinput ulang).
   - Transaksi otomatis + retur dibuat **termasuk pada kunjungan pertama** (dari selisih stok awal − sisa − rusak).
3. Ubah `visit_check_out`:
   - Refill dihitung dari `terjual + rusak` (dari stock count terbaru), bukan `PAR − fisik`.
   - Cek stok kendaraan tetap aktif (blokir jika refill > stok kendaraan).
4. Dashboard owner: 3 kartu KPI stok klik-able (Gudang / Kendaraan / Warung) dalam cup.
5. Halaman `/stok` (owner-only) dengan 3 tab: Gudang, Kendaraan, Warung — daftar produk + qty, dikelompokkan per sales / per warung.

## Detail Desain

### 1. Migrasi database

```sql
alter table public."OutletStockProjection"
  add column if not exists baseline_set boolean not null default false;
```

Semua baris lama otomatis `baseline_set = false` → warung aktif dianggap belum baseline → direset saat kunjungan berikutnya.

### 2. `visit_save_stock_count` — alur per produk

- Ambil `baseline_set` & `current_stock` warung+produk dari `OutletStockProjection`.
- Jika belum baseline:
  - `opening_stock` (baseline) = `stok_awal_titipan` yang diinput sales (`p_items[i].opening_qty`).
  - `current_stock` = baseline (sebelum pengurangan).
- Jika sudah baseline:
  - `opening_stock` = nilai baseline yang tersimpan.
  - `current_stock` = baseline (nilai tersimpan; identik dengan stok setelah refill terakhir).
- `terjual = greatest(opening_stock − sisa_fisik − rusak, 0)`.
- Jika `sisa_fisik > opening_stock`: `terjual = 0`; kelebihan `penyesuaian = sisa_fisik − opening_stock` dicatat sebagai ledger `ADJUSTMENT` dengan `qty_before = opening_stock`, `qty_after = sisa_fisik`.
- `terjual > 0` → buat `SalesTransaction` + `SalesTransactionItem` + ledger `SALE` (warung & kendaraan) seperti sekarang.
- `rusak > 0` → buat `SalesReturn` + `SalesReturnItem` + ledger `RETURN_BAD` (warung & kendaraan) seperti sekarang.
- Update `OutletStockProjection`: `opening_stock` (jika pertama), `baseline_set = true`, `current_stock = sisa_fisik` (sebelum refill), total_sales/total_return/calculated_sales sesuai, `last_visit_id`, `last_count_at`.

### 3. `visit_check_out` — refill

- Untuk tiap produk pada stock count visit:
  - `refill = terjual + rusak`, dihitung ulang dari data visit: `terjual = greatest(baseline − fisik − rusak, 0)`, dengan `baseline` = nilai `opening_stock` yang tersimpan di `OutletStockProjection`.
  - Jika `refill > stok kendaraan` → raise exception (blokir), transaksi di-rollback.
  - Ledger `REFILL` warung (`qty_after = sisa_fisik + refill` = baseline).
  - Ledger kendaraan `RESTOCK_OUTLET`, `SalesStockProjection.qty_available` berkurang.
  - `OutletStockProjection.current_stock` = baseline.
- Refill hanya jika `refill > 0`.

### 4. Dashboard owner

- Kartu KPI (klik-able):
  - **Stok Gudang** — total `WarehouseStock.qty_available` → `/stok?tab=gudang`
  - **Stok Kendaraan** — total `SalesStockProjection.qty_available` → `/stok?tab=kendaraan`
  - **Stok Warung** — total `OutletStockProjection.current_stock` → `/stok?tab=warung`
- Satuan tampil "N cup".

### 5. Halaman `/stok` (owner-only)

- Route `stok` dalam blok `RequireRole OWNER/ADMIN`.
- 3 tab via query param `?tab=`.
- **Gudang**: `WarehouseStock(*, product:Product(name, code, unit:Unit(name)))`.
- **Kendaraan**: `SalesStockProjection(*, sales:User(name), product:Product(...))`, kelompok per sales, jumlah + rinci produk.
- **Warung**: `OutletStockProjection(*, warung:Warung(name, code), product:Product(...))`, kelompok per warung, jumlah + rinci produk.

### 6. Frontend VisitWizard — input stok

- Saat hitung stok, jika warung+produk belum baseline → tampilkan kolom input **"Stok Awal Titipan"** (opening_qty) + SISA + RUSAK.
- Jika sudah baseline → hanya SISA + RUSAK (stok awal tampil sebagai info).
- Kirim `opening_qty` pada `p_items` JSON.
- Label kecil "Stok awal (baseline)" pada kunjungan pertama.

## Kasus Khusus

1. **Sisa > stok awal** → terjual 0, penyesuaian `ADJUSTMENT` dicatat, baseline tidak berubah.
2. **Kunjungan terhenti tengah** → baseline hanya ditetapkan saat hitung stok tersimpan (transaksi atomic).
3. **Stok kendaraan kurang** → check-out diblokir dengan pesan jelas (sudah aktif).
4. **Retur > stok awal** → invalid, error minta sales periksa kembali.
5. **Sales ganti** → baseline milik warung+produk, tidak terpengaruh siapa sales-nya.

## File yang Terkena

- `supabase/migrations/202608140003_visit.sql` — `visit_save_stock_count`, `visit_check_out`
- Migrasi SQL baru (kolom `baseline_set`) — dijalankan via SQL Editor
- `frontend/src/modules/dashboard/components/OwnerDashboard.jsx` — KPI stok klik-able
- Halaman baru `frontend/src/modules/stok/pages/StokDashboard.jsx` (atau di masterdata)
- `frontend/src/App.jsx` — route `/stok`
- `frontend/src/modules/visits/pages/VisitWizard.jsx` — input stok awal titipan

## Di Luar Lingkup

- Perubahan menu Pengeluaran Stok / Stock In (sudah benar).
- Setoran (tidak terpengaruh).
- Pelaporan analitik lanjutan (hanya ringkasan stok di dashboard + halaman stok).
