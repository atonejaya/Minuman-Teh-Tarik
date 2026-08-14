import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import SalesStockIssueRepository from '../../../repositories/SalesStockIssueRepository';
import { useToast } from '../../../components/toast/ToastContext';

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const STATUS_LABELS = {
  DRAFT: 'Draft', PENDING: 'Menunggu', CONFIRMED: 'Terkonfirmasi', COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan', REJECTED: 'Ditolak', APPROVED: 'Disetujui', CLOSED: 'Ditutup',
  RECEIVED: 'Diterima', PAID: 'Lunas', PARTIAL: 'Sebagian', UNPAID: 'Belum Lunas',
  ACTIVE: 'Aktif', INACTIVE: 'Nonaktif',
};

const SalesStockIssueDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchIssue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await SalesStockIssueRepository.getSalesStockIssue(id);
      setData(result.data);
    } catch (error) {
      console.error('Failed to load sales stock issue detail', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</div>;
  if (!data) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Mutasi Stok Tidak Ditemukan</div>;

  const handleConfirm = async () => {
    try {
      await SalesStockIssueRepository.confirmSalesStockIssue(data.id);
      toast.success('Mutasi stok berhasil dikonfirmasi.');
      fetchIssue();
    } catch (error) {
      toast.error(error.message || 'Gagal mengonfirmasi mutasi stok');
    }
  };

  const handleClose = async () => {
    try {
      await SalesStockIssueRepository.closeSalesStockIssue(data.id);
      toast.success('Mutasi stok berhasil ditutup.');
      fetchIssue();
    } catch (error) {
      toast.error(error.message || 'Gagal menutup mutasi stok');
    }
  };

  const tabs = [
    {
      id: 'overview',
      label: 'Ringkasan',
      content: (
        <div style={{ padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No. Mutasi</p>
              <p style={{ fontWeight: '500' }}>{data.issue_number}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Tanggal</p>
              <p style={{ fontWeight: '500' }}>{new Date(data.issue_date).toLocaleDateString('id-ID')}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Sales</p>
              <p style={{ fontWeight: '500' }}>{data.sales?.name || '-'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gudang</p>
              <p style={{ fontWeight: '500' }}>{data.warehouse?.name || '-'}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Status</p>
              <p style={{ fontWeight: '500' }}>{STATUS_LABELS[data.status] || data.status}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Qty</p>
              <p style={{ fontWeight: '500' }}>{data.total_qty}</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
            {data.status === 'DRAFT' && (
              <button className="btn btn-primary" onClick={handleConfirm}>Konfirmasi</button>
            )}
            {data.status === 'CONFIRMED' && (
              <button className="btn" style={{ backgroundColor: 'var(--secondary)', color: '#fff' }} onClick={handleClose}>Tutup</button>
            )}
            <button className="btn" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={() => navigate('/sales/stock-issues')}>Kembali</button>
          </div>
        </div>
      )
    },
    {
      id: 'items',
      label: 'Item',
      content: (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--background)' }}>
              <tr>
                <th style={cell}>Produk</th>
                <th style={cell}>Qty</th>
                <th style={cell}>Unit</th>
                <th style={cell}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((item, index) => (
                <tr key={index}>
                  <td style={cell}>{item.product?.name || '-'}</td>
                  <td style={cell}>{item.qty}</td>
                  <td style={cell}>{item.unit?.name || '-'}</td>
                  <td style={cell}>{item.remark || '-'}</td>
                </tr>
              ))}
              {(!data.items || data.items.length === 0) && (
                <tr>
                  <td colSpan="4" style={{ ...cell, textAlign: 'center' }}>Tidak ada item</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )
    },
    {
      id: 'activity',
      label: 'Aktivitas',
      content: (
        <div style={{ padding: '16px' }}>
          {(data.history || []).map((activity, index) => (
            <div key={index} style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--primary)', marginTop: '6px' }} />
              <div>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  {activity.changed_at ? new Date(activity.changed_at).toLocaleString('id-ID') : ''}
                </p>
                <p style={{ fontSize: '14px', fontWeight: '500' }}>
                  {(activity.status_from ? STATUS_LABELS[activity.status_from] || activity.status_from : 'null')} → {STATUS_LABELS[activity.status_to] || activity.status_to}
                </p>
                {activity.remarks && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{activity.remarks}</p>}
              </div>
            </div>
          ))}
          {(!data.history || data.history.length === 0) && (
            <p style={{ color: 'var(--text-muted)' }}>Tidak ada aktivitas terbaru</p>
          )}
        </div>
      )
    }
  ];

  return <EntityDetailPage title={`Mutasi Stok: ${data.issue_number}`} tabs={tabs} />;
};

export default SalesStockIssueDetail;
