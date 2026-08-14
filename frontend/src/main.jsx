import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import { AuthProvider } from './contexts/AuthContext.jsx';
import { ToastProvider } from './components/toast/ToastContext.jsx';
import { CompanyProvider } from './contexts/CompanyContext.jsx';
import './index.css';
import './styles/components.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <CompanyProvider>
            <App />
          </CompanyProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
