import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Power, PowerOff, X } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { useToast } from '../../../components/toast/ToastContext';
import { tableCell, tableHeader } from '../../../utils/tableStyles';

const INPUT = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', fontSize: '14px', boxSizing: 'border-box' };
const LABEL = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: 'var(--text-main)' };
const iconBtn = (color) => ({ padding: '6px', borderRadius: '6px', color, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' });

const InlineUnitManager = ({ onClose, onSaved }) => {
  const toast = useToast();
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [symbol, setSymbol] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('Unit').select('*').order('name');
    setUnits(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditId(null); setName(''); setSymbol(''); setShowForm(true); };
  const openEdit = (u) => { setEditId(u.id); setName(u.name); setSymbol(u.symbol || ''); setShowForm(true); };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase.from('Unit').update({ name: name.trim(), symbol: symbol.trim() || null }).eq('id', editId);
        if (error) throw error;
        toast.success('Satuan berhasil diubah');
      } else {
        const { error } = await supabase.from('Unit').insert({ name: name.trim(), symbol: symbol.trim() || null, status: 'ACTIVE' });
        if (error) throw error;
        toast.success('Satuan berhasil ditambah');
      }
      setShowForm(false);
      load();
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  const toggle = async (u) => {
    const newStatus = u.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const { error } = await supabase.from('Unit').update({ status: newStatus }).eq('id', u.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Status diperbarui');
    load();
    if (onSaved) onSaved();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', width: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Kelola Satuan</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '13px' }} onClick={openAdd}>
              <Plus size={14} /> Tambah
            </button>
            <button onClick={onClose} style={{ padding: '4px', color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none' }}><X size={18} /></button>
          </div>
        </div>

        {showForm && (
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', backgroundColor: 'var(--background)', display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <label style={LABEL}>Nama Satuan</label>
              <input style={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="Contoh: Cup" autoFocus onKeyDown={(e) => e.key === 'Enter' && save()} />
            </div>
            <div style={{ width: '100px' }}>
              <label style={LABEL}>Simbol</label>
              <input style={INPUT} value={symbol} onChange={(e) => setSymbol(e.target.value)} placeholder="Cup" />
            </div>
            <button className="btn btn-primary" style={{ padding: '10px 16px', fontSize: '13px' }} onClick={save} disabled={saving || !name.trim()}>
              {saving ? '...' : 'Simpan'}
            </button>
            <button className="btn" style={{ padding: '10px 16px', fontSize: '13px', border: '1px solid var(--border)' }} onClick={() => setShowForm(false)}>Batal</button>
          </div>
        )}

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Memuat...</p>
          ) : units.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada satuan</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--background)' }}>
                  <th style={{ ...tableHeader, padding: '10px 16px' }}>Nama</th>
                  <th style={{ ...tableHeader, padding: '10px 16px' }}>Simbol</th>
                  <th style={{ ...tableHeader, padding: '10px 16px' }}>Status</th>
                  <th style={{ ...tableHeader, padding: '10px 16px', textAlign: 'center', width: '80px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {units.map((u) => (
                  <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...tableCell, padding: '10px 16px' }}>{u.name}</td>
                    <td style={{ ...tableCell, padding: '10px 16px' }}>{u.symbol || '-'}</td>
                    <td style={{ ...tableCell, padding: '10px 16px' }}>
                      <span className={`badge ${u.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>
                        {u.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ ...tableCell, padding: '10px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button title="Ubah" style={iconBtn('var(--primary)')} onClick={() => openEdit(u)}><Pencil size={14} /></button>
                        <button title={u.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'} style={iconBtn(u.status === 'ACTIVE' ? 'var(--danger)' : 'var(--success)')} onClick={() => toggle(u)}>
                          {u.status === 'ACTIVE' ? <PowerOff size={14} /> : <Power size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default InlineUnitManager;
