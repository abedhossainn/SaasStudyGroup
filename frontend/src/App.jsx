import { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import Calendar from './pages/Calendar';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import GroupDetails from './pages/GroupDetails';
import { useAuth } from './contexts/AuthContext';
import RequestOTP from './pages/RequestOTP';
import VerifyOTP from './pages/VerifyOTP';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>; // Show loading indicator
  }
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

  return children;
};

// Public Route Component (redirects to dashboard if logged in)
const PublicRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>; // Show loading indicator
  }
  
  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

// OTP Route Component (handles both OTP and direct login)
const AuthRoute = ({ children }) => {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return <div>Loading...</div>; // Show loading indicator
  }
  
  if (currentUser) {
    return <Navigate to="/dashboard" />;
  }

  return children;
};

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <CssBaseline />
        <Router>
          <Routes>
            {/* Auth Routes */}
            <Route path="/login" element={
              <AuthRoute>
                <Login />
              </AuthRoute>
            } />
            <Route path="/request-otp" element={
              <AuthRoute>
                <RequestOTP />
              </AuthRoute>
            } />
            <Route path="/verify-otp" element={
              <AuthRoute>
                <VerifyOTP />
              </AuthRoute>
            } />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="messages" element={<Messages />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="group/:groupId" element={<GroupDetails />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </Router>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
