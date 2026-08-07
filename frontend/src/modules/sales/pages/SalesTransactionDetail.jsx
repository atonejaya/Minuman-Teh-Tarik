import React from 'react';
import { EntityDetailPage } from '../../../components/EntityDetailPage';
import { SalesTransactionRepository } from '../../../repositories/SalesTransactionRepository';
import { SalesTransactionActivityTab } from '../components/SalesTransactionActivityTab';

const tabs = [
  {
    key: 'overview',
    label: 'Overview',
    component: ({ data }) => (
      <div className="tab-section">
        <h3>Overview</h3>
        <p><strong>Transaction Number:</strong> {data?.transactionNumber}</p>
        <p><strong>Customer:</strong> {data?.customerName}</p>
        <p><strong>Date:</strong> {data?.transactionDate}</p>
        <p><strong>Order Status:</strong> {data?.orderStatus}</p>
      </div>
    )
  },
  {
    key: 'items',
    label: 'Items',
    component: ({ data }) => (
      <div className="tab-section">
        <h3>Items</h3>
        {data?.items && data.items.length > 0 ? (
          <ul>
            {data.items.map((item, idx) => (
              <li key={idx}>
                {item.name} - Qty: {item.quantity} - Price: {item.price}
              </li>
            ))}
          </ul>
        ) : (
          <p>No items found.</p>
        )}
      </div>
    )
  },
  {
    key: 'payments',
    label: 'Payments',
    component: ({ data }) => (
      <div className="tab-section">
        <h3>Payments</h3>
        {data?.payments && data.payments.length > 0 ? (
          <ul>
            {data.payments.map((payment, idx) => (
              <li key={idx}>
                {payment.date} - Amount: {payment.amount} ({payment.method})
              </li>
            ))}
          </ul>
        ) : (
          <p>No payments recorded.</p>
        )}
      </div>
    )
  },
  {
    key: 'financial',
    label: 'Financial',
    component: ({ data }) => (
      <div className="tab-section">
        <h3>Financial Summary</h3>
        <p><strong>Subtotal:</strong> {data?.subtotal}</p>
        <p><strong>Tax:</strong> {data?.tax}</p>
        <p><strong>Total Amount:</strong> {data?.totalAmount}</p>
        <p><strong>Payment Status:</strong> {data?.paymentStatus}</p>
      </div>
    )
  },
  {
    key: 'activity',
    label: 'Activity',
    component: SalesTransactionActivityTab
  }
];

export const SalesTransactionDetail = () => {
  return (
    <EntityDetailPage
      title="Sales Transaction Detail"
      entityName="Sales Transaction"
      repository={SalesTransactionRepository}
      tabs={tabs}
      editPath={(id) => `/sales/${id}/edit`}
      listPath="/sales"
    />
  );
};

export default SalesTransactionDetail;
