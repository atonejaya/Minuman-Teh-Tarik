import React, { useState } from 'react';
import { useMasterLookupContext } from '../../../contexts/MasterLookupContext';

const CustomerForm = ({ initialData = {}, onSubmit, onCancel, isSubmitting, submitError }) => {
  const { lookups } = useMasterLookupContext();
  const areas = lookups?.areas || [];
  const routes = lookups?.routes || [];
  const salesmen = lookups?.salesmen || [];

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

const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: 'var(--text-main)' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', fontSize: '14px' };
const DAY_LABELS = { MONDAY: 'Senin', TUESDAY: 'Selasa', WEDNESDAY: 'Rabu', THURSDAY: 'Kamis', FRIDAY: 'Jumat', SATURDAY: 'Sabtu', SUNDAY: 'Minggu' };
const WEEK_LABELS = { ALL: 'Semua', WEEK_1: 'Minggu ke-1', WEEK_2: 'Minggu ke-2', WEEK_3: 'Minggu ke-3', WEEK_4: 'Minggu ke-4' };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {submitError && <div className="alert-error">{submitError}</div>}

      <section className="card-custom" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>Informasi Umum</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Kode Pelanggan</label>
            <input type="text" className="form-input" style={inputStyle} name="code" value={formData.code} disabled placeholder="Otomatis Dibuat" />
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Nama Toko <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" style={inputStyle} name="name" value={formData.name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Nama Pemilik <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" style={inputStyle} name="owner_name" value={formData.owner_name} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>No. HP <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" style={inputStyle} name="phone" value={formData.phone} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Email</label>
            <input type="email" className="form-input" style={inputStyle} name="email" value={formData.email} onChange={handleChange} />
          </div>
        </div>
      </section>

      <section className="card-custom" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>Alamat</h3>
        <div className="form-group" style={{ marginBottom: '14px' }}>
          <label className="form-label" style={labelStyle}>Alamat Lengkap <span style={{ color: 'var(--danger)' }}>*</span></label>
          <textarea className="form-input" style={{ ...inputStyle, minHeight: '70px' }} name="address" rows="3" value={formData.address} onChange={handleChange} required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Provinsi <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" style={inputStyle} name="province" value={formData.province} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Kota <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" style={inputStyle} name="city" value={formData.city} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Kecamatan <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" style={inputStyle} name="district" value={formData.district} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Desa/Kelurahan <span style={{ color: 'var(--danger)' }}>*</span></label>
            <input type="text" className="form-input" style={inputStyle} name="village" value={formData.village} onChange={handleChange} required />
          </div>
        </div>
      </section>

      <section className="card-custom" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>Penugasan Sales</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Area <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select className="form-input" style={inputStyle} name="area_id" value={formData.area_id} onChange={handleChange} required>
              <option value="">Pilih Area</option>
              {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Rute <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select className="form-input" style={inputStyle} name="route_id" value={formData.route_id} onChange={handleChange} required>
              <option value="">Pilih Rute</option>
              {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Sales Ditugaskan <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select className="form-input" style={inputStyle} name="assigned_sales_id" value={formData.assigned_sales_id} onChange={handleChange} required>
              <option value="">Pilih Sales</option>
              {salesmen.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px' }}>
        <section className="card-custom" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>Informasi Kredit</h3>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={labelStyle}>Limit Kredit (Rp)</label>
            <input type="number" className="form-input" style={inputStyle} name="credit_limit" min="0" value={formData.credit_limit} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Syarat Pembayaran (Hari)</label>
            <input type="number" className="form-input" style={inputStyle} name="payment_term" min="0" value={formData.payment_term} onChange={handleChange} />
          </div>
        </section>

        <section className="card-custom" style={{ padding: '20px' }}>
          <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>Informasi Kunjungan</h3>
          <div className="form-group" style={{ marginBottom: '14px' }}>
            <label className="form-label" style={labelStyle}>Hari Kunjungan</label>
            <select className="form-input" style={inputStyle} name="visit_day" value={formData.visit_day} onChange={handleChange}>
              <option value="">Pilih Hari</option>
              {['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'].map((d) => (
                <option key={d} value={d}>{DAY_LABELS[d] || d}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Minggu Kunjungan</label>
            <select className="form-input" style={inputStyle} name="visit_week" value={formData.visit_week} onChange={handleChange}>
              <option value="">Pilih Minggu</option>
              {['ALL', 'WEEK_1', 'WEEK_2', 'WEEK_3', 'WEEK_4'].map((w) => (
                <option key={w} value={w}>{WEEK_LABELS[w] || w}</option>
              ))}
            </select>
          </div>
        </section>
      </div>

      <section className="card-custom" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>Status</h3>
        <div className="form-group">
          <select className="form-input" style={{ ...inputStyle, maxWidth: '300px' }} name="status" value={formData.status} onChange={handleChange}>
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Nonaktif</option>
            <option value="BLACKLIST">Blacklist</option>
          </select>
        </div>
      </section>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button type="button" className="btn" style={{ padding: '8px 16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={onCancel} disabled={isSubmitting}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan...' : 'Simpan Pelanggan'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
