import {
  collection,
  doc,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  onSnapshot,
  orderBy,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { sendPushNotification } from './pushNotificationService';

/**
 * Get notifications for the current user
 * @param {string} userId - The current user's ID
 * @returns {Promise<Array>} Array of notification objects
 */
export const getNotifications = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate() // Convert Firestore timestamp to JS Date
    }));
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
};

/**
 * Set up a real-time listener for new notifications
 * @param {string} userId - The current user's ID
 * @param {function} callback - Function to call with new notification data
 * @returns {function} Unsubscribe function
 */
export const subscribeToNotifications = (userId, callback) => {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
    orderBy('timestamp', 'desc')
  );
  
  return onSnapshot(q, (snapshot) => {
    const notifications = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      timestamp: doc.data().timestamp?.toDate()
    }));
    callback(notifications);
  }, (error) => {
    console.error('Error subscribing to notifications:', error);
  });
};

/**
 * Mark a notification as read
 * @param {string} notificationId - The notification ID
 * @returns {Promise<void>}
 */
export const markNotificationAsRead = async (notificationId) => {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, {
      read: true
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

/**
 * Mark all notifications as read for a user
 * @param {string} userId - The user's ID
 * @returns {Promise<void>}
 */
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read', '==', false)
    );
    
    const snapshot = await getDocs(q);
    const updatePromises = snapshot.docs.map(doc => 
      updateDoc(doc.ref, { read: true })
    );
    
    await Promise.all(updatePromises);
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

/**
 * Create a new notification for group activities
 * @param {Object} notification - Notification object with type, content, userId, etc.
 * @returns {Promise<string>} ID of the created notification
 */
export const createNotification = async (notification) => {
  try {
    const notificationData = {
      ...notification,
      timestamp: serverTimestamp(),
      read: false
    };
    
    const docRef = await addDoc(collection(db, 'notifications'), notificationData);
    
    // Try to send a push notification if this is enabled for the user
    try {
      // Prepare the push notification payload
      const pushNotification = {
        id: docRef.id,
        title: notification.type === 'message' ? 'New Message' : 
               notification.type === 'meeting' ? 'Meeting Reminder' :
               notification.type === 'document' ? 'New Document' :
               'Study Group Notification',
        content: notification.content
      };
      
      // Send the push notification
      await sendPushNotification(notification.userId, pushNotification);
    } catch (pushError) {
      // Don't fail the notification creation if push fails
      console.error('Error sending push notification:', pushError);
    }
    
    return docRef.id;
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
};

/**
 * Create notifications for all members of a group
 * @param {string} groupId - The group ID
 * @param {string} senderId - The user ID who triggered the activity
 * @param {string} type - The type of activity (message, document, meeting, etc.)
 * @param {string} content - The notification message
 * @returns {Promise<Array>} Array of created notification IDs
 */
export const notifyGroupMembers = async (groupId, senderId, type, content) => {
  try {
    console.log(`Starting notification for group ${groupId}, sender ${senderId}, type ${type}`);
    
    // Extra logging for meeting notifications
    if (type === 'meeting') {
      console.log(`MEETING NOTIFICATION - Content: ${content}`);
    }
    
    // Get the group to find all members
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);
    
    if (!groupSnap.exists()) {
      console.error(`Group with ID ${groupId} not found when sending notifications`);
      throw new Error('Group not found');
    }
    
    const group = groupSnap.data();
    const members = group.members || [];
    console.log(`Group has ${members.length} members:`, members);
    
    // Don't notify the sender
    const recipientMembers = members.filter(memberId => memberId !== senderId);
    console.log(`Will notify ${recipientMembers.length} members (excluding sender)`, recipientMembers);
    
    if (recipientMembers.length === 0) {
      console.log('No recipients to notify after filtering out sender');
      return [];
    }
    
    // Create a notification for each group member (except sender)
    const notificationPromises = recipientMembers.map(userId => {
      console.log(`Creating notification for user ${userId} with type: ${type}`);
      let notificationData = {
        type,
        content,
        userId,
        senderUserId: senderId,
        groupId,
        groupName: group.name
      };
      
      // Extra logging for meeting notifications
      if (type === 'meeting') {
        console.log(`MEETING NOTIFICATION - Content: ${content}`);
        
        // Add additional properties for meeting notifications to make them more visible
        notificationData = {
          ...notificationData,
          priority: 'high',
          category: 'meeting',
          // Add a badge or icon indicator
          icon: 'event',
          // Add a sound indicator (for mobile)
          sound: true
        };
      }
      
      return createNotification(notificationData);
    });
    
    const results = await Promise.all(notificationPromises);
    console.log(`Successfully created ${results.length} notifications of type: ${type}`);
    
    // Log individual notification IDs for meetings
    if (type === 'meeting' && results.length > 0) {
      console.log(`Meeting notification IDs:`, JSON.stringify(results));
    }
    
    return results;
  } catch (error) {
    console.error(`Error notifying group members for ${type}:`, error);
    console.error("Error details:", JSON.stringify(error, Object.getOwnPropertyNames(error)));
    throw error;
  }
};