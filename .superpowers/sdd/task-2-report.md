# Task 2 Report — util murni + PayrollApiService (dengan test node)

## What I implemented
- `frontend/test-payroll-utils.mjs` — node test (verbatim from brief) asserting `toMonthKey` (3 cases) and `sumBy` (4 cases).
- `frontend/src/modules/payroll/utils/payrollUtils.js` — pure utils `toMonthKey(date)` → `'YYYY-MM'` and `sumBy(rows, key)` → number (verbatim from brief).
- `frontend/src/modules/payroll/services/PayrollApiService.js` — default-exported service wrapping `get_payroll_summary` and `get_payroll_detail` RPCs via `supabase.rpc` (verbatim from brief).

## TDD Evidence

### RED
Command: `node test-payroll-utils.mjs` (from `frontend/`)
Output:
```
Error [ERR_MODULE_NOT_FOUND]: Cannot find module '...\frontend\src\modules\payroll\utils\payrollUtils.js' imported from ...\test-payroll-utils.mjs
  code: 'ERR_MODULE_NOT_FOUND'
```
Why expected: the util file did not exist yet, so the module import failed — exactly the predicted failure mode.

### GREEN
Command: `node test-payroll-utils.mjs` (from `frontend/`)
Output:
```
payroll utils: all tests passed
```
All 7 assertions pass.

## Lint result
`npm run lint` (oxlint) from `frontend/`: **0 errors**. 18 warnings, all pre-existing in unrelated files (CustomerForm.jsx, FilterPanel.jsx, MasterDataRepository.js, VisitWizard.jsx, useCustomerTransactions.js, ProductForm.jsx, ProductFilters.jsx, WarehouseStockInForm.jsx, CompanyContext.jsx, AuthContext.jsx, ToastContext.jsx, MasterLookupContext.jsx). None of the new files produced warnings or errors.

## Files changed
- `frontend/test-payroll-utils.mjs` (new)
- `frontend/src/modules/payroll/utils/payrollUtils.js` (new)
- `frontend/src/modules/payroll/services/PayrollApiService.js` (new)

Commit: `c7240e2 feat(payroll): util toMonthKey/sumBy + PayrollApiService (RPC wrapper)` — exact message from brief, only the 3 files staged.

## Self-review findings
- File paths match the brief exactly; later tasks can import `PayrollApiService` (default) and `toMonthKey`/`sumBy` (named) from these paths.
- `PayrollApiService` calls `supabase.rpc('get_payroll_summary', { p_month: month })` and `supabase.rpc('get_payroll_detail', { p_sales_id: salesId, p_month: month })` with exact param names; both return `data || []` and throw `error`.
- Import `../../../utils/supabase` resolves correctly to `frontend/src/utils/supabase.js`, which exports `supabase` as a named export (verified).
- No extra code (YAGNI); files are verbatim from the brief.

## Issues or concerns
- None functional. Git reported LF→CRLF warnings on the 3 new files (cosmetic, matching repo behavior on Windows).
