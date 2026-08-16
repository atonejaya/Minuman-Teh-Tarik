### Task 3: Halaman Gajih (`/payroll`)

**Files:**
- Create: `frontend/src/modules/payroll/pages/PayrollPage.jsx`
- Modify: `frontend/src/App.jsx` (import lazy + route `payroll`)

**Interfaces:**
- Consumes: `PayrollApiService.getSummary(month)`, `PayrollApiService.getDetail(salesId, month)`, `toMonthKey`, `formatRupiah`, `useToast`.
- Produces: Komponen default `PayrollPage` (tanpa props) yang dirender pada route `payroll`.

- [ ] **Step 1: Tulis halaman Gajih**

Buat `frontend/src/modules/payroll/pages/PayrollPage.jsx`:

```jsx
import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, Loader2 } from 'lucide-react';
import PayrollApiService from '../services/PayrollApiService';
import { toMonthKey } from '../utils/payrollUtils';
import { formatRupiah, formatDate } from '../../../utils/format.js';
import { useToast } from '../../../components/toast/ToastContext';

const CELL = { padding: '10px 12px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };
const TH = { ...CELL, fontSize: '13px', color: 'var(--text-muted)' };
const NUM = { ...CELL, textAlign: 'right' };

const PayrollPage = () => {
  const [month, setMonth] = useState(toMonthKey(new Date()));
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openId, setOpenId] = useState(null);
  const [details, setDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!month) return;
    setLoading(true);
    setOpenId(null);
    setDetails({});
    try {
      const data = await PayrollApiService.getSummary(month);
      setRows(data || []);
    } catch (err) {
      toast.error(err.message || 'Gagal memuat data gaji');
    } finally {
      setLoading(false);
    }
  }, [month, toast]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleRow = async (salesId) => {
    if (openId === salesId) {
      setOpenId(null);
      return;
    }
    setOpenId(salesId);
    if (!details[salesId]) {
      setDetailLoading(true);
      try {
        const data = await PayrollApiService.getDetail(salesId, month);
        setDetails((prev) => ({ ...prev, [salesId]: data || [] }));
      } catch (err) {
        toast.error(err.message || 'Gagal memuat rincian');
        setOpenId(null);
      } finally {
        setDetailLoading(false);
      }
    }
  };

  const total = rows.reduce((s, r) => s + Number(r.total || 0), 0);

  return (
    <div>
      <h2 style={{ marginBottom: '16px' }}>Gajih</h2>

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
        {loading && <p className="empty-hint">Memuat data gaji...</p>}
        {!loading && rows.length === 0 && <p className="empty-hint">Tidak ada data sales.</p>}
        {!loading && rows.length > 0 && (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--background)' }}>
              <tr>
                <th style={TH}>Sales</th>
                <th style={NUM}>Cups Terjual</th>
                <th style={NUM}>Komisi (Rp)</th>
                <th style={NUM}>Hari Aktif</th>
                <th style={NUM}>Uang Operasional (Rp)</th>
                <th style={NUM}>Total Gaji (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <React.Fragment key={r.sales_id}>
                  <tr
                    style={{ cursor: 'pointer' }}
                    onClick={() => toggleRow(r.sales_id)}
                  >
                    <td style={{ ...CELL, fontWeight: '600' }}>
                      {r.sales_name} <ChevronDown size={14} style={{ transform: openId === r.sales_id ? 'rotate(180deg)' : 'none', verticalAlign: 'middle', color: 'var(--text-muted)' }} />
                    </td>
                    <td style={NUM}>{Number(r.cups || 0).toLocaleString('id-ID')}</td>
                    <td style={NUM}>{formatRupiah(r.komisi)}</td>
                    <td style={NUM}>{Number(r.hari_aktif || 0).toLocaleString('id-ID')}</td>
                    <td style={NUM}>{formatRupiah(r.uang_operasional)}</td>
                    <td style={{ ...NUM, fontWeight: '700', color: 'var(--primary)' }}>{formatRupiah(r.total)}</td>
                  </tr>
                  {openId === r.sales_id && (
                    <tr>
                      <td colSpan={6} style={{ padding: 0, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ padding: '12px 16px', backgroundColor: 'var(--background)' }}>
                          {detailLoading && <p className="empty-hint">Memuat rincian...</p>}
                          {!detailLoading && details[r.sales_id]?.length === 0 && (
                            <p className="empty-hint">Belum ada transaksi.</p>
                          )}
                          {!detailLoading && details[r.sales_id]?.length > 0 && (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                              <thead>
                                <tr>
                                  <th style={TH}>Tanggal</th>
                                  <th style={NUM}>Jumlah Transaksi</th>
                                  <th style={NUM}>Cups</th>
                                  <th style={NUM}>Komisi Hari (Rp)</th>
                                  <th style={NUM}>Uang Operasional Hari (Rp)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {details[r.sales_id].map((d) => (
                                  <tr key={d.tanggal}>
                                    <td style={CELL}>{formatDate(d.tanggal)}</td>
                                    <td style={NUM}>{Number(d.jumlah_transaksi || 0).toLocaleString('id-ID')}</td>
                                    <td style={NUM}>{Number(d.cups || 0).toLocaleString('id-ID')}</td>
                                    <td style={NUM}>{formatRupiah(d.komisi_hari)}</td>
                                    <td style={NUM}>{formatRupiah(d.uang_op_hari)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td style={{ ...CELL, fontWeight: '700' }}>Total</td>
                <td colSpan={4} style={CELL}></td>
                <td style={{ ...NUM, fontWeight: '700', color: 'var(--primary)' }}>{formatRupiah(total)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
```

- [ ] **Step 2: Daftarkan route**

Di `frontend/src/App.jsx`:
- Tambah import lazy setelah baris `const SettingsPage = lazy(...)` (baris 36):

```jsx
const PayrollPage = lazy(() => import('./modules/payroll/pages/PayrollPage.jsx'));
```

- Ganti baris 162 (`<Route path="payroll" element={<ComingSoon title="Gajih" />} />`):

```jsx
              <Route path="payroll" element={<PayrollPage />} />
```

- [ ] **Step 3: Lint + build**

Run (dari `frontend/`): `npm run lint; if ($?) { npm run build }`
Expected: lint 0 error baru; build sukses (`dist/` terbentuk).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/modules/payroll/pages/PayrollPage.jsx frontend/src/App.jsx
git commit -m "feat(payroll): halaman Gajih dengan ringkasan per sales + detail per tanggal"
```

---

