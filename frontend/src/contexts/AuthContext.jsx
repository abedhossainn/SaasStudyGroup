import { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
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

  // Signup with email/password
  const signup = async (email, password, displayName) => {
    if (USE_MOCK_API) {
      try {
        const user = await mockApi.signup(email, password);
        setCurrentUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      } catch (error) {
        throw new Error(error.message);
      }
    } else {
      try {
        // Create the user in Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create user profile in Firestore
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          email,
          displayName,
          createdAt: serverTimestamp(),
          photoURL: null,
        });

        return userCredential.user;
      } catch (error) {
        throw new Error('Failed to create account: ' + error.message);
      }
    }
  };

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
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        const userData = userDoc.data();
        
        // Merge auth and Firestore data
        const enrichedUser = {
          ...result.user,
          ...userData
        };
        
        setCurrentUser(enrichedUser);
        return enrichedUser;
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
        // Get additional user data from Firestore
        const userDoc = await getDoc(doc(db, 'users', result.user.uid));
        const userData = userDoc.data();
        
        // Merge auth and Firestore data
        const enrichedUser = {
          ...result.user,
          ...userData
        };
        
        setCurrentUser(enrichedUser);
        return enrichedUser;
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
        if (user) {
          // Get additional user data from Firestore
          getDoc(doc(db, 'users', user.uid)).then((userDoc) => {
            const userData = userDoc.data();
            
            // Merge auth and Firestore data
            const enrichedUser = {
              ...user,
              ...userData
            };
            
            setCurrentUser(enrichedUser);
          });
        } else {
          setCurrentUser(null);
        }
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
    loading,
    signup
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;