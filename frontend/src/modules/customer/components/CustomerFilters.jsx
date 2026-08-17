import React, { useEffect, useState } from 'react';
import { supabase } from '../../../utils/supabase';

const CustomerFilters = ({ filters, setFilters }) => {
  const [areas, setAreas] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [salesList, setSalesList] = useState([]);

  useEffect(() => {
    const fetchLookups = async () => {
      const [areaRes, routeRes, salesRes] = await Promise.all([
        supabase.from('Area').select('id, name').eq('is_active', true).order('name'),
        supabase.from('Route').select('id, name, area_id').eq('is_active', true).order('name'),
        supabase.from('User').select('id, name').eq('role', 'SALES').eq('is_active', true).order('name'),
      ]);
      if (!areaRes.error)  setAreas(areaRes.data || []);
      if (!routeRes.error) setRoutes(routeRes.data || []);
      if (!salesRes.error) setSalesList(salesRes.data || []);
    };
    fetchLookups();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setFilters(prev => {
      const updated = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      // Jika area berubah, reset route (rute mengikuti area)
      if (name === 'area_id') {
        updated.route_id = '';
      }

      return updated;
    });
  };

  // Filter rute berdasarkan area yang dipilih
  const filteredRoutes = filters.area_id
    ? routes.filter(r => String(r.area_id) === String(filters.area_id))
    : routes;

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: 'var(--spacing-md)',
      padding: 'var(--spacing-md)',
      backgroundColor: 'var(--color-bg-primary)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--color-border)',
      marginBottom: 'var(--spacing-lg)'
    }}>
      <select name="status" className="form-input" value={filters.status || ''} onChange={handleChange}>
        <option value="">Semua Status</option>
        <option value="ACTIVE">Aktif</option>
        <option value="INACTIVE">Nonaktif</option>
        <option value="BLACKLIST">Blacklist</option>
      </select>

      <select name="area_id" className="form-input" value={filters.area_id || ''} onChange={handleChange}>
        <option value="">Semua Area</option>
        {areas.map(a => (
          <option key={a.id} value={a.id}>{a.name}</option>
        ))}
      </select>

      <select name="route_id" className="form-input" value={filters.route_id || ''} onChange={handleChange}>
        <option value="">Semua Rute</option>
        {filteredRoutes.map(r => (
          <option key={r.id} value={r.id}>{r.name}</option>
        ))}
      </select>

      <select name="sales_id" className="form-input" value={filters.sales_id || ''} onChange={handleChange}>
        <option value="">Semua Sales</option>
        {salesList.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      <select name="visit_day" className="form-input" value={filters.visit_day || ''} onChange={handleChange}>
        <option value="">Semua Hari Kunjungan</option>
        <option value="MONDAY">Senin</option>
        <option value="TUESDAY">Selasa</option>
        <option value="WEDNESDAY">Rabu</option>
        <option value="THURSDAY">Kamis</option>
        <option value="FRIDAY">Jumat</option>
        <option value="SATURDAY">Sabtu</option>
        <option value="SUNDAY">Minggu</option>
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <input
          type="checkbox"
          name="outstanding_only"
          checked={filters.outstanding_only || false}
          onChange={handleChange}
        />
        Hanya yang Bersisa
      </label>
    </div>
  );
};

export default CustomerFilters;
