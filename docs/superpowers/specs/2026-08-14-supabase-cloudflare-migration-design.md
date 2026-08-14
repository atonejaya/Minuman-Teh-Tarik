# Migrasi Backend ke Supabase + Cloudflare (Pure Stack)

**Tanggal:** 2026-08-14
**Status:** Final (user approval via instruction to proceed)

## Konteks

Project Minuman @One sebelumnya memiliki backend Node.js + Express + Prisma yang
di-deploy ke Render/Vercel. Backend tersebut dihapus. Tujuan: aplikasi berjalan
murni di atas **Supabase** (Postgres + PostgREST + Auth + Storage) dan
**Cloudflare Pages** (hosting frontend statis SPA). Tidak ada perubahan alur
bisnis yang tercantum di `README.md` — alur tersebut menjadi source of truth.

## Arsitektur

```
[SALES mobile]   [OWNER web]
        \         /
         V        V
   Cloudflare Pages (SPA statis, SPA fallback)
         |
   supabase-js (anon key + session JWT)
         |
   Supabase: PostgREST (CRUD + RPC), Postgres functions,
             RLS per role, Auth, Storage (foto visit)
```

Keputusan yang sudah disetujui user:
1. Business logic di **Supabase RPC (Postgres functions)** + PostgREST.
2. **2 role**: OWNER & SALES (sesuai README dan enum `UserRole`).
3. **Layout**: SALES = mobile (bottom nav + visit wizard), OWNER = web (sidebar).
4. Cloudflare hanya serve frontend statis (tidak ada Worker).

## Kondisi Awal (audit)

- Database Supabase sudah berisi 80+ tabel hasil migrasi schema Prisma.
- `User` berisi 4 user; 2 di antaranya punya `auth_id` (owner=783, andi=784).
- Frontend Vite+React sudah memakai `@supabase/supabase-js` untuk auth.
- `wrangler.toml` ada untuk Cloudflare Pages.
- RPC `get_dashboard_metrics` RUSAK: referensi `total_amount` (tidak ada).
- Frontend TIDAK build: unresolved import di halaman sales,
  `LookupApiService` hilang, repositori top-level mereferensikan service lama.
- Dashboard components memakai kolom salah (`total_amount`, `transaction_date`).
- Repository sales melakukan insert mentah tanpa workflow/ledger.
- Tidak ada halaman Sales Visit, Setoran, Operasional Owner, Laporan, Master
  data lengkap, Par Stock.
- README.md bagian "Teknologi" masih menyebut Node.js/Express/Prisma dan
  halaman status sprint belum sinkron dengan implementasi.

## Rencana Penerapan Ulang

### Fase 1 — Foundation
- Perbaiki semua error build frontend (import, komponen entity, service hilang).
- Satu sumber data Supabase; hapus sisa axios/`services/api.js` yang tak dipakai.
- Role guard berbasis 2 role (OWNER/SALES).
- Layout terpisah: OwnerLayout (web) & SalesLayout (mobile).
- SQL: fix RPC dashboard & sales transaction; RLS policies; helper
  `current_user_role()`; `NumberSequence`; Storage bucket foto visit.
- Update README.md.

### Fase 2 — Master Data (OWNER)
- Produk, Warung (Customer), Area, Rute, Sales (User), Kategori, Price Level,
  Warehouse, Par Stock. CRUD via PostgREST + RPC kecil.

### Fase 3 — Stock & Operasional
- Warehouse stock, Sales Stock (Load/Stock Issue), posting
  `WarehouseLedger` + `SalesStockLedger`, Par Stock management, projection.

### Fase 4 — Sales Visit (core, SALES mobile)
- Visit plan harian → Check-in (GPS+foto) → Stock Count + Auto Sales/Refill →
  Pembayaran → Check-out. RPC transaksional, posting `OutletStockLedger`,
  `SalesTransaction`, `Payment`, `SalesReturn`, projection.

### Fase 5 — Finance
- Payment allocation, AR/Piutang, Setoran Kas (sales submit + owner verify),
  Sales Return lifecycle (DRAFT→CHECKED→APPROVED→COMPLETED), idempotency.

### Fase 6 — Dashboard & Laporan
- KPI Owner, KPI Sales, laporan penjualan/piutang/stok/performa, grafik.

## Integritas

- Semua mutasi stok & finansial di dalam transaksi RPC.
- Kode dokumen via `NumberSequence`.
- Idempotency pembayaran via `FinanceIdempotencyKey`.
- Projection (AR, stok outlet/sales, dashboard) di-update dalam RPC.

## Verifikasi

- `npm run build` + `npm run lint` hijau.
- Smoke-test Node: simulasikan 1 siklus penuh (load → visit → bayar → setoran →
  verifikasi) dan cek keseimbangan ledger.
- Deploy: `npx wrangler pages deploy dist`.

## Catatan Deploy & Secret

- `.env`/`.env.production` berisi `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- `temp-auth.cjs` / `temp-rls.cjs` berisi kredensial sensitif — tidak boleh
  di-commit; pindahkan ke variabel environment / Supabase CLI.
