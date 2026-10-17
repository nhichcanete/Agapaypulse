import React, { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { useAuth } from './context/useAuth';

const Login = lazy(() => import('./pages/auth/Login'));
const Register = lazy(() => import('./pages/auth/Register'));
const LiveDisplay = lazy(() => import('./pages/display/LiveDisplay'));
const AppLayout = lazy(() => import('./layouts/AppLayout'));
const SmartTriageForm = lazy(() => import('./components/SmartTriageForm'));
const MedicineList = lazy(() => import('./components/MedicineList'));
const QueueConsole = lazy(() => import('./components/QueueConsole'));
const PharmacyConsole = lazy(() => import('./pages/pharmacy/PharmacyConsole'));
const AdminAnalyticsPage = lazy(() => import('./pages/admin/AdminAnalyticsPage'));
const AdminAuditLogPage = lazy(() => import('./pages/admin/AdminAuditLogPage'));
const PriorityVerificationPage = lazy(() => import('./pages/admin/PriorityVerificationPage'));
const ProfileSettings = lazy(() => import('./pages/settings/ProfileSettings'));
const ResidentVisitHistory = lazy(() => import('./pages/resident/ResidentVisitHistory'));
const ResidentDirectory = lazy(() => import('./pages/residents/ResidentDirectory'));

function RouteFallback() {
  return <div role="status" className="grid min-h-dvh place-items-center text-sm font-medium text-slate-600">Loading AgapayPulse…</div>;
}

function ProtectedRoute({ roles, children }) {
  const { user } = useAuth();
  const location = useLocation();
  if (!user) {
    return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}${location.hash}` }} />;
  }
  if (roles && !roles.includes(user.role)) {
    // Redirect to default page matching user role
    if (user.role === 'resident') return <Navigate to="/app/dashboard" replace />;
    if (user.role === 'staff') return <Navigate to="/staff/console" replace />;
    if (user.role === 'pharmacist') return <Navigate to="/pharmacy/claims" replace />;
    if (user.role === 'admin') return <Navigate to="/admin/analytics" replace />;
  }
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Suspense fallback={<RouteFallback />}>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/display" element={<LiveDisplay />} />

          {/* Resident Portal */}
          <Route
            path="/app"
            element={
              <ProtectedRoute roles={['resident']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<SmartTriageForm />} />
            <Route path="medicines" element={<MedicineList />} />
            <Route path="orders" element={<MedicineList />} />
            <Route path="visits" element={<ResidentVisitHistory />} />
          </Route>

          {/* Staff Portal */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute roles={['staff', 'admin']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="console" element={<QueueConsole />} />
          </Route>

          <Route
            path="/directory"
            element={
              <ProtectedRoute roles={['staff', 'admin', 'pharmacist']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<ResidentDirectory />} />
          </Route>

          {/* Pharmacist Portal */}
          <Route
            path="/pharmacy"
            element={
              <ProtectedRoute roles={['pharmacist', 'admin']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="claims" element={<PharmacyConsole />} />
            <Route path="queue" element={<QueueConsole initialStream="B" pharmacyMode />} />
            <Route path="inventory" element={<MedicineList />} />
          </Route>

          {/* Admin Portal */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute roles={['admin']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="audit" element={<AdminAuditLogPage />} />
            <Route path="priority-verifications" element={<PriorityVerificationPage />} />
            <Route path="inventory" element={<MedicineList />} />
          </Route>

          <Route
            path="/settings"
            element={
              <ProtectedRoute roles={['resident', 'staff', 'pharmacist', 'admin']}>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="profile" element={<ProfileSettings />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  );
}