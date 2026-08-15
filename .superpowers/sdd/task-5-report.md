# Task 5 Report — Dashboard owner: 3 KPI stok klik-able

## What I implemented
Applied the brief's replacement code to `OwnerDashboard.jsx`, verbatim:

1. **Import** — added `import { useNavigate } from 'react-router-dom';` (BrowserRouter app, so `useNavigate` instead of hash links).
2. **Hook** — added `const navigate = useNavigate();` inside the component.
3. **Fetch blocks** — inside the existing `Promise.all`, after `WarehouseStock` (`warehouseRes`) and before the last-7-days query, added:
   - `supabase.from('SalesStockProjection').select('qty_available').limit(5000)` → `salesStockRes`
   - `supabase.from('OutletStockProjection').select('current_stock').limit(5000)` → `outletStockRes`
   - Updated the destructuring to include `salesStockRes, outletStockRes`.
4. **State** — in `setData({ ... })` added `stokKendaraan: sum(salesStockRes.data, 'qty_available')` and `stokWarung: sum(outletStockRes.data, 'current_stock')`.
5. **KPI cards** — replaced the old `Stok Gudang` + `Visit Hari Ini` cards with the 3 new cards (per the brief's verbatim block): Stok Gudang, Stok Kendaraan, Stok Warung, each with a `Lihat` link using `e.preventDefault()` + `navigate('/stok?tab=gudang|kendaraan|warung')` and value in `cup` formatted with `toLocaleString('id-ID')`.

## Files changed
- `frontend/src/modules/dashboard/components/OwnerDashboard.jsx` (only file; +11 / -2)

## Build output summary
`npm run build` (workdir `frontend/`): **SUCCESS** — Vite v8.2.1, 1947 modules transformed, built in ~952ms, no errors. `dist/` emitted normally.

## Lint output summary
`npx oxlint src/modules/dashboard/components/OwnerDashboard.jsx` (workdir `frontend/`): **CLEAN** — exit 0, no warnings or errors.

## Self-review findings
- All 5 steps of the brief applied; code matches the brief verbatim.
- `navigate('/stok?tab=...')` is forward-compatible: `/stok` route arrives in Task 6. Until then clicking `Lihat` will land on a not-found page — acceptable by design.
- Note: the brief's replacement removes the "Visit Hari Ini" card. `visitsToday` is still computed and stored in `data` (unused) — kept as-is per "apply verbatim"; harmless.
- `sum` helper already existed; reused for the two new fetches.
- Unit label changed from `unit` (old Stok Gudang card) to `cup` for all 3 new cards, per brief.

## Concerns
- None blocking. `/stok` route does not exist until Task 6; the dashboard references it only on click (no hard dependency).
- `visitsToday` is now effectively dead data in `data` — optional cleanup in a later task.

## Commit
- `e52c219` — `feat(stok): dashboard owner 3 KPI stok klik-able` (1 file changed)
