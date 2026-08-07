import React from 'react';
import './ProductTabs.css';

const ProductInventory = ({ inventory }) => {
  if (!inventory) return null;

  return (
    <div className="inventory-cards">
      <div className="inventory-card">
        <span className="inventory-card-title">Current Stock</span>
        <span className="inventory-card-value">{inventory.current_stock}</span>
      </div>
      <div className="inventory-card">
        <span className="inventory-card-title">Available</span>
        <span className="inventory-card-value">{inventory.available}</span>
      </div>
      <div className="inventory-card">
        <span className="inventory-card-title">Reserved</span>
        <span className="inventory-card-value">{inventory.reserved}</span>
      </div>
      <div className="inventory-card">
        <span className="inventory-card-title">Incoming</span>
        <span className="inventory-card-value">{inventory.incoming}</span>
      </div>
      <div className="inventory-card">
        <span className="inventory-card-title">Outgoing</span>
        <span className="inventory-card-value">{inventory.outgoing}</span>
      </div>
      <div className="inventory-card">
        <span className="inventory-card-title">Damaged</span>
        <span className="inventory-card-value">{inventory.damaged}</span>
      </div>
      <div className="inventory-card">
        <span className="inventory-card-title">Returned</span>
        <span className="inventory-card-value">{inventory.returned}</span>
      </div>
    </div>
  );
};

export default ProductInventory;
