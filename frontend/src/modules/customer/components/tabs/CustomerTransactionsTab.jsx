import React from 'react';
import CustomerTimeline from '../CustomerTimeline';
import { useCustomerTransactions } from '../../hooks/useCustomerTransactions';

const CustomerTransactionsTab = ({ customer }) => {
  const { data: transactions, loading } = useCustomerTransactions(customer?.id);

  if (loading) return <div style={{ padding: 'var(--spacing-xl)' }}>Loading transactions...</div>;

  if (!transactions || transactions.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <h3>No Transactions Yet</h3>
        <p>This customer hasn't made any transactions. New invoices and payments will appear here.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ padding: 'var(--spacing-lg)', margin: 0, borderBottom: '1px solid var(--color-border)' }}>Transaction History</h3>
      <CustomerTimeline events={transactions} />
    </div>
  );
};

export default CustomerTransactionsTab;
