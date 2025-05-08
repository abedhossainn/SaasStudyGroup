// Push notification service implementation
import { getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Check if push notifications are enabled for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<boolean>} Whether push notifications are enabled
 */
const arePushNotificationsEnabled = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      return userDoc.data().pushNotificationsEnabled || false;
    }
    
    return false;
  } catch (error) {
    console.error('Error checking push notification status:', error);
    return false;
  }
};

/**
 * Send a push notification
 * @param {string} userId - The user's ID to send notification to
 * @param {Object} notification - The notification data
 * @returns {Promise<boolean>} Whether the notification was sent
 */
export const sendPushNotification = async (userId, notification) => {
  try {
    // First check if the user has enabled push notifications
    const enabled = await arePushNotificationsEnabled(userId);
    
    if (!enabled) {
      console.log(`Push notifications disabled for user ${userId}, not sending notification`);
      return false;
    }
    
    // In a real implementation, you'd handle this with a service worker
    // and push notification API. For now, we're just showing a browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
      const notificationOptions = {
        body: notification.content,
        icon: '/logo.svg',
        tag: notification.id || Date.now().toString(),
      };
      
      new Notification(notification.title || 'Study Group Notification', notificationOptions);
      console.log('Push notification sent:', notification);
      return true;
    } else if ('Notification' in window && Notification.permission !== 'denied') {
      // Ask for permission
      const permission = await Notification.requestPermission();
      
      if (permission === 'granted') {
        // Try again now that we have permission
        return sendPushNotification(userId, notification);
      }
    }
    
    // Fallback for browsers that don't support notifications
    console.log('Browser notifications not supported or permission denied');
    return false;
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};