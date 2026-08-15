### Task 6: Halaman `/stok` 3 tab (Gudang / Kendaraan / Warung)

**Files:**
- Create: `frontend/src/modules/stok/pages/StokDashboard.jsx`
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/styles/components.css`

**Interfaces:**
- Consumes: `supabase` tables `WarehouseStock`, `SalesStockProjection`, `OutletStockProjection` (owner-only RLS, aman untuk OWNER).
- Produces: route `/stok` owner-only; query param `?tab=`.

- [ ] **Step 1: Tulis halaman StokDashboard.jsx**

```jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';

const TABS = [
  { key: 'gudang', label: 'Gudang' },
  { key: 'kendaraan', label: 'Kendaraan' },
  { key: 'warung', label: 'Warung' },
];

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const fmtQty = (n) => `${(Number(n) || 0).toLocaleString('id-ID')} cup`;

const Section = ({ title, rows, qtyKey }) => {
  const total = rows.reduce((a, r) => a + (Number(r[qtyKey]) || 0), 0);
  return (
    <>
      <div className="stok-section-title">
        <strong>{title}</strong>
        <span className="stok-total">{fmtQty(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p style={{ padding: '16px', color: 'var(--text-muted)' }}>Tidak ada data.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--background)' }}>
            <tr>
              <th style={cell}>Produk</th>
              <th style={cell}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.group}-${r.product_id}`}>
                <td style={{ ...cell, fontWeight: '500' }}>
                  {r.group ? `${r.group} â€” ` : ''}{r.product?.name || '-'}
                </td>
                <td style={{ ...cell, fontWeight: '600' }}>{fmtQty(r[qtyKey])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

const StokDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'gudang';
  const [data, setData] = useState({ gudang: [], kendaraan: [], warung: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [gudang, kendaraan, warung] = await Promise.all([
          supabase
            .from('WarehouseStock')
            .select('*, product:Product(name), warehouse:Warehouse(name)')
            .limit(5000),
          supabase
            .from('SalesStockProjection')
            .select('*, product:Product(name), sales:User(name)')
            .limit(5000),
          supabase
            .from('OutletStockProjection')
            .select('*, product:Product(name), warung:Warung(name)')
            .limit(5000),
        ]);
        for (const res of [gudang, kendaraan, warung]) if (res.error) throw res.error;
        setData({
          gudang: (gudang.data || []).map((r) => ({ ...r, group: r.warehouse?.name })),
          kendaraan: (kendaraan.data || []).map((r) => ({ ...r, group: r.sales?.name })),
          warung: (warung.data || []).map((r) => ({ ...r, group: r.warung?.name })),
        });
      } catch (err) {
        setError(err.message || 'Gagal memuat stok');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="loading-screen">Memuat stok...</div>;
  if (error) return <div className="alert alert-danger m-3" role="alert">{error}</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '16px' }}>Pantauan Stok (cup)</h2>
      <div className="stok-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`stok-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setSearchParams({ tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="stok-panel">
        {tab === 'gudang' && <Section title="Stok Gudang Pusat" rows={data.gudang} qtyKey="qty_available" />}
        {tab === 'kendaraan' && <Section title="Stok Kendaraan Sales" rows={data.kendaraan} qtyKey="qty_available" />}
        {tab === 'warung' && <Section title="Stok Titipan Warung" rows={data.warung} qtyKey="current_stock" />}
      </div>
    </div>
  );
};

export default StokDashboard;
```

- [ ] **Step 2: Daftarkan route di App.jsx**

Tambahkan lazy import (dekat import lain):

```js
const StokDashboard = lazy(() => import('./modules/stok/pages/StokDashboard.jsx'));
```

Tambahkan route di blok Owner-only (di dekat `warehouse-stock`):

```jsx
              <Route path="stok" element={<StokDashboard />} />
```

- [ ] **Step 3: Tambah CSS**

Di `frontend/src/styles/components.css`, tambahkan:

```css
.stok-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.stok-tab { padding: 8px 16px; border: 1px solid var(--border); background: #fff; border-radius: 8px; cursor: pointer; font-weight: 600; }
.stok-tab.active { background: var(--primary); color: #fff; border-color: var(--primary); }
.stok-panel { background: #fff; border: 1px solid var(--border); border-radius: 12px; padding: 16px; overflow-x: auto; }
.stok-section-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.stok-total { background: var(--primary); color: #fff; padding: 4px 10px; border-radius: 999px; font-weight: 700; font-size: 13px; }
```

- [ ] **Step 4: Verifikasi build**

Run (workdir `frontend/`): `npm run build`
Expected: sukses.

- [ ] **Step 5: Verifikasi lint**

Run (workdir `frontend/`): `npx oxlint src/modules/stok/pages/StokDashboard.jsx`
Expected: tidak ada error.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/modules/stok/pages/StokDashboard.jsx frontend/src/App.jsx frontend/src/styles/components.css
git commit -m "feat(stok): halaman pantauan stok 3 tab untuk owner"
```

---


