import React, { useState, useEffect } from 'react';
import './ProductDetail.css';
import ProductProfileTab from '../components/ProductProfileTab';
import ProductInventoryTab from '../components/ProductInventoryTab';
import ProductPricingTab from '../components/ProductPricingTab';
import ProductDashboardTab from '../components/ProductDashboardTab';
import ProductActivityTab from '../components/ProductActivityTab';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';

// Mock hook for useProduct - replace with actual hook later
const useProduct = (productId) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setData({
        id: productId,
        name: 'Teh Tarik Premium',
        status: 'Active',
        sku: 'TT-PR-001',
        barcode: '8991234567890',
        category: 'Beverage',
        brand: 'Teh Tarik',
        supplier: 'PT Minuman Segar',
        inventory: {
          current_stock: 450,
          available: 400,
          reserved: 50,
          incoming: 100,
          outgoing: 20,
          damaged: 5,
          returned: 2
        },
        dashboard: {
          revenue: 15000000,
          cost: 8000000,
          margin: 7000000,
          profit_percent: 46.67,
          turnover: 12
        },
        activities: [
          { id: 1, type: 'Stock Adjusted', date: '2026-08-01T10:00:00Z', desc: 'Added 100 units from Supplier' },
          { id: 2, type: 'Price Changed', date: '2026-07-15T08:30:00Z', desc: 'Base price updated to Rp 15.000' }
        ]
      });
      setLoading(false);
    }, 800);
  }, [productId]);

  return { product: data, loading, error };
};

const ProductDetail = ({ productId = '1' }) => {
  const { product, loading, error } = useProduct(productId);
  const [activeTab, setActiveTab] = useState('Profile');

  if (loading) return <div>Loading product details...</div>;
  if (error) return <div>Error loading product: {error.message}</div>;
  if (!product) return <div>Product not found.</div>;

  const tabs = [
    { id: 'Profile', label: 'Profile', component: <ProductProfileTab product={product} /> },
    { id: 'Inventory', label: 'Inventory', component: <ProductInventoryTab inventory={product.inventory} /> },
    { id: 'Pricing', label: 'Pricing', component: <ProductPricingTab productId={product.id} /> },
    { id: 'Dashboard', label: 'Dashboard', component: <ProductDashboardTab dashboard={product.dashboard} /> },
    { id: 'Activity', label: 'Activity', component: <ProductActivityTab activities={product.activities} /> }
  ];

  return (
    <EntityDetailPage
      headerProps={{
        title: product.name,
        badge: product.status,
        onEdit: () => {}
      }}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      error={error}
    />
  );
};

export default ProductDetail;
