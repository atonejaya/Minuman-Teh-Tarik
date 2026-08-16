# Sales Tambah Warung + GPS Otomatis Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memungkinkan Sales menambah warung baru dari lapangan, dengan koordinat GPS direkam otomatis dari lokasi Sales.

**Architecture:** Dua lapis. (1) SQL migration Supabase: kolom `created_by` di `Warung`, RLS SELECT diperketat agar SALES hanya membaca warung miliknya, policy INSERT khusus SALES yang memaksa `assigned_sales_id`/`created_by` = dirinya dan `area_id` = area akunnya. (2) Frontend React: form warung mode SALES (GPS auto-detect + indikator status, field Area/Sales dikunci, Rute dipilih Sales dari area-nya), route `/customers/new` dibuka untuk SALES, tombol "Tambah Warung" di Dashboard Sales.

**Tech Stack:** React 19 + Vite + react-router-dom 7, `@supabase/supabase-js` (PostgREST + RLS), Supabase Postgres, lucide-react, oxlint.

## Global Constraints

- Frontend tak punya test framework — verifikasi = `npm run lint` + `npm run build` di `frontend/` + uji manual browser.
- Migration di-apply lewat Supabase SQL Editor (repo tak punya `supabase/config.toml`).
- UI bahasa Indonesia; ikuti gaya inline `style={{}}`, CSS vars (`--primary`, `--success`, `--danger`, `--warning`, `--text-muted`, `--surface`, `--border`), class `card-custom`, `form-group`, `form-label`, `form-input`, `alert-error`, `btn btn-primary`.
- Ikon tersedia: `Crosshair`, `CheckCircle2`, `TriangleAlert`, `PlusCircle` (terverifikasi di lucide-react versi repo).
- Role: `SALES`, `OWNER`, `ADMIN`; `RequireRole` memakai `roles.includes(user.role)`.
- Helpers SQL sudah ada: `public.current_user_role()`, `public.current_user_id()`. `User.area_id` ada; `User.route_id` TIDAK ada.
- Jangan tambah komentar di kode JSX; migration SQL mengikuti gaya komentar seksi file migration lain.

---

### Task 1: SQL Migration — created_by + RLS INSERT SALES + SELECT sales-scoped

**Files:** Create `supabase/migrations/202608160001_sales_add_warung.sql`

**Interfaces:**
- Consumes: `public.current_user_role()`, `public.current_user_id()`, `User.area_id`, `Route.area_id`, policy lama `p_Warung_select_auth`/`p_Warung_write_owner`.
- Produces: kolom `Warung.created_by`; `p_Warung_select_auth` baru (OWNER semua, SALES hanya `assigned_sales_id` miliknya); `p_Warung_insert_sales` (SALES hanya INSERT untuk dirinya, area = area akunnya, route milik area itu). Task 4/5 bergantung padanya.

- [ ] **Step 1: Tulis migration**

```sql
-- ============================================================================
-- Minuman @One - Sales dapat menambah Warung (dengan GPS otomatis)
-- Date: 2026-08-16
-- Applies via: Supabase SQL Editor (atau `npx supabase db push` setelah login).
--
-- Contents:
--   1. Kolom created_by pada Warung (jika belum ada) utk melacak pendaftar
--   2. Warung SELECT diperketat: OWNER lihat semua, SALES hanya warung sendiri
--   3. Warung INSERT untuk SALES (area & rute terkunci sesuai akun)
-- ============================================================================

alter table public."Warung"
  add column if not exists created_by integer references public."User"(id);

drop policy if exists p_Warung_select_auth on public."Warung";
create policy p_Warung_select_auth on public."Warung"
  for select to authenticated
  using (
    public.current_user_role() = 'OWNER'
    or assigned_sales_id = public.current_user_id()
  );

drop policy if exists p_Warung_insert_sales on public."Warung";
create policy p_Warung_insert_sales on public."Warung"
  for insert to authenticated
  with check (
    public.current_user_role() = 'OWNER'
    or (
      public.current_user_role() = 'SALES'
      and assigned_sales_id = public.current_user_id()
      and created_by = public.current_user_id()
      and area_id = (select u.area_id from public."User" u where u.id = public.current_user_id())
      and (
        route_id is null
        or exists (
          select 1 from public."Route" r
          where r.id = route_id and r.area_id = area_id
        )
      )
    )
  );
```

Catatan: jika `User.area_id` akun Sales NULL, `area_id = (select ...)` bernilai NULL → INSERT ditolak RLS; Task 4 mencegahnya di frontend.

- [ ] **Step 2: Apply + verifikasi** — SQL Editor → Run. Expected: `Success. No rows returned`.
  - `select column_name from information_schema.columns where table_name='Warung' and column_name='created_by';` → 1 baris.
  - `select policyname from pg_policies where tablename='Warung' order by policyname;` → memuat `p_Warung_insert_sales`, `p_Warung_select_auth`, `p_Warung_write_owner`.

- [ ] **Step 3: Commit** — `git add supabase/migrations/202608160001_sales_add_warung.sql && git commit -m "feat(db): RLS sales tambah warung + kolom created_by"`

---

### Task 2: Route lookup menyertakan `area_id`

**Files:** Modify `frontend/src/modules/product/services/LookupApiService.js:14`

**Interfaces:** Produces `lookups.routes[]` = `{id, code, name, area_id}` (dipakai Task 4).

- [ ] **Step 1:** Ganti `.select('id, code, name')` pada query `Route` → `.select('id, code, name, area_id')`.
- [ ] **Step 2:** `npm run lint` + `npm run build` di `frontend/` → sukses.
- [ ] **Step 3:** Commit `feat(customer): route lookup sertakan area_id`

---

### Task 3: Helper geolocation bersama

**Files:** Create `frontend/src/utils/geolocation.js`

**Interfaces:** Produces `getCurrentPosition()` → `Promise<{latitude:number|null, longitude:number|null, error:string|null}>` (dipakai Task 4).

- [ ] **Step 1:**

```js
export const getCurrentPosition = () => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ latitude: null, longitude: null, error: 'Geolocation tidak didukung browser ini' });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, error: null }),
      (err) => resolve({
        latitude: null,
        longitude: null,
        error: err && err.code === 1
          ? 'Akses lokasi ditolak. Periksa izin GPS browser.'
          : 'Gagal mendapatkan lokasi. Coba lagi.',
      }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};
```

- [ ] **Step 2:** lint + build sukses.
- [ ] **Step 3:** Commit `feat(utils): helper geolocation bersama`

---

### Task 4: CustomerForm — mode SALES + deteksi GPS otomatis

**Files:** Modify `frontend/src/modules/customer/components/CustomerForm.jsx`

**Interfaces:** Consumes `getCurrentPosition`, props `isSales`/`salesAreaId`/`salesName`, `lookups.routes[].area_id`. Produces `formData.latitude/longitude`; mode SALES mengunci Area/Sales, Rute difilter per area; indikator GPS hijau/merah.

- [ ] **Step 1 — import & prop.** Ganti baris 1-4:

```jsx
import React, { useState, useEffect } from 'react';
import { useMasterLookupContext } from '../../../contexts/MasterLookupContext';
import { Crosshair, CheckCircle2, TriangleAlert } from 'lucide-react';
import { getCurrentPosition } from '../../../utils/geolocation';

const CustomerForm = ({ initialData = {}, onSubmit, onCancel, isSubmitting, submitError, isSales = false, salesAreaId, salesName }) => {
```

- [ ] **Step 2 — state koordinat.** Setelah `visit_week` di formData (baris 28) tambah:

```jsx
    latitude: initialData.latitude || '',
    longitude: initialData.longitude || '',
```

- [ ] **Step 3 — state GPS + filter rute + effect.** Sisip setelah blok `handleChange` (setelah baris 37):

```jsx
  const [gpsStatus, setGpsStatus] = useState('idle');
  const [gpsMessage, setGpsMessage] = useState('');

  const filteredRoutes = isSales && salesAreaId
    ? routes.filter((r) => Number(r.area_id) === Number(salesAreaId))
    : routes;

  const areaName = areas.find((a) => Number(a.id) === Number(salesAreaId))?.name || '';

  useEffect(() => {
    if (!isSales) return;
    let active = true;
    setGpsStatus('loading');
    setGpsMessage('Meminta izin GPS...');
    getCurrentPosition().then((res) => {
      if (!active) return;
      if (res.latitude !== null && res.longitude !== null) {
        setFormData((prev) => ({
          ...prev,
          latitude: Number(res.latitude),
          longitude: Number(res.longitude),
        }));
        setGpsStatus('success');
        setGpsMessage(`Lokasi terekam: ${Number(res.latitude).toFixed(5)}, ${Number(res.longitude).toFixed(5)}`);
      } else {
        setGpsStatus('denied');
        setGpsMessage(res.error || 'Lokasi tidak terdeteksi');
      }
    });
    return () => { active = false; };
  }, [isSales]);
```

- [ ] **Step 4 — kartu GPS + peringatan area kosong.** Setelah `{submitError && ...}` (baris 135) tambah:

```jsx
      {isSales && (
        <section className="card-custom" style={{ padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {gpsStatus === 'loading' && <Crosshair size={18} color="var(--warning)" />}
            {gpsStatus === 'success' && <CheckCircle2 size={18} color="var(--success)" />}
            {gpsStatus === 'denied' && <TriangleAlert size={18} color="var(--danger)" />}
            <div>
              <p style={{ fontWeight: '600', fontSize: '14px', margin: 0 }}>
                {gpsStatus === 'success' ? 'Lokasi GPS Terekam Otomatis' : gpsStatus === 'denied' ? 'Lokasi GPS Tidak Tersedia' : 'Mendeteksi Lokasi GPS...'}
              </p>
              <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>{gpsMessage}</p>
            </div>
          </div>
        </section>
      )}

      {isSales && !salesAreaId && (
        <div className="alert-error">Akun Sales Anda belum memiliki Area. Hubungi Owner untuk mengatur Area terlebih dahulu.</div>
      )}
```

- [ ] **Step 5 — ganti seksi "Penugasan Sales"** (baris 201-226) dengan:

```jsx
      <section className="card-custom" style={{ padding: '20px' }}>
        <h3 style={{ marginBottom: '14px', fontSize: '16px' }}>Penugasan Sales</h3>
        {isSales ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Area</label>
              <input type="text" className="form-input" style={inputStyle} value={areaName || '—'} disabled />
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Rute <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select className="form-input" style={inputStyle} name="route_id" value={formData.route_id} onChange={handleChange} required disabled={!salesAreaId}>
                <option value="">Pilih Rute</option>
                {filteredRoutes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Sales Ditugaskan</label>
              <input type="text" className="form-input" style={inputStyle} value={salesName || 'Anda'} disabled />
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Area <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select className="form-input" style={inputStyle} name="area_id" value={formData.area_id} onChange={handleChange} required>
                <option value="">Pilih Area</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Rute <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select className="form-input" style={inputStyle} name="route_id" value={formData.route_id} onChange={handleChange} required>
                <option value="">Pilih Rute</option>
                {routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" style={labelStyle}>Sales Ditugaskan <span style={{ color: 'var(--danger)' }}>*</span></label>
              <select className="form-input" style={inputStyle} name="assigned_sales_id" value={formData.assigned_sales_id} onChange={handleChange} required>
                <option value="">Pilih Sales</option>
                {salesmen.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </section>
```

- [ ] **Step 6 — sembunyikan Status untuk Sales + kunci submit.** Bungkus seksi `Status` (baris 266-275) dengan `{!isSales && (...)}`, dan ganti tombol submit:

```jsx
        <button type="submit" className="btn btn-primary" disabled={isSubmitting || (isSales && !salesAreaId)}>
```

- [ ] **Step 7:** lint + build sukses.
- [ ] **Step 8:** Commit `feat(customer): form tambah warung mode sales + GPS otomatis`

---

### Task 5: CustomerFormPage — isi otomatis dari akun Sales

**Files:** Modify `frontend/src/modules/customer/pages/CustomerFormPage.jsx`

**Interfaces:** Consumes `useAuth().user` (`id`, `role`, `area_id`, `name`). Produces: untuk SALES payload create di-timpa `assigned_sales_id`/`area_id`/`created_by`/`status`; navigasi pasca-simpan `/dashboard` (Sales) atau `/customers` (Owner); meneruskan `isSales`, `salesAreaId`, `salesName` ke form.

- [ ] **Step 1:** Ganti seluruh isi file:

```jsx
import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext.jsx';
import { useCustomer } from '../hooks/useCustomer';
import CustomerRepository from '../repositories/CustomerRepository';
import CustomerForm from '../components/CustomerForm';
import EntityFormPage from '../../../components/entity/EntityFormPage';
import { useToast } from '../../../components/toast/ToastContext';

const CustomerFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const isSales = user?.role === 'SALES';

  const { data: initialData, loading: isLoadingData, error: loadError } = useCustomer(id);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (formData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      if (isEdit) {
        await CustomerRepository.update(id, formData);
      } else {
        const payload = isSales
          ? {
              ...formData,
              assigned_sales_id: user.id,
              area_id: user.area_id,
              created_by: user.id,
              status: 'ACTIVE',
            }
          : formData;
        await CustomerRepository.create(payload);
      }
      toast.success('Data pelanggan berhasil disimpan');
      navigate(isSales ? '/dashboard' : '/customers');
    } catch (err) {
      setError(err.message || 'Gagal menyimpan pelanggan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <EntityFormPage
      title={isEdit ? 'Ubah Pelanggan' : 'Buat Pelanggan Baru'}
      form={({ onCancel }) => {
        if (isEdit && isLoadingData) {
          return <p className="empty-hint">Memuat...</p>;
        }
        if (loadError) {
          return <div className="alert-error">{loadError}</div>;
        }
        return (
          <CustomerForm
            initialData={initialData || {}}
            onSubmit={handleSubmit}
            onCancel={onCancel || handleCancel}
            isSubmitting={isSubmitting}
            submitError={error}
            isSales={isSales}
            salesAreaId={user?.area_id}
            salesName={user?.name}
          />
        );
      }}
      onCancel={handleCancel}
    />
  );
};

export default CustomerFormPage;
```

- [ ] **Step 2:** lint + build sukses.
- [ ] **Step 3:** Commit `feat(customer): lock field sales otomatis saat tambah warung`

---

### Task 6: Route `/customers/new` dibuka untuk Sales

**Files:** Modify `frontend/src/App.jsx`

- [ ] **Step 1:** Hapus baris `<Route path="customers/new" element={<CustomerFormPage />} />` dari blok Owner-only (baris 106).
- [ ] **Step 2:** Setelah `<Route path="setoran" element={<SetoranList />} />` (baris 95) tambah:

```jsx
            <Route path="customers/new" element={<RequireRole roles={['SALES', 'OWNER', 'ADMIN']}><CustomerFormPage /></RequireRole>} />
```

- [ ] **Step 3:** lint + build sukses.
- [ ] **Step 4:** Commit `feat(router): buka /customers/new untuk role sales`

---

### Task 7: Tombol "Tambah Warung" di Dashboard Sales

**Files:** Modify `frontend/src/modules/dashboard/components/SalesDashboard.jsx`

- [ ] **Step 1:** Ganti `import { PlayCircle } from 'lucide-react';` → `import { PlayCircle, PlusCircle } from 'lucide-react';`
- [ ] **Step 2:** Setelah tombol "MULAI KUNJUNGAN" (setelah baris 140) tambah:

```jsx
      <button
        onClick={() => navigate('/customers/new')}
        style={{
          width: '100%',
          padding: '14px',
          marginTop: '12px',
          backgroundColor: 'var(--surface)',
          color: 'var(--primary)',
          borderRadius: '14px',
          fontWeight: 'bold',
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          border: '1.5px solid var(--primary)',
        }}
      >
        <PlusCircle size={18} /> TAMBAH WARUNG BARU
      </button>
```

- [ ] **Step 3:** lint + build sukses.
- [ ] **Step 4:** Commit `feat(dashboard): tombol tambah warung di dashboard sales`

---

### Task 8: Verifikasi end-to-end manual

- [ ] **Step 1:** Pastikan akun Sales punya `area_id` dan area-nya punya ≥1 rute aktif.
- [ ] **Step 2 (Sales):** `npm run dev` → login Sales → Dashboard → "TAMBAH WARUNG BARU" → izinkan GPS → indikator hijau dengan koordinat → Area & Sales terkunci, Rute terfilter area, Status tak tampil → isi data + Rute → Simpan → redirect ke Dashboard tanpa error. Akses `/customers` → di-redirect ke `/dashboard`.
- [ ] **Step 3 (RLS):** di console sebagai Sales, `select('*').from('Warung')` → hasil hanya `assigned_sales_id` miliknya; `update({name:'x'})` → error `new row violates row-level security policy`.
- [ ] **Step 4 (Owner):** daftar `/customers` menampilkan semua warung (termasuk yang baru dibuat Sales); form tambah/edit Owner normal.
- [ ] **Step 5 (GPS ditolak):** tolak izin lokasi → indikator merah "Lokasi GPS Tidak Tersedia"; form tetap bisa simpan (latitude/longitude null).
- [ ] **Step 6 (tanpa area):** set `User.area_id` NULL → form Sales menampilkan alert-error dan tombol Simpan nonaktif.

---

## Self-Review

**1. Spec coverage:** Kolom `created_by` + RLS INSERT Sales → Task 1. GPS otomatis + indikator hijau/merah → Task 4. Sales sembunyikan field Sales/Area (dikunci otomatis), Rute dipilih Sales → Task 4 + keputusan user. Owner tampilan sama → Task 4 branch `isSales ? ... : ...`. CustomerFormPage isi otomatis dari profil Sales → Task 5. Route /customers/new ke shared zone → Task 6. Menu akses di SalesLayout → keputusan user: tombol di Dashboard Sales → Task 7. Open question visibilitas → keputusan user: hanya warung miliknya → Task 1 (SELECT policy).

**2. Placeholder scan:** Semua langkah memuat kode lengkap dan perintah verifikasi eksplisit; tidak ada "TBD"/"similar to".

**3. Type consistency:** Prop form `isSales`/`salesAreaId`/`salesName` konsisten antara Task 4 dan Task 5. Helper `getCurrentPosition()` signature konsisten antara Task 3 dan Task 4. `lookups.routes[].area_id` dari Task 2 dipakai di Task 4. Policy SQL memakai `public.current_user_role()`/`public.current_user_id()` yang sudah ada. Ikon `Crosshair`, `CheckCircle2`, `TriangleAlert`, `PlusCircle` terverifikasi ada di lucide-react versi repo.
