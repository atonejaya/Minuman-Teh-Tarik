import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EntityListPage from '../../../components/entity/EntityListPage';
import { SalesTransactionRepository } from '../../../repositories/SalesTransactionRepository';
import StatusBadge from '../../../components/shared/StatusBadge';
import TableMessage from '../../../components/shared/TableMessage';
import { formatRupiah } from '../../../utils/format.js';
import { tableCell } from '../../../utils/tableStyles.js';

const SalesTransactionTable = ({ data, loading, onView }) => {
  if (loading) {
    return <TableMessage>Memuat...</TableMessage>;
  }

  if (!data || data.length === 0) {
    return <TableMessage>Tidak ada transaksi penjualan.</TableMessage>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            <th style={tableCell}>No. Transaksi</th>
            <th style={tableCell}>Warung</th>
            <th style={tableCell}>Tanggal</th>
            <th style={tableCell}>Status</th>
            <th style={tableCell}>Pembayaran</th>
            <th style={tableCell}>Total</th>
            <th style={tableCell}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td style={{ ...tableCell, fontWeight: '500' }}>{item.code}</td>
              <td style={tableCell}>{item.customer_name || item.warung?.name || '-'}</td>
              <td style={tableCell}>{new Date(item.created_at).toLocaleDateString('id-ID')}</td>
              <td style={tableCell}><StatusBadge status={item.status} /></td>
              <td style={tableCell}><StatusBadge status={item.payment_status} /></td>
              <td style={{ ...tableCell, fontWeight: '600' }}>{formatRupiah(item.grand_total)}</td>
              <td style={tableCell}>
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
