import { useEffect, useState } from 'react';
import api from '../../../services/api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading KPI...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Operational Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Omzet Hari Ini</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>
            Rp {data?.omzet_hari_ini?.toLocaleString() || 0}
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Piutang</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--danger)', marginTop: '8px' }}>
            Rp {data?.total_piutang?.toLocaleString() || 0}
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Pembayaran</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)', marginTop: '8px' }}>
            Rp {data?.total_pembayaran?.toLocaleString() || 0}
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Outstanding Receivable</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--warning)', marginTop: '8px' }}>
            Rp {data?.outstanding_receivable?.toLocaleString() || 0}
          </div>
        </div>
      </div>
    </div>
  );
}
