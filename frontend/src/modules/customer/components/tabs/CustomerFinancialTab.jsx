import React from 'react';
import CustomerStatistics from '../CustomerStatistics';
import CustomerSummary from '../CustomerSummary';
import { useCustomerDashboard } from '../../hooks/useCustomerDashboard';

const CustomerFinancialTab = ({ customer }) => {
  const { data: dashboard, loading } = useCustomerDashboard(customer?.id);

  if (loading) return <div>Loading dashboard...</div>;

  return (
    <div>
      <CustomerStatistics data={dashboard} />
      <CustomerSummary data={customer} />
    </div>
  );
};

export default CustomerFinancialTab;
