import React from 'react';
import './ProductTabs.css';

const ProductDashboard = ({ dashboard }) => {
  if (!dashboard) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="dashboard-metrics">
      <div className="metric-card">
        <div className="metric-label">Revenue</div>
        <div className="metric-value">{formatCurrency(dashboard.revenue)}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Cost</div>
        <div className="metric-value">{formatCurrency(dashboard.cost)}</div>
      </div>
      <div className="metric-card">
        <div className="metric-label">Margin</div>
        <div className="metric-value">{formatCurrency(dashboard.margin)}</div>
      </div>
      <div className="metric-card" style={{ borderLeftColor: '#10b981' }}>
        <div className="metric-label">Profit %</div>
        <div className="metric-value">{dashboard.profit_percent}%</div>
      </div>
      <div className="metric-card" style={{ borderLeftColor: '#f59e0b' }}>
        <div className="metric-label">Turnover (Days)</div>
        <div className="metric-value">{dashboard.turnover}</div>
      </div>
    </div>
  );
};

export default ProductDashboard;
