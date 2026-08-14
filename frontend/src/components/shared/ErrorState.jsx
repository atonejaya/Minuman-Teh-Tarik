import React from 'react';
import './ErrorState.css';

const ErrorState = ({ title = 'Terjadi Kesalahan', message = 'Terjadi kendala saat memproses permintaan Anda.', onRetry }) => {
  return (
    <div className="shared-state-container error-state">
      <div className="state-icon">⚠️</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
      {onRetry && (
        <button className="error-retry-button" onClick={onRetry}>
          Coba Lagi
        </button>
      )}
    </div>
  );
};

export default ErrorState;
