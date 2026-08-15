# Report: Task 1 — RPC `admin_reset_data`

**Date:** 2026-08-15
**Status:** DONE

## What I implemented

Created a new Supabase migration file containing a single RPC function `public.admin_reset_data(p_confirm text) returns jsonb` that atomically wipes all operational data while preserving master data.

The function:
- Guards with `public.current_user_role() <> 'OWNER'` → `raise exception 'Not authorized'`.
- Requires confirmation literal `RESET` (`p_confirm is distinct from 'RESET'`).
- Deletes 31 operational tables in child→parent FK-safe order, with `"SalesTransaction"` and `"SalesVisit"` as the two last deletes.
- Deletes all rows from `storage.objects` for bucket `visit-photos`.
- Returns `jsonb_build_object('success', true, 'message', ...)`.
- Wraps body in `exception when others` that re-raises with `admin_reset_data failed: %` + `SQLERRM`.
- Uses `security definer`, `set search_path = public, pg_temp`, `language plpgsql`.
- Revokes execute from `public, anon` and grants to `authenticated` with `(text)` signature.

## Files changed

- Created: `supabase/migrations/202608150004_reset_data.sql` (73 lines)

## Self-review findings

Checked against the brief's checklist:
- `security definer` present (line 17). ✓
- `set search_path = public, pg_temp` present (line 18). ✓
- `language plpgsql` present (line 16). ✓
- `revoke`/`grant` at end with `(text)` signature (lines 72–73). ✓
- No `CREATE TABLE` — function only (`create table` count = 0). ✓
- Delete order: `"SalesTransaction"` (line 59) and `"SalesVisit"` (line 60) are the two last deletes before `return`. ✓

Automated verification:
- Programmatic diff of the brief's ```sql block against the written file: **VERBATIM MATCH (73 lines)** — zero line differences.
- No placeholder text (`TBD`/`TODO`/`FIXME`/`placeholder`) found. ✓

## Concerns

- None. Table names quoted as in the brief (mixed-case `"..."` identifiers) — matches existing migrations' convention.
- Note: file written with LF line endings; Git will convert to CRLF on checkout (informational only).
- Actual SQL execution is not possible from this environment (no DB access); correctness verified by content match, not by running the function.
