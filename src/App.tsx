import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { loadA11ySettings } from './utils/a11ySettings';
import { LoginPage } from './pages/LoginPage';
import type { UserRole } from './types';

/* Route-based code splitting: every page after login loads as its own chunk,
   so the initial bundle stays small. LoginPage stays eager — it is the first
   page every user sees. */
const RegisterPage = lazy(() => import('./pages/RegisterPage').then(m => ({ default: m.RegisterPage })));
const ForeignerRegisterPage = lazy(() => import('./pages/ForeignerRegisterPage').then(m => ({ default: m.ForeignerRegisterPage })));
const ProfilePage = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })));
const HomePage = lazy(() => import('./pages/HomePage').then(m => ({ default: m.HomePage })));
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
const ReportIncidentPage = lazy(() => import('./pages/ReportIncidentPage').then(m => ({ default: m.ReportIncidentPage })));
const AdminIncidentsPage = lazy(() => import('./pages/AdminIncidentsPage').then(m => ({ default: m.AdminIncidentsPage })));
const AdminMemberReviewPage = lazy(() => import('./pages/AdminMemberReviewPage').then(m => ({ default: m.AdminMemberReviewPage })));
const AdminCctvApproversPage = lazy(() => import('./pages/AdminCctvApproversPage').then(m => ({ default: m.AdminCctvApproversPage })));
const VideoAccessPage = lazy(() => import('./pages/VideoAccessPage').then(m => ({ default: m.VideoAccessPage })));
const SetPasswordPage = lazy(() => import('./pages/SetPasswordPage').then(m => ({ default: m.SetPasswordPage })));
const ReportsPage = lazy(() => import('./pages/ReportsPage').then(m => ({ default: m.ReportsPage })));
const PoliceUsageReportPage = lazy(() => import('./pages/PoliceUsageReportPage').then(m => ({ default: m.PoliceUsageReportPage })));
const DailyEventsReportPage = lazy(() => import('./pages/DailyEventsReportPage').then(m => ({ default: m.DailyEventsReportPage })));
const CctvEventsReportPage = lazy(() => import('./pages/CctvEventsReportPage').then(m => ({ default: m.CctvEventsReportPage })));
const LprSearchPage = lazy(() => import('./pages/LprSearchPage').then(m => ({ default: m.LprSearchPage })));
const ComparisonDailyReportPage = lazy(() => import('./pages/ComparisonDailyReportPage').then(m => ({ default: m.ComparisonDailyReportPage })));
const ComparisonReportPage = lazy(() => import('./pages/ComparisonReportPage').then(m => ({ default: m.ComparisonReportPage })));
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
  const { pathname } = useLocation();
  if (!user) return <Navigate to="/login" replace />;
  // newly-approved members must set a password before reaching any other page
  if (user.mustChangePassword && pathname !== '/set-password') return <Navigate to="/set-password" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function DefaultRedirect() {
  const { user } = useAuth();
  // guests, citizens, police and local officers all land on the public home page
  // (traffic cameras, no login required) — police/localOfficer already land on
  // /report-incident right after login (see LoginPage.tsx), but manually
  // navigating to "/" (e.g. the "หน้าแรก" nav link) must actually show HomePage,
  // not bounce them back. Admin/operator/executive keep going to their dashboards.
  if (!user || user.role === 'citizen' || user.role === 'police' || user.role === 'localOfficer') return <HomePage />;
  if (user.role === 'executive') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/map" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/video-access" element={<VideoAccessPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/register/foreigner" element={<ForeignerRegisterPage />} />
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
      <Route path="/profile" element={
        <RequireAuth>
          <ProfilePage />
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
      <Route path="/report-incident" element={
        <RequireAuth roles={['police', 'localOfficer', 'admin', 'operator']}>
          <ReportIncidentPage />
        </RequireAuth>
      } />
      {/* public info pages — readable without an account, like /login and /register */}
      <Route path="/about" element={<AboutPage />} />
      <Route path="/faq" element={<FaqPage />} />
      <Route path="/manual" element={<ManualPage />} />
      <Route path="/reports" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <ReportsPage />
        </RequireAuth>
      } />
      <Route path="/reports/police-usage" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <PoliceUsageReportPage />
        </RequireAuth>
      } />
      <Route path="/reports/daily-events" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <DailyEventsReportPage />
        </RequireAuth>
      } />
      <Route path="/reports/events" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <CctvEventsReportPage />
        </RequireAuth>
      } />
      <Route path="/reports/lpr" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <LprSearchPage />
        </RequireAuth>
      } />
      <Route path="/reports/comparison-daily" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <ComparisonDailyReportPage />
        </RequireAuth>
      } />
      <Route path="/reports/comparison" element={
        <RequireAuth roles={['admin', 'operator', 'executive']}>
          <ComparisonReportPage />
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
      <Route path="/admin/incidents" element={
        <RequireAuth roles={['admin', 'operator']}>
          <AdminIncidentsPage />
        </RequireAuth>
      } />
      <Route path="/admin/member-review" element={
        <RequireAuth roles={['admin']}>
          <AdminMemberReviewPage />
        </RequireAuth>
      } />
      <Route path="/admin/cctv-approvers" element={
        <RequireAuth roles={['admin']}>
          <AdminCctvApproversPage />
        </RequireAuth>
      } />
      <Route path="/set-password" element={
        <RequireAuth>
          <SetPasswordPage />
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
        <ErrorBoundary>
          <Suspense fallback={<PageLoading />}>
            <AppRoutes />
          </Suspense>
        </ErrorBoundary>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
