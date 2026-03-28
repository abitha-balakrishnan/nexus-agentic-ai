import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import AuditTrail from './pages/AuditTrail';
import Trigger from './pages/Trigger';
import Builder from './pages/Builder';
import History from './pages/History';
import Console from './pages/Console';
import Settings from './pages/Settings';
import Auth from './pages/Auth';

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/auth" />;
  if (adminOnly && !isAdmin) return <Navigate to="/" />;

  return <>{children}</>;
}

import { WorkflowProvider } from './contexts/WorkflowContext';

export default function App() {
  return (
    <AuthProvider>
      <WorkflowProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="audit" element={<AuditTrail />} />
              <Route path="trigger" element={<Trigger />} />
              <Route path="history" element={<History />} />
              <Route path="console" element={<Console />} />
              <Route path="builder" element={<ProtectedRoute adminOnly><Builder /></ProtectedRoute>} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </WorkflowProvider>
    </AuthProvider>
  );
}
