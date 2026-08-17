import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import { SalesTransactionRepository } from '../../../repositories/SalesTransactionRepository';
import StatusBadge from '../../../components/shared/StatusBadge';
import TableMessage from '../../../components/shared/TableMessage';
import { openPrintWindow } from '../../../utils/printInvoice';
import { formatRupiah } from '../../../utils/format.js';

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
  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
    <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{label}</span>
    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{value || '-'}</span>
  </div>
);

const SalesTransactionDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const handlePrint = () => {
    if (!data) return;
    openPrintWindow(data);
  };

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
    return <TableMessage>Memuat...</TableMessage>;
  }

  if (error) {
    return <div className="alert alert-danger m-3" role="alert">{error}</div>;
  }

  const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' };
  const thStyle = { padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em', borderBottom: '2px solid var(--border)' };
  const tdStyle = { padding: '12px', borderBottom: '1px solid var(--border)' };

  const tabs = [
    {
      id: 'overview',
      label: 'Ringkasan',
      component: (
        <div style={{ maxWidth: '640px' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Informasi Transaksi</h4>
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
      component: data?.items && data.items.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Item</th>
                <th style={thStyle}>Qty</th>
                <th style={thStyle}>Harga</th>
                <th style={thStyle}>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => (
                <tr key={item.id}>
                  <td style={tdStyle}>{item.product_name || item.product?.name || '-'}</td>
                  <td style={tdStyle}>{item.qty}</td>
                  <td style={tdStyle}>{formatRupiah(item.selling_price)}</td>
                  <td style={{ ...tdStyle, fontWeight: '700' }}>{formatRupiah(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Tidak ada item.</p>
    },
    {
      id: 'payments',
      label: 'Pembayaran',
      component: data?.payments && data.payments.length > 0 ? (
        <div style={{ overflowX: 'auto' }}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Kode</th>
                <th style={thStyle}>Tanggal</th>
                <th style={thStyle}>Metode</th>
                <th style={thStyle}>Jumlah</th>
                <th style={thStyle}>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.payments.map((payment) => (
                <tr key={payment.id}>
                  <td style={tdStyle}>{payment.code}</td>
                  <td style={tdStyle}>{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('id-ID') : '-'}</td>
                  <td style={tdStyle}>{PAYMENT_METHOD_LABELS[payment.payment_method] || payment.payment_method}</td>
                  <td style={{ ...tdStyle, fontWeight: '700' }}>{formatRupiah(payment.amount)}</td>
                  <td style={tdStyle}><StatusBadge status={payment.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Belum ada pembayaran tercatat.</p>
    },
    {
      id: 'financial',
      label: 'Keuangan',
      component: (
        <div style={{ maxWidth: '640px' }}>
          <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Ringkasan Keuangan</h4>
          <InfoRow label="Subtotal" value={formatRupiah(data?.subtotal)} />
          <InfoRow label="Diskon" value={formatRupiah((data?.item_discount || 0) + (data?.transaction_discount || 0))} />
          <InfoRow label="Pajak" value={formatRupiah(data?.tax)} />
          <InfoRow label="Total" value={formatRupiah(data?.grand_total)} />
          <InfoRow label="Jumlah Dibayar" value={formatRupiah(data?.paid_amount)} />
          <InfoRow label="Sisa" value={formatRupiah(data?.outstanding_amount)} />
        </div>
      )
    }
  ];

  const summary = data ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
      <StatusBadge status={data.status} />
      <StatusBadge status={data.payment_status} />
      <span style={{ fontSize: '14px' }}><strong>{data.customer_name}</strong> — {formatRupiah(data.grand_total)}</span>
    </div>
  ) : null;

  return (
    <EntityDetailPage
      title="Detail Transaksi Penjualan"
      summary={summary}
      tabs={tabs}
      actions={{
        left: [{ label: 'Kembali ke Daftar', variant: 'outline', onClick: () => navigate('/sales/transactions') }],
        right: [{ label: 'Cetak Faktur', variant: 'primary', onClick: handlePrint }]
      }}
    />
  );
};

export default SalesTransactionDetail;
