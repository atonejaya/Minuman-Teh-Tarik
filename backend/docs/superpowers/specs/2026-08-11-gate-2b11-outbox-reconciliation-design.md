# Gate 2B.11 — Historical FAILED Outbox Reconciliation (Design)

Status: Approved (dry-run/apply scope, script+classifier+unit-test artifact, guarded transition)
Date: 2026-08-11
Branch: `feat/cloudflare-workers`

## 1. Context & Ground Truth

Gates 2B.9–2B.10 registered the missing event classes (Customer, Product/Price,
Payment/Return) in `EventRegistry`. This made historical FAILED `OutboxEvent`
rows reconstructible that previously died with
`Event constructor for '<name>' not found in EventRegistry`.

Read-only recon (2026-08-11) against the configured database:

- 19 FAILED rows, all Customer events:
  - `CustomerCreatedEvent` × 8 (aggregates 56–63)
  - `CustomerUpdatedEvent` × 6
  - `CustomerTransferredEvent` × 5
- All 19 registered (registry = 44) and reconstructible in-memory.
- All stuck at `retry_count` 3–4 with `next_retry_at = null` — permanently
  skipped by `OutboxRelayWorker` (`findPending` only retries FAILED rows whose
  `next_retry_at <= now`).
- `projectorHandled: 0`, `alreadyProcessed: 0` — no subscriber handles Customer
  events, so delivery is a pure no-op.
- No PENDING / PROCESSING backlog.

Business data is safe: `CustomerService.create/update` commits the `Warung`
row and the outbox row in the same transaction, so the customer records exist;
only event delivery failed.

## 2. Goal

Determine which historical FAILED rows can be replayed through the **exact
production EventBus/subscriber wiring**, then optionally replay only those
rows. Audit-first; mutation only via explicit `--apply`.

## 3. Files

New:
- `src/infrastructure/events/event-bus.js` — `buildEventBus()`
- `src/infrastructure/events/reconciliation/outboxRowClassifier.js` — pure
  `classifyFailedRow(row, registry, eventFactory)`
- `scripts/reconcile-outbox-failed.js` — read-only audit runner + `--apply`
- `tests/outbox-reconcile.test.js` — classifier + bus composition tests

Edited:
- `src/app.js` — use `buildEventBus()` instead of inline wiring
- `package.json` — add the new test file to the `test` script

## 4. `buildEventBus()` (Phase 2)

Extracted verbatim from `app.js:202–230`:

```js
const adapter = new NodeEventEmitterAdapter();
const dispatcher = new EventDispatcher();
const bus = new InternalMessageBus(adapter, dispatcher);
bus.register(new AuditSubscriber());
bus.register(new SalesSummaryProjector());
bus.register(new CustomerLedgerProjector());
bus.register(new ProductSalesProjector());
bus.register(new SalesPerformanceProjector());
bus.register(new SalesStockProjector());
bus.register(new OutletInventoryProjector());
return bus;
```

Rules:
- Composition-only. No DB mutation, no timers, no workers, no HTTP.
- Exact subscriber set and ordering preserved.
- `app.js` keeps `app.set('eventBus', buildEventBus())`.

## 5. `classifyFailedRow()` (Phase 3)

Pure, no DB, no bus, no side effects. Deterministic, order matters:

1. `event_name` not a string or not in `registry` → `UNREGISTERED`
   (`reason: "No EventRegistry constructor for '<name>'"`).
2. Missing `id`, missing/empty `aggregate_id`, `payload` not a plain object
   (or null), or `event_name` not in registry → `NOT_RECONSTRUCTIBLE`
   (field-level reason).
3. `EventFactory.fromOutbox(row)` throws → `NOT_RECONSTRUCTIBLE`
   (`reason: <thrown message>`).
4. Otherwise → `SAFE_TO_REPLAY`
   (`reason: "EventRegistry constructor exists and EventFactory reconstruction succeeded"`).

Not a basis for classification: historical age, aggregate type, absence of
subscribers. A row must still reconstruct successfully.

Result shape: `{ verdict, eventName, reason }`.

## 6. Runner `scripts/reconcile-outbox-failed.js` (Phase 4–7)

- Loads `.env` (same pattern as `scratch-outbox-recon.js`: `PrismaPg` adapter +
  schema from `DATABASE_URL`).
- Discovers `status: 'FAILED'` rows, classifies every row via the pure module.
- Prints deterministic report: totals (`FAILED`, `SAFE_TO_REPLAY`,
  `UNREGISTERED`, `NOT_RECONSTRUCTIBLE`), grouped counts by `event_name`, and
  per-row `id / event_name / aggregate_type / aggregate_id / retry_count /
  created_at / verdict / reason`.
- Default run: **zero DB writes**.
- `--apply`:
  - Only `SAFE_TO_REPLAY` rows may be processed.
  - Per row: re-fetch by id; if `status !== 'FAILED'` → `FAILED_REPLAY`
    (state changed, do not overwrite).
  - Reconstruct via `EventFactory.fromOutbox(row)`.
  - `eventBus.publish(event)` through `buildEventBus()` (real delivery path).
  - On success: guarded transition
    `prisma.outboxEvent.updateMany({ where: { id, status: 'FAILED' }, data: { status: 'PUBLISHED', published_at, published_by: 'reconcile-2B.11' } })`.
    If `count === 0` (concurrent change) → `FAILED_REPLAY`, no overwrite.
  - On any failure → remain FAILED, print `FAILED_REPLAY` with reason.
  - Never `UPDATE outbox SET status='PUBLISHED'` as a shortcut.
  - Prints `REPLAYED` / `SKIPPED_UNREGISTERED` / `SKIPPED_NOT_RECONSTRUCTIBLE` /
    `FAILED_REPLAY` per row.

Phase 7 resolution (user-approved): `markPublished` is unconditional, so the
runner uses the guarded `updateMany` transition — application-level via the
existing Prisma API, no schema/migration, and it never bypasses the delivery
path (publish still goes through the bus).

## 7. Testing (Phase 3/8)

`tests/outbox-reconcile.test.js`:
- Classifier: SAFE for a registered passthrough event; UNREGISTERED for an
  unknown name; NOT_RECONSTRUCTIBLE for missing `aggregate_id`, null payload,
  and a registry entry whose constructor throws.
- `buildEventBus()`: returns an `InternalMessageBus` whose `subscribers` size
  and order match the production set (AuditSubscriber + 6 projectors); no
  timers started.

`npm test` must stay ≥ 90 passing (90 baseline + new tests).

## 8. Out of Scope / Stop Conditions

Do not touch: Prisma schema, migrations, worker architecture, `worker.mjs`,
cron, `OutboxRelayWorker`, `EventFactory`, `EventRegistry` (read-only),
producers, business logic, historical rows unless `--apply`, deleting FAILED
rows, manual SQL status flips, new subscribers, deployment, commits.

STOP if: npm test < 90; bus extraction changes subscriber behavior; replay
requires EventFactory/schema/worker changes; a SAFE row cannot reconstruct;
delivery fails; state guard cannot protect; unexpected event/payload appears;
mutation outside explicit `--apply`.

## 9. Verification Plan

- Phase 8: dry-run report reviewed by user before `--apply`.
- Phase 9: `--apply` after explicit approval.
- Phase 10: re-query affected rows — replayed are PUBLISHED, payload/ids/
  event_name unchanged, unsafe rows still FAILED, no rows deleted.
- Phase 11: `npm test` ≥ 90 / 0 failing; `npm run test:integration`
  (staging-safe); `wrangler deploy --dry-run`; `/health` `/ready` `/version`.
- Phase 12: `git diff --check`, `git status`, no secrets leaked, exact file
  list.
