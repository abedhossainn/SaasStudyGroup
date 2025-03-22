import { 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { mockApi } from './mockApi';
import { USE_MOCK_API } from '../config/appConfig';

// Get user profile
export const getUserProfile = async (userId) => {
  if (USE_MOCK_API) {
    return mockApi.getUserProfile(userId);
  } else {
    try {
      // && backend changes
      // 1. Set up Firestore rules for users collection:
      /*
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /users/{userId} {
              allow read: if true;
              allow write: if request.auth != null && request.auth.uid == userId;
            }
          }
        }
      */
      const docRef = doc(db, 'users', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        throw new Error('Profile not found');
      }
    } catch (error) {
      console.error('Error getting profile:', error);
      throw error;
    }
  }
};

// Update user profile
export const updateProfile = async (userId, profileData) => {
  if (USE_MOCK_API) {
    return mockApi.updateProfile(userId, profileData);
  } else {
    try {
      // && backend changes
      // 1. Set up Firebase Storage rules for profile images:
      /*
        rules_version = '2';
        service firebase.storage {
          match /b/{bucket}/o {
            match /profile-images/{userId} {
              allow read: if true;
              allow write: if request.auth != null && request.auth.uid == userId;
            }
          }
        }
      */
      const userRef = doc(db, 'users', userId);
      
      let avatarUrl = profileData.avatar;
      if (profileData.avatar && profileData.avatar instanceof File) {
        const storageRef = ref(storage, `profile-images/${userId}/${Date.now()}-${profileData.avatar.name}`);
        const snapshot = await uploadBytes(storageRef, profileData.avatar);
        avatarUrl = await getDownloadURL(snapshot.ref);
      }

      const updatedData = {
        ...profileData,
        avatar: avatarUrl,
        updatedAt: serverTimestamp()
      };

      await updateDoc(userRef, updatedData);

      return {
        id: userId,
        ...updatedData
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }
};

// Create user profile after registration
export const createUserProfile = async (userId, userData) => {
  if (USE_MOCK_API) {
    return mockApi.createUserProfile(userId, userData);
  } else {
    try {
      // && backend changes
      // 1. This should be called after successful authentication
      // 2. Add any default values or required fields
      // 3. Set up proper error handling for duplicate emails
      const userRef = doc(db, 'users', userId);
      
      const profileData = {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        groups: [],
        notifications: [],
        settings: {
          emailNotifications: true,
          darkMode: false
        }
      };

      await setDoc(userRef, profileData);

      return {
        id: userId,
        ...profileData
      };
    } catch (error) {
      console.error('Error creating profile:', error);
      throw error;
    }
  }
};

// Get user's joined groups
export const getUserGroups = async (userId) => {
  if (USE_MOCK_API) {
    return mockApi.getUserGroups(userId);
  } else {
    try {
      // && backend changes
      // 1. Consider implementing pagination for large lists
      // 2. Add proper indexing for queries
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        throw new Error('User not found');
      }

      const userData = userSnap.data();
      return userData.groups || [];
    } catch (error) {
      console.error('Error getting user groups:', error);
      throw error;
    }
  }
};
