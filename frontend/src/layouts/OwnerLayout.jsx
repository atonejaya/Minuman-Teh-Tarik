import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCompany } from '../contexts/CompanyContext.jsx';
import NotificationBell from '../components/common/NotificationBell';
import { LogOut, Coffee } from 'lucide-react';
import SidebarMenu from './SidebarMenu';

const OwnerLayout = () => {
  const { user, logout } = useAuth();
  const { companyName, tagline, logoUrl } = useCompany();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

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
            <span className="owner-sidebar-brand-tagline">{tagline || 'Kesegaran Dalam Setiap Tegukan'}</span>
          </div>
        </div>
        <SidebarMenu />
        <div className="owner-sidebar-footer">
          <div className="owner-user-chip">
            <div>
              <div className="owner-user-name">{user?.name}</div>
              <div className="owner-user-role">{user?.role || 'OWNER'}</div>
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
          <div className="owner-header-right" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <NotificationBell />
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
