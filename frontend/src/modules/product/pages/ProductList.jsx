import React, { useState } from 'react';
import ProductFilters from '../components/ProductFilters';
import ProductTable from '../components/ProductTable';
import EntityListPage from '../../../components/entity/EntityListPage';
import './ProductList.css';

// mock hook for now
const useProducts = (filters) => {
  const [loading] = useState(false);
  const [error] = useState(null);
  
  const data = [
    { id: 1, sku: 'SKU-001', name: 'Premium Teh Tarik', category: 'Beverages', brand: 'Brand A', costPrice: 12.50, currentStock: 150, status: 'Active' },
    { id: 2, sku: 'SKU-002', name: 'Matcha Powder', category: 'Ingredients', brand: 'Brand B', costPrice: 45.00, currentStock: 0, status: 'Inactive' },
    { id: 3, sku: 'SKU-003', name: 'Boba Pearls', category: 'Snacks', brand: 'Brand A', costPrice: 5.25, currentStock: 12, status: 'Active' },
  ];

  return { data, loading, error };
};

const ProductList = () => {
  const [filters, setFilters] = useState({});
  const { data: products, loading, error } = useProducts(filters);

  const handleFilterChange = (name, value) => {
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <EntityListPage
      headerProps={{
        title: "Product List",
        addButtonLabel: "+ Add Product",
        onAdd: () => {/* Add navigation later */}
      }}
      error={error}
      filterProps={<ProductFilters filters={filters} onFilterChange={handleFilterChange} />}
      tableComponent={<ProductTable products={products} loading={loading} />}
    />
  );
};

export default ProductList;
