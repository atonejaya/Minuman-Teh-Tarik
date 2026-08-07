import React from 'react';
import { EntityFormPage } from '../../../components/EntityFormPage';
import { SalesTransactionRepository } from '../../../repositories/SalesTransactionRepository';

const fields = [
  { name: 'transactionNumber', label: 'Transaction #', type: 'text', required: true },
  { name: 'customerName', label: 'Customer Name', type: 'text', required: true },
  { name: 'transactionDate', label: 'Transaction Date', type: 'date', required: true },
  { 
    name: 'orderStatus', 
    label: 'Order Status', 
    type: 'select', 
    options: [
      { value: 'DRAFT', label: 'Draft' },
      { value: 'CONFIRMED', label: 'Confirmed' },
      { value: 'CANCELLED', label: 'Cancelled' }
    ]
  },
  { 
    name: 'paymentStatus', 
    label: 'Payment Status', 
    type: 'select', 
    options: [
      { value: 'UNPAID', label: 'Unpaid' },
      { value: 'PARTIALLY_PAID', label: 'Partially Paid' },
      { value: 'PAID', label: 'Paid' }
    ]
  },
  { name: 'subtotal', label: 'Subtotal', type: 'number', required: true },
  { name: 'tax', label: 'Tax', type: 'number', required: false },
  { name: 'totalAmount', label: 'Total Amount', type: 'number', required: true }
];

export const SalesTransactionFormPage = () => {
  return (
    <EntityFormPage
      title="Sales Transaction"
      entityName="Sales Transaction"
      repository={SalesTransactionRepository}
      fields={fields}
      listPath="/sales"
    />
  );
};

export default SalesTransactionFormPage;
