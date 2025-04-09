import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// && backend changes
// 1. Replace these configuration values with your actual Firebase project credentials
// 2. These values should match the ones in your .env file
// 3. Make sure to enable the following services in Firebase Console:
//    - Authentication (Email/Password and Google Sign-in)
//    - Firestore Database
//    - Storage
const firebaseConfig = {
  apiKey: "AIzaSyAHy1di_s7ChENTVF6bV4ZHchgaEt7uAE0",
  authDomain: "studygroupcollab.firebaseapp.com",
  projectId: "studygroupcollab",
  storageBucket: "studygroupcollab.firebasestorage.app",
  messagingSenderId: "450007809845",
  appId: "1:450007809845:web:a8ce3f290570851e6b967c",
  measurementId: "G-PDP88WGFPS"
};
// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Get Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;