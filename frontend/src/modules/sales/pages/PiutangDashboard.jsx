import React, { useState, useEffect } from 'react';
import KPIGrid from '../../../../components/shared/KPIGrid';
import KPICard from '../../../../components/shared/KPICard';
import StatusBadge from '../../../../components/shared/StatusBadge';
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
                  <StatusBadge status={item.priority_level} />
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const PiutangDashboard = () => {
  const [metrics, setMetrics] = useState({
    global: {
      total_outstanding: 0,
      piutang_hari_ini: 0,
      piutang_jatuh_tempo: 0,
    },
    aging: {
      belum_jatuh_tempo: 0,
      hari_1_30: 0,
      hari_31_60: 0,
      hari_61_90: 0,
      lebih_90_hari: 0
    },
    lists: {
      top_piutang_terbesar: [],
      top_terlama: [],
      top_jatuh_tempo_hari_ini: [],
      top_belum_dikunjungi: []
    }
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/v1/sales/piutang/dashboard');
        if (response.ok) {
          const result = await response.json();
          const data = result.data || {};
          
          setMetrics({
            global: {
              total_outstanding: data.global?.total_outstanding || data.total_outstanding || 0,
              piutang_hari_ini: data.global?.piutang_hari_ini || data.piutang_hari_ini || 0,
              piutang_jatuh_tempo: data.global?.piutang_jatuh_tempo || data.piutang_jatuh_tempo || 0,
            },
            aging: {
              belum_jatuh_tempo: data.aging?.belum_jatuh_tempo || 0,
              hari_1_30: data.aging?.hari_1_30 || 0,
              hari_31_60: data.aging?.hari_31_60 || 0,
              hari_61_90: data.aging?.hari_61_90 || 0,
              lebih_90_hari: data.aging?.lebih_90_hari || data.aging?.['>90_hari'] || 0
            },
            lists: {
              top_piutang_terbesar: data.lists?.top_piutang_terbesar || [],
              top_terlama: data.lists?.top_terlama || [],
              top_jatuh_tempo_hari_ini: data.lists?.top_jatuh_tempo_hari_ini || [],
              top_belum_dikunjungi: data.lists?.top_belum_dikunjungi || []
            }
          });
        } else {
          setFallbackData();
        }
      } catch (err) {
        setFallbackData();
      } finally {
        setLoading(false);
      }
    };
    
    const setFallbackData = () => {
      const mockList = [
        { customer_name: 'Toko Maju', invoice_number: 'INV-2023-001', outstanding_amount: 5000000, priority_level: 'HIGH' },
        { customer_name: 'Warung Bu Sri', invoice_number: 'INV-2023-002', outstanding_amount: 3500000, priority_level: 'MEDIUM' },
        { customer_name: 'Minimarket Oke', invoice_number: 'INV-2023-003', outstanding_amount: 2100000, priority_level: 'LOW' }
      ];

      setMetrics({
        global: {
          total_outstanding: 50000000,
          piutang_hari_ini: 15000000,
          piutang_jatuh_tempo: 35000000,
        },
        aging: {
          belum_jatuh_tempo: 15000000,
          hari_1_30: 20000000,
          hari_31_60: 10000000,
          hari_61_90: 3000000,
          lebih_90_hari: 2000000
        },
        lists: {
          top_piutang_terbesar: [...mockList],
          top_terlama: [...mockList].reverse(),
          top_jatuh_tempo_hari_ini: [mockList[1], mockList[0]],
          top_belum_dikunjungi: [mockList[2], mockList[1], mockList[0]]
        }
      });
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
    return <div className="piutang-dashboard-loading">Loading Piutang Dashboard...</div>;
  }

  return (
    <div className="piutang-dashboard">
      <div className="dashboard-header">
        <h2>Piutang Dashboard</h2>
        <p>Overview of accounts receivable, total outstanding, and actionable priorities.</p>
      </div>
      
      <section className="dashboard-section">
        <h3 className="section-title">Global KPIs</h3>
        <KPIGrid>
          <KPICard 
            title="Total Outstanding" 
            value={formatCurrency(metrics.global.total_outstanding)} 
            trend="neutral" 
            trendValue="Total Balance" 
          />
          <KPICard 
            title="Piutang Hari Ini" 
            value={formatCurrency(metrics.global.piutang_hari_ini)} 
            trend="neutral" 
            trendValue="Current" 
          />
          <KPICard 
            title="Piutang Jatuh Tempo" 
            value={formatCurrency(metrics.global.piutang_jatuh_tempo)} 
            trend="down" 
            trendValue="Needs Attention" 
          />
        </KPIGrid>
      </section>

      <section className="dashboard-section">
        <h3 className="section-title">AR Aging Buckets</h3>
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
        <h3 className="section-title">Actionable Priority Lists</h3>
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
