import React from 'react';
import KPIGrid from '../../../components/shared/KPIGrid';
import KPICard from '../../../components/shared/KPICard';
import './ProductTabs.css';

const ProductDashboardTab = ({ dashboard }) => {
  if (!dashboard) return null;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  return (
    <div className="dashboard-tab">
      <KPIGrid>
        <KPICard title="Revenue" value={formatCurrency(dashboard.revenue)} />
        <KPICard title="Cost" value={formatCurrency(dashboard.cost)} />
        <KPICard title="Margin" value={formatCurrency(dashboard.margin)} />
        <KPICard title="Profit %" value={`${dashboard.profit_percent}%`} trend="up" trendValue="Good" />
        <KPICard title="Turnover (Days)" value={dashboard.turnover} />
      </KPIGrid>
    </div>
  );
};

export default ProductDashboardTab;
