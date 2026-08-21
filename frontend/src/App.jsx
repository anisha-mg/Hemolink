import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Navbar from './components/Navbar';

import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import DonorDashboard from './pages/DonorDashboard';
import RequesterDashboard from './pages/RequesterDashboard';
import RequestDetailsPage from './pages/RequestDetailsPage';
import AdminDashboard from './pages/AdminDashboard';

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-crimson-700 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to proper role dashboard
    if (user.role === 'donor') return <Navigate to="/donor-dashboard" replace />;
    if (user.role === 'requester') return <Navigate to="/requester-dashboard" replace />;
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function HomeRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'donor') return <Navigate to="/donor-dashboard" replace />;
  if (user.role === 'requester') return <Navigate to="/requester-dashboard" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<HomeRedirect />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                
                <Route
                  path="/donor-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['donor']}>
                      <DonorDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/requester-dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['requester']}>
                      <RequesterDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/request/:id"
                  element={
                    <ProtectedRoute>
                      <RequestDetailsPage />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute allowedRoles={['admin']}>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </main>
          </div>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
