# ADR-0002: Warehouse sebagai Source of Truth Mutasi Stok Sales (Sprint 11.2A)

- Status: **Accepted**
- Tanggal: 2026-08-07
- Sprint: 11.2A (baseline: `v11.1A` frozen)
- Terkait: `ADR-0001` (delivery → outlet), pola async mutex 11.0D/11.0E

## Konteks

Stok perusahaan mengalir dari **Warehouse** ke **sales** (issue) dan kembali ke
Warehouse (return). Sebelum 11.2A, issue/return hanya dicatat oleh
`SalesStockIssueService` (SalesStockLedger + projection + InventoryMovement) tanpa
dokumen transfer yang idempotent dan tanpa ledger gudang sebagai jejak audit
terstruktur. Dibutuhkan: mutasi dua sisi (gudang & sales) yang atomik, idempotent
terhadap double-submit, tahan retry setelah crash, konsisten terhadap stok gudang per
batch (optimistic locking), dan checkpoint harian untuk sales.

## Keputusan

1. **Bounded context baru `Warehouse`** (`src/modules/warehouse`) dengan lapisan DDD
   (domain constants/entities/events/repositories, application service, presentation)
   seperti outlet-inventory/sales-visit. Additive di atas `v11.1A`; tidak mengubah alur
   Sales Visit/Outlet Inventory/Stock Count/Auto Sales.
2. **Dokumen transfer** `WarehouseTransfer`(+Item) berstatus `PENDING`/`POSTED`/`FAILED`
   dengan kunci idempotensi `@@unique([type, reference_type, reference_id])` dan nomor
   `WT-YYYYMMDD-####`. Retry hanya untuk `PENDING`/`FAILED` (`RETRYABLE_STATUSES`);
   `POSTED` dikembalikan apa adanya (`idempotent: true`).
3. **Ledger gudang** `WarehouseLedger` (append-only) sebagai source of truth mutasi
   gudang per produk (`movement_type` `ISSUE_TO_SALES`/`RETURN_FROM_SALES`, `balance` =
   total stok gudang produk setelah mutasi). Tidak pernah di-update/delete.
4. **Mutasi dua sisi dalam satu transaksi**: issue = `reserveBatchFEFO` +
   `decreaseWarehouseStock` (optimistic version) + WarehouseLedger +
   `SalesStockService.addLedgerEntry(RECEIVED_FROM_WAREHOUSE)` + `InventoryMovement`
   (`LOAD_OUT`, `reference_type=TRANSFER`); return = cek stok sales >= qty
   (`INSUFFICIENT_STOCK`) + `increaseWarehouseStock` + WarehouseLedger +
   `addLedgerEntry(RETURN_TO_WAREHOUSE)` + `InventoryMovement` (`LOAD_IN`).
5. **Enum additive**: `MovementType` + `RECEIVED_FROM_WAREHOUSE` (kenaikan) dan
   `RESTOCK_OUTLET` (pengurangan, ditambahkan ke `DECREASE_TYPES` `SalesStockService`);
   `ReferenceType` + `TRANSFER`.
6. **Per-sales async mutex** (`_withSalesLock`) menserialisasi issue/return/close-day
   per sales (mencegah lost-update read-modify-write pada `SalesStockProjection`);
   konkuensi lintas warehouse diamankan optimistic locking `WarehouseStock`.
7. **`closeSalesDay`** mengunci ringkasan harian (`SalesDay` unique
   `[sales_id, sales_date]`, `summary` JSONB dari WarehouseLedger) tanpa memutasi stok;
   `CLOSED` idempotent.
8. **Transactionl outbox**: `WarehouseTransferPostedEvent`,
   `WarehouseReturnReceivedEvent`, `SalesDayClosedEvent` ditulis ke `outboxEvent` dalam
   transaksi posting; didaftarkan di `EventRegistry`.

## Konsekuensi

- **Positif**: mutasi gudang↔sales atomik dan bisa diaudit dari kedua sisi; idempotent
  & retry-safe; ledger gudang immutable; ringkasan harian terverifikasi konsisten dengan
  ledger; API lama tidak berubah (backward-compatible).
- **Negatif**: mutasi sales masih memakai `SalesStockService.addLedgerEntry` (helper
  lama 11.0C) yang tidak memakai version pada projection — dikompensasi mutex
  per-sales; kompatibilitas silang dengan `SalesStockIssueService` (SSI) di luar cakupan
  (SSI tetap berjalan sebagai alur terpisah yang memakai `ISSUE_FROM_WAREHOUSE`).

## Alternatif yang Dipertimbangkan

- **Tanpa ledger gudang** (hanya WarehouseStock + InventoryMovement): kehilangan jejak
  audit terstruktur per produk; ledger dipilih agar gudang punya source of truth sendiri.
- **Tanpa dokumen transfer** (key idempotensi langsung di ledger): kehilangan status
  posting/retry; dokumen dipilih seperti `OutletDelivery` 11.1A.
- **Reject pada double post**: tidak sesuai spesifikasi idempotent; respon lama lebih
  aman bagi klien.
- **Lock per warehouse saja**: bisa lost-update pada projection sales yang sama dari
  dua warehouse berbeda; mutex per-sales dipilih.
