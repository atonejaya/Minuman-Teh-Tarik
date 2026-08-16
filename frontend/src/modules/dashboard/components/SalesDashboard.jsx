import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../utils/supabase';
import { PlayCircle, PlusCircle } from 'lucide-react';

const fmtRp = (v) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v || 0);

export const SalesDashboard = ({ user }) => {
  const navigate = useNavigate();
  const [data, setData] = useState({ salesToday: 0, targetToday: 0, visitedToday: 0, kasDibawa: 0, stockVan: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSalesData = async () => {
      try {
        const today = new Date().toISOString().slice(0, 10);
        const localStart = new Date();
        localStart.setHours(0, 0, 0, 0);
        const localEnd = new Date(localStart);
        localEnd.setHours(23, 59, 59, 999);
        const todayStart = localStart.toISOString();
        const todayEnd = localEnd.toISOString();
        const dayName = new Date().toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();

        const [salesRes, warungRes, visitsRes, paymentRes, ledgerRes] = await Promise.all([
          supabase
            .from('SalesTransaction')
            .select('grand_total')
            .eq('sales_id', user.id)
            .eq('status', 'CONFIRMED')
            .gte('created_at', todayStart)
            .lte('created_at', todayEnd),
          supabase
            .from('Warung')
            .select('id, visit_day')
            .eq('assigned_sales_id', user.id)
            .eq('status', 'ACTIVE'),
          supabase
            .from('SalesVisit')
            .select('id', { count: 'exact', head: true })
            .eq('sales_id', user.id)
            .eq('visit_date', today)
            .in('status', ['COMPLETED', 'CHECKED_OUT', 'ORDER_CREATED', 'DELIVERED']),
          supabase
            .from('Payment')
            .select('amount')
            .eq('created_by', user.id)
            .eq('payment_method', 'CASH')
            .eq('status', 'PAID')
            .is('collection_id', null)
            .eq('payment_date', today),
          supabase
            .from('SalesStockLedger')
            .select('product_id, balance')
            .eq('sales_id', user.id)
            .order('id', { ascending: false })
            .limit(5000),
        ]);

        const assigned = warungRes.data || [];
        const targetToday = assigned.filter(
          (w) => !w.visit_day || String(w.visit_day).trim().toUpperCase() === dayName
        ).length;
        const salesToday = (salesRes.data || []).reduce((acc, r) => acc + (Number(r.grand_total) || 0), 0);
        const kasDibawa = (paymentRes.data || []).reduce((acc, r) => acc + (Number(r.amount) || 0), 0);

        const latestBalances = {};
        for (const row of ledgerRes.data || []) {
          if (!(row.product_id in latestBalances)) latestBalances[row.product_id] = Number(row.balance) || 0;
        }
        const stockVan = Object.values(latestBalances).reduce((a, b) => a + b, 0);

        setData({ salesToday, targetToday, visitedToday: visitsRes.count || 0, kasDibawa, stockVan });
      } catch (err) {
        console.error('Error fetching sales dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSalesData();
  }, [user.id]);

  if (loading) return <div className="loading-screen">Memuat Dashboard Sales...</div>;

  const progress = data.targetToday > 0 ? Math.min(100, Math.round((data.visitedToday / data.targetToday) * 100)) : 0;

  return (
    <div className="sales-dashboard">
      <div className="card-custom mb-3">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: '600', fontSize: '13px' }}>Target Hari Ini</span>
          <span className="badge bg-primary rounded-pill">{data.targetToday} Warung</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <span style={{ fontSize: '24px', fontWeight: 'bold' }}>{data.visitedToday}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}> / {data.targetToday}</span>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sudah Dikunjungi</div>
          </div>
          <div style={{ width: '100px', height: '8px', backgroundColor: 'var(--border)', borderRadius: '999px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', backgroundColor: 'var(--success)' }} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div className="card-custom" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--primary)' }}>{fmtRp(data.salesToday)}</div>
          <small style={{ color: 'var(--text-muted)' }}>Omzet Hari Ini</small>
        </div>
        <div className="card-custom" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--warning)' }}>{fmtRp(data.kasDibawa)}</div>
          <small style={{ color: 'var(--text-muted)' }}>Kas Dibawa</small>
        </div>
        <div className="card-custom" style={{ textAlign: 'center', gridColumn: '1 / -1' }}>
          <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--secondary)' }}>{data.stockVan} cup</div>
          <small style={{ color: 'var(--text-muted)' }}>Barang Tersisa di Kendaraan</small>
        </div>
      </div>

      <button
        onClick={() => navigate('/visits')}
        style={{
          width: '100%',
          padding: '16px',
          backgroundColor: 'var(--primary)',
          color: '#fff',
          borderRadius: '14px',
          fontWeight: 'bold',
          fontSize: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <PlayCircle size={20} /> MULAI KUNJUNGAN
      </button>

      <button
        onClick={() => navigate('/customers/new')}
        style={{
          width: '100%',
          padding: '14px',
          marginTop: '12px',
          backgroundColor: 'var(--surface)',
          color: 'var(--primary)',
          borderRadius: '14px',
          fontWeight: 'bold',
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          border: '1.5px solid var(--primary)',
        }}
      >
        <PlusCircle size={18} /> TAMBAH WARUNG BARU
      </button>
    </div>
  );
};
