const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src');

const files = {
  'index.css': `:root {
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  
  --primary: hsl(28, 90%, 50%); /* Tea Orange */
  --primary-hover: hsl(28, 90%, 45%);
  --secondary: hsl(210, 40%, 20%);
  --success: hsl(150, 60%, 40%);
  --warning: hsl(40, 90%, 50%);
  --danger: hsl(0, 70%, 50%);
  
  --background: hsl(0, 0%, 98%);
  --surface: hsl(0, 0%, 100%);
  --border: hsl(210, 20%, 90%);
  --text-main: hsl(210, 30%, 15%);
  --text-muted: hsl(210, 10%, 40%);
  
  --radius-sm: 4px;
  --radius-md: 8px;
  --radius-lg: 16px;
  
  --shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05);
  
  --transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme='dark'] {
  --background: hsl(210, 30%, 8%);
  --surface: hsl(210, 30%, 12%);
  --border: hsl(210, 20%, 20%);
  --text-main: hsl(0, 0%, 95%);
  --text-muted: hsl(210, 10%, 60%);
}

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--font-family);
  background-color: var(--background);
  color: var(--text-main);
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
  transition: background-color var(--transition), color var(--transition);
}
a { color: var(--primary); text-decoration: none; }
button { font-family: inherit; cursor: pointer; border: none; background: none; }
`,

  'styles/components.css': `.app-layout { display: flex; min-height: 100vh; width: 100%; }
.app-sidebar { width: 260px; background-color: var(--surface); border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: width var(--transition); }
.app-main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.app-header { height: 64px; background-color: var(--surface); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; justify-content: space-between; position: sticky; top: 0; z-index: 10; }
.app-content { flex: 1; padding: 24px; overflow-y: auto; background-color: var(--background); }
.card { background-color: var(--surface); border-radius: var(--radius-lg); box-shadow: var(--shadow-sm); border: 1px solid var(--border); padding: 24px; transition: box-shadow var(--transition), transform var(--transition); }
.card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.btn { display: inline-flex; align-items: center; justify-content: center; padding: 8px 16px; border-radius: var(--radius-md); font-weight: 500; transition: var(--transition); }
.btn-primary { background-color: var(--primary); color: white; }
.btn-primary:hover { background-color: var(--primary-hover); }
.form-group { margin-bottom: 16px; }
.form-label { display: block; margin-bottom: 8px; font-weight: 500; color: var(--text-main); }
.form-input { width: 100%; padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-md); background-color: var(--surface); color: var(--text-main); transition: var(--transition); }
.form-input:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(230, 115, 0, 0.1); }
.login-container { display: flex; align-items: center; justify-content: center; min-height: 100vh; background-color: var(--background); }
.login-box { width: 100%; max-width: 400px; padding: 32px; }
`,

  'main.jsx': `import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import './index.css';
import './styles/components.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
`,

  'App.jsx': `import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './modules/dashboard/pages/Dashboard.jsx';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
      </Route>
    </Routes>
  );
}
export default App;
`,

  'services/api.js': `import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8080/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = \`Bearer \${token}\`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
`,

  'contexts/AuthContext.jsx': `import { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api.js';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    if (storedUser && token) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    const { data } = await api.post('/auth/login', { username, password });
    if (data.success && data.data.token) {
      localStorage.setItem('token', data.data.token);
      localStorage.setItem('user', JSON.stringify(data.data.user));
      setUser(data.data.user);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
`,

  'layouts/DashboardLayout.jsx': `import { Outlet } from 'react-router-dom';
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
        <nav style={{ flex: 1, padding: '0 16px' }}>
          <a href="/dashboard" style={{ display: 'flex', alignItems: 'center', padding: '12px', gap: '12px', color: 'var(--text-main)', borderRadius: 'var(--radius-md)', background: 'var(--border)' }}>
            <Home size={20} /> Dashboard
          </a>
          <a href="#" style={{ display: 'flex', alignItems: 'center', padding: '12px', gap: '12px', color: 'var(--text-muted)' }}>
            <Users size={20} /> Master Data
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
`,

  'pages/Login.jsx': `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(username, password);
      navigate('/dashboard');
    } catch (err) {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="login-container">
      <div className="card login-box">
        <h2 style={{ textAlign: 'center', color: 'var(--primary)', marginBottom: '24px' }}>@One System</h2>
        {error && <div style={{ color: 'var(--danger)', marginBottom: '16px', textAlign: 'center' }}>{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input className="form-input" value={username} onChange={e => setUsername(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '16px' }}>Login</button>
        </form>
      </div>
    </div>
  );
}
`,

  'modules/dashboard/pages/Dashboard.jsx': `import { useEffect, useState } from 'react';
import api from '../../../services/api.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(res => {
      setData(res.data.data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  if (loading) return <div>Loading KPI...</div>;

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>Operational Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '24px' }}>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Omzet Hari Ini</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--primary)', marginTop: '8px' }}>
            Rp {data?.omzet_hari_ini?.toLocaleString() || 0}
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Piutang</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--danger)', marginTop: '8px' }}>
            Rp {data?.total_piutang?.toLocaleString() || 0}
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Total Pembayaran</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--success)', marginTop: '8px' }}>
            Rp {data?.total_pembayaran?.toLocaleString() || 0}
          </div>
        </div>
        <div className="card">
          <h3 style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Outstanding Receivable</h3>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--warning)', marginTop: '8px' }}>
            Rp {data?.outstanding_receivable?.toLocaleString() || 0}
          </div>
        </div>
      </div>
    </div>
  );
}
`
};

for (const [relativePath, content] of Object.entries(files)) {
  const fullPath = path.join(srcDir, relativePath);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, content);
}

console.log("Scaffolding complete.");
