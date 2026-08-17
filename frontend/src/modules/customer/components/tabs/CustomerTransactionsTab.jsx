import React from 'react';
import CustomerTimeline from '../CustomerTimeline';
import { useCustomerTransactions } from '../../hooks/useCustomerTransactions';

const CustomerTransactionsTab = ({ customer }) => {
  const { data: transactions, loading } = useCustomerTransactions(customer?.id);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '12px', fontSize: '14px' }}>Memuat transaksi...</p>
      </div>
    );
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}> </div>
        <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>Belum Ada Transaksi</h4>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)', maxWidth: '320px', marginInline: 'auto' }}>
          Pelanggan ini belum memiliki transaksi. Faktur dan pembayaran baru akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h4 style={{ margin: '0 0 16px', fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Riwayat Transaksi</h4>
      <CustomerTimeline events={transactions} />
    </div>
  );
};

export default CustomerTransactionsTab;
