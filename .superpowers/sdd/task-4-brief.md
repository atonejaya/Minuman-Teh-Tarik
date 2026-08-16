### Task 4: Halaman Biaya Operasional (`/operational-cost`)

**Files:**
- Create: `frontend/src/modules/payroll/pages/OperationalCostPage.jsx`
- Modify: `frontend/src/App.jsx` (route `operational-cost`)

**Interfaces:**
- Consumes: `PayrollApiService.getSummary(month)`, `toMonthKey`, `formatRupiah`, `useToast`.
- Produces: Komponen default `OperationalCostPage` (tanpa props) dirender pada route `operational-cost`.

- [ ] **Step 1: Tulis halaman Biaya Operasional**

Buat `frontend/src/modules/payroll/pages/OperationalCostPage.jsx`:

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import PayrollApiService from '../services/PayrollApiService';
import { toMonthKey, sumBy } from '../utils/payrollUtils';
import { formatRupiah } from '../../../utils/format.js';
import { useToast } from '../../../components/toast/ToastContext';

const CELL = { padding: '10px 12px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };
const TH = { ...CELL, fontSize: '13px', color: 'var(--text-muted)' };
const NUM = { ...CELL, textAlign: 'right' };

const OperationalCostPage = () => {
  const [month, setMonth] = useState(toMonthKey(new Date()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!month) return;
    setLoading(true);
    try {
      const data = await PayrollApiService.getSummary(month);
      setRows(data || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat data biaya operasional');
    } finally {
      setLoading(false);
    }
  }, [month, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const totalUangOp = sumBy(rows, 'uang_operasional');

  return (
    <div>
      <h2 style={{ marginBottom: '16px' }}>Biaya Operasional</h2>

      <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <label style={{ fontSize: '14px', color: 'var(--text-muted)' }}>Bulan</label>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--surface)',
            color: 'var(--text-main)',
            fontSize: '14px',
          }}
        />
      </div>

      <div className="card-custom" style={{ overflowX: 'auto' }}>
        {loading && <p className="empty-hint">Memuat data biaya operasional...</p>}
        {!loading && rows.length === 0 && <p className="empty-hint">Tidak ada data sales.</p>}
        {!loading && rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--background)' }}>
              <tr>
                <th style={TH}>Sales</th>
                <th style={NUM}>Hari Aktif</th>
                <th style={NUM}>Uang Operasional (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.sales_id}>
                  <td style={{ ...CELL, fontWeight: '600' }}>{r.sales_name}</td>
                  <td style={NUM}>{Number(r.hari_aktif || 0).toLocaleString('id-ID')}</td>
                  <td style={NUM}>{formatRupiah(r.uang_operasional)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...CELL, fontWeight: '700' }}>Total</td>
                <td style={CELL}></td>
                <td style={{ ...NUM, fontWeight: '700', color: 'var(--primary)' }}>{formatRupiah(totalUangOp)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default OperationalCostPage;
```

- [ ] **Step 2: Daftarkan route**

Di `frontend/src/App.jsx`:
- Tambah import lazy setelah `const PayrollPage = lazy(...)` (baris yang ditambahkan Task 3):

```jsx
const OperationalCostPage = lazy(() => import('./modules/payroll/pages/OperationalCostPage.jsx'));
```

- Ganti baris 163 (`<Route path="operational-cost" element={<ComingSoon title="Biaya Operasional" />} />`):

```jsx
              <Route path="operational-cost" element={<OperationalCostPage />} />
```

- [ ] **Step 3: Lint + build**

Run (dari `frontend/`): `npm run lint; if ($?) { npm run build }`
Expected: lint 0 error baru; build sukses.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/modules/payroll/pages/OperationalCostPage.jsx frontend/src/App.jsx
git commit -m "feat(payroll): halaman Biaya Operasional (ringkasan uang operasional per sales)"
```

---

