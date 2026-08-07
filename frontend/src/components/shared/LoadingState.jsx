import React from 'react';
import './LoadingState.css';

const LoadingState = ({ title = 'Loading...', message = 'Please wait while we fetch the data.' }) => {
  return (
    <div className="shared-state-container loading-state">
      <div className="state-icon loading-spinner"></div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
    </div>
  );
};

export default LoadingState;
