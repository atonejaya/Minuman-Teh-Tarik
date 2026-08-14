import React from 'react';
import CustomerTimeline from '../CustomerTimeline';
import { useCustomerTransactions } from '../../hooks/useCustomerTransactions';

const CustomerTransactionsTab = ({ customer }) => {
  const { data: transactions, loading } = useCustomerTransactions(customer?.id);

  if (loading) return <div style={{ padding: 'var(--spacing-xl)' }}>Memuat transaksi...</div>;

  if (!transactions || transactions.length === 0) {
    return (
      <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center' }}>
        <h3>Belum Ada Transaksi</h3>
        <p>Pelanggan ini belum memiliki transaksi. Faktur dan pembayaran baru akan muncul di sini.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 style={{ padding: 'var(--spacing-lg)', margin: 0, borderBottom: '1px solid var(--color-border)' }}>Riwayat Transaksi</h3>
      <CustomerTimeline events={transactions} />
    </div>
  );
};

export default CustomerTransactionsTab;
