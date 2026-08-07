import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import SalesStockIssueRepository from '../../../repositories/SalesStockIssueRepository';

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const SalesStockIssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchIssue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await SalesStockIssueRepository.getSalesStockIssue(id);
      setData(result.data);
    } catch (error) {
      console.error('Failed to load sales stock issue detail', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!data) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Sales Stock Issue Not Found</div>;

  const handleConfirm = async () => {
    try {
      await SalesStockIssueRepository.confirmSalesStockIssue(data.id);
      fetchIssue();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to confirm sales stock issue');
    }
  };

  const handleClose = async () => {
    try {
      await SalesStockIssueRepository.closeSalesStockIssue(data.id);
      fetchIssue();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to close sales stock issue');
    }
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Overview',
      content: (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Issue Number</p>
              <p style={{ fontWeight: '500' }}>{data.issue_number}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Date</p>
              <p style={{ fontWeight: '500' }}>{new Date(data.issue_date).toLocaleDateString('id-ID')}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sales</p>
              <p style={{ fontWeight: '500' }}>{data.sales?.name || '-'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Warehouse</p>
              <p style={{ fontWeight: '500' }}>{data.warehouse?.name || '-'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Status</p>
              <p style={{ fontWeight: '500' }}>{data.status}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Qty</p>
              <p style={{ fontWeight: '500' }}>{data.total_qty}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            {data.status === 'DRAFT' && (
              <button className="btn btn-primary" onClick={handleConfirm}>Confirm</button>
            )}
            {data.status === 'CONFIRMED' && (
              <button className="btn" style={{ backgroundColor: 'var(--secondary)', color: '#fff' }} onClick={handleClose}>Close</button>
            )}
            <button className="btn" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={() => navigate('/sales/stock-issues')}>Back</button>
          </div>
        </div>
      )
    },
    {
      id: 'items',
      label: 'Items',
      content: (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--background)' }}>
              <tr>
                <th style={cell}>Product</th>
                <th style={cell}>Qty</th>
                <th style={cell}>Unit</th>
                <th style={cell}>Remark</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((item, index) => (
                <tr key={index}>
                  <td style={cell}>{item.product?.name || '-'}</td>
                  <td style={cell}>{item.qty}</td>
                  <td style={cell}>{item.unit?.name || '-'}</td>
                  <td style={cell}>{item.remark || '-'}</td>
                </tr>
              ))}
              {(!data.items || data.items.length === 0) && (
                <tr>
                  <td colSpan="4" style={{ ...cell, textAlign: 'center' }}>No items found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )
    },
    {
      id: 'activity',
      label: 'Activity',
      content: (
        <div style={{ padding: '16px' }}>
          {(data.history || []).map((activity, index) => (
            <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '6px' }} />
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {activity.changed_at ? new Date(activity.changed_at).toLocaleString('id-ID') : ''}
                </p>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>
                  {activity.status_from || 'null'} → {activity.status_to}
                </p>
                {activity.remarks && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{activity.remarks}</p>}
              </div>
            </div>
          ))}
          {(!data.history || data.history.length === 0) && (
            <p style={{ color: 'var(--text-muted)' }}>No recent activity</p>
          )}
        </div>
      )
    }
  ];

  return <EntityDetailPage title={`Sales Stock Issue: ${data.issue_number}`} tabs={tabs} />;
};

export default SalesStockIssueDetail;
