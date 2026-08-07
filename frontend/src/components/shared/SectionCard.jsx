import React from 'react';
import './SectionCard.css';

const SectionCard = ({ title, action, children, className = '' }) => {
  return (
    <div className={`section-card ${className}`}>
      {(title || action) && (
        <div className="section-card-header">
          {title && <h2 className="section-card-title">{title}</h2>}
          {action && <div className="section-card-action">{action}</div>}
        </div>
      )}
      <div className="section-card-body">
        {children}
      </div>
    </div>
  );
};

export default SectionCard;
