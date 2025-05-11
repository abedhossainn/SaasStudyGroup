import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

// Cache for user profiles
const userCache = new Map();

// Get user profile by ID
export const getUserProfile = async (userId) => {
  try {
    // Check cache first
    if (userCache.has(userId)) {
      return userCache.get(userId);
    }

    // Fetch from Firestore
    const userDoc = await getDoc(doc(db, 'users', userId));
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = {
      id: userDoc.id,
      ...userDoc.data()
    };

    // Update cache
    userCache.set(userId, userData);
    return userData;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

// Get multiple user profiles
export const getUserProfiles = async (userIds) => {
  try {
    const profiles = {};
    const uncachedIds = [];

    // Check cache first
    userIds.forEach(id => {
      if (userCache.has(id)) {
        profiles[id] = userCache.get(id);
      } else {
        uncachedIds.push(id);
      }
    });

    // Fetch uncached users
    if (uncachedIds.length > 0) {
      const userDocs = await Promise.all(
        uncachedIds.map(id => getDoc(doc(db, 'users', id)))
      );

      userDocs.forEach((doc, index) => {
        if (doc.exists()) {
          const userData = {
            id: doc.id,
            ...doc.data()
          };
          profiles[uncachedIds[index]] = userData;
          userCache.set(uncachedIds[index], userData);
        }
      });
    }

    return profiles;
  } catch (error) {
    console.error('Error fetching user profiles:', error);
    throw error;
  }
};

// Clear user cache
export const clearUserCache = () => {
  userCache.clear();
};

// Clear specific user from cache
export const clearUserFromCache = (userId) => {
  userCache.delete(userId);
}; 