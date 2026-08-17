import React from 'react';
import CustomerSummary from '../CustomerSummary';

const CustomerOverviewTab = ({ customer }) => {
  return (
    <div>
      <CustomerSummary data={customer} />
    </div>
  );
};

export default CustomerOverviewTab;
