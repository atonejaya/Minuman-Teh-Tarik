# RC1 — Supabase Auth Migration Inventory

Status: **PHASE 0 — INVENTORY ONLY (read-only). No code, no deploy, no DB change.**
Date: 2026-08-12
Branch: `feat/cloudflare-workers`
Scope: Inventory of the current authentication stack in `backend/`, produced as
input for the Supabase Auth migration design (RC1 Free-plan track).

> Authoritative directive: the Worker (`atone-backend`) must stop executing
> bcrypt password verification because cost-12 bcrypt (~300 ms CPU) exceeds the
> Workers Free 10 ms CPU/request limit (Boundary B, Gate F4 report). Target is to
> move password verification to Supabase Auth, **without** weakening hashes,
> without password resets, and without deleting legacy auth. Everything below is
> read-only evidence.

---

## 1. Current Auth Flow

### 1.1 Login (the only password-verification entry point)

| Layer | File | Role |
|---|---|---|
| Route | `src/routes/auth.routes.js:8` | `POST /auth/login` behind `loginRateLimiter` |
| Validator | `src/validators/auth.validator.js:3` | `loginSchema` = `{ username, password, remember_me? }` |
| Controller | `src/controllers/auth.controller.js:6` | parses body, calls `AuthService.login`, returns token |
| Service | `src/services/auth.service.js:9` | full login logic (see 1.2) |

Request body: `{ "username": string, "password": string, "remember_me"?: boolean }`.

Response (success): `{ success, data: { token, user: {...safeUser} }, message }`.

### 1.2 `AuthService.login` (src/services/auth.service.js:9-37)

1. `userRepository.findMany({ username })` — lookup by **username** (Prisma, exact match).
2. If no user or `!user.is_active` → `UnauthorizedError('INVALID_LOGIN', ...)`.
3. `bcrypt.compare(password, user.password_hash)` — **bcryptjs cost-12** (see §2).
4. If mismatch → `UnauthorizedError('INVALID_LOGIN', 'Password salah')`.
5. `userRepository.update(id, { last_login_at: new Date() })`.
6. JWT payload `{ sub: user.id, username: user.username, role: user.role }`.
7. `jwt.sign(payload, SECRET, { expiresIn })` — `remember_me ? '30d' : '7d'` (see §5).
8. Returns `{ token, user: DTOHelper.toUser(user) }`.

### 1.3 Request authentication (`src/middleware/auth.middleware.js`)

1. Read `Authorization: Bearer <token>`; missing → 401 `TOKEN_NOT_FOUND`-style.
2. `jwt.verify(token, jwtConfig.SECRET)` — **symmetric HS256**, no issuer/audience check.
3. **DB round-trip per request**: `prisma.user.findUnique({ where: { id: decoded.sub } })`.
4. Rejects inactive/deleted users → 401.
5. Sets `req.user = { ...user, sub: user.id }` (note: full row incl. `password_hash`
   is spread onto `req.user`).

### 1.4 Authorization (`src/middleware/role.middleware.js`)

`authorize(allowedRoles)` checks `allowedRoles.includes(req.user.role)`; failure → 403.
Role comes from the **DB row loaded by the auth middleware**, never from the token
claims alone (defense-in-depth — token `role` claim is not trusted directly).

### 1.5 Logout

`POST /auth/logout` is authenticated but returns success without invalidating
anything (no server-side session; `RefreshToken` table is unused).

### 1.6 Probes

- `GET /health` (no DB), `GET /ready` (DB `SELECT 1`), `GET /version` — all public.

---

## 2. bcrypt / Hash Format

| Item | Value | Evidence |
|---|---|---|
| Library in request path | `bcryptjs` | `src/services/auth.service.js:1`, `src/services/user.service.js:1` |
| Exact version | **3.0.3** | `package-lock.json:2755-2758` |
| Native `bcrypt` also present | **6.0.0** | `package.json:21` (used by `prisma/seed.js` and tests only) |
| Hash cost (production) | **12** | `src/services/user.service.js:44,74` (`bcrypt.hash(password, 12)`) |
| Production hash prefix | `$2b$12$…` | Gate F4 report §3.4 (`owner`, `andi`) |
| Load-test user hashes | `$2b$10$…` | Gate F4 report §3.4; tests use cost 10 |
| Compare site | `auth.service.js:17` | `bcrypt.compare(password, user.password_hash)` |
| Hash site (create) | `user.service.js:44` | `bcrypt.hash(data.password, 12)` |
| Hash site (password reset) | `user.service.js:74` | `bcrypt.hash(password, 12)` |
| bcrypt→bcryptjs compat | verified | `tests/bcrypt-compat.test.js` (bidirectional) |

**CPU context (Boundary B):** bcryptjs cost-12 compare ≈ 233 ms CPU locally,
306–361 ms on the Worker → intermittently exceeds the Workers Free 10 ms budget
(Gate F4 §3.4). This is the sole CPU-heavy request-path operation.

---

## 3. Current User Identifier

| Item | Value | Evidence |
|---|---|---|
| Table | `User` (PascalCase in Postgres) | `prisma/schema.prisma:200` |
| PK | `id Int @id @default(autoincrement())` | schema:201 |
| Login identifier | **`username`** (unique, no email column exists) | schema:202; `auth.validator.js:4` |
| Other unique | `phone String? @unique` | schema:205 |
| Auth fields | `password_hash String`, `is_active Boolean @default(true)`, `last_login_at DateTime?` | schema:203-208 |
| Domain fields | `name`, `area_id Int?` (FK → Area) | schema:204,211 |
| Indexes | `@@index([role])`, `@@index([is_active])` | schema:257-258 |

There is **no `email` column** in the `User` model.

### 3.1 Foreign keys referencing `users.id`

`users.id` is a referenced FK from ~30 relations (schema:200-259), including:
`RefreshToken.user_id`, `LoginLog.user_id`, `AuditLog.user_id`, `Warung.assigned_sales_id`,
`Visit.sales_id`, `Load.sales_id/created_by/confirmed_by`, `MobileStock.sales_id`,
`InventoryMovement.created_by`, `SalesTransaction.sales_id`,
`Payment.created_by/collected_by`, `Collection.sales_id`, `SalesReturn.sales_id`,
`WarehouseSettlement.sales_id/created_by/verified_by`, `SalesStockIssue.sales_id/…`,
`SalesStockLedger.sales_id`, `SalesStockProjection.sales_id`,
`CustomerSalesHistory.old_sales_id/new_sales_id/created_by`,
`VisitNote.created_by`, `WarehouseLedger.*`, `WarehouseTransfer.*`, `SalesDay.*`,
`SalesPerformanceSummary.sales_id`, plus the module-based `User` relations.

**Implication:** business user IDs are `Int` and are load-bearing throughout the
schema. A Supabase `auth.users.id` (UUID) cannot directly replace `users.id`
without a mapping or a migration of every FK — see §8.

---

## 4. Current Role Model

| Item | Value | Evidence |
|---|---|---|
| DB enum | `CREATE TYPE "UserRole" AS ENUM ('OWNER', 'SALES')` | `migrations/20260805225225_init_schema/migration.sql:2` |
| Prisma enum | `enum UserRole { OWNER SALES }` | `schema.prisma:9-12` |
| JS constant | `{ OWNER: 'OWNER', SALES: 'SALES' }` | `src/constants/roles.js` |
| Seeded roles | `owner`→OWNER, `andi`→SALES | `prisma/seed.js:27-52` |

**Discrepancy (important):** code references the string `'ADMIN'` in several
places, but `ADMIN` is **not** part of the DB/Prisma enum:

- `src/routes/sales-transaction.routes.js:14-15` → `authorize(['SALES','ADMIN'])`
- `src/modules/sales-visit/presentation/routes/sales-visit.routes.js:7` → `VISIT_ROLES = ['SALES','ADMIN','OWNER']`
- `src/modules/sales-visit/application/services/SalesVisitService.js:109` → role comparison

Because `authorize` only matches against the DB row's `role` (which can never be
`'ADMIN'` today), these entries are currently **dead allow-list entries** — no
user can hold the `ADMIN` role. The migration must decide whether `ADMIN` is a
real future role or remove the references. Role semantics to preserve:
OWNER (full admin) and SALES (field operations), behaviorally identical.

---

## 5. Current JWT Contract

| Item | Value | Evidence |
|---|---|---|
| Library | `jsonwebtoken` **9.0.3** | `package.json:31` |
| Algorithm | HS256 (default, symmetric) | no `algorithm` override in sign/verify |
| Secret | `env.JWT_SECRET` (required) | `src/config/jwt.js:4`, `src/config/env.js:28` |
| Default expiry | `7d` (`JWT_EXPIRES_IN`) | `env.js:29` |
| Remember-me expiry | `30d` (`JWT_REMEMBER_EXPIRES_IN`) | `env.js:30`, `auth.service.js:30` |
| Payload claims | `{ sub: user.id, username, role }` | `auth.service.js:24-28` |
| Standard claims emitted | `iat`, `exp` (auto by library) | `jsonwebtoken` default |
| **Issuer (`iss`)** | **not set** | sign options `auth.service.js:31` |
| **Audience (`aud`)** | **not set** | sign options |
| Verification checks | signature + exp only; **no iss/aud** | `auth.middleware.js:15` |
| Subject semantics | `sub` = **application `users.id` (Int)** | `auth.service.js:25`; consumed at `auth.middleware.js:16`, controllers |

**Compatibility note:** Supabase-issued JWTs have `iss` =
`https://<project-ref>.supabase.co/auth/v1`, `aud` = `authenticated`,
`sub` = **UUID** (`auth.users.id`), and role claims in a different shape
(`role`/`app_metadata`). The current contract (HS256 app secret, Int `sub`, no
iss/aud) is therefore **not directly compatible** — a new verification path or
verification-mode switch is required (Phase 3).

---

## 6. Every API Affected

### 6.1 Public (unauthenticated)
- `GET /health`, `GET /ready`, `GET /version`
- `POST /auth/login` (the only bcrypt site in the request path)

### 6.2 Authenticated (`authenticate` middleware) — consume `req.user`
`req.user` is `{ ...userRow, sub: user.id }`; controllers use **both**
`req.user.id` and `req.user.sub` interchangeably (both resolve to `users.id`).

| Route group | Mount | Auth | Role gate | `req.user` consumer |
|---|---|---|---|---|
| auth | `/auth` | logout only | — | — |
| me | `/me/dashboard` | yes | — | `sub` |
| users | `/users` | yes | **OWNER** | full `req.user` (user.service) |
| master/products (module) | `/master/products` | yes | none (auth only) | `req.user.id` |
| master/product-price | `/master/products` | yes | none | `req.user.id` |
| master brands/packagings/units/product-categories/lookups | `/master/...` | yes | none | `req.user.id` (some) |
| master categories/regionals/areas/routes | `/master/...` | yes | none | `req.user.id` |
| master customers | `/master/customers` | yes | none | `req.user.id` |
| warungs (legacy) | `/warungs` | yes | OWNER/SALES splits | `req.user.id` |
| uploads | `/uploads` | yes | none | — |
| visits | `/visits` | yes | SALES/OWNER splits | `req.user.sub` |
| loads | `/loads` | yes | OWNER for create | `req.user` |
| sales (legacy) | `/sales` | yes | — | — |
| sales/piutang | `/sales/piutang` | yes | — | — |
| sales-transactions | `/sales-transactions` | yes | SALES (create), SALES/ADMIN (read) | `req.user.sub` |
| payments | `/payments` | yes | none | `req.user.sub` |
| collections | `/collections` | yes | none | `req.user.sub` |
| sales/returns | `/sales/returns` | yes | none | `req.user.userId` (dead field) |
| sales/stock-issues | `/sales/stock-issues` | yes | none | `req.user.id` (w/ fallback) |
| sales/stock | `/sales/stock` | yes | none | `req.user.id` |
| sales/outlet-stock | `/sales/outlet-stock` | yes | none | `req.user.id` |
| sales-visits | `/sales-visits` | yes | SALES/ADMIN/OWNER | `req.user` |
| credit-notes | `/credit-notes` | yes | — | — |
| settlements | `/settlements` | yes | none | `req.user.id` |
| warehouse/transfers | `/warehouse/transfers` | yes | none | `req.user.id` (w/ fallback) |
| reports | `/reports` | yes | none | — |
| dashboard | `/dashboard` | yes | none | — |
| product (legacy) | `/products` | yes | OWNER (mutations) | `req.user.id` |

> Controllers using `req.user?.id || 1` (hardcoded fallback): SalesTransactionController,
> SalesStockIssueController, SalesReturnController, OutletInventoryController,
> WarehouseTransferController — these mask an absent identity. A migration that
> changes how `req.user` is populated must keep both `id` and `sub` present to
> avoid silent wrong-user attribution.

### 6.3 Endpoints that use `role`
- `authorize(...)` gates (see table).
- `SalesVisitService.js:109` role comparison.
- `load.controller.js:75` `req.user.role === 'OWNER'`.

---

## 7. Tests covering Authentication / Authorization

| File | Coverage |
|---|---|
| `tests/user.test.js` | real login (`owner`/`admin123`), OWNER CRUD on `/users`, `password_hash` never exposed |
| `tests/warung.test.js` | login owner+andi, OWNER vs SALES authorization |
| `tests/load.test.js` | login, OWNER-only create vs SALES rejection |
| `tests/dashboard.test.js` | login, bearer-protected dashboard, 401/validation |
| `tests/product-master.test.js` | signed JWT (`{sub:1, role:'OWNER'}`), protected routes |
| `tests/customer-master.test.js` | OWNER vs SALES token distinction, protected routes |
| `tests/collection.test.js`, `tests/outlet-delivery.test.js`, `tests/sales-stock.test.js`, etc. | login + bearer token flows |
| `tests/bcrypt-compat.test.js` | bcrypt↔bcryptjs bidirectional verification (native hash of cost 10/12 verifiable by bcryptjs) |
| `tests/production-readiness.test.js` | 401 on protected route without token, rate-limit headers, probes |

No test currently covers: wrong issuer, wrong audience, expired token semantics,
malformed token, or any Supabase path (naturally — none exists yet).

---

## 8. Migration Risks

1. **bcrypt import compatibility (decisive):** Supabase Auth supports importing
   users with a `password_hash` for supported formats. Whether **bcryptjs cost-12
   `$2b$12$…`** hashes are accepted for `signInWithPassword` must be proven in a
   disposable project (Phase 1). If not supported, the directive is to **STOP**
   and not invent workarounds (no forced password resets).
2. **Identity mapping:** `users.id` is `Int` and is an FK target of ~30 relations;
   Supabase `auth.users.id` is a UUID. Cannot blindly replace; need either a
   mapping table or preserving application IDs.
3. **JWT contract change:** current tokens are HS256 with app secret, Int `sub`,
   no `iss`/`aud`. Supabase tokens are RS256/JWKS, UUID `sub`, `iss`
   `https://<ref>.supabase.co/auth/v1`. All `authenticate`-protected routes
   depend on `req.user.id`/`req.user.sub` = application Int id.
4. **Role fidelity:** OWNER/SALES must behave identically; `ADMIN` references in
   code are currently dead (not in enum) and must be reconciled.
5. **Dual-auth complexity:** legacy bcrypt login must remain untouched while the
   Supabase path is added behind a flag (`AUTH_PROVIDER=legacy` default).
6. **No email column:** login is by `username`; Supabase Auth identifies users by
   **email**. Importing users without an email requires a synthetic email mapping
   (e.g. `<username>@atone.local`) or a decision on the login identifier.
7. **CPU proof required:** the Supabase path must demonstrably run no bcrypt in
   the Worker (Phase 6) — verified via tail-correlated `cpuTime`, not wall clock.
8. **Rate limiting / lockout:** login 429 lockout (`loginRateLimiter`) applies
   per-isolate on Workers; behavior on the new path must be specified.

---

## 9. Compatibility Requirements (derived)

1. Existing `users` rows, `password_hash`, and all FK relationships must remain
   intact; migration is non-destructive, idempotent, resumable, dry-run capable,
   and auditable.
2. Legacy `AUTH_PROVIDER=legacy` path must keep working with zero behavior change.
3. New Supabase path must expose the **same logical authorization context**
   (`req.user` with `id`/`sub` = application user id and `role`) to all services.
4. `OWNER`/`SALES` semantics preserved; no client-supplied roles trusted; role
   derived server-side.
5. No bcrypt executed in the Worker on the Supabase-auth path (prove via CPU).
6. JWT verification on the new path must enforce issuer/audience appropriately
   and map Supabase identity → application user id.
7. All existing auth/authorization tests continue to pass; new tests added per
   the Phase 5 matrix.

---

## 10. Inventory Summary Table

| Aspect | Current state |
|---|---|
| Auth authority | Custom (app issues HS256 JWT) |
| Password verification | bcryptjs 3.0.3, cost-12, `$2b$12$`, in `AuthService.login` |
| Login identifier | `username` (unique); no email column |
| User PK | `users.id` Int autoincrement; FK target of ~30 relations |
| Roles | DB enum `{OWNER, SALES}`; `ADMIN` referenced in code but not in enum |
| JWT | HS256 app secret; claims `{sub,username,role}`; 7d/30d; no iss/aud |
| Token verification | symmetric verify + per-request DB `findUnique` by `sub` |
| `req.user` | `{...userRow, sub:id}`; consumers use `id` and `sub` interchangeably |
| Session/token store | stateless JWT; `RefreshToken` & `LoginLog` tables exist but unused |
| Supabase usage today | `@supabase/storage-js` only (file uploads); no auth SDK |
| CPU hotspot | bcryptjs cost-12 compare in login (Boundary B, Free 10 ms limit) |
