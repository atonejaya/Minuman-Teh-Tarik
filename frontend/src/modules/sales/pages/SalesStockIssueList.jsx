import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, CheckCircle, XCircle } from 'lucide-react';
import EntityListPage from '../../../components/entity/EntityListPage';
import SalesStockIssueRepository from '../../../repositories/SalesStockIssueRepository';
import { useToast } from '../../../components/toast/ToastContext';
import TableMessage from '../../../components/shared/TableMessage';
import StatusBadge from '../../../components/shared/StatusBadge';
import { tableCell } from '../../../utils/tableStyles.js';

const iconBtnStyle = (color) => ({
  padding: '6px',
  borderRadius: '6px',
  color,
  backgroundColor: 'transparent',
  border: 'none',
  cursor: 'pointer',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s',
});

const SalesStockIssueTable = ({ data, loading, onView, onEdit, onDelete, onConfirm, onClose }) => {
  if (loading) return <TableMessage>Memuat...</TableMessage>;
  if (!data || data.length === 0) return <TableMessage>Tidak ada mutasi stok.</TableMessage>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            <th style={tableCell}>No. Mutasi</th>
            <th style={tableCell}>Tanggal</th>
            <th style={tableCell}>Sales</th>
            <th style={tableCell}>Gudang</th>
            <th style={tableCell}>Total Qty</th>
            <th style={tableCell}>Status</th>
            <th style={{ ...tableCell, width: '140px', textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td style={{ ...tableCell, fontWeight: '500' }}>{item.issue_number}</td>
              <td style={tableCell}>{new Date(item.issue_date).toLocaleDateString('id-ID')}</td>
              <td style={tableCell}>{item.sales?.name || '-'}</td>
              <td style={tableCell}>{item.warehouse?.name || '-'}</td>
              <td style={tableCell}>{item.total_qty}</td>
              <td style={tableCell}><StatusBadge status={item.status} /></td>
              <td style={{ ...tableCell, textAlign: 'center' }}>
                <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                  <button title="Lihat" style={iconBtnStyle('var(--primary)')} onClick={() => onView(item.id)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--primary) 10%, transparent)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                    <Eye size={15} />
                  </button>
                  {item.status === 'DRAFT' && (
                    <>
                      <button title="Konfirmasi" style={iconBtnStyle('var(--success)')} onClick={() => onConfirm(item.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--success) 10%, transparent)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <CheckCircle size={15} />
                      </button>
                      <button title="Ubah" style={iconBtnStyle('var(--warning)')} onClick={() => onEdit(item.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--warning) 10%, transparent)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <Pencil size={15} />
                      </button>
                      <button title="Hapus" style={iconBtnStyle('var(--danger)')} onClick={() => onDelete(item.id)}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--danger) 10%, transparent)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                  {item.status === 'CONFIRMED' && (
                    <button title="Tutup" style={iconBtnStyle('var(--secondary)')} onClick={() => onClose(item.id)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--secondary) 10%, transparent)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SalesStockIssueList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    try {
      const result = await SalesStockIssueRepository.getSalesStockIssues({ page, pageSize: 20 });
      setData(result.data || []);
      setTotalPages(result.meta?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch sales stock issues', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchIssues(); }, [fetchIssues]);

  const handleConfirm = async (id) => {
    try {
      await SalesStockIssueRepository.confirmSalesStockIssue(id);
      toast.success('Mutasi stok berhasil dikonfirmasi.');
      fetchIssues();
    } catch (error) {
      toast.error(error.message || 'Gagal mengonfirmasi mutasi stok');
    }
  };

  const handleClose = async (id) => {
    try {
      await SalesStockIssueRepository.closeSalesStockIssue(id);
      toast.success('Mutasi stok berhasil ditutup.');
      fetchIssues();
    } catch (error) {
      toast.error(error.message || 'Gagal menutup mutasi stok');
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus mutasi stok ini?')) {
      try {
        await SalesStockIssueRepository.deleteSalesStockIssue(id);
        toast.success('Mutasi stok berhasil dihapus.');
        fetchIssues();
      } catch (error) {
        toast.error(error.message || 'Gagal menghapus mutasi stok');
      }
    }
  };

  return (
    <EntityListPage
      title="Mutasi Stok"
      actions={{
        left: [{ icon: Plus, iconOnly: true, tooltip: 'Tambah Mutasi Stok', variant: 'primary', onClick: () => navigate('/sales/stock-issues/new') }]
      }}
      table={(props) => (
        <SalesStockIssueTable
          {...props}
          loading={loading}
          onView={(id) => navigate(`/sales/stock-issues/${id}`)}
          onEdit={(id) => navigate(`/sales/stock-issues/${id}/edit`)}
          onDelete={handleDelete}
          onConfirm={handleConfirm}
          onClose={handleClose}
        />
      )}
      data={data}
      pagination={{ currentPage: page, totalPages }}
      onPageChange={setPage}
    />
  );
};

export default SalesStockIssueList;
