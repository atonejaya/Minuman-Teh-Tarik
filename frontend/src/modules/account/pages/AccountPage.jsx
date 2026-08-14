import React from 'react';
import { useAuth } from '../../../contexts/AuthContext.jsx';

const AccountPage = () => {
  const { user } = useAuth();

  const InfoRow = ({ label, value }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ fontWeight: '500' }}>{value || '-'}</span>
    </div>
  );

  return (
    <div className="account-page">
      <div className="card-custom p-3 mb-3">
        <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '12px' }}>Profil</h2>
        <InfoRow label="Nama" value={user?.name} />
        <InfoRow label="Username" value={user?.username} />
        <InfoRow label="No. HP" value={user?.phone} />
        <InfoRow label="Role" value={user?.role} />
      </div>
    </div>
  );
};

export default AccountPage;
