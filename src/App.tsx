import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { loadA11ySettings } from './utils/a11ySettings';
import { LoginPage } from './pages/LoginPage';
import { MapPage } from './pages/MapPage';
import { DashboardPage } from './pages/DashboardPage';
import { CitizenPortalPage } from './pages/CitizenPortalPage';
import { CctvRequestPage } from './pages/CctvRequestPage';
import { AdminCamerasPage } from './pages/AdminCamerasPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ReportsPage } from './pages/ReportsPage';
import type { UserRole } from './types';

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
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
