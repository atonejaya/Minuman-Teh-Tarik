import React, { useCallback, useEffect, useState } from 'react';
import {
  Banknote, Download, Loader2, RefreshCw, Users, CalendarDays, ChevronDown, ChevronUp,
} from 'lucide-react';
import OperationalCostApiService from '../services/OperationalCostApiService';
import { formatRupiah, formatDate } from '../../../utils/format.js';
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

const OperationalCostPage = () => {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [rows, setRows] = useState([]);
  const [params, setParams] = useState({ dailyOpex: 10000 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [detail, setDetail] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setExpandedId(null);
    setDetail([]);
    try {
      const result = await OperationalCostApiService.getOpexSummary(year, month);
      setRows(result.rows);
      setParams(result.params);
    } catch (err) {
      setError(err.message || 'Gagal memuat data biaya operasional');
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => { load(); }, [load]);

  const handleExpand = async (salesId) => {
    if (expandedId === salesId) {
      setExpandedId(null);
      setDetail([]);
      return;
    }
    setExpandedId(salesId);
    setLoadingDetail(true);
    try {
      const data = await OperationalCostApiService.getDailyDetail(year, month, salesId);
      // unique per hari
      const seen = new Set();
      const unique = data.filter((v) => {
        if (seen.has(v.visit_date)) return false;
        seen.add(v.visit_date);
        return true;
      });
      setDetail(unique);
    } catch (err) {
      setDetail([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  const totalOpex = rows.reduce((s, r) => s + r.total_opex, 0);
  const totalHari = rows.reduce((s, r) => s + r.hari_kerja, 0);

  const handleExport = () => {
    const exportData = rows.map((r) => ({
      'Nama Sales': r.sales_name,
      'Hari Kerja': r.hari_kerja,
      'Modal Harian (Rp)': params.dailyOpex,
      'Total Biaya Operasional (Rp)': r.total_opex,
    }));
    exportData.push({
      'Nama Sales': 'TOTAL',
      'Hari Kerja': totalHari,
      'Modal Harian (Rp)': '-',
      'Total Biaya Operasional (Rp)': totalOpex,
    });
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Biaya Operasional');
    XLSX.writeFile(wb, `BiayaOperasional_${MONTHS[month - 1]}_${year}.xlsx`);
  };

  const years = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) years.push(y);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0 }}>Biaya Operasional</h2>
          <p className="text-muted" style={{ margin: '4px 0 0', fontSize: '14px' }}>
            Modal harian yang diberikan kepada sales sebelum berangkat
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

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="card-custom" style={{ flex: '1 1 180px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <CalendarDays size={20} color="var(--primary)" />
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Modal / Hari / Sales</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '16px' }}>{formatRupiah(params.dailyOpex)}</p>
          </div>
        </div>
        <div className="card-custom" style={{ flex: '1 1 180px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Users size={20} color="var(--primary)" />
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Total Hari Kerja</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '16px' }}>{totalHari} hari</p>
          </div>
        </div>
        <div className="card-custom" style={{ flex: '1 1 200px', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '3px solid var(--primary)' }}>
          <Banknote size={20} color="var(--primary)" />
          <div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>Total Biaya Operasional</p>
            <p style={{ margin: 0, fontWeight: '700', fontSize: '18px', color: 'var(--primary)' }}>{formatRupiah(totalOpex)}</p>
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
            <Loader2 size={20} className="spin" /> Menghitung biaya operasional...
          </div>
        ) : rows.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <Banknote size={32} style={{ opacity: 0.3, marginBottom: '8px' }} />
            <p>Tidak ada data kunjungan untuk periode ini.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead style={{ backgroundColor: 'var(--background)' }}>
                <tr>
                  <th style={TH}>Nama Sales</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Hari Kerja</th>
                  <th style={{ ...TH, textAlign: 'right' }}>Modal / Hari</th>
                  <th style={{ ...TH, textAlign: 'right', color: 'var(--primary)' }}>Total Biaya</th>
                  <th style={{ ...TH, textAlign: 'center' }}>Detail</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <React.Fragment key={r.sales_id}>
                    <tr
                      style={{ transition: 'background 0.15s', cursor: 'pointer' }}
                      onClick={() => handleExpand(r.sales_id)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--background)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = ''}
                    >
                      <td style={{ ...TD, fontWeight: '600' }}>{r.sales_name}</td>
                      <td style={TD_NUM}>{r.hari_kerja} hari</td>
                      <td style={TD_NUM}>{formatRupiah(params.dailyOpex)}</td>
                      <td style={{ ...TD_NUM, fontWeight: '700', color: 'var(--primary)' }}>
                        {formatRupiah(r.total_opex)}
                      </td>
                      <td style={{ ...TD, textAlign: 'center' }}>
                        <button
                          className="btn"
                          style={{ padding: '4px 10px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          onClick={(e) => { e.stopPropagation(); handleExpand(r.sales_id); }}
                        >
                          {expandedId === r.sales_id
                            ? <><ChevronUp size={13} /> Tutup</>
                            : <><ChevronDown size={13} /> Lihat</>
                          }
                        </button>
                      </td>
                    </tr>

                    {/* Detail harian */}
                    {expandedId === r.sales_id && (
                      <tr>
                        <td colSpan={5} style={{ padding: 0, backgroundColor: 'var(--background)' }}>
                          <div style={{ padding: '12px 24px 16px' }}>
                            <p style={{ margin: '0 0 8px', fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                              Hari Kerja — {r.sales_name}
                            </p>
                            {loadingDetail ? (
                              <p className="empty-hint"><Loader2 size={14} className="spin" /> Memuat...</p>
                            ) : detail.length === 0 ? (
                              <p className="empty-hint">Tidak ada data.</p>
                            ) : (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                {detail.map((d, idx) => (
                                  <div
                                    key={idx}
                                    style={{
                                      padding: '6px 14px',
                                      borderRadius: 'var(--radius-md)',
                                      border: '1px solid var(--border)',
                                      backgroundColor: 'var(--surface)',
                                      fontSize: '13px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                    }}
                                  >
                                    <CalendarDays size={13} color="var(--primary)" />
                                    {formatDate(d.visit_date)}
                                    <span style={{ color: 'var(--primary)', fontWeight: '600' }}>
                                      {formatRupiah(params.dailyOpex)}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ backgroundColor: 'var(--background)', fontWeight: '700' }}>
                  <td style={{ ...TD, borderTop: '2px solid var(--border)' }}>Total</td>
                  <td style={{ ...TD_NUM, borderTop: '2px solid var(--border)' }}>{totalHari} hari</td>
                  <td style={{ ...TD_NUM, borderTop: '2px solid var(--border)' }}>—</td>
                  <td style={{ ...TD_NUM, borderTop: '2px solid var(--border)', color: 'var(--primary)', fontSize: '16px' }}>
                    {formatRupiah(totalOpex)}
                  </td>
                  <td style={{ ...TD, borderTop: '2px solid var(--border)' }}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      <p className="empty-hint" style={{ marginTop: '12px' }}>
        * Nominal modal harian dapat diubah di menu <strong>Pengaturan → Penggajian</strong>.
        Hari kerja dihitung dari kunjungan berstatus <em>Selesai</em>.
      </p>
    </div>
  );
};

export default OperationalCostPage;
