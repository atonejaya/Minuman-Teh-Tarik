# Task 6 Report: Verifikasi final

**Status:** DONE_WITH_CONCERNS (one step PENDING HUMAN — visual browser check)

## Step 1: Node tests — PASS

Command (from `frontend/`):
```
node test-sidebar-menu.mjs; if ($?) { node test-sidebar-config.mjs }
```

Output:
```
sidebar menu utils: all tests passed
sidebar config: 6 top-level items OK
```

Both scripts ran (second ran only after first exited 0), exit code 0.

## Step 2: Lint & build — PASS

Command (from `frontend/`):
```
npm run lint; if ($?) { npm run build }
```

Lint output: `oxlint` produced **warnings only, zero errors**. All 18 warnings are pre-existing and located in files unrelated to this feature (FilterPanel.jsx, WarehouseStockInForm.jsx, AuthContext.jsx, MasterDataRepository.js, CompanyContext.jsx, ProductFilters.jsx, ProductForm.jsx, ToastContext.jsx, useCustomerTransactions.js, CustomerForm.jsx, MasterLookupContext.jsx, VisitWizard.jsx). No warnings in `OwnerLayout.jsx` or any sidebar/accordion files.

Build output (tail): `✓ built in 742ms` — 1956 modules transformed, `dist/` emitted.

## Step 3: Regression grep — PASS

Command (from worktree root):
```
Select-String -Path "frontend/src/layouts/OwnerLayout.jsx" -Pattern "masterItems|operasionalItems|keuanganItems|section\("
```

Output: **(no output)** — zero matches. Old flat-nav item arrays and `section(` helper fully removed from `OwnerLayout.jsx`.

## Step 4: Verifikasi manual di browser — PENDING HUMAN

No browser tooling available in this environment; a dev server was NOT started and no visual click-through was performed. A human must verify the following checklist manually:

Login sebagai OWNER di `npm run dev`:
1. Sidebar menampilkan: Dashboard, Input, Operasional, Master Data, Keuangan, Pengaturan.
2. Klik "Operasional" → submenu terbuka (6 item sesuai spec); klik "Master Data" → Operasional otomatis tertutup, Master Data terbuka.
3. Klik "Operasional" lagi → tertutup.
4. Buka `/sales/transactions` langsung → grup Operasional auto-terbuka, item Transaksi aktif.
5. Buka `/dashboard` → semua grup tertutup.
6. Klik "Gajih" → halaman placeholder (ComingSoon "Gajih"); klik "Biaya Operasional" → placeholder serupa.
7. Sidebar SALES (login sebagai sales) tidak berubah (bottom nav sama seperti sebelumnya).

## Step 5: Commit bila ada penyesuaian — SKIPPED

No adjustments needed for the automated steps. No commit was made.

## Kesimpulan

Automated verification (Steps 1–3) passed fully: node tests green, lint clean (warnings only, none feature-related), production build succeeds, and no remnants of the old flat-nav code. The only outstanding item is the visual browser check (Step 4), which requires a human.

## Final-review fixes

Applied all 6 findings from the final whole-branch review. Commit: `fix(sidebar): tutup grup di route top-level + hardening segment & test`.

### Changes

1. **Auto-open effect closes groups on top-level routes** — `frontend/src/layouts/SidebarMenu.jsx`: replaced the guarded `useEffect` (`if (active !== null && active !== openKey)`) with an unconditional `setOpenKey(findOpenGroupForPath(location.pathname, MENU_CONFIG))` on `[location.pathname]`. Removed the `// eslint-disable-line react-hooks/exhaustive-deps` comment. Kept the `useState` lazy initializer. Navigating to `/dashboard` or `/settings` now closes any manually-opened group.
2. **Segment-boundary hardening** — `frontend/src/layouts/sidebarMenuUtils.js`: `path.startsWith(child.to)` → `path === child.to || path.startsWith(\`${child.to}/\`)` so `/sales/stock-in-2` no longer matches `/sales/stock-in`.
3. **Config structure assertions** — `frontend/test-sidebar-config.mjs`: added `MENU_CONFIG.length === 6`, key order `['dashboard','input','operasional','master-data','keuangan','settings']`, and per-group children counts (`input: 2`, `operasional: 6`, `master-data: 10`, `keuangan: 5`).
4. **Segment-collision regression test** — `frontend/test-sidebar-menu.mjs`: added `findOpenGroupForPath('/sales/stock-in-2', config) === null`.
5. **Dead CSS removed** — `frontend/src/styles/components.css`: deleted `.owner-nav-section` and `.owner-nav-section-title` rules (no longer produced by any markup).
6. **DRY + a11y** — `frontend/src/layouts/SidebarMenu.jsx`: extracted module-level `navLinkClass` helper used by both top-level and submenu `NavLink`s (removed duplicated inline callbacks); added disclosure-pattern `aria-controls` on the group button and `id={\`${item.key}-submenu\`}` on the submenu container.

### Files changed

- `frontend/src/layouts/SidebarMenu.jsx`
- `frontend/src/layouts/sidebarMenuUtils.js`
- `frontend/src/styles/components.css`
- `frontend/test-sidebar-config.mjs`
- `frontend/test-sidebar-menu.mjs`
- `.superpowers/sdd/task-6-report.md` (this file)

### Verification

All commands run from `frontend/`.

**1. `node test-sidebar-menu.mjs`** — exit 0:
```
sidebar menu utils: all tests passed
```

**2. `node test-sidebar-config.mjs`** — exit 0:
```
sidebar config: 6 top-level items OK
```

**3. `npm run lint`** — exit 0, 0 errors. Warnings are all pre-existing in unrelated files (`CustomerForm.jsx`, `ProductForm.jsx`, `VisitWizard.jsx`, `MasterLookupContext.jsx`, `ToastContext.jsx`, `WarehouseStockInForm.jsx`, `ProductFilters.jsx`, `FilterPanel.jsx`, `MasterDataRepository.js`, `useCustomerTransactions.js`, `AuthContext.jsx`, `CompanyContext.jsx`). `SidebarMenu.jsx` is clean — no unused vars, no eslint-disable comments.

**4. `npm run build`** — exit 0:
```
vite v8.2.1 building client environment for production...
✓ built in 852ms
```
