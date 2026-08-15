# Task 2 Report: `visit_save_stock_count` — hitung penjualan dari baseline

## Status
DONE — commit `fd0908f`

## What I implemented
Modified `visit_save_stock_count` in `supabase/migrations/202608140003_visit.sql` per the task brief:

- **Step 1 — Declarations**: Added `v_opening int;`, `v_adjust int;`, `v_baseline_set boolean;` adjacent to `v_sold int;` in the `declare` block.
- **Step 2 — Sold computation (BLOK LAMA → BLOK BARU)**: Replaced the PAR-based sold calc inside the `for v_item` loop:
  - Now reads `op.baseline_set` + `op.opening_stock` from `OutletStockProjection op`.
  - If baseline not set, `v_opening` falls back to `opening_qty` from the item JSON, else `v_physical`, clamped to `>= 0`.
  - Raises exception when `v_expired > v_opening` (return exceeds baseline).
  - `v_outlet_cur := v_opening` (current projection = baseline).
  - `terjual = greatest(v_opening - v_physical - v_expired, 0)` when `v_physical <= v_opening`, else 0.
  - Inserts `OutletStockLedger` `ADJUSTMENT` row (`qty_change = v_adjust = greatest(v_physical - v_opening, 0)`) using `'ADJUSTMENT'::public."OutletMovementType"`, note `'Stok lebih dari baseline'`.
- **Step 3 — Projection block**: Replaced the `if v_sold > 0 or v_expired > 0 then` OutletStockProjection insert/update with the brief's new block:
  - Guard widened to `if v_sold > 0 or v_expired > 0 or v_adjust > 0 or not v_baseline_set then`.
  - Insert sets `current_stock = v_physical`, `opening_stock = v_opening`, `baseline_set = true`, `required_refill = greatest(v_opening - v_physical, 0)`.
  - `unique_violation` update sets same fields, accumulates `total_sales/calculated_sales/total_return`, sets `baseline_set = true`, bumps `version`.

The `if v_sold > 0` (SalesTransaction) and `if v_expired > 0` (SalesReturn) blocks were **not touched**.

## Files changed
- `supabase/migrations/202608140003_visit.sql` (1 file, +43/−11)

## How I verified the function structure
- Re-read the entire `visit_save_stock_count` function top-to-bottom (lines 152–477): declares precede body; single `begin`/`exception`/`end`; `for v_item in ... loop` (207) closed by `end loop;` (440); all `if`/`end if` matched.
- `git diff` reviewed: only the three intended regions changed; the transaction and return blocks appear as unchanged context lines.
- Grep checks:
  - No leftover old PAR sold block (`v_physical + v_expired) < v_par`) — 0 matches.
  - No leftover old projection expression (`v_par - (v_outlet_cur`) — 0 matches.
  - `'ADJUSTMENT'::public."OutletMovementType"` present exactly once.
  - `v_outlet_cur := v_opening;` present once; `'SALE', v_outlet_cur` (transaction ledger) still intact.
  - `baseline_set = true` and insert column `..., baseline_set)` present.
- Confirmed prerequisites from Task 1 (`202608150003_stok_baseline.sql`): `baseline_set` column, `OutletMovementType` `'ADJUSTMENT'` value, `opening_stock` column.

## Self-review findings
- All brief blocks copied verbatim (including cast, column lists, alignment of `into v_baseline_set, v_opening`).
- `v_par` retained for PAR-reference rows and projection — not removed.
- Downstream blocks still reference `v_outlet_cur`, `v_sold`, `v_expired` — all defined before use.
- CRLF/LF: git warns LF→CRLF normalization; cosmetic only, no content impact.

## Concerns
- No database access and no test framework here; SQL syntax/semantics not executed. User must run the full file in the Supabase SQL Editor (Step 4) and check `pg_get_functiondef` (Step 5).
- Semantic note (by design of the brief): when `v_physical > v_opening` (stock above baseline), `v_sold` is forced to 0 and an `ADJUSTMENT` ledger is written; a refill is *not* auto-created in this function (refill happens in `visit_check_out`).
