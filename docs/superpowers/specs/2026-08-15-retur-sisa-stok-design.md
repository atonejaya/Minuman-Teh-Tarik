# Design: Retur Sisa Stok Kendaraan (Sales) + Menu Pantauan Stok

- **Tanggal:** 2026-08-15
- **Status:** Disetujui & diimplementasikan (frontend ter-deploy, migration menunggu re-run di SQL Editor)
- **Tujuan:** Meminimalisir kesalahan input saat retur, memisahkan dua jenis retur (sisa stok kendaraan vs dari warung), dan menampilkan menu Pantauan Stok di sidebar Owner.

## 1. Latar Belakang

Dua jenis retur kini tercampur konsepnya dan keduanya berisiko salah input:

1. **Retur sisa stok kendaraan** (stok yang dibawa sales pagi hari, tidak terjual → kembali ke gudang). Saat ini dipicu manual oleh Owner dari halaman Mutasi Stok → "Terima Retur" dengan input qty manual per produk (`SalesStockIssueDetail.jsx:148-159`), memanggil RPC `sales_stock_return`.
2. **Retur dari warung** (barang rusak/expired/tidak laku di outlet). Saat ini sudah otomatis dibuat saat kunjungan oleh `visit_save_stock_count` (hanya jika `expired_qty > 0`), atau manual via form `SalesReturnFormPage`.

Kekurangan saat ini:
- Retur sisa stok: sales tidak bisa melakukannya sendiri; input qty manual mudah salah.
- Kondisi barang (baik/rusak/expired) tidak dibedakan saat retur sisa stok → semua dikembalikan ke stok gudang yang bisa dijual lagi, termasuk yang rusak.
- Halaman `StokDashboard` (`/stok`) sudah ada tapi tidak memiliki menu di sidebar Owner → pengguna tidak bisa menemukannya.

## 2. Ruang Lingkup

1. **RPC `sales_stock_return` diperluas**: dukung `condition` per item (`GOOD`/`DAMAGED`/`EXPIRED`) + guard qty tidak melebihi sisa stok.
2. **Frontend `SalesVehicleStock.jsx`**: tombol "Retur Sisa Stok" yang mendaftarkan otomatis seluruh sisa stok (baik/rusak/expired) dan sales hanya konfirmasi.
3. **Sidebar Owner**: tambah menu "Pantauan Stok" → `/stok`.
4. Tidak mengubah retur warung (sudah otomatis saat kunjungan).

## 3. Detail Desain

### 3.1 RPC `sales_stock_return` (perluasan, file `supabase/migrations/202608140002_stock.sql`)

Payload item sekarang opsional membawa `condition`:

```json
{
  "sales_id": 838,
  "warehouse_id": 1,
  "items": [
    { "product_id": 5, "qty": 10, "condition": "GOOD" },
    { "product_id": 5, "qty": 2,  "condition": "EXPIRED" }
  ]
}
```

Perilaku per kondisi:

| condition | WarehouseStock.qty_available | Ledger gudang | SalesStockProjection |
|---|---|---|---|
| `GOOD` | bertambah (perilaku lama) | `RETURN_FROM_SALES` | `qty_available` berkurang |
| `DAMAGED` | **tidak bertambah** (tidak layak jual) | `RETURN_FROM_SALES` + notes "DAMAGED" | `qty_damaged` berkurang |
| `EXPIRED` | **tidak bertambah** | `RETURN_FROM_SALES` + notes "EXPIRED" | `qty_expired` berkurang |

Guard baru di RPC (before processing, per produk):
- `sum(qty untuk produk) <= qty_available + qty_damaged + qty_expired` pada `SalesStockProjection` milik `sales_id`. Jika melebihi → `raise exception`.
- `condition` di-coalesce default `'GOOD'`.
- Keamanan: jika pemanggil ber-role `SALES`, paksa `sales_id = current_user_id()` (sales hanya bisa meretur stoknya sendiri); role `OWNER` bebas (perilaku lama dipertahankan).
- `v_qty` negatif/nol tetap di-`continue`.

### 3.2 Halaman `Stok Kendaraan` (Sales) — tombol Retur Sisa Stok

File: `frontend/src/modules/sales/pages/SalesVehicleStock.jsx`

- Tambah tombol **"Retur Sisa Stok"** (sekunder, di samping tombol reload).
- Saat diklik → tampilkan **konfirmasi inline/modal** (tanpa berpindah halaman):
  - Daftar semua produk dari `SalesStockProjection` milik sales login.
  - Per produk tiga input qty: **Baik / Rusak / Expired** — **sudah terisi otomatis** dari `qty_available` / `qty_damaged` / `qty_expired`.
  - Sales hanya menurunkan nilai (mis. merubah Baik→Rusak bila ada yang rusak ditemukan saat pengecekan).
  - Total per produk ditampilkan dan dibatasi `<= qty_available + qty_damaged + qty_expired` (guard di UI + di RPC).
- Tombol "Konfirmasi Retur":
  - Hitung `warehouse_id` otomatis dari `SalesStockIssue` terakhir milik sales login (`order by created_at desc limit 1`).
  - Panggil RPC `sales_stock_return` dengan `sales_id = current_user_id`, items berisi semua produk dengan qty > 0.
  - Toast sukses + reload halaman stok.
- Jika tidak ada `SalesStockIssue` terakhir → tombol dinonaktifkan + info "Belum ada pengeluaran stok untuk sales ini".

### 3.3 Sidebar Owner — Menu Pantauan Stok

File: `frontend/src/layouts/OwnerLayout.jsx`

- Section Operasional, tambah setelah "Stok Gudang":
  ```js
  { to: '/stok', label: 'Pantauan Stok', icon: Package },
  ```
- Halaman `/stok` (StokDashboard, tab Gudang/Kendaraan/Warung) sudah ada dan berjalan (App.jsx:148).

### 3.4 Pemisahan visual kedua retur

| | Retur Sisa Stok Kendaraan | Retur Warung |
|---|---|---|
| Halaman | `Stok Kendaraan` (Sales, mobile) | Kunjungan (otomatis) + `Retur Penjualan` (Owner) |
| Asal stok | Kendaraan sales → Gudang | Outlet → kendaraan sales |
| Movement gudang | `RETURN_FROM_SALES` | — (dari warung) |
| Pembuat | Sales (akhir hari) | Sistem saat kunjungan / Owner |

Kedua jenis sudah terpisah secara alami (halaman & asal berbeda); tidak perlu struktur baru.

## 4. Kasus Khusus

1. **Qty retur melebihi stok** → RPC `raise exception` dengan pesan jelas; UI memblokir sejak awal (max).
2. **Sales belum punya issue stok** → tombol retur dinonaktifkan.
3. **Kondisi rusak/expired dikembalikan** → tidak menambah stok gudang yang bisa dijual (mencegah barang rusak terjual lagi), tercatat di ledger gudang + notes.
4. **Sales retur stok sales lain** → ditolak oleh RPC (role SALES hanya untuk stok sendiri).

## 5. File yang Terkena

- `supabase/migrations/202608140002_stock.sql` — perluasan `sales_stock_return` (edit langsung + re-run via SQL Editor).
- `frontend/src/modules/sales/pages/SalesVehicleStock.jsx` — tombol retur + konfirmasi.
- `frontend/src/layouts/OwnerLayout.jsx` — link Pantauan Stok.

## 6. Di Luar Lingkup

- Retur warung (sudah otomatis saat kunjungan; form manual tetap seperti sekarang).
- Struktur tabel baru / kolom baru.
- Fitur pencairan payroll/komisi (ditunda user).
