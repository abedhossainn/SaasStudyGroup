import { initializeApp } from 'firebase/app';
import { initializeAuth, getReactNativePersistence } from 'firebase/auth';
import ReactNativeAsyncStorage from '@react-native-async-storage/async-storage';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyAHy1di_s7ChENTVF6bV4ZHchgaEt7uAE0",
  authDomain: "studygroupcollab.firebaseapp.com",
  projectId: "studygroupcollab",
  storageBucket: "studygroupcollab.appspot.com", 
  messagingSenderId: "450007809845",
  appId: "1:450007809845:web:a8ce3f290570851e6b967c",
  measurementId: "G-PDP88WGFPS"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;