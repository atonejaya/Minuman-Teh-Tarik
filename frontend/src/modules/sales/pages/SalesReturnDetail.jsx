import React from 'react';
import { EntityDetailPage } from '../../../components/EntityDetailPage';
import { SalesReturnRepository } from '../../../repositories/SalesReturnRepository';

const ActivityTab = ({ data }) => (
  <div className="tab-section">
    <h3>Activity Log</h3>
    <p>No recent activity recorded for this return.</p>
  </div>
);

const tabs = [
  {
    key: 'overview',
    label: 'Overview',
    component: ({ data }) => (
      <div className="tab-section">
        <h3>Overview</h3>
        <p><strong>Code:</strong> {data?.code}</p>
        <p><strong>Date:</strong> {data?.date}</p>
        <p><strong>Reference:</strong> {data?.referenceType} - {data?.referenceNumber}</p>
        <p><strong>Type:</strong> {data?.type}</p>
        <p><strong>Status:</strong> {data?.status}</p>
        <p><strong>Total Amount:</strong> {data?.totalAmount}</p>
      </div>
    )
  },
  {
    key: 'items',
    label: 'Items',
    component: ({ data }) => (
      <div className="tab-section">
        <h3>Returned Items</h3>
        {data?.items && data.items.length > 0 ? (
          <table className="entity-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Item</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Qty</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Reason</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Type</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{item.name}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{item.quantity}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{item.reason}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{item.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p>No returned items found.</p>
        )}
      </div>
    )
  },
  {
    key: 'activity',
    label: 'Activity',
    component: ActivityTab
  }
];

export const SalesReturnDetail = () => {
  return (
    <EntityDetailPage
      title="Sales Return Detail"
      entityName="Sales Return"
      repository={SalesReturnRepository}
      tabs={tabs}
      editPath={(id) => `/sales/returns/${id}/edit`}
      listPath="/sales/returns"
    />
  );
};

export default SalesReturnDetail;
