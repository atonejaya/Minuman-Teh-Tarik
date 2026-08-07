import React from 'react';

const CustomerStatistics = ({ data }) => {
  if (!data) return null;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-lg)' }}>
      <StatCard label="Outstanding" value={`Rp ${Number(data.outstanding || 0).toLocaleString('id-ID')}`} color="var(--color-danger)" />
      <StatCard label="Lifetime Value" value={`Rp ${Number(data.lifetime_value || 0).toLocaleString('id-ID')}`} color="var(--color-primary)" />
      <StatCard label="Total Invoices" value={data.total_invoice || 0} />
      <StatCard label="Total Payment" value={`Rp ${Number(data.total_payment || 0).toLocaleString('id-ID')}`} />
      <StatCard label="Total Return" value={`Rp ${Number(data.total_return || 0).toLocaleString('id-ID')}`} />
      <StatCard label="Avg. Invoice" value={`Rp ${Number(data.average_invoice || 0).toLocaleString('id-ID')}`} />
    </div>
  );
};

const StatCard = ({ label, value, color = 'var(--color-text-primary)' }) => (
  <div style={{
    backgroundColor: 'var(--color-bg-primary)',
    borderRadius: 'var(--radius-lg)',
    padding: 'var(--spacing-md)',
    border: '1px solid var(--color-border)',
    boxShadow: 'var(--shadow-sm)',
    display: 'flex',
    flexDirection: 'column',
    gap: 'var(--spacing-xs)'
  }}>
    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)', fontWeight: '500' }}>{label}</span>
    <span style={{ fontSize: 'var(--text-xl)', color, fontWeight: '700' }}>{value}</span>
  </div>
);

export default CustomerStatistics;
