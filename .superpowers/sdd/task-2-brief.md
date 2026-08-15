### Task 2: `visit_save_stock_count` â€” hitung penjualan dari baseline

**Files:**
- Modify: `supabase/migrations/202608140003_visit.sql` (fungsi `visit_save_stock_count`, mulai baris `declare` Â±158 sampai return Â±440)

**Interfaces:**
- Consumes: `get_warung_baselines` (tidak langsung); kolom `baseline_set`, `opening_stock`; item JSON `p_items[i]` kini boleh berisi `opening_qty`.
- Produces: perilaku baru â€” `terjual = greatest(baseline âˆ’ fisik âˆ’ rusak, 0)`; ledger `ADJUSTMENT` bila fisik > baseline; `current_stock` projection di-set ke `fisik` (sebelum refill); transaksi tetap dibuat pada kunjungan pertama bila terjual > 0.

- [ ] **Step 1: Ubah deklarasi variabel**

Pada blok `declare` fungsi `visit_save_stock_count`, tambahkan variabel di dekat deklarasi `v_sold`:

```sql
  v_sold      int;
  v_opening   int;
  v_adjust    int;
  v_baseline_set boolean;
```

- [ ] **Step 2: Ganti blok perhitungan sold (JANGAN sentuh blok `if v_sold > 0` / `if v_expired > 0`)**

Di dalam `for v_item in ... loop`, ganti HANYA bagian perhitungan stok â€” dari baris `v_par := coalesce(v_par, 0);` sampai `end if;` yang menutup perhitungan `v_sold` (sebelum baris `if v_sold > 0 then`). Blok pembuatan `SalesTransaction`/`SalesReturn` (`if v_sold > 0`, `if v_expired > 0`) TIDAK BOLEH diubah.

BLOK LAMA (yang harus diganti):

```sql
    v_par   := coalesce(v_par, 0);
    v_price := coalesce(v_price, 0);

    select coalesce(current_stock, 0) into v_outlet_cur
    from public."OutletStockProjection"
    where warung_id = v_visit.warung_id and product_id = (v_item.j->>'product_id')::int;

    v_outlet_cur := coalesce(v_outlet_cur, 0);

    v_sold := 0;
    if (v_physical + v_expired) < v_par then
      v_sold := v_par - v_physical - v_expired;
    end if;
```

BLOK BARU:

```sql
    v_par   := coalesce(v_par, 0);
    v_price := coalesce(v_price, 0);

    select coalesce(op.baseline_set, false), coalesce(op.opening_stock, 0)
      into v_baseline_set, v_opening
    from public."OutletStockProjection" op
    where op.warung_id = v_visit.warung_id and op.product_id = (v_item.j->>'product_id')::int;

    v_baseline_set := coalesce(v_baseline_set, false);
    v_opening      := coalesce(v_opening, 0);

    if not v_baseline_set then
      v_opening := coalesce((v_item.j->>'opening_qty')::int, v_physical);
      v_opening := greatest(v_opening, 0);
    end if;

    if v_expired > v_opening then
      raise exception 'Retur melebihi stok awal titipan % (stok awal %, rusak %)',
        (select name from public."Product" where id = (v_item.j->>'product_id')::int),
        v_opening, v_expired;
    end if;

    v_outlet_cur := v_opening;

    v_sold := 0;
    if v_physical <= v_opening then
      v_sold := greatest(v_opening - v_physical - v_expired, 0);
    end if;

    v_adjust := greatest(v_physical - v_opening, 0);
    if v_adjust > 0 then
      insert into public."OutletStockLedger"
        (warung_id, product_id, movement_type, qty_before, qty_change, qty_after,
         reference_type, reference_id, visit_id, created_by, notes)
      values
        (v_visit.warung_id, (v_item.j->>'product_id')::int,
         'ADJUSTMENT'::public."OutletMovementType", v_opening, v_adjust, v_physical,
         'SalesVisit', v_visit.id, v_visit.id, v_user_id, 'Stok lebih dari baseline');
    end if;
```

Catatan:
- `v_par` tetap dipakai untuk insert `SalesTransactionItem` dan blok projection (PAR sebagai referensi); jangan dihapus.
- Semua blok setelah `end if;` ini (`if v_sold > 0 then` untuk transaksi, `if v_expired > 0 then` untuk retur) tetap memakai `v_outlet_cur`, `v_sold`, `v_expired` â€” tidak berubah.
- Cast `'ADJUSTMENT'::public."OutletMovementType"` aman karena nilai enum ditambahkan di Task 1.

- [ ] **Step 3: Update blok `if v_sold > 0 or v_expired > 0 then` (projection)**

Ganti blok insert/update `OutletStockProjection` (mulai `if v_sold > 0 or v_expired > 0 then` sampai `end if;` sebelum `end loop;`) dengan:

```sql
    if v_sold > 0 or v_expired > 0 or v_adjust > 0 or not v_baseline_set then
      begin
        insert into public."OutletStockProjection" (warung_id, product_id, current_stock, par_qty, opening_stock, total_refill, total_sales, total_return, calculated_sales, required_refill, average_daily_sales, sell_through, last_visit_id, last_count_at, version, updated_at, baseline_set)
        values (v_visit.warung_id, (v_item.j->>'product_id')::int, v_physical, v_par, v_opening, 0, v_sold, v_expired, v_sold, greatest(v_opening - v_physical, 0), 0, 0, v_visit.id, now(), 1, now(), true);
      exception
        when unique_violation then
          update public."OutletStockProjection"
             set current_stock = v_physical,
                 par_qty = v_par,
                 opening_stock = v_opening,
                 total_sales = total_sales + v_sold,
                 calculated_sales = calculated_sales + v_sold,
                 total_return = total_return + v_expired,
                 required_refill = greatest(v_opening - v_physical, 0),
                 last_visit_id = v_visit.id,
                 last_count_at = now(),
                 version = version + 1,
                 baseline_set = true,
                 updated_at = now()
           where warung_id = v_visit.warung_id
             and product_id = (v_item.j->>'product_id')::int;
      end;
    end if;
```

- [ ] **Step 4: Jalankan di SQL Editor**

User menjalankan ulang SELURUH file `202608140003_visit.sql` di Supabase SQL Editor. Diharapkan: `Success` tanpa error.

- [ ] **Step 5: Verifikasi sintaks fungsi**

Jalankan di SQL Editor:

```sql
select proname, pg_get_functiondef(oid) is not null as ok
from pg_proc where proname = 'visit_save_stock_count';
```

Expected: `visit_save_stock_count` / `true`.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/202608140003_visit.sql
git commit -m "feat(stok): visit_save_stock_count hitung penjualan dari baseline"
```

---


