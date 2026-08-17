import React from 'react';
import CustomerStatistics from '../CustomerStatistics';
import CustomerSummary from '../CustomerSummary';
import { useCustomerDashboard } from '../../hooks/useCustomerDashboard';

const CustomerFinancialTab = ({ customer }) => {
  const { data: dashboard, loading } = useCustomerDashboard(customer?.id);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '12px', fontSize: '14px' }}>Memuat data keuangan...</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <CustomerStatistics data={dashboard} />
      <CustomerSummary data={customer} />
    </div>
  );
};

export default CustomerFinancialTab;
