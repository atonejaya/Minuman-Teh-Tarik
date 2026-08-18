import { useAuth } from '../../../contexts/AuthContext.jsx';
import { OwnerDashboard } from '../components/OwnerDashboard.jsx';
import { SalesDashboard } from '../components/SalesDashboard.jsx';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 11) return 'Selamat Pagi';
  if (hour < 15) return 'Selamat Siang';
  if (hour < 18) return 'Selamat Sore';
  return 'Selamat Malam';
};

export default function Dashboard() {
  const { user } = useAuth();

  if (!user) return <div>Memuat konteks pengguna...</div>;

  return (
    <div>
      <h2 style={{ marginBottom: '24px', fontSize: '20px', fontWeight: '600' }}>
        {getGreeting()}, {user.name}!
      </h2>
      {user.role === 'SALES' && <SalesDashboard user={user} />}
      {(user.role === 'OWNER' || user.role === 'ADMIN') && <OwnerDashboard user={user} />}
      {user.role !== 'SALES' && user.role !== 'OWNER' && user.role !== 'ADMIN' && (
        <p>Tidak ada tampilan dashboard untuk peran Anda ({user.role}).</p>
      )}
    </div>
  );
}
