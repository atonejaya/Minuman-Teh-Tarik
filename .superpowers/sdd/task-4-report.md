# Task 4 Report: VisitWizard — input Stok Awal Titipan & perhitungan baseline

## What I implemented

Switched the VisitWizard stock step from the old "PAR − fisik" model to the new
"baseline (stok awal titipan)" model on the sales-facing frontend:

1. **`VisitApiService.getWarungBaselines(warungId)`** — new method calling the
   `get_warung_baselines` RPC with `p_warung_id`, placed after `getPlan`.
2. **`loadStock`** — now fetches Par stock and baselines in parallel
   (`Promise.all`); merges baseline info into a Map keyed by `product_id`; each
   row now carries `baseline_set` and `opening`. For baselined products
   `opening` = saved `opening_stock`; for non-baselined products `opening`
   defaults to `par_qty` (editable input).
3. **`totalTagihan`** — now computes sold = `max(opening − physical − expired, 0)`
   and multiplies by `selling_price` (baseline instead of PAR).
4. **`handleSaveStock` items** — now sends `opening_qty` (only for
   non-baselined rows; `undefined` when `baseline_set`), consumed by
   `visit_save_stock_count`.
5. **Stock table header** — renders "Stok Awal" column label only when the
   first row is not baselined; adds `has-opening` class.
6. **Stock rows render** — shows a `Stok Awal` number input only for
   non-baselined rows; info line shows "Stok awal N" for baselined rows or
   "Kunjungan pertama (baseline)" otherwise; rows get `has-opening` class.
7. **CSS** — `.stock-row.has-opening { grid-template-columns: 1fr 72px 72px 72px; }`
   added next to `.stock-row`; default 3-column layout unchanged for baselined
   warungs.

All code applied verbatim from `task-4-brief.md`.

## Files changed

- `frontend/src/modules/visits/services/VisitApiService.js` (+4 lines)
- `frontend/src/modules/visits/pages/VisitWizard.jsx` (72 changed: 56 insertions, 21 deletions)
- `frontend/src/styles/components.css` (+1 line)

## Build output summary

`npm run build` (workdir `frontend/`):
- **Success** — `vite v8.2.1`, 1947 modules transformed, `✓ built in 564ms`,
  no errors.

## Lint output summary

`npx oxlint src/modules/visits/pages/VisitWizard.jsx src/modules/visits/services/VisitApiService.js`:
- **No errors.**
- 1 pre-existing warning (unrelated to this task):
  `VisitWizard.jsx:161:23 react-hooks(exhaustive-deps)` — missing `navigate`
  dependency in a `useEffect` that predates this change (not touched).

## Self-review findings

- All replacement blocks match the brief verbatim (diff inspected against the
  brief line-by-line).
- `getWarungBaselines` uses the already-imported `supabase` client and the
  correct `{ p_warung_id: warungId }` parameter.
- `baselineMap` handles missing rows gracefully (`|| { baseline_set: false, opening_stock: 0 }`).
- `opening_qty: r.baseline_set ? undefined : ...` — undefined keys are omitted
  by Supabase JSON serialization, so `visit_save_stock_count` only receives
  `opening_qty` for first-visit rows (matching Task 3's SQL contract).
- Grid CSS: `.has-opening` overrides `grid-template-columns` to 4 columns;
  base `.stock-row` remains 3 columns for baselined warungs.
- Note: brief Step 9's `git add` listed only the two JS files, but the CSS
  change (Step 5b) is part of this task, so all three files were staged and
  committed.

## Any concerns

- The lint warning at `VisitWizard.jsx:161` is pre-existing and out of scope;
  no action taken.
- The `opening` input value is a string while `totalTagihan` uses
  `Number(r.opening || 0)`, so typing is safe.
- Backend (Tasks 1–3) is assumed already deployed; frontend RPC calls will fail
  if the `get_warung_baselines` RPC is not yet live in the Supabase project.
