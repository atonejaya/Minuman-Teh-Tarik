import React from 'react';
import KPIGrid from '../../../components/shared/KPIGrid';
import KPICard from '../../../components/shared/KPICard';
import './ProductTabs.css';

const ProductInventoryTab = ({ inventory }) => {
  if (!inventory) return null;

  return (
    <div className="inventory-tab">
      <KPIGrid>
        <KPICard title="Current Stock" value={inventory.current_stock} />
        <KPICard title="Available" value={inventory.available} />
        <KPICard title="Reserved" value={inventory.reserved} />
        <KPICard title="Incoming" value={inventory.incoming} />
        <KPICard title="Outgoing" value={inventory.outgoing} />
        <KPICard title="Damaged" value={inventory.damaged} />
        <KPICard title="Returned" value={inventory.returned} />
      </KPIGrid>
    </div>
  );
};

export default ProductInventoryTab;
