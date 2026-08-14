import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomer } from '../hooks/useCustomer';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import CustomerOverviewTab from '../components/tabs/CustomerOverviewTab';
import CustomerFinancialTab from '../components/tabs/CustomerFinancialTab';
import CustomerTransactionsTab from '../components/tabs/CustomerTransactionsTab';
import CustomerActivityTab from '../components/tabs/CustomerActivityTab';

const STATUS_LABELS = { ACTIVE: 'Aktif', INACTIVE: 'Nonaktif', BLACKLIST: 'Blacklist', SUSPENDED: 'Ditangguhkan' };

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: profile, loading, error } = useCustomer(id);

  if (loading) return <p className="empty-hint">Memuat data pelanggan...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!profile) return <p className="empty-hint">Pelanggan tidak ditemukan</p>;

  const tabs = [
    { id: 'overview', label: 'Ringkasan', component: <CustomerOverviewTab customer={profile} /> },
    { id: 'financial', label: 'Keuangan', component: <CustomerFinancialTab customer={profile} /> },
    { id: 'transactions', label: 'Transaksi', component: <CustomerTransactionsTab customer={profile} /> },
    { id: 'activity', label: 'Aktivitas', component: <CustomerActivityTab customer={profile} /> }
  ];

  return (
    <EntityDetailPage
      title={profile.name}
      summary={
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <span><strong>Kode:</strong> {profile.code || '-'}</span>
          <span><strong>Area:</strong> {Array.isArray(profile.Area) ? profile.Area[0]?.name : profile.Area?.name || profile.area?.name || '-'}</span>
          <span><strong>Rute:</strong> {Array.isArray(profile.Route) ? profile.Route[0]?.name : profile.Route?.name || profile.route?.name || '-'}</span>
          <span><strong>Status:</strong> <span className="badge badge-success">{STATUS_LABELS[(profile.status || 'ACTIVE').toUpperCase()] || profile.status || 'Aktif'}</span></span>
        </div>
      }
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      actions={{
        left: [{ label: 'Ubah', variant: 'primary', onClick: () => navigate(`/customers/${id}/edit`) }],
      }}
    />
  );
};

export default CustomerDetail;
