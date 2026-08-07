import React from 'react';
import { EntityFormPage } from '../../../components/EntityFormPage';
import { SalesReturnRepository } from '../../../repositories/SalesReturnRepository';

const fields = [
  { name: 'code', label: 'Return Code', type: 'text', required: true },
  { name: 'date', label: 'Return Date', type: 'date', required: true },
  { 
    name: 'referenceType', 
    label: 'Reference Type', 
    type: 'select', 
    options: [
      { value: 'INVOICE', label: 'Invoice' },
      { value: 'DELIVERY', label: 'Delivery' }
    ],
    required: true
  },
  { name: 'referenceNumber', label: 'Reference Number', type: 'text', required: true },
  { 
    name: 'type', 
    label: 'Return Type', 
    type: 'select', 
    options: [
      { value: 'GOOD', label: 'Good' },
      { value: 'BAD', label: 'Bad' }
    ],
    required: true
  },
  { 
    name: 'items', 
    label: 'Returned Items', 
    type: 'item-grid', // Assumes a generic grid or list component for nested items
    fields: [
      { name: 'name', label: 'Item Name', type: 'text', required: true },
      { name: 'quantity', label: 'Quantity', type: 'number', required: true },
      { name: 'reason', label: 'Reason', type: 'text' },
      { 
        name: 'type', 
        label: 'Item Type', 
        type: 'select', 
        options: [
          { value: 'GOOD', label: 'Good' },
          { value: 'BAD', label: 'Bad' }
        ] 
      }
    ]
  },
  { name: 'totalAmount', label: 'Total Amount', type: 'number', required: true }
];

export const SalesReturnFormPage = () => {
  return (
    <EntityFormPage
      title="Sales Return Form"
      entityName="Sales Return"
      repository={SalesReturnRepository}
      fields={fields}
      listPath="/sales/returns"
    />
  );
};

export default SalesReturnFormPage;
