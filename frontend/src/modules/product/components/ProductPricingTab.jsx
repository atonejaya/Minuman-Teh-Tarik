import React, { useState, useEffect } from 'react';
import KPIGrid from '../../../components/shared/KPIGrid';
import KPICard from '../../../components/shared/KPICard';
import './ProductTabs.css';

const useProductPrices = (productId) => {
  const [prices, setPrices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setPrices([
        { id: 1, effective_from: '2026-07-15', effective_until: null, price: 15000 },
        { id: 2, effective_from: '2026-01-01', effective_until: '2026-07-14', price: 14500 },
        { id: 3, effective_from: '2025-06-01', effective_until: '2025-12-31', price: 14000 }
      ]);
      setLoading(false);
    }, 600);
  }, [productId]);

  return { prices, loading };
};

const ProductPricingTab = ({ productId }) => {
  const { prices, loading } = useProductPrices(productId);

  if (loading) {
    return <div className="state-message">Loading pricing history...</div>;
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value);
  };

  const activePrice = prices.find(p => !p.effective_until);
  const activePriceValue = activePrice ? formatCurrency(activePrice.price) : 'N/A';

  return (
    <div className="pricing-tab">
      <div style={{ marginBottom: '2rem' }}>
        <KPIGrid>
          <KPICard title="Active Price" value={activePriceValue} icon="🏷️" />
        </KPIGrid>
      </div>

      <div className="pricing-history">
        <h3>Price History</h3>
        <table className="pricing-table">
          <thead>
            <tr>
              <th>Effective From</th>
              <th>Effective Until</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
            {prices.map((price) => (
              <tr key={price.id}>
                <td>{price.effective_from}</td>
                <td>{price.effective_until || 'Current'}</td>
                <td style={{ fontWeight: 600 }}>{formatCurrency(price.price)}</td>
              </tr>
            ))}
            {prices.length === 0 && (
              <tr>
                <td colSpan="3" style={{ textAlign: 'center', padding: '2rem' }}>
                  No pricing history found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ProductPricingTab;
