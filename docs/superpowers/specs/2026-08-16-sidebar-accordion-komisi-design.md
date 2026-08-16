# Design: Sidebar Accordion (Owner) + Desain Komisi & Uang Operasional

Tanggal: 2026-08-16
Status: Disetujui user (per bagian)

## Ringkasan

Dua bagian:

1. **Sidebar Owner** dirombak dari daftar datar menjadi menu/submenu (accordion eksklusif) dengan struktur baru dan icon per submenu. Ini yang **diimplementasikan sekarang**.
2. **Komisi & uang operasional** dirancang (tanpa implementasi): skema perhitungan dan kemunculannya di sisi OWNER dan sisi SALES. Dokumen ini jadi acuan modul Gajih di masa depan.

## 1. Struktur Menu Baru (Sidebar Owner)

Accordion eksklusif: membuka satu grup menutup grup lain. Grup yang memuat route aktif auto-terbuka; saat di Dashboard/Pengaturan semua grup tertutup. Setiap submenu memakai icon lucide-react.

- **DASHBOARD** — item tunggal, icon `LayoutDashboard`
- **INPUT** (grup)
  - Barang Masuk — `/sales/stock-in` — `PackagePlus`
  - Pengeluaran Stok — `/sales/stock-issues` — `PackageMinus`
- **OPERASIONAL** (grup)
  - Perencanaan Kunjungan — `/visits` — `ClipboardList`
  - Stok Gudang — `/warehouse-stock` — `Warehouse`
  - Transaksi — `/sales/transactions` — `Receipt`
  - Mutasi & Retur — `/sales/vehicle-mutations` — `Truck`
  - Retur Penjualan — `/sales/returns` — `Undo2`
  - Pantauan Stok — `/stok` — `BarChart3`
- **MASTER DATA** (grup)
  - Pelanggan — `/customers` — `Users`
  - Sales — `/sales-users` — `UserCog`
  - Produk — `/products` — `ShoppingCart`
  - Kategori — `/categories` — `Layers`
  - Satuan — `/units` — `Ruler`
  - Area — `/areas` — `Map`
  - Rute — `/routes` — `Route`
  - Gudang — `/warehouses` — `Building2`
  - Level Harga — `/price-levels` — `Tag`
  - Stok Normal — `/par-stock` — `Package`
- **KEUANGAN** (grup)
  - Piutang — `/sales/piutang` — `Wallet`
  - Setoran — `/setoran` — `Banknote`
  - Laporan — `/reports` — `FileText`
  - Gajih — `/payroll` *(placeholder)* — `Coins`
  - Biaya Operasional — `/operational-cost` *(placeholder)* — `TrendingDown`
- **PENGATURAN** — item tunggal, icon `Settings`

Semua route sudah ada kecuali `/payroll` dan `/operational-cost` (baru, placeholder).

## 2. Arsitektur Sidebar

### Komponen `SidebarMenu`
Lokasi: `frontend/src/layouts/` (atau `components/layout/`), dipakai `OwnerLayout.jsx`.

- Menerima `MENU_CONFIG` (array bertingkat) sebagai satu-satunya prop.
- State `openKey` (nama grup yang terbuka) eksklusif: klik grup A → `openKey = 'A'`; klik grup yang sudah terbuka → tertutup (toggle).
- Auto-buka via `useLocation()`: cari grup berisi route aktif; set `openKey` saat route berubah. Route top-level (Dashboard/Pengaturan) → `openKey = null`.
- Submenu = `NavLink` react-router, memakai kelas CSS `owner-nav-link` + `.active` yang sudah ada.

### Bentuk config
```js
const MENU_CONFIG = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'input', label: 'Input', icon: ChevronDown, children: [ /* { to, label, icon } */ ] },
  { key: 'operasional', label: 'Operasional', icon: ChevronDown, children: [ /* ... */ ] },
  { key: 'master-data', label: 'Master Data', icon: ChevronDown, children: [ /* ... */ ] },
  { key: 'keuangan', label: 'Keuangan', icon: ChevronDown, children: [ /* ... */ ] },
  { key: 'settings', to: '/settings', label: 'Pengaturan', icon: Settings },
];
```

- Item dengan `children` = grup: header tombol (icon + label + chevron) → submenu dirender bersyarat `openKey === key`.
- Item tanpa `children` (punya `to`) = `NavLink` langsung.

### CSS
Kelas baru: `owner-sidebar-group`, `owner-sidebar-group-title` (+ `.open` untuk rotasi chevron), indent submenu. Warna mengikuti variabel tema (biru) yang sudah dipakai.

## 3. Placeholder Gajih & Biaya Operasional

- Route baru di `App.jsx` dalam grup `RequireRole roles={['OWNER','ADMIN']}`:
  - `/payroll` → `PlaceholderPage` ("Gajih — Segera hadir")
  - `/operational-cost` → `PlaceholderPage` ("Biaya Operasional — Segera hadir")
- Satu komponen `PlaceholderPage` di `components/shared/`: judul (`title` prop) + teks "Segera hadir" + tombol kembali, mengikuti tema.
- Halaman ini kelak digantikan modul sungguhan tanpa menyentuh sidebar.

## 4. Desain Komisi & Uang Operasional (implementasi terpisah)

### Definisi
- **Komisi**: imbalan performa per cup terjual. Nilai dari setting `commission_per_cup` (default Rp500).
- **Uang Operasional**: uang harian untuk keperluan perjalanan sales di lapangan, dari setting `fuel_allowance` (default Rp10.000/hari).

### Rumus (per sales, per bulan)
- Cups terjual = Σ `qty` pada `SalesTransactionItem` milik transaksi valid (status ≠ `CANCELLED`) di bulan tersebut.
- Hari aktif = jumlah tanggal berbeda di bulan tersebut di mana sales memiliki transaksi valid.
- Komisi = cups terjual × `commission_per_cup`.
- Uang operasional = hari aktif × `fuel_allowance`.
- **Total Gaji = Komisi + Uang Operasional**.

### Sisi OWNER (halaman Gajih → `/payroll`)
- Pilih bulan → tabel per sales: cups terjual, komisi, hari aktif, uang operasional, total.
- Klik baris sales → detail per tanggal sales tersebut (hari, jumlah transaksi, cups, komisi hari, uang operasional hari).
- Sumber data dihitung langsung dari `SalesTransaction`/`SalesTransactionItem` (tanpa tabel baru pada desain ini).

### Sisi SALES (tidak menambah menu — tampilan mobile sudah ada)
- Di halaman **Akun**: kartu "Gaji Bulan Ini" berisi cups, komisi, hari aktif, uang operasional, total — hanya data milik sales tsb (RLS), tidak melihat sales lain.
- Klik kartu → halaman detail: ringkasan total, rincian per tanggal, selector bulan, dan riwayat bulan sebelumnya (sesuai wireframe `sales_akun.html` "Gaji Bulan Ini" / "Riwayat Gaji").

### Catatan untuk implementasi masa depan
- Definisi "hari aktif" = tanggal transaksi valid (bukan tanggal kunjungan). Bisa direvisi bila bisnis menetapkan kriteria lain.
- Status bayar (dibayar/belum) dan snapshot gaji (tabel Payroll) dijadwalkan saat modul Gajih diimplementasikan, agar riwayat tidak berubah saat transaksi lama diedit.

## 5. Kriteria Penerimaan (Sidebar — yang dikerjakan sekarang)

1. Struktur menu persis seperti Bagian 1 (urutan, label, route, icon).
2. Accordion eksklusif: membuka satu grup menutup grup lain; klik grup terbuka menutupnya.
3. Auto-buka grup route aktif saat navigasi; semua tertutup saat di Dashboard/Pengaturan.
4. `/payroll` dan `/operational-cost` menampilkan placeholder "Segera hadir".
5. Sidebar SALES (bottom nav) tidak berubah.
6. Tidak ada perubahan perilaku route/pages lain; lint & build lolos.

## 6. Lingkup Non-Goal

- Tidak membangun modul Gajih/Komisi sungguhan (hanya desain terdokumentasi).
- Tidak mengubah nav SALES.
- Tidak menambah library baru (tanpa dependency tambahan).
