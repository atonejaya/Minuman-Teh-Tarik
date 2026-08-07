import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCustomer } from '../hooks/useCustomer';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import CustomerOverviewTab from '../components/tabs/CustomerOverviewTab';
import CustomerFinancialTab from '../components/tabs/CustomerFinancialTab';
import CustomerTransactionsTab from '../components/tabs/CustomerTransactionsTab';
import CustomerActivityTab from '../components/tabs/CustomerActivityTab';

const CustomerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const { data: profile, loading, error } = useCustomer(id);

  if (loading) return <div style={{ padding: 'var(--spacing-xl)' }}>Loading customer data...</div>;
  if (!profile) return <div style={{ padding: 'var(--spacing-xl)' }}>Customer Not Found</div>;

  const tabs = [
    { id: 'overview', label: 'Overview', component: <CustomerOverviewTab customer={profile} /> },
    { id: 'financial', label: 'Financial', component: <CustomerFinancialTab customer={profile} /> },
    { id: 'transactions', label: 'Transactions', component: <CustomerTransactionsTab customer={profile} /> },
    { id: 'activity', label: 'Activity', component: <CustomerActivityTab customer={profile} /> }
  ];

  return (
    <EntityDetailPage
      headerProps={{
        title: profile.name,
        subtitle: `${profile.address}, ${profile.city}`,
        badge: profile.code,
        onEdit: () => navigate(`/customers/${id}/edit`)
      }}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      error={error}
    />
  );
};

export default CustomerDetail;
