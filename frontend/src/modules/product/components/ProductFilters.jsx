import React from 'react';
import './ProductFilters.css';

const ProductFilters = ({ filters, onFilterChange }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    onFilterChange(name, type === 'checkbox' ? checked : value);
  };

  return (
    <div className="filters-container">
      <div className="search-bar">
        <input
          type="text"
          name="search"
          className="search-input"
          placeholder="Search products by name or SKU..."
          value={filters.search || ''}
          onChange={handleChange}
        />
      </div>

      <div className="dropdowns-grid">
        <div className="dropdown-group">
          <label>Category</label>
          <select name="category" className="dropdown-select" value={filters.category || ''} onChange={handleChange}>
            <option value="">All Categories</option>
            <option value="beverages">Beverages</option>
            <option value="snacks">Snacks</option>
            <option value="ingredients">Ingredients</option>
          </select>
        </div>

        <div className="dropdown-group">
          <label>Brand</label>
          <select name="brand" className="dropdown-select" value={filters.brand || ''} onChange={handleChange}>
            <option value="">All Brands</option>
            <option value="brand_a">Brand A</option>
            <option value="brand_b">Brand B</option>
          </select>
        </div>

        <div className="dropdown-group">
          <label>Supplier</label>
          <select name="supplier" className="dropdown-select" value={filters.supplier || ''} onChange={handleChange}>
            <option value="">All Suppliers</option>
            <option value="sup_1">Supplier 1</option>
            <option value="sup_2">Supplier 2</option>
          </select>
        </div>

        <div className="dropdown-group">
          <label>Warehouse</label>
          <select name="warehouse" className="dropdown-select" value={filters.warehouse || ''} onChange={handleChange}>
            <option value="">All Warehouses</option>
            <option value="main">Main Warehouse</option>
            <option value="secondary">Secondary Warehouse</option>
          </select>
        </div>

        <div className="dropdown-group">
          <label>Status</label>
          <select name="status" className="dropdown-select" value={filters.status || ''} onChange={handleChange}>
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      <div className="checkboxes-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="lowStock"
            className="checkbox-input"
            checked={filters.lowStock || false}
            onChange={handleChange}
          />
          Low Stock
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="outOfStock"
            className="checkbox-input"
            checked={filters.outOfStock || false}
            onChange={handleChange}
          />
          Out of Stock
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="consignmentOnly"
            className="checkbox-input"
            checked={filters.consignmentOnly || false}
            onChange={handleChange}
          />
          Consignment Only
        </label>
        <label className="checkbox-label">
          <input
            type="checkbox"
            name="sellableOnly"
            className="checkbox-input"
            checked={filters.sellableOnly || false}
            onChange={handleChange}
          />
          Sellable Only
        </label>
      </div>
    </div>
  );
};

export default ProductFilters;
