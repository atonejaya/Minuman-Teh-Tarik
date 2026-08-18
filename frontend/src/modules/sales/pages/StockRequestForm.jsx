import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import StockRequestRepository from '../../../repositories/StockRequestRepository';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/toast/ToastContext';
import { formatRupiah } from '../../../utils/format';

const StockRequestForm = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const toast = useToast();
  const [products, setProducts] = useState([]);
  const [items, setItems] = useState([{ product_id: '', qty: 1, unit_id: '', remark: '' }]);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProducts = async () => {
      const { data } = await supabase.from('Product').select('id, name, code, unit:Unit(id, name)').eq('is_active', true).order('name');
      setProducts(data || []);
    };
    loadProducts();
  }, []);

  const addItem = () => setItems([...items, { product_id: '', qty: 1, unit_id: '', remark: '' }]);
  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx, field, value) => {
    setItems(items.map((item, i) => {
      if (i !== idx) return item;
      const updated = { ...item, [field]: value };
      if (field === 'product_id') {
        const product = products.find(p => p.id === Number(value));
        updated.unit_id = product?.unit?.id || '';
      }
      return updated;
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validItems = items.filter(i => i.product_id && i.qty > 0);
    if (validItems.length === 0) {
      setError('Tambah minimal 1 produk');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = validItems.map(i => ({
        product_id: Number(i.product_id),
        qty: Number(i.qty),
        unit_id: i.unit_id ? Number(i.unit_id) : null,
        remark: i.remark || null,
      }));
      const result = await StockRequestRepository.submitRequest(user.id, payload, notes || null);

      // Send notification to OWNER
      const totalQty = payload.reduce((sum, i) => sum + i.qty, 0);
      await StockRequestRepository.createNotification(
        'OWNER',
        'Permintaan Stok Baru',
        `${user.name} meminta stok: ${totalQty} item (${payload.length} produk)`,
        '/stock-requests'
      );

      toast.success('Berhasil mengajukan permintaan stok');
      navigate('/stock-requests');
    } catch (err) {
      setError(err.message || 'Gagal mengajukan permintaan');
    }
    setSubmitting(false);
  };

  return (
    <div className="page-mobile">
      <div className="card-custom" style={{ padding: '20px' }}>
        <h2 style={{ margin: '0 0 16px' }}>Ajukan Permintaan Stok</h2>

        {error && <div className="alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <div style={{ marginBottom: '16px' }}>
          <label className="form-label">Catatan (opsional)</label>
          <textarea
            className="form-input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Catatan untuk permintaan ini..."
          />
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label className="form-label" style={{ margin: 0 }}>Daftar Produk</label>
            <button type="button" onClick={addItem} className="btn btn-secondary" style={{ padding: '4px 8px', fontSize: '12px' }}>
              <Plus size={14} /> Tambah
            </button>
          </div>

          {items.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
              <select
                className="form-input"
                style={{ flex: 2 }}
                value={item.product_id}
                onChange={(e) => updateItem(idx, 'product_id', e.target.value)}
              >
                <option value="">Pilih Produk</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.code})</option>
                ))}
              </select>
              <input
                type="number"
                className="form-input"
                style={{ flex: 1 }}
                min="1"
                value={item.qty}
                onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                placeholder="Qty"
              />
              <input
                type="text"
                className="form-input"
                style={{ flex: 1 }}
                value={item.remark}
                onChange={(e) => updateItem(idx, 'remark', e.target.value)}
                placeholder="Catatan"
              />
              {items.length > 1 && (
                <button type="button" onClick={() => removeItem(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '8px', color: 'var(--danger)' }}>
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button type="button" className="btn" onClick={() => navigate(-1)} disabled={submitting}>
            Batal
          </button>
          <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 size={16} className="spin" /> Mengirim...</> : 'Kirim Permintaan'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StockRequestForm;
