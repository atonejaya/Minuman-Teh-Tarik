# Sidebar Accordion (Owner) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Mengubah sidebar Owner (desktop) menjadi menu/submenu accordion eksklusif dengan struktur & icon baru, plus route placeholder `/payroll` dan `/operational-cost`.

**Architecture:** Config menu bertingkat (`MENU_CONFIG`) + komponen `SidebarMenu` (state `openKey` eksklusif, auto-buka grup route aktif via `useLocation`). Logika murni (auto-open) diekstrak ke `sidebarMenuUtils.js` agar bisa diuji dengan Node tanpa React. Halaman placeholder untuk Gajih & Biaya Operasional memakai komponen `ComingSoon` yang sudah ada.

**Tech Stack:** React 19, react-router-dom v7, lucide-react, Vite 8, oxlint. Bekerja di `frontend/`.

## Global Constraints

- Semua command dijalankan dari direktori `frontend/` (kecuali dinyatakan lain).
- Shell Windows PowerShell 5.1 — TIDAK mendukung `&&`; pakai `;` atau `if ($?) { }`.
- Struktur/label/route/icon menu HARUS persis seperti Spec Bagian 1.
- Accordion eksklusif: satu grup terbuka; membuka grup lain menutup grup sebelumnya; klik grup terbuka menutupnya.
- Auto-buka grup berisi route aktif; saat di `/dashboard` atau `/settings` semua grup tertutup.
- Sidebar SALES (bottom nav) tidak diubah.
- Tanpa dependency baru.
- Penanda: referensi baris pada file diambil dari kondisi file saat plan ditulis; sesuaikan bila kode bergeser.

---

### Task 1: Utilitas auto-open grup

**Files:**
- Create: `src/layouts/sidebarMenuUtils.js`
- Test: `test-sidebar-menu.mjs` (root frontend)

**Interfaces:**
- Produces: `findOpenGroupForPath(path: string, config: Array) => string | null` — kembalikan `key` grup pertama yang salah satu `children[].to` menjadi prefix `path`; `null` jika tidak ada. Dipakai `SidebarMenu` (Task 3) dan test di sini.

- [ ] **Step 1: Tulis test gagal**

Create `frontend/test-sidebar-menu.mjs`:

```js
import assert from 'node:assert/strict';
import { findOpenGroupForPath } from './src/layouts/sidebarMenuUtils.js';

const config = [
  { key: 'dashboard', to: '/dashboard' },
  { key: 'input', children: [{ to: '/sales/stock-in' }, { to: '/sales/stock-issues' }] },
  { key: 'operasional', children: [{ to: '/visits' }, { to: '/sales/transactions' }] },
  { key: 'settings', to: '/settings' },
];

assert.equal(findOpenGroupForPath('/dashboard', config), null, 'top-level route -> null');
assert.equal(findOpenGroupForPath('/settings', config), null, 'top-level route -> null');
assert.equal(findOpenGroupForPath('/sales/stock-in', config), 'input', 'route -> group input');
assert.equal(findOpenGroupForPath('/sales/transactions/new', config), 'operasional', 'nested route -> parent group');
assert.equal(findOpenGroupForPath('/unknown', config), null, 'unknown route -> null');

console.log('sidebar menu utils: all tests passed');
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `node test-sidebar-menu.mjs`
Expected: FAIL dengan `ERR_MODULE_NOT_FOUND ... Cannot find module ... sidebarMenuUtils.js`

- [ ] **Step 3: Implementasi minimal**

Create `frontend/src/layouts/sidebarMenuUtils.js`:

```js
export function findOpenGroupForPath(path, config) {
  for (const item of config) {
    if (item.children && item.children.some((child) => path.startsWith(child.to))) {
      return item.key;
    }
  }
  return null;
}
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `node test-sidebar-menu.mjs`
Expected: `sidebar menu utils: all tests passed` (exit 0)

- [ ] **Step 5: Commit**

```bash
git add src/layouts/sidebarMenuUtils.js test-sidebar-menu.mjs
git commit -m "feat(sidebar): utilitas auto-open grup untuk menu accordion"
```

---

### Task 2: Config menu + test struktur

**Files:**
- Create: `src/layouts/sidebarConfig.js`
- Test: `test-sidebar-config.mjs` (root frontend)

**Interfaces:**
- Consumes: tidak ada (tidak bergantung Task 1).
- Produces: `MENU_CONFIG` — array top-level; item grup punya `{ key, label, icon, children:[{to,label,icon}] }`; item tunggal punya `{ key, to, label, icon }`. `icon` grup = `ChevronDown` (dipakai Task 3 sebagai chevron akhir).

- [ ] **Step 1: Tulis test struktur**

Create `frontend/test-sidebar-config.mjs`:

```js
import assert from 'node:assert/strict';
import { MENU_CONFIG } from './src/layouts/sidebarConfig.js';

const keys = new Set();
const routes = new Set();

for (const item of MENU_CONFIG) {
  assert.ok(item.key, 'item must have key');
  assert.ok(!keys.has(item.key), `duplicate key: ${item.key}`);
  keys.add(item.key);

  if (item.children) {
    assert.ok(item.label, `group ${item.key} must have label`);
    for (const child of item.children) {
      assert.ok(child.to, `${item.key}: child must have "to"`);
      assert.ok(child.label, `${item.key}: child ${child.to} must have label`);
      assert.ok(child.icon, `${item.key}: child ${child.to} must have icon`);
      assert.ok(!routes.has(child.to), `duplicate route: ${child.to}`);
      routes.add(child.to);
    }
  } else {
    assert.ok(item.to, `${item.key}: top-level item must have "to"`);
    assert.ok(item.icon, `${item.key}: top-level item must have icon`);
  }
}

assert.ok(routes.has('/payroll'), 'config must link /payroll');
assert.ok(routes.has('/operational-cost'), 'config must link /operational-cost');

console.log(`sidebar config: ${MENU_CONFIG.length} top-level items OK`);
```

- [ ] **Step 2: Jalankan test, pastikan gagal**

Run: `node test-sidebar-config.mjs`
Expected: FAIL dengan `ERR_MODULE_NOT_FOUND ... sidebarConfig.js`

- [ ] **Step 3: Implementasi config**

Create `frontend/src/layouts/sidebarConfig.js`:

```js
import {
  LayoutDashboard, Users, ShoppingCart, Map, Route as RouteIcon, UserCog, Warehouse,
  Building2, Tag, Package, Truck, Receipt, Undo2, ClipboardList, Wallet, Banknote,
  FileText, Settings, Layers, Ruler, BarChart3, PackagePlus, PackageMinus, Coins,
  TrendingDown, ChevronDown
} from 'lucide-react';

export const MENU_CONFIG = [
  { key: 'dashboard', to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  {
    key: 'input', label: 'Input', icon: ChevronDown,
    children: [
      { to: '/sales/stock-in', label: 'Barang Masuk', icon: PackagePlus },
      { to: '/sales/stock-issues', label: 'Pengeluaran Stok', icon: PackageMinus },
    ],
  },
  {
    key: 'operasional', label: 'Operasional', icon: ChevronDown,
    children: [
      { to: '/visits', label: 'Perencanaan Kunjungan', icon: ClipboardList },
      { to: '/warehouse-stock', label: 'Stok Gudang', icon: Warehouse },
      { to: '/sales/transactions', label: 'Transaksi', icon: Receipt },
      { to: '/sales/vehicle-mutations', label: 'Mutasi & Retur', icon: Truck },
      { to: '/sales/returns', label: 'Retur Penjualan', icon: Undo2 },
      { to: '/stok', label: 'Pantauan Stok', icon: BarChart3 },
    ],
  },
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
      { to: '/price-levels', label: 'Level Harga', icon: Tag },
      { to: '/par-stock', label: 'Stok Normal', icon: Package },
    ],
  },
  {
    key: 'keuangan', label: 'Keuangan', icon: ChevronDown,
    children: [
      { to: '/sales/piutang', label: 'Piutang', icon: Wallet },
      { to: '/setoran', label: 'Setoran', icon: Banknote },
      { to: '/reports', label: 'Laporan', icon: FileText },
      { to: '/payroll', label: 'Gajih', icon: Coins },
      { to: '/operational-cost', label: 'Biaya Operasional', icon: TrendingDown },
    ],
  },
  { key: 'settings', to: '/settings', label: 'Pengaturan', icon: Settings },
];
```

- [ ] **Step 4: Jalankan test, pastikan lulus**

Run: `node test-sidebar-config.mjs`
Expected: `sidebar config: 6 top-level items OK` (exit 0)

- [ ] **Step 5: Commit**

```bash
git add src/layouts/sidebarConfig.js test-sidebar-config.mjs
git commit -m "feat(sidebar): config menu bertingkat untuk accordion"
```

---

### Task 3: Komponen `SidebarMenu`

**Files:**
- Create: `src/layouts/SidebarMenu.jsx`

**Interfaces:**
- Consumes: `MENU_CONFIG` (Task 2), `findOpenGroupForPath` (Task 1).
- Produces: `SidebarMenu` (default export) — komponen tanpa props, merender seluruh nav. Dipakai `OwnerLayout` (Task 4).

- [ ] **Step 1: Implementasi komponen**

Create `frontend/src/layouts/SidebarMenu.jsx`:

```jsx
import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { MENU_CONFIG } from './sidebarConfig';
import { findOpenGroupForPath } from './sidebarMenuUtils';

const SidebarMenu = () => {
  const location = useLocation();
  const [openKey, setOpenKey] = useState(() => findOpenGroupForPath(location.pathname, MENU_CONFIG));

  useEffect(() => {
    const active = findOpenGroupForPath(location.pathname, MENU_CONFIG);
    if (active !== null && active !== openKey) setOpenKey(active);
  }, [location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const renderItem = (item) => (
    <NavLink
      key={item.key || item.to}
      to={item.to}
      end={item.to === '/dashboard'}
      className={({ isActive }) => `owner-nav-link ${isActive ? 'active' : ''}`}
    >
      <item.icon size={18} />
      <span>{item.label}</span>
    </NavLink>
  );

  return (
    <nav className="owner-nav">
      {MENU_CONFIG.map((item) => {
        if (!item.children) return renderItem(item);

        const open = openKey === item.key;
        return (
          <div key={item.key} className={`owner-sidebar-group ${open ? 'open' : ''}`}>
            <button
              type="button"
              className="owner-sidebar-group-title"
              onClick={() => setOpenKey(open ? null : item.key)}
              aria-expanded={open}
            >
              <span className="owner-sidebar-group-label">{item.label}</span>
              <item.icon size={16} className="owner-sidebar-chevron" />
            </button>
            {open && (
              <div className="owner-sidebar-submenu">
                {item.children.map((child) => (
                  <NavLink
                    key={child.to}
                    to={child.to}
                    className={({ isActive }) => `owner-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <child.icon size={18} />
                    <span>{child.label}</span>
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
};

export default SidebarMenu;
```

- [ ] **Step 2: Pastikan terkompilasi**

Run: `npm run build`
Expected: `✓ built in ...ms` (tanpa error)

- [ ] **Step 3: Commit**

```bash
git add src/layouts/SidebarMenu.jsx
git commit -m "feat(sidebar): komponen menu accordion eksklusif"
```

---

### Task 4: Integrasi di OwnerLayout + CSS

**Files:**
- Modify: `src/layouts/OwnerLayout.jsx`
- Modify: `src/styles/components.css`

**Interfaces:**
- Consumes: `SidebarMenu` (Task 3).
- Produces: `OwnerLayout` menampilkan accordion baru; kelas CSS `owner-sidebar-group`, `owner-sidebar-group-title`, `owner-sidebar-group-label`, `owner-sidebar-chevron`, `owner-sidebar-submenu`.

- [ ] **Step 1: Ganti markup nav di OwnerLayout**

`src/layouts/OwnerLayout.jsx`:
1. Ganti blok import lucide (baris 6-10) menjadi hanya:

```jsx
import { LogOut, Coffee } from 'lucide-react';
```

2. Hapus seluruh helper `section` (baris 12-27).
3. Hapus array `masterItems` (baris 39-50), `operasionalItems` (baris 52-61), `keuanganItems` (baris 63-66).
4. Hapus import `NavLink` dari react-router-dom (baris 2) sehingga menjadi `import { Outlet, useNavigate } from 'react-router-dom';`.
5. Tambahkan import: `import SidebarMenu from './SidebarMenu';`
6. Ganti `<nav className="owner-nav">...</nav>` (baris 81-97) menjadi:

```jsx
<SidebarMenu />
```

Catatan: `<SidebarMenu />` sendiri sudah merender `<nav className="owner-nav">`, sehingga tag `<nav>` lama DIHAPUS (bukan dibungkus).

Hasil akhir bagian render OwnerLayout:

```jsx
        <nav className="owner-nav">
          <NavLink to="/dashboard" end className={({ isActive }) => `owner-nav-link ${isActive ? 'active' : ''}`}>
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </NavLink>
          {section('DATA MASTER', masterItems)}
          {section('OPERASIONAL', operasionalItems)}
          {section('KEUANGAN', keuanganItems)}
          <NavLink to="/reports" className={({ isActive }) => `owner-nav-link ${isActive ? 'active' : ''}`}>
            <FileText size={18} />
            <span>Laporan</span>
          </NavLink>
          <NavLink to="/settings" className={({ isActive }) => `owner-nav-link ${isActive ? 'active' : ''}`}>
            <Settings size={18} />
            <span>Pengaturan</span>
          </NavLink>
        </nav>
```

menjadi:

```jsx
        <SidebarMenu />
```

- [ ] **Step 2: Tambah CSS accordion**

`src/styles/components.css`, setelah rule `.owner-nav-link.active` (baris 79), tambahkan:

```css
.owner-sidebar-group { margin-top: 2px; }
.owner-sidebar-group-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 10px 14px;
  border: none;
  border-radius: var(--radius-md);
  background: none;
  color: rgba(255, 255, 255, 0.72);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: var(--transition);
  text-align: left;
}
.owner-sidebar-group-title:hover { background-color: rgba(255, 255, 255, 0.08); color: #fff; }
.owner-sidebar-chevron {
  transition: transform var(--transition);
  color: rgba(255, 255, 255, 0.5);
  flex-shrink: 0;
}
.owner-sidebar-group.open .owner-sidebar-chevron { transform: rotate(180deg); }
.owner-sidebar-group.open .owner-sidebar-group-title { color: #fff; }
.owner-sidebar-submenu {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 0 4px 12px;
}
```

- [ ] **Step 3: Verifikasi build & lint**

Run: `npm run lint`
Expected: tidak ada error baru (warning pre-existing boleh ada).

Run: `npm run build`
Expected: `✓ built in ...ms`

- [ ] **Step 4: Commit**

```bash
git add src/layouts/OwnerLayout.jsx src/styles/components.css
git commit -m "feat(sidebar): integrasi accordion di layout owner + css"
```

---

### Task 5: Placeholder + route Gajih & Biaya Operasional

**Files:**
- Modify: `src/App.jsx`

**Interfaces:**
- Consumes: `ComingSoon` yang SUDAH ADA di `src/pages/ComingSoon.jsx` (default export, prop `title`) — TIDAK membuat komponen baru (DRY, mengikuti pola existing).
- Produces: route `/payroll` + `/operational-cost` di bawah guard OWNER/ADMIN yang merender `<ComingSoon title="Gajih" />` dan `<ComingSoon title="Biaya Operasional" />`.

- [ ] **Step 1: Daftarkan route**

`src/App.jsx`:
1. Tambah lazy import setelah `const StokDashboard = lazy(...)` (baris 39):

```jsx
const ComingSoon = lazy(() => import('./pages/ComingSoon.jsx'));
```

2. Di dalam blok `{/* Owner-only Routes */}` (baris 105), tepat setelah route `settings` (baris 160), tambahkan:

```jsx
              <Route path="payroll" element={<ComingSoon title="Gajih" />} />
              <Route path="operational-cost" element={<ComingSoon title="Biaya Operasional" />} />
```

- [ ] **Step 2: Verifikasi build & lint**

Run: `npm run lint`
Expected: tidak ada error baru.

Run: `npm run build`
Expected: `✓ built in ...ms`

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "feat(sidebar): route placeholder gajih & biaya operasional"
```

---

### Task 6: Verifikasi final

**Files:**
- Tidak ada perubahan kode.

- [ ] **Step 1: Jalankan semua test Node**

Run (dari `frontend/`): `node test-sidebar-menu.mjs; if ($?) { node test-sidebar-config.mjs }`
Expected: keduanya lulus (exit 0).

- [ ] **Step 2: Lint & build**

Run: `npm run lint; if ($?) { npm run build }`
Expected: lint tanpa error baru, build `✓ built in ...ms`.

- [ ] **Step 3: Cek regresi — tidak ada sisa item lama**

Run (dari root repo):
`Select-String -Path "frontend/src/layouts/OwnerLayout.jsx" -Pattern "masterItems|operasionalItems|keuanganItems|section\("`
Expected: tidak ada hasil (semua terhapus).

- [ ] **Step 4: Verifikasi manual di browser (dokumentasikan hasil)**

Login sebagai OWNER di `npm run dev`:
1. Sidebar menampilkan: Dashboard, Input, Operasional, Master Data, Keuangan, Pengaturan.
2. Klik "Operasional" → submenu terbuka (6 item sesuai spec); klik "Master Data" → Operasional otomatis tertutup, Master Data terbuka.
3. Klik "Operasional" lagi → tertutup.
4. Buka `/sales/transactions` langsung → grup Operasional auto-terbuka, item Transaksi aktif.
5. Buka `/dashboard` → semua grup tertutup.
6. Klik "Gajih" → halaman placeholder (ComingSoon "Gajih"); klik "Biaya Operasional" → placeholder serupa.
7. Sidebar SALES (login sebagai sales) tidak berubah (bottom nav sama seperti sebelumnya).

- [ ] **Step 5: Commit bila ada penyesuaian**

Bila Step 4 menemukan masalah, perbaiki di task terkait dan commit. Jika tidak ada, tidak ada commit tambahan.
