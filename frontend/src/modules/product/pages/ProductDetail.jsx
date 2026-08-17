import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import { supabase } from '../../../utils/supabase';
import { formatRupiah, formatDate } from '../../../utils/format';

const PAYMENT_LABELS = { PAID: 'Lunas', PARTIAL: 'Sebagian', UNPAID: 'Belum Lunas', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan' };

const OverviewTab = ({ product }) => {
  return (
    <div style={{ maxWidth: '640px' }}>
      {product.image_url && (
        <div style={{ marginBottom: '20px' }}>
          <img src={product.image_url} alt={product.name} style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain', borderRadius: '10px', border: '1px solid var(--border)' }} />
        </div>
      )}
      <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Informasi Produk</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        {[
          ['Kode Produk', product.code || '-'],
          ['Kategori', product.category?.name || '-'],
          ['Satuan', product.unit?.name || '-'],
        ].map(([label, value], i) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'var(--background)', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const PricingStockTab = ({ product }) => {
  return (
    <div style={{ maxWidth: '640px' }}>
      <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Harga & Status</h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0', border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
        {[
          ['HPP (Modal)', formatRupiah(product.cost_price)],
          ['Harga Jual', formatRupiah(product.selling_price)],
          ['Status', product.is_active ? 'Aktif' : 'Nonaktif'],
        ].map(([label, value], i) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: i % 2 === 0 ? 'var(--surface)' : 'var(--background)', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)' }}>{label}</span>
            <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-main)' }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const HistoryTab = ({ productId }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from('SalesTransactionItem')
          .select('qty, selling_price, discount, sales_transaction:SalesTransaction(id, code, created_at, payment_status, warung:Warung(name))')
          .eq('product_id', productId)
          .order('sales_transaction(created_at)', { ascending: false })
          .limit(20);
        if (error) throw error;
        if (mounted) setItems(data || []);
      } catch (err) {
        console.error('Failed to load product sales history', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [productId]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <div style={{ display: 'inline-block', width: '24px', height: '24px', border: '3px solid var(--border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <p style={{ marginTop: '12px', fontSize: '14px' }}>Memuat riwayat...</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div style={{ padding: '48px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px', opacity: 0.3 }}> </div>
        <h4 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: '600', color: 'var(--text-main)' }}>Belum Ada Penjualan</h4>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
          Produk ini belum pernah terjual.
        </p>
      </div>
    );
  }

  return (
    <div>
      <h4 style={{ margin: '0 0 14px', fontSize: '15px', fontWeight: '600', color: 'var(--text-main)' }}>Riwayat Penjualan (20 terakhir)</h4>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid var(--border)' }}>
              {['Tanggal', 'Faktur', 'Warung', 'Qty', 'Harga', 'Subtotal', 'Status Bayar'].map(h => (
                <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: '600', color: 'var(--text-muted)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '12px' }}>{formatDate(it.sales_transaction?.created_at)}</td>
                <td style={{ padding: '12px', fontWeight: '600' }}>{it.sales_transaction?.code || '-'}</td>
                <td style={{ padding: '12px' }}>{it.sales_transaction?.warung?.name || '-'}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{it.qty}</td>
                <td style={{ padding: '12px' }}>{formatRupiah(it.selling_price)}</td>
                <td style={{ padding: '12px', fontWeight: '700' }}>{formatRupiah(it.selling_price * it.qty)}</td>
                <td style={{ padding: '12px' }}>
                  <span style={{
                    display: 'inline-block',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: it.sales_transaction?.payment_status === 'PAID' ? 'rgba(var(--success-rgb, 40,167,69), 0.1)' : 'rgba(var(--warning-rgb, 255,193,7), 0.1)',
                    color: it.sales_transaction?.payment_status === 'PAID' ? 'var(--success)' : 'var(--warning)',
                  }}>
                    {PAYMENT_LABELS[it.sales_transaction?.payment_status] || it.sales_transaction?.payment_status || '-'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: product, loading, error } = useProduct(id);

  if (loading) return <p className="empty-hint">Memuat detail produk...</p>;
  if (error) return <div className="alert-error">{error}</div>;
  if (!product) return <p className="empty-hint">Produk tidak ditemukan.</p>;

  const tabs = [
    { id: 'overview', label: 'Profil', component: <OverviewTab product={product} /> },
    { id: 'pricing', label: 'Harga & Stok', component: <PricingStockTab product={product} /> },
    { id: 'history', label: 'Riwayat Penjualan', component: <HistoryTab productId={product.id} /> },
  ];

  return (
    <EntityDetailPage
      title={product.name}
      summary={
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
          <span><strong>SKU:</strong> {product.sku || '-'}</span>
          <span><strong>Kategori:</strong> {product.category?.name || '-'}</span>
          <span><strong>Status:</strong> <span className={`badge ${product.is_active ? 'badge-success' : 'badge-muted'}`}>{product.is_active ? 'Aktif' : 'Nonaktif'}</span></span>
        </div>
      }
      tabs={tabs}
      actions={{
        left: [{ label: 'Ubah', variant: 'primary', onClick: () => navigate(`/products/${product.id}/edit`) }],
      }}
    />
  );
};

export default ProductDetail;
