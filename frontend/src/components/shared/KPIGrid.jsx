import React from 'react';
import './KPIGrid.css';

const KPIGrid = ({ children }) => {
  return (
    <div className="kpi-grid">
      {children}
    </div>
  );
};

export default KPIGrid;
