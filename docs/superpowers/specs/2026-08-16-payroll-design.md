# Design: Modul Gajih & Biaya Operasional (OWNER)

Tanggal: 2026-08-16
Status: Disetujui user (per bagian)

## Ringkasan

Mengimplementasikan dua menu OWNER yang selama ini placeholder (`ComingSoon`):
`/payroll` (Gajih) dan `/operational-cost` (Biaya Operasional). Perhitungan
mengikuti desain komisi & uang operasional pada
`2026-08-16-sidebar-accordion-komisi-design.md` bagian 4, memakai parameter
`commission_per_cup` (default Rp500) dan `fuel_allowance` (default Rp10.000/hari)
yang sudah ada di halaman Pengaturan → Penggajian (`Setting`).

Versi pertama **hitung langsung** dari transaksi: tanpa tabel snapshot `Payroll`,
tanpa status bayar (dibayar/belum). Sisi SALES (kartu "Gaji Bulan Ini" di halaman
Akun) tidak dikerjakan sekarang.

## Definisi & Rumus

- **Cups terjual** = Σ `qty` pada `SalesTransactionItem` milik transaksi valid
  (`status <> 'CANCELLED'`) di bulan tersebut.
- **Hari aktif** = jumlah tanggal berbeda dalam bulan di mana sales memiliki
  transaksi valid (`COUNT(DISTINCT created_at::date)`).
- **Komisi** = cups terjual × `commission_per_cup`.
- **Uang operasional** = hari aktif × `fuel_allowance`.
- **Total gaji** = komisi + uang operasional.

## Bagian 1 — RPC Layer

Migration baru `supabase/migrations/202608160003_payroll.sql`.

### `get_payroll_summary(p_month text)`

- `security definer`, `set search_path = public, pg_temp`.
- Guard: `public.current_user_role() <> 'OWNER'` → `raise exception 'forbidden'`.
- Validasi `p_month` format `YYYY-MM` → selain itu `raise exception 'invalid month'`.
- Untuk **semua sales aktif** (`User.role` berisi `'SALES'` dan `is_active`),
  left join agregasi transaksi valid bulan `p_month` (`date_trunc('month',
  created_at) = to_date(p_month, 'YYYY-MM')` dan `status <> 'CANCELLED'`).
  Bandingkan role via text cast (`u.role::text = 'SALES'`) agar bebas dari error
  enum-coercion (konsisten dengan catatan di foundation).
- Sales tanpa transaksi tetap muncul dengan angka 0.
- Nilai setting dibaca dari `Setting` (`commission_per_cup`, `fuel_allowance`),
  fallback default `500` dan `10000` bila tidak ada.
- Kolom return (urutan): `sales_id int`, `sales_name text`, `cups bigint`,
  `hari_aktif int`, `komisi numeric`, `uang_operasional numeric`, `total numeric`.

### `get_payroll_detail(p_sales_id int, p_month text)`

- `security definer`, guard OWNER sama, validasi bulan sama.
- Per tanggal di bulan `p_month` untuk sales `p_sales_id` (transaksi valid saja):
  `tanggal date`, `jumlah_transaksi bigint`, `cups bigint`,
  `komisi_hari numeric` (cups hari × `commission_per_cup`),
  `uang_op_hari numeric` (`fuel_allowance` bila hari itu aktif, else 0).
- Tanpa data → result kosong (bukan error).

## Bagian 2 — Halaman Gajih (`/payroll`)

- Modul baru `frontend/src/modules/payroll/`. Route `/payroll` di `App.jsx`
  mengganti `ComingSoon` (tetap dalam grup `RequireRole roles={['OWNER','ADMIN']}`).
- Header "Gajih" + month picker `<input type="month">` (default bulan berjalan;
  state `YYYY-MM`).
- Tabel per sales: **Sales | Cups Terjual | Komisi (Rp) | Hari Aktif |
  Uang Operasional (Rp) | Total Gaji (Rp)**, data dari `get_payroll_summary`.
- **Klik baris sales** → detail per tanggal tampil inline di bawah baris
  (fetch `get_payroll_detail` saat baris dibuka): **Tanggal | Jumlah Transaksi |
  Cups | Komisi Hari | Uang Operasional Hari**. Klik lagi untuk menutup.
- Rupiah diformat dengan util `formatRupiah` yang sudah ada di
  `frontend/src/utils/format.js`.
- Loading state saat fetch; error → `toast.error`; detail tanggal kosong →
  empty state "Belum ada transaksi".

## Bagian 3 — Halaman Biaya Operasional (`/operational-cost`)

- Route `/operational-cost` mengganti `ComingSoon` (grup role sama).
- Month picker sama; tabel per sales: **Sales | Hari Aktif |
  Uang Operasional (Rp)** — memakai `get_payroll_summary` yang sama
  (hanya kolom uang operasional yang ditampilkan). Tanpa drill-down.
- Loading & error state sama seperti Gajih.

## Error Handling & Edge Case

- Non-OWNER memanggil RPC → exception `forbidden` → toast "Tidak punya akses".
- `p_month` malformed → exception `invalid month`.
- Sales tanpa transaksi di bulan tsb → tampil 0.
- Bulan tanpa data sama sekali → tabel tetap menampilkan sales aktif (0).
- Setting belum ada → fallback default (500/10000).
- Detail per tanggal kosong → empty state, bukan error.

## Pengujian

- Migration: di-apply user di Supabase SQL Editor; verifikasi query percobaan
  (mis. `select * from get_payroll_summary('YYYY-MM')` dan
  `get_payroll_detail(...)`).
- Frontend: lint + build; test node pola existing untuk logika bantu murni
  (bila ada).
- Deploy `npx wrangler deploy` dari `frontend/`, lalu cek browser
  (PENDING human): pilih bulan, isi tabel benar, klik baris → detail tanggal,
  angka konsisten dengan transaksi valid.

## Lingkup Non-Goal

- Tidak ada tabel snapshot `Payroll` / status bayar (dibayar/belum) di versi ini.
- Tidak ada sisi SALES (kartu "Gaji Bulan Ini" di halaman Akun).
- Tidak ada bonus dadakan.
- Tidak ada pencatatan pengeluaran nyata dari sales.
- Tidak menambah dependency/library baru.
