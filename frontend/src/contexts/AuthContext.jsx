import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';

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
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        email,
        displayName,
        createdAt: serverTimestamp(),
        photoURL: null,
        status: 'online',
        lastSeen: serverTimestamp(),
      });
      return userCredential.user;
    } catch (error) {
      throw new Error('Failed to create account: ' + error.message);
    }
  };

  // Login with email/password
  const login = async (email, password) => {
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      await updateDoc(userRef, {
        status: 'online',
        lastSeen: serverTimestamp()
      });

      const enrichedUser = {
        ...result.user,
        ...userData
      };

      setCurrentUser(enrichedUser);
      return enrichedUser;
    } catch (error) {
      throw new Error('Failed to login: ' + error.message);
    }
  };

  // Google Sign In
  const googleSignIn = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const userRef = doc(db, 'users', result.user.uid);
      const userDoc = await getDoc(userRef);
      const userData = userDoc.data();

      await updateDoc(userRef, {
        status: 'online',
        lastSeen: serverTimestamp()
      });

      const enrichedUser = {
        ...result.user,
        ...userData
      };

      setCurrentUser(enrichedUser);
      return enrichedUser;
    } catch (error) {
      throw new Error('Failed to sign in with Google: ' + error.message);
    }
  };

  // Logout
  const logout = async () => {
    try {
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        status: 'offline',
        lastSeen: serverTimestamp()
      });
      await signOut(auth);
      setCurrentUser(null);
    } catch (error) {
      throw new Error('Failed to logout: ' + error.message);
    }
  };

  // Check authentication state and handle online/offline status
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);

        // Set status to online
        updateDoc(userRef, {
          status: 'online',
          lastSeen: serverTimestamp()
        });

        // Fetch additional user data
        getDoc(userRef).then((userDoc) => {
          const userData = userDoc.data();
          const enrichedUser = {
            ...user,
            ...userData
          };
          setCurrentUser(enrichedUser);
        });

        // Handle offline on unload
        const handleOffline = async () => {
          await updateDoc(userRef, {
            status: 'offline',
            lastSeen: serverTimestamp()
          });
        };

        window.addEventListener('beforeunload', handleOffline);
        window.addEventListener('visibilitychange', () => {
          if (document.visibilityState === 'hidden') handleOffline();
          if (document.visibilityState === 'visible') {
            updateDoc(userRef, {
              status: 'online',
              lastSeen: serverTimestamp()
            });
          }
        });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

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