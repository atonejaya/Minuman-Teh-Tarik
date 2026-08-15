# Task 1 Report: Migrasi kolom `baseline_set` + RPC `get_warung_baselines`

## Status
DONE

## What was implemented
Created `supabase/migrations/202608150003_stok_baseline.sql` with the exact SQL from the task brief (Step 1):

1. `alter table public."OutletStockProjection"` — adds `baseline_set boolean not null default false` (idempotent via `if not exists`).
2. `alter type public."OutletMovementType"` — adds enum value `'ADJUSTMENT'` (idempotent via `if not exists`).
3. `public.get_warung_baselines(integer)` — security definer RPC returning `jsonb` array `[{product_id, baseline_set, opening_stock}]` for a warung. Enforces auth via `current_user_id()` (raises `'Not authenticated'`) and ownership/access via `current_user_role()` / `user_can_access_warung()` (raises `'Not authorized'`).
4. `revoke` from `public, anon` and `grant` to `authenticated` — matches the access pattern of the other RPCs.

No extra content added; SQL is verbatim from the brief.

## Files changed
- Created: `supabase/migrations/202608150003_stok_baseline.sql` (51 lines)

## Commit
- `d6d9171` — `feat(stok): kolom baseline_set + RPC get_warung_baselines` (1 file, 51 insertions)

## Self-review findings
Checked against the brief line-by-line:
- Header comment matches (Date 2026-08-15, contents description).
- `alter table` / `alter type` / `drop function` / `create or replace function` / `revoke` / `grant` blocks all present and in the exact order specified.
- RPC body matches verbatim: variable declarations, auth guards, authz guard (`v_role <> 'OWNER' and not user_can_access_warung`), JSON aggregation with `to_jsonb(t) order by t.product_id`, `coalesce(..., '[]'::jsonb)`.
- `set search_path = public, pg_temp`, `security definer`, `language plpgsql` all present.
- No placeholder text (TBD/TODO/FIXME/lorem) — verified via grep.
- Conventions verified against `supabase/migrations/202608140003_visit.sql`: same security-definer + search_path pattern, same `current_user_id()`/`current_user_role()`/`user_can_access_warung()` usage, same revoke/grant pair.
- Git commit succeeded; only the intended file staged/committed (working tree otherwise clean; `.superpowers/` remains untracked as before).

## Concerns
- None about the file content. Notes (not blockers):
  - Git reported a benign LF→CRLF warning on Windows; no action needed.
  - Steps 2–3 of the brief (running in Supabase SQL Editor and verifying `baseline_set` column) are manual user actions — no database access from this environment.
  - The repo's base schema (tables/enums) lives in Supabase, not in repo migrations; this file is consistent with that split.
