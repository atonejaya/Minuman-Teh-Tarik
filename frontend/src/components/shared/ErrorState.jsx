import React from 'react';
import './ErrorState.css';

const ErrorState = ({ title = 'An Error Occurred', message = 'Something went wrong while processing your request.', onRetry }) => {
  return (
    <div className="shared-state-container error-state">
      <div className="state-icon">⚠️</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      {onRetry && (
        <button className="error-retry-button" onClick={onRetry}>
          Try Again
        </button>
      )}
    </div>
  );
};

export default ErrorState;
