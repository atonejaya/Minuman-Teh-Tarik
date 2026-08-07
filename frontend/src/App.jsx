import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import { MasterLookupProvider } from './contexts/MasterLookupContext.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './modules/dashboard/pages/Dashboard.jsx';
import CustomerList from './modules/customer/pages/CustomerList.jsx';
import CustomerFormPage from './modules/customer/pages/CustomerFormPage.jsx';
import CustomerDetail from './modules/customer/pages/CustomerDetail.jsx';

const ProductList = lazy(() => import('./modules/product/pages/ProductList.jsx'));
const ProductDetail = lazy(() => import('./modules/product/pages/ProductDetail.jsx'));
const ProductFormPage = lazy(() => import('./modules/product/pages/ProductFormPage.jsx'));

const SalesStockIssueList = lazy(() => import('./modules/sales/pages/SalesStockIssueList.jsx'));
const SalesStockIssueForm = lazy(() => import('./modules/sales/pages/SalesStockIssueForm.jsx'));
const SalesStockIssueDetail = lazy(() => import('./modules/sales/pages/SalesStockIssueDetail.jsx'));

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  return (
    <MasterLookupProvider>
      <Suspense fallback={<div>Loading...</div>}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="customers" element={<CustomerList />} />
            <Route path="customers/new" element={<CustomerFormPage />} />
            <Route path="customers/:id" element={<CustomerDetail />} />
            <Route path="customers/:id/edit" element={<CustomerFormPage />} />
            
            <Route path="products" element={<ProductList />} />
            <Route path="products/new" element={<ProductFormPage />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="products/:id/edit" element={<ProductFormPage />} />

            <Route path="sales/stock-issues" element={<SalesStockIssueList />} />
            <Route path="sales/stock-issues/new" element={<SalesStockIssueForm />} />
            <Route path="sales/stock-issues/:id" element={<SalesStockIssueDetail />} />
          </Route>
        </Routes>
      </Suspense>
    </MasterLookupProvider>
  );
}

export default App;
