import React, { useState, useEffect } from 'react';
import { supabase } from '../../../utils/supabase';

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', fontSize: '14px' };
const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: 'var(--text-main)' };

const Section = ({ title, children }) => (
  <section className="card" style={{ padding: '20px', marginBottom: '16px' }}>
    <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>{title}</h3>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
      {children}
    </div>
  </section>
);

const Group = ({ label, required, children }) => (
  <div className="form-group" style={{ marginBottom: '10px' }}>
    <label style={labelStyle}>
      {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
    </label>
    {children}
  </div>
);

const ProductForm = ({ initialData, lookups, onSubmit, onCancel, isSubmitting, submitError }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    category_id: '',
    unit_id: '',
    cost_price: '',
    selling_price: '',
    is_active: true,
    image_url: '',
  });
  const [imageFile, setImageFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || '',
        code: initialData.code || '',
        category_id: initialData.category_id || '',
        unit_id: initialData.unit_id || '',
        cost_price: initialData.cost_price ?? '',
        selling_price: initialData.selling_price ?? '',
        is_active: initialData.is_active !== false,
        image_url: initialData.image_url || '',
      }));
    }
  }, [initialData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? (value === '' ? '' : Number(value)) : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let imageUrl = formData.image_url;
    if (imageFile) {
      setUploading(true);
      try {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `product_${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, imageFile, { contentType: imageFile.type });
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(fileName);
        imageUrl = urlData?.publicUrl || '';
      } catch (err) {
        console.error('Upload error:', err);
      }
      setUploading(false);
    }
    const payload = { ...formData, image_url: imageUrl };
    const numFields = ['cost_price', 'selling_price'];
    numFields.forEach((k) => {
      if (payload[k] === '') payload[k] = null;
    });
    ['category_id', 'unit_id'].forEach((k) => {
      if (!payload[k]) delete payload[k];
    });
    onSubmit(payload);
  };

  const categories = lookups.categories || [];
  const brands = lookups.brands || [];
  const units = lookups.units || [];
  const suppliers = lookups.suppliers || [];
  const packagings = lookups.packagings || [];
  const taxes = lookups.taxes || [];
  const warehouses = lookups.warehouses || [];

  return (
    <form onSubmit={handleSubmit}>
      {submitError && <div className="alert-error" style={{ marginBottom: '16px' }}>{submitError}</div>}

      <Section title="Informasi Umum">
        <Group label="Nama Produk" required>
          <input style={inputStyle} name="name" value={formData.name} onChange={handleChange} required placeholder="contoh: Thai Tea" />
        </Group>
        <Group label="Kode">
          <input style={inputStyle} name="code" value={formData.code} disabled placeholder="Otomatis Dibuat" />
        </Group>
      </Section>

      <Section title="Klasifikasi">
        <Group label="Kategori">
          <select style={inputStyle} name="category_id" value={formData.category_id} onChange={handleChange}>
            <option value="">Pilih Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Group>
        <Group label="Satuan">
          <select style={inputStyle} name="unit_id" value={formData.unit_id} onChange={handleChange}>
            <option value="">Pilih Satuan</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Group>
      </Section>

      <Section title="Harga Dasar">
        <Group label="HPP (Harga Modal)">
          <input style={inputStyle} type="number" step="any" name="cost_price" value={formData.cost_price} onChange={handleChange} placeholder="0" />
        </Group>
        <Group label="Harga Jual">
          <input style={inputStyle} type="number" step="any" name="selling_price" value={formData.selling_price} onChange={handleChange} placeholder="0" />
        </Group>
      </Section>

      <Section title="Status Produk">
        <Group label="Aktif">
          <div style={{ paddingTop: '8px' }}>
            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} /> <span style={{ fontSize: '13px' }}>Produk aktif dan dapat dijual</span>
          </div>
        </Group>
      </Section>

      <Section title="Gambar Produk">
        <div style={{ gridColumn: '1 / -1' }}>
          {formData.image_url && !imageFile && (
            <div style={{ marginBottom: '12px' }}>
              <img src={formData.image_url} alt="Preview" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>
          )}
          {imageFile && (
            <div style={{ marginBottom: '12px' }}>
              <img src={URL.createObjectURL(imageFile)} alt="Preview" style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid var(--border)' }} />
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            id="product-image"
            style={{ display: 'none' }}
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            onClick={() => document.getElementById('product-image')?.click()}
            style={{ padding: '8px 16px', border: '1px dashed var(--border)', borderRadius: '8px', background: 'var(--surface)', cursor: 'pointer', fontSize: '13px' }}
          >
            {formData.image_url ? 'Ganti Gambar' : 'Pilih Gambar'}
          </button>
          {imageFile && (
            <span style={{ marginLeft: '8px', fontSize: '13px', color: 'var(--text-muted)' }}>{imageFile.name}</span>
          )}
        </div>
      </Section>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" className="btn" style={{ padding: '8px 16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={onCancel} disabled={isSubmitting || uploading}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || uploading}>
          {uploading ? 'Mengunggah...' : isSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
