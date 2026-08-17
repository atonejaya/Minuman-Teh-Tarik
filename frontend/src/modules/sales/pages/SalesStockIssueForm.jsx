import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import SalesStockIssueRepository from '../../../repositories/SalesStockIssueRepository';
import { supabase } from '../../../utils/supabase';
import { useMasterLookupContext } from '../../../contexts/MasterLookupContext';
import { useToast } from '../../../components/toast/ToastContext';

const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-main)' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)' };

const SalesStockIssueFormComponent = ({ onSubmit, onCancel }) => {
  const { lookups } = useMasterLookupContext();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({
    warehouse_id: '',
    sales_id: '',
    issue_date: new Date().toISOString().slice(0, 10),
    items: [{ product_id: '', qty: 1, unit_id: '', remark: '' }]
  });
  
  const { id } = useParams();

  const navigate = useNavigate();

  useEffect(() => {
    if (id) {
      SalesStockIssueRepository.getSalesStockIssue(id).then(({ data }) => {
        if (data) {
          if (data.status !== 'DRAFT') {
            alert('Hanya mutasi stok DRAFT yang dapat diedit');
            navigate('/sales/stock-issues');
            return;
          }
          setForm({
            warehouse_id: data.warehouse_id || '',
            sales_id: data.sales_id || '',
            issue_date: data.issue_date || new Date().toISOString().slice(0, 10),
            items: data.items && data.items.length > 0 ? data.items.map(i => ({
              product_id: i.product_id || '',
              qty: i.qty || 1,
              unit_id: i.unit_id || '',
              remark: i.remark || ''
            })) : [{ product_id: '', qty: 1, unit_id: '', remark: '' }]
          });
        }
      });
    }
  }, [id, navigate]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('Product')
          .select('id, code, name, cost_price, unit_id')
          .eq('is_active', true)
          .order('name');
        if (error) throw error;
        setProducts(data || []);
      } catch (error) {
        console.error('Failed to fetch products', error);
      }
    };
    fetchProducts();
  }, []);

  const warehouses = lookups?.warehouses || [];
  const salesmen = lookups?.salesmen || [];
  const units = lookups?.units || [];

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => {
      const items = prev.items.map((item, i) => (i === index ? { ...item, [field]: value } : item));
      return { ...prev, items };
    });
  };

  const handleProductChange = (index, productId) => {
    const product = products.find((p) => String(p.id) === String(productId));
    updateItem(index, 'product_id', productId);
    if (product && product.unit_id) {
      updateItem(index, 'unit_id', product.unit_id);
    }
  };

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { product_id: '', qty: 1, unit_id: '', remark: '' }] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {
      warehouse_id: Number(form.warehouse_id),
      sales_id: Number(form.sales_id),
      issue_date: form.issue_date,
      items: form.items
        .filter((item) => item.product_id)
        .map((item) => ({
          product_id: Number(item.product_id),
          qty: Number(item.qty),
          unit_id: item.unit_id ? Number(item.unit_id) : undefined,
          remark: item.remark || undefined
        }))
    };
    await onSubmit(payload, id);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div className="form-group">
          <label style={labelStyle}>Gudang</label>
          <select style={inputStyle} value={form.warehouse_id} onChange={(e) => updateField('warehouse_id', e.target.value)} required>
            <option value="">Pilih gudang</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label style={labelStyle}>Sales</label>
          <select style={inputStyle} value={form.sales_id} onChange={(e) => updateField('sales_id', e.target.value)} required>
            <option value="">Pilih sales</option>
            {salesmen.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label style={labelStyle}>Tanggal Mutasi</label>
        <input style={inputStyle} type="date" value={form.issue_date} onChange={(e) => updateField('issue_date', e.target.value)} required />
      </div>

      <div className="form-group">
        <label style={labelStyle}>Item</label>
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
              value={item.unit_id}
              onChange={(e) => updateItem(index, 'unit_id', e.target.value)}
              required
            >
              <option value="">Unit</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <input
              style={inputStyle}
              placeholder="Keterangan"
              value={item.remark}
              onChange={(e) => updateItem(index, 'remark', e.target.value)}
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
          Simpan Draft
        </button>
      </div>
    </form>
  );
};

const SalesStockIssueForm = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const { id } = useParams();

  const handleSubmit = async (formData, editId) => {
    try {
      if (editId) {
        await SalesStockIssueRepository.updateSalesStockIssue(editId, formData);
        toast.success('Mutasi stok berhasil diubah.');
      } else {
        await SalesStockIssueRepository.createSalesStockIssue(formData);
        toast.success('Mutasi stok berhasil dibuat.');
      }
      navigate('/sales/stock-issues');
    } catch (error) {
      toast.error(error.message || 'Gagal menyimpan mutasi stok');
    }
  };

  return (
    <EntityFormPage
      title={id ? "Edit Mutasi Stok" : "Tambah Mutasi Stok"}
      form={(props) => <SalesStockIssueFormComponent {...props} />}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/sales/stock-issues')}
    />
  );
};

export default SalesStockIssueForm;
