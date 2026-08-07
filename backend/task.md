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

