import React, { useCallback, useEffect, useState } from 'react';
import {
  Coins, Download, Loader2, RefreshCw, Users, CalendarDays, TrendingUp,
} from 'lucide-react';
import PayrollApiService from '../services/PayrollApiService';
import { formatRupiah } from '../../../utils/format.js';
import * as XLSX from 'xlsx';

const MONTHS = [
  'Januari','Februari','Maret','April','Mei','Juni',
  'Juli','Agustus','September','Oktober','November','Desember',
];

const now = new Date();

const TH = {
  padding: '10px 14px',
  fontSize: '13px',
  color: 'var(--text-muted)',
  borderBottom: '1px solid var(--border)',
  textAlign: 'left',
  fontWeight: '600',
  whiteSpace: 'nowrap',
};
const TD = {
  padding: '10px 14px',
  fontSize: '14px',
  borderBottom: '1px solid var(--border)',
  verticalAlign: 'middle',
};
const TD_NUM = { ...TD, textAlign: 'right', fontVariantNumeric: 'tabular-nums' };

const PayrollPage = () => {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [params, setParams] = useState({ commissionPerCup: 0, fuelAllowance: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await PayrollApiService.getPayrollSummary(year, month);
      setRows(result.rows);
      setParams(result.params);
    } catch (err) {
      setError(err.message || 'Gagal memuat data payroll');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const totalKomisi = rows.reduce((s, r) => s + r.komisi, 0);
  const totalBensin = rows.reduce((s, r) => s + r.bensin, 0);
  const totalGaji = rows.reduce((s, r) => s + r.total, 0);
  const totalCup = rows.reduce((s, r) => s + r.total_cup, 0);
  const totalHari = rows.reduce((s, r) => s + r.hari_kerja, 0);

  const handleExport = () => {
    const exportData = rows.map((r) => ({
      'Nama Sales': r.sales_name,
      'Hari Kerja': r.hari_kerja,
      'Cup Terjual': r.total_cup,
      'Komisi (Rp)': r.komisi,
      'Uang Bensin (Rp)': r.bensin,
      'Total Gaji (Rp)': r.total,
    }));
    exportData.push({
      'Nama Sales': 'TOTAL',
      'Hari Kerja': totalHari,
      'Cup Terjual': totalCup,
      'Komisi (Rp)': totalKomisi,
      'Uang Bensin (Rp)': totalBensin,
      'Total Gaji (Rp)': totalGaji,
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `Payroll_${MONTHS[month - 1]}_${year}.xlsx`);
  };

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) years.push(y);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Rekap Gaji Sales</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '14px' }}>
            Kalkulasi otomatis dari data transaksi & kunjungan
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="wizard-input"
            style={{ width: 'auto', padding: '8px 10px' }}
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
          >
            {MONTHS.map((m, i) => (
              <option key={i} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            className="wizard-input"
            style={{ width: 'auto', padding: '8px 10px' }}
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            className="btn"
            style={{ padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={load}
            disabled={loading}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            onClick={handleExport}
            disabled={rows.length === 0}
          >
            <Download size={15} /> Export Excel
          </button>
        </div>
      </div>

      {/* Parameter info */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="card-custom" style={{ flex: '1 1 180px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <TrendingUp size={20} color="var(--primary)" />
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Komisi / Cup</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '16px' }}>{formatRupiah(params.commissionPerCup)}</p>
          </div>
        </div>
        <div className="card-custom" style={{ flex: '1 1 180px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CalendarDays size={20} color="var(--primary)" />
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Bensin / Hari</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '16px' }}>{formatRupiah(params.fuelAllowance)}</p>
          </div>
        </div>
        <div className="card-custom" style={{ flex: '1 1 180px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={20} color="var(--primary)" />
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Jumlah Sales</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '16px' }}>{rows.length} orang</p>
          </div>
        </div>
        <div className="card-custom" style={{ flex: '1 1 200px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '3px solid var(--primary)' }}>
          <Coins size={20} color="var(--primary)" />
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Total Gaji Bulan Ini</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: 'var(--primary)' }}>{formatRupiah(totalGaji)}</p>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

      {/* Table */}
      <div className="card-custom" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h5 style={{ margin: 0 }}>
            Rekap — {MONTHS[month - 1]} {year}
          </h5>
        </div>
        {loading ? (
          <div style={{ padding: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: 'var(--text-muted)' }}>
            <Loader2 size={20} className="spin" /> Menghitung rekap gaji...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Coins size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p>Tidak ada data kunjungan/transaksi untuk periode ini.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--background)' }}>
                <tr>
                  <th style={TH}>Nama Sales</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Hari Kerja</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Cup Terjual</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Komisi</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Uang Bensin</th>
                  <th style={{ ...TH, textAlign: 'right', color: 'var(--primary)' }}>Total Gaji</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.sales_id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                  >
                    <td style={{ ...TD, fontWeight: '600' }}>{r.sales_name}</td>
                    <td style={TD_NUM}>{r.hari_kerja} hari</td>
                    <td style={TD_NUM}>{r.total_cup.toLocaleString('id-ID')} cup</td>
                    <td style={TD_NUM}>{formatRupiah(r.komisi)}</td>
                    <td style={TD_NUM}>{formatRupiah(r.bensin)}</td>
                    <td style={{ ...TD_NUM, fontWeight: '700', color: 'var(--primary)' }}>
                      {formatRupiah(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: 'var(--background)', fontWeight: '700' }}>
                  <td style={{ ...TD, borderTop: '2px solid var(--border)' }}>Total</td>
                  <td style={{ ...TD_NUM, borderTop: '2px solid var(--border)' }}>{totalHari} hari</td>
                  <td style={{ ...TD_NUM, borderTop: '2px solid var(--border)' }}>{totalCup.toLocaleString('id-ID')} cup</td>
                  <td style={{ ...TD_NUM, borderTop: '2px solid var(--border)' }}>{formatRupiah(totalKomisi)}</td>
                  <td style={{ ...TD_NUM, borderTop: '2px solid var(--border)' }}>{formatRupiah(totalBensin)}</td>
                  <td style={{ ...TD_NUM, borderTop: '2px solid var(--border)', color: 'var(--primary)', fontSize: '16px' }}>
                    {formatRupiah(totalGaji)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="empty-hint" style={{ marginTop: '12px' }}>
        * Parameter komisi & bensin dapat diubah di menu <strong>Pengaturan → Penggajian</strong>.
        Hari kerja dihitung dari kunjungan berstatus <em>Selesai</em>.
      </p>
    </div>
  );
};

export default PayrollPage;
