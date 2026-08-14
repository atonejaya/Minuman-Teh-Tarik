import React from 'react';

const CustomerFilters = ({ filters, setFilters }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

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
        {/* Mock Area options for now */}
      </select>

      <select name="route_id" className="form-input" value={filters.route_id || ''} onChange={handleChange}>
        <option value="">Semua Rute</option>
      </select>

      <select name="sales_id" className="form-input" value={filters.sales_id || ''} onChange={handleChange}>
        <option value="">Semua Sales</option>
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
