import React, { useState, useEffect } from 'react';
import KPIGrid from '../../../components/shared/KPIGrid';
import KPICard from '../../../components/shared/KPICard';
import StatusBadge from '../../../components/shared/StatusBadge';
import { supabase } from '../../../utils/supabase';
import './PiutangDashboard.css';

const PriorityList = ({ title, items, icon, colorClass }) => {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  return (
    <div className={`priority-list-card ${colorClass}`}>
      <div className="list-header">
        <span className="list-icon">{icon}</span>
        <h4>{title}</h4>
      </div>
      <div className="list-content">
        {(!items || items.length === 0) ? (
          <div className="empty-list">Tidak ada data</div>
        ) : (
          items.map((item, idx) => (
            <div key={idx} className="list-item">
              <div className="item-main">
                <span className="customer-name">{item.customer_name}</span>
                <span className="invoice-no">#{item.invoice_number}</span>
              </div>
              <div className="item-meta">
                <span className="amount">{formatCurrency(item.outstanding_amount)}</span>
                <span className="priority-level">
                  <StatusBadge status={item.status || item.priority_level} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const EMPTY_METRICS = {
  global: { total_outstanding: 0, piutang_hari_ini: 0, piutang_jatuh_tempo: 0 },
  aging: { belum_jatuh_tempo: 0, hari_1_30: 0, hari_31_60: 0, hari_61_90: 0, lebih_90_hari: 0 },
  lists: { top_piutang_terbesar: [], top_terlama: [], top_jatuh_tempo_hari_ini: [], top_belum_dikunjungi: [] }
};

const computeMetrics = (rows) => {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const cutoff14 = new Date(today);
  cutoff14.setDate(cutoff14.getDate() - 14);

  const sum = (list) => list.reduce((acc, r) => acc + (Number(r.outstanding_amount) || 0), 0);

  const total = sum(rows);
  const dueToday = rows.filter((r) => r.due_date && String(r.due_date).slice(0, 10) === todayStr);
  const overdue = rows.filter((r) => r.due_date && String(r.due_date).slice(0, 10) < todayStr && (Number(r.outstanding_amount) || 0) > 0);

  const bucket = (pred) => sum(rows.filter(pred));

  const aging = {
    belum_jatuh_tempo: bucket((r) => (Number(r.aging_days) || 0) <= 0),
    hari_1_30: bucket((r) => (Number(r.aging_days) || 0) >= 1 && (Number(r.aging_days) || 0) <= 30),
    hari_31_60: bucket((r) => (Number(r.aging_days) || 0) >= 31 && (Number(r.aging_days) || 0) <= 60),
    hari_61_90: bucket((r) => (Number(r.aging_days) || 0) >= 61 && (Number(r.aging_days) || 0) <= 90),
    lebih_90_hari: bucket((r) => (Number(r.aging_days) || 0) > 90),
  };

  const lists = {
    top_piutang_terbesar: [...rows].sort((a, b) => (Number(b.outstanding_amount) || 0) - (Number(a.outstanding_amount) || 0)).slice(0, 5),
    top_terlama: [...rows].sort((a, b) => (Number(b.aging_days) || 0) - (Number(a.aging_days) || 0)).slice(0, 5),
    top_jatuh_tempo_hari_ini: dueToday.slice(0, 5),
    top_belum_dikunjungi: [...rows]
      .filter((r) => !r.last_visit_date || new Date(r.last_visit_date) < cutoff14)
      .sort((a, b) => (Number(b.outstanding_amount) || 0) - (Number(a.outstanding_amount) || 0))
      .slice(0, 5),
  };

  return {
    global: {
      total_outstanding: total,
      piutang_hari_ini: sum(dueToday),
      piutang_jatuh_tempo: sum(overdue),
    },
    aging,
    lists,
  };
};

const PiutangDashboard = () => {
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const todayStr = new Date().toISOString().slice(0, 10);
        const [{ data, error }, visitRes] = await Promise.all([
          supabase
            .from('AccountsReceivableProjection')
            .select('invoice_number, customer_name, outstanding_amount, due_date, status')
            .gt('outstanding_amount', 0)
            .limit(5000),
          supabase.from('CustomerARProjection').select('customer_code, last_visit_date'),
        ]);
        if (error) throw error;

        const visitMap = {};
        for (const row of visitRes?.data || []) visitMap[row.customer_code] = row.last_visit_date;

        const enriched = (data || []).map((r) => ({
          ...r,
          aging_days: r.due_date
            ? Math.max(0, Math.floor((new Date(todayStr) - new Date(String(r.due_date).slice(0, 10))) / 86400000))
            : 0,
          last_visit_date: visitMap[r.customer_code] || null,
        }));
        setMetrics(computeMetrics(enriched));
      } catch (err) {
        console.error('Failed to fetch piutang metrics', err);
        setError(err.message || 'Gagal memuat data piutang');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(value || 0);
  };

  if (loading) {
    return <div className="piutang-dashboard-loading">Memuat Piutang Dashboard...</div>;
  }

  if (error) {
    return (
      <div className="piutang-dashboard">
        <div className="alert-error" style={{ margin: '24px' }}>{error}</div>
      </div>
    );
  }

  const exportToExcel = () => {
    import('xlsx').then((XLSX) => {
      const wb = XLSX.utils.book_new();

      const globalData = [
        ['Metrik', 'Jumlah'],
        ['Total Piutang', metrics.global.total_outstanding],
        ['Piutang Hari Ini', metrics.global.piutang_hari_ini],
        ['Piutang Jatuh Tempo', metrics.global.piutang_jatuh_tempo]
      ];
      const wsGlobal = XLSX.utils.aoa_to_sheet(globalData);
      XLSX.utils.book_append_sheet(wb, wsGlobal, 'KPI Global');

      const agingData = [
        ['Kelompok', 'Jumlah'],
        ['Belum Jatuh Tempo', metrics.aging.belum_jatuh_tempo],
        ['1-30 Hari', metrics.aging.hari_1_30],
        ['31-60 Hari', metrics.aging.hari_31_60],
        ['61-90 Hari', metrics.aging.hari_61_90],
        ['>90 Hari', metrics.aging.lebih_90_hari]
      ];
      const wsAging = XLSX.utils.aoa_to_sheet(agingData);
      XLSX.utils.book_append_sheet(wb, wsAging, 'Kelompok Umur Piutang');

      const topPiutangData = metrics.lists.top_piutang_terbesar.map(item => ({
        'Nama Warung': item.customer_name,
        'No. Faktur': item.invoice_number,
        'Jumlah Tersisa': item.outstanding_amount,
        'Status': item.status
      }));
      if (topPiutangData.length > 0) {
        const wsTop = XLSX.utils.json_to_sheet(topPiutangData);
        XLSX.utils.book_append_sheet(wb, wsTop, 'Top Piutang');
      }

      XLSX.writeFile(wb, `Collection_Dashboard_Export_${new Date().toISOString().split('T')[0]}.xlsx`);
    });
  };

  return (
    <div className="piutang-dashboard">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2>Piutang Dashboard</h2>
          <p>Ringkasan piutang usaha, total saldo tersisa, dan prioritas tindakan yang perlu diambil.</p>
        </div>
        <button onClick={exportToExcel} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
          Ekspor Excel
        </button>
      </div>

      <section className="dashboard-section">
        <h3 className="section-title">KPI Global</h3>
        <KPIGrid>
          <KPICard
            title="Total Piutang"
            value={formatCurrency(metrics.global.total_outstanding)}
            trend="neutral"
            trendValue="Total Saldo"
          />
          <KPICard
            title="Piutang Hari Ini"
            value={formatCurrency(metrics.global.piutang_hari_ini)}
            trend="neutral"
            trendValue="Saat Ini"
          />
          <KPICard
            title="Piutang Jatuh Tempo"
            value={formatCurrency(metrics.global.piutang_jatuh_tempo)}
            trend="down"
            trendValue="Perlu Perhatian"
          />
        </KPIGrid>
      </section>

      <section className="dashboard-section">
        <h3 className="section-title">Kelompok Umur Piutang</h3>
        <KPIGrid>
          <KPICard
            title="Belum Jatuh Tempo"
            value={formatCurrency(metrics.aging.belum_jatuh_tempo)}
            icon="📅"
          />
          <KPICard
            title="1-30 Hari"
            value={formatCurrency(metrics.aging.hari_1_30)}
            icon="⚠️"
          />
          <KPICard
            title="31-60 Hari"
            value={formatCurrency(metrics.aging.hari_31_60)}
            icon="⏰"
          />
          <KPICard
            title="61-90 Hari"
            value={formatCurrency(metrics.aging.hari_61_90)}
            icon="🔴"
          />
          <KPICard
            title=">90 Hari"
            value={formatCurrency(metrics.aging.lebih_90_hari)}
            icon="❗"
          />
        </KPIGrid>
      </section>

      <section className="dashboard-section priority-section">
        <h3 className="section-title">Daftar Prioritas Tindakan</h3>
        <div className="priority-lists-grid">
          <PriorityList
            title="Top Piutang Terbesar"
            items={metrics.lists.top_piutang_terbesar}
            icon="💰"
            colorClass="card-blue"
          />
          <PriorityList
            title="Top Terlama (>90 Hari)"
            items={metrics.lists.top_terlama}
            icon="🕰️"
            colorClass="card-red"
          />
          <PriorityList
            title="Jatuh Tempo Hari Ini"
            items={metrics.lists.top_jatuh_tempo_hari_ini}
            icon="⚡"
            colorClass="card-yellow"
          />
          <PriorityList
            title="Belum Dikunjungi (>14 Hari)"
            items={metrics.lists.top_belum_dikunjungi}
            icon="🚗"
            colorClass="card-purple"
          />
        </div>
      </section>
    </div>
  );
};

export default PiutangDashboard;
