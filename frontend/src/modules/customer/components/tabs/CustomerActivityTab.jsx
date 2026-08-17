import React, { useEffect, useState } from 'react';
import { supabase } from '../../../../utils/supabase';
import { formatDate, formatTime } from '../../../../utils/format';

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

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '12px', fontSize: '14px' }}>Memuat riwayat kunjungan...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', backgroundColor: 'rgba(var(--danger-rgb, 220,53,69), 0.08)', borderRadius: '8px', margin: '0', fontSize: '14px', color: 'var(--danger)' }}>
        {error}
      </div>
    );
  }

  if (visits.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}> </div>
        <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>Belum Ada Kunjungan</h4>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
          Outlet ini belum pernah dikunjungi oleh sales.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Riwayat Kunjungan</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Tanggal</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Kode</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Jam Masuk</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Jam Keluar</th>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {visits.map((v) => (
              <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px' }}>{formatDate(v.visit_date)}</td>
                <td style={{ padding: '12px', fontWeight: '600' }}>{v.code}</td>
                <td style={{ padding: '12px' }}>{formatTime(v.check_in_time)}</td>
                <td style={{ padding: '12px' }}>{formatTime(v.check_out_time)}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: v.status === 'COMPLETED' ? 'rgba(var(--success-rgb, 40,167,69), 0.1)' : 'rgba(var(--warning-rgb, 255,193,7), 0.1)',
                    color: v.status === 'COMPLETED' ? 'var(--success)' : 'var(--warning)',
                  }}>
                    {VISIT_STATUS_LABELS[v.status] || v.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CustomerActivityTab;
