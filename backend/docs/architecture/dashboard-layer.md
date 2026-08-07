# Dashboard & Operational Analytics Layer (Sprint 10.5)

## Objective
The Dashboard Layer serves as the primary presentation tier for the `@One` Consignment System. It consumes 100% of its data from the CQRS Read Models (via the Reporting Service) and never accesses OLTP tables, ensuring ultra-fast loading times and zero impact on transactional operations.

## Architecture Principles
- **CQRS Read Only**: Completely decoupled from Write models.
- **Presentation Layer Only**: Handles aggregation for UI components. No domain logic exists here.
- **Cache Friendly**: Implements aggressive (but short-lived) in-memory caching to withstand dashboard polling.
- **Enterprise DTO Standard**: Enforces `{ success, message, generated_at, data }` structures.

## Dashboard Architecture

```mermaid
graph TD
    Client[Frontend Dashboard] -->|HTTP GET| Controller[Dashboard Controller]
    Controller -->|Joi Validated| Service[Dashboard Service]
    Service -->|Check Cache| Cache[QueryCache (TTL 60s)]
    Cache -- Miss --> Reporting[Reporting Service]
    Reporting --> Repo[Reporting Repositories]
    Repo --> DB[(CQRS Projections)]
    DB --> Repo
    Repo --> Reporting
    Reporting --> Service
    Service -->|Save to Cache| Cache
    Service --> Controller
    Controller --> Client
```

## API Design & DTO Structure

All endpoints return a strict payload:
```json
{
  "success": true,
  "message": "Success",
  "generated_at": "2026-08-07T00:00:00.000Z",
  "data": { ... }
}
```

### Endpoints
1. `GET /api/v1/dashboard`
   - **Summary KPI**: Today's Omzet, Invoices, Outstanding, Top Selling Product, Active Customers.
2. `GET /api/v1/dashboard/sales`
   - **Sales Analytics**: Trends for sales, invoices, and payments over time.
3. `GET /api/v1/dashboard/products`
   - **Product Analytics**: Top 10 products, slow moving items, revenue distribution.
4. `GET /api/v1/dashboard/customers`
   - **Customer Analytics**: Top customers by revenue, largest outstanding balances.
5. `GET /api/v1/dashboard/receivables`
   - **Receivable Analytics**: Total outstanding, aging analysis, collection rates.

## Cache Strategy
Dashboard APIs are often polled concurrently when users load the app. To protect the database:
- **Component**: `QueryCache` (currently an in-memory Map, built to be easily swapped for Redis).
- **TTL**: `60 seconds` default.
- **Deterministic Keys**: `PREFIX_JSON.stringify(params)`.
- **Flow**: `DashboardService` wraps calls to `ReportingService` with `QueryCache.get` and `QueryCache.set`.
