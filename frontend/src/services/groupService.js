import { 
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { mockApi } from './mockApi';
import { USE_MOCK_API } from '../config/appConfig';

// Get all groups
export const getGroups = async () => {
  if (USE_MOCK_API) {
    return mockApi.getGroups();
  } else {
    try {
      // && backend changes
      // 1. Set up Firestore rules for groups collection:
      /*
        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /groups/{groupId} {
              allow read: if true;
              allow write: if request.auth != null;
            }
          }
        }
      */
      const querySnapshot = await getDocs(collection(db, 'groups'));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error getting groups:', error);
      throw error;
    }
  }
};

// Create new group
export const createGroup = async (groupData) => {
  if (USE_MOCK_API) {
    return mockApi.createGroup(groupData);
  } else {
    try {
      // && backend changes
      // 1. Set up Firebase Storage rules for group images:
      /*
        rules_version = '2';
        service firebase.storage {
          match /b/{bucket}/o {
            match /group-images/{imageId} {
              allow read: if true;
              allow write: if request.auth != null;
            }
          }
        }
      */
      let imageUrl = '/test_wallpaper.png';
      if (groupData.image && groupData.image instanceof File) {
        const storageRef = ref(storage, `group-images/${Date.now()}-${groupData.image.name}`);
        const snapshot = await uploadBytes(storageRef, groupData.image);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      const docRef = await addDoc(collection(db, 'groups'), {
        ...groupData,
        image: imageUrl,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp()
      });

      return {
        id: docRef.id,
        ...groupData,
        image: imageUrl
      };
    } catch (error) {
      console.error('Error creating group:', error);
      throw error;
    }
  }
};

// Get group by ID
export const getGroupById = async (groupId) => {
  if (USE_MOCK_API) {
    return mockApi.getGroupById(groupId);
  } else {
    try {
      const docRef = doc(db, 'groups', groupId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data()
        };
      } else {
        throw new Error('Group not found');
      }
    } catch (error) {
      console.error('Error getting group:', error);
      throw error;
    }
  }
};

// Update group
export const updateGroup = async (groupId, updateData) => {
  if (USE_MOCK_API) {
    return mockApi.updateGroup(groupId, updateData);
  } else {
    try {
      // && backend changes
      // 1. Add validation for group ownership
      // 2. Implement proper error handling for unauthorized updates
      const groupRef = doc(db, 'groups', groupId);
      
      let imageUrl = updateData.image;
      if (updateData.image && updateData.image instanceof File) {
        const storageRef = ref(storage, `group-images/${Date.now()}-${updateData.image.name}`);
        const snapshot = await uploadBytes(storageRef, updateData.image);
        imageUrl = await getDownloadURL(snapshot.ref);
      }

      await updateDoc(groupRef, {
        ...updateData,
        image: imageUrl,
        updatedAt: serverTimestamp()
      });

      return {
        id: groupId,
        ...updateData,
        image: imageUrl
      };
    } catch (error) {
      console.error('Error updating group:', error);
      throw error;
    }
  }
};

// Join group
export const joinGroup = async (groupId, userId) => {
  if (USE_MOCK_API) {
    return mockApi.joinGroup(groupId, userId);
  } else {
    try {
      // && backend changes
      // 1. Add validation to prevent duplicate joins
      // 2. Implement member limit checks if needed
      // 3. Add notification system for group owner
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      
      if (!groupSnap.exists()) {
        throw new Error('Group not found');
      }

      const groupData = groupSnap.data();
      const members = groupData.members || [];

      if (members.includes(userId)) {
        throw new Error('Already a member of this group');
      }

      await updateDoc(groupRef, {
        members: [...members, userId],
        updatedAt: serverTimestamp()
      });

      return true;
    } catch (error) {
      console.error('Error joining group:', error);
      throw error;
    }
  }
};
