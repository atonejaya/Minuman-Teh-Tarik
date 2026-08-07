import React, { useState, useEffect } from 'react';
import './ProductForm.css';

const ProductForm = ({ initialData, lookups, onSubmit, onCancel, isSubmitting }) => {
  const [formData, setFormData] = useState({
    // General
    name: '',
    sku: '',
    barcode: '',
    description: '',
    // Classification
    categoryId: '',
    brandId: '',
    // Supplier
    supplierId: '',
    // Pricing
    defaultCost: '',
    retailPrice: '',
    taxId: '',
    // Inventory
    minLimit: '',
    maxLimit: '',
    packagingId: '',
    unitId: '',
    // Warehouse
    warehouseId: '',
    // Additional Info
    notes: '',
    isActive: true
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  // Safe fallback for lookups in case they are undefined or missing properties
  const safeLookups = lookups || {};
  const categories = safeLookups.categories || [];
  const brands = safeLookups.brands || [];
  const suppliers = safeLookups.suppliers || [];
  const warehouses = safeLookups.warehouses || [];
  const taxes = safeLookups.taxes || [];
  const packagings = safeLookups.packagings || [];
  const units = safeLookups.units || [];

  return (
    <form onSubmit={handleSubmit} className="product-form">
      {/* General Section */}
      <div className="form-section">
        <h3><span className="section-icon">📦</span> General Information</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Product Name <span className="required-asterisk">*</span></label>
            <input type="text" name="name" className="form-input" value={formData.name} onChange={handleChange} required placeholder="e.g. Premium Teh Tarik" />
          </div>
          <div className="form-group">
            <label className="form-label">SKU <span className="required-asterisk">*</span></label>
            <input type="text" name="sku" className="form-input" value={formData.sku} onChange={handleChange} required placeholder="e.g. TT-PRM-001" />
          </div>
          <div className="form-group">
            <label className="form-label">Barcode</label>
            <input type="text" name="barcode" className="form-input" value={formData.barcode} onChange={handleChange} placeholder="Scan or enter barcode" />
          </div>
          <div className="form-group full-width">
            <label className="form-label">Description</label>
            <textarea name="description" className="form-textarea" value={formData.description} onChange={handleChange} placeholder="Detailed product description..."></textarea>
          </div>
        </div>
      </div>

      {/* Classification Section */}
      <div className="form-section">
        <h3><span className="section-icon">🏷️</span> Classification</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Category</label>
            <select name="categoryId" className="form-select" value={formData.categoryId} onChange={handleChange}>
              <option value="">Select Category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Brand</label>
            <select name="brandId" className="form-select" value={formData.brandId} onChange={handleChange}>
              <option value="">Select Brand</option>
              {brands.map(brand => (
                <option key={brand.id} value={brand.id}>{brand.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Supplier Section */}
      <div className="form-section">
        <h3><span className="section-icon">🏢</span> Supplier</h3>
        <div className="form-grid">
          <div className="form-group full-width">
            <label className="form-label">Primary Supplier</label>
            <select name="supplierId" className="form-select" value={formData.supplierId} onChange={handleChange}>
              <option value="">Select Supplier</option>
              {suppliers.map(sup => (
                <option key={sup.id} value={sup.id}>{sup.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Pricing Section */}
      <div className="form-section">
        <h3><span className="section-icon">💰</span> Pricing (Default)</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Default Cost</label>
            <input type="number" step="0.01" name="defaultCost" className="form-input" value={formData.defaultCost} onChange={handleChange} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="form-label">Retail Price</label>
            <input type="number" step="0.01" name="retailPrice" className="form-input" value={formData.retailPrice} onChange={handleChange} placeholder="0.00" />
          </div>
          <div className="form-group">
            <label className="form-label">Tax Profile</label>
            <select name="taxId" className="form-select" value={formData.taxId} onChange={handleChange}>
              <option value="">Select Tax Profile</option>
              {taxes.map(tax => (
                <option key={tax.id} value={tax.id}>{tax.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Inventory Section */}
      <div className="form-section">
        <h3><span className="section-icon">📊</span> Inventory Limits & Units</h3>
        <div className="form-grid">
          <div className="form-group">
            <label className="form-label">Minimum Limit</label>
            <input type="number" name="minLimit" className="form-input" value={formData.minLimit} onChange={handleChange} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Maximum Limit</label>
            <input type="number" name="maxLimit" className="form-input" value={formData.maxLimit} onChange={handleChange} placeholder="0" />
          </div>
          <div className="form-group">
            <label className="form-label">Packaging Type</label>
            <select name="packagingId" className="form-select" value={formData.packagingId} onChange={handleChange}>
              <option value="">Select Packaging</option>
              {packagings.map(pkg => (
                <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Unit of Measure</label>
            <select name="unitId" className="form-select" value={formData.unitId} onChange={handleChange}>
              <option value="">Select Unit</option>
              {units.map(unit => (
                <option key={unit.id} value={unit.id}>{unit.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Warehouse Section */}
      <div className="form-section">
        <h3><span className="section-icon">🏭</span> Warehouse</h3>
        <div className="form-grid">
          <div className="form-group full-width">
            <label className="form-label">Default Warehouse</label>
            <select name="warehouseId" className="form-select" value={formData.warehouseId} onChange={handleChange}>
              <option value="">Select Warehouse</option>
              {warehouses.map(wh => (
                <option key={wh.id} value={wh.id}>{wh.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Additional Info Section */}
      <div className="form-section">
        <h3><span className="section-icon">📝</span> Additional Info</h3>
        <div className="form-grid">
          <div className="form-group full-width">
            <label className="form-label">Internal Notes</label>
            <textarea name="notes" className="form-textarea" value={formData.notes} onChange={handleChange} placeholder="Any internal notes or remarks..."></textarea>
          </div>
          <div className="form-group full-width">
            <div className="checkbox-wrapper">
              <input type="checkbox" name="isActive" id="isActive" checked={formData.isActive} onChange={handleChange} />
              <label htmlFor="isActive">Active Product (Available for transactions)</label>
            </div>
          </div>
        </div>
      </div>

      <div className="form-actions">
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <span className="spinner" style={{ width: '20px', height: '20px', margin: 0, borderWidth: '3px', borderTopColor: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}></span>
              Saving...
            </>
          ) : (
            <>
              <span style={{ fontSize: '1.2rem' }}>💾</span>
              Save Product
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
