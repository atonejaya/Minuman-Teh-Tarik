import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Eye, Pencil, Trash2, CheckCircle } from 'lucide-react';
import EntityListPage from '../../../components/entity/EntityListPage';
import WarehouseStockInRepository from '../../../repositories/WarehouseStockInRepository';
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

const WarehouseStockInTable = ({ data, loading, onView, onEdit, onDelete, onConfirm }) => {
  if (loading) return <TableMessage>Memuat...</TableMessage>;
  if (!data || data.length === 0) return <TableMessage>Tidak ada data barang masuk.</TableMessage>;

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            <th style={tableCell}>No. Dokumen</th>
            <th style={tableCell}>Tanggal</th>
            <th style={tableCell}>Gudang Tujuan</th>
            <th style={tableCell}>Total Qty</th>
            <th style={tableCell}>Status</th>
            <th style={{ ...tableCell, width: '120px', textAlign: 'center' }}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td style={{ ...tableCell, fontWeight: '500' }}>{item.doc_number}</td>
              <td style={tableCell}>{new Date(item.doc_date).toLocaleDateString('id-ID')}</td>
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
                      <button title="Hapus" style={iconBtnStyle('var(--danger)')} onClick={() => { if(window.confirm('Hapus transaksi draft ini?')) onDelete(item.id); }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--danger) 10%, transparent)'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <Trash2 size={15} />
                      </button>
                    </>
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

const WarehouseStockInList = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchStockIns = useCallback(async () => {
    setLoading(true);
    try {
      const result = await WarehouseStockInRepository.getStockIns({ page, pageSize: 20 });
      setData(result.data || []);
      setTotalPages(result.meta?.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch stock in data', error);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchStockIns(); }, [fetchStockIns]);

  const handleConfirm = async (id) => {
    try {
      await WarehouseStockInRepository.confirmStockIn(id);
      toast.success('Barang masuk berhasil dikonfirmasi. Stok bertambah.');
      fetchStockIns();
    } catch (error) {
      toast.error(error.message || 'Gagal mengonfirmasi barang masuk');
    }
  };

  const handleDelete = async (id) => {
    try {
      await WarehouseStockInRepository.deleteStockIn(id);
      toast.success('Draft barang masuk berhasil dihapus.');
      fetchStockIns();
    } catch (error) {
      toast.error(error.message || 'Gagal menghapus draft barang masuk');
    }
  };

  return (
    <EntityListPage
      title="Barang Masuk (Produksi)"
      actions={{
        left: [{ icon: Plus, iconOnly: true, tooltip: 'Tambah Barang Masuk', variant: 'primary', onClick: () => navigate('/sales/stock-in/new') }]
      }}
      table={(props) => (
        <WarehouseStockInTable
          {...props}
          loading={loading}
          onView={(id) => navigate(`/sales/stock-in/${id}`)}
          onEdit={(id) => navigate(`/sales/stock-in/${id}/edit`)}
          onDelete={handleDelete}
          onConfirm={handleConfirm}
        />
      )}
      data={data}
      pagination={{ currentPage: page, totalPages }}
      onPageChange={setPage}
    />
  );
};

export default WarehouseStockInList;
