import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Coffee, LogIn, User, Lock, MapPin, Phone } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useCompany } from '../contexts/CompanyContext.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { companyName, tagline, address, phone, logoUrl } = useCompany();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch {
      setError('Username atau password salah');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-layout">
        <div className="login-brand">
          <div className="login-brand-inner">
            <div className="login-logo">
              {logoUrl ? (
                <img src={logoUrl} alt={companyName} className="login-logo-img" />
              ) : (
                <Coffee size={40} />
              )}
            </div>
            <h1 className="login-brand-name">{companyName}</h1>
            <p className="login-brand-tagline">{tagline}</p>
            {(address || phone) && (
              <div className="login-brand-info">
                {address && (
                  <p className="login-brand-line"><MapPin size={14} /> {address}</p>
                )}
                {phone && (
                  <p className="login-brand-line"><Phone size={14} /> {phone}</p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="login-form-side">
          <div className="login-card">
            <h3 className="login-card-title">Masuk</h3>
            <p className="login-card-subtitle">Silakan masuk dengan akun Anda</p>

            {error && <div className="login-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="login-field">
                <User size={16} className="login-field-icon" />
                <input
                  className="login-input"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
              </div>
              <div className="login-field">
                <Lock size={16} className="login-field-icon" />
                <input
                  className="login-input"
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <button type="submit" className="login-button" disabled={loading}>
                {loading ? 'Memproses...' : 'LOGIN'} <LogIn size={16} style={{ marginLeft: 8 }} />
              </button>
            </form>

            <div className="login-footer">
              © {new Date().getFullYear()} {companyName} — Sistem Penjualan Konsinyasi
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
