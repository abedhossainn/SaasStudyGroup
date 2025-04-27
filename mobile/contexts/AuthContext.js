import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../config/firebase';
import { API_ENDPOINTS } from '@frontend/src/config/backend';

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

  const signup = async (email, password, displayName) => {
    await requestOTP(email);
    await AsyncStorage.setItem('pendingSignup', JSON.stringify({ email, password, displayName }));
    return { success: true, message: 'OTP sent successfully' };
  };

  const login = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const userRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      await updateDoc(userRef, { status: 'online', lastSeen: serverTimestamp() });
    } else {
      await setDoc(userRef, {
        email,
        displayName: email.split('@')[0],
        createdAt: serverTimestamp(),
        photoURL: null,
        status: 'online',
        lastSeen: serverTimestamp(),
        groups: [],
        notifications: [],
        settings: { emailNotifications: true, darkMode: false }
      });
    }

    // TODO: Use navigation.navigate('Dashboard')
    return userCredential.user;
  };

  const googleSignIn = async () => {
    // Google Sign-In on native requires different setup (Expo/Google SDK)
    throw new Error('Google Sign-In not yet implemented for React Native.');
  };

  const logout = async () => {
    const userRef = doc(db, 'users', auth.currentUser.uid);
    await updateDoc(userRef, { status: 'offline', lastSeen: serverTimestamp() });
    await signOut(auth);
    setCurrentUser(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, { status: 'online', lastSeen: serverTimestamp() });
        const userDoc = await getDoc(userRef);
        setCurrentUser({ ...user, ...userDoc.data() });
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    const handleAppStateChange = async (state) => {
      if (currentUser && auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        const status = state === 'active' ? 'online' : 'offline';
        await updateDoc(userRef, { status, lastSeen: serverTimestamp() });
      }
    };

    const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      unsubscribe();
      appStateSubscription.remove();
    };
  }, [currentUser]);

  const requestOTP = async (email) => {
    const response = await fetch(API_ENDPOINTS.REQUEST_OTP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to send OTP');
    setOtpSent(true);
    setEmail(email);
  };

  const verifyOTP = async (email, otp) => {
    const pendingSignup = JSON.parse(await AsyncStorage.getItem('pendingSignup') || 'null');
    const pendingLogin = JSON.parse(await AsyncStorage.getItem('pendingLogin') || 'null');
    const password = pendingSignup?.password || pendingLogin?.password;

    const response = await fetch(API_ENDPOINTS.VERIFY_OTP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, password }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'OTP verification failed');
    }

    const isSignup = !!pendingSignup;
    let userCredential;

    if (isSignup) {
      try {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } catch (err) {
        if (err.code === 'auth/email-already-in-use') {
          userCredential = await signInWithEmailAndPassword(auth, email, password);
        } else {
          throw err;
        }
      }

      const userRef = doc(db, 'users', userCredential.user.uid);
      await setDoc(userRef, {
        email,
        displayName: pendingSignup?.displayName || email.split('@')[0],
        createdAt: serverTimestamp(),
        photoURL: null,
        status: 'online',
        lastSeen: serverTimestamp(),
        groups: [],
        notifications: [],
        settings: { emailNotifications: true, darkMode: false }
      });
    } else {
      userCredential = await signInWithEmailAndPassword(auth, email, password);
    }

    await AsyncStorage.removeItem('pendingSignup');
    await AsyncStorage.removeItem('pendingLogin');

    // TODO: Use navigation.navigate('Dashboard')
    return userCredential.user;
  };

  const resendOTP = async (email) => {
    const response = await fetch(API_ENDPOINTS.REQUEST_OTP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) throw new Error(data.message || 'Failed to resend OTP');
    return { success: true, message: 'OTP resent successfully' };
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
