### Task 3: Uji manual di SQL Editor & deploy

**Files:**
- (tidak ada file baru)

**Interfaces:**
- Consumes: Task 1 & 2.

- [ ] **Step 1: Jalankan migration di SQL Editor**

User menjalankan `supabase/migrations/202608150004_reset_data.sql` di Supabase SQL Editor.
Expected: `Success`. No rows returned (create function).

- [ ] **Step 2: Uji penolakan non-OWNER / konfirmasi salah**

User menjalankan (masih sebagai OWNER di SQL Editor) untuk memverifikasi guard:

```sql
select public.admin_reset_data('SALAH');
```

Expected: error `Konfirmasi tidak sesuai. Ketik RESET untuk melanjutkan.` â€” data TIDAK terhapus (cek mis. `select count(*) from public."SalesVisit";` masih > 0).

- [ ] **Step 3: Uji reset lewat UI**

1. Login OWNER (user id 839) di https://operasional.atonejaya.workers.dev.
2. Buka Pengaturan â†’ tab **Reset Data**.
3. Tombol "Hapus Semua Data" harus nonaktif sampai mengetik `RESET`.
4. Ketik `RESET` â†’ klik tombol â†’ toast sukses.
5. Klik "Muat Ulang Halaman".

- [ ] **Step 4: Verifikasi data di SQL Editor**

```sql
select
  (select count(*) from public."SalesVisit") as visits,
  (select count(*) from public."SalesTransaction") as transactions,
  (select count(*) from public."SalesReturn") as returns,
  (select count(*) from public."OutletStockProjection") as outlet_proj,
  (select count(*) from public."SalesStockProjection") as sales_proj,
  (select count(*) from public."WarehouseStock") as wh_stock,
  (select count(*) from public."NumberSequence") as sequences,
  (select count(*) from storage.objects where bucket_id = 'visit-photos') as photos;
```

Expected: semua 0.

- [ ] **Step 5: Verifikasi master data tetap**

```sql
select
  (select count(*) from public."Product") as products,
  (select count(*) from public."Warung") as warungs,
  (select count(*) from public."User") as users,
  (select count(*) from public."OutletParStock") as par_stock;
```

Expected: semua > 0 (tidak berubah).

- [ ] **Step 6: Deploy**

```bash
cd frontend
npm run build
npx wrangler deploy --config wrangler.toml
```

Expected: deploy sukses ke https://operasional.atonejaya.workers.dev.

