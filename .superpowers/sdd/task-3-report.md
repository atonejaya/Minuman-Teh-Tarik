# Task 3 Report: `visit_check_out` — refill dari baseline, bukan PAR

## Status: DONE

## What I implemented

Replaced the stock-count loop query block inside `visit_check_out` in
`supabase/migrations/202608140003_visit.sql` per the task brief (BLOK LAMA → BLOK BARU):

- The loop's `select` now reads the baseline from `public."OutletStockProjection"` via
  `coalesce(op.opening_stock, 0) as baseline_qty` instead of joining
  `public."OutletParStock"` and reading `op.par_qty`.
- `v_par := v_item.baseline_qty;` (the `v_par` variable is reused as the baseline, as the
  brief states; its declaration remains unchanged).
- `v_refill := greatest(v_par - v_physical, 0);` unchanged → refill = `greatest(baseline − fisik, 0)`.

Downstream logic in the same loop was intentionally left as-is and stays consistent:

- Ledger REFILL: `qty_before = v_physical`, `qty_change = v_refill`, `qty_after = v_par` (= baseline).
- Stock-blocking check unchanged (`if v_sales_balance < v_refill then raise exception
  'Stok kendaraan tidak cukup: % (butuh % , tersedia %)', ...`).
- `RESTOCK_OUTLET` ledger and `OutletStockProjection` update (`current_stock = v_par` = baseline,
  `total_refill = total_refill + v_refill`, `required_refill = 0`) unchanged.

## Files changed

- `supabase/migrations/202608140003_visit.sql` (single hunk, 3 insertions / 3 deletions).

## How I verified the function structure

- Read the edited `for v_item in select ... loop` block in full (lines 719–779) after the edit.
  The select references `public."OutletStockProjection"` with alias `baseline_qty`, and
  `v_par := v_item.baseline_qty;` is set.
- Confirmed the block-checking code (`if v_sales_balance < v_refill then raise exception
  'Stok kendaraan tidak cukup...'`) remains unchanged (lines 745–749).
- Confirmed `v_par int;` declaration still exists inside `visit_check_out` (line 660) within
  the function definition at lines 642–795.
- `git diff` showed only the intended hunk — no other function in the file was altered.
- Grep for `par_qty` / `OutletParStock`: the only remaining `OutletParStock`/`par_qty`
  usage in this file is in a different function (line 218), so there is no orphaned code
  left in `visit_check_out`.

## Self-review findings

- The diff is exactly the 6 lines specified by the brief (3 changed lines on each side).
- No orphaned variable references: `v_par`, `v_physical`, `v_refill`, `v_sales_balance` all
  still used consistently within the loop.
- Note: baseline semantics mean `qty_after`/`current_stock` now converge on `opening_stock`
  rather than PAR, which matches the plan's baseline model. `required_refill = 0` is still
  set after a successful refill, consistent with prior behavior.

## Concerns

- None. Step 2 (running the full file in Supabase SQL Editor) and Step 3 (verification query
  `select proname from pg_proc where proname = 'visit_check_out';`) require the user to run
  the SQL against the database; no DB access is available from this environment.
