import { Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';
import { LogOut, Home, Users, ShoppingCart, Activity } from 'lucide-react';

const DashboardLayout = () => {
  const { user, logout } = useAuth();

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div style={{ padding: '24px', fontSize: '20px', fontWeight: 'bold', color: 'var(--primary)' }}>
          @One Konsinyasi
        </div>
        <nav style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', padding: '12px', gap: '12px', color: 'var(--text-main)', borderRadius: 'var(--radius-md)' }}>
            <Home size={20} /> Dashboard
          </a>
          <a href="/customers" style={{ display: 'flex', alignItems: 'center', padding: '12px', gap: '12px', color: 'var(--text-main)', borderRadius: 'var(--radius-md)' }}>
            <Users size={20} /> Customers
          </a>
          <a href="/products" style={{ display: 'flex', alignItems: 'center', padding: '12px', gap: '12px', color: 'var(--text-main)', borderRadius: 'var(--radius-md)' }}>
            <ShoppingCart size={20} /> Products
          </a>
        </nav>
      </aside>
      
      <main className="app-main">
        <header className="app-header">
          <div className="breadcrumb">Dashboard Overview</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span>{user?.name} ({user?.role})</span>
            <button onClick={logout} className="btn" style={{ background: 'var(--border)' }}><LogOut size={16} /> Logout</button>
          </div>
        </header>
        
        <div className="app-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
export default DashboardLayout;
