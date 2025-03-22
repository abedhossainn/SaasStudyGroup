import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged 
} from 'firebase/auth';
import { auth } from '../firebase';
import { mockApi } from '../services/mockApi';
import { USE_MOCK_API } from '../config/appConfig';

const AuthContext = createContext(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Login with email/password
  const login = async (email, password) => {
    if (USE_MOCK_API) {
      try {
        const user = await mockApi.login(email, password);
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      } catch (error) {
        throw new Error(error.message);
      }
    } else {
      try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
      } catch (error) {
        throw new Error('Failed to login: ' + error.message);
      }
    }
  };

  // Google Sign In
  const googleSignIn = async () => {
    if (USE_MOCK_API) {
      try {
        const user = {
          id: 'google_123',
          name: 'Google User',
          email: 'google@example.com',
          avatar: '/avatars/google-avatar.png'
        };
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      } catch (error) {
        throw new Error('Failed to sign in with Google');
      }
    } else {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return result.user;
      } catch (error) {
        throw new Error('Failed to sign in with Google: ' + error.message);
      }
    }
  };

  // Logout
  const logout = async () => {
    if (USE_MOCK_API) {
      setCurrentUser(null);
      localStorage.removeItem('currentUser');
    } else {
      try {
        await signOut(auth);
        setCurrentUser(null);
      } catch (error) {
        throw new Error('Failed to logout: ' + error.message);
      }
    }
  };

  // Check authentication state
  useEffect(() => {
    let unsubscribe = () => {};

    if (USE_MOCK_API) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        setCurrentUser(JSON.parse(storedUser));
      }
      setLoading(false);
    } else {
      unsubscribe = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
        setLoading(false);
      });
    }

    return () => unsubscribe();
  }, []);

  const value = {
    currentUser,
    login,
    googleSignIn,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;