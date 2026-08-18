import React, { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';
import { useNavigate } from 'react-router-dom';
import { formatRupiah } from '../../../utils/format.js';
import { AlertTriangle, PackageCheck, Banknote } from 'lucide-react';

const KpiCard = ({ label, value, color = 'var(--primary)', link }) => (
  <div className="card kpi-card">
    <h3 style={{ color: 'var(--text-muted)', fontSize: '13px', fontWeight: '600', textTransform: 'uppercase' }}>{label}</h3>
    <div style={{ fontSize: '26px', fontWeight: 'bold', color, marginTop: '8px' }}>{value}</div>
    {link}
  </div>
);

export const OwnerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const toLocalDateStr = (d) => {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${y}-${m}-${day}`;
        };

        const today = new Date();
        const todayStr = toLocalDateStr(today);
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const [
          salesRes,
          arRes,
          kasSalesRes,
          kasOwnerRes,
          visitsRes,
          warehouseRes,
          salesStockRes,
          outletStockRes,
          last7Res,
          pendingReturnsRes,
          pendingStockReqRes,
          pendingSetoranRes,
        ] = await Promise.all([
          supabase
            .from('SalesTransaction')
            .select('grand_total')
            .eq('status', 'CONFIRMED')
            .gte('created_at', `${todayStr}T00:00:00`)
            .lte('created_at', `${todayStr}T23:59:59`),
          supabase
            .from('AccountsReceivableProjection')
            .select('outstanding_amount')
            .gt('outstanding_amount', 0)
            .limit(5000),
          supabase
            .from('Payment')
            .select('amount')
            .eq('payment_method', 'CASH')
            .eq('status', 'PAID')
            .is('collection_id', null),
          supabase
            .from('Collection')
            .select('items:CollectionItem(payment_amount)')
            .eq('status', 'COMPLETED')
            .limit(5000),
          supabase
            .from('SalesVisit')
            .select('id', { count: 'exact', head: true })
            .eq('visit_date', todayStr),
          supabase.from('WarehouseStock').select('qty_available').limit(5000),
          supabase.from('SalesStockProjection').select('qty_available').limit(5000),
          supabase.from('OutletStockProjection').select('current_stock').limit(5000),
          supabase
            .from('SalesTransaction')
            .select('created_at, grand_total')
            .eq('status', 'CONFIRMED')
            .gte('created_at', `${toLocalDateStr(sevenDaysAgo)}T00:00:00`)
            .order('created_at', { ascending: true })
            .limit(10000),
          supabase.from('SalesReturn').select('id', { count: 'exact', head: true }).eq('status', 'DRAFT'),
          supabase.from('StockRequest').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
          supabase.from('Collection').select('id', { count: 'exact', head: true }).eq('status', 'PENDING'),
        ]);

        const sum = (list, key) => (list || []).reduce((acc, r) => acc + (Number(r[key]) || 0), 0);

        const omzetToday = sum(salesRes.data, 'grand_total');
        const piutang = sum(arRes.data, 'outstanding_amount');
        const kasSales = sum(kasSalesRes.data, 'amount');
        const kasOwner = (kasOwnerRes.data || []).reduce(
          (acc, c) => acc + sum(c.items, 'payment_amount'),
          0
        );

        const daily = {};
        for (let i = 0; i < 7; i++) {
          const d = new Date(sevenDaysAgo);
          d.setDate(sevenDaysAgo.getDate() + i);
          daily[toLocalDateStr(d)] = 0;
        }
        for (const row of last7Res.data || []) {
          const day = toLocalDateStr(new Date(row.created_at));
          if (day in daily) daily[day] += Number(row.grand_total) || 0;
        }

        setData({
          omzetToday,
          piutang,
          kasSales,
          kasOwner,
          stokGudang: sum(warehouseRes.data, 'qty_available'),
          stokKendaraan: sum(salesStockRes.data, 'qty_available'),
          stokWarung: sum(outletStockRes.data, 'current_stock'),
          visitsToday: visitsRes.count || 0,
          daily: Object.entries(daily).map(([date, total]) => ({ date, total })),
          pendingReturns: pendingReturnsRes.count || 0,
          pendingStockRequests: pendingStockReqRes.count || 0,
          pendingSetoran: pendingSetoranRes.count || 0,
        });
      } catch (err) {
        console.error('Failed to load owner dashboard', err);
        setError(err.message || 'Gagal memuat data dashboard');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="loading-screen">Memuat Dashboard Eksekutif...</div>;

  if (error || !data) {
    return (
      <div className="owner-dashboard">
        <div className="alert alert-error" style={{ margin: '24px' }}>
          {error || 'Gagal memuat data dashboard'}
        </div>
      </div>
    );
  }

  const maxDaily = Math.max(1, ...(data.daily || []).map((d) => d.total));
  const totalPending = data.pendingReturns + data.pendingStockRequests + data.pendingSetoran;

  return (
    <div className="owner-dashboard">
      {totalPending > 0 && (
        <div className="card" style={{ marginBottom: '24px', padding: '20px' }}>
          <h3 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} color="var(--danger)" /> Perlu Tindakan
          </h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/sales/returns')}
              style={{
                flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={18} color="#DC2626" />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Retur</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: data.pendingReturns > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>{data.pendingReturns}</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/stock-requests')}
              style={{
                flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--warning)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <PackageCheck size={18} color="#D97706" />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Permintaan Stok</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: data.pendingStockRequests > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>{data.pendingStockRequests}</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/setoran')}
              style={{
                flex: '1 1 160px', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 16px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--surface)', cursor: 'pointer', textAlign: 'left',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--success)'}
              onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
            >
              <div style={{ width: '36px', height: '36px', borderRadius: '8px', backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Banknote size={18} color="#059669" />
              </div>
              <div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Setoran</div>
                <div style={{ fontSize: '18px', fontWeight: '700', color: data.pendingSetoran > 0 ? 'var(--success)' : 'var(--text-muted)' }}>{data.pendingSetoran}</div>
              </div>
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Omzet Hari Ini" value={formatRupiah(data.omzetToday)} color="var(--primary)" />
        <KpiCard label="Kas Sales (Belum Setor)" value={formatRupiah(data.kasSales)} color="var(--warning)" />
        <KpiCard label="Kas Owner" value={formatRupiah(data.kasOwner)} color="var(--success)" />
        <KpiCard label="Piutang Berjalan" value={formatRupiah(data.piutang)} color="var(--danger)" />
        <KpiCard label="Stok Gudang" value={`${data.stokGudang.toLocaleString('id-ID')} cup`} color="var(--secondary)" link={<a href="/stok?tab=gudang" onClick={(e) => { e.preventDefault(); navigate('/stok?tab=gudang'); }}>Lihat</a>} />
        <KpiCard label="Stok Kendaraan" value={`${data.stokKendaraan.toLocaleString('id-ID')} cup`} color="var(--warning)" link={<a href="/stok?tab=kendaraan" onClick={(e) => { e.preventDefault(); navigate('/stok?tab=kendaraan'); }}>Lihat</a>} />
        <KpiCard label="Stok Warung" value={`${data.stokWarung.toLocaleString('id-ID')} cup`} color="var(--primary)" link={<a href="/stok?tab=warung" onClick={(e) => { e.preventDefault(); navigate('/stok?tab=warung'); }}>Lihat</a>} />
      </div>

      <div className="card">
        <h3 style={{ marginBottom: '16px', fontSize: '16px', fontWeight: '600' }}>Omzet 7 Hari Terakhir</h3>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', padding: '8px 4px' }}>
          {(data.daily || []).map((d) => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
              <div
                style={{
                  width: '100%',
                  maxWidth: '48px',
                  backgroundColor: 'var(--primary)',
                  borderRadius: '6px 6px 0 0',
                  height: `${Math.max(4, (d.total / maxDaily) * 100)}%`,
                }}
              />
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                {new Date(d.date).toLocaleDateString('id-ID', { weekday: 'short' })}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
