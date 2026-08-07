# Aplikasi Konsinyasi Minuman @One

Sistem terpadu untuk mengelola operasional distribusi dan penjualan konsinyasi Minuman @One. Aplikasi ini dibangun khusus untuk model **Par Stock Consignment**, dimana setiap outlet memiliki target jumlah titipan (Par Stock) yang selalu dijaga melalui proses refill rutin oleh Sales.

Berbeda dengan Warehouse Distribution Management System (WDMS) tradisional yang berorientasi pada pengiriman barang (Delivery Order), sistem ini berorientasi pada **Sales Visit** sebagai proses bisnis utama.

---

# Business Model

Model bisnis yang digunakan adalah **Fixed Par Stock Consignment**.

Alur operasional:

1. Owner memproduksi minuman setiap pagi.
2. Owner menyiapkan barang yang akan dibawa Sales.
3. Sales mengambil barang dari Gudang.
4. Sales mengunjungi Outlet.
5. Sales menghitung stok fisik yang masih tersisa.
6. Sistem menghitung jumlah barang yang terjual.
7. Sistem menghitung kebutuhan refill.
8. Sales melakukan refill hingga jumlah titipan kembali sesuai Par Stock.
9. Sales melakukan penagihan pembayaran.
10. Sales melakukan retur apabila terdapat barang rusak atau kedaluwarsa.
11. Sales melakukan Closing Harian.

Penjualan **tidak diinput secara manual**, tetapi dihitung otomatis berdasarkan selisih antara Par Stock dan stok fisik saat kunjungan.

---

# Arsitektur Bisnis (Source of Truth)

Seluruh pergerakan barang mengikuti alur berikut.

```
Gudang
        │
        ▼
Stok Sales
        │
        ▼
Stok Outlet (Par Stock)
        │
        ▼
Stock Counting
        │
        ▼
Auto Sales Calculation
        │
        ▼
Refill Outlet
        │
        ▼
Payment Collection
        │
        ▼
Sales Closing
```

Sales Visit merupakan pusat seluruh aktivitas operasional.

---

# Formula Bisnis

## Perhitungan Penjualan

```
Penjualan = Par Stock - Stok Fisik
```

Contoh

Par Stock: 20 Cup
Stok Fisik: 12 Cup
Maka: `Penjualan = 20 - 12 = 8 Cup`

---

## Perhitungan Refill

```
Refill = Par Stock - Stok Fisik
```

Contoh

`Par Stock = 20`
`Stok Fisik = 12`
`Refill = 8`

Setelah refill:
`Stok Outlet = 20 Cup`

---

# Status Pengembangan (Sprint Roadmap)

## ✅ Sprint 10

### Master Data
- Produk
- Kategori
- Area
- Rute
- Outlet
- Sales
- User

### Pricing Engine
Hierarki Harga
- Outlet
- Price Level
- Produk
- Retail

### Inventory Foundation
- Warehouse Stock
- Stock Ledger

### Sales & Payment
- Invoice
- Pembayaran
- Payment Allocation
- Collection

---

## ✅ Sprint 11.0A

### Accounts Receivable
- Accounts Receivable Projection
- Customer AR Projection
- Aging Piutang
- Dashboard Piutang
- Collection Priority

---

## ✅ Sprint 11.0B

### Return Management
Retur berdasarkan
- Invoice
- Konsinyasi

Jenis Retur
- Good Return
- Bad Return

Lifecycle
`Draft -> Checked -> Approved -> Received -> Completed`

---

## ✅ Sprint 11.0C

### Sales Stock Issue
Owner menyiapkan barang. Sales mengambil barang.
`Gudang -> Sales`

Mutasi: `Warehouse Stock -> Sales Stock`
Status: `Draft -> Confirmed -> Closed`

---

## 🚧 Sprint 11.0D

### Outlet Inventory Management

#### Outlet Par Stock
Menentukan target stok setiap produk pada masing-masing outlet.
Contoh:
- Warung A | Thai Tea | 20
- Warung A | Matcha | 10

#### Outlet Stock Ledger
Audit histori mutasi.
Jenis Mutasi: `ISSUE_TO_OUTLET, SALE, REFILL, RETURN, ADJUSTMENT, EXPIRED, TRANSFER`

#### Outlet Stock Projection
Menampilkan: `Current Stock, Par Stock, Sell Through, Average Daily Sales, Last Refill, Last Visit`

#### Auto Sales Engine
Menghasilkan transaksi penjualan otomatis berdasarkan hasil Stock Counting.
`Sales = Par Stock - Current Stock`

#### Auto Refill Engine
Menghasilkan kebutuhan refill.
`Refill = Par Stock - Current Stock`

---

## 🚧 Sprint 11.0E

### Sales Visit
Sales Visit merupakan Aggregate Root seluruh aktivitas lapangan.

Flow:
`Check In (GPS) -> Stock Counting -> Auto Sales Calculation -> Payment Collection -> Return -> Refill Confirmation -> Photo Display -> Check Out`

Dalam satu Sales Visit sistem menghasilkan:
- Penjualan
- Refill
- Pembayaran
- Retur
- Foto
- GPS
- Audit Log

---

## 🚧 Sprint 11.0F

### Sales Stock Closing
Closing Harian Sales.

Perhitungan:
`Opening Stock + Additional Pickup - Total Refill - Return to Warehouse = Closing Stock`

Jika tidak balance: `Adjustment Required`

---

## 🔜 Sprint 11.1

### Dashboard Sales
- Jadwal Kunjungan, Progress Kunjungan, Penjualan Hari Ini, Refill Hari Ini, Pembayaran Hari Ini, Target Penjualan, Sisa Barang

### Dashboard Owner
- Omzet, Kas Masuk, Piutang, Nilai Persediaan, Barang Direfill Hari Ini, Outlet Sudah Dikunjungi, Outlet Belum Dikunjungi, Produk Terlaris, Produk Slow Moving, Barang Mendekati Expired

---

# Domain Model

Core Aggregate: `Sales Visit`

Sales Visit terdiri dari:
```
Sales Visit
├── Check In
├── Stock Count
├── Auto Sales
├── Payment
├── Return
├── Refill
├── Merchandising
└── Check Out
```

---

# Inventory Flow
`Warehouse Stock -> Sales Stock -> Outlet Stock -> Sales -> Payment -> Closing`

---

# Teknologi
- **Backend**: Node.js, Express, PostgreSQL, Prisma ORM
- **Architecture**: Domain Driven Design (DDD), CQRS, Event Driven, Outbox Pattern, Eventual Consistency
- **Frontend**: React (Vite), Context API, Vanilla CSS

---

# Design Principles
Aplikasi ini dibangun dengan prinsip:
- Sales Visit sebagai pusat proses bisnis.
- Ledger sebagai Source of Truth untuk seluruh mutasi stok.
- Projection sebagai Read Model berperforma tinggi.
- Penjualan dihitung otomatis dari hasil Stock Counting.
- Refill dihitung otomatis berdasarkan Par Stock.
- Seluruh transaksi dapat diaudit (Audit Trail).
- Mendukung mode Offline untuk aktivitas Sales Lapangan.
- Fokus pada kecepatan operasional, akurasi stok, dan percepatan arus kas bisnis konsinyasi.
