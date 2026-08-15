import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';

const TABS = [
  { key: 'gudang', label: 'Gudang' },
  { key: 'kendaraan', label: 'Kendaraan' },
  { key: 'warung', label: 'Warung' },
];

const cell = { padding: '12px 16px', fontSize: '14px', borderBottom: '1px solid var(--border)', textAlign: 'left' };

const fmtQty = (n) => `${(Number(n) || 0).toLocaleString('id-ID')} cup`;

const Section = ({ title, rows, qtyKey }) => {
  const total = rows.reduce((a, r) => a + (Number(r[qtyKey]) || 0), 0);
  return (
    <>
      <div className="stok-section-title">
        <strong>{title}</strong>
        <span className="stok-total">{fmtQty(total)}</span>
      </div>
      {rows.length === 0 ? (
        <p style={{ padding: '16px', color: 'var(--text-muted)' }}>Tidak ada data.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead style={{ backgroundColor: 'var(--background)' }}>
            <tr>
              <th style={cell}>Produk</th>
              <th style={cell}>Qty</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={`${r.group}-${r.product_id}`}>
                <td style={{ ...cell, fontWeight: '500' }}>
                  {r.group ? `${r.group} — ` : ''}{r.product?.name || '-'}
                </td>
                <td style={{ ...cell, fontWeight: '600' }}>{fmtQty(r[qtyKey])}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
};

const StokDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'gudang';
  const [data, setData] = useState({ gudang: [], kendaraan: [], warung: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [gudang, kendaraan, warung] = await Promise.all([
          supabase
            .from('WarehouseStock')
            .select('*, product:Product(name), warehouse:Warehouse(name)')
            .limit(5000),
          supabase
            .from('SalesStockProjection')
            .select('*, product:Product(name), sales:User(name)')
            .limit(5000),
          supabase
            .from('OutletStockProjection')
            .select('*, product:Product(name), warung:Warung(name)')
            .limit(5000),
        ]);
        for (const res of [gudang, kendaraan, warung]) if (res.error) throw res.error;
        setData({
          gudang: (gudang.data || []).map((r) => ({ ...r, group: r.warehouse?.name })),
          kendaraan: (kendaraan.data || []).map((r) => ({ ...r, group: r.sales?.name })),
          warung: (warung.data || []).map((r) => ({ ...r, group: r.warung?.name })),
        });
      } catch (err) {
        setError(err.message || 'Gagal memuat stok');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) return <div className="loading-screen">Memuat stok...</div>;
  if (error) return <div className="alert alert-danger m-3" role="alert">{error}</div>;

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: '16px' }}>Pantauan Stok (cup)</h2>
      <div className="stok-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`stok-tab ${tab === t.key ? 'active' : ''}`}
            onClick={() => setSearchParams({ tab: t.key })}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="stok-panel">
        {tab === 'gudang' && <Section title="Stok Gudang Pusat" rows={data.gudang} qtyKey="qty_available" />}
        {tab === 'kendaraan' && <Section title="Stok Kendaraan Sales" rows={data.kendaraan} qtyKey="qty_available" />}
        {tab === 'warung' && <Section title="Stok Titipan Warung" rows={data.warung} qtyKey="current_stock" />}
      </div>
    </div>
  );
};

export default StokDashboard;
