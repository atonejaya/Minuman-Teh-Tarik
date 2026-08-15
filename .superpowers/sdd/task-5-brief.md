### Task 5: Dashboard owner â€” 3 KPI stok klik-able

**Files:**
- Modify: `frontend/src/modules/dashboard/components/OwnerDashboard.jsx`

**Interfaces:**
- Consumes: `supabase` tables `WarehouseStock`, `SalesStockProjection`, `OutletStockProjection`.
- Produces: `data.stokKendaraan`, `data.stokWarung`; KPI cards navigasi ke `/stok?tab=...`.

- [ ] **Step 1: Tambah fetch stok kendaraan & warung**

Di dalam `Promise.all`, setelah `warehouseRes` dan sebelum `last7Res`, tambahkan dua query:

```js
          supabase.from('SalesStockProjection').select('qty_available').limit(5000),
          supabase.from('OutletStockProjection').select('current_stock').limit(5000),
```

Ubah destructuring `[... warehouseRes, last7Res]` menjadi:

```js
          visitsRes,
          warehouseRes,
          salesStockRes,
          outletStockRes,
          last7Res,
        ] = await Promise.all([
```

- [ ] **Step 2: Hitung & set state**

Di `setData({ ... })`, tambahkan:

```js
          stokKendaraan: sum(salesStockRes.data, 'qty_available'),
          stokWarung: sum(outletStockRes.data, 'current_stock'),
```

- [ ] **Step 3: Tambah KPI cards + navigasi (BrowserRouter)**

Aplikasi memakai `BrowserRouter` (lihat `frontend/src/main.jsx`) â†’ TIDAK boleh pakai hash link. Gunakan `useNavigate` dari `react-router-dom`. Tambahkan import di bagian atas `OwnerDashboard.jsx`:

```js
import { useNavigate } from 'react-router-dom';
```

dan di dalam komponen (setelah `const [data, setData] = useState(null);`):

```js
  const navigate = useNavigate();
```

Lalu ganti blok grid KPI (baris `KpiCard ... Stok Gudang` dan `KpiCard ... Visit Hari Ini`) dengan:

```jsx
        <KpiCard label="Stok Gudang" value={`${data.stokGudang.toLocaleString('id-ID')} cup`} color="var(--secondary)" link={<a href="/stok?tab=gudang" onClick={(e) => { e.preventDefault(); navigate('/stok?tab=gudang'); }}>Lihat</a>} />
        <KpiCard label="Stok Kendaraan" value={`${data.stokKendaraan.toLocaleString('id-ID')} cup`} color="var(--warning)" link={<a href="/stok?tab=kendaraan" onClick={(e) => { e.preventDefault(); navigate('/stok?tab=kendaraan'); }}>Lihat</a>} />
        <KpiCard label="Stok Warung" value={`${data.stokWarung.toLocaleString('id-ID')} cup`} color="var(--primary)" link={<a href="/stok?tab=warung" onClick={(e) => { e.preventDefault(); navigate('/stok?tab=warung'); }}>Lihat</a>} />
```

- [ ] **Step 5: Verifikasi build**

Run (workdir `frontend/`): `npm run build`
Expected: sukses tanpa error.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/dashboard/components/OwnerDashboard.jsx
git commit -m "feat(stok): KPI stok gudang/kendaraan/warung di dashboard owner"
```

---


