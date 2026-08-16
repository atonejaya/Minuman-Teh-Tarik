import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext.jsx';
import { MasterLookupProvider } from './contexts/MasterLookupContext.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import OwnerLayout from './layouts/OwnerLayout.jsx';
import SalesLayout from './layouts/SalesLayout.jsx';
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
const WarehouseStockInList = lazy(() => import('./modules/sales/pages/WarehouseStockInList.jsx'));
const WarehouseStockInForm = lazy(() => import('./modules/sales/pages/WarehouseStockInForm.jsx'));
const WarehouseStockInDetail = lazy(() => import('./modules/sales/pages/WarehouseStockInDetail.jsx'));
const VehicleMutationList = lazy(() => import('./modules/sales/pages/VehicleMutationList.jsx'));
const PiutangDashboard = lazy(() => import('./modules/sales/pages/PiutangDashboard.jsx'));
const SalesTransactionList = lazy(() => import('./modules/sales/pages/SalesTransactionList.jsx'));
const SalesTransactionDetail = lazy(() => import('./modules/sales/pages/SalesTransactionDetail.jsx'));
const SalesTransactionFormPage = lazy(() => import('./modules/sales/pages/SalesTransactionFormPage.jsx'));
const SalesReturnList = lazy(() => import('./modules/sales/pages/SalesReturnList.jsx'));
const SalesReturnDetail = lazy(() => import('./modules/sales/pages/SalesReturnDetail.jsx'));
const SalesReturnFormPage = lazy(() => import('./modules/sales/pages/SalesReturnFormPage.jsx'));
const VisitList = lazy(() => import('./modules/visits/pages/VisitList.jsx'));
const VisitWizard = lazy(() => import('./modules/visits/pages/VisitWizard.jsx'));
const SetoranList = lazy(() => import('./modules/finance/pages/SetoranList.jsx'));
const ReportsPage = lazy(() => import('./modules/reports/pages/ReportsPage.jsx'));
const SettingsPage = lazy(() => import('./modules/settings/pages/SettingsPage.jsx'));
const AccountPage = lazy(() => import('./modules/account/pages/AccountPage.jsx'));
const SalesVehicleStock = lazy(() => import('./modules/sales/pages/SalesVehicleStock.jsx'));
const StokDashboard = lazy(() => import('./modules/stok/pages/StokDashboard.jsx'));
const ComingSoon = lazy(() => import('./pages/ComingSoon.jsx'));

const AreaList = lazy(() => import('./modules/masterdata/pages/AreaList.jsx'));
const AreaForm = lazy(() => import('./modules/masterdata/pages/AreaForm.jsx'));
const RouteList = lazy(() => import('./modules/masterdata/pages/RouteList.jsx'));
const WarehouseStockList = lazy(() => import('./modules/masterdata/pages/WarehouseStockList.jsx'));
const RouteForm = lazy(() => import('./modules/masterdata/pages/RouteForm.jsx'));
const SalesUserList = lazy(() => import('./modules/masterdata/pages/SalesUserList.jsx'));
const SalesUserForm = lazy(() => import('./modules/masterdata/pages/SalesUserForm.jsx'));
const WarehouseList = lazy(() => import('./modules/masterdata/pages/WarehouseList.jsx'));
const WarehouseForm = lazy(() => import('./modules/masterdata/pages/WarehouseForm.jsx'));
const PriceLevelList = lazy(() => import('./modules/masterdata/pages/PriceLevelList.jsx'));
const PriceLevelForm = lazy(() => import('./modules/masterdata/pages/PriceLevelForm.jsx'));
const ParStockList = lazy(() => import('./modules/masterdata/pages/ParStockList.jsx'));
const ParStockForm = lazy(() => import('./modules/masterdata/pages/ParStockForm.jsx'));
const UnitList = lazy(() => import('./modules/masterdata/pages/UnitList.jsx'));
const UnitForm = lazy(() => import('./modules/masterdata/pages/UnitForm.jsx'));
const CategoryList = lazy(() => import('./modules/masterdata/pages/CategoryList.jsx'));
const CategoryForm = lazy(() => import('./modules/masterdata/pages/CategoryForm.jsx'));

function Loading() {
  return <div className="loading-screen">Memuat...</div>;
}

function RequireRole({ roles, children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children ? children : <Outlet />;
}

function RoleBasedLayout() {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/login" replace />;

  if (user.role === 'OWNER' || user.role === 'ADMIN') return <OwnerLayout />;
  if (user.role === 'SALES') return <SalesLayout />;
  
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <MasterLookupProvider>
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/" element={<RoleBasedLayout />}>
            {/* Shared Routes */}
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="visits" element={<VisitList />} />
            <Route path="setoran" element={<SetoranList />} />
            <Route path="customers/new" element={<RequireRole roles={['SALES', 'OWNER', 'ADMIN']}><CustomerFormPage /></RequireRole>} />

            {/* Sales-only Routes */}
            <Route path="visits/new" element={<RequireRole roles={['SALES', 'OWNER', 'ADMIN']}><VisitWizard /></RequireRole>} />
            <Route path="visits/:id" element={<RequireRole roles={['SALES', 'OWNER', 'ADMIN']}><VisitWizard /></RequireRole>} />
            <Route path="account" element={<RequireRole roles={['SALES']}><AccountPage /></RequireRole>} />
            <Route path="vehicle-stock" element={<RequireRole roles={['SALES', 'OWNER', 'ADMIN']}><SalesVehicleStock /></RequireRole>} />

            {/* Owner-only Routes */}
            <Route element={<RequireRole roles={['OWNER', 'ADMIN']} />}>
              <Route path="customers" element={<CustomerList />} />
              <Route path="customers/:id" element={<CustomerDetail />} />
              <Route path="customers/:id/edit" element={<CustomerFormPage />} />

              <Route path="products" element={<ProductList />} />
              <Route path="products/new" element={<ProductFormPage />} />
              <Route path="products/:id" element={<ProductDetail />} />
              <Route path="products/:id/edit" element={<ProductFormPage />} />

              <Route path="areas" element={<AreaList />} />
              <Route path="areas/new" element={<AreaForm />} />
              <Route path="areas/:id/edit" element={<AreaForm />} />
              <Route path="routes" element={<RouteList />} />
              <Route path="routes/new" element={<RouteForm />} />
              <Route path="routes/:id/edit" element={<RouteForm />} />
              <Route path="sales-users" element={<SalesUserList />} />
              <Route path="sales-users/new" element={<SalesUserForm />} />
              <Route path="sales-users/:id/edit" element={<SalesUserForm />} />
              <Route path="warehouses" element={<WarehouseList />} />
              <Route path="warehouses/new" element={<WarehouseForm />} />
              <Route path="warehouses/:id/edit" element={<WarehouseForm />} />
              <Route path="price-levels" element={<PriceLevelList />} />
              <Route path="price-levels/new" element={<PriceLevelForm />} />
              <Route path="price-levels/:id/edit" element={<PriceLevelForm />} />
              <Route path="par-stock" element={<ParStockList />} />
              <Route path="par-stock/new" element={<ParStockForm />} />
              <Route path="par-stock/:id/edit" element={<ParStockForm />} />
              <Route path="units" element={<UnitList />} />
              <Route path="units/new" element={<UnitForm />} />
              <Route path="units/:id/edit" element={<UnitForm />} />
              <Route path="categories" element={<CategoryList />} />
              <Route path="categories/new" element={<CategoryForm />} />
              <Route path="categories/:id/edit" element={<CategoryForm />} />

              <Route path="sales/stock-issues" element={<SalesStockIssueList />} />
              <Route path="sales/stock-issues/new" element={<SalesStockIssueForm />} />
              <Route path="sales/stock-issues/:id/edit" element={<SalesStockIssueForm />} />
              <Route path="sales/stock-issues/:id" element={<SalesStockIssueDetail />} />
              <Route path="sales/stock-in" element={<WarehouseStockInList />} />
              <Route path="sales/stock-in/new" element={<WarehouseStockInForm />} />
              <Route path="sales/stock-in/:id/edit" element={<WarehouseStockInForm />} />
              <Route path="sales/stock-in/:id" element={<WarehouseStockInDetail />} />
              <Route path="sales/vehicle-mutations" element={<VehicleMutationList />} />
              <Route path="warehouse-stock" element={<WarehouseStockList />} />
              <Route path="stok" element={<StokDashboard />} />
              <Route path="sales/transactions" element={<SalesTransactionList />} />
              <Route path="sales/transactions/new" element={<SalesTransactionFormPage />} />
              <Route path="sales/transactions/:id" element={<SalesTransactionDetail />} />
              <Route path="sales/returns" element={<SalesReturnList />} />
              <Route path="sales/returns/new" element={<SalesReturnFormPage />} />
              <Route path="sales/returns/:id" element={<SalesReturnDetail />} />
              <Route path="sales/piutang" element={<PiutangDashboard />} />

              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="payroll" element={<ComingSoon title="Gajih" />} />
              <Route path="operational-cost" element={<ComingSoon title="Biaya Operasional" />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </MasterLookupProvider>
  );
}

export default App;
