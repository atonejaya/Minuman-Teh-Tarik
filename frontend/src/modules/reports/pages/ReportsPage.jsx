import React, { useCallback, useEffect, useState } from 'react';
import { Download, Filter } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement,
  Tooltip, Legend, Title,
} from 'chart.js';
import { Bar, Pie } from 'react-chartjs-2';
import * as XLSX from 'xlsx';
import { formatRupiah, formatDate } from '../../../utils/format.js';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, PointElement, LineElement, ArcElement, Tooltip, Legend, Title
);

const REPORT_TYPES = [
  { value: 'sales', label: 'Laporan Penjualan (Faktur)' },
  { value: 'product', label: 'Laporan Produk Terjual' },
  { value: 'damaged', label: 'Laporan Barang Pecah / Expired' },
  { value: 'piutang', label: 'Laporan Piutang Warung' },
];

const CELL = { padding: '10px 12px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };
const TH = { ...CELL, fontSize: '13px', color: 'var(--text-muted)' };

const ReportsPage = () => {
  const defaultFrom = useTodayMinusDays(6);
  const today = new Date().toISOString().slice(0, 10);
  const [reportType, setReportType] = useState('sales');
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [toDate, setToDate] = useState(today);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let rows = [];
      if (reportType === 'sales') {
        const { data: d, error: e } = await supabase
          .from('SalesTransaction')
          .select('id, code, created_at, grand_total, payment_status, customer_name, warung:Warung(name), salesman:User(name)')
          .gte('created_at', `${fromDate}T00:00:00`)
          .lte('created_at', `${toDate}T23:59:59`)
          .neq('status', 'CANCELLED')
          .order('created_at', { ascending: true });
        if (e) throw e;
        rows = d || [];
      } else if (reportType === 'product') {
        const { data: d, error: e } = await supabase
          .from('SalesTransactionItem')
          .select('product_id, qty, selling_price, product:Product(name), sales_transaction:SalesTransaction!inner(created_at, status)')
          .gte('sales_transaction.created_at', `${fromDate}T00:00:00`)
          .lte('sales_transaction.created_at', `${toDate}T23:59:59`)
          .eq('sales_transaction.status', 'CONFIRMED');
        if (e) throw e;
        const agg = {};
        for (const it of d || []) {
          const key = String(it.product_id);
          if (!agg[key]) agg[key] = { product_id: it.product_id, name: it.product?.name || '-', qty: 0, revenue: 0 };
          agg[key].qty += Number(it.qty || 0);
          agg[key].revenue += Number(it.selling_price || 0) * Number(it.qty || 0);
        }
        rows = Object.values(agg).sort((a, b) => b.revenue - a.revenue);
      } else if (reportType === 'damaged') {
        const { data: d, error: e } = await supabase
          .from('SalesReturnItem')
          .select('product_id, qty, reason, condition, item_price, product:Product(name), sales_return:SalesReturn(return_date)')
          .or('reason.eq.EXPIRED,reason.eq.DAMAGED,reason.eq.LEAKED,condition.eq.DAMAGED')
          .gte('sales_return.return_date', fromDate)
          .lte('sales_return.return_date', toDate);
        if (e) throw e;
        const agg = {};
        for (const it of d || []) {
          const key = String(it.product_id);
          if (!agg[key]) agg[key] = { product_id: it.product_id, name: it.product?.name || '-', qty: 0, value: 0 };
          agg[key].qty += Number(it.qty || 0);
          agg[key].value += Number(it.item_price || 0) * Number(it.qty || 0);
        }
        rows = Object.values(agg).sort((a, b) => b.qty - a.qty);
      } else {
        const { data: d, error: e } = await supabase
          .from('AccountsReceivableProjection')
          .select('id, invoice_number, customer_name, invoice_amount, paid_amount, outstanding_amount, due_date, status')
          .gt('outstanding_amount', 0)
          .order('due_date', { ascending: true });
        if (e) throw e;
        rows = d || [];
      }
      setData(rows);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [reportType, fromDate, toDate]);

  useEffect(() => {
    load();
  }, [load]);

  const totalAmount = data.reduce((s, r) => s + Number(r.grand_total || r.revenue || r.value || r.outstanding_amount || 0), 0);

  const dailyTotals = useDailyTotals(reportType === 'sales' ? data : []);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan');
    XLSX.writeFile(wb, `laporan-${reportType}-${fromDate}-${toDate}.xlsx`);
  };

  return (
    <div>
      <h2 style={{ marginBottom: '16px' }}>Laporan</h2>

      <div className="card-custom" style={{ marginBottom: '24px', padding: '20px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '12px', alignItems: 'end' }}>
          <div>
            <label className="field-label">Jenis Laporan</label>
            <select className="wizard-input" value={reportType} onChange={(e) => setReportType(e.target.value)}>
              {REPORT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label">Dari Tanggal</label>
            <input className="wizard-input" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </div>
          <div>
            <label className="field-label">Sampai Tanggal</label>
            <input className="wizard-input" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </div>
          <button className="btn-primary" onClick={load}>
            <Filter size={16} /> Filter
          </button>
        </div>
      </div>

      {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {dailyTotals.labels.length > 1 && (
        <div className="card-custom" style={{ marginBottom: '24px' }}>
          <h5 style={{ marginBottom: '12px' }}>Penjualan Harian</h5>
          <div style={{ maxWidth: '100%', height: '260px' }}>
            <Bar
              data={{
                labels: dailyTotals.labels,
                datasets: [{
                  label: 'Omzet',
                  data: dailyTotals.values,
                  backgroundColor: 'rgba(245, 116, 32, 0.7)',
                  borderRadius: 6,
                }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { display: false } } }}
            />
          </div>
        </div>
      )}

      {reportType === 'product' && data.length > 0 && (
        <div className="card-custom" style={{ marginBottom: '24px' }}>
          <h5 style={{ marginBottom: '12px' }}>Top Produk</h5>
          <div style={{ maxWidth: '320px', height: '240px', margin: '0 auto' }}>
            <Pie
              data={{
                labels: data.slice(0, 6).map((r) => r.name),
                datasets: [{ data: data.slice(0, 6).map((r) => r.revenue), backgroundColor: ['#f57420', '#31506e', '#4caf50', '#ffc107', '#9c27b0', '#00bcd4'] }],
              }}
              options={{ maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }}
            />
          </div>
        </div>
      )}

      <div className="card-custom">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h5 style={{ margin: 0 }}>
            {REPORT_TYPES.find((t) => t.value === reportType)?.label} ({formatDate(fromDate)} - {formatDate(toDate)})
          </h5>
          <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '13px' }} onClick={exportExcel} disabled={data.length === 0}>
            <Download size={14} /> Ekspor Excel
          </button>
        </div>

        {loading && <p className="empty-hint">Memuat laporan...</p>}
        {!loading && data.length === 0 && <p className="empty-hint">Tidak ada data pada rentang tanggal ini.</p>}
        {!loading && data.length > 0 && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--background)' }}>
                <tr>
                  {reportType === 'sales' && (
                    <>
                      <th style={TH}>Tanggal</th><th style={TH}>Faktur</th><th style={TH}>Warung</th><th style={TH}>Sales</th><th style={TH}>Status</th><th style={TH}>Total</th>
                    </>
                  )}
                  {reportType === 'product' && (
                    <>
                      <th style={TH}>Produk</th><th style={TH}>Qty Terjual</th><th style={TH}>Omzet</th>
                    </>
                  )}
                  {reportType === 'damaged' && (
                    <>
                      <th style={TH}>Produk</th><th style={TH}>Qty Rusak / Expired</th><th style={TH}>Nilai</th>
                    </>
                  )}
                  {reportType === 'piutang' && (
                    <>
                      <th style={TH}>Faktur</th><th style={TH}>Warung</th><th style={TH}>Tagihan</th><th style={TH}>Dibayar</th><th style={TH}>Sisa</th><th style={TH}>Jatuh Tempo</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {data.map((r, idx) => (
                  <tr key={r.id || r.product_id || idx}>
                    {reportType === 'sales' && (
                      <>
                        <td style={CELL}>{new Date(r.created_at).toLocaleString('id-ID')}</td>
                        <td style={{ ...CELL, fontWeight: '500' }}>{r.code}</td>
                        <td style={CELL}>{r.customer_name || r.warung?.name || '-'}</td>
                        <td style={CELL}>{r.salesman?.name || '-'}</td>
                        <td style={CELL}>{r.payment_status || '-'}</td>
                        <td style={{ ...CELL, fontWeight: '600' }}>{formatRupiah(r.grand_total)}</td>
                      </>
                    )}
                    {reportType === 'product' && (
                      <>
                        <td style={CELL}>{r.name}</td>
                        <td style={CELL}>{r.qty}</td>
                        <td style={{ ...CELL, fontWeight: '600' }}>{formatRupiah(r.revenue)}</td>
                      </>
                    )}
                    {reportType === 'damaged' && (
                      <>
                        <td style={CELL}>{r.name}</td>
                        <td style={CELL}>{r.qty}</td>
                        <td style={{ ...CELL, fontWeight: '600' }}>{formatRupiah(r.value)}</td>
                      </>
                    )}
                    {reportType === 'piutang' && (
                      <>
                        <td style={{ ...CELL, fontWeight: '500' }}>{r.invoice_number}</td>
                        <td style={CELL}>{r.customer_name}</td>
                        <td style={CELL}>{formatRupiah(r.invoice_amount)}</td>
                        <td style={CELL}>{formatRupiah(r.paid_amount)}</td>
                        <td style={{ ...CELL, fontWeight: '600' }}>{formatRupiah(r.outstanding_amount)}</td>
                        <td style={CELL}>{formatDate(r.due_date)}</td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
              {reportType !== 'piutang' && (
                <tfoot>
                  <tr>
                    <td colSpan={reportType === 'sales' ? 5 : 2} style={{ ...CELL, textAlign: 'right', fontWeight: '700' }}>TOTAL</td>
                    <td style={{ ...CELL, fontWeight: '700', color: 'var(--primary)' }}>{formatRupiah(totalAmount)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const useTodayMinusDays = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
};

const useDailyTotals = (rows) => {
  const map = {};
  for (const r of rows) {
    const key = new Date(r.created_at).toISOString().slice(0, 10);
    map[key] = (map[key] || 0) + Number(r.grand_total || 0);
  }
  const labels = Object.keys(map).sort();
  return { labels, values: labels.map((l) => map[l]) };
};

export default ReportsPage;
