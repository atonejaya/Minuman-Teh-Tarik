import React, { useState, useEffect } from 'react';
import { useMasterLookupContext } from '../../../contexts/MasterLookupContext';
import { Crosshair, CheckCircle2, TriangleAlert } from 'lucide-react';
import { getCurrentPosition } from '../../../utils/geolocation';

const CustomerForm = ({ initialData = {}, onSubmit, onCancel, isSubmitting, submitError, isSales = false, salesAreaId, salesName }) => {
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
    status: initialData.status || 'ACTIVE',
    latitude: initialData.latitude || '',
    longitude: initialData.longitude || ''
  });

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? Number(value) : value
    }));
  };

  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsMessage, setGpsMessage] = useState('');

  const captureGps = () => {
    setGpsStatus('loading');
    setGpsMessage('Meminta izin GPS...');
    getCurrentPosition().then((res) => {
      if (res.latitude !== null && res.longitude !== null) {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(res.latitude),
          longitude: Number(res.longitude),
        }));
        setGpsStatus('success');
        setGpsMessage(`Lokasi terekam: ${Number(res.latitude).toFixed(5)}, ${Number(res.longitude).toFixed(5)}`);
      } else {
        setGpsStatus('denied');
        setGpsMessage(res.error || 'Lokasi tidak terdeteksi. Pastikan GPS aktif dan izin lokasi diberikan.');
      }
    });
  };

  useEffect(() => {
    if (!isSales) return;
    captureGps();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSales]);

  const filteredRoutes = isSales && salesAreaId
    ? routes.filter((r) => Number(r.area_id) === Number(salesAreaId))
    : routes;

  const areaName = areas.find((a) => Number(a.id) === Number(salesAreaId))?.name || '';

  const [provinces, setProvinces] = useState([]);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [villages, setVillages] = useState([]);
  const [selectedRegionIds, setSelectedRegionIds] = useState({
    province_id: '',
    city_id: '',
    district_id: ''
  });

  useEffect(() => {
    fetch('https://www.emsifa.com/api-wilayah-indonesia/api/provinces.json')
      .then(res => res.json())
      .then(data => {
        setProvinces(data);
        if (initialData.province) {
          const prov = data.find(p => p.name === initialData.province);
          if (prov) setSelectedRegionIds(prev => ({ ...prev, province_id: prov.id }));
        }
      })
      .catch(err => console.error('Gagal memuat provinsi:', err));
  }, [initialData.province]);

  useEffect(() => {
    if (selectedRegionIds.province_id) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/regencies/${selectedRegionIds.province_id}.json`)
        .then(res => res.json())
        .then(data => {
          setCities(data);
          if (initialData.city) {
            const city = data.find(c => c.name === initialData.city);
            if (city) setSelectedRegionIds(prev => ({ ...prev, city_id: city.id }));
          }
        });
    } else {
      setCities([]);
    }
  }, [selectedRegionIds.province_id, initialData.city]);

  useEffect(() => {
    if (selectedRegionIds.city_id) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/districts/${selectedRegionIds.city_id}.json`)
        .then(res => res.json())
        .then(data => {
          setDistricts(data);
          if (initialData.district) {
            const dist = data.find(d => d.name === initialData.district);
            if (dist) setSelectedRegionIds(prev => ({ ...prev, district_id: dist.id }));
          }
        });
    } else {
      setDistricts([]);
    }
  }, [selectedRegionIds.city_id, initialData.district]);

  useEffect(() => {
    if (selectedRegionIds.district_id) {
      fetch(`https://www.emsifa.com/api-wilayah-indonesia/api/villages/${selectedRegionIds.district_id}.json`)
        .then(res => res.json())
        .then(data => setVillages(data));
    } else {
      setVillages([]);
    }
  }, [selectedRegionIds.district_id]);

  const handleRegionChange = (level, e) => {
    const name = e.target.value;
    const selectedOption = e.target.options[e.target.selectedIndex];
    const id = selectedOption.getAttribute('data-id');

    setFormData(prev => ({ ...prev, [level]: name }));

    if (level === 'province') {
      setSelectedRegionIds({ province_id: id, city_id: '', district_id: '' });
      setFormData(prev => ({ ...prev, city: '', district: '', village: '' }));
    } else if (level === 'city') {
      setSelectedRegionIds(prev => ({ ...prev, city_id: id, district_id: '' }));
      setFormData(prev => ({ ...prev, district: '', village: '' }));
    } else if (level === 'district') {
      setSelectedRegionIds(prev => ({ ...prev, district_id: id }));
      setFormData(prev => ({ ...prev, village: '' }));
    }
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

      {isSales && (
        <section className="card-custom" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            {gpsStatus === 'loading' && <Crosshair size={18} color="var(--warning)" style={{ marginTop: '2px', flexShrink: 0 }} />}
            {gpsStatus === 'success' && <CheckCircle2 size={18} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />}
            {(gpsStatus === 'denied' || gpsStatus === 'idle') && <TriangleAlert size={18} color="var(--danger)" style={{ marginTop: '2px', flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>
                {gpsStatus === 'success'
                  ? 'Lokasi GPS Terekam Otomatis'
                  : gpsStatus === 'loading'
                  ? 'Mendeteksi Lokasi GPS...'
                  : 'Lokasi GPS Diperlukan'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: gpsStatus === 'denied' ? 'var(--danger)' : 'var(--text-muted)' }}>
                {gpsStatus === 'denied'
                  ? gpsMessage
                  : gpsMessage || 'Koordinat warung digunakan untuk navigasi kunjungan.'}
              </p>
              {gpsStatus === 'denied' && (
                <p style={{ margin: '6px 0 0', fontSize: '12px', color: 'var(--danger)', fontWeight: '500' }}>
                  ⚠ Koordinat akurat wajib diisi. Form tidak dapat disimpan tanpa GPS.
                </p>
              )}
            </div>
            {(gpsStatus === 'denied' || gpsStatus === 'idle') && (
              <button
                type="button"
                className="btn"
                style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                onClick={captureGps}
              >
                <Crosshair size={13} /> Coba Lagi
              </button>
            )}
          </div>
        </section>
      )}

      {isSales && !salesAreaId && (
        <div className="alert-error">Akun Sales Anda belum memiliki Area. Hubungi Owner untuk mengatur Area terlebih dahulu.</div>
      )}

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
            <select className="form-input" style={inputStyle} name="province" value={formData.province} onChange={(e) => handleRegionChange('province', e)} required>
              <option value="">Pilih Provinsi</option>
              {provinces.map(p => <option key={p.id} value={p.name} data-id={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Kota/Kabupaten <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select className="form-input" style={inputStyle} name="city" value={formData.city} onChange={(e) => handleRegionChange('city', e)} required disabled={!cities.length}>
              <option value="">Pilih Kota/Kab.</option>
              {cities.map(c => <option key={c.id} value={c.name} data-id={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Kecamatan <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select className="form-input" style={inputStyle} name="district" value={formData.district} onChange={(e) => handleRegionChange('district', e)} required disabled={!districts.length}>
              <option value="">Pilih Kecamatan</option>
              {districts.map(d => <option key={d.id} value={d.name} data-id={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label" style={labelStyle}>Desa/Kelurahan <span style={{ color: 'var(--danger)' }}>*</span></label>
            <select className="form-input" style={inputStyle} name="village" value={formData.village} onChange={handleChange} required disabled={!villages.length}>
              <option value="">Pilih Desa/Kel.</option>
              {villages.map(v => <option key={v.id} value={v.name}>{v.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      <section className="card-custom" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>Penugasan Sales</h3>
        {isSales ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Area</label>
              <input type="text" className="form-input" style={inputStyle} value={areaName || '—'} disabled />
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Rute <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select className="form-input" style={inputStyle} name="route_id" value={formData.route_id} onChange={handleChange} required disabled={!salesAreaId}>
                <option value="">Pilih Rute</option>
                {filteredRoutes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Sales Ditugaskan</label>
              <input type="text" className="form-input" style={inputStyle} value={salesName || 'Anda'} disabled />
            </div>
          </div>
        ) : (
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
        )}
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
              <option value="0">Semua (Tiap Minggu)</option>
              <option value="1">Minggu ke-1</option>
              <option value="2">Minggu ke-2</option>
              <option value="3">Minggu ke-3</option>
              <option value="4">Minggu ke-4</option>
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
      )}

      {!isSales && (
        <section className="card-custom" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            {gpsStatus === 'loading' && <Crosshair size={18} color="var(--warning)" style={{ marginTop: '2px', flexShrink: 0 }} />}
            {gpsStatus === 'success' && <CheckCircle2 size={18} color="var(--success)" style={{ marginTop: '2px', flexShrink: 0 }} />}
            {(gpsStatus === 'denied' || gpsStatus === 'idle') && <TriangleAlert size={18} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />}
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: '600', fontSize: '14px', margin: '0 0 2px' }}>
                {gpsStatus === 'success'
                  ? 'Lokasi GPS Terekam'
                  : gpsStatus === 'loading'
                  ? 'Mendeteksi Lokasi GPS...'
                  : 'Lokasi GPS Warung'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                {gpsStatus === 'success'
                  ? `${Number(formData.latitude).toFixed(5)}, ${Number(formData.longitude).toFixed(5)}`
                  : gpsMessage || 'Klik tombol untuk mengambil lokasi GPS saat ini.'}
              </p>
            </div>
            <button
              type="button"
              className="btn"
              style={{ padding: '6px 12px', fontSize: '12px', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={captureGps}
            >
              <Crosshair size={13} /> {gpsStatus === 'success' ? 'Update GPS' : 'Ambil Lokasi'}
            </button>
          </div>
        </section>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
        <button type="button" className="btn" style={{ padding: '8px 16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={onCancel} disabled={isSubmitting}>
          Batal
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={isSubmitting || (isSales && !salesAreaId) || (isSales && gpsStatus !== 'success')}
          title={isSales && gpsStatus !== 'success' ? 'GPS belum berhasil — koordinat akurat wajib diisi sebelum menyimpan' : ''}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Pelanggan'}
        </button>
      </div>
    </form>
  );
};

export default CustomerForm;
