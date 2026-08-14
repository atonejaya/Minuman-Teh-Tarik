import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import { SalesReturnRepository } from '../../../repositories/SalesReturnRepository';

const formatCurrency = (value) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0
  }).format(value || 0);
};

const STATUS_LABELS = {
  DRAFT: 'Draft', PENDING: 'Menunggu', CONFIRMED: 'Terkonfirmasi', COMPLETED: 'Selesai',
  CANCELLED: 'Dibatalkan', REJECTED: 'Ditolak', APPROVED: 'Disetujui', CLOSED: 'Ditutup',
  RECEIVED: 'Diterima', PAID: 'Lunas', PARTIAL: 'Sebagian', UNPAID: 'Belum Lunas',
  ACTIVE: 'Aktif', INACTIVE: 'Nonaktif',
};

const REFERENCE_TYPE_LABELS = {
  SALES: 'Penjualan Sales', SALES_TRANSACTION: 'Transaksi Penjualan', SALES_INVOICE: 'Faktur Penjualan',
  CREDIT_NOTE: 'Nota Kredit', MANUAL: 'Manual',
};

const CONDITION_LABELS = {
  GOOD: 'Baik', DAMAGED: 'Rusak / Kedaluwarsa',
};

const REASON_LABELS = {
  DAMAGED: 'Rusak', LEAKED: 'Bocor', WRONG_ITEM: 'Salah item', EXPIRED: 'Kedaluwarsa',
  NOT_SOLD: 'Tidak laku', OTHER: 'Lainnya',
};

const InfoRow = ({ label, value }) => (
  <p><strong>{label}:</strong> {value || '-'}</p>
);

const SalesReturnDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await SalesReturnRepository.fetchById(id);
        setData(result.data);
      } catch (err) {
        setError(err.message || 'Gagal memuat retur');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  if (loading) {
    return <p style={{ padding: '48px', textAlign: 'center', color: 'var(--text-muted)' }}>Memuat...</p>;
  }

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  const tabs = [
    {
      id: 'overview',
      label: 'Ringkasan',
      content: (
        <div className="tab-section">
          <h3>Ringkasan</h3>
          <InfoRow label="Kode Retur" value={data?.code} />
          <InfoRow label="Tanggal Retur" value={data?.return_date ? new Date(data.return_date).toLocaleDateString('id-ID') : null} />
          <InfoRow label="Warung" value={data?.warung?.name} />
          <InfoRow label="Tipe Referensi" value={REFERENCE_TYPE_LABELS[data?.reference_type] || data?.reference_type} />
          <InfoRow label="Status" value={STATUS_LABELS[data?.status] || data?.status} />
          <InfoRow label="Total" value={formatCurrency(data?.total_amount)} />
          <InfoRow label="Catatan" value={data?.notes} />
        </div>
      )
    },
    {
      id: 'items',
      label: 'Item',
      content: data?.items && data.items.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="entity-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Item</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Qty</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Kondisi</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Alasan</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{item.product?.name || '-'}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{item.qty}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{CONDITION_LABELS[item.condition] || item.condition}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{REASON_LABELS[item.reason] || item.reason || '-'}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p>Tidak ada item yang diretur.</p>
    }
  ];

  const summary = data ? (
    <div>
      <span className="badge bg-primary me-2">{STATUS_LABELS[data.status] || data.status}</span>
      <span className="ms-2"><strong>{data.warung?.name || '-'}</strong> — {formatCurrency(data.total_amount)}</span>
    </div>
  ) : null;

  return (
    <EntityDetailPage
      title="Detail Retur Penjualan"
      summary={summary}
      tabs={tabs}
      actions={{
        left: [{ label: 'Kembali ke Daftar', variant: 'outline', onClick: () => navigate('/sales/returns') }]
      }}
    />
  );
};

export default SalesReturnDetail;
