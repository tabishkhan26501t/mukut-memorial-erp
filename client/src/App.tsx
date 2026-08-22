import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import MainLayout from '@/layouts/MainLayout';
import { Login, Dashboard, Students, Teachers, Classes, Subjects, Exams, Marks, Attendance, Notifications, Fees, Settings, AuditLog, BackupCenter, Users, AccessDenied, TransportDashboard, TransportVehicles, TransportDrivers, TransportRoutes, TransportStudents, TransportFees, TransportReports } from '@/pages';
import ErrorBoundary from '@/components/ErrorBoundary';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-surface-500">Authenticating...</p>
      </div>
    </div>
  );
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <ErrorBoundary>{children}</ErrorBoundary>;
}

function PermissionRoute({ permission, children }: { permission: string; children: React.ReactNode }) {
  const { hasPermission, loading } = useAuth();
  if (loading) return null;
  if (!hasPermission(permission)) return <AccessDenied />;
  return <>{children}</>;
}

export default function App() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-surface-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Login />} />
      <Route path="/" element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<PermissionRoute permission="DASHBOARD_VIEW"><Dashboard /></PermissionRoute>} />
        <Route path="students" element={<PermissionRoute permission="STUDENT_VIEW"><Students /></PermissionRoute>} />
        <Route path="teachers" element={<PermissionRoute permission="TEACHER_VIEW"><Teachers /></PermissionRoute>} />
        <Route path="classes" element={<PermissionRoute permission="CLASS_VIEW"><Classes /></PermissionRoute>} />
        <Route path="subjects" element={<PermissionRoute permission="SUBJECT_VIEW"><Subjects /></PermissionRoute>} />
        <Route path="exams" element={<PermissionRoute permission="EXAMS_VIEW"><Exams /></PermissionRoute>} />
        <Route path="marks" element={<PermissionRoute permission="MARKS_VIEW"><Marks /></PermissionRoute>} />
        <Route path="attendance" element={<PermissionRoute permission="ATTENDANCE_VIEW"><Attendance /></PermissionRoute>} />
        <Route path="notifications" element={<PermissionRoute permission="NOTIFICATION_VIEW"><Notifications /></PermissionRoute>} />
        <Route path="fees" element={<PermissionRoute permission="FEES_VIEW"><Fees /></PermissionRoute>} />
        <Route path="users" element={<PermissionRoute permission="USER_VIEW"><Users /></PermissionRoute>} />
        <Route path="audit-logs" element={<PermissionRoute permission="AUDIT_VIEW"><AuditLog /></PermissionRoute>} />
        <Route path="backup-center" element={<PermissionRoute permission="BACKUP_VIEW"><BackupCenter /></PermissionRoute>} />
        <Route path="settings" element={<PermissionRoute permission="SETTINGS_VIEW"><Settings /></PermissionRoute>} />
        <Route path="transport" element={<PermissionRoute permission="TRANSPORT_VIEW"><TransportDashboard /></PermissionRoute>} />
        <Route path="transport/vehicles" element={<PermissionRoute permission="TRANSPORT_VIEW"><TransportVehicles /></PermissionRoute>} />
        <Route path="transport/drivers" element={<PermissionRoute permission="TRANSPORT_VIEW"><TransportDrivers /></PermissionRoute>} />
        <Route path="transport/routes" element={<PermissionRoute permission="TRANSPORT_VIEW"><TransportRoutes /></PermissionRoute>} />
        <Route path="transport/students" element={<PermissionRoute permission="TRANSPORT_VIEW"><TransportStudents /></PermissionRoute>} />
        <Route path="transport/fees" element={<PermissionRoute permission="TRANSPORT_FEES_VIEW"><TransportFees /></PermissionRoute>} />
        <Route path="transport/reports" element={<PermissionRoute permission="TRANSPORT_REPORT_VIEW"><TransportReports /></PermissionRoute>} />
        <Route path="access-denied" element={<AccessDenied />} />
      </Route>
      <Route path="*" element={
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
          <div className="text-center">
            <h1 className="text-6xl font-bold text-surface-300 dark:text-surface-700 mb-4">404</h1>
            <p className="text-lg text-surface-500 mb-4">Page not found</p>
            <a href="/dashboard" className="btn-primary">Go to Dashboard</a>
          </div>
        </div>
      } />
    </Routes>
  );
}