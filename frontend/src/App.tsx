import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Investments from './pages/Investments';
import InvestmentDetail from './pages/InvestmentDetail';
import NewInvestment from './pages/NewInvestment';
import EditInvestment from './pages/EditInvestment';
import AIUpload from './pages/AIUpload';
import BulkUpload from './pages/BulkUpload';
import UserManagement from './pages/admin/UserManagement';
import AuditLogs from './pages/admin/AuditLogs';
import SystemSettings from './pages/admin/SystemSettings';

function ProtectedRoute({ children, adminOnly = false, superAdminOnly = false }: {
  children: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}) {
  const { user, loading, isAdminOrAbove, isSuperAdmin } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (superAdminOnly && !isSuperAdmin) return <Navigate to="/dashboard" replace />;
  if (adminOnly && !isAdminOrAbove) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />

      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/investments/new" element={<NewInvestment />} />
        <Route path="/investments/:id" element={<InvestmentDetail />} />
        <Route path="/investments/:id/edit" element={
          <ProtectedRoute adminOnly><EditInvestment /></ProtectedRoute>
        } />
        <Route path="/ai-upload" element={<AIUpload />} />
        <Route path="/bulk-upload" element={<BulkUpload />} />

        {/* Admin routes */}
        <Route path="/admin/users" element={
          <ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>
        } />

        {/* Super Admin only routes */}
        <Route path="/admin/audit-logs" element={
          <ProtectedRoute superAdminOnly><AuditLogs /></ProtectedRoute>
        } />
        <Route path="/admin/settings" element={
          <ProtectedRoute superAdminOnly><SystemSettings /></ProtectedRoute>
        } />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: { fontFamily: 'inherit', fontSize: '14px' },
            success: { iconTheme: { primary: '#16a34a', secondary: 'white' } },
            error: { iconTheme: { primary: '#dc2626', secondary: 'white' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}
