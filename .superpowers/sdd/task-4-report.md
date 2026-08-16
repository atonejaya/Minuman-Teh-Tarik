# Task 4 Report: Halaman Biaya Operasional (/operational-cost)

## Status
DONE_WITH_CONCERNS

## What I implemented
1. Created `frontend/src/modules/payroll/pages/OperationalCostPage.jsx` verbatim from the brief. It renders a month picker (defaults to current month via `toMonthKey(new Date())`) and a summary table per sales: **Sales | Hari Aktif | Uang Operasional (Rp)**, with a Total row (foot) computed via `sumBy(rows, 'uang_operasional')` and formatted with `formatRupiah`. Data loads via `PayrollApiService.getSummary(month)`; loading/empty states and toast errors handled. No drill-down.
2. Edited `frontend/src/App.jsx` with exactly the two changes specified:
   - Added `const OperationalCostPage = lazy(...)` right after the `PayrollPage` lazy import (line 38).
   - Replaced `<Route path="operational-cost" element={<ComingSoon title="Biaya Operasional" />} />` with `<Route path="operational-cost" element={<OperationalCostPage />} />` (now line 165).
   - No other lines touched.

## Verification evidence
- **Lint** (`npm run lint`, oxlint): **0 errors**, 19 warnings.
  - 18 warnings are pre-existing/unrelated files.
  - 1 **new warning**: `src/App.jsx:42:7` — `Variable 'ComingSoon' is declared but never used` (the route replaced was its only usage).
- **Build** (`npm run build`, vite): **succeeded** — 1960 modules transformed, `OperationalCostPage-*.js` chunk emitted (2.41 kB / gzip 1.01 kB). Built in ~963ms.
- **Commit**: `720f5b5` — "feat(payroll): halaman Biaya Operasional (ringkasan uang operasional per sales)", 2 files changed, 94 insertions(+), 1 deletion(-).

## Files changed
- `frontend/src/modules/payroll/pages/OperationalCostPage.jsx` (new)
- `frontend/src/App.jsx` (2-line change: lazy import + route swap)

## Self-review findings
- Component imports exactly the required modules: `PayrollApiService` (`../services/PayrollApiService`), `toMonthKey`/`sumBy` (`../utils/payrollUtils`), `formatRupiah` (`../../../utils/format.js`), `useToast` (`../../../components/toast/ToastContext`). All target files exist and export the used names.
- File content matches the brief verbatim; no extra code.
- `git diff` confirmed App.jsx changes are exactly the two described (lazy import insertion + route replacement). `ComingSoon` import left untouched per brief instruction "Do not touch any other lines".

## Issues / concerns
- **New lint warning**: the `ComingSoon` lazy import in `App.jsx` is now unused after replacing the route. The brief explicitly forbade touching other lines, so I left it. Recommended follow-up (small, separate cleanup): remove the `ComingSoon` lazy import from `App.jsx` — but only if the brief/plan author approves, since it deviates from the exact two-change diff. This is a warning only; lint still passes with 0 errors.

---

## Follow-up fix report (Minor findings)

### Changes
1. **`frontend/src/App.jsx`** — removed the now-unused lazy import line `const ComingSoon = lazy(() => import('./pages/ComingSoon.jsx'));`. `pages/ComingSoon.jsx` kept intact.
2. **`frontend/src/modules/payroll/pages/OperationalCostPage.jsx`** — `catch` block of `load()` now calls `setRows([])` before `toast.error(...)`, mirroring the Gajih page fix (PayrollPage.jsx:41).

### Verification evidence
- **Lint** (`npm run lint`, oxlint): **0 errors**, 18 warnings. The ComingSoon unused-import warning is **gone**; no new warnings in `App.jsx` or `OperationalCostPage.jsx` (remaining 18 warnings are pre-existing in unrelated files).
- **Build** (`npm run build`, vite): **succeeded** — 1959 modules transformed, built in 950ms, exit 0. No `ComingSoon` chunk emitted.
- **Node test** (`node test-payroll-utils.mjs`): **PASS** — `payroll utils: all tests passed`, exit 0.

### Commit
`0732655` — "fix(payroll): hapus import ComingSoon tak terpakai & reset rows saat error (Biaya Operasional)", 2 files changed, 1 insertion(+), 1 deletion(-).
