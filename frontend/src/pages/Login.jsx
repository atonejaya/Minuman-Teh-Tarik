import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, LogIn, User, Lock, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCompany } from '../contexts/CompanyContext.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const { companyName, tagline, address, phone, logoUrl } = useCompany();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err.message || 'Username atau password salah');
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-layout">

        {/* Kiri: Form */}
        <div className="login-form-side">
          <div className="login-card">
            <h3 className="login-card-title">Login</h3>
            <div className="login-title-divider"></div>
            <p className="login-card-subtitle">{companyName}</p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <label className="login-field-label">Username</label>
                <User size={16} className="login-field-icon" style={{ top: 'calc(50% + 11px)' }} />
                <input
                  className="login-input"
                  placeholder="Masukkan username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="login-field">
                <label className="login-field-label">Password</label>
                <Lock size={16} className="login-field-icon" style={{ top: 'calc(50% + 11px)' }} />
                <input
                  className="login-input"
                  type="password"
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Memproses...' : 'Login'} <LogIn size={16} style={{ marginLeft: 8 }} />
              </button>
            </form>

            <div className="login-footer">
              © {new Date().getFullYear()} {companyName} — Sistem Penjualan Konsinyasi
            </div>
          </div>
        </div>

        {/* Kanan: Brand/Logo */}
        <div className="login-brand">
          <div className="login-brand-inner">
            <div className="login-logo">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="login-logo-img" />
              ) : (
                <Coffee size={56} />
              )}
            </div>
            <h1 className="login-brand-name">{companyName}</h1>
            <p className="login-brand-tagline">{tagline}</p>
            {(address || phone) && (
              <div className="login-brand-info">
                {address && (
                  <p className="login-brand-line"><MapPin size={13} /> {address}</p>
                )}
                {phone && (
                  <p className="login-brand-line"><Phone size={13} /> {phone}</p>
                )}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
