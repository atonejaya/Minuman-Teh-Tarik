# ADR-0001: Integrasi Delivery ke Stok Outlet (Sprint 11.1A)

- Status: **Accepted**
- Tanggal: 2026-08-07
- Sprint: 11.1A (baseline: `v11.0E` frozen)
- Terkait: `ADR` pola Sales Visit 11.0E (delegasi ke public API 11.0D)

## Konteks

Pada 11.0E, `POST /sales-visits/:id/delivery` hanya mencatat aktivitas kunjungan
(`DELIVERED`) tanpa memutasi stok outlet; mutasi dijadwalkan ke sprint berikutnya. Kini
delivery harus memposting stok ke outlet (`ISSUE_TO_OUTLET`) secara aman: idempotent
terhadap double-submit, atomik (tanpa ledger parsial), konsisten dengan projection, dan
tetap mempertahankan aturan "Sales Visit tidak menulis langsung ke `OutletStock*`".

## Keputusan

1. **Public API baru di 11.0D context**: `OutletInventoryService.recordDelivery(...)`,
   didelegasikan dari `SalesVisitService.recordDelivery` (pola sama dengan
   `recordStockCount`). Tidak ada REST endpoint baru; pemicu saat ini hanya dari
   Sales Visit sehingga API cukup sebagai public service.
2. **Dokumen delivery terpisah** (`OutletDelivery`/`OutletDeliveryItem`) dengan status
   `PENDING`/`POSTED`/`FAILED`, bukan langsung menulis ledger.
3. **Idempotensi** berbasis `@@unique([reference_type, reference_id])`; pemanggilan
   ulang pada status `POSTED` mengembalikan hasil lama (`idempotent: true`); retry hanya
   untuk `PENDING`/`FAILED`. **Tidak** ada error `DUPLICATE_DELIVERY` — hasil lama
   dikembalikan apa adanya.
4. **Atomic validation** (Phase 0): warung dan semua produk divalidasi **sebelum**
   dokumen dibuat — produk tak dikenal gagal `PRODUCT_NOT_FOUND` tanpa baris delivery/
   ledger tersisa (menghindari error FK Prisma `P2003` yang "kasar" dari pembuatan item
   dengan product_id tak ada).
5. **Posting atomik** (Phase 2, satu transaksi): ledger `ISSUE_TO_OUTLET` + projection
   `applyDelivery` + status `POSTED` + `OutletDeliveryRecordedEvent` (outbox) commit
   bersama; kegagalan menandai `FAILED` (dengan `error_message`) lalu melempar ulang.
6. **`ISSUE_TO_OUTLET` = refill**: projection menaikkan `current_stock` + `total_refill`;
   `OutletInventoryProjector` (reconcile) diselaraskan sehingga hasil replay = hasil
   penulisan langsung.
7. **`reference_id` String** pada dokumen; kolom ledger `reference_id` Int hanya diisi
   untuk nilai numerik murni (`_parseIntOrNull`); ledger diberi kolom `notes`.

## Konsekuensi

- **Positif**: idempotent dan atomik (tanpa partial ledger), bisa retry setelah crash,
  aman terhadap double-submit dari sumber berbeda, projection konsisten, Sales Visit
  tetap murni orchestrator.
- **Negatif**: posting delivery berada di luar transaksi status kunjungan (konsekuensi
  disengaja, sama dengan stock-count); bila update status visit gagal, stok sudah
  durable dan status dapat disinkronkan ulang. Hanya status `FAILED`/`PENDING` yang
  memicu reposting — permintaan dengan status lain tidak pernah menulis stok dua kali.

## Alternatif yang Dipertimbangkan

- **Tanpa dokumen delivery** (langsung tulis ledger per item dengan key idempotensi
  ledger): kehilangan jejak audit status posting dan `FAILED` retry.
- **Reject pada double post** (`DuplicateDeliveryError`): tidak sesuai spesifikasi
  "return the existing result"; respon idempotent lebih aman bagi klien.
- **Validasi produk hanya saat posting** (Phase 2): membuat dokumen delivery berisi item
  tak valid dan menyisakan baris `FAILED` untuk kegagalan yang sebenarnya murni
  validasi — dipilih validasi di Phase 0 agar kegagalan validasi tidak menghasilkan
  artefak.
