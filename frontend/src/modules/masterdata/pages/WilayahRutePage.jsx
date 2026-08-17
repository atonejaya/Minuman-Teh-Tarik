import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Power, PowerOff } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import MasterDataRepository from '../repositories/MasterDataRepository';
import { useToast } from '../../../components/toast/ToastContext';
import { tableCell, tableHeader } from '../../../utils/tableStyles';

const DAY_LABELS = { MONDAY: 'Senin', TUESDAY: 'Selasa', WEDNESDAY: 'Rabu', THURSDAY: 'Kamis', FRIDAY: 'Jumat', SATURDAY: 'Sabtu', SUNDAY: 'Minggu' };

const iconBtn = (color) => ({
  padding: '6px', borderRadius: '6px', color, backgroundColor: 'transparent',
  border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center',
  justifyContent: 'center', transition: 'background-color 0.15s',
});

const INPUT = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', fontSize: '14px', boxSizing: 'border-box' };
const LABEL = { display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-main)', fontSize: '13px' };

const WilayahRutePage = () => {
  const toast = useToast();
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaName, setAreaName] = useState('');
  const [areaDesc, setAreaDesc] = useState('');
  const [savingArea, setSavingArea] = useState(false);

  const [showRouteForm, setShowRouteForm] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [routeName, setRouteName] = useState('');
  const [routeSalesId, setRouteSalesId] = useState('');
  const [routeVisitDay, setRouteVisitDay] = useState('');
  const [routeDesc, setRouteDesc] = useState('');
  const [savingRoute, setSavingRoute] = useState(false);
  const [salesList, setSalesList] = useState([]);

  const loadAreas = useCallback(async () => {
    setLoadingAreas(true);
    try {
      const { data } = await supabase.from('Area').select('*').order('name');
      setAreas(data || []);
    } catch (err) {
      toast.error('Gagal memuat area');
    }
    setLoadingAreas(false);
  }, [toast]);

  const loadRoutes = useCallback(async (areaId) => {
    if (!areaId) { setRoutes([]); return; }
    setLoadingRoutes(true);
    try {
      const { data } = await supabase.from('Route').select('*, sales:User!sales_id(name)').eq('area_id', areaId).order('name');
      setRoutes(data || []);
    } catch (err) {
      toast.error('Gagal memuat rute');
    }
    setLoadingRoutes(false);
  }, [toast]);

  const loadSales = useCallback(async () => {
    const { data } = await supabase.from('User').select('id, name').eq('role', 'SALES').eq('is_active', true).order('name');
    setSalesList(data || []);
  }, []);

  useEffect(() => { loadAreas(); loadSales(); }, [loadAreas, loadSales]);
  useEffect(() => { loadRoutes(selectedArea?.id); }, [selectedArea, loadRoutes]);

  const openAddArea = () => { setEditingArea(null); setAreaName(''); setAreaDesc(''); setShowAreaForm(true); };
  const openEditArea = (a) => { setEditingArea(a); setAreaName(a.name); setAreaDesc(a.description || ''); setShowAreaForm(true); };

  const saveArea = async () => {
    if (!areaName.trim()) return;
    setSavingArea(true);
    try {
      if (editingArea) {
        await MasterDataRepository.update('Area', editingArea.id, { name: areaName.trim(), description: areaDesc.trim() });
        toast.success('Area berhasil diubah');
      } else {
        await MasterDataRepository.create('Area', { name: areaName.trim(), description: areaDesc.trim(), is_active: true });
        toast.success('Area berhasil ditambah');
      }
      setShowAreaForm(false);
      loadAreas();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan area');
    }
    setSavingArea(false);
  };

  const toggleArea = async (a) => {
    try {
      await MasterDataRepository.update('Area', a.id, { is_active: !a.is_active });
      toast.success('Status area diperbarui');
      loadAreas();
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui status');
    }
  };

  const openAddRoute = () => { setEditingRoute(null); setRouteName(''); setRouteSalesId(''); setRouteVisitDay(''); setRouteDesc(''); setShowRouteForm(true); };
  const openEditRoute = (r) => { setEditingRoute(r); setRouteName(r.name); setRouteSalesId(r.sales_id || ''); setRouteVisitDay(r.visit_day || ''); setRouteDesc(r.description || ''); setShowRouteForm(true); };

  const saveRoute = async () => {
    if (!routeName.trim()) return;
    setSavingRoute(true);
    try {
      const payload = {
        name: routeName.trim(),
        area_id: selectedArea.id,
        sales_id: routeSalesId ? Number(routeSalesId) : null,
        visit_day: routeVisitDay || null,
        description: routeDesc.trim() || null,
      };
      if (editingRoute) {
        await MasterDataRepository.update('Route', editingRoute.id, payload);
        toast.success('Rute berhasil diubah');
      } else {
        await MasterDataRepository.create('Route', { ...payload, is_active: true });
        toast.success('Rute berhasil ditambah');
      }
      setShowRouteForm(false);
      loadRoutes(selectedArea.id);
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan rute');
    }
    setSavingRoute(false);
  };

  const toggleRoute = async (r) => {
    try {
      await MasterDataRepository.update('Route', r.id, { is_active: !r.is_active });
      toast.success('Status rute diperbarui');
      loadRoutes(selectedArea.id);
    } catch (err) {
      toast.error(err.message || 'Gagal memperbarui status');
    }
  };

  return (
    <div>
      <h2 style={{ marginBottom: '16px' }}>Wilayah & Rute</h2>

      <div style={{ display: 'flex', gap: '16px', alignItems: 'stretch', minHeight: '500px' }}>
        {/* LEFT: Area List */}
        <div style={{ flex: '0 0 380px', backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>Area</h3>
            <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '13px' }} onClick={openAddArea}>
              <Plus size={14} /> Tambah
            </button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {loadingAreas ? (
              <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Memuat...</p>
            ) : areas.length === 0 ? (
              <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada area</p>
            ) : areas.map((a) => (
              <div
                key={a.id}
                onClick={() => setSelectedArea(a)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid var(--border)',
                  backgroundColor: selectedArea?.id === a.id ? 'color-mix(in srgb, var(--primary) 8%, var(--surface))' : 'transparent',
                  borderLeft: selectedArea?.id === a.id ? '3px solid var(--primary)' : '3px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-main)' }}>{a.name}</div>
                    {a.description && <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.description}</div>}
                  </div>
                  <div style={{ display: 'flex', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                    <button title="Ubah" style={iconBtn('var(--primary)')} onClick={() => openEditArea(a)}>
                      <Pencil size={14} />
                    </button>
                    <button title={a.is_active ? 'Nonaktifkan' : 'Aktifkan'} style={iconBtn(a.is_active ? 'var(--danger)' : 'var(--success)')} onClick={() => toggleArea(a)}>
                      {a.is_active ? <PowerOff size={14} /> : <Power size={14} />}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Route List */}
        <div style={{ flex: 1, backgroundColor: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '15px', fontWeight: '600' }}>
              {selectedArea ? `Rute — ${selectedArea.name}` : 'Rute'}
            </h3>
            {selectedArea && (
              <button className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '6px 12px', fontSize: '13px' }} onClick={openAddRoute}>
                <Plus size={14} /> Tambah
              </button>
            )}
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {!selectedArea ? (
              <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Pilih Area untuk melihat rute</p>
            ) : loadingRoutes ? (
              <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Memuat...</p>
            ) : routes.length === 0 ? (
              <p style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada rute di area ini</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: 'var(--background)' }}>
                    <th style={{ ...tableHeader, padding: '10px 16px' }}>Nama Rute</th>
                    <th style={{ ...tableHeader, padding: '10px 16px' }}>Sales</th>
                    <th style={{ ...tableHeader, padding: '10px 16px' }}>Hari</th>
                    <th style={{ ...tableHeader, padding: '10px 16px', textAlign: 'center', width: '80px' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ ...tableCell, padding: '10px 16px', fontWeight: '500' }}>{r.name}</td>
                      <td style={{ ...tableCell, padding: '10px 16px' }}>{r.sales?.name || '-'}</td>
                      <td style={{ ...tableCell, padding: '10px 16px' }}>{DAY_LABELS[r.visit_day] || '-'}</td>
                      <td style={{ ...tableCell, padding: '10px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                          <button title="Ubah" style={iconBtn('var(--primary)')} onClick={() => openEditRoute(r)}>
                            <Pencil size={14} />
                          </button>
                          <button title={r.is_active ? 'Nonaktifkan' : 'Aktifkan'} style={iconBtn(r.is_active ? 'var(--danger)' : 'var(--success)')} onClick={() => toggleRoute(r)}>
                            {r.is_active ? <PowerOff size={14} /> : <Power size={14} />}
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

      {/* Area Form Modal */}
      {showAreaForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '24px', width: '400px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>{editingArea ? 'Ubah Area' : 'Tambah Area'}</h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={LABEL}>Nama Area *</label>
              <input style={INPUT} value={areaName} onChange={(e) => setAreaName(e.target.value)} placeholder="Contoh: Jakarta Selatan" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={LABEL}>Keterangan</label>
              <input style={INPUT} value={areaDesc} onChange={(e) => setAreaDesc(e.target.value)} placeholder="Opsional" />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ padding: '8px 16px', border: '1px solid var(--border)' }} onClick={() => setShowAreaForm(false)}>Batal</button>
              <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={saveArea} disabled={savingArea || !areaName.trim()}>
                {savingArea ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Route Form Modal */}
      {showRouteForm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '24px', width: '440px', boxShadow: 'var(--shadow-lg)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>{editingRoute ? 'Ubah Rute' : 'Tambah Rute'}</h3>
            <div style={{ marginBottom: '14px' }}>
              <label style={LABEL}>Nama Rute *</label>
              <input style={INPUT} value={routeName} onChange={(e) => setRouteName(e.target.value)} placeholder="Contoh: Rute Cipete - Kemang" />
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={LABEL}>Sales</label>
              <select style={INPUT} value={routeSalesId} onChange={(e) => setRouteSalesId(e.target.value)}>
                <option value="">Pilih Sales (opsional)</option>
                {salesList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={LABEL}>Hari Kunjungan</label>
              <select style={INPUT} value={routeVisitDay} onChange={(e) => setRouteVisitDay(e.target.value)}>
                <option value="">Pilih Hari</option>
                {Object.entries(DAY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div style={{ marginBottom: '14px' }}>
              <label style={LABEL}>Keterangan</label>
              <input style={INPUT} value={routeDesc} onChange={(e) => setRouteDesc(e.target.value)} placeholder="Opsional" />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button className="btn" style={{ padding: '8px 16px', border: '1px solid var(--border)' }} onClick={() => setShowRouteForm(false)}>Batal</button>
              <button className="btn btn-primary" style={{ padding: '8px 16px' }} onClick={saveRoute} disabled={savingRoute || !routeName.trim()}>
                {savingRoute ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WilayahRutePage;
