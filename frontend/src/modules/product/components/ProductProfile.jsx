import React from 'react';
import './ProductTabs.css';

const ProductProfile = ({ product }) => {
  return (
    <div className="profile-grid">
      <div className="profile-field">
        <span className="profile-label">SKU</span>
        <span className="profile-value">{product.sku}</span>
      </div>
      <div className="profile-field">
        <span className="profile-label">Barcode</span>
        <span className="profile-value">{product.barcode}</span>
      </div>
      <div className="profile-field">
        <span className="profile-label">Category</span>
        <span className="profile-value">{product.category}</span>
      </div>
      <div className="profile-field">
        <span className="profile-label">Brand</span>
        <span className="profile-value">{product.brand}</span>
      </div>
      <div className="profile-field">
        <span className="profile-label">Supplier</span>
        <span className="profile-value">{product.supplier}</span>
      </div>
    </div>
  );
};

export default ProductProfile;
