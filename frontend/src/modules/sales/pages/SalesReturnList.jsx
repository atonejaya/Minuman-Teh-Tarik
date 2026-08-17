import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EntityListPage from '../../../components/entity/EntityListPage';
import { SalesReturnRepository } from '../../../repositories/SalesReturnRepository';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import TableMessage from '../../../components/shared/TableMessage';
import StatusBadge from '../../../components/shared/StatusBadge';
import { useToast } from '../../../components/toast/ToastContext';
import { formatRupiah } from '../../../utils/format.js';
import { tableCell } from '../../../utils/tableStyles.js';

const REFERENCE_TYPE_LABELS = {
  SALES: 'Penjualan Sales', SALES_TRANSACTION: 'Transaksi Penjualan', SALES_INVOICE: 'Faktur Penjualan',
  CREDIT_NOTE: 'Nota Kredit', MANUAL: 'Manual',
};

const SalesReturnTable = ({ data, loading, onView, onApprove, onReceive }) => {
  if (loading) {
    return <TableMessage>Memuat...</TableMessage>;
  }

  if (!data || data.length === 0) {
    return <TableMessage>Tidak ada retur penjualan.</TableMessage>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            <th style={tableCell}>Kode Retur</th>
            <th style={tableCell}>Tanggal</th>
            <th style={tableCell}>Warung</th>
            <th style={tableCell}>Referensi</th>
            <th style={tableCell}>Total</th>
            <th style={tableCell}>Status</th>
            <th style={tableCell}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td style={{ ...tableCell, fontWeight: '500' }}>{item.code}</td>
              <td style={tableCell}>{new Date(item.return_date).toLocaleDateString('id-ID')}</td>
              <td style={tableCell}>{item.warung?.name || '-'}</td>
              <td style={tableCell}>{REFERENCE_TYPE_LABELS[item.reference_type] || item.reference_type || '-'}</td>
              <td style={{ ...tableCell, fontWeight: '600' }}>{formatRupiah(item.total_amount)}</td>
              <td style={tableCell}><StatusBadge status={item.status} /></td>
              <td style={tableCell}>
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => onView(item.id)}>
                  Lihat
                </button>
                {item.status === 'DRAFT' && onApprove && (
                  <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', marginLeft: '6px', backgroundColor: 'var(--secondary)', color: '#fff' }} onClick={() => onApprove(item.id)}>
                    Setujui
                  </button>
                )}
                {['DRAFT', 'APPROVED'].includes(item.status) && onReceive && (
                  <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', marginLeft: '6px', backgroundColor: 'var(--success)', color: '#fff' }} onClick={() => onReceive(item.id)}>
                    Terima
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SalesReturnList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isOwner = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchReturns = useCallback(async () => {
    setLoading(true);
    try {
      const result = await SalesReturnRepository.fetchAll({ page, pageSize: 20 });
      setData(result.data || []);
      setTotalPages(result.meta?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch sales returns', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchReturns();
  }, [fetchReturns]);

  const runAction = async (id, fn, successMessage) => {
    try {
      await fn(id);
      toast.success(successMessage);
      await fetchReturns();
    } catch (error) {
      toast.error(error.message || 'Gagal memproses retur');
    }
  };

  return (
    <EntityListPage
      title="Retur Penjualan"
      actions={{
        left: [{ label: '+ Tambah Retur Penjualan', variant: 'primary', onClick: () => navigate('/sales/returns/new') }]
      }}
      table={(props) => (
        <SalesReturnTable
          {...props}
          loading={loading}
          onView={(id) => navigate(`/sales/returns/${id}`)}
          onApprove={isOwner ? (id) => runAction(id, SalesReturnRepository.approve, 'Retur penjualan berhasil disetujui.') : undefined}
          onReceive={isOwner ? (id) => runAction(id, SalesReturnRepository.receive, 'Retur penjualan berhasil diterima.') : undefined}
        />
      )}
      data={data}
      pagination={{ currentPage: page, totalPages }}
      onPageChange={setPage}
    />
  );
};

export default SalesReturnList;
