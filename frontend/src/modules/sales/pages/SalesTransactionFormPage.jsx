import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import { SalesTransactionRepository } from '../../../repositories/SalesTransactionRepository';
import { supabase } from '../../../utils/supabase';
import { useToast } from '../../../components/toast/ToastContext';

const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-main)' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)' };

const SalesTransactionFormComponent = ({ onSubmit, onCancel }) => {
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    warung_id: '',
    transaction_date: new Date().toISOString().slice(0, 10),
    payment_method: 'CASH',
    notes: '',
    items: [{ product_id: '', qty: 1, selling_price: 0, discount: 0 }]
  });

  useEffect(() => {
    const fetchOptions = async () => {
      const [customerRes, productRes] = await Promise.all([
        supabase.from('Warung').select('id, code, name').eq('status', 'ACTIVE').order('name'),
        supabase.from('Product').select('id, code, name, selling_price, cost_price').eq('is_active', true).order('name'),
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

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { product_id: '', qty: 1, selling_price: 0, discount: 0 }] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleProductChange = (index, productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    updateItem(index, 'product_id', productId);
    if (product) updateItem(index, 'selling_price', product.selling_price || 0);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      warung_id: Number(form.warung_id),
      transaction_date: form.transaction_date,
      payment_method: form.payment_method,
      notes: form.notes,
      items: form.items
        .filter((item) => item.product_id)
        .map((item) => ({
          product_id: Number(item.product_id),
          qty: Number(item.qty),
          selling_price: Number(item.selling_price),
          discount: Number(item.discount) || 0,
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
          <label style={labelStyle}>Tanggal Transaksi</label>
          <input style={inputStyle} type="date" value={form.transaction_date} onChange={(e) => updateField('transaction_date', e.target.value)} required />
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label style={labelStyle}>Metode Pembayaran</label>
          <select style={inputStyle} value={form.payment_method} onChange={(e) => updateField('payment_method', e.target.value)}>
            <option value="CASH">Tunai</option>
            <option value="TRANSFER">Transfer</option>
            <option value="CREDIT">Kredit (Piutang)</option>
          </select>
        </div>
        <div className="form-group">
          <label style={labelStyle}>Catatan</label>
          <input style={inputStyle} type="text" value={form.notes} onChange={(e) => updateField('notes', e.target.value)} />
        </div>
      </div>

      <div className="form-group">
        <label style={labelStyle}>Item</label>
        {form.items.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '4px', fontWeight: 'bold', fontSize: '12px', color: 'var(--text-muted)' }}>
            <div>Nama Produk</div>
            <div>Qty</div>
            <div>Harga Satuan</div>
            <div>Diskon</div>
            <div>Aksi</div>
          </div>
        )}
        {form.items.map((item, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
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
            <input
              style={inputStyle}
              type="number"
              placeholder="Harga"
              value={item.selling_price}
              onChange={(e) => updateItem(index, 'selling_price', e.target.value)}
            />
            <input
              style={inputStyle}
              type="number"
              placeholder="Diskon"
              value={item.discount}
              onChange={(e) => updateItem(index, 'discount', e.target.value)}
            />
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
          Simpan Transaksi
        </button>
      </div>
    </form>
  );
};

const SalesTransactionFormPage = () => {
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (formData) => {
    try {
      await SalesTransactionRepository.create(formData);
      toast.success('Transaksi penjualan berhasil dibuat.');
      navigate('/sales/transactions');
    } catch (error) {
      toast.error(error.message || 'Gagal membuat transaksi penjualan');
    }
  };

  return (
    <EntityFormPage
      title="Tambah Transaksi Penjualan"
      form={(props) => <SalesTransactionFormComponent {...props} />}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/sales/transactions')}
    />
  );
};

export default SalesTransactionFormPage;
