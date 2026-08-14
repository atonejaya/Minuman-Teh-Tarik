import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCompany } from '../contexts/CompanyContext.jsx';
import {
  LayoutDashboard, Users, ShoppingCart, Map, Route as RouteIcon, UserCog, Warehouse,
  Tag, Package, Truck, Receipt, Repeat, ClipboardList, Wallet, Banknote, FileText,
  Settings, LogOut, Coffee, Layers, Ruler
} from 'lucide-react';

const section = (title, items) => (
  <div className="owner-nav-section" key={title}>
    {title && <div className="owner-nav-section-title">{title}</div>}
    {items.map((item) => (
      <NavLink
        key={item.to}
        to={item.to}
        end={item.to === '/dashboard'}
        className={({ isActive }) => `owner-nav-link ${isActive ? 'active' : ''}`}
      >
        <item.icon size={18} />
        <span>{item.label}</span>
      </NavLink>
    ))}
  </div>
);

const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const { companyName, logoUrl } = useCompany();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const masterItems = [
    { to: '/customers', label: 'Pelanggan', icon: Users },
    { to: '/products', label: 'Produk', icon: ShoppingCart },
    { to: '/categories', label: 'Kategori', icon: Layers },
    { to: '/units', label: 'Satuan', icon: Ruler },
    { to: '/areas', label: 'Area', icon: Map },
    { to: '/routes', label: 'Rute', icon: RouteIcon },
    { to: '/sales-users', label: 'Sales', icon: UserCog },
    { to: '/warehouses', label: 'Gudang', icon: Warehouse },
    { to: '/price-levels', label: 'Level Harga', icon: Tag },
    { to: '/par-stock', label: 'Stok Normal', icon: Package },
  ];

  const operasionalItems = [
    { to: '/sales/stock-in', label: 'Barang Masuk', icon: Package },
    { to: '/sales/stock-issues', label: 'Pengeluaran Stok', icon: Truck },
    { to: '/sales/transactions', label: 'Transaksi', icon: Receipt },
    { to: '/sales/returns', label: 'Retur Penjualan', icon: Repeat },
    { to: '/visits', label: 'Perencanaan Kunjungan', icon: ClipboardList },
  ];

  const keuanganItems = [
    { to: '/sales/piutang', label: 'Piutang', icon: Wallet },
    { to: '/setoran', label: 'Setoran', icon: Banknote },
  ];

  return (
    <div className="owner-layout">
      <aside className="owner-sidebar">
        <div className="owner-sidebar-logo">
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} className="owner-sidebar-logo-img" />
          ) : (
            <Coffee size={32} />
          )}
          <div className="owner-sidebar-brand">
            <span className="owner-sidebar-brand-name">{companyName}</span>
          </div>
        </div>
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
        <div className="owner-sidebar-footer">
          <div className="owner-user-chip">
            <div>
              <div className="owner-user-name">{user?.name}</div>
              <div className="owner-user-role">OWNER</div>
            </div>
            <button onClick={handleLogout} className="owner-logout-btn" title="Keluar">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      <main className="owner-main">
        <header className="owner-header">
          <div className="owner-header-title">Operasional {companyName}</div>
          <div className="owner-header-right">
            <span className="owner-header-user">{user?.name}</span>
          </div>
        </header>
        <div className="owner-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default OwnerLayout;
