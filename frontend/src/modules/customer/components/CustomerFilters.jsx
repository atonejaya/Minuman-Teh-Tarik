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
        <option value="">All Status</option>
        <option value="ACTIVE">Active</option>
        <option value="INACTIVE">Inactive</option>
        <option value="BLACKLIST">Blacklist</option>
      </select>

      <select name="area_id" className="form-input" value={filters.area_id || ''} onChange={handleChange}>
        <option value="">All Areas</option>
        {/* Mock Area options for now */}
      </select>

      <select name="route_id" className="form-input" value={filters.route_id || ''} onChange={handleChange}>
        <option value="">All Routes</option>
      </select>

      <select name="sales_id" className="form-input" value={filters.sales_id || ''} onChange={handleChange}>
        <option value="">All Sales</option>
      </select>
      
      <select name="visit_day" className="form-input" value={filters.visit_day || ''} onChange={handleChange}>
        <option value="">All Visit Days</option>
        <option value="MONDAY">Monday</option>
        <option value="TUESDAY">Tuesday</option>
        <option value="WEDNESDAY">Wednesday</option>
        <option value="THURSDAY">Thursday</option>
        <option value="FRIDAY">Friday</option>
        <option value="SATURDAY">Saturday</option>
        <option value="SUNDAY">Sunday</option>
      </select>

      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
        <input 
          type="checkbox" 
          name="outstanding_only" 
          checked={filters.outstanding_only || false} 
          onChange={handleChange} 
        />
        Outstanding Only
      </label>
    </div>
  );
};

export default CustomerFilters;
