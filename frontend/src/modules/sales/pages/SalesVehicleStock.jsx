import React, { useEffect, useState, useCallback } from 'react';
import { Package, RefreshCw, Truck, Undo2 } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/toast/ToastContext';

const SalesVehicleStock = () => {
  const { user } = useAuth();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [returning, setReturning] = useState(false);
  const [form, setForm] = useState({});

  const load = useCallback(async (showSpinner) => {
    if (showSpinner) setRefreshing(true);
    try {
      const { data, error: err } = await supabase
        .from('SalesStockProjection')
        .select('product_id, qty_available, qty_damaged, qty_expired, last_update, product:Product(id, code, name, unit:Unit(name))')
        .eq('sales_id', user.id)
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
  }, [user.id]);

  useEffect(() => {
    load(false);
  }, [load]);

  const latestIssue = async () => {
    const { data, error } = await supabase
      .from('SalesStockIssue')
      .select('id, warehouse_id')
      .eq('sales_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data || null;
  };

  const openReturn = () => {
    setForm({});
    setReturnOpen(true);
  };

  const updateQty = (productId, field, value) => {
    setForm((prev) => ({
      ...prev,
      [productId]: { ...(prev[productId] || { good: 0, damaged: 0, expired: 0 }), [field]: Math.max(0, Math.floor(Number(value) || 0)) },
    }));
  };

  const handleReturn = async () => {
    const items = [];
    for (const row of rows) {
      const f = form[row.product_id] || {};
      const good = Number(f.good) || 0;
      const damaged = Number(f.damaged) || 0;
      const expired = Number(f.expired) || 0;
      const total = good + damaged + expired;
      if (total <= 0) continue;
      if (total > Number(row.qty_available) + Number(row.qty_damaged) + Number(row.qty_expired)) {
        toast.error(`Qty retur ${row.product?.name || 'produk'} melebihi sisa stok.`);
        return;
      }
      if (good > 0) items.push({ product_id: row.product_id, qty: good, condition: 'GOOD' });
      if (damaged > 0) items.push({ product_id: row.product_id, qty: damaged, condition: 'DAMAGED' });
      if (expired > 0) items.push({ product_id: row.product_id, qty: expired, condition: 'EXPIRED' });
    }
    if (items.length === 0) {
      toast.error('Belum ada qty yang diretur.');
      return;
    }

    let issue = null;
    try {
      issue = await latestIssue();
    } catch (err) {
      toast.error(err.message || 'Gagal memuat data gudang');
      return;
    }
    if (!issue || !issue.warehouse_id) {
      toast.error('Belum ada pengeluaran stok untuk sales ini. Tidak bisa retur.');
      return;
    }

    setReturning(true);
    try {
      const { error } = await supabase.rpc('sales_stock_return', {
        p_payload: {
          sales_id: user.id,
          warehouse_id: issue.warehouse_id,
          return_date: new Date().toISOString().slice(0, 10),
          issue_id: issue.id,
          items,
        },
      });
      if (error) throw error;
      toast.success('Retur sisa stok berhasil dikembalikan ke gudang.');
      setReturnOpen(false);
      setForm({});
      load(false);
    } catch (err) {
      toast.error(err.message || 'Gagal memproses retur');
    } finally {
      setReturning(false);
    }
  };

  const total = rows.reduce((a, r) => a + (Number(r.qty_available) || 0), 0);
  const totalDamaged = rows.reduce((a, r) => a + (Number(r.qty_damaged) || 0), 0);
  const totalExpired = rows.reduce((a, r) => a + (Number(r.qty_expired) || 0), 0);

  return (
    <div className="page-mobile">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={20} /> Stok Kendaraan
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            className="mobile-icon-btn"
            aria-label="Retur sisa stok"
            onClick={openReturn}
            disabled={rows.length === 0}
            title="Retur sisa stok ke gudang"
          >
            <Undo2 size={18} />
          </button>
          <button
            className="mobile-icon-btn"
            aria-label="Muat ulang"
            onClick={() => load(true)}
            disabled={refreshing}
          >
            <RefreshCw size={18} className={refreshing ? 'spin' : ''} />
          </button>
        </div>
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
                      {r.product?.code || ''}{r.product?.code ? ' • ' : ''}cup
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

      {returnOpen && (
        <div className="modal-backdrop" onClick={() => setReturnOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '85vh', overflowY: 'auto' }}>
            <h4 style={{ margin: 0, marginBottom: '4px' }}>Retur Sisa Stok</h4>
            <p className="text-muted" style={{ marginBottom: '12px', fontSize: '13px' }}>
              Sisa stok dikembalikan ke gudang. Nilai sudah terisi dari stok tercatat; sesuaikan bila ada yang rusak/expired.
            </p>

            {rows.map((r) => {
              const f = form[r.product_id] || {};
              const good = f.good ?? (Number(r.qty_available) || 0);
              const damaged = f.damaged ?? (Number(r.qty_damaged) || 0);
              const expired = f.expired ?? (Number(r.qty_expired) || 0);
              const maxTotal = Number(r.qty_available) + Number(r.qty_damaged) + Number(r.qty_expired);
              const rowTotal = (Number(good) || 0) + (Number(damaged) || 0) + (Number(expired) || 0);
              return (
                <div key={r.product_id} style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600' }}>{r.product?.name || '-'}</span>
                    <span style={{ fontSize: '12px', color: rowTotal > maxTotal ? 'var(--danger)' : 'var(--text-muted)' }}>
                      {rowTotal} / {maxTotal}
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <small style={{ color: 'var(--text-muted)' }}>Baik</small>
                      <input
                        type="number"
                        min="0"
                        max={Number(r.qty_available) + Number(r.qty_damaged) + Number(r.qty_expired)}
                        className="wizard-input"
                        style={{ width: '100%' }}
                        value={good}
                        onChange={(e) => updateQty(r.product_id, 'good', e.target.value)}
                      />
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-muted)' }}>Rusak</small>
                      <input
                        type="number"
                        min="0"
                        max={maxTotal}
                        className="wizard-input"
                        style={{ width: '100%' }}
                        value={damaged}
                        onChange={(e) => updateQty(r.product_id, 'damaged', e.target.value)}
                      />
                    </div>
                    <div>
                      <small style={{ color: 'var(--text-muted)' }}>Expired</small>
                      <input
                        type="number"
                        min="0"
                        max={maxTotal}
                        className="wizard-input"
                        style={{ width: '100%' }}
                        value={expired}
                        onChange={(e) => updateQty(r.product_id, 'expired', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
              <button className="btn-secondary" style={{ flex: 1 }} onClick={() => setReturnOpen(false)} disabled={returning}>Batal</button>
              <button className="btn-primary" style={{ flex: 1 }} onClick={handleReturn} disabled={returning}>
                {returning ? 'Memproses...' : 'Konfirmasi Retur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesVehicleStock;
