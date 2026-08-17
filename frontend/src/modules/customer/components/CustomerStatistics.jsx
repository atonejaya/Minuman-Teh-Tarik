import React from 'react';

const CustomerStatistics = ({ data }) => {
  if (!data) return null;

  return (
    <div>
      <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Ringkasan Keuangan</h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
        <StatCard label="Sisa Piutang" value={`Rp ${Number(data.outstanding || 0).toLocaleString('id-ID')}`} color="var(--danger)" highlight />
        <StatCard label="Nilai Kumulatif" value={`Rp ${Number(data.lifetime_value || 0).toLocaleString('id-ID')}`} color="var(--primary)" />
        <StatCard label="Total Faktur" value={String(data.total_invoice || 0)} />
        <StatCard label="Total Pembayaran" value={`Rp ${Number(data.total_payment || 0).toLocaleString('id-ID')}`} />
        <StatCard label="Total Retur" value={`Rp ${Number(data.total_return || 0).toLocaleString('id-ID')}`} />
        <StatCard label="Rata-rata Faktur" value={`Rp ${Number(data.average_invoice || 0).toLocaleString('id-ID')}`} />
      </div>
    </div>
  );
};

const StatCard = ({ label, value, color, highlight }) => (
  <div style={{
    backgroundColor: highlight ? 'rgba(var(--danger-rgb, 220,53,69), 0.05)' : 'var(--surface)',
    borderRadius: '10px',
    padding: '14px 16px',
    border: `1px solid ${highlight ? 'rgba(var(--danger-rgb, 220,53,69), 0.15)' : 'var(--border)'}`,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  }}>
    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
    <span style={{ fontSize: '18px', color: color || 'var(--text-main)', fontWeight: '700' }}>{value}</span>
  </div>
);

export default CustomerStatistics;
