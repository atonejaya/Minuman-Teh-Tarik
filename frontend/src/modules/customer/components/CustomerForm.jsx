import React, { useState } from 'react';

const CustomerForm = ({ initialData = {}, onSubmit, isSubmitting }) => {
  const [formData, setFormData] = useState({
    code: initialData.code || '',
    name: initialData.name || '',
    owner_name: initialData.owner_name || '',
    phone: initialData.phone || '',
    email: initialData.email || '',
    address: initialData.address || '',
    province: initialData.province || '',
    city: initialData.city || '',
    district: initialData.district || '',
    village: initialData.village || '',
    area_id: initialData.area_id || '',
    route_id: initialData.route_id || '',
    assigned_sales_id: initialData.assigned_sales_id || '',
    payment_term: initialData.payment_term || 0,
    credit_limit: initialData.credit_limit || 0,
    visit_day: initialData.visit_day || '',
    visit_week: initialData.visit_week || '',
    status: initialData.status || 'ACTIVE'
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
      {/* General Information */}
      <section className="card" style={{ padding: 'var(--spacing-lg)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--text-lg)' }}>General Information</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
          <div className="form-group">
            <label className="form-label">Customer Code</label>
            <input type="text" className="form-input" name="code" value={formData.code} disabled placeholder="Auto Generated" />
          </div>
          <div className="form-group">
            <label className="form-label">Store Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" className="form-input" name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Owner Name <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" className="form-input" name="owner_name" value={formData.owner_name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Phone <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" className="form-input" name="phone" value={formData.phone} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" name="email" value={formData.email} onChange={handleChange} />
          </div>
        </div>
      </section>

      {/* Address */}
      <section className="card" style={{ padding: 'var(--spacing-lg)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--text-lg)' }}>Address</h3>
        <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
          <label className="form-label">Full Address <span style={{ color: 'var(--color-danger)' }}>*</span></label>
          <textarea className="form-input" name="address" rows="3" value={formData.address} onChange={handleChange} required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
          <div className="form-group">
            <label className="form-label">Province <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" className="form-input" name="province" value={formData.province} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">City <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" className="form-input" name="city" value={formData.city} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">District <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" className="form-input" name="district" value={formData.district} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label">Village <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <input type="text" className="form-input" name="village" value={formData.village} onChange={handleChange} required />
          </div>
        </div>
      </section>

      {/* Sales Assignment */}
      <section className="card" style={{ padding: 'var(--spacing-lg)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--text-lg)' }}>Sales Assignment</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 'var(--spacing-md)' }}>
          <div className="form-group">
            <label className="form-label">Area <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select className="form-input" name="area_id" value={formData.area_id} onChange={handleChange} required>
              <option value="">Select Area</option>
              {/* Mock options */}
              <option value="1">Area 1</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Route <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select className="form-input" name="route_id" value={formData.route_id} onChange={handleChange} required>
              <option value="">Select Route</option>
              <option value="1">Route 1</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Assigned Sales <span style={{ color: 'var(--color-danger)' }}>*</span></label>
            <select className="form-input" name="assigned_sales_id" value={formData.assigned_sales_id} onChange={handleChange} required>
              <option value="">Select Sales</option>
              <option value="1">Sales 1</option>
            </select>
          </div>
        </div>
      </section>

      {/* Credit & Visit Information */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 'var(--spacing-xl)' }}>
        <section className="card" style={{ padding: 'var(--spacing-lg)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--text-lg)' }}>Credit Information</h3>
          <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
            <label className="form-label">Credit Limit (Rp)</label>
            <input type="number" className="form-input" name="credit_limit" min="0" value={formData.credit_limit} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Payment Term (Days)</label>
            <input type="number" className="form-input" name="payment_term" min="0" value={formData.payment_term} onChange={handleChange} />
          </div>
        </section>

        <section className="card" style={{ padding: 'var(--spacing-lg)' }}>
          <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--text-lg)' }}>Visit Information</h3>
          <div className="form-group" style={{ marginBottom: 'var(--spacing-md)' }}>
            <label className="form-label">Visit Day</label>
            <select className="form-input" name="visit_day" value={formData.visit_day} onChange={handleChange}>
              <option value="">Select Day</option>
              <option value="MONDAY">Monday</option>
              <option value="TUESDAY">Tuesday</option>
              <option value="WEDNESDAY">Wednesday</option>
              <option value="THURSDAY">Thursday</option>
              <option value="FRIDAY">Friday</option>
              <option value="SATURDAY">Saturday</option>
              <option value="SUNDAY">Sunday</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Visit Week</label>
            <select className="form-input" name="visit_week" value={formData.visit_week} onChange={handleChange}>
              <option value="">Select Week</option>
              <option value="ALL">All Weeks</option>
              <option value="WEEK_1">Week 1</option>
              <option value="WEEK_2">Week 2</option>
              <option value="WEEK_3">Week 3</option>
              <option value="WEEK_4">Week 4</option>
            </select>
          </div>
        </section>
      </div>

      {/* Status */}
      <section className="card" style={{ padding: 'var(--spacing-lg)' }}>
        <h3 style={{ marginBottom: 'var(--spacing-md)', fontSize: 'var(--text-lg)' }}>Status</h3>
        <div className="form-group">
          <select className="form-input" name="status" value={formData.status} onChange={handleChange}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="BLACKLIST">Blacklist</option>
          </select>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-md)' }}>
        <button type="button" className="btn btn-outline" onClick={() => window.history.back()}>Cancel</button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Customer'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
