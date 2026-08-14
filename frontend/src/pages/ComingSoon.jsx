import React from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';

const ComingSoon = ({ title = 'Modul' }) => {
  const { user } = useAuth();
  return (
    <div className="coming-soon">
      <h2>{title}</h2>
      <p className="text-muted">
        Modul ini sedang disiapkan. Anda login sebagai <strong>{user?.name}</strong> ({user?.role}).
      </p>
    </div>
  );
};

export default ComingSoon;
