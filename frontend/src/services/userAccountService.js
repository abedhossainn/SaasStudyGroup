import { doc, deleteDoc, getDoc, getDocs, collection, query, where, updateDoc, arrayRemove } from 'firebase/firestore';
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { db, auth } from '../firebase';

/**
 * Delete a user account and all associated data
 * @param {string} userId - The user's ID
 * @param {string} password - User's current password for re-authentication
 * @returns {Promise<boolean>} Whether the account was successfully deleted
 */
export const deleteUserAccount = async (userId, password) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Re-authenticate user before deletion
    if (password && user.email) {
      const credential = EmailAuthProvider.credential(user.email, password);
      await reauthenticateWithCredential(user, credential);
    }
    
    // Try to perform as much cleanup as possible, but don't halt the process if permissions fail
    try {
      // For user document in users collection
      const userRef = doc(db, 'users', userId);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        // Try to delete the user document
        try {
          await deleteDoc(userRef);
          console.log('Successfully deleted user document');
        } catch (error) {
          console.warn('Could not delete user document:', error);
        }
      }
      
      // Try to clean up user's own notifications
      try {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          where('userId', '==', userId)
        );
        const notificationDocs = await getDocs(notificationsQuery);
        
        for (const doc of notificationDocs.docs) {
          try {
            await deleteDoc(doc.ref);
          } catch (e) {
            console.warn(`Could not delete notification ${doc.id}:`, e);
          }
        }
        console.log('Notifications cleanup attempted');
      } catch (error) {
        console.warn('Could not access notifications:', error);
      }
      
      // Try to remove user from groups (safer than deleting groups)
      try {
        const groupsQuery = query(
          collection(db, 'groups'),
          where('members', 'array-contains', userId)
        );
        
        const groupDocs = await getDocs(groupsQuery);
        
        for (const groupDoc of groupDocs.docs) {
          try {
            const groupRef = doc(db, 'groups', groupDoc.id);
            // Use arrayRemove instead of a full document update
            await updateDoc(groupRef, {
              members: arrayRemove(userId)
            });
          } catch (e) {
            console.warn(`Could not remove user from group ${groupDoc.id}:`, e);
          }
        }
        console.log('Group membership cleanup attempted');
      } catch (error) {
        console.warn('Could not access groups:', error);
      }
    } catch (cleanupError) {
      console.warn('Some cleanup operations failed:', cleanupError);
      // Continue with account deletion anyway
    }
    
    // Always attempt to delete the Firebase Auth user
    await deleteUser(user);
    console.log('Successfully deleted Firebase Auth user');
    
    return true;
  } catch (error) {
    console.error('Error deleting user account:', error);
    throw error;
  }
};

// Keep the getUserData function as is
/**
 * Gather all user data for export
 * @param {string} userId - The user's ID
 * @returns {Promise<Object>} The user's data
 */
export const getUserData = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const userData = {
      profile: null,
      groups: [],
      notifications: [],
      messages: []
    };
    
    // Get user profile
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      userData.profile = {
        id: userDoc.id,
        ...userDoc.data()
      };
    }
    
    // Get user's groups
    const groupsQuery = query(
      collection(db, 'groups'),
      where('members', 'array-contains', userId)
    );
    const groupDocs = await getDocs(groupsQuery);
    
    userData.groups = groupDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get user's notifications
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', userId)
    );
    const notificationDocs = await getDocs(notificationsQuery);
    
    userData.notifications = notificationDocs.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Get user's messages
    const sentMessagesQuery = query(
      collection(db, 'messages'),
      where('senderId', '==', userId)
    );
    const receivedMessagesQuery = query(
      collection(db, 'messages'),
      where('to', '==', userId)
    );
    
    const sentMessagesDocs = await getDocs(sentMessagesQuery);
    const receivedMessagesDocs = await getDocs(receivedMessagesQuery);
    
    userData.messages = [
      ...sentMessagesDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        direction: 'sent'
      })),
      ...receivedMessagesDocs.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        direction: 'received'
      }))
    ];
    
    return userData;
  } catch (error) {
    console.error('Error gathering user data:', error);
    throw error;
  }
};