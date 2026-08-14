import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import { SalesReturnRepository } from '../../../repositories/SalesReturnRepository';
import { supabase } from '../../../utils/supabase';
import { useToast } from '../../../components/toast/ToastContext';

const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-main)' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)' };

const SalesReturnFormComponent = ({ onSubmit, onCancel }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    warung_id: '',
    return_date: new Date().toISOString().slice(0, 10),
    notes: '',
    items: [{ product_id: '', qty: 1, reason: 'OTHER', condition: 'GOOD', item_price: 0 }]
  });

  useEffect(() => {
    const fetchOptions = async () => {
      const [customerRes, productRes] = await Promise.all([
        supabase.from('Warung').select('id, code, name').eq('status', 'ACTIVE').order('name'),
        supabase.from('Product').select('id, code, name, cost_price').eq('is_active', true).order('name'),
      ]);
      setCustomers(customerRes.data || []);
      setProducts(productRes.data || []);
    };
    fetchOptions();
  }, []);

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const items = prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return { ...prev, items };
    });
  };

  const handleProductChange = (index, productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    updateItem(index, 'product_id', productId);
    if (product) updateItem(index, 'item_price', product.cost_price || 0);
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { product_id: '', qty: 1, reason: 'OTHER', condition: 'GOOD', item_price: 0 }] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      warung_id: Number(form.warung_id),
      return_date: form.return_date,
      notes: form.notes,
      items: form.items
        .filter((item) => item.product_id)
        .map((item) => ({
          product_id: Number(item.product_id),
          qty: Number(item.qty),
          reason: item.reason || 'OTHER',
          condition: item.condition,
          item_price: Number(item.item_price) || 0,
        }))
    };
    await onSubmit(payload);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label style={labelStyle}>Warung</label>
          <select style={inputStyle} value={form.warung_id} onChange={(e) => updateField('warung_id', e.target.value)} required>
            <option value="">Pilih warung</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label style={labelStyle}>Tanggal Retur</label>
          <input style={inputStyle} type="date" value={form.return_date} onChange={(e) => updateField('return_date', e.target.value)} required />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label style={labelStyle}>Catatan</label>
          <input style={inputStyle} type="text" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label style={labelStyle}>Item Retur</label>
        {form.items.map((item, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <select
              style={inputStyle}
              value={item.product_id}
              onChange={(e) => handleProductChange(index, e.target.value)}
            >
              <option value="">Pilih produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <input
              style={inputStyle}
              type="number"
              min="1"
              placeholder="Qty"
              value={item.qty}
              onChange={(e) => updateItem(index, 'qty', e.target.value)}
            />
            <select
              style={inputStyle}
              value={item.condition}
              onChange={(e) => updateItem(index, 'condition', e.target.value)}
            >
              <option value="GOOD">Baik</option>
              <option value="DAMAGED">Rusak / Kedaluwarsa</option>
            </select>
            <select
              style={inputStyle}
              value={item.reason}
              onChange={(e) => updateItem(index, 'reason', e.target.value)}
            >
              <option value="DAMAGED">Rusak</option>
              <option value="LEAKED">Bocor</option>
              <option value="WRONG_ITEM">Salah item</option>
              <option value="EXPIRED">Kedaluwarsa</option>
              <option value="NOT_SOLD">Tidak laku</option>
              <option value="OTHER">Lainnya</option>
            </select>
            <button type="button" className="btn" style={{ padding: '8px 12px', color: 'var(--danger)' }} onClick={() => removeItem(index)}>
              Hapus
            </button>
          </div>
        ))}
        <button type="button" className="btn" style={{ padding: '8px 16px', backgroundColor: 'var(--secondary)', color: '#fff' }} onClick={addItem}>
          + Tambah Item
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button type="button" className="btn" style={{ padding: '8px 16px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)' }} onClick={onCancel}>
          Batal
        </button>
        <button type="submit" className="btn btn-primary">
          Simpan Retur
        </button>
      </div>
    </form>
  );
};

const SalesReturnFormPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (formData) => {
    try {
      await SalesReturnRepository.create(formData);
      toast.success('Retur penjualan berhasil dibuat.');
      navigate('/sales/returns');
    } catch (error) {
      toast.error(error.message || 'Gagal membuat retur penjualan');
    }
  };

  return (
    <EntityFormPage
      title="Tambah Retur Penjualan"
      form={(props) => <SalesReturnFormComponent {...props} />}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/sales/returns')}
    />
  );
};

export default SalesReturnFormPage;
