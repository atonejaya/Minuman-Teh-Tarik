# Supabase + Cloudflare Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate Minuman @One fully to Supabase (Postgres + PostgREST + Auth + Storage) + Cloudflare Pages, preserving the business flow in README.md, and make every role process (OWNER & SALES) work end-to-end.

**Architecture:** Frontend SPA (Vite/React) on Cloudflare Pages talks directly to Supabase via `@supabase/supabase-js`. All transactional business logic (visit, stock ledger, payment, setoran, return) lives in Postgres RPC functions. RLS enforces role access. Two layouts: OWNER (web sidebar) & SALES (mobile bottom-nav + visit wizard).

**Tech Stack:** React 19, Vite 8, `@supabase/supabase-js`, Postgres (Supabase), PostgREST RPC, Cloudflare Pages (wrangler), chart.js.

## Global Constraints

- Do NOT change the business flow described in README.md. README is source of truth for the process.
- Roles: exactly OWNER & SALES (enum `UserRole`).
- All stock/financial mutations inside transactional RPCs; never plain `.insert` for money/stock in the browser.
- Column names follow the actual Supabase schema (verified via PostgREST OpenAPI), e.g. `grand_total`, `created_at`, not old Prisma names.
- Frontend must pass `npm run build` and `npm run lint`.
- Cloudflare hosts static assets only; SPA fallback for all routes.
- Secrets (service_role key, DB password) must NOT be committed. Remove `temp-auth.cjs`, `temp-rls.cjs`.
- `wrangler.toml` keeps `[assets]` + SPA not-found handling.

---

## Task Group A — Foundation (fix build, unify Supabase data layer)

### Task A1: Fix frontend build (unresolved imports, dead services)

**Files:**
- Fix: `src/modules/sales/pages/SalesReturnList.jsx`, `SalesReturnDetail.jsx`, `SalesReturnFormPage.jsx`, `SalesTransactionList.jsx`, `SalesTransactionDetail.jsx`, `SalesTransactionFormPage.jsx`, `SalesStockIssueList.jsx`, `SalesStockIssueDetail.jsx`, `SalesStockIssueForm.jsx` — imports of `../../../components/EntityListPage` and `../../../components/StatusBadge`
- Fix: `src/contexts/MasterLookupContext.jsx` (imports missing `LookupApiService`)
- Remove/replace: `src/repositories/CustomerRepository.js`, `src/repositories/ProductRepository.js` (reference deleted services)
- Verify: `src/modules/product/services/LookupApiService.js` exists or remove dependency

**Acceptance:** `npm run build` succeeds.

### Task A2: Auth + role guard + layouts (2 roles)

**Files:**
- Modify: `src/contexts/AuthContext.jsx` (already Supabase; add role exposure, handle missing profile)
- Modify: `src/App.jsx` (route guards by role; SALES gets mobile layout, OWNER gets web layout)
- Modify: `src/layouts/DashboardLayout.jsx` → split into `OwnerLayout.jsx` (sidebar: Dashboard, Master, Operasional, Laporan, Pengaturan) and `SalesLayout.jsx` (bottom-nav: Dashboard, Visit, Setoran, Akun)

**Acceptance:** Login as `andi` → mobile sales UI; login as `owner` → web owner UI.

### Task A3: SQL migration — RLS, helper functions, dashboard RPC fixes

**Files:**
- Create: `supabase/migrations/202608140001_foundation.sql` (applied via SQL Editor by user, or `npx supabase db push` after login)

**Contents (abbreviated — full SQL inline during implementation):**
- `current_user_role()` SECURITY DEFINER helper
- RLS enable + policies for: User (self-read), Warung, Product, SalesVisit, SalesTransaction, Payment, SalesReturn, SalesStockIssue, OutletParStock, ledgers/projections (read for OWNER, self-scoped for SALES)
- Fix `get_dashboard_metrics` (correct columns `grand_total`, `created_at`, joins)
- Ensure `create_sales_transaction` handles header+items+ledger
- `NumberSequence` guarantee
- Storage bucket `visit-photos`

**Acceptance:** RPC `get_dashboard_metrics` returns valid JSON; anon key still blocked; authenticated sales sees only own data.

### Task A4: Remove secrets from repo

**Files:**
- Delete: `frontend/temp-auth.cjs`, `frontend/temp-rls.cjs`
- Update: `frontend/.env.example` (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

---

## Task Group B — Master Data (OWNER web)

### Task B1: Warung (Customer) module complete
- Fix `CustomerApiService.js` columns (`status`, `area_id`, `route_id`, pagination), hooks, pages, tabs.

### Task B2: Product module complete
- Fix `ProductApiService.js` (real columns: `name`, `cost_price`, `is_active`, `unit_id`, `category_id`), Product pages, price list via `ProductPrice`.

### Task B3: Master lookup module
- Create `LookupApiService.js`: ProductCategory, Unit, Area, Route, Warehouse, Brand, Supplier, PriceLevel, User (sales), Packaging, Tax, Regional.

### Task B4: Par Stock management (OWNER)
- CRUD `OutletParStock` per Warung + Product (target/min/max).

---

## Task Group C — Stock & Operasional (OWNER)

### Task C1: Warehouse stock view + Sales Stock Issue (Load)
- List/create Stock Issue; RPC `sales_stock_issue_confirm` posts `WarehouseLedger` (ISSUE_TO_SALES) + `SalesStockLedger` (ISSUE_FROM_WAREHOUSE) + updates `WarehouseStock`.

### Task C2: Sales Stock Return (sisa barang)
- RPC `sales_stock_return` posts `WarehouseLedger` (RETURN_FROM_SALES) + `SalesStockLedger` (RETURN_TO_WAREHOUSE).

---

## Task Group D — Sales Visit core (SALES mobile)

### Task D1: Visit plan & list
- RPC `get_sales_visit_plan(date)` — returns assigned warung for the day (PLANNED visits), filters completed.
- Page: visit list grouped Belum Dikunjungi / Selesai.

### Task D2: Visit Wizard
- Step 1 Check In: GPS (navigator.geolocation) + photo → RPC `visit_check_in` (creates SalesVisit CHECKED_IN + VisitPhoto + VisitLocation).
- Step 2 Stok: list `OutletParStock` for warung; input `physical_qty` + `expired_qty`; auto compute terjual = par − fisik, refill = par − fisik; save via RPC `visit_save_stock_count` → `OutletStockCount` + items + auto `SalesTransaction` (DRAFT→CONFIRMED) + `SalesReturn` (expired) + `OutletStockLedger` (SALE).
- Step 3 Bayar: total tagihan from step2; payment method CASH/QRIS/TRANSFER/CREDIT → RPC `visit_record_payment` → `Payment` + `PaymentAllocation` + `SalesTransaction.payment_status` + `CustomerARProjection` update.
- Step 4 Selesai: check-out photo + note → RPC `visit_check_out` → status COMPLETED, `OutletStockLedger` REFILL, `SalesStockLedger` RESTOCK_OUTLET, `OutletStockProjection` update.

### Task D3: Sales Dashboard (mobile)
- Target hari ini, cup terjual, kas dibawa (sum CASH payments today), sisa barang (SalesStockProjection).

---

## Task Group E — Finance

### Task E1: Setoran Kas
- RPC `sales_setoran_submit` (creates `Collection` DRAFT + items for CASH payments today) & `sales_setoran_verify` (OWNER → COMPLETED).
- Pages: sales setoran submit + riwayat; owner verifikasi tab.

### Task E2: Piutang / AR
- Pages using `AccountsReceivableProjection`, `CustomerARProjection`, `ARLedger`, aging.

### Task E3: Sales Return lifecycle
- RPC `sales_return_submit/approve/receive` posting `SalesStockLedger` SALE_RETURN_GOOD/BAD + `OutletStockLedger` RETURN_GOOD/RETURN_BAD.

---

## Task Group F — Dashboards, Laporan & README

### Task F1: Owner Dashboard KPI (fix `get_dashboard_metrics` usage, charts)
### Task F2: Laporan (Penjualan, Piutang, Stok, Performa Sales) via projection tables + chart.js
### Task F3: Pengaturan (users/settings read-only or basic)
### Task F4: Update README.md
- Teknologi → Supabase + Cloudflare; status sprint sinkron; tambah cara setup/deploy & SQL migration.

---

## Verification

- `npm run build` green; `npm run lint` green.
- Smoke script `scripts/smoke-visit.mjs` (Node + service key): load → stock issue → visit plan → checkin → stock count → payment → checkout → setoran → verify, asserting ledger balances.
- Manual: login sales + owner, run wizard, view dashboards.
