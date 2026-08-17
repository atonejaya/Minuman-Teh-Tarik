import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../utils/supabase';
import { formatDate, formatTime } from '../../../../utils/format';
import { tableCell, tableHeader } from '../../../../utils/tableStyles.js';

const CELL = tableCell;
const TH = tableHeader;
const VISIT_STATUS_LABELS = { COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan' };

const CustomerActivityTab = ({ customer }) => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data, error: err } = await supabase
          .from('SalesVisit')
          .select('id, code, visit_date, status, check_in_time, check_out_time')
          .eq('warung_id', customer.id)
          .order('visit_date', { ascending: false })
          .limit(20);
        if (err) throw err;
        if (mounted) setVisits(data || []);
      } catch (err) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [customer.id]);

  return (
    <div className="card-custom">
      <h5 style={{ margin: 0, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>Riwayat Kunjungan (Sales Visit)</h5>
      {loading && <p className="empty-hint">Memuat...</p>}
      {error && <div className="alert-error" style={{ margin: '16px' }}>{error}</div>}
      {!loading && !error && visits.length === 0 && (
        <p className="empty-hint">Belum ada kunjungan untuk outlet ini.</p>
      )}
      {!loading && visits.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ backgroundColor: 'var(--background)' }}>
              <tr>
                <th style={TH}>Tanggal</th>
                <th style={TH}>Kode</th>
                <th style={TH}>Jam Masuk</th>
                <th style={TH}>Jam Keluar</th>
                <th style={TH}>Status</th>
              </tr>
            </thead>
            <tbody>
              {visits.map((v) => (
                <tr key={v.id}>
                  <td style={CELL}>{formatDate(v.visit_date)}</td>
                  <td style={{ ...CELL, fontWeight: '500' }}>{v.code}</td>
                  <td style={CELL}>{formatTime(v.check_in_time)}</td>
                  <td style={CELL}>{formatTime(v.check_out_time)}</td>
                  <td style={CELL}>
                    <span className={`badge ${v.status === 'COMPLETED' ? 'badge-success' : 'badge-warning'}`}>{VISIT_STATUS_LABELS[v.status] || v.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CustomerActivityTab;
