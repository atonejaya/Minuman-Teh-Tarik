import React from 'react';

const STATUS_COLORS = {
  ACTIVE: '#198754',
  INACTIVE: '#6c757d',
  BLACKLIST: '#dc3545',
  SUSPENDED: '#005DA4'
};

const STATUS_LABELS = { ACTIVE: 'Aktif', INACTIVE: 'Nonaktif', BLACKLIST: 'Blacklist', SUSPENDED: 'Ditangguhkan' };

const CustomerStatusBadge = ({ status }) => {
  const color = STATUS_COLORS[(status || '').toUpperCase()] || '#6c757d';
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 10px',
      borderRadius: '999px',
      fontSize: '12px',
      fontWeight: '600',
      color: '#fff',
      backgroundColor: color
    }}>
      {STATUS_LABELS[(status || '').toUpperCase()] || status}
    </span>
  );
};

export default CustomerStatusBadge;
