import React from 'react';
import CustomerStatusBadge from './CustomerStatusBadge';
import MiniMap from '../../../components/shared/MiniMap';

const CustomerSummary = ({ data }) => {
  if (!data) return null;

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-primary)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--spacing-lg)',
      border: '1px solid var(--color-border)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-md)' }}>
        <h3 style={{ margin: 0, color: 'var(--color-text-primary)', fontSize: 'var(--text-lg)', fontWeight: '600' }}>Ringkasan Pelanggan</h3>
        <CustomerStatusBadge status={data.status || 'ACTIVE'} />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
        <SummaryItem label="Kode Pelanggan" value={data.code} />
        <SummaryItem label="Nama Toko" value={data.name} />
        <SummaryItem label="Pemilik" value={data.owner_name} />
        <SummaryItem label="No. HP" value={data.phone} />
        <SummaryItem label="Sales" value={Array.isArray(data.User) ? data.User[0]?.name : data.User?.name || data.assignedSales?.name || '-'} />
        <SummaryItem label="Area" value={Array.isArray(data.Area) ? data.Area[0]?.name : data.Area?.name || data.area?.name || '-'} />
        <SummaryItem label="Rute" value={Array.isArray(data.Route) ? data.Route[0]?.name : data.Route?.name || data.route?.name || '-'} />
        <SummaryItem label="Limit Kredit" value={`Rp ${Number(data.credit_limit || 0).toLocaleString('id-ID')}`} />
        <SummaryItem label="Syarat Pembayaran" value={`${data.payment_term || 0} Hari`} />
      </div>

      {data.latitude && data.longitude && (
        <div style={{ marginTop: 'var(--spacing-md)' }}>
          <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '500', marginBottom: '8px' }}>Lokasi di Peta</p>
          <MiniMap latitude={data.latitude} longitude={data.longitude} label={data.name} />
        </div>
      )}
    </div>
  );
};

const SummaryItem = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '500' }}>{label}</span>
    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-primary)', fontWeight: '500' }}>{value || '-'}</span>
  </div>
);

export default CustomerSummary;
