import React from 'react';
import { EntityListPage } from '../../../components/EntityListPage';
import { SalesTransactionRepository } from '../../../repositories/SalesTransactionRepository';

const formatStatus = (s) => {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase().replace(/_/g, ' ');
};

const columns = [
  { key: 'transactionNumber', label: 'Transaction #' },
  { key: 'customerName', label: 'Customer' },
  { key: 'transactionDate', label: 'Date' },
  { 
    key: 'status', 
    label: 'Status',
    render: (item) => {
      const orderStatus = formatStatus(item.orderStatus || 'DRAFT');
      const paymentStatus = formatStatus(item.paymentStatus || 'UNPAID');
      
      return (
        <span className="status-badge">
          {orderStatus} &bull; {paymentStatus}
        </span>
      );
    }
  },
  { key: 'totalAmount', label: 'Total Amount' }
];

export const SalesTransactionList = () => {
  return (
    <EntityListPage
      title="Sales Transactions"
      entityName="Sales Transaction"
      repository={SalesTransactionRepository}
      columns={columns}
      createPath="/sales/new"
      editPath={(id) => `/sales/${id}/edit`}
      detailPath={(id) => `/sales/${id}`}
    />
  );
};

export default SalesTransactionList;
