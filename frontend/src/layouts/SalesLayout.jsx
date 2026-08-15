import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCompany } from '../contexts/CompanyContext.jsx';
import { Home, Store, Banknote, User, LogOut, Coffee, Truck } from 'lucide-react';

const SalesLayout = () => {
  const { user, logout } = useAuth();
  const { companyName, logoUrl } = useCompany();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', label: 'Dashboard', icon: Home },
    { to: '/visits', label: 'Kunjungan', icon: Store },
    { to: '/vehicle-stock', label: 'Stok', icon: Truck },
    { to: '/setoran', label: 'Setoran', icon: Banknote },
    { to: '/account', label: 'Akun', icon: User },
  ];

  return (
    <div className="mobile-wrapper">
      <header className="top-app-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="sales-app-logo">
            {logoUrl ? (
              <img src={logoUrl} alt={companyName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <Coffee size={18} color="#fff" />
            )}
          </div>
          <div>
            <p className="mobile-greeting">{companyName}</p>
            <h1>{user?.name}</h1>
          </div>
        </div>
        <div className="top-app-bar-actions">
          <button className="mobile-icon-btn" aria-label="Keluar" onClick={handleLogout}>
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <div className="mobile-content">
        <Outlet />
      </div>

      <nav className="bottom-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/dashboard'}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
};

export default SalesLayout;
