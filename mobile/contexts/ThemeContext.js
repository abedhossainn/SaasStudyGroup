import React, { createContext, useState, useContext, useEffect } from 'react';
import { Provider as PaperProvider, DefaultTheme, MD3DarkTheme } from 'react-native-paper';
import { useAuth } from './AuthContext';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

const ThemeContext = createContext();

const lightTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#FFD700', // Gold
    secondary: '#FF8C00',
    background: '#E6F2F2',
    surface: '#FFFFFF',
    text: '#000000',
  },
};

const darkTheme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#B8860B', // Darker Gold
    secondary: '#CD6600',
    background: '#121212',
    surface: '#1E1E1E',
    text: '#FFFFFF',
  },
};

export const ThemeProvider = ({ children }) => {
  const { currentUser } = useAuth();
  const [mode, setMode] = useState('light');

  useEffect(() => {
    const loadTheme = async () => {
      if (currentUser?.uid) {
        try {
          const docRef = doc(db, 'users', currentUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.settings?.darkMode) {
              setMode('dark');
            }
          }
        } catch (err) {
          console.log('Error loading theme:', err);
        }
      }
    };

    loadTheme();
  }, [currentUser]);

  const toggleTheme = async () => {
    const newMode = mode === 'light' ? 'dark' : 'light';
    setMode(newMode);
    if (currentUser?.uid) {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          'settings.darkMode': newMode === 'dark',
        });
      } catch (error) {
        console.error('Failed to update theme in Firestore:', error);
      }
    }
  };

  const value = {
    mode,
    toggleTheme,
    setMode,
  };

  const currentTheme = mode === 'light' ? lightTheme : darkTheme;

  return (
    <ThemeContext.Provider value={value}>
      <PaperProvider theme={currentTheme}>
        {children}
      </PaperProvider>
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeContext must be used within a ThemeProvider');
  }
  return context;
};
