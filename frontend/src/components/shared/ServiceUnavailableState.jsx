import React from 'react';
import './ServiceUnavailableState.css';

const ServiceUnavailableState = ({ title = 'Service Unavailable', message = 'The service is temporarily down or undergoing maintenance. Please try again later.' }) => {
  return (
    <div className="shared-state-container service-unavailable-state">
      <div className="state-icon">🚧</div>
      <h3 className="state-title">{title}</h3>
      <p className="state-message">{message}</p>
    </div>
  );
};

export default ServiceUnavailableState;
