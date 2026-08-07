# Sales Visit (Sprint 11.0E)

Bounded context baru **Sales Visit** yang mengorkestrasi kunjungan salesman ke satu outlet
pada satu hari, berdiri di atas **frozen** 11.0D *Outlet Inventory* tanpa mengubahnya.

## 1. Posisi di Arsitektur

11.0E adalah **orchestrator**:

- Aturan stok tetap berada di bounded context *Outlet Inventory* (11.0D).
- Sales Visit hanya mengatur alur kunjungan dan **men-delegasikan** kalkulasi stok ke
  public API 11.0D (`OutletInventoryService.recordStockCount`).
- Tidak ada penulisan langsung ke tabel `OutletStock*` dari kode Sales Visit.

Modul 11.0E memperkenalkan konteks **terpisah** dari modul visit legacy
(`VisitStatus` PENDING/ONGOING/SELLING/...). Modul legacy tidak disentuh (backward
compatibility); Sales Visit memakai konteks sendiri (`SalesVisit*`, kode `SV-YYYYMMDD-####`).

```
11.0E Sales Visit (orchestrator)
   └─ POST :id/stock-count ──► OutletInventoryService.recordStockCount()  (11.0D public API)
   └─ GET  :id/inventory   ──► OutletInventoryService.getProjection()      (11.0D public API)
   └─ GET  :id/sales-history ─► OutletInventoryService.getLedger(SALE)     (11.0D public API)
```

## 2. Siklus Hidup (State Machine)

```
PLANNED ──► CHECKED_IN ──► STOCK_COUNTED ─┐
    │           │              └───────────┤
    │           ├──► ORDER_CREATED ────────┤
    │           │              └──► DELIVERED ──► CHECKED_OUT ──► COMPLETED
    │           └──► DELIVERED ────────────┘
    └──► CANCELLED   (hanya dari PLANNED)
```

- `STOCK_COUNTED`, `ORDER_CREATED`, `DELIVERED` bersifat **opsional** — satu kunjungan
  dapat melewati sebagian atau semuanya.
- `CANCELLED` hanya diizinkan sebelum ada aktivitas lapangan (dari `PLANNED`).
- Status terminal: `COMPLETED` / `CANCELLED`. Transisi valid tercantum di
  `VisitTransitions` (`domain/constants/VisitStatus.js`) dan ditegakkan oleh
  `VisitValidationService` (murni, tanpa DB).

## 3. Timeline (Immutable / Append-Only)

Setiap peristiwa kunjungan dicatat sebagai `SalesVisitActivity` (tidak dapat diubah /
dihapus). Timeline dikembalikan **kronologis** oleh `VisitTimelineService` dengan
urutan `occurred_at` lalu `id` sebagai tie-breaker.

Tipe aktivitas: `VISIT_CREATED`, `CHECK_IN`, `STOCK_COUNT`, `ORDER_CREATED`,
`DELIVERED`, `CHECK_OUT`, `COMPLETED`, `NOTE_ADDED`, `PHOTO_ADDED`, `CANCELLED`.

## 4. Integrasi Outlet Inventory (11.0D)

`recordStockCount` menjalankan alur dua transaksi:

1. `OutletInventoryService.recordStockCount(warungId, {...}, userId)` — satu transaksi
   yang mempersistenkan count fisik → ledger `SALE` (reference `STOCK_COUNT`) →
   proyeksi → outbox event 11.0D. **Ini source of truth stok.**
2. Transaksi Sales Visit: update status `STOCK_COUNTED` + aktivitas timeline + outbox
   event `SalesVisitStockCountedEvent`.

Karena aturan 11.0E "jangan ubah 11.0D public API", transaksi #2 tidak dapat ikut dalam
transaksi #1. Konsekuensi yang disengaja: bila langkah #2 gagal, catatan stok sudah
tertulis (durable) dan status kunjungan dapat disinkronkan ulang — stok tidak pernah
kehilangan konsistensi.

`GET :id/inventory` = proyeksi stok outlet (read model 11.0D).
`GET :id/sales-history` = ledger dengan filter `movement_type=SALE` (riwayat penjualan).

### Delivery (keputusan Sprint 11.0E)

`POST :id/delivery` hanya **aktivitas kunjungan** (timeline). **Tanpa mutasi stok
outlet** — integrasi delivery → stok outlet dijadwalkan pada sprint berikutnya
(rationale terdokumentasi di `SalesVisitService.recordDelivery`).

## 5. Konkurensi & Keamanan

- **Per-visit async mutex** (`_withVisitLock`): command pada kunjungan yang sama
  diserialisasi (mencegah duplicate check-in/check-out). Berlaku per instance
  (single-instance deployment) — pola sama dengan `_withWarungLock` 11.0D.
- **Ownership**: role `SALES` hanya dapat membuat/mengakses kunjungan miliknya
  (`_ensureOwnership` → 403). `ADMIN` / `OWNER` bertindak sebagai manajer.
- **Satu kunjungan per sales per outlet per hari**: constraint `@@unique([sales_id,
  warung_id, visit_date])` + cek eksplisit `DUPLICATE_VISIT`.
- **Kode kunjungan**: `SV-YYYYMMDD-####` via `NumberGeneratorService.generateCode`
  (upsert atomik `numberSequence`).

## 6. Domain Events

Semua event mewarisi `DomainEvent`, ditulis ke `outboxEvent` dalam transaksi yang sama,
didaftarkan di `EventRegistry`:

| Event | Trigger |
| --- | --- |
| `SalesVisitPlannedEvent` | create visit |
| `SalesVisitCheckedInEvent` | check-in |
| `SalesVisitStockCountedEvent` | stock count (setelah 11.0D commit) |
| `SalesVisitOrderCreatedEvent` | order |
| `SalesVisitDeliveredEvent` | delivery |
| `SalesVisitCheckedOutEvent` | check-out |
| `SalesVisitCompletedEvent` | complete |
| `SalesVisitCancelledEvent` | cancel |

## 7. API

```
POST   /api/v1/sales-visits                    (plan)
GET    /api/v1/sales-visits                    (list, SALES hanya miliknya)
GET    /api/v1/sales-visits/:id                (detail + timeline + notes + photos)
GET    /api/v1/sales-visits/:id/timeline
GET    /api/v1/sales-visits/:id/inventory
GET    /api/v1/sales-visits/:id/sales-history
POST   /api/v1/sales-visits/:id/check-in
POST   /api/v1/sales-visits/:id/stock-count
POST   /api/v1/sales-visits/:id/order
POST   /api/v1/sales-visits/:id/delivery
POST   /api/v1/sales-visits/:id/check-out
POST   /api/v1/sales-visits/:id/complete
POST   /api/v1/sales-visits/:id/cancel
POST   /api/v1/sales-visits/:id/notes
POST   /api/v1/sales-visits/:id/photos
```

Semua endpoint memerlukan auth + role `SALES` / `ADMIN` / `OWNER`.

## 8. Struktur Modul

```
src/modules/sales-visit/
  domain/
    constants/{VisitStatus,VisitActivityType}.js
    entities/SalesVisit.js
    services/{VisitValidationService,VisitTimelineService}.js
    repositories/{SalesVisit,SalesVisitActivity,SalesVisitNote,SalesVisitPhoto}Repository.js
    events/SalesVisit{Planned,CheckedIn,StockCounted,OrderCreated,Delivered,CheckedOut,Completed,Cancelled}Event.js
  application/services/SalesVisitService.js
  presentation/controllers/SalesVisitController.js
  presentation/routes/sales-visit.routes.js
```

## 9. Verifikasi

- `tests/sales-visit.unit.test.js` (lifecycle, state machine, timeline) — `npm test`
- `tests/sales-visit.test.js` (23 integrasi: plan, duplicate, check-in GPS, invalid
  transisi, stock-count via public API 11.0D, sales history, order/delivery, check-out,
  complete, timeline, ownership, outbox events) — `npm run test:integration`
- Regression: seluruh suite 11.0C/11.0D tetap hijau; baseline 11.0D tidak diubah.
