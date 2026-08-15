### Task 7: Deploy & uji alur lengkap

**Files:**
- (tidak ada file baru)

**Interfaces:**
- Consumes: seluruh tugas sebelumnya.

- [ ] **Step 1: Build & deploy**

Run (workdir `frontend/`):

```bash
npm run build
npx wrangler deploy --config wrangler.toml
```

Expected: deploy sukses, URL `https://operasional.atonejaya.workers.dev`.

- [ ] **Step 2: Uji SQL alur baseline**

User menjalankan di SQL Editor (menggunakan akun test andi = SALES id 838):

```sql
-- pastikan baseline awal kosong utk warung test
select warung_id, product_id, baseline_set, opening_stock, current_stock
from public."OutletStockProjection" order by id;
```

Expected: `baseline_set` masih `false` untuk warung yang belum dikunjungi.

- [ ] **Step 3: Uji manual alur sales**

1. Login sales (andi), buka Kunjungan, mulai kunjungan warung test.
2. Layar hitung stok: muncul kolom **Stok Awal Titipan** + SISA + RUSAK (karena belum baseline).
3. Isi: Stok Awal = 50, Sisa = 40, Rusak = 2 â†’ Terjual tampil 8, Total Tagihan = 8 Ã— harga.
4. Simpan & Lanjut â†’ transaksi dibuat; bayar â†’ check-out.
5. Setelah check-out: `get_warung_baselines` mengembalikan `baseline_set=true`, `opening_stock=50`.
6. Kunjungan kedua warung yang sama: kolom **Stok Awal** hilang (diganti info "Stok awal 50"); isi Sisa = 45, Rusak = 0 â†’ Terjual 5.

Verifikasi DB setelah kunjungan kedua:

```sql
select warung_id, product_id, baseline_set, opening_stock, current_stock, total_sales, total_return
from public."OutletStockProjection" order by id;
```

Expected: `opening_stock` tetap 50 (baseline), `total_sales` bertambah, `current_stock` = sisa fisik terakhir (sebelum refill).

- [ ] **Step 4: Uji dashboard owner**

1. Login owner (user id 839).
2. Dashboard menampilkan 3 kartu stok (Gudang / Kendaraan / Warung) dalam cup.
3. Klik masing-masing kartu â†’ halaman `/stok?tab=...` menampilkan daftar produk.
4. Pastikan tab berpindah (Gudang/Kendaraan/Warung).

- [ ] **Step 5: Uji blokir refill > stok kendaraan**

1. Login sales, kunjungi warung yang baseline-nya > stok kendaraan yang tersisa.
2. Isi Sisa kecil sehingga refill besar.
3. Check-out â†’ muncul error `Stok kendaraan tidak cukup: <produk> (butuh X, tersedia Y)`, kunjungan tidak COMPLETED.

- [ ] **Step 6: Commit perubahan frontend terakhir (jika ada hasil lint fix)**

```bash
git add -A
git commit -m "feat(stok): deploy model stok baseline"
```

---


