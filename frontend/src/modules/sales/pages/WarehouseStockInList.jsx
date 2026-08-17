import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EntityListPage from '../../../components/entity/EntityListPage';
import WarehouseStockInRepository from '../../../repositories/WarehouseStockInRepository';
import { useToast } from '../../../components/toast/ToastContext';
import TableMessage from '../../../components/shared/TableMessage';
import StatusBadge from '../../../components/shared/StatusBadge';
import { tableCell } from '../../../utils/tableStyles.js';

const WarehouseStockInTable = ({ data, loading, onView, onEdit, onDelete, onConfirm }) => {
  if (loading) {
    return <TableMessage>Memuat...</TableMessage>;
  }

  if (!data || data.length === 0) {
    return <TableMessage>Tidak ada data barang masuk.</TableMessage>;
  }

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
            <th style={tableCell}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td style={{ ...tableCell, fontWeight: '500' }}>{item.doc_number}</td>
              <td style={tableCell}>{new Date(item.doc_date).toLocaleDateString('id-ID')}</td>
              <td style={tableCell}>{item.warehouse?.name || '-'}</td>
              <td style={tableCell}>{item.total_qty}</td>
              <td style={tableCell}>
                <StatusBadge status={item.status} />
              </td>
              <td style={tableCell}>
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => onView(item.id)}>
                  Lihat
                </button>
                {item.status === 'DRAFT' && (
                  <>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px', backgroundColor: 'var(--success)', color: '#fff' }} onClick={() => onConfirm(item.id)}>
                      Konfirmasi
                    </button>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px', backgroundColor: 'var(--color-bg-secondary)', color: 'var(--color-text-primary)' }} onClick={() => onEdit(item.id)}>
                      Ubah
                    </button>
                    <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px', backgroundColor: 'var(--error)', color: '#fff' }} onClick={() => { if(window.confirm('Hapus transaksi draft ini?')) onDelete(item.id); }}>
                      Hapus
                    </button>
                  </>
                )}
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

  useEffect(() => {
    fetchStockIns();
  }, [fetchStockIns]);

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
        left: [{ label: '+ Tambah Barang Masuk', variant: 'primary', onClick: () => navigate('/sales/stock-in/new') }]
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
