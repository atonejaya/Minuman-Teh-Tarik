# Master Data Menu Restructure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure Master Data sidebar to 5 items (Pelanggan, Sales, Produk, Wilayah & Rute, Gudang), merge Area+Route into one page, and move Kategori/Satuan management into ProductForm modals.

**Architecture:** Sidebar config update + new WilayahRutePage (master-detail) + ProductForm inline modals for Category/Unit CRUD. No DB changes, no API changes.

**Tech Stack:** React 19, react-router-dom 7, Supabase (PostgREST), lucide-react icons, inline styles, existing MasterDataRepository.

## Global Constraints
- Bahasa Indonesia for all UI text
- Inline `style={{}}` only (no new CSS files)
- CSS vars from `index.css`: `--primary`, `--surface`, `--border`, `--text-main`, `--text-muted`, `--danger`, `--success`, `--radius-md`, `--shadow-sm`
- Class names: `card-custom`, `form-group`, `btn`, `btn-primary`, `btn-danger`
- Icons from `lucide-react`
- No DB schema changes, no API contract changes
- Verify via `npm run build` + `npx wrangler deploy`

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `src/layouts/sidebarConfig.js` | Modify | Remove Kategori/Satuan/Area/Route, add Wilayah & Rute |
| `src/App.jsx` | Modify | Add `/wilayah-rute` route, keep old routes as redirects |
| `src/modules/masterdata/pages/WilayahRutePage.jsx` | Create | Combined Area+Route master-detail page |
| `src/modules/product/components/ProductForm.jsx` | Modify | Add "Kelola Kategori" & "Kelola Satuan" buttons + modals |
| `src/modules/masterdata/components/InlineCategoryManager.jsx` | Create | Modal/table for Category CRUD from ProductForm |
| `src/modules/masterdata/components/InlineUnitManager.jsx` | Create | Modal/table for Unit CRUD from ProductForm |

---

## Task 1: Update Sidebar Config

**Files:**
- Modify: `src/layouts/sidebarConfig.js:32-42`

- [ ] Replace the `master-data` children array. Remove `Kategori`, `Satuan`, `Area`, `Route`. Add `Wilayah & Rute`.

Current code (lines 32-42):
```js
{
    key: 'master-data', label: 'Master Data', icon: ChevronDown,
    children: [
      { to: '/customers', label: 'Pelanggan', icon: Users },
      { to: '/sales-users', label: 'Sales', icon: UserCog },
      { to: '/products', label: 'Produk', icon: ShoppingCart },
      { to: '/categories', label: 'Kategori', icon: Layers },
      { to: '/units', label: 'Satuan', icon: Ruler },
      { to: '/areas', label: 'Area', icon: Map },
      { to: '/routes', label: 'Rute', icon: RouteIcon },
      { to: '/warehouses', label: 'Gudang', icon: Building2 },
    ],
  },
```

Replace with:
```js
{
    key: 'master-data', label: 'Master Data', icon: ChevronDown,
    children: [
      { to: '/customers', label: 'Pelanggan', icon: Users },
      { to: '/sales-users', label: 'Sales', icon: UserCog },
      { to: '/products', label: 'Produk', icon: ShoppingCart },
      { to: '/wilayah-rute', label: 'Wilayah & Rute', icon: Map },
      { to: '/warehouses', label: 'Gudang', icon: Building2 },
    ],
  },
```

Also clean up unused imports (`Layers`, `Ruler`, `RouteIcon`) from the import statement if they are no longer used anywhere in the file. `RouteIcon` and `Map` can stay since `Map` is used for Wilayah & Rute.

- [ ] Run `npm run build` to verify no errors.
- [ ] Commit: `feat: restructure sidebar - remove kategori/satuan/area/route, add wilayah-rute`

---

## Task 2: Create WilayahRutePage

**Files:**
- Create: `src/modules/masterdata/pages/WilayahRutePage.jsx`

- [ ] Create the combined page with a two-panel master-detail layout:
  - **Left panel (40% width):** Area list with + button, edit, toggle active
  - **Right panel (60% width):** Routes for selected Area, with + button, edit, toggle active
  - When no Area is selected, right panel shows "Pilih Area untuk melihat rute"
  - Use existing `MasterDataRepository` for all CRUD
  - Use inline styles consistent with existing UI

Full implementation:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Power, PowerOff, MapPin, Route as RouteIcon, ChevronRight } from 'lucide-react';
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

const WilayahRutePage = () => {
  const toast = useToast();
  const [areas, setAreas] = useState([]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [routes, setRoutes] = useState([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [loadingRoutes, setLoadingRoutes] = useState(false);

  // Area form state
  const [showAreaForm, setShowAreaForm] = useState(false);
  const [editingArea, setEditingArea] = useState(null);
  const [areaName, setAreaName] = useState('');
  const [areaDesc, setAreaDesc] = useState('');
  const [savingArea, setSavingArea] = useState(false);

  // Route form state
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

  // --- Area CRUD ---
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

  // --- Route CRUD ---
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

  const INPUT = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', fontSize: '14px', boxSizing: 'border-box' };
  const LABEL = { display: 'block', marginBottom: '6px', fontWeight: '500', color: 'var(--text-main)', fontSize: '13px' };

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
```

- [ ] Run `npm run build` to verify.
- [ ] Commit: `feat: add WilayahRutePage - combined Area+Route master-detail`

---

## Task 3: Add Route in App.jsx

**Files:**
- Modify: `src/App.jsx:47-51,122-127`

- [ ] Add lazy import for WilayahRutePage near the other masterdata imports (after line 63):
```js
const WilayahRutePage = lazy(() => import('./modules/masterdata/pages/WilayahRutePage.jsx'));
```

- [ ] Add route inside the owner `<Route element={<RequireRole roles={['OWNER', 'ADMIN']} />}>` block (after line 139, after categories routes):
```jsx
<Route path="wilayah-rute" element={<WilayahRutePage />} />
```

- [ ] Keep existing `/areas`, `/routes`, `/categories`, `/units` routes for backwards compatibility (bookmarks etc) — no removal needed.

- [ ] Run `npm run build` to verify.
- [ ] Commit: `feat: add /wilayah-rute route in App.jsx`

---

## Task 4: Create InlineCategoryManager

**Files:**
- Create: `src/modules/masterdata/components/InlineCategoryManager.jsx`

- [ ] Create a modal component for managing ProductCategory from within ProductForm:

```jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Power, PowerOff, X } from 'lucide-react';
import { supabase } from '../../../utils/supabase';
import { useToast } from '../../../components/toast/ToastContext';
import { tableCell, tableHeader } from '../../../utils/tableStyles';

const INPUT = { width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', color: 'var(--text-main)', fontSize: '14px', boxSizing: 'border-box' };
const LABEL = { display: 'block', marginBottom: '6px', fontWeight: '500', fontSize: '13px', color: 'var(--text-main)' };
const iconBtn = (color) => ({ padding: '6px', borderRadius: '6px', color, backgroundColor: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' });

const InlineCategoryManager = ({ onClose, onSaved }) => {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('ProductCategory').select('*').order('name');
    setCategories(data || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditId(null); setName(''); setShowForm(true); };
  const openEdit = (c) => { setEditId(c.id); setName(c.name); setShowForm(true); };

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      if (editId) {
        const { error } = await supabase.from('ProductCategory').update({ name: name.trim() }).eq('id', editId);
        if (error) throw error;
        toast.success('Kategori berhasil diubah');
      } else {
        const { error } = await supabase.from('ProductCategory').insert({ name: name.trim(), status: 'ACTIVE' });
        if (error) throw error;
        toast.success('Kategori berhasil ditambah');
      }
      setShowForm(false);
      load();
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(err.message || 'Gagal menyimpan');
    }
    setSaving(false);
  };

  const toggle = async (c) => {
    const newStatus = c.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const { error } = await supabase.from('ProductCategory').update({ status: newStatus }).eq('id', c.id);
    if (error) { toast.error(error.message); return; }
    toast.success('Status diperbarui');
    load();
    if (onSaved) onSaved();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'var(--surface)', borderRadius: 'var(--radius-md)', width: '520px', maxHeight: '80vh', display: 'flex', flexDirection: 'column', boxShadow: 'var(--shadow-lg)' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '16px' }}>Kelola Kategori</h3>
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
              <label style={LABEL}>Nama Kategori</label>
              <input style={INPUT} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kategori" autoFocus onKeyDown={(e) => e.key === 'Enter' && save()} />
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
          ) : categories.length === 0 ? (
            <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>Belum ada kategori</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: 'var(--background)' }}>
                  <th style={{ ...tableHeader, padding: '10px 16px' }}>Nama</th>
                  <th style={{ ...tableHeader, padding: '10px 16px' }}>Status</th>
                  <th style={{ ...tableHeader, padding: '10px 16px', textAlign: 'center', width: '80px' }}>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ ...tableCell, padding: '10px 16px' }}>{c.name}</td>
                    <td style={{ ...tableCell, padding: '10px 16px' }}>
                      <span className={`badge ${c.status === 'ACTIVE' ? 'badge-success' : 'badge-muted'}`}>
                        {c.status === 'ACTIVE' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td style={{ ...tableCell, padding: '10px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                        <button title="Ubah" style={iconBtn('var(--primary)')} onClick={() => openEdit(c)}><Pencil size={14} /></button>
                        <button title={c.status === 'ACTIVE' ? 'Nonaktifkan' : 'Aktifkan'} style={iconBtn(c.status === 'ACTIVE' ? 'var(--danger)' : 'var(--success)')} onClick={() => toggle(c)}>
                          {c.status === 'ACTIVE' ? <PowerOff size={14} /> : <Power size={14} />}
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

export default InlineCategoryManager;
```

- [ ] Run `npm run build` to verify.
- [ ] Commit: `feat: add InlineCategoryManager modal component`

---

## Task 5: Create InlineUnitManager

**Files:**
- Create: `src/modules/masterdata/components/InlineUnitManager.jsx`

- [ ] Same pattern as InlineCategoryManager but for Unit table (fields: name, symbol, status):

```jsx
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
```

- [ ] Run `npm run build` to verify.
- [ ] Commit: `feat: add InlineUnitManager modal component`

---

## Task 6: Integrate Modals into ProductForm

**Files:**
- Modify: `src/modules/product/components/ProductForm.jsx:1-5, 114-127`

- [ ] Add imports at top of ProductForm.jsx (after line 2):
```js
import { Settings } from 'lucide-react';
import InlineCategoryManager from '../../masterdata/components/InlineCategoryManager';
import InlineUnitManager from '../../masterdata/components/InlineUnitManager';
```

- [ ] Add state for modals (after line 37, after `uploading` state):
```js
const [showCategoryManager, setShowCategoryManager] = useState(false);
const [showUnitManager, setShowUnitManager] = useState(false);
```

- [ ] Replace the Klasifikasi section (lines 114-127) with version that includes "Kelola" buttons:

Current:
```jsx
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
```

Replace with:
```jsx
      <Section title="Klasifikasi">
        <Group label="Kategori">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select style={{ ...inputStyle, flex: 1 }} name="category_id" value={formData.category_id} onChange={handleChange}>
              <option value="">Pilih Kategori</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button type="button" title="Kelola Kategori" onClick={() => setShowCategoryManager(true)} style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={16} />
            </button>
          </div>
        </Group>
        <Group label="Satuan">
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select style={{ ...inputStyle, flex: 1 }} name="unit_id" value={formData.unit_id} onChange={handleChange}>
              <option value="">Pilih Satuan</option>
              {units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
            <button type="button" title="Kelola Satuan" onClick={() => setShowUnitManager(true)} style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface)', cursor: 'pointer', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
              <Settings size={16} />
            </button>
          </div>
        </Group>
      </Section>
```

- [ ] Add modal renderers before the closing `</form>` tag (before line 186):

```jsx
      {showCategoryManager && (
        <InlineCategoryManager
          onClose={() => setShowCategoryManager(false)}
          onSaved={() => { /* lookups refresh on next load */ }}
        />
      )}
      {showUnitManager && (
        <InlineUnitManager
          onClose={() => setShowUnitManager(false)}
          onSaved={() => { /* lookups refresh on next load */ }}
        />
      )}
```

- [ ] Run `npm run build` to verify.
- [ ] Commit: `feat: integrate category/unit manager modals into ProductForm`

---

## Task 7: Build, Deploy, Verify

- [ ] Run `npm run build` in `frontend/`
- [ ] Run `npx wrangler deploy` in `frontend/`
- [ ] Verify sidebar shows: Pelanggan, Sales, Produk, Wilayah & Rute, Gudang
- [ ] Verify Kategori/Satuan no longer in sidebar
- [ ] Verify Wilayah & Rute page shows Area list (left) + Route list (right)
- [ ] Verify adding/editing Area works via modal
- [ ] Verify adding/editing Route works via modal (with area pre-selected)
- [ ] Verify ProductForm shows gear icon next to Kategori/Satuan dropdowns
- [ ] Verify clicking gear icon opens inline CRUD modal
- [ ] Commit: `chore: deploy master data restructure`
