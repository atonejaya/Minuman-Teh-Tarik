import React from 'react';

const CustomerActivityTab = ({ customer }) => {
  return (
    <div className="card" style={{ padding: 'var(--spacing-lg)' }}>
      <h3 style={{ margin: '0 0 var(--spacing-lg) 0' }}>Audit History</h3>
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <h3>History Unavailable</h3>
        <p>Customer audit history endpoint is pending in Sprint 10.7A.</p>
      </div>
    </div>
  );
};

export default CustomerActivityTab;
