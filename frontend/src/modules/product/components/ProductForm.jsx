import React, { useState, useEffect } from 'react';

const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', fontSize: '14px' };
const labelStyle = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: 'var(--text-main)' };

const ProductForm = ({ initialData, lookups, onSubmit, onCancel, isSubmitting, submitError }) => {
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    sku: '',
    barcode: '',
    description: '',
    category_id: '',
    brand_id: '',
    unit_id: '',
    supplier_id: '',
    packaging_id: '',
    tax_id: '',
    warehouse_id: '',
    cost_price: '',
    minimum_stock: '',
    maximum_stock: '',
    reorder_level: '',
    shelf_life_days: '',
    volume: '',
    weight: '',
    is_consignment: true,
    is_sellable: true,
    is_purchasable: true,
    is_active: true,
  });

  useEffect(() => {
    if (initialData) {
      setFormData((prev) => ({
        ...prev,
        name: initialData.name || '',
        code: initialData.code || '',
        sku: initialData.sku || '',
        barcode: initialData.barcode || '',
        description: initialData.description || '',
        category_id: initialData.category_id || '',
        brand_id: initialData.brand_id || '',
        unit_id: initialData.unit_id || '',
        supplier_id: initialData.supplier_id || '',
        packaging_id: initialData.packaging_id || '',
        tax_id: initialData.tax_id || '',
        warehouse_id: initialData.warehouse_id || '',
        cost_price: initialData.cost_price ?? '',
        minimum_stock: initialData.minimum_stock ?? '',
        maximum_stock: initialData.maximum_stock ?? '',
        reorder_level: initialData.reorder_level ?? '',
        shelf_life_days: initialData.shelf_life_days ?? '',
        volume: initialData.volume ?? '',
        weight: initialData.weight ?? '',
        is_consignment: initialData.is_consignment !== false,
        is_sellable: initialData.is_sellable !== false,
        is_purchasable: initialData.is_purchasable !== false,
        is_active: initialData.is_active !== false,
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = { ...formData };
    ['cost_price', 'minimum_stock', 'maximum_stock', 'reorder_level', 'shelf_life_days', 'volume', 'weight'].forEach((k) => {
      if (payload[k] === '') payload[k] = null;
    });
    ['category_id', 'brand_id', 'unit_id', 'supplier_id', 'packaging_id', 'tax_id', 'warehouse_id'].forEach((k) => {
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

  const Section = ({ title, children }) => (
    <section className="card" style={{ padding: '20px', marginBottom: '16px' }}>
      <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>{title}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
        {children}
      </div>
    </section>
  );

  const Group = ({ label, name, required, children }) => (
    <div className="form-group" style={{ marginBottom: '10px' }}>
      <label style={labelStyle}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
      {children}
    </div>
  );

  return (
    <form onSubmit={handleSubmit}>
      {submitError && <div className="alert-error" style={{ marginBottom: '16px' }}>{submitError}</div>}

      <Section title="Informasi Umum">
        <Group label="Nama Produk" required>
          <input style={inputStyle} name="name" value={formData.name} onChange={handleChange} required placeholder="contoh: Thai Tea" />
        </Group>
        <Group label="Kode">
          <input style={inputStyle} name="code" value={formData.code} onChange={handleChange} placeholder="Otomatis jika kosong" />
        </Group>
        <Group label="SKU">
          <input style={inputStyle} name="sku" value={formData.sku} onChange={handleChange} placeholder="contoh: TT-PRM-001" />
        </Group>
        <Group label="Barcode">
          <input style={inputStyle} name="barcode" value={formData.barcode} onChange={handleChange} />
        </Group>
        <Group label="Deskripsi">
          <textarea style={inputStyle} name="description" rows="2" value={formData.description} onChange={handleChange} />
        </Group>
      </Section>

      <Section title="Klasifikasi & Pemasok">
        <Group label="Kategori">
          <select style={inputStyle} name="category_id" value={formData.category_id} onChange={handleChange}>
            <option value="">Pilih Kategori</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Group>
        <Group label="Merek">
          <select style={inputStyle} name="brand_id" value={formData.brand_id} onChange={handleChange}>
            <option value="">Pilih Merek</option>
            {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </Group>
        <Group label="Satuan">
          <select style={inputStyle} name="unit_id" value={formData.unit_id} onChange={handleChange}>
            <option value="">Pilih Satuan</option>
            {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </Group>
        <Group label="Kemasan">
          <select style={inputStyle} name="packaging_id" value={formData.packaging_id} onChange={handleChange}>
            <option value="">Pilih Kemasan</option>
            {packagings.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Group>
        <Group label="Pemasok">
          <select style={inputStyle} name="supplier_id" value={formData.supplier_id} onChange={handleChange}>
            <option value="">Pilih Pemasok</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Group>
        <Group label="Pajak">
          <select style={inputStyle} name="tax_id" value={formData.tax_id} onChange={handleChange}>
            <option value="">Pilih Pajak</option>
            {taxes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </Group>
        <Group label="Gudang">
          <select style={inputStyle} name="warehouse_id" value={formData.warehouse_id} onChange={handleChange}>
            <option value="">Pilih Gudang</option>
            {warehouses.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Group>
      </Section>

      <Section title="Harga & Stok">
        <Group label="Harga Modal">
          <input style={inputStyle} type="number" step="any" name="cost_price" value={formData.cost_price} onChange={handleChange} placeholder="0" />
        </Group>
        <Group label="Stok Minimum">
          <input style={inputStyle} type="number" name="minimum_stock" value={formData.minimum_stock} onChange={handleChange} placeholder="0" />
        </Group>
        <Group label="Stok Maksimum">
          <input style={inputStyle} type="number" name="maximum_stock" value={formData.maximum_stock} onChange={handleChange} placeholder="0" />
        </Group>
        <Group label="Level Restok">
          <input style={inputStyle} type="number" name="reorder_level" value={formData.reorder_level} onChange={handleChange} placeholder="0" />
        </Group>
        <Group label="Masa Simpan (hari)">
          <input style={inputStyle} type="number" name="shelf_life_days" value={formData.shelf_life_days} onChange={handleChange} placeholder="0" />
        </Group>
        <Group label="Volume">
          <input style={inputStyle} type="number" step="any" name="volume" value={formData.volume} onChange={handleChange} placeholder="ml / pcs" />
        </Group>
        <Group label="Berat (gram)">
          <input style={inputStyle} type="number" step="any" name="weight" value={formData.weight} onChange={handleChange} placeholder="0" />
        </Group>
      </Section>

      <Section title="Aktivasi">
        <Group label="Konsinyasi">
          <div style={{ paddingTop: '8px' }}>
            <input type="checkbox" name="is_consignment" checked={formData.is_consignment} onChange={handleChange} /> <span style={{ fontSize: '13px' }}>Produk konsinyasi (titipan par stock)</span>
          </div>
        </Group>
        <Group label="Dapat Dijual">
          <div style={{ paddingTop: '8px' }}>
            <input type="checkbox" name="is_sellable" checked={formData.is_sellable} onChange={handleChange} /> <span style={{ fontSize: '13px' }}>Bisa dijual ke outlet</span>
          </div>
        </Group>
        <Group label="Dapat Dibeli">
          <div style={{ paddingTop: '8px' }}>
            <input type="checkbox" name="is_purchasable" checked={formData.is_purchasable} onChange={handleChange} /> <span style={{ fontSize: '13px' }}>Bisa dibeli dari pemasok</span>
          </div>
        </Group>
        <Group label="Aktif">
          <div style={{ paddingTop: '8px' }}>
            <input type="checkbox" name="is_active" checked={formData.is_active} onChange={handleChange} /> <span style={{ fontSize: '13px' }}>Produk aktif</span>
          </div>
        </Group>
      </Section>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '16px' }}>
        <button type="button" className="btn" style={{ padding: '8px 16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={onCancel} disabled={isSubmitting}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
          {isSubmitting ? 'Menyimpan...' : 'Simpan Produk'}
        </button>
      </div>
    </form>
  );
};

export default ProductForm;
