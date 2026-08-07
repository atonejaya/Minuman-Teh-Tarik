# Transactional Outbox Pattern

Sebagai kelanjutan dari **Domain Event Infrastructure (Sprint 10.1)**, kita menambahkan layer pengamanan bernama **Transactional Outbox Pattern (Sprint 10.2)**. Pattern ini merupakan praktik standar dalam Event-Driven Architecture (EDA) skala enterprise.

## 1. Tujuan Outbox Pattern
Masalah utama dalam sistem *distributed* adalah: "Bagaimana cara mengubah status *database* (misalnya mengurangi stok) DAN mengirim pesan (misalnya `InvoiceConfirmedEvent`) secara bersamaan, menjamin tidak ada yang gagal sebelah?"

Jika kita melakukan:
1. `commit` database
2. `publish` event
Dan aplikasi mati (misal: listrik padam) tepat setelah langkah 1, maka event tersebut hilang selamanya (*Event Loss*).

Dengan **Transactional Outbox Pattern**, kita tidak langsung *publish* event. Sebaliknya, kita menyimpannya ke tabel `OutboxEvent` di dalam blok transaksi *database* yang SAMA dengan perubahan bisnis.
1. `BEGIN TRANSACTION`
2. `UPDATE inventory`
3. `INSERT INTO outbox_events`
4. `COMMIT`

## 2. Event Lifecycle
Setiap Event di dalam *Outbox* memiliki status:
- **PENDING**: Event baru saja disimpan dan menunggu diproses oleh *Worker*.
- **PROCESSING**: Event sedang di-*pick-up* oleh sebuah *Worker*. Status ini mencegah *Worker* lain (jika ada lebih dari 1) untuk mengeksekusi event yang sama secara bersamaan.
- **PUBLISHED**: Event sukses disebarkan ke *Message Bus* dan diproses oleh semua *Subscriber*.
- **FAILED**: Ada kesalahan saat penyebaran.

## 3. Worker Relay Flow
Sistem menggunakan *Background Job* sederhana (`OutboxRelayWorker`) yang berjalan terus-menerus:
1. Worker mengambil kumpulan event `PENDING` (Batching: misal 100 event).
2. Worker mengubah semuanya menjadi `PROCESSING` sekaligus (Atomic Update).
3. Worker mempublikasikan setiap event satu per satu menggunakan `InternalMessageBus`.
4. Jika berhasil, status diubah menjadi `PUBLISHED`.

### Mekanisme Retry
Jika terjadi *error* saat mempublikasikan, status diubah ke `FAILED` dan `retry_count` bertambah. *Worker* akan menggunakan **Exponential Backoff** untuk menghitung waktu coba ulang (`next_retry_at`). Setelah mencapai `maxRetry` (konfigurasi via ENV `OUTBOX_MAX_RETRY`), sistem akan menyerah dan event dibiarkan `FAILED`.

## 4. ⚠️ PERINGATAN KERAS: Subscriber Idempotency
Sistem *Outbox* ini menjamin **At-Least-Once Delivery**. Artinya, dalam kasus ekstrem, sebuah event **MUNGKIN** dipublikasikan lebih dari satu kali (misal: saat *worker* *crash* ketika sedang *publish* namun belum sempat mengubah status ke `PUBLISHED`).

Oleh karena itu, **Seluruh Subscriber WAJIB bersifat Idempotent**. 
*Subscriber* harus sanggup menerima event yang sama (ditandai dengan `correlation_id` / `event_id` yang identik) berulang kali tanpa menyebabkan *side effect* berganda (seperti mengurangi stok dua kali).

## 5. Cara Menambah Event Baru
Berkat implementasi **EventFactory** yang berbasis *Registry* (Open/Closed Principle), Anda hanya perlu:
1. Membuat *class* turunan `DomainEvent`.
2. Mendaftarkannya di `src/infrastructure/events/registry/EventRegistry.js`.
Tidak perlu memodifikasi `EventFactory` maupun Worker sama sekali!
