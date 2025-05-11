import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { notifyGroupMembers } from './notificationService';
import { uploadImageToCloudinary } from './cloudinaryService';

const API_URL = 'http://localhost:5000/api';

// 🔍 Get all groups
export const getGroups = async () => {
  const snapshot = await getDocs(collection(db, 'groups'));
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// ➕ Create new group
export const createGroup = async (groupData) => {
  let imageUrl = '/test_wallpaper.png';

  if (groupData.image) {
    try {
      imageUrl = await uploadImageToCloudinary(groupData.image, 'group-images');
    } catch (error) {
      console.error('Error uploading group image:', error);
      throw error;
    }
  }
  
  if (!groupData.creatorId) {
    throw new Error('User ID is required to create a group. Please ensure you are logged in.');
  }

  const docRef = await addDoc(collection(db, 'groups'), {
    ...groupData,
    image: imageUrl,
    createdAt: serverTimestamp(),
    lastActive: serverTimestamp()
  });

  return { id: docRef.id, ...groupData, image: imageUrl };
};

// 🔍 Get group by ID
export const getGroupById = async (groupId) => {
  const docRef = doc(db, 'groups', groupId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) throw new Error('Group not found');
  return { id: docSnap.id, ...docSnap.data() };
};

// ✏️ Update group
export const updateGroup = async (groupId, updateData, userId) => {
  const groupRef = doc(db, 'groups', groupId);

  let imageUrl = updateData.image;
  if (updateData.image instanceof File) {
    try {
      imageUrl = await uploadImageToCloudinary(updateData.image, 'group-images');
    } catch (error) {
      console.error('Error uploading group image:', error);
      throw error;
    }
  }

  await updateDoc(groupRef, {
    ...updateData,
    image: imageUrl,
    updatedAt: serverTimestamp()
  });

  // Notify group members about the update
  try {
    // Get user's display name
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userName = userSnap.exists() ? userSnap.data().displayName || 'A member' : 'A member';
    
    // Create notification for group update
    await notifyGroupMembers(
      groupId, 
      userId, 
      'group_update',
      `${userName} updated group information`
    );
  } catch (notificationError) {
    console.error('Error creating update notification:', notificationError);
    // Don't fail the update if notification fails
  }

  return { id: groupId, ...updateData, image: imageUrl };
};

// 👥 Join group and trigger a notification
export const joinGroup = async (groupId, userId) => {
  const groupRef = doc(db, 'groups', groupId);
  const groupDoc = await getDoc(groupRef);
  
  if (!groupDoc.exists()) {
    throw new Error('Group not found');
  }

  const groupData = groupDoc.data();
  const members = groupData.members || [];
  
  if (members.includes(userId)) {
    throw new Error('You are already a member of this group');
  }

  await updateDoc(groupRef, {
    members: [...members, userId],
    lastActive: serverTimestamp()
  });
};

// ❌ Delete group, its messages, and documents
export const deleteGroup = async (groupId) => {
  const groupRef = doc(db, 'groups', groupId);
  const groupSnap = await getDoc(groupRef);
  if (!groupSnap.exists()) throw new Error('Group not found');

  const groupData = groupSnap.data();

  // Delete group image if uploaded
  if (groupData.image && groupData.image.startsWith(`${API_URL}/`)) {
    try {
      const fileName = groupData.image.split('/').pop();
      await fetch(`${API_URL}/files/${fileName}`, { method: 'DELETE' });
    } catch (err) {
      console.warn('Image deletion failed or skipped:', err.message);
    }
  }

  // Delete subcollections: messages and documents
  const deleteSubcollection = async (subcollectionName) => {
    const subCol = collection(db, `groups/${groupId}/${subcollectionName}`);
    const docs = await getDocs(subCol);
    const deletions = docs.docs.map(docItem => deleteDoc(docItem.ref));
    await Promise.all(deletions);
  };

  await deleteSubcollection('messages');
  await deleteSubcollection('documents');

  // Delete group doc
  await deleteDoc(groupRef);
};

// 👤 Leave group
export const leaveGroup = async (groupId, userId) => {
  try {
    const groupRef = doc(db, 'groups', groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) {
      throw new Error('Group not found');
    }

    const groupData = groupSnap.data();
    const members = groupData.members || [];

    if (!members.includes(userId)) {
      throw new Error('You are not a member of this group');
    }

    await updateDoc(groupRef, {
      members: members.filter(memberId => memberId !== userId),
      updatedAt: serverTimestamp()
    });

    // Get user's display name for notification
    try {
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data().displayName || 'A member' : 'A member';
      
      // Notify remaining members that someone left
      await notifyGroupMembers(
        groupId,
        userId,
        'group_leave',
        `${userName} left the group`
      );
    } catch (notificationError) {
      console.error('Error creating leave notification:', notificationError);
      // Continue with leave operation even if notification fails
    }

    return true;
  } catch (error) {
    console.error('Error leaving group:', error);
    throw error;
  }
};

// 📁 Upload group file
export const uploadGroupFile = async (file, groupId, userId) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('groupId', groupId);
  formData.append('uploadedBy', userId);

  const response = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
};

// 📂 Get group files
export const getGroupFiles = async (groupId) => {
  const response = await fetch(`${API_URL}/files/${groupId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch files');
  }
  return response.json();
};

// 🗑️ Delete group file
export const deleteGroupFile = async (fileId) => {
  const response = await fetch(`${API_URL}/files/${fileId}`, {
    method: 'DELETE'
  });
  
  if (!response.ok) {
    throw new Error('Failed to delete file');
  }
  
  return response.json();
};

// 📁 Upload document to group
export const uploadGroupDocument = async (file, groupId, userId, fileName) => {
  try {
    // Use server-side Cloudinary upload endpoint
    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', `group-documents/${groupId}`);
    formData.append('groupId', groupId);
    formData.append('uploadedBy', userId);
    
    const response = await fetch(`${API_URL}/cloudinary/upload`, {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Failed to upload document: ${errorData.details || response.statusText}`);
    }
    
    const data = await response.json();
    
    // Save document reference to Firestore
    const docRef = await addDoc(collection(db, `groups/${groupId}/documents`), {
      name: fileName || file.name,
      fileUrl: data.url,
      fileType: file.mimetype || file.type,
      uploadedBy: userId,
      cloudinaryPublicId: data.publicId,
      createdAt: serverTimestamp()
    });
    
    // Notify group members about the new document
    try {
      // Get user's display name
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data().displayName || 'A member' : 'A member';
      
      // Create notification for document upload
      await notifyGroupMembers(
        groupId,
        userId,
        'document',
        `${userName} uploaded a new document: ${fileName || file.name}`
      );
    } catch (notificationError) {
      console.error('Error creating document notification:', notificationError);
      // Continue even if notification fails
    }
    
    return {
      id: docRef.id,
      name: fileName || file.name,
      fileUrl: data.url,
      fileType: file.mimetype || file.type,
      uploadedBy: userId
    };
  } catch (error) {
    console.error('Error uploading document:', error);
    throw error;
  }
};

// Add a new function to send a message and create notifications
export const sendGroupMessage = async (groupId, message) => {
  try {
    const { content, senderId } = message;
    
    // Save the message to Firestore
    const messageRef = await addDoc(collection(db, `groups/${groupId}/messages`), {
      content,
      senderId,
      timestamp: serverTimestamp()
    });
    
    // Update group's lastActive timestamp
    await updateDoc(doc(db, 'groups', groupId), {
      lastActive: serverTimestamp()
    });
    
    // Notify group members about the new message
    try {
      // Get user's display name
      const userRef = doc(db, 'users', senderId);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data().displayName || 'A member' : 'A member';
      
      // Get the group name
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      const groupName = groupSnap.exists() ? groupSnap.data().name : 'the group';
      
      // Create notification for new message
      await notifyGroupMembers(
        groupId,
        senderId,
        'message',
        `${userName} sent a new message in ${groupName}`
      );
    } catch (notificationError) {
      console.error('Error creating message notification:', notificationError);
      // Don't fail message send if notification fails
    }
    
    return {
      id: messageRef.id,
      ...message,
      timestamp: new Date()
    };
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};
