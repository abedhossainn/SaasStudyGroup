// Services for user notification preferences
import { doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * Update user's push notification settings
 * @param {string} userId - The user's ID
 * @param {boolean} enabled - Whether push notifications are enabled
 * @returns {Promise<void>}
 */
export const updatePushNotificationSettings = async (userId, enabled) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const userRef = doc(db, 'users', userId);
    
    // Check if the document exists first
    const docSnap = await getDoc(userRef);
    
    if (docSnap.exists()) {
      // If document exists, update it
      await updateDoc(userRef, {
        pushNotificationsEnabled: enabled
      });
    } else {
      // If document doesn't exist, create it
      await setDoc(userRef, {
        pushNotificationsEnabled: enabled,
        createdAt: new Date()
      });
    }
    
    // Store in localStorage as a backup/cache
    localStorage.setItem('pushNotificationsEnabled', JSON.stringify(enabled));
    
    return true;
  } catch (error) {
    console.error('Error updating push notification settings:', error);
    throw error;
  }
};

/**
 * Get user's push notification settings
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} Whether push notifications are enabled
 */
export const getPushNotificationSettings = async (userId) => {
  try {
    if (!userId) {
      return false;
    }
    
    // Try to get the setting from localStorage first (faster)
    const cachedSetting = localStorage.getItem('pushNotificationsEnabled');
    if (cachedSetting !== null) {
      return JSON.parse(cachedSetting);
    }
    
    // Otherwise get from Firestore
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      const enabled = userDoc.data().pushNotificationsEnabled || false;
      // Cache the result
      localStorage.setItem('pushNotificationsEnabled', JSON.stringify(enabled));
      return enabled;
    }
    
    return false;
  } catch (error) {
    console.error('Error getting push notification settings:', error);
    return false;
  }
};