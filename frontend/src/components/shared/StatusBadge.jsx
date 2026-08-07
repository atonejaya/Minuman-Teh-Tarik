import React from 'react';

const StatusBadge = ({ status }) => {
  const getBadgeColor = (status) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE': return 'success';
      case 'INACTIVE': return 'secondary';
      case 'BLACKLIST': return 'danger';
      case 'DRAFT': return 'warning';
      case 'COMPLETED': return 'primary';
      default: return 'light';
    }
  };

  return (
    <span className={`badge bg-${getBadgeColor(status)}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
