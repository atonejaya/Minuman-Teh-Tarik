# Milestones

## Sprint 11.0C — Sales Stock Issue
- Baseline: `v11.0C` (tag `695aa7c`)
- Status: **FROZEN**
- Definition of Done: **PASSED**
- Regression Test: **PASSED**
- Note: `README.md` intentionally kept untracked (review on a separate commit)

## Sprint 11.0D — Outlet Inventory (Fixed Par Stock Consignment)
- Branch: `feature/sprint-11.0D-outlet-inventory`
- Status: **FROZEN**
- Definition of Done: **PASSED**
- Regression Test: **PASSED**
- Note: `README.md` intentionally kept untracked (review on a separate commit)

## Sprint 11.0E — Sales Visit (orchestrator over frozen 11.0D)
- Branch: `feature/sprint-11.0E-sales-visit`
- Status: **FROZEN**
- Definition of Done: **PASSED**
- Regression Test: **PASSED**
- Note: `README.md` intentionally kept untracked (review on a separate commit)

## Sprint 11.1A — Delivery -> Outlet Inventory (public API over frozen 11.0E)
- Branch: `feature/sprint-11.1A-delivery-outlet-integration`
- Status: **FROZEN**
- Definition of Done: **PASSED**
- Regression Test: **PASSED**
- Note: `README.md` intentionally kept untracked (review on a separate commit)

## Sprint 11.2A — Warehouse ⇄ Sales Stock Transfer (over frozen 11.1A)
- Branch: `feature/sprint-11.2A-warehouse-stock-transfer`
- Status: **FROZEN**
- Definition of Done: **PASSED**
- Regression Test: **PASSED**
- Note: `README.md` intentionally kept untracked (review on a separate commit)

# Tasks: Sprint 10.3 (CQRS Read Model & Projection)

- `[x]` 1. Read Model Schema & Database
  - `[x]` Update `prisma/schema.prisma` with `DailySalesSummary`, `CustomerLedgerSummary`, `ProductSalesSummary`, `SalesPerformanceSummary`, and `ProcessedEvent`
  - `[x]` Generate & apply Prisma migration
- `[x]` 2. Idempotency & Projection Infrastructure
  - `[x]` Create base projector or helper for idempotency using `ProcessedEvent` table
- `[x]` 3. Projectors (Event Subscribers)
  - `[x]` Create `src/read-model/projectors/SalesSummaryProjector.js`
  - `[x]` Create `src/read-model/projectors/CustomerLedgerProjector.js`
  - `[x]` Create `src/read-model/projectors/ProductSalesProjector.js`
  - `[x]` Create `src/read-model/projectors/SalesPerformanceProjector.js`
- `[x]` 4. Read Repositories
  - `[x]` Create `src/repositories/read/daily-sales-summary.repository.js`
  - `[x]` Create `src/repositories/read/customer-ledger-summary.repository.js`
  - `[x]` Create `src/repositories/read/product-sales-summary.repository.js`
  - `[x]` Create `src/repositories/read/sales-performance-summary.repository.js`
- `[x]` 5. Query API (Controllers & Routes)
  - `[x]` Create `src/controllers/report.controller.js`
  - `[x]` Create `src/routes/report.routes.js`
  - `[x]` Register routes in `app.js`
- `[x]` 6. Event Registration
  - `[x]` Register projectors in `app.js` (Event Bus)
- `[x]` 7. Verification & Documentation
  - `[x]` Create and run `tests/cqrs.test.js`
  - `[x]` Create `docs/architecture/cqrs-read-model.md`

# Tasks: Sprint 11.0C (Sales Stock Issue)

- `[x]` 1. Database Migration
  - `[x]` Create & apply `prisma/migrations/20260807130000_sprint_11_0c_sales_stock` (SalesStockIssue, SalesStockIssueItem, SalesStockIssueHistory, SalesStockLedger, SalesStockProjection + MovementType values ISSUE_FROM_WAREHOUSE / RETURN_TO_WAREHOUSE / ADJUSTMENT)
  - `[x]` Sync schema drift: `Product` columns (sku, display_name, search_keywords, average_cost, last_purchase_price, shelf_life_days, is_purchasable, is_consignment), `Tax.is_default`, `Supplier.pic_name/phone/email/city/province`, `PriceLevel.priority`, `ProductInventoryProjection` stock columns
- `[x]` 2. Domain Events & Registry
  - `[x]` Create `SalesStockIssuedEvent`, `SalesStockConfirmedEvent`, `SalesStockClosedEvent` (src/domain/events)
  - `[x]` Register events in `EventRegistry`
- `[x]` 3. Sales Stock Service
  - `[x]` Rewrite `SalesStockIssueService` (createDraft / confirm / close / getAll / getById) with atomic issue_number (NumberGeneratorService), FEFO warehouse reservation, ledger + projection, InventoryMovement audit, history, outbox domain events
  - `[x]` SalesStockProjector (idempotent projection reconcile) registered in app.js
- `[x]` 4. API (Controller + Routes)
  - `[x]` `POST /sales/stock-issues`, `POST /:id/confirm`, `POST /:id/close`, `GET /`, `GET /:id`
  - `[x]` `GET /sales/stock/:salesId/projection`, `GET /sales/stock/:salesId/ledger`
  - `[x]` Fix broken relative imports in sales module (`../../../../` → `../../../`)
  - `[x]` Fix MasterLookupController `is_active` filters (CustomerCategory/Area/Route/Regional)
- `[x]` 5. Frontend (Sprint 11.0C pages)
  - `[x]` Fix `SalesStockIssueRepository` (correct api import + `/sales/stock-issues` paths)
  - `[x]` Rewrite List / Form / Detail pages against real backend + register routes in App.jsx
  - `[x]` Fix `SalesStockSummary` (salesId + real projection API)
  - `[x]` Fix pre-existing build blockers in customer module (hooks, repository, status badge)
- `[x]` 6. Verification
  - `[x]` `tests/sales-stock.test.js` integration suite (10 tests) + `tests/product-master.test.js` unit suite (9 tests)
  - `[x]` Frontend `npm run build` + `npm run lint` pass

# Tasks: Sprint 11.0D (Outlet Inventory - Fixed Par Stock Consignment)

- `[x]` 1. Database Migration
  - `[x]` Create & apply `prisma/migrations/20260807160000_sprint_11_0d_outlet_inventory` (OutletMovementType enum + OutletParStock, OutletStockLedger, OutletStockProjection, OutletStockCount, OutletStockCountItem)
  - `[x]` `prisma validate` clean + `prisma generate`
- `[x]` 2. Domain Layer (`src/modules/outlet-inventory/domain`)
  - `[x]` Value object `MovementType` (ISSUE_TO_OUTLET / REFILL / SALE / RETURN_GOOD / RETURN_BAD / ADJUSTMENT)
  - `[x]` Engines: `AutoSalesEngine` (sales = max(0, currentBalance - physical)), `AutoRefillEngine` (refill = max(0, par - physical))
  - `[x]` Entities `OutletParStock`, `OutletStockCount`; aggregate `OutletInventory` (processItem incl. sell-through)
  - `[x]` Events: OutletParStockUpdated, StockCountRecorded, SalesCalculated, RefillCalculated, OutletProjectionUpdated
  - `[x]` Repositories: OutletParStock, OutletStockLedger, OutletStockProjection, OutletStockCount
- `[x]` 3. Application Layer
  - `[x]` `OutletInventoryService`: upsertParStock (batch + projection sync), recordStockCount (transactional count -> SALE ledger (reference STOCK_COUNT) -> projection -> outbox events), getParStock / getProjection / getLedger / getStockCounts
  - `[x]` Events carry projection `version` for optimistic concurrency; projector skips reconcile when a newer write bumped the version (fixes async write race)
- `[x]` 4. Presentation
  - `[x]` `OutletInventoryController` + `routes/outlet-inventory.routes.js` (auth)
  - `[x]` `PUT /sales/outlet-stock/par-stock`, `GET /par-stock`, `GET /:warungId/projection`, `GET /:warungId/ledger`, `POST /:warungId/stock-count`, `GET /:warungId/stock-counts`
  - `[x]` Register route + `OutletInventoryProjector` in `src/app.js`; register 5 events in `EventRegistry`
- `[x]` 5. Verification
  - `[x]` `tests/outlet-inventory.unit.test.js` (domain engines/entities) — part of `npm test`
  - `[x]` `tests/outlet-stock.test.js` (9 integration tests incl. concurrency regression) — part of `npm run test:integration`
  - `[x]` `npm test` (19) + `npm run test:integration` (19) = 38 passing, stable across repeated runs; app boots OK
  - [x] 6. Audit fixes
    - [x] Concurrency blocker: concurrent `recordStockCount` read the same `current_stock` -> broken ledger chain + overcounted `total_sales`. Fixed with per-warung async mutex (`_withWarungLock`) serializing `upsertParStock`/`recordStockCount`; projector uses optimistic locking (`updateIfVersion` + event `version`).
    - [x] Ledger ordering tiebreaker `[{created_at:'desc'},{id:'desc'}]` added.
    - [x] Dead code removed (`sumByMovementType`, `upsertFromItems`, `projectionSnapshots`, unused `ledgerRow`); projector rewritten onto repository's `updateIfVersion`.
    - [x] Concurrency regression test made order-agnostic (chain integrity + `total_sales=8` + final stock in {2,3}) with `try/finally` cleanup.

# Tasks: Sprint 11.0E (Sales Visit)

- `[x]` 1. Database Migration
  - `[x]` Migration `prisma/migrations/20260807170000_sprint_11_0e_sales_visit` (enum `SalesVisitStatus`, `SalesVisitActivityType` + tabel `SalesVisit`, `SalesVisitActivity`, `SalesVisitNote`, `SalesVisitPhoto`)
  - `[x]` Back-relations `User`/`Warung`; `prisma validate` clean + `prisma generate`
  - `[x]` Deploy clean via `migrate deploy` (workaround: Prisma CLI memakai session URL `:5432`, bukan pooler `:6543`; pre-existing `20260807114200_sprint_10_8a_2_final` di-resolve `--applied` dulu)
- `[x]` 2. Domain Layer (`src/modules/sales-visit/domain`)
  - `[x]` `VisitStatus` (lifecycle + `VisitTransitions` + terminal) & `VisitActivityType` (10 tipe)
  - `[x]` Entity `SalesVisit` (PLANNED, normalisasi `visit_date` UTC, validasi)
  - `[x]` `VisitValidationService` (state machine murni) & `VisitTimelineService` (kronologis + durasi)
  - `[x]` Repositori `SalesVisit`/`Activity`/`Note`/`Photo` (`client || prisma`)
  - `[x]` 8 domain events `SalesVisit{Planned,CheckedIn,StockCounted,OrderCreated,Delivered,CheckedOut,Completed,Cancelled}Event`
- `[x]` 3. Application Layer
  - `[x]` `SalesVisitService`: create / check-in (GPS + radius) / stock-count (delegasi public API 11.0D) / order / delivery (tanpa mutasi stok) / check-out (durasi) / complete / cancel / note / photo / queries (detail, list, timeline, inventory, sales-history)
  - `[x]` Per-visit async mutex (`_withVisitLock`), ownership SALES (403), `SV-YYYYMMDD-####`, outbox events dalam transaksi
  - `[x]` Fix `recordStockCount` dua transaksi (11.0D source of truth commit lalu status kunjungan) — return shape disusun setelah tx
- `[x]` 4. Presentation
  - `[x]` `SalesVisitController` + `routes/sales-visit.routes.js` (auth + role SALES/ADMIN/OWNER)
  - `[x]` Register route di `src/app.js`; register 8 events di `EventRegistry`
  - `[x]` Fix `getVisit` memuat activities/notes/photos (includeActivities true)
- `[x]` 5. Verification
  - `[x]` `tests/sales-visit.unit.test.js` (entity, state machine, timeline) — bagian `npm test`
  - `[x]` `tests/sales-visit.test.js` (23 integrasi) — bagian `npm run test:integration`
  - `[x]` `npm test` (46) + `npm run test:integration` (42) = 88 passing; baseline 11.0D & 11.0C tetap hijau
- `[x]` 6. Docs & Freeze
  - `[x]` `docs/architecture/sales-visit-domain.md` (posisi orchestrator, state machine, integrasi 11.0D, API)
  - `[x]` Freeze commit + tag `v11.0E`

# Tasks: Sprint 11.1A (Delivery -> Outlet Inventory)

- `[x]` 1. Database Migration
  - `[x]` Migration `prisma/migrations/20260807180000_sprint_11_1a_outlet_delivery` (enum `OutletDeliveryStatus` + tabel `OutletDelivery`, `OutletDeliveryItem`, kolom `notes` di `OutletStockLedger`, back-relation Warung/Product)
  - `[x]` Deploy via `prisma migrate deploy` (workaround session URL `:5432`) + `prisma generate` (v7.9.1); `ISSUE_TO_OUTLET` sudah ada sejak 11.0D (tidak perlu ubah enum)
- `[x]` 2. Domain Layer (`src/modules/outlet-inventory/domain`)
  - `[x]` `OutletDeliveryStatus` (PENDING/POSTED/FAILED + `RETRYABLE_STATUSES`)
  - `[x]` Entity `OutletDelivery` (validasi warung/tanggal/reference, qty integer > 0, tanpa duplikat produk; `toPrisma()` snake_case)
  - `[x]` `OutletDeliveryRepository` (create / findByReference / updateStatus)
  - `[x]` `OutletStockProjectionRepository.applyDelivery` (increment current_stock/total_refill/version, create-if-missing)
  - `[x]` Event `OutletDeliveryRecordedEvent`
- `[x]` 3. Application Layer
  - `[x]` `OutletInventoryService.recordDelivery`: Phase 0 atomic validation (warung + produk, sebelum persist) -> Phase 1 find-or-create dokumen di bawah `_withWarungLock` -> Phase 2 posting satu transaksi (ledger ISSUE_TO_OUTLET + projection + POSTED + outbox) -> `FAILED` + rethrow saat error; helper `_parseIntOrNull`/`_serializeDelivery`
  - `[x]` `OutletInventoryProjector`: `ISSUE_TO_OUTLET` dihitung sebagai refill (selaras dengan penulisan langsung)
  - `[x]` `SalesVisitService.recordDelivery` men-delegasikan ke `recordDelivery` (referenceType default `SALES_VISIT`, referenceId `visit.id`) lalu DELIVERED + aktivitas + `SalesVisitDeliveredEvent` (dua transaksi, pola sama dengan stock-count)
  - `[x]` Register `OutletDeliveryRecordedEvent` di `EventRegistry`
- `[x]` 4. Verification
  - `[x]` `tests/outlet-delivery.unit.test.js` (8 unit) — bagian `npm test`
  - `[x]` `tests/outlet-delivery.test.js` (5 integrasi: posting via endpoint visit, idempotensi tanpa double stock, atomic validation produk tak dikenal, retry FAILED -> POSTED, penolakan 422) — bagian `npm run test:integration`
  - `[x]` Fix: pindahkan validasi produk ke Phase 0 (sebelum persist) agar tidak memunculkan `P2003`; tambah `idempotent: false` pada respon sukses
  - [x] `npm test` (54) + `npm run test:integration` (47) passing; baseline 11.0D/11.0E tetap hijau
- `[x]` 5. Docs & Freeze
  - `[x]` `docs/architecture/inventory.md` (data model, algoritma recordDelivery, projection, event, sequence diagram)
  - `[x]` Update `docs/architecture/sales-visit-domain.md` (delivery kini memposting stok via 11.1A)
  - `[x]` `docs/architecture/adr/0001-delivery-outlet-inventory.md`
  - [x] Freeze commit + tag `v11.1A`

# Tasks: Sprint 11.2A (Warehouse ⇄ Sales Stock Transfer)

- `[x]` 1. Database Migration
  - `[x]` Migration `prisma/migrations/20260807190000_sprint_11_2a_warehouse_transfer` (enum `WarehouseMovementType`, `WarehouseTransferType`, `WarehouseTransferStatus`, `SalesDayStatus` + tabel `WarehouseLedger`, `WarehouseTransfer`(+Item), `SalesDay`; `MovementType` + `RECEIVED_FROM_WAREHOUSE`/`RESTOCK_OUTLET`; back-relations `User`/`Warehouse`/`Product`/`ProductBatch`)
  - `[x]` Revisi additive: `20260807190100_..._item_batch` (kolom `batch_id` di `WarehouseTransferItem` utk target RETURN) dan `20260807190200_..._reference_type_transfer` (`ReferenceType` + `TRANSFER`)
  - `[x]` Deploy via `prisma migrate deploy` (workaround session URL `:5432`) + `prisma generate` (v7.9.1)
- `[x]` 2. Domain Layer (`src/modules/warehouse/domain`)
  - `[x]` Constants: `WarehouseTransferStatus` (+`RETRYABLE_STATUSES`), `WarehouseTransferType`, `WarehouseMovementType`, `SalesDayStatus`
  - `[x]` Entities `WarehouseTransfer` (ISSUE/RETURN, batch_id wajib utk RETURN, duplikat/qty>0, `toPrisma()`) & `SalesDay`
  - `[x]` Events `WarehouseTransferPostedEvent`, `WarehouseReturnReceivedEvent`, `SalesDayClosedEvent`
  - `[x]` Repositories `WarehouseTransfer` (findByReference idempotency), `WarehouseLedger`, `SalesDay` (find-or-create OPEN)
- `[x]` 3. Application Layer
  - `[x]` `SalesStockService`: `RESTOCK_OUTLET` ditambahkan ke `DECREASE_TYPES` (RECEIVED_FROM_WAREHOUSE otomatis kenaikan)
  - `[x]` `WarehouseTransferService.issueStockToSales`: Phase 0 atomic validation (gudang/sales/produk) -> Phase 1 find-or-create PENDING di bawah `_withSalesLock` -> Phase 2 posting satu transaksi (reserve FEFO + decrease WarehouseStock + WarehouseLedger ISSUE_TO_SALES + SalesStock RECEIVED_FROM_WAREHOUSE + InventoryMovement LOAD_OUT + POSTED + outbox) -> FAILED + rethrow
  - `[x]` `receiveReturnedStock`: RETURN dengan batch_id, cek stok sales (INSUFFICIENT_STOCK) + increase WarehouseStock + WarehouseLedger RETURN_FROM_SALES + SalesStock RETURN_TO_WAREHOUSE + InventoryMovement LOAD_IN
  - `[x]` `closeSalesDay`: ringkasan harian dari WarehouseLedger -> CLOSED (summary JSONB, idempotent pada re-close)
- `[x]` 4. Presentation
  - `[x]` `WarehouseTransferController` + `routes/warehouse-transfer.routes.js` (auth)
  - `[x]` `POST /warehouse/transfers/issue`, `POST /return`, `POST /sales-days/close`, `GET /`, `GET /:id`, `GET /ledger`, `GET /sales-days`
  - `[x]` Register route di `src/app.js`; register 3 events di `EventRegistry`
- `[x]` 5. Verification
  - `[x]` `tests/warehouse-transfer.unit.test.js` (11 unit) — bagian `npm test`
  - `[x]` `tests/warehouse-transfer.test.js` (10 integrasi: issue, idempotensi, konkuensi duplicate issue, insufficient warehouse, return, return idempotent, return-exceeds, close-day idempotent, 422 tanpa batch_id, list/ledger/sales-days) — bagian `npm run test:integration`
  - [x] `npm test` (65) + `npm run test:integration` (57) passing; baseline 11.0C/11.0D/11.0E/11.1A tetap hijau
- `[x]` 6. Docs & Freeze
  - `[x]` `docs/architecture/warehouse.md` (data model, algoritma issue/return/close-day, sequence diagram, API)
  - `[x]` `docs/architecture/adr/0002-warehouse-sales-stock-transfer.md`
  - [x] Freeze commit + tag `v11.2A`


