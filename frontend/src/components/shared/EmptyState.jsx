import React from 'react';
import './EmptyState.css';

const EmptyState = ({ title = 'No Data Found', message = 'There is nothing to display here at the moment.', icon = '📭' }) => {
  return (
    <div className="shared-state-container empty-state">
      <div className="state-icon">{icon}</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
    </div>
  );
};

export default EmptyState;
