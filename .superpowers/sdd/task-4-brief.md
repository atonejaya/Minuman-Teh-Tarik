### Task 4: VisitWizard â€” input Stok Awal Titipan & perhitungan baseline

**Files:**
- Modify: `frontend/src/modules/visits/services/VisitApiService.js`
- Modify: `frontend/src/modules/visits/pages/VisitWizard.jsx`
- Modify: `frontend/src/styles/components.css` (grid `.stock-row` 4 kolom saat ada input Stok Awal)

**Interfaces:**
- Consumes: `get_warung_baselines` RPC (Task 1).
- Produces: state `stockRows` tiap baris kini memiliki `baseline_set`, `opening`; `handleSaveStock` mengirim `opening_qty`; `totalTagihan` memakai baseline.

- [ ] **Step 1: Tambah method di VisitApiService.js**

Tambahkan di object `VisitApiService` (setelah `getPlan`):

```js
  getWarungBaselines(warungId) {
    return supabase.rpc('get_warung_baselines', { p_warung_id: warungId });
  },
```

- [ ] **Step 2: Ubah `loadStock` di VisitWizard.jsx**

Ganti fungsi `loadStock` (mulai `const loadStock = async (targetWarungId) => {`) dengan:

```js
  const loadStock = async (targetWarungId) => {
    const [parRes, baselineRes] = await Promise.all([
      supabase
        .from('OutletParStock')
        .select('id, par_qty, product_id, product:Product(id, code, name, selling_price)')
        .eq('warung_id', targetWarungId)
        .eq('is_active', true)
        .order('id'),
      VisitApiService.getWarungBaselines(targetWarungId),
    ]);
    if (parRes.error) throw parRes.error;
    if (baselineRes.error) throw baselineRes.error;
    const baselineMap = new Map(
      (baselineRes.data || []).map((b) => [b.product_id, { baseline_set: b.baseline_set, opening_stock: Number(b.opening_stock || 0) }])
    );
    const rows = (parRes.data || []).map((row) => {
      const b = baselineMap.get(row.product_id) || { baseline_set: false, opening_stock: 0 };
      return {
        product_id: row.product_id,
        code: row.product?.code || '',
        name: row.product?.name || 'Produk',
        par_qty: Number(row.par_qty || 0),
        selling_price: Number(row.product?.selling_price || 0),
        baseline_set: b.baseline_set,
        opening: b.baseline_set ? b.opening_stock : Number(row.par_qty || 0),
        physical: Number(row.par_qty || 0),
        expired: 0,
      };
    });
    setStockRows(rows);
    return rows;
  };
```

- [ ] **Step 3: Ubah `totalTagihan`**

Ganti `useMemo` `totalTagihan` dengan:

```js
  const totalTagihan = useMemo(
    () =>
      stockRows.reduce((sum, r) => {
        const base = Number(r.opening || 0);
        const sold = Math.max(base - Number(r.physical || 0) - Number(r.expired || 0), 0);
        return sum + sold * r.selling_price;
      }, 0),
    [stockRows]
  );
```

- [ ] **Step 4: Ubah `handleSaveStock` items**

Ganti pembuatan `items` dengan:

```js
      const items = stockRows.map((r) => ({
        product_id: r.product_id,
        physical_qty: Number(r.physical || 0),
        expired_qty: Number(r.expired || 0),
        opening_qty: r.baseline_set ? undefined : Number(r.opening || 0),
      }));
```

- [ ] **Step 5: Ubah header tabel stok**

Ganti blok header (`{stockRows.length > 0 && (` sampai penutup) dengan:

```js
          {stockRows.length > 0 && (
            <div className={`stock-row stock-row-header ${!stockRows[0].baseline_set ? 'has-opening' : ''}`}>
              <div className="stock-row-info">
                <span>Produk</span>
              </div>
              {!stockRows[0].baseline_set && <span className="stock-col-label">Stok Awal</span>}
              <span className="stock-col-label">Sisa</span>
              <span className="stock-col-label">Rusak</span>
            </div>
          )}
```

- [ ] **Step 5b: Tambah CSS variasi grid 4 kolom**

Di `frontend/src/styles/components.css`, di dekat rule `.stock-row` (baris Â±325), tambahkan:

```css
.stock-row.has-opening { grid-template-columns: 1fr 72px 72px 72px; }
```

Catatan: `.stock-row` default tetap `1fr 72px 72px` (3 kolom) untuk warung yang sudah baseline; warung yang belum baseline memakai 4 kolom via `.has-opening`.

- [ ] **Step 6: Ubah render baris stok**

Ganti blok `{stockRows.map((row, idx) => { ... })}` dengan:

```js
          {stockRows.map((row, idx) => {
            const base = Number(row.opening || 0);
            const sold = Math.max(base - Number(row.physical || 0) - Number(row.expired || 0), 0);
            return (
              <div className={`stock-row ${!row.baseline_set ? 'has-opening' : ''}`} key={row.product_id}>
                <div className="stock-row-info">
                  <p>{row.name}</p>
                  <span>
                    {row.baseline_set ? `Stok awal ${base}` : 'Kunjungan pertama (baseline)'} Â· {formatRupiah(row.selling_price)} Â· Terjual {sold}
                  </span>
                </div>
                {!row.baseline_set && (
                  <input
                    type="number"
                    min="0"
                    value={row.opening}
                    onChange={(e) =>
                      setStockRows((prev) => prev.map((r, i) => (i === idx ? { ...r, opening: e.target.value } : r)))
                    }
                    placeholder="0"
                    aria-label={`Stok awal titipan ${row.name}`}
                  />
                )}
                <input
                  type="number"
                  min="0"
                  value={row.physical}
                  onChange={(e) =>
                    setStockRows((prev) => prev.map((r, i) => (i === idx ? { ...r, physical: e.target.value } : r)))
                  }
                  placeholder="0"
                  aria-label={`Sisa stok ${row.name}`}
                />
                <input
                  type="number"
                  min="0"
                  value={row.expired}
                  onChange={(e) =>
                    setStockRows((prev) => prev.map((r, i) => (i === idx ? { ...r, expired: e.target.value } : r)))
                  }
                  placeholder="0"
                  aria-label={`Rusak/kadaluarsa ${row.name}`}
                />
              </div>
            );
          })}
```

- [ ] **Step 7: Verifikasi build**

Run (workdir `frontend/`): `npm run build`
Expected: `âœ“ built in ...` tanpa error.

- [ ] **Step 8: Verifikasi lint**

Run (workdir `frontend/`): `npx oxlint src/modules/visits/pages/VisitWizard.jsx src/modules/visits/services/VisitApiService.js`
Expected: tidak ada error.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/modules/visits/services/VisitApiService.js frontend/src/modules/visits/pages/VisitWizard.jsx
git commit -m "feat(stok): VisitWizard input stok awal titipan & hitung baseline"
```

---


