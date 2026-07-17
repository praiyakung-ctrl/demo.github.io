import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { loadA11ySettings } from './utils/a11ySettings';
import { LoginPage } from './pages/LoginPage';
import type { UserRole } from './types';

/* Route-based code splitting: every page after login loads as its own chunk,
   so the initial bundle stays small. LoginPage stays eager — it is the first
   page every user sees. */
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const MapPage = lazy(() => import('./pages/MapPage').then(m => ({ default: m.MapPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const CitizenPortalPage = lazy(() => import('./pages/CitizenPortalPage').then(m => ({ default: m.CitizenPortalPage })));
const CctvRequestPage = lazy(() => import('./pages/CctvRequestPage').then(m => ({ default: m.CctvRequestPage })));
const AboutPage = lazy(() => import('./pages/AboutPage').then(m => ({ default: m.AboutPage })));
const FaqPage = lazy(() => import('./pages/FaqPage').then(m => ({ default: m.FaqPage })));
const ManualPage = lazy(() => import('./pages/ManualPage').then(m => ({ default: m.ManualPage })));
const AdminCamerasPage = lazy(() => import('./pages/AdminCamerasPage').then(m => ({ default: m.AdminCamerasPage })));
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })));
const AdminRepairsPage = lazy(() => import('./pages/AdminRepairsPage').then(m => ({ default: m.AdminRepairsPage })));
const AdminGroupsPage = lazy(() => import('./pages/AdminGroupsPage').then(m => ({ default: m.AdminGroupsPage })));
const AdminMenusPage = lazy(() => import('./pages/AdminMenusPage').then(m => ({ default: m.AdminMenusPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const AdminAuditLogPage = lazy(() => import('./pages/AdminAuditLogPage').then(m => ({ default: m.AdminAuditLogPage })));
const AdminApiPage = lazy(() => import('./pages/AdminApiPage').then(m => ({ default: m.AdminApiPage })));
const AdminNotificationsPage = lazy(() => import('./pages/AdminNotificationsPage').then(m => ({ default: m.AdminNotificationsPage })));
const AdminSettingsPage = lazy(() => import('./pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })));

function PageLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50" role="status">
      <p className="text-xl text-gray-500">กำลังโหลด...</p>
    </div>
  );
}

function RequireAuth({ children, roles }: { children: React.ReactNode; roles?: UserRole[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function DefaultRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'citizen') return <Navigate to="/portal" replace />;
  if (user.role === 'executive') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/map" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/" element={<DefaultRedirect />} />
      <Route path="/map" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <MapPage />
        </RequireAuth>
      } />
      <Route path="/dashboard" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <DashboardPage />
        </RequireAuth>
      } />
      <Route path="/portal" element={
        <RequireAuth>
          <CitizenPortalPage />
        </RequireAuth>
      } />
      <Route path="/portal/request" element={
        <RequireAuth>
          <CctvRequestPage />
        </RequireAuth>
      } />
      <Route path="/about" element={
        <RequireAuth>
          <AboutPage />
        </RequireAuth>
      } />
      <Route path="/faq" element={
        <RequireAuth>
          <FaqPage />
        </RequireAuth>
      } />
      <Route path="/manual" element={
        <RequireAuth>
          <ManualPage />
        </RequireAuth>
      } />
      <Route path="/reports" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <ReportsPage />
        </RequireAuth>
      } />
      <Route path="/admin/cameras" element={
        <RequireAuth roles={['admin']}>
          <AdminCamerasPage />
        </RequireAuth>
      } />
      <Route path="/admin/users" element={
        <RequireAuth roles={['admin']}>
          <AdminUsersPage />
        </RequireAuth>
      } />
      <Route path="/admin/repairs" element={
        <RequireAuth roles={['admin']}>
          <AdminRepairsPage />
        </RequireAuth>
      } />
      <Route path="/admin/groups" element={
        <RequireAuth roles={['admin']}>
          <AdminGroupsPage />
        </RequireAuth>
      } />
      <Route path="/admin/menus" element={
        <RequireAuth roles={['admin']}>
          <AdminMenusPage />
        </RequireAuth>
      } />
      <Route path="/admin/audit-log" element={
        <RequireAuth roles={['admin']}>
          <AdminAuditLogPage />
        </RequireAuth>
      } />
      <Route path="/admin/api" element={
        <RequireAuth roles={['admin']}>
          <AdminApiPage />
        </RequireAuth>
      } />
      <Route path="/admin/notifications" element={
        <RequireAuth roles={['admin']}>
          <AdminNotificationsPage />
        </RequireAuth>
      } />
      <Route path="/admin/settings" element={
        <RequireAuth roles={['admin']}>
          <AdminSettingsPage />
        </RequireAuth>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  // apply saved font-scale / high-contrast preferences before any page renders
  useEffect(() => {
    loadA11ySettings();
  }, []);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AuthProvider>
        <Suspense fallback={<PageLoading />}>
          <AppRoutes />
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
