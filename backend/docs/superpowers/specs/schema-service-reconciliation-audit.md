# Schema–Service Reconciliation / Legacy Debt Audit

## Sprint 11.5B — Boundary Audit Artifact

**Status:** SPRINT 11.5B = HOLD / NOT FREEZE
**Mode:** Audit + Proposal only; no implementation authorized by this artifact

## 1. Executive Verdict

No failure identified in the current audit is classified as a regression introduced by Financial Core 11.5B.

The failures exposed during full integration are classified as pre-existing schema/service compatibility debt, a latent authentication-context contract defect, a Sales Return business-invariant gap, stale test fixtures, and test-environment isolation debt.

Financial Core 11.5B remains HOLD / NOT FREEZE. Payment Core must remain untouched while legacy debt is reconciled through separately gated remediation.

## 2. Gap Matrix

| # | Domain | Schema sekarang | Service aktif | Repository aktif | Expected contract | Gap |
|---|--------|-----------------|---------------|------------------|-------------------|-----|
| 1 | SalesTransaction (header snapshot) | customer_name / customer_code / salesman_name NOT NULL + snapshot fields (since 11.0C) | Legacy src/services/sales-transaction.service.js (frozen 10.5) — does not send snapshot | repositories/sales-transaction.repository.js (frozen 10.5) — still maps category (stale key) | Modular modules/sales/services/SalesTransactionService.js (11.0C) fills snapshot via ValidationPipeline | Wiring/drift: modular contract exists but is not mounted; app.js:188 uses legacy route; active path is out-of-contract |
| 2 | Product pricing | Product.selling_price removed; pricing is in ProductPrice[] since 11.0C | warehouse-settlement.service.js:69-70 reads stock.product.selling_price → undefined/NaN; product.service.js:42 legacy path does similarly | warehouse-settlement.repository.js passes through unit_price | Read active ProductPrice with RETAIL source | Stale accessor |
| 3 | Auth user context | User.id | visit.service.js (9 refs) + auth.controller.js:32 read user.sub; legacy sales-return.controller.js:33 reads user.userId (third key) | — | Single contract: req.user.id; auth.middleware.js:22 sets req.user to full DB row | user-context fragmented across sub / id / userId; partial 11.5B remediation exposed the latent defect |
| 4 | SalesReturn | Current SalesReturn + item schema | modules/sales/services/SalesReturnService.js (11.0C) — no invoice-status validation | — | Reject return for non-CONFIRMED invoice (DRAFT/CANCELLED → 409); batch membership required; qty ≤ invoice qty | Missing business invariant; not merely fixture debt |
| 5 | Migration / DB drift | schema.prisma (HEAD + Finance 11.5B additions) | — | — | Repo migration history must reproduce DB | Drift: snapshot + Finance structures exist via db push; live _prisma_migrations contains 20260809000000_corrective_production_sync, absent from repo |
| 6 | Test isolation | — | — | — | Test environment must not contaminate suites | Shared DB: leftover active visit warung HR blocked check-in with ACTIVE_VISIT_EXISTS |

## 3. Evidence Summary

### 3.1 SalesTransaction Snapshot Contract

Commit 695aa7c introduced the snapshot fields.

Current schema.prisma contains the mandatory snapshot fields.

Runtime failure: Argument customer_name is missing from sales-transaction.repository.js:8, called by sales-transaction.service.js:75.

The modular 11.0C service already implements the intended snapshot contract but is not mounted by app.js.

Classification: Schema compatibility debt since 11.0C; pre-existing to 11.5B.

### 3.2 Product Pricing

Migration 20260807094200_sprint_10_8a_2_erp_enhancements backfilled ProductPrice and removed Product.selling_price.

Current Product model exposes prices ProductPrice[], not selling_price.

Runtime failure: Argument unit_price is missing from warehouse-settlement.repository.js:12, caused by undefined pricing read in the frozen settlement service.

Classification: Pre-existing schema compatibility debt since 11.0C.

### 3.3 Authentication Context

auth.middleware.js resolves the token and sets req.user to the database user row.

That row has id, not JWT sub.

Frozen visit.service.js compares visit.sales_id !== user.sub, producing deterministic 403 for SALES ownership checks.

The partial 11.5B sub → id controller remediation allowed the request to progress far enough to expose this latent defect.

Read-only pre-audit (G3 scope): 10 user.sub reads found — 9 in visit.service.js (lines 18, 73, 155, 165, 177, 188, 209, 228, 247), 1 in auth.controller.js:32 — plus a third contract key: legacy sales-return.controller.js:33 reads req.user.userId. The rest of the app reads req.user.id.

Classification: Pre-existing auth contract defect, not an 11.5B regression.

### 3.4 Sales Return

The test fixture is stale relative to the current schema:

SalesTransaction fixture omits mandatory snapshot fields.

Item fixture uses category rather than category_name.

More importantly, the service itself lacks the expected invoice-status guard:

DRAFT/CANCELLED invoices should be rejected with 409.

Batch membership and quantity ceilings are expected invariants.

Classification: Stale fixture + masked service business-invariant gap.

### 3.5 Migration / DB Drift

Read-only DB inspection indicates:

Current DB contains snapshot and Finance structures.

Live _prisma_migrations contains 20260809000000_corrective_production_sync.

That migration is not present in the repository migration directory.

Snapshot columns appear to have reached the DB via db push rather than a reproducible repository migration.

Classification: Migration reproducibility / schema drift debt.

### 3.6 Test Isolation

The visit suite encountered ACTIVE_VISIT_EXISTS because a prior run left an active visit for warung HR in the shared database. The guard executes before later validation.

Classification: Test-environment isolation debt, not an application regression.

## 4. Accepted Classification

| Class | Items |
|-------|-------|
| Schema compatibility debt since 11.0C | #1 SalesTransaction snapshot, #2 Product pricing |
| Pre-existing auth contract defect | #3 user.sub vs req.user.id |
| Business invariant gap | #4 SalesReturn |
| Migration / reproducibility debt | #5 DB migration drift |
| Test-environment isolation debt | #6 shared DB contamination |

No item above is currently classified as an 11.5B Financial Core regression.

## 5. Remediation Proposal — Separate Gates

The reconciliation phase must remain independent from Financial Core implementation.

**G1 — Reconcile Snapshot Contract**

Choose one official path before implementation.

Recommended: mount the modular SalesTransaction service on the intended route, deprecate the legacy path, and verify the modular contract end-to-end.

Alternative: backfill the legacy service/repository, but only if architecture review explicitly selects that path.

**G2 — Pricing Accessor**

Replace legacy selling_price access with an active ProductPrice lookup, using the defined RETAIL source.

**G3 — Auth Contract**

Normalize the application to one user-context contract: req.user.id.

The pre-audit found three keys in use: sub (10 refs), id, and userId (sales-return.controller.js:33). G3 scope covers all non-id consumers: the 10 user.sub reads in visit.service.js and auth.controller.js, plus the userId read in the legacy sales-return controller.

**G4 — SalesReturn Invariants**

Create a separate scope gate covering:

invoice status validation,

batch membership,

quantity ceiling,

corresponding fixture refresh.

Fixtures must not be changed merely to make tests green while leaving the missing business invariant unresolved.

**G5 — Migration Drift**

Create a forward-only migration reconciliation so repository migration history can reproduce the current DB schema.

No ad-hoc db push, --accept-data-loss, or destructive reset is permitted as a substitute for migration reconciliation.

**G6 — Test Environment Isolation**

Document and implement a deterministic test isolation strategy, such as:

dedicated test database,

per-suite isolation,

or comprehensive cleanup with verifiable ownership.

Do not reset/drop the shared DB merely to erase evidence.

## 6. Execution Order

G3 → G1 → G2 → G4 → G5 → G6

Rationale:

- G3 exposes/normalizes the user-context contract.
- G1 restores the intended SalesTransaction application path.
- G2 reconciles pricing access.
- G4 closes the SalesReturn business invariant.
- G5 makes schema state reproducible.
- G6 closes environmental contamination and makes regression evidence trustworthy.

## 7. Acceptance Criteria Per Gate

A remediation gate may be marked PASS only when:

- Its targeted tests are GREEN.
- Adjacent/frozen regression suites remain GREEN.
- No behavior outside the declared scope changes.
- No Financial Core code is modified.
- No destructive DB reset is used to obtain GREEN results.
- Provenance of every schema/code change is documented.
- The next gate has an explicit boundary and authorization.

## 8. Explicit Non-Goals

This phase does not authorize:

- changes to src/modules/finance/**,
- changes to Payment / ARLedger / allocation logic,
- modifications to frozen Financial Core tests to mask defects,
- broad refactoring unrelated to the six reconciliation items,
- destructive DB reset/drop,
- Cloudflare or Supabase changes.

## 9. Gate Status

SPRINT 11.5B: HOLD / NOT FREEZE

The Financial Core implementation remains a freeze candidate only after:

- legacy debt remediation is separately scoped and gated,
- full regression returns GREEN,
- no Financial Core regression is found,
- and a dedicated 11.5B Freeze Review authorizes the tag v11.5B.

Current phase: Audit + proposal only. Implementation authorization: Not granted by this artifact.
