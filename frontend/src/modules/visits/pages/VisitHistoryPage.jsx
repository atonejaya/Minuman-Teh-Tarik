import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';
import TableMessage from '../../../components/shared/TableMessage';
import { tableCell } from '../../../utils/tableStyles';

const STATUS_LABELS = {
  CHECKED_IN: 'Check-in',
  STOCK_COUNTED: 'Stok Selesai',
  DELIVERED: 'Pembayaran',
  COMPLETED: 'Selesai',
};

const VisitHistoryPage = () => {
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [salesmen, setSalesmen] = useState([]);
  const [filters, setFilters] = useState({
    dateFrom: new Date().toISOString().slice(0, 10),
    dateTo: new Date().toISOString().slice(0, 10),
    sales_id: '',
  });

  useEffect(() => {
    const fetchSales = async () => {
      const { data } = await supabase.from('User').select('id, name').eq('role', 'SALES').eq('is_active', true);
      setSalesmen(data || []);
    };
    fetchSales();
  }, []);

  useEffect(() => {
    const fetchVisits = async () => {
      setLoading(true);
      let query = supabase
        .from('SalesVisit')
        .select('*, sales:User!sales_id(name), warung:Warung(name, code)')
        .order('visit_date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (filters.dateFrom) query = query.gte('visit_date', filters.dateFrom);
      if (filters.dateTo) query = query.lte('visit_date', filters.dateTo);
      if (filters.sales_id) query = query.eq('sales_id', Number(filters.sales_id));

      const { data, error } = await query.limit(100);
      if (!error) setVisits(data || []);
      setLoading(false);
    };
    fetchVisits();
  }, [filters]);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="page-mobile">
      <div className="card-custom" style={{ padding: '16px', marginBottom: '16px' }}>
        <h2 style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: '600' }}>History Kunjungan</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Dari Tanggal</label>
            <input type="date" className="form-input" value={filters.dateFrom} onChange={(e) => updateFilter('dateFrom', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Sampai Tanggal</label>
            <input type="date" className="form-input" value={filters.dateTo} onChange={(e) => updateFilter('dateTo', e.target.value)} />
          </div>
          <div className="form-group" style={{ gridColumn: '1 / -1' }}>
            <label className="form-label">Sales</label>
            <select className="form-input" value={filters.sales_id} onChange={(e) => updateFilter('sales_id', e.target.value)}>
              <option value="">Semua Sales</option>
              {salesmen.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <TableMessage>Memuat data...</TableMessage>
      ) : visits.length === 0 ? (
        <TableMessage>Tidak ada kunjungan ditemukan</TableMessage>
      ) : (
        <div className="card-custom" style={{ padding: '16px' }}>
          <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--text-muted)' }}>
            {visits.length} kunjungan ditemukan
          </p>
          {visits.map((v) => (
            <div key={v.id} style={{ padding: '12px', borderBottom: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontWeight: '600', fontSize: '14px' }}>{v.warung?.name || '-'}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.visit_date}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Sales: {v.sales?.name || '-'}</span>
                <span>Status: {STATUS_LABELS[v.status] || v.status}</span>
              </div>
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>Masuk: {v.check_in_time ? new Date(v.check_in_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
                <span>Keluar: {v.check_out_time ? new Date(v.check_out_time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-'}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default VisitHistoryPage;
