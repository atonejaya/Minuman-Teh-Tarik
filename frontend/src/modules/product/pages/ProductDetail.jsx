import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProduct } from '../hooks/useProduct';
import EntityDetailPage from '../../../components/entity/EntityDetailPage';
import { supabase } from '../../../utils/supabase';
import { formatRupiah, formatDate } from '../../../utils/format';
import { tableCell, tableHeader } from '../../../utils/tableStyles.js';

const CELL = tableCell;
const TH = tableHeader;
const PAYMENT_LABELS = { PAID: 'Lunas', PARTIAL: 'Sebagian', UNPAID: 'Belum Lunas', COMPLETED: 'Selesai', CANCELLED: 'Dibatalkan' };

const OverviewTab = ({ product }) => {
  const rows = [
    ['Kode Produk', product.code || '-'],
    ['Kategori', product.category?.name || '-'],
    ['Satuan', product.unit?.name || '-'],
  ];
  return (
    <div className="card-custom" style={{ maxWidth: '640px', padding: '20px' }}>
      {rows.map(([label, value]) => (
        <div key={label} className="summary-row">
          <span>{label}</span>
          <span style={{ fontWeight: '600' }}>{value}</span>
        </div>
      ))}
    </div>
  );
};

const PricingStockTab = ({ product }) => {
  const rows = [
    ['HPP (Modal)', formatRupiah(product.cost_price)],
    ['Harga Jual', formatRupiah(product.selling_price)],
    ['Status', product.is_active ? 'Aktif' : 'Nonaktif'],
  ];
  return (
    <div className="card-custom" style={{ maxWidth: '640px', padding: '20px' }}>
      {rows.map(([label, value]) => (
        <div key={label} className="summary-row">
          <span>{label}</span>
          <span style={{ fontWeight: '600' }}>{value}</span>
        </div>
      ))}
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

  if (loading) return <p className="empty-hint">Memuat...</p>;
  if (items.length === 0) return <p className="empty-hint">Belum ada transaksi penjualan untuk produk ini.</p>;

  return (
    <div className="card-custom">
      <h5 style={{ margin: 0, padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>Riwayat Penjualan (20 terakhir)</h5>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ backgroundColor: 'var(--background)' }}>
            <tr>
              <th style={TH}>Tanggal</th>
              <th style={TH}>Faktur</th>
              <th style={TH}>Warung</th>
              <th style={TH}>Qty</th>
              <th style={TH}>Harga</th>
              <th style={TH}>Subtotal</th>
              <th style={TH}>Status Bayar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td style={CELL}>{formatDate(it.sales_transaction?.created_at)}</td>
                <td style={{ ...CELL, fontWeight: '500' }}>{it.sales_transaction?.code || '-'}</td>
                <td style={CELL}>{it.sales_transaction?.warung?.name || '-'}</td>
                <td style={CELL}>{it.qty}</td>
                <td style={CELL}>{formatRupiah(it.selling_price)}</td>
                <td style={{ ...CELL, fontWeight: '600' }}>{formatRupiah(it.selling_price * it.qty)}</td>
                <td style={CELL}>{PAYMENT_LABELS[it.sales_transaction?.payment_status] || it.sales_transaction?.payment_status || '-'}</td>
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
