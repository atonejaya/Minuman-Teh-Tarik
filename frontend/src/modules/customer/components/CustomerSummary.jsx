import React from 'react';
import CustomerStatusBadge from './CustomerStatusBadge';
import MiniMap from '../../../components/shared/MiniMap';

const CustomerSummary = ({ data }) => {
  if (!data) return null;

  return (
    <div style={{
      backgroundColor: 'var(--surface)',
      borderRadius: 'var(--radius-lg)',
      padding: '20px',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, color: 'var(--text-main)', fontSize: '16px', fontWeight: '600' }}>Ringkasan Pelanggan</h3>
        <CustomerStatusBadge status={data.status || 'ACTIVE'} />
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
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

      {data.latitude && data.longitude && !(data.latitude === 0 && data.longitude === 0) && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600', marginBottom: '8px' }}>Lokasi di Peta</p>
          <MiniMap latitude={data.latitude} longitude={data.longitude} label={data.name} />
        </div>
      )}
    </div>
  );
};

const SummaryItem = ({ label, value }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '600' }}>{label}</span>
    <span style={{ fontSize: '14px', color: 'var(--text-main)', fontWeight: '500' }}>{value || '-'}</span>
  </div>
);

export default CustomerSummary;
