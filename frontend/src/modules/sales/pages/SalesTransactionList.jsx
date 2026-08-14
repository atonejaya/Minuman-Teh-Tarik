import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EntityListPage from '../../../components/entity/EntityListPage';
import { SalesTransactionRepository } from '../../../repositories/SalesTransactionRepository';
import StatusBadge from '../../../components/shared/StatusBadge';

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value || 0);
};

const SalesTransactionTable = ({ data, loading, onView }) => {
  if (loading) {
    return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</p>;
  }

  if (!data || data.length === 0) {
    return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada transaksi penjualan.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            <th style={cell}>No. Transaksi</th>
            <th style={cell}>Warung</th>
            <th style={cell}>Tanggal</th>
            <th style={cell}>Status</th>
            <th style={cell}>Pembayaran</th>
            <th style={cell}>Total</th>
            <th style={cell}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td style={{ ...cell, fontWeight: '500' }}>{item.code}</td>
              <td style={cell}>{item.customer_name || item.warung?.name || '-'}</td>
              <td style={cell}>{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
              <td style={cell}><StatusBadge status={item.status} /></td>
              <td style={cell}><StatusBadge status={item.payment_status} /></td>
              <td style={{ ...cell, fontWeight: '600' }}>{formatCurrency(item.grand_total)}</td>
              <td style={cell}>
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => onView(item.id)}>
                  Lihat
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SalesTransactionList = () => {
  const navigate = useNavigate();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const result = await SalesTransactionRepository.fetchAll({ page, pageSize: 20 });
      setData(result.data || []);
      setTotalPages(result.meta?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch sales transactions', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  return (
    <EntityListPage
      title="Transaksi Penjualan"
      actions={{
        left: [{ label: '+ Tambah Transaksi Penjualan', variant: 'primary', onClick: () => navigate('/sales/transactions/new') }]
      }}
      table={(props) => (
        <SalesTransactionTable
          {...props}
          loading={loading}
          onView={(id) => navigate(`/sales/transactions/${id}`)}
        />
      )}
      data={data}
      pagination={{ currentPage: page, totalPages }}
      onPageChange={setPage}
    />
  );
};

export default SalesTransactionList;
