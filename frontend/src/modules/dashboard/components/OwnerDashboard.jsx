import React, { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';

const fmtRp = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v || 0);

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

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayISO = todayStart.toISOString();
        const sevenDaysAgo = new Date(todayStart);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

        const [
          salesRes,
          arRes,
          kasSalesRes,
          kasOwnerRes,
          visitsRes,
          warehouseRes,
          last7Res,
        ] = await Promise.all([
          supabase
            .from('SalesTransaction')
            .select('grand_total')
            .not('status', 'eq', 'CANCELLED')
            .gte('created_at', todayISO),
          supabase.from('AccountsReceivableProjection').select('outstanding_amount').limit(5000),
          supabase
            .from('Payment')
            .select('amount')
            .not('collected_by', 'is', null)
            .is('collection_id', null),
          supabase
            .from('Collection')
            .select('items:CollectionItem(payment_amount)')
            .eq('status', 'COMPLETED')
            .limit(5000),
          supabase
            .from('SalesVisit')
            .select('id', { count: 'exact', head: true })
            .gte('visit_date', todayISO.slice(0, 10)),
          supabase.from('WarehouseStock').select('qty_available').limit(5000),
          supabase
            .from('SalesTransaction')
            .select('created_at, grand_total')
            .not('status', 'eq', 'CANCELLED')
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true })
            .limit(10000),
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
          daily[d.toISOString().slice(0, 10)] = 0;
        }
        for (const row of last7Res.data || []) {
          const day = new Date(row.created_at).toISOString().slice(0, 10);
          if (day in daily) daily[day] += Number(row.grand_total) || 0;
        }

        setData({
          omzetToday,
          piutang,
          kasSales,
          kasOwner,
          stokGudang: sum(warehouseRes.data, 'qty_available'),
          visitsToday: visitsRes.count || 0,
          daily: Object.entries(daily).map(([date, total]) => ({ date, total })),
        });
      } catch (err) {
        console.error('Failed to load owner dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  if (loading) return <div className="loading-screen">Memuat Dashboard Eksekutif...</div>;

  const maxDaily = Math.max(1, ...(data.daily || []).map((d) => d.total));

  return (
    <div className="owner-dashboard">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <KpiCard label="Omzet Hari Ini" value={fmtRp(data.omzetToday)} color="var(--primary)" />
        <KpiCard label="Kas Sales (Belum Setor)" value={fmtRp(data.kasSales)} color="var(--warning)" />
        <KpiCard label="Kas Owner" value={fmtRp(data.kasOwner)} color="var(--success)" />
        <KpiCard label="Piutang Berjalan" value={fmtRp(data.piutang)} color="var(--danger)" />
        <KpiCard label="Stok Gudang" value={`${data.stokGudang.toLocaleString('id-ID')} unit`} color="var(--secondary)" />
        <KpiCard label="Visit Hari Ini" value={data.visitsToday} color="var(--primary)" />
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
