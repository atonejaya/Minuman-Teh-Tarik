import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import { SalesTransactionRepository } from '../../../repositories/SalesTransactionRepository';
import StatusBadge from '../../../components/shared/StatusBadge';

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

const PAYMENT_METHOD_LABELS = {
  CASH: 'Tunai', TRANSFER: 'Transfer', CREDIT: 'Kredit (Piutang)', EDC: 'EDC', QRIS: 'QRIS',
};

const InfoRow = ({ label, value }) => (
  <p><strong>{label}:</strong> {value || '-'}</p>
);

const SalesTransactionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const result = await SalesTransactionRepository.fetchById(id);
        setData(result.data);
      } catch (err) {
        setError(err.message || 'Gagal memuat transaksi');
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
          <InfoRow label="No. Transaksi" value={data?.code} />
          <InfoRow label="Warung" value={data?.customer_name} />
          <InfoRow label="Sales" value={data?.salesman_name} />
          <InfoRow label="Tanggal" value={data?.created_at ? new Date(data.created_at).toLocaleString('id-ID') : null} />
          <InfoRow label="Status Pesanan" value={STATUS_LABELS[data?.status] || data?.status} />
          <InfoRow label="Status Pembayaran" value={STATUS_LABELS[data?.payment_status] || data?.payment_status} />
          <InfoRow label="Metode Pembayaran" value={PAYMENT_METHOD_LABELS[data?.payment_method] || data?.payment_method} />
          <InfoRow label="Jatuh Tempo" value={data?.due_date ? new Date(data.due_date).toLocaleDateString('id-ID') : null} />
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
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Harga</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{item.product_name || item.product?.name || '-'}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{item.qty}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{formatCurrency(item.selling_price)}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{formatCurrency(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p>Tidak ada item.</p>
    },
    {
      id: 'payments',
      label: 'Pembayaran',
      content: data?.payments && data.payments.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table className="entity-table" style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Kode</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Tanggal</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Metode</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Jumlah</th>
                <th style={{ borderBottom: '1px solid #ddd', padding: '8px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{payment.code}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('id-ID') : '-'}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}>{formatCurrency(payment.amount)}</td>
                  <td style={{ borderBottom: '1px solid #eee', padding: '8px' }}><StatusBadge status={payment.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p>Belum ada pembayaran tercatat.</p>
    },
    {
      id: 'financial',
      label: 'Keuangan',
      content: (
        <div className="tab-section">
          <h3>Ringkasan Keuangan</h3>
          <InfoRow label="Subtotal" value={formatCurrency(data?.subtotal)} />
          <InfoRow label="Diskon" value={formatCurrency((data?.item_discount || 0) + (data?.transaction_discount || 0))} />
          <InfoRow label="Pajak" value={formatCurrency(data?.tax)} />
          <InfoRow label="Total" value={formatCurrency(data?.grand_total)} />
          <InfoRow label="Jumlah Dibayar" value={formatCurrency(data?.paid_amount)} />
          <InfoRow label="Sisa" value={formatCurrency(data?.outstanding_amount)} />
        </div>
      )
    }
  ];

  const summary = data ? (
    <div>
      <span className="badge bg-primary me-2">{STATUS_LABELS[data.status] || data.status}</span>
      <span className="badge bg-warning">{STATUS_LABELS[data.payment_status] || data.payment_status}</span>
      <span className="ms-2"><strong>{data.customer_name}</strong> — {formatCurrency(data.grand_total)}</span>
    </div>
  ) : null;

  return (
    <EntityDetailPage
      title="Detail Transaksi Penjualan"
      summary={summary}
      tabs={tabs}
      actions={{
        left: [{ label: 'Kembali ke Daftar', variant: 'outline', onClick: () => navigate('/sales/transactions') }]
      }}
    />
  );
};

export default SalesTransactionDetail;
