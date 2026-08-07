# CODING_STANDARD.md

Ini adalah dokumen standar pengembangan (*baseline v1.0*) yang wajib dipatuhi oleh seluruh developer atau AI selama mengerjakan *Backend* maupun *Frontend* proyek @One Consignment.

## 1. Naming Conventions & Files
- **Variables, Functions, Methods**: `camelCase` (e.g., `calculateTotal`, `userId`)
- **Classes, Interfaces, DTOs**: `PascalCase` (e.g., `UserService`, `CreateVisitRequest`)
- **Database Tables & Columns**: `snake_case` (e.g., `visit_detail`, `created_at`)
- **Constants & Enums**: `UPPER_SNAKE_CASE` (e.g., `INVOICE_STATUS.LUNAS`, `MAX_RETRY`)
- **Files**: `kebab-case` (e.g., `user.controller.js`, `number-generator.service.js`)
- **Upload Naming**: Jangan gunakan nama asli. Gunakan pola `[entity]_[YYYYMMDD]_[uuid/random].ext` (e.g., `visit_20260805_8f9c2d.jpg`).

## 2. Architecture & Layering (Repository Pattern)
Jangan menaruh *Business Logic* di *Controller*. Ikuti urutan ini:
**Route ➔ Controller ➔ Service ➔ Repository**
- **Controller**: Sangat tipis. Parse request, panggil Service, kembalikan dengan `ResponseHelper`.
- **Service**: Pusat validasi aturan bisnis, kalkulasi stok & payroll.
- **Repository**: Murni pemanggilan Database (Prisma). Tanpa logic bisnis.

## 3. Database Migration Policy (WAJIB)
✅ **Semua perubahan database HARUS melalui migration.**
Tidak boleh menggunakan perintah `db push` di *production*.
- Development: Gunakan `npx prisma migrate dev`
- Production: Gunakan `npx prisma migrate deploy`

## 4. Database Transaction Policy
Semua operasi yang mengubah lebih dari satu tabel **WAJIB** menggunakan Prisma Transaction (`$transaction`). Terutama pada proses: Load Confirm, Visit Checkout, Return Confirm, Setoran Verify, Payroll Approve.

## 5. DTO & Validation
Setiap payload **wajib** divalidasi. Error validasi harus selalu me-return format standar dengan `request_id`.
- **Password Policy**: Password minimal 8 karakter, di-hash dengan `bcrypt` cost factor 12.
- Semua API Response **DILARANG** mengembalikan *password_hash*.

## 6. Authentication & Authorization
Pisahkan *middleware*:
- `authenticate`: Memverifikasi JWT dan mengekstrak Payload. JWT Payload tidak boleh besar (Cukup `sub`, `role`, `username`).
- `authorize(ROLE)`: Memverifikasi hak akses. Dilarang mencampur keduanya.

## 7. Error Codes & Response Helpers
Gunakan `ResponseHelper` agar seragam (WAJIB menyertakan `request_id` pada seluruh response). Header response harus selalu menyertakan: `X-API-Version: 1.0.0`.

## 8. Logger & Audit Log
- **Audit Log** HANYA mencatat *critical mutations* (e.g., Login, Load Confirm, Return Confirm, Setoran Verify, Payroll Approve, Product Update). DILARANG mencatat setiap request `GET`.

## 9. Aturan Umum
- Semua data *timestamp* di database WAJIB disimpan dalam format **UTC**.
- Semua **Pembuatan Nomor Generator** (Invoice, Visit, Load) **WAJIB** dilakukan di Backend, dilarang di-generate oleh Frontend.
- Selalu gunakan `async / await`.
- Penuhi prinsip **DRY** (Don't Repeat Yourself).
- Terapkan konsep *Soft Delete* untuk master data (`is_active = false`).

## 10. Sprint Definition of Done
Setiap sprint baru boleh dianggap selesai jika:
1. Semua endpoint berjalan.
2. Validasi DTO lengkap.
3. Repository memiliki unit test dasar.
4. Swagger/OpenAPI diperbarui.
5. Seeder diperbarui bila ada tabel baru.
6. Tidak ada error lint.
7. Tidak ada TODO yang tertinggal.
8. Semua endpoint menggunakan ResponseHelper.
9. Semua perubahan sudah melalui migration Prisma.
