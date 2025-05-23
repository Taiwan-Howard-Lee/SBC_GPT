import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import ChatContainer from './components/chat/ChatContainer';
import LoginPage from './components/auth/LoginPage';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import { useAuthContext } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { TTSProvider } from './contexts/TTSContext';
import './App.css';
import './styles/theme.css';

// Admin route guard component
const AdminRoute = ({ children }: { children: React.ReactNode }) => {
  const isAdminAuthenticated = localStorage.getItem('adminToken') !== null;

  if (!isAdminAuthenticated) {
    return <Navigate to="/admin-login" replace />;
  }

  return <>{children}</>;
};



const App: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuthContext();

  // Show loading state
  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <ThemeProvider>
      <TTSProvider>
        <BrowserRouter>
          <Routes>
            {/* Main app route */}
            <Route
              path="/"
              element={isAuthenticated ? <AppLayout><ChatContainer /></AppLayout> : <LoginPage />}
            />

            {/* Admin routes */}
            <Route path="/admin-login" element={<AdminLogin />} />
            <Route
              path="/admin/*"
              element={
                <AdminRoute>
                  <AdminDashboard />
                </AdminRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TTSProvider>
    </ThemeProvider>
  );
};

export default App;