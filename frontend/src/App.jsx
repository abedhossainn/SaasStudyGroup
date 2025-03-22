import { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import Calendar from './pages/Calendar';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import GroupDetails from './pages/GroupDetails';

// Custom theme settings
const getThemeSettings = (mode) => ({
  palette: {
    mode,
    ...(mode === 'light'
      ? {
          // Light mode
          primary: {
            main: '#FFD700', // Gold
            dark: '#FFC000',
          },
          secondary: {
            main: '#FF8C00', // Dark Orange
          },
          background: {
            default: '#E6F2F2', // Light Mint Green
            paper: '#FFFFFF',
          },
          text: {
            primary: '#000000',
            secondary: 'rgba(0, 0, 0, 0.7)',
          },
        }
      : {
          // Dark mode - toned down yellow
          primary: {
            main: '#B8860B', // Darker Gold
            dark: '#8B6914',
          },
          secondary: {
            main: '#CD6600', // Darker Orange
          },
          background: {
            default: '#121212',
            paper: '#1E1E1E',
          },
          text: {
            primary: '#FFFFFF',
            secondary: 'rgba(255, 255, 255, 0.7)',
          },
        }),
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Arial", sans-serif',
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
        },
        contained: {
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 8,
          },
        },
      },
    },
  },
});

export default function App() {
  const [mode, setMode] = useState('light');

  const theme = useMemo(
    () => createTheme(getThemeSettings(mode)),
    [mode]
  );

  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={<Layout toggleTheme={toggleTheme} mode={mode} />}
            >
              <Route index element={<Dashboard />} />
              <Route path="messages" element={<Messages />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="notifications" element={<Notifications />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="group/:groupId" element={<GroupDetails />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}
