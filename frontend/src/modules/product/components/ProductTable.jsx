import React from 'react';
import './ProductTable.css';

const ProductTable = ({ products }) => {
  return (
    <div className="table-container">
      <table className="product-table">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Product Name</th>
            <th>Category</th>
            <th>Brand</th>
            <th>Cost Price</th>
            <th>Current Stock</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id || product.sku}>
              <td style={{ fontWeight: '500' }}>{product.sku}</td>
              <td>{product.name}</td>
              <td>{product.category}</td>
              <td>{product.brand}</td>
              <td>${Number(product.costPrice).toFixed(2)}</td>
              <td>{product.currentStock}</td>
              <td>
                <span className={`status-badge status-${product.status.toLowerCase()}`}>
                  {product.status}
                </span>
              </td>
              <td>
                <div className="actions-group">
                  <button className="btn-action btn-edit">Edit</button>
                  <button className="btn-action btn-delete">Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ProductTable;
