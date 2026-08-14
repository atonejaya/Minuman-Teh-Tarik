import { useAuth } from '../../../contexts/AuthContext.jsx';
import { OwnerDashboard } from '../components/OwnerDashboard.jsx';
import { SalesDashboard } from '../components/SalesDashboard.jsx';

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return <div>Memuat konteks pengguna...</div>;

  if (user.role === 'SALES') return <SalesDashboard user={user} />;
  if (user.role === 'OWNER') return <OwnerDashboard user={user} />;

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Dashboard Operasional</h1>
      <p>Tidak ada tampilan dashboard untuk peran Anda ({user.role}).</p>
    </div>
  );
}
