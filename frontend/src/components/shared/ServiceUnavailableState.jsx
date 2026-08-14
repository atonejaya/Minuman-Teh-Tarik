import React from 'react';
import './ServiceUnavailableState.css';

const ServiceUnavailableState = ({ title = 'Layanan Tidak Tersedia', message = 'Layanan sedang tidak tersedia atau sedang dalam pemeliharaan. Silakan coba lagi nanti.' }) => {
  return (
    <div className="shared-state-container service-unavailable-state">
      <div className="state-icon">🚧</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
    </div>
  );
};

export default ServiceUnavailableState;
