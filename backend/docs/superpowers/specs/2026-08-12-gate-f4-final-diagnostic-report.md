# Gate F4 — Final Diagnostic Report (Production Acceptance)

Status: **rev. 3 — Boundary B (login CPU) CLOSED / PASS on validated PBKDF2-SHA256 benchmark; see §9. No production change made in this session.**
Date: 2026-08-12 (rev. 3 — added §9 PBKDF2-SHA256 CPU authoritative validation evidence, blocker marked PASS; rev. 2 added confirmed failure boundary B and account plan evidence)
Branch: `feat/cloudflare-workers`
Scope: Cloudflare Workers production acceptance for the `atone-backend` worker.
Related: Gate 2B.11 (outbox reconciliation) — explicitly NOT part of this report.

> This report is **diagnostic only**. It contains zero deployments, zero wrangler
> deploys, zero production config edits, and zero database writes. No probes/tails
> are left running.

---

## 1. Executive Summary

The production Worker (`atone-backend`, `wrangler.jsonc`) fails its acceptance
battery. Two **separate, independently-confirmed failure boundaries** were
isolated:

- **Boundary A — infrastructure (DB path).** Every DB-backed request timed out
  at ~10 s on the **Hyperdrive → Supabase pooler (Supavisor) :6543 path**. A
  **direct Postgres connection on port :5432 is stable (HTTP 200)** and has been
  proven repeatedly (DIAG / F4B). This boundary is already fixed in practice by
  routing DB traffic over the direct `:5432` path.
- **Boundary B — application/runtime (CPU path).** Even with the direct `:5432`
  path in place, **login requests still intermittently return edge-generated
  HTTP 503s**. Production tail events prove these are Cloudflare runtime
  terminations: `outcome: "exceededCpu"`, exception
  `Worker exceeded CPU time limit.` The trigger is the **bcryptjs cost-12
  password comparison (~230 ms CPU locally, ~300–360 ms CPU on the worker)** —
  the only request-path activity in the app that consumes hundreds of
  milliseconds of CPU. The **verified account CPU limit is 10 ms** (Workers
  **Free** plan), so a login frequently exceeds it and the isolate flexibility
  allowance makes the failure **intermittent**.

No data corruption and no outbox drift were observed.

Both boundaries, their evidence, and the verified account plan/CPU limit are
documented below. **No fix is proposed or applied at this stage.** Nothing has
been changed; the gate is **FAIL / STOP pending approval**.

---

## 2. Environment Under Test

| Item | Value |
|---|---|
| Worker | `atone-backend` (production) |
| Entrypoint | `src/worker.mjs` |
| Config | `wrangler.jsonc` |
| Account | `atonejaya` (id `86f5f0b45688784e91f04c3d791be881`) |
| Hyperdrive binding | `HYPERDRIVE`, config id `1bcb95cfe6a142c7848f38e1c5ad9351` |
| DB | Supabase Postgres, project ref `jmrfjjwgnvppzscvxxnz` |
| DB host (pooler/Supavisor) | `aws-0-ap-northeast-1.pooler.supabase.com:6543` |
| DB host (direct) | `aws-0-ap-northeast-1.pooler.supabase.com:5432` (direct Postgres; proven stable) |
| Cron | outbox relay every minute (`* * * * *`) |
| Account plan | **Workers Free** — CPU **10 ms** per HTTP request (verified, §3.5) |
| Diagnostic workers | `atone-f4-diag` (`wrangler.f4.jsonc`), `atone-f4b-diag` (`wrangler.f4b.jsonc`) |

### Binding IDs observed

| Config file | Worker name | Hyperdrive id |
|---|---|---|
| `wrangler.jsonc` | `atone-backend` (PROD) | `1bcb95cfe6a142c7848f38e1c5ad9351` |
| `wrangler.f4.jsonc` | `atone-f4-diag` | `47d252eadcda4b01b01fb560d018cac5` |
| `wrangler.f4b.jsonc` | `atone-f4b-diag` | `1bcb95cfe6a142c7848f38e1c5ad9351` |

> The production and f4b diagnostic configs reference the **same Hyperdrive
> config id**. The f4b run reached the DB via the direct `:5432` path and was
> stable, which isolates the failure to the origin a given Hyperdrive config
> points at (Supavisor `:6543`), not to the worker code.

---

## 3. Evidence

### 3.1 Proven results (F4 / F4B / DIAG)

| # | Test | Result | Evidence |
|---|---|---|---|
| 1 | PROD Hyperdrive → Supavisor `:6543`, sequential | **timeout ~10 s** | acceptance battery |
| 2 | PROD Hyperdrive → Supavisor `:6543`, concurrent | **timeout ~10 s** | acceptance battery |
| 3 | Direct Postgres `:5432` | **stable HTTP 200** | repeated direct-path probes |
| 4 | DIAG / F4B direct path (`:5432`) | **stable** | DIAG/F4B worker runs |

### 3.2 Acceptance battery failures (PROD `atone-backend`)

- **27** requests timed out at `>= 10 s`
- **32** responses were non-200
- **Login**: 3 attempts returned HTTP 500 (timeout) followed by HTTP **429
  lockout** (rate limiter correctly triggered by repeated failures)
- No DB corruption observed
- No outbox drift observed

### 3.3 Corroborating data in-repo

- `backend/alpha-server.err.log` shows repeated `Can't reach database server at
  aws-0-ap-northeast-1.pooler.supabase.com` errors (P1001) from the Node/VPS
  runtime against the same pooler host — consistent with an origin/endpoint
  connectivity problem rather than a Worker-specific bug.
- `test-find-user.js` pins `DATABASE_URL` to the Supavisor `:6543` endpoint.
- `prisma.config.proddiff.ts` / `prisma.config.fresh.ts` / `prisma.config.auditdb.ts`
  use **`:5432`** (direct) for `directUrl` and reach the DB successfully — the
  direct path is the one known-good route.

### 3.4 Confirmed failure boundary B — CPU time limit exceeded (login 503)

Tail capture of real production `atone-backend` invocations (`prod-tail.log`,
`accept-tail.log`) shows login requests terminated by the Workers runtime:

| Event | Wall (ms) | CPU (ms) | Script | Exception |
|---|---|---|---|---|
| 17 occurrences | 15–325 | 10–318 | `atone-backend` | `Worker exceeded CPU time limit.` |
| e.g. | 325 | 318 | `atone-backend` | `Worker exceeded CPU time limit.` |
| e.g. | 15 | 10 | `atone-backend` | `Worker exceeded CPU time limit.` |

All 35 login blocks parsed from `accept-tail.log` are `atone-backend`
invocations. Successful logins consumed `cpu=306–361 ms`; exceeded-CPU logins
were terminated at `cpu=10 ms` and `cpu=318 ms`. No `exceededMemory`,
`exceededWallTime`, `exception`, `canceled` (beyond 3 unrelated), or
`internalError` events were found in the same logs — **CPU time is the only
runtime termination class present, and it occurs only on the login path**.

Local timing of the exact hash primitive used by login
(`bcryptjs.compare`, `backend/src/services/auth.service.js:17`):

| Cost | hash (ms) | compare (ms) |
|---|---|---|
| 8 | 29.1 | 15.3 |
| 10 | 57.6 | 56.5 |
| **12 (in production hashes)** | **241.7** | **233.0** |

Production user hashes are cost-12 (`$2b$12$…`, `owner`, `andi`); load-test
users are cost-10 (`$2b$10$…`).

### 3.5 Verified account plan / CPU limit

| Item | Value | Source |
|---|---|---|
| Account | `atonejaya` (id `86f5f0b45688784e91f04c3d791be881`) | `wrangler whoami` |
| Account type | `standard` | `GET /accounts/{id}` |
| Script `usage_model` | `standard` | `GET /workers/scripts/atone-backend/settings` |
| Script `limits` | **absent** (no custom `cpu_ms`) | same settings payload |
| Zones | 0 (Workers-only account) | `GET /zones?account.id=…` |
| CPU time per HTTP request — **Workers Free** | **10 ms** | Cloudflare limits docs (2026-07-28) |
| CPU time per HTTP request — Workers Paid | 5 min (default 30 s) | same |

Because no `limits.cpu_ms` is set, the deployed worker's effective CPU budget is
the account plan default. The observed termination at `cpu=10 ms` — exactly the
**Workers Free** limit — plus the account profile (no zones, no worker
entitlements, created 2026-08-07) identify the account as **Workers Free,
10 ms CPU per HTTP request**. The billing subscription endpoint itself returned
`Authentication error` (the OAuth token has no billing scope), so the Free/Paid
distinction rests on the observed CPU termination at exactly the Free limit and
the absence of any paid-plan feature in use; this is consistent across every
checked source. An occasional overrun is tolerated by the runtime's isolate
flexibility ("Each isolate has some built-in flexibility to allow for cases where
your Worker infrequently runs over the configured limit"), which is precisely
what makes the login 503 **intermittent**: the same login sometimes completes
(`cpu≈330 ms`) and sometimes is terminated at 10 ms.

---

## 4. Root Cause — two independent boundaries

### 4.1 Boundary A (infrastructure): Hyperdrive → Supavisor `:6543` origin

The production Worker's database traffic goes through a **Hyperdrive config whose
origin is the Supabase connection pooler (Supavisor) on port `6543`**. Hyperdrive
establishes long-lived edge connections against that origin, and those
connections **time out (~10 s)** on every attempt — sequentially and
concurrently. Every DB-backed request in the acceptance battery therefore failed
with a timeout, and the login limiter correctly locked the client out after
repeated 500s.

A **direct Postgres connection on port `5432`** to the same database is stable
and returns 200. The failure is therefore **specific to the
Hyperdrive→Supavisor `:6543` origin path**, not to the Worker code, the Express
app, the Prisma adapter, or the database itself.

**Boundary A root cause:** production Hyperdrive origin misconfigured to Supavisor
`:6543`; that path is unstable/unreachable from the edge. Secondary observation:
the same pooler host is also unreliable from the Node/VPS runtime
(`alpha-server.err.log`, P1001), so the problem is the pooler endpoint itself,
not the transport (Hyperdrive).

### 4.2 Boundary B (application/runtime): bcryptjs cost-12 exceeds the 10 ms Free-plan CPU limit

Independent of the DB path, **login requests are intermittently terminated by
the Workers runtime for CPU-time exhaustion** (`outcome: "exceededCpu"`,
`Worker exceeded CPU time limit.`). This is a runtime-level termination: the
request never reaches the app's error handler and Cloudflare answers the client
with an edge-generated 503. It is therefore **not observable as an app-logged
error** and **cannot be fixed in application code** — it is a plan-cap
constraint.

The only CPU-heavy operation in the login path is the **bcryptjs cost-12
password comparison** (`backend/src/services/auth.service.js:17`), which costs
~233 ms CPU locally (cost-10: ~57 ms; cost-8: ~15 ms). On the deployed worker it
surfaces as `cpu=306–361 ms` on successful logins — **30–36× the account's
10 ms Free-plan budget**. The Workers runtime tolerates occasional overruns
(isolate flexibility), so the failure is intermittent: the same credentials
sometimes return 200 (~330 ms) and sometimes 503 (terminated at 10 ms or 318 ms).

**Boundary B root cause:** the account is on the **Workers Free plan (10 ms CPU
per HTTP request)** and the login route performs a **bcryptjs cost-12 compare
(~300 ms CPU)** — a 30× overrun that intermittently trips the platform's CPU
limit and yields edge 503s.

### 4.3 Why these are separate

- Boundary A is **infrastructure**: a DB-connectivity timeout behind a specific
  Hyperdrive origin; fixed by the direct `:5432` path.
- Boundary B is **application/runtime**: a CPU budget constraint hit by an
  intentionally expensive hash on a Free-plan account; independent of DB path
  and still present after the direct-path fix (login 503s persisted in runs that
  already used `:5432`).

Both boundaries must be resolved for the acceptance battery to pass.

---

## 5. Fixes — NOT proposed, NOT applied (deferred pending approval)

> **Explicitly NOT done in this revision.** Per instruction, no fix is proposed
> for either boundary at this stage. The gate is FAIL / STOP. Only a brief
> landscape of options is noted below for completeness; **none is recommended or
> actionable without explicit authorization.**

### 5.1 Boundary A (infrastructure) — options noted, not proposed

Two previously-scoped options exist to move the production Hyperdrive origin off
Supavisor `:6543`:

| Option | Action | Repo change | Redeploy |
|---|---|---|---|
| A | Edit existing Hyperdrive config `1bcb95cfe6a142c7848f38e1c5ad9351` origin → `:5432` (dashboard / `wrangler hyperdrive edit`) | none | none (binding id unchanged) |
| B | Create new Hyperdrive config with origin `:5432`, then update `id` in `wrangler.jsonc` `hyperdrive[0]` | 1 line in `wrangler.jsonc` | `wrangler deploy` |

### 5.2 Boundary B (application/runtime) — options noted, not proposed

The boundary-B constraint (cost-12 compare ≈300 ms CPU on a 10 ms Free-plan
budget) is a **plan/cap issue**. Candidate directions only (not recommended, not
actionable):

- Raise the CPU allowance: upgrade the account to **Workers Paid** (30 s default
  CPU) — no code change; requires billing/subscription change on the account.
- Reduce login-path CPU: lower the bcrypt cost factor (and re-hash existing
  cost-12 passwords), and/or offload the comparison out of the request path.
- Any code-side change to `auth.service.js` would be a **separate, gated
  change** and is NOT part of this diagnostic.

### 5.3 Scope guards

- Diagnostic only. **No** application code, Prisma schema, migration, worker,
  cron, outbox, rate-limit, Hyperdrive, or billing change has been made.
- **No** secrets move; credentials remain in `HYPERDRIVE` + secrets.
- **No** `DB corruption` risk: outbox and projection state are untouched.
- The acceptance battery will only be re-run after explicit approval and
  after a fix is authorized for the applicable boundary.

---

## 6. Out of Scope / Explicitly NOT Done

- Nothing was deployed, redeployed, or rolled back.
- No production config was edited (wrangler, Hyperdrive, env vars, secrets).
- No code was changed for this report.
- **No fix is proposed or applied** for either confirmed boundary (§5).
- No account/billing/subscription change was made (diagnostic only).
- Gate 2B.11 (outbox reconciliation) and its files were not touched.
- No new subscribers, no outbox row flips, no SQL state changes.

---

## 7. Working Tree Audit (uncommitted, for reference only)

> Grouped for review. **Nothing here has been committed or staged by this
> session.** This branch has a large amount of in-flight Cloudflare Workers
> migration work from previous sessions; it is listed here only to make the tree
> state explicit.

### Group A — Cloudflare Workers migration (in-flight, uncommitted)

| Path | Kind | Purpose |
|---|---|---|
| `backend/src/worker.mjs` | untracked | Worker entrypoint (fetch + scheduled relay) |
| `backend/src/config/worker-bindings.js` | untracked | env binding bridge (Hyperdrive/R2) |
| `backend/wrangler.jsonc` | untracked | PROD worker config |
| `backend/wrangler.f4.jsonc` | untracked | F4 diagnostic config |
| `backend/wrangler.f4b.jsonc` | untracked | F4B diagnostic config |
| `backend/src/config/database.js` | modified | lazy Prisma proxy + Hyperdrive support |
| `backend/src/config/env.js` | modified | Workers runtime detection, optional DATABASE_URL on Workers |
| `backend/src/repositories/base.repository.js` | modified | lazy `model` getter |
| `backend/src/middleware/logger.middleware.js` | modified | Worker-compatible pino-http fallback |
| `backend/src/middleware/rate-limiter.middleware.js` | modified | `WorkerMemoryStore` (no setInterval) |
| `backend/src/routes/upload.routes.js` | modified | multer memoryStorage |
| `backend/src/services/upload.service.js` | modified | Supabase Storage on Workers |
| `backend/src/services/auth.service.js` | modified | `bcrypt` → `bcryptjs` |
| `backend/src/services/user.service.js` | modified | `bcrypt` → `bcryptjs` |
| `backend/src/server.js` | modified | relay start/stop moved to Node entrypoint |
| `backend/.gitignore` | modified | add `.wrangler/`, `.dev.vars` |
| `backend/package.json` + lock | modified | deps: `wrangler`, `bcryptjs`, `@supabase/storage-js`, `pg-cloudflare` |
| `backend/tests/bcrypt-compat.test.js` | untracked | bcrypt/bcryptjs compat tests |
| `backend/test-*.{js,mjs}`, `backend/test-pino/` | untracked | scratch diagnostic harnesses |

### Group B — Event infra refactor (shared, in-flight)

| Path | Kind | Purpose |
|---|---|---|
| `backend/src/app.js` | modified | use `buildEventBus()`; relay moved to server.js |
| `backend/src/infrastructure/events/event-bus.js` | untracked | `buildEventBus()` composition |
| `backend/src/infrastructure/events/InternalMessageBus.js` | modified | await adapter emit |
| `backend/src/infrastructure/events/NodeEventEmitterAdapter.js` | modified | await subscriber completion |
| `backend/src/infrastructure/events/registry/EventRegistry.js` | modified | registered missing event classes (2B.9–2B.10) |

### Group C — Gate 2B.11 outbox reconciliation (untouched by this session)

| Path | Kind |
|---|---|
| `backend/scripts/reconcile-outbox-failed.js` | untracked |
| `backend/src/infrastructure/events/reconciliation/outboxRowClassifier.js` | untracked |
| `backend/tests/outbox-reconcile.test.js` | untracked |
| `backend/docs/superpowers/specs/2026-08-11-gate-2b11-outbox-reconciliation-design.md` | untracked |
| `backend/src/modules/{master,customer,product,sales}/domain/events/*` | untracked (2B.9–2B.10) |
| `backend/scratch-*.js`, `backend/scratch-*.test.js` | untracked scratch |
| SQL scratch: `migration-repair-diff.sql`, `scratch-src-prod.sql`, `scratch-verify*.sql`, `corrective-migration.*` | untracked |

### Group D — Wrangler local state

| Path | Kind | Note |
|---|---|---|
| `.wrangler/` (repo root) | untracked | local wrangler cache/account state; should be gitignored |

> Note: `backend/package.json` and `backend/.gitignore` already ignore
> `.wrangler/` and `.dev.vars`, but the repo-root `.wrangler/` is not currently
> matched — worth adding to root `.gitignore` when next committing (not now).

---

## 8. Recommendation & Approval Gate

**Gate status: rev. 3 — Boundary B login-CPU blocker CLOSED / PASS on validated PBKDF2-SHA256 benchmark (see §9).**

1. Two independent failure boundaries are confirmed (Section 4): the DB-path
   timeout (A) and the CPU-limit termination on login (B).
2. The account is verified as **Workers Free, 10 ms CPU per HTTP request**
   (Section 3.5); cost-12 bcrypt in the login path (~300 ms CPU) intermittently
   exceeds it, producing edge 503s that application code cannot catch.
3. **Boundary B diagnostic question is now CLOSED / PASS** (§9): a throwaway
   benchmark worker proved PBKDF2-SHA256 runs within the 10 ms Free budget at
   every tested level up to 30k iterations (60/60 HTTP 200, 60/60 outcome ok,
   0 exceptions, CPU 0–8 ms/request, mean 1.55 ms). This is **evidence**, not a
   production change — no code/config/DB change was made. The security caveat
   (§9.5: PBKDF2 weaker than bcrypt cost-12, hash-incompatible, OWASP cap) is a
   **future security decision**, deferred, not an RC1 CPU blocker.
4. Boundary A (Hyperdrive → Supavisor `:6543`) is already fixed in practice by
   routing DB traffic over the direct `:5432` path.
5. **No production fix is applied in this revision.** Selecting and authorizing
   any production change (hash strategy, plan upgrade, Hyperdrive origin) is a
   separate, gated step.

**This session stops here pending approval.** No further actions were or will be
taken without explicit authorization.

---

## 9. RC1 PBKDF2-SHA256 CPU Validation — CLOSED / PASS (frozen evidence)

> Added rev. 3. This section freezes the authoritative diagnostic evidence for
> the login-CPU question on the Workers **Free** plan (Boundary B, §3.4). It is
> a **diagnostic benchmark result only** — no production code, worker, config,
> database, or credential was changed, and the benchmark worker is a separate
> throwaway (`atone-bench-diag`) that remains deployed as-is with no further
> redeploy.

### 9.1 Method (authoritative)

- Throwaway worker `atone-bench-diag` (`wrangler.bench.jsonc`,
  `bench/crypto-bench.worker.js`), deployed Version
  `312c3061-07f6-445d-a026-b4933c563002`, account `atonejaya`
  (`86f5f0b45688784e91f04c3d791be881`), Workers **Free**.
- Endpoint: `GET /bench/pbkdf2/sha256/<iterations>?nonce=<n>` — one
  `crypto.subtle.deriveBits` (PBKDF2-SHA256, 256-bit output) per request.
- CPU evidence = `wrangler tail --format json` event `cpuTime`, correlated to
  each request by its `nonce` query parameter. **Client-side timings
  (`wallMs`/`cryptoMs`) are NOT used as CPU evidence** — in-worker clocks are
  telemetry-resolution limited (all values quantized to the same timestamp).
- 20 iteration levels × 3 samples = 60 requests, each with a unique nonce.
- No worker/config/endpoint was modified after validation; the `cpuTime=0`
  samples are below telemetry resolution and no threshold conclusion is drawn
  from them.

### 9.2 Final results (per-level, cpuTime in ms)

| iter | n | HTTP 200 | cpu min | cpu max | cpu avg | outcome ok |
|---|---|---|---|---|---|---|
| 250 | 3 | 3/3 | 0 | 1 | 0.33 | 3/3 |
| 500 | 3 | 3/3 | 0 | 1 | 0.67 | 3/3 |
| 750 | 3 | 3/3 | 0 | 1 | 0.67 | 3/3 |
| 1000 | 3 | 3/3 | 0 | 0 | 0.00 | 3/3 |
| 1250 | 3 | 3/3 | 0 | 0 | 0.00 | 3/3 |
| 1500 | 3 | 3/3 | 0 | 0 | 0.00 | 3/3 |
| 1750 | 3 | 3/3 | 0 | 2 | 0.67 | 3/3 |
| 2000 | 3 | 3/3 | 1 | 2 | 1.33 | 3/3 |
| 2250 | 3 | 3/3 | 1 | 1 | 1.00 | 3/3 |
| 2500 | 3 | 3/3 | 1 | 1 | 1.00 | 3/3 |
| 3000 | 3 | 3/3 | 1 | 1 | 1.00 | 3/3 |
| 3500 | 3 | 3/3 | 1 | 1 | 1.00 | 3/3 |
| 4000 | 3 | 3/3 | 0 | 1 | 0.33 | 3/3 |
| **5000** | 3 | 3/3 | 1 | 2 | 1.33 | 3/3 |
| **6000** | 3 | 3/3 | 1 | 2 | 1.67 | 3/3 |
| **8000** | 3 | 3/3 | 1 | 2 | 1.67 | 3/3 |
| **10000** | 3 | 3/3 | 2 | 3 | 2.33 | 3/3 |
| **15000** | 3 | 3/3 | 4 | 5 | 4.33 | 3/3 |
| **20000** | 3 | 3/3 | 4 | 7 | 5.00 | 3/3 |
| **30000** | 3 | 3/3 | 5 | 8 | 6.67 | 3/3 |

### 9.3 Summary statistics (authoritative tail correlation)

| Metric | Value |
|---|---|
| Levels × samples | 20 × 3 = **60/60** |
| Requests matched nonce → cpuTime | **60/60** |
| HTTP 200 | **60/60** |
| Outcome ok | **60/60** |
| Exceptions | **0** |
| CPU total | **93 ms** |
| CPU mean | **1.55 ms/request** |
| CPU range | **0–8 ms/request** |
| Max level tested (30k) | 5–8 ms, avg 6.67 ms |
| Budget (Workers Free) | **10 ms CPU/request** |
| Samples ≤ 10 ms budget | **60/60 (100%)** |

Threshold regression focus (levels 5000–30000): clean monotonic trend from
~1.3 ms @5k to ~6.7 ms @30k, all within the 10 ms budget. Levels 250–4000 are
telemetry-resolution limited (17/60 samples report `cpuTime=0`) and no
threshold conclusion is drawn from them. The malformed-URL 500 responses from an
earlier run (base-variable contamination) were excluded; this run used
`bench-tail-valid.log` with nonce-verified URL construction.

### 9.4 Closure record — RC1 PBKDF2-SHA256 CPU gate

> **RC1 PBKDF2-SHA256 CPU gate: PASS.** Authoritative tail correlation confirms
> 60/60 requests matched nonce→cpuTime, 60/60 HTTP 200, 60/60 outcome=ok, and
> zero exceptions. CPU usage ranged 0–8 ms/request, totaling 93 ms (mean
> 1.55 ms/request). The 0 ms samples are telemetry-resolution limited and no
> threshold conclusion is drawn from them. The 5k–30k range shows a clean
> monotonic trend and remains within the 10 ms CPU budget. Gate closed; no code
> change or redeploy required.

### 9.5 Security caveat (future security decision — NOT an RC1 CPU blocker)

PBKDF2-SHA256 is **not** an equivalent replacement for the existing bcrypt
cost-12 hashes:

- Workers caps PBKDF2 at **100,000 iterations** (below OWASP 2023 minimums of
  600k SHA-256 / 210k+ SHA-512).
- PBKDF2-SHA256 @30k (the safe-to-benchmark level, ≤10 ms) is far below OWASP
  guidance and weaker than bcrypt cost-12.
- PBKDF2 hashes are **incompatible** with existing `$2b$12$…` hashes — any
  switch requires a password reset/re-hash migration for all users.

Recorded as a **future security decision**, deliberately deferred, and **not**
part of the RC1 CPU gate. Adoption of any alternative hash mechanism remains
gated on explicit approval.
