import React, { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { Package, RefreshCw, Truck } from 'lucide-react';

const SalesVehicleStock = () => {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (showSpinner) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data, error: err } = await supabase
        .from('SalesStockProjection')
        .select('product_id, qty_available, qty_damaged, qty_expired, last_update, product:Product(id, code, name, unit:Unit(name))')
        .order('qty_available', { ascending: false });
      if (err) throw err;
      setRows(data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Gagal memuat stok kendaraan');
    } finally {
      setLoading(false);
      if (showSpinner) setRefreshing(false);
    }
  };

  useEffect(() => {
    load(false);
  }, []);

  const total = rows.reduce((a, r) => a + (Number(r.qty_available) || 0), 0);
  const totalDamaged = rows.reduce((a, r) => a + (Number(r.qty_damaged) || 0), 0);
  const totalExpired = rows.reduce((a, r) => a + (Number(r.qty_expired) || 0), 0);

  return (
    <div className="page-mobile">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={20} /> Stok Kendaraan
        </h3>
        <button
          className="mobile-icon-btn"
          aria-label="Muat ulang"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="loading-screen">Memuat stok...</div>
      ) : error ? (
        <div className="alert-error">{error}</div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
            <div className="card-custom" style={{ textAlign: 'center', padding: '10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--primary)' }}>{total}</div>
              <small style={{ color: 'var(--text-muted)' }}>Baik</small>
            </div>
            <div className="card-custom" style={{ textAlign: 'center', padding: '10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--warning)' }}>{totalDamaged}</div>
              <small style={{ color: 'var(--text-muted)' }}>Rusak</small>
            </div>
            <div className="card-custom" style={{ textAlign: 'center', padding: '10px' }}>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--danger)' }}>{totalExpired}</div>
              <small style={{ color: 'var(--text-muted)' }}>Expired</small>
            </div>
          </div>

          {rows.length === 0 ? (
            <div className="card-custom" style={{ textAlign: 'center', padding: '32px' }}>
              <Package size={32} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
              <p className="text-muted" style={{ margin: 0 }}>Belum ada stok tercatat di kendaraan.</p>
            </div>
          ) : (
            <div className="card-custom" style={{ padding: '0' }}>
              {rows.map((r, i) => (
                <div
                  key={r.product_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none',
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: '600', fontSize: '14px' }}>{r.product?.name || `Produk #${r.product_id}`}</p>
                    <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '12px' }}>
                      {r.product?.code || ''}{r.product?.unit?.name ? ` • ${r.product.unit.name}` : ''}
                    </p>
                    {(Number(r.qty_damaged) > 0 || Number(r.qty_expired) > 0) && (
                      <p style={{ margin: 0, fontSize: '11px', color: 'var(--warning)' }}>
                        {Number(r.qty_damaged) > 0 && `${r.qty_damaged} rusak`}
                        {Number(r.qty_damaged) > 0 && Number(r.qty_expired) > 0 && ' • '}
                        {Number(r.qty_expired) > 0 && `${r.qty_expired} expired`}
                      </p>
                    )}
                  </div>
                  <span
                    style={{
                      fontWeight: 'bold',
                      fontSize: '16px',
                      color: Number(r.qty_available) > 0 ? 'var(--success)' : 'var(--text-muted)',
                    }}
                  >
                    {r.qty_available}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default SalesVehicleStock;
