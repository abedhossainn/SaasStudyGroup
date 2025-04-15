import React, { createContext, useState, useContext, useMemo, useEffect } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import { useAuth } from './AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';

// Create the theme context
const ThemeContext = createContext();

// Custom theme settings (same as in App.jsx)
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

// Theme provider component
export const ThemeProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [mode, setMode] = useState('light');
  
  // Load user's theme preference on mount
  useEffect(() => {
    const loadUserTheme = async () => {
      if (currentUser?.uid) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.settings?.darkMode) {
            setMode('dark');
          }
        }
      }
    };
    
    loadUserTheme();
  }, [currentUser]);
  
  // Toggle theme function
  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    
    // Save theme preference to Firestore
    if (currentUser?.uid) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          'settings.darkMode': newMode === 'dark'
        });
      } catch (error) {
        console.error('Error saving theme preference:', error);
      }
    }
  };
  
  // Create theme based on current mode
  const theme = useMemo(() => createTheme(getThemeSettings(mode)), [mode]);
  
  // Context value
  const value = {
    mode,
    toggleTheme,
    setMode
  };
  
  return (
    <ThemeContext.Provider value={value}>
      <MuiThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </MuiThemeProvider>
    </ThemeContext.Provider>
  );
};

// Custom hook to use the theme context
export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};