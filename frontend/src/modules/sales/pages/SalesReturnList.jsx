import React from 'react';
import { EntityListPage } from '../../../components/EntityListPage';
import { SalesReturnRepository } from '../../../repositories/SalesReturnRepository';
import { StatusBadge } from '../../../components/StatusBadge';

const columns = [
  { key: 'code', label: 'Code' },
  { key: 'date', label: 'Date' },
  { 
    key: 'reference', 
    label: 'Reference (Invoice/Delivery)',
    render: (item) => `${item.referenceType || ''} ${item.referenceNumber || ''}`.trim() || item.reference || '-'
  },
  { 
    key: 'type', 
    label: 'Type',
    render: (item) => {
      const type = (item.type || '').toUpperCase();
      return (
        <span style={{ 
          color: type === 'GOOD' ? 'green' : (type === 'BAD' ? 'red' : 'inherit'), 
          fontWeight: 'bold' 
        }}>
          {type}
        </span>
      );
    }
  },
  { key: 'totalAmount', label: 'Total Amount' },
  { 
    key: 'status', 
    label: 'Status',
    render: (item) => <StatusBadge status={item.status} />
  }
];

export const SalesReturnList = () => {
  return (
    <EntityListPage
      title="Sales Returns"
      entityName="Sales Return"
      repository={SalesReturnRepository}
      columns={columns}
      createPath="/sales/returns/new"
      editPath={(id) => `/sales/returns/${id}/edit`}
      detailPath={(id) => `/sales/returns/${id}`}
    />
  );
};

export default SalesReturnList;
