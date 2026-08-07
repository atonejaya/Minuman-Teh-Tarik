import React from 'react';
import CustomerSummary from '../CustomerSummary';

const CustomerOverviewTab = ({ customer }) => {
  return (
    <div style={{ maxWidth: '800px' }}>
      <CustomerSummary data={customer} />
    </div>
  );
};

export default CustomerOverviewTab;
