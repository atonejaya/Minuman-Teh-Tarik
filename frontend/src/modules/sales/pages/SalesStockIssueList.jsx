import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import EntityListPage from '../../../components/entity/EntityListPage';
import SalesStockIssueRepository from '../../../repositories/SalesStockIssueRepository';
import { useToast } from '../../../components/toast/ToastContext';

const STATUS_COLORS = {
  DRAFT: '#6c757d',
  CONFIRMED: '#0d6efd',
  CLOSED: '#198754'
};

const STATUS_LABELS = {
  DRAFT: 'Draft',
  CONFIRMED: 'Terkonfirmasi',
  CLOSED: 'Ditutup'
};

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const SalesStockIssueTable = ({ data, loading, onView, onConfirm, onClose }) => {
  if (loading) {
    return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</p>;
  }

  if (!data || data.length === 0) {
    return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Tidak ada mutasi stok.</p>;
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead style={{ backgroundColor: 'var(--background)' }}>
          <tr>
            <th style={cell}>No. Mutasi</th>
            <th style={cell}>Tanggal</th>
            <th style={cell}>Sales</th>
            <th style={cell}>Gudang</th>
            <th style={cell}>Total Qty</th>
            <th style={cell}>Status</th>
            <th style={cell}>Aksi</th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <tr key={item.id}>
              <td style={{ ...cell, fontWeight: '500' }}>{item.issue_number}</td>
              <td style={cell}>{new Date(item.issue_date).toLocaleDateString('id-ID')}</td>
              <td style={cell}>{item.sales?.name || '-'}</td>
              <td style={cell}>{item.warehouse?.name || '-'}</td>
              <td style={cell}>{item.total_qty}</td>
              <td style={cell}>
                <span style={{
                  display: 'inline-block',
                  padding: '2px 10px',
                  borderRadius: '999px',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#fff',
                  backgroundColor: STATUS_COLORS[item.status] || '#6c757d'
                }}>
                  {STATUS_LABELS[item.status] || item.status}
                </span>
              </td>
              <td style={cell}>
                <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px' }} onClick={() => onView(item.id)}>
                  Lihat
                </button>
                {item.status === 'DRAFT' && (
                  <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', marginRight: '6px', backgroundColor: 'var(--success)', color: '#fff' }} onClick={() => onConfirm(item.id)}>
                    Konfirmasi
                  </button>
                )}
                {item.status === 'CONFIRMED' && (
                  <button className="btn" style={{ padding: '4px 10px', fontSize: '12px', backgroundColor: 'var(--secondary)', color: '#fff' }} onClick={() => onClose(item.id)}>
                    Tutup
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

  useEffect(() => {
    fetchIssues();
  }, [fetchIssues]);

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

  return (
    <EntityListPage
      title="Mutasi Stok"
      actions={{
        left: [{ label: '+ Tambah Mutasi Stok', variant: 'primary', onClick: () => navigate('/sales/stock-issues/new') }]
      }}
      table={(props) => (
        <SalesStockIssueTable
          {...props}
          loading={loading}
          onView={(id) => navigate(`/sales/stock-issues/${id}`)}
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
