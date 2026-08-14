import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import WarehouseStockInRepository from '../../../repositories/WarehouseStockInRepository';
import { supabase } from '../../../utils/supabase';
import { useMasterLookupContext } from '../../../contexts/MasterLookupContext';
import { useToast } from '../../../components/toast/ToastContext';

const labelStyle = { display: 'block', marginBottom: '8px', fontWeight: '500', color: 'var(--text-main)' };
const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)' };

const WarehouseStockInFormComponent = ({ initialData, onSubmit, onCancel }) => {
  const { lookups } = useMasterLookupContext();
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(initialData || {
    warehouse_id: '',
    doc_date: new Date().toISOString().slice(0, 10),
    items: [{ product_id: '', qty: 1, unit_id: '', remark: '' }]
  });

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialData,
        doc_date: initialData.doc_date ? new Date(initialData.doc_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        items: initialData.items?.length > 0 ? initialData.items.map(i => ({
          product_id: i.product_id,
          qty: i.qty,
          unit_id: i.unit_id || '',
          remark: i.remark || ''
        })) : [{ product_id: '', qty: 1, unit_id: '', remark: '' }]
      });
    }
  }, [initialData]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const { data, error } = await supabase
          .from('Product')
          .select('id, code, name')
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

  const addItem = () => {
    setForm((prev) => ({ ...prev, items: [...prev.items, { product_id: '', qty: 1, unit_id: '', remark: '' }] }));
  };

  const removeItem = (index) => {
    setForm((prev) => ({ ...prev, items: prev.items.filter((_, i) => i !== index) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    await onSubmit({
      warehouse_id: Number(form.warehouse_id),
      doc_date: form.doc_date,
      items: form.items
        .filter((item) => item.product_id)
        .map((item) => ({
          product_id: Number(item.product_id),
          qty: Number(item.qty),
          unit_id: item.unit_id ? Number(item.unit_id) : undefined,
          remark: item.remark || undefined
        }))
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
        <div className="form-group">
          <label style={labelStyle}>Gudang Tujuan (Simpan Stok)</label>
          <select style={inputStyle} value={form.warehouse_id} onChange={(e) => updateField('warehouse_id', e.target.value)} required>
            <option value="">Pilih gudang</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label style={labelStyle}>Tanggal Masuk</label>
          <input style={inputStyle} type="date" value={form.doc_date} onChange={(e) => updateField('doc_date', e.target.value)} required />
        </div>
      </div>

      <div className="form-group">
        <label style={labelStyle}>Daftar Produk Masuk</label>
        {form.items.map((item, index) => (
          <div key={index} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1.5fr auto', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <select
              style={inputStyle}
              value={item.product_id}
              onChange={(e) => updateItem(index, 'product_id', e.target.value)}
              required
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
              required
            />
            <select
              style={inputStyle}
              value={item.unit_id}
              onChange={(e) => updateItem(index, 'unit_id', e.target.value)}
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
          + Tambah Produk
        </button>
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '32px' }}>
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

import { useParams } from 'react-router-dom';

const WarehouseStockInForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [initialData, setInitialData] = useState(null);
  const [loading, setLoading] = useState(!!id);

  useEffect(() => {
    if (id) {
      const fetchData = async () => {
        try {
          const result = await WarehouseStockInRepository.getStockIn(id);
          if (result.data.status !== 'DRAFT') {
            toast.error('Hanya dokumen DRAFT yang dapat diubah');
            navigate('/sales/stock-in');
            return;
          }
          setInitialData(result.data);
        } catch (error) {
          toast.error('Gagal memuat data');
          navigate('/sales/stock-in');
        } finally {
          setLoading(false);
        }
      };
      fetchData();
    }
  }, [id, navigate, toast]);

  const handleSubmit = async (formData) => {
    try {
      if (id) {
        await WarehouseStockInRepository.updateStockIn(id, formData);
        toast.success('Barang masuk berhasil diperbarui.');
      } else {
        await WarehouseStockInRepository.createStockIn(formData);
        toast.success('Barang masuk berhasil dibuat.');
      }
      navigate('/sales/stock-in');
    } catch (error) {
      toast.error(error.message || `Gagal ${id ? 'memperbarui' : 'membuat'} barang masuk`);
    }
  };

  if (loading) return <p style={{ padding: '48px', textAlign: 'center' }}>Memuat...</p>;

  return (
    <EntityFormPage
      title={id ? "Ubah Barang Masuk" : "Tambah Barang Masuk (Hasil Produksi)"}
      form={(props) => <WarehouseStockInFormComponent initialData={initialData} {...props} />}
      onSubmit={handleSubmit}
      onCancel={() => navigate('/sales/stock-in')}
    />
  );
};

export default WarehouseStockInForm;
