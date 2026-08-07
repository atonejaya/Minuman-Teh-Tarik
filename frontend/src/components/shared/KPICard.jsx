import React from 'react';
import './KPICard.css';

const KPICard = ({ title, value, icon, trend, trendValue }) => {
  return (
    <div className="kpi-card">
      <div className="kpi-card-header">
        <h3 className="kpi-card-title">{title}</h3>
        {icon && <div className="kpi-card-icon">{icon}</div>}
      </div>
      <div className="kpi-card-body">
        <div className="kpi-card-value">{value}</div>
        {trend && (
          <div className={`kpi-card-trend trend-${trend}`}>
            {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'} {trendValue}
          </div>
        )}
      </div>
    </div>
  );
};

export default KPICard;
