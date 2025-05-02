import { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  sendSignInLinkToEmail,
  isSignInWithEmailLink,
  signInWithEmailLink
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { API_ENDPOINTS } from '../config/backend';

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
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);

  // Signup with email/password
  const signup = async (email, password, displayName) => {
    try {
      // First request OTP
      await requestOTP(email);
      
      // Store signup data temporarily
      window.localStorage.setItem('pendingSignup', JSON.stringify({
        email,
        password,
        displayName
      }));
      
      // Navigate to OTP verification
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      throw new Error('Failed to create account: ' + error.message);
    }
  };

  // Login with email/password
  const login = async (email, password) => {
    try {
      console.log('Starting login process for:', email);
      
      // Direct login without OTP
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email,
        password
      );
      
      // Update user document
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        await updateDoc(userRef, {
          status: 'online',
          lastSeen: serverTimestamp()
        });
      } else {
        // Create user document if it doesn't exist
        await setDoc(userRef, {
          email: email,
          displayName: email.split('@')[0],
          createdAt: serverTimestamp(),
          photoURL: null,
          status: 'online',
          lastSeen: serverTimestamp(),
          groups: [],
          notifications: [],
          settings: {
            emailNotifications: true,
            darkMode: false
          }
        });
      }

      // Redirect to dashboard
      window.location.href = '/dashboard';
      return userCredential.user;
    } catch (error) {
      console.error('Login error:', error);
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

      // If user document doesn't exist, create it
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          email: result.user.email,
          displayName: result.user.displayName,
          createdAt: serverTimestamp(),
          photoURL: result.user.photoURL,
          status: 'online',
          lastSeen: serverTimestamp(),
          groups: [],
          notifications: [],
          settings: {
            emailNotifications: true,
            darkMode: false
          }
        });
      }

      // Update user status
      await updateDoc(userRef, {
        status: 'online',
        lastSeen: serverTimestamp()
      });

      const userData = userDoc.exists() ? userDoc.data() : {};
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

  // Request OTP
  const requestOTP = async (email) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(API_ENDPOINTS.REQUEST_OTP, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to send OTP');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to send OTP');
      }

      setOtpSent(true);
      setEmail(email);
      return { success: true, message: 'OTP sent successfully' };
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async (email, otp) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Starting OTP verification for:', email);

      // Get pending authentication data
      const pendingSignup = JSON.parse(window.localStorage.getItem('pendingSignup') || 'null');
      const pendingLogin = JSON.parse(window.localStorage.getItem('pendingLogin') || 'null');

      console.log('Pending data:', { pendingSignup, pendingLogin });

      // Validate that we have the necessary data
      if (!pendingSignup && !pendingLogin) {
        console.error('No pending authentication data found');
        throw new Error('Authentication session expired. Please try logging in again.');
      }

      const password = pendingSignup?.password || pendingLogin?.password;
      if (!password) {
        console.error('No password found in pending data');
        throw new Error('Password not found. Please try logging in again.');
      }

      console.log('Sending OTP verification request');
      const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          otp,
          password 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('OTP verification failed:', errorData);
        throw new Error(errorData.error || 'Invalid OTP');
      }

      const data = await response.json();
      console.log('OTP verification response:', data);
      
      try {
        // Determine if this is a signup or login attempt
        const isSignup = !!pendingSignup;
        console.log('Authentication type:', isSignup ? 'Signup' : 'Login');

        let userCredential;
        if (isSignup) {
          console.log('Creating new user account');
          try {
            // New user - create account with email/password
            userCredential = await createUserWithEmailAndPassword(
              auth,
              email,
              password
            );
            
            console.log('New user created successfully');
            // Create user document
            const userRef = doc(db, 'users', userCredential.user.uid);
            await setDoc(userRef, {
              email: email,
              displayName: pendingSignup?.displayName || email.split('@')[0],
              createdAt: serverTimestamp(),
              photoURL: null,
              status: 'online',
              lastSeen: serverTimestamp(),
              groups: [],
              notifications: [],
              settings: {
                emailNotifications: true,
                darkMode: false
              }
            });

            // Clean up localStorage
            window.localStorage.removeItem('pendingSignup');
            window.localStorage.removeItem('pendingLogin');
          } catch (createError) {
            console.error('Error creating user:', createError);
            if (createError.code === 'auth/email-already-in-use') {
              // If user already exists, try to sign them in
              console.log('User already exists, attempting to sign in');
              userCredential = await signInWithEmailAndPassword(
                auth,
                email,
                password
              );
              
              // Update user document
              const userRef = doc(db, 'users', userCredential.user.uid);
              const userDoc = await getDoc(userRef);
              
              if (userDoc.exists()) {
                await updateDoc(userRef, {
                  status: 'online',
                  lastSeen: serverTimestamp()
                });
              } else {
                // Create user document if it doesn't exist
                await setDoc(userRef, {
                  email: email,
                  displayName: pendingSignup?.displayName || email.split('@')[0],
                  createdAt: serverTimestamp(),
                  photoURL: null,
                  status: 'online',
                  lastSeen: serverTimestamp(),
                  groups: [],
                  notifications: [],
                  settings: {
                    emailNotifications: true,
                    darkMode: false
                  }
                });
              }
              
              // Clean up localStorage
              window.localStorage.removeItem('pendingSignup');
              window.localStorage.removeItem('pendingLogin');
            } else {
              throw createError;
            }
          }
        } else {
          console.log('Signing in existing user');
          // Existing user - sign in with email/password
          userCredential = await signInWithEmailAndPassword(
            auth,
            email,
            password
          );
          
          console.log('User signed in successfully');
          // Update user document if it exists
          const userRef = doc(db, 'users', userCredential.user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            await updateDoc(userRef, {
              status: 'online',
              lastSeen: serverTimestamp()
            });
          } else {
            // Create user document if it doesn't exist
            await setDoc(userRef, {
              email: email,
              displayName: email.split('@')[0],
              createdAt: serverTimestamp(),
              photoURL: null,
              status: 'online',
              lastSeen: serverTimestamp(),
              groups: [],
              notifications: [],
              settings: {
                emailNotifications: true,
                darkMode: false
              }
            });
          }

          // Clean up localStorage
          window.localStorage.removeItem('pendingLogin');
          window.localStorage.removeItem('pendingSignup');
        }

        // Redirect to dashboard
        window.location.href = '/dashboard';
        return userCredential.user;
      } catch (authError) {
        console.error('Firebase authentication error:', authError);
        // Handle Firebase authentication errors
        if (authError.code === 'auth/invalid-credential') {
          throw new Error('Invalid email or password. Please try logging in again.');
        } else if (authError.code === 'auth/email-already-in-use') {
          throw new Error('This email is already registered. Please try logging in instead.');
        } else {
          throw new Error('Authentication failed: ' + authError.message);
        }
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(error.message);
      // Clear localStorage on error to prevent stale data
      window.localStorage.removeItem('pendingSignup');
      window.localStorage.removeItem('pendingLogin');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const resendOTP = async (email) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Resending OTP to:', email);
      
      const response = await fetch(API_ENDPOINTS.REQUEST_OTP, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to resend OTP');
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to resend OTP');
      }

      return { success: true, message: 'OTP resent successfully' };
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const value = {
    currentUser,
    login,
    googleSignIn,
    logout,
    loading,
    signup,
    otpSent,
    email,
    error,
    requestOTP,
    verifyOTP,
    resendOTP
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export default AuthProvider;