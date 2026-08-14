import React from 'react';
import './EmptyState.css';

const EmptyState = ({ title = 'Tidak Ada Data', message = 'Saat ini tidak ada data yang dapat ditampilkan.', icon = '📭' }) => {
  return (
    <div className="shared-state-container empty-state">
      <div className="state-icon">{icon}</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
    </div>
  );
};

export default EmptyState;
