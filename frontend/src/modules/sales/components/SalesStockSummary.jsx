import React, { useEffect, useState } from 'react';
import api from '../../../services/api';

const SalesStockSummary = ({ salesId, productId }) => {
  const [stock, setStock] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (salesId && productId) {
      const fetchStock = async () => {
        setLoading(true);
        try {
          const response = await api.get(`/sales/stock/${salesId}/projection`, {
            params: { productId }
          });
          setStock(response.data.data || null);
        } catch (error) {
          console.error('Failed to fetch sales stock projection', error);
          setStock(null);
        } finally {
          setLoading(false);
        }
      };

      fetchStock();
    } else {
      setStock(null);
    }
  }, [salesId, productId]);

  if (!salesId || !productId) {
    return (
      <div style={{ padding: '16px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-muted)' }}>
        Please select a sales and product to view stock summary.
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: '16px', backgroundColor: 'var(--background)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', fontSize: '14px', color: 'var(--text-muted)', animation: 'pulse 1.5s infinite' }}>
        Loading stock summary...
      </div>
    );
  }

  const available = stock ? stock.qty_available : 0;

  return (
    <div style={{ padding: '16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
      <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px' }}>Sales Stock Summary</h4>
      <div style={{ display: 'flex', gap: '24px' }}>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Available</span>
          <div style={{ fontSize: '20px', fontWeight: '700', color: available > 0 ? 'var(--success)' : 'var(--danger)' }}>
            {available}
          </div>
        </div>
        <div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Product</span>
          <div style={{ fontSize: '14px', fontWeight: '500' }}>{stock?.product?.name || '-'}</div>
        </div>
      </div>
    </div>
  );
};

export default SalesStockSummary;
