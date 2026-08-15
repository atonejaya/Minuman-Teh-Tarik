### Task 3: `visit_check_out` â€” refill dari baseline, bukan PAR

**Files:**
- Modify: `supabase/migrations/202608140003_visit.sql` (fungsi `visit_check_out`, blok `if v_count_id is not null then ... end loop`)

**Interfaces:**
- Consumes: `OutletStockProjection.opening_stock` (baseline).
- Produces: `refill = greatest(baseline âˆ’ fisik, 0)`; ledger REFILL `qty_after = fisik + refill` (= baseline); blokir bila `refill > stok kendaraan` (sudah ada sejak sebelumnya).

- [ ] **Step 1: Ganti query loop stock count**

Ganti blok:

```sql
    for v_item in
      select i.product_id, i.physical_qty, coalesce(op.par_qty, 0) as par_qty
      from public."OutletStockCountItem" i
      left join public."OutletParStock" op
        on op.warung_id = v_visit.warung_id and op.product_id = i.product_id
      where i.stock_count_id = v_count_id
      order by i.id
    loop
      v_physical := coalesce(v_item.physical_qty, 0);
      v_par      := v_item.par_qty;
      v_refill   := greatest(v_par - v_physical, 0);
```

dengan:

```sql
    for v_item in
      select i.product_id, i.physical_qty, coalesce(op.opening_stock, 0) as baseline_qty
      from public."OutletStockCountItem" i
      left join public."OutletStockProjection" op
        on op.warung_id = v_visit.warung_id and op.product_id = i.product_id
      where i.stock_count_id = v_count_id
      order by i.id
    loop
      v_physical := coalesce(v_item.physical_qty, 0);
      v_par      := v_item.baseline_qty;
      v_refill   := greatest(v_par - v_physical, 0);
```

(variabel `v_par` dipakai ulang sebagai baseline; deklarasi tetap ada.)

- [ ] **Step 2: Jalankan di SQL Editor**

User menjalankan ulang SELURUH file `202608140003_visit.sql` di Supabase SQL Editor. Diharapkan: `Success`.

- [ ] **Step 3: Verifikasi**

```sql
select proname from pg_proc where proname = 'visit_check_out';
```

Expected: `visit_check_out`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/202608140003_visit.sql
git commit -m "feat(stok): visit_check_out refill dari baseline"
```

---


