import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import WarehouseStockInRepository from '../../../repositories/WarehouseStockInRepository';
import { useToast } from '../../../components/toast/ToastContext';

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const STATUS_LABELS = {
  DRAFT: 'Draft', CONFIRMED: 'Terkonfirmasi'
};

const WarehouseStockInDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStockIn = useCallback(async () => {
    setLoading(true);
    try {
      const result = await WarehouseStockInRepository.getStockIn(id);
      setData(result.data);
    } catch (error) {
      console.error('Failed to load stock in detail', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchStockIn();
  }, [fetchStockIn]);

  if (loading) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</div>;
  if (!data) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Dokumen Tidak Ditemukan</div>;

  const handleConfirm = async () => {
    try {
      await WarehouseStockInRepository.confirmStockIn(data.id);
      toast.success('Barang masuk berhasil dikonfirmasi. Stok gudang telah bertambah.');
      fetchStockIn();
    } catch (error) {
      toast.error(error.message || 'Gagal mengonfirmasi barang masuk');
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
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>No. Dokumen</p>
              <p style={{ fontWeight: '500' }}>{data.doc_number}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Tanggal Masuk</p>
              <p style={{ fontWeight: '500' }}>{new Date(data.doc_date).toLocaleDateString('id-ID')}</p>
            </div>
            <div>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Gudang Tujuan</p>
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
            <button className="btn" style={{ backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={() => navigate('/sales/stock-in')}>Kembali</button>
          </div>
        </div>
      )
    },
    {
      id: 'items',
      label: 'Daftar Produk',
      content: (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead style={{ backgroundColor: 'var(--background)' }}>
              <tr>
                <th style={cell}>Produk</th>
                <th style={cell}>Qty</th>
                <th style={cell}>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {(data.items || []).map((item, index) => (
                <tr key={index}>
                  <td style={cell}>{item.product?.name || '-'}</td>
                  <td style={cell}>{item.qty}</td>
                  <td style={cell}>{item.remark || '-'}</td>
                </tr>
              ))}
              {(!data.items || data.items.length === 0) && (
                <tr>
                  <td colSpan="3" style={{ ...cell, textAlign: 'center' }}>Tidak ada item</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )
    }
  ];

  return <EntityDetailPage title={`Barang Masuk (Produksi): ${data.doc_number}`} tabs={tabs} />;
};

export default WarehouseStockInDetail;
