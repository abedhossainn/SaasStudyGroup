import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  StyleSheet
} from 'react-native';
import {
  Avatar,
  Button,
  TextInput,
  Snackbar,
  Dialog,
  Portal,
  Paragraph,
  ActivityIndicator,
  useTheme
} from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '../contexts/AuthContext';
import {
  getUserProfile,
  updateProfile
} from '../services/profileService';
import {
  getGroups,
  leaveGroup,
  deleteGroup
} from '../services/groupService';
import { uploadFileToCloudinary } from '../services/fileService';

export default function ProfileScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const { currentUser, logout } = useAuth();
  const [profile, setProfile] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', bio: '', avatar: null });
  const [previewImage, setPreviewImage] = useState(null);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState({ visible: false, message: '', severity: 'success' });
  const [loggingOut, setLoggingOut] = useState(false);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogInfo, setDialogInfo] = useState({ type: '', groupId: '', groupName: '' });

  useEffect(() => {
    if (!currentUser?.uid || loggingOut) {
      //setProfile(null); 
      setLoading(false);
      return;
    }
    
    fetchProfile();
  }, [currentUser]);

  useEffect(() => {
  }, [loggingOut]);

const fetchProfile = async () => {
  if (!currentUser?.uid || loggingOut) {
    setLoading(false);
    return;
  }
  try {
    const profileData = await getUserProfile(currentUser.uid);
    if (!profileData) {
      setLoading(false);  
      return;
    }
    const displayName = profileData?.name || currentUser?.displayName || '';

    setProfile({ ...profileData, name: displayName });

    if (!editMode) {
      setEditForm({
        name: displayName,
        bio: profileData?.bio || '',
        avatar: profileData?.avatar || null
      });
      setPreviewImage(profileData?.avatar || null);
    }

    const groups = await getGroups();

    const userGroups = groups.filter(group =>
      group.members?.some(member =>
        typeof member === 'object' ? member.id === currentUser.uid : member === currentUser.uid
      )
    );
    setJoinedGroups(userGroups);
  } catch (e) {
    console.error('Error in fetchProfile:', e);
    showSnackbar('Error loading profile', 'error');
  } finally {
    setLoading(false);
  }
};
  


  const handleImagePick = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      alert('Permission to access media library is required!');
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
  
    if (!result.canceled && result.assets.length > 0) {
      const image = result.assets[0];
      try {
        setSaving(true);
        
        // Prepare the image object for Cloudinary upload
        const imageFile = {
          uri: image.uri,
          type: image.mimeType || 'image/jpeg', 
          name: image.fileName || 'upload.jpg',  
        };
  
        const cloudinaryUrl = await uploadFileToCloudinary(imageFile);
        setEditForm(prev => ({ ...prev, avatar: cloudinaryUrl }));
        setPreviewImage(cloudinaryUrl);
      } catch (e) {
        showSnackbar('Image upload failed', 'error');
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updated = await updateProfile(currentUser.uid, {
        ...editForm,
        avatar: editForm.avatar || profile.avatar
      });
      updated.email = profile.email;
      setProfile(updated);
      setEditMode(false);
      showSnackbar('Profile updated');
    } catch (e) {
      showSnackbar('Failed to update profile', 'error');
    } finally {
      setSaving(false);
    }
  };

  const confirmGroupAction = async () => {
    try {
      if (dialogInfo.type === 'leave') {
        await leaveGroup(dialogInfo.groupId, currentUser.uid);
        showSnackbar(`Left ${dialogInfo.groupName}`);
      } else {
        await deleteGroup(dialogInfo.groupId);
        showSnackbar(`Deleted ${dialogInfo.groupName}`);
      }
      await fetchProfile();
    } catch (e) {
      showSnackbar(`Error: ${e.message}`, 'error');
    } finally {
      setDialogVisible(false);
    }
  };

  if (loading) {
    return <ActivityIndicator style={{ marginTop: 100 }} size="large" />;
  }

  if (!currentUser) {
    return <Text style={styles.centerText}>Please log in to view your profile</Text>;
  }

  return (
    
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Avatar.Image
          size={120}
          source={{ uri: previewImage || profile?.avatar }}
        />
        {editMode && (
          <Button icon="camera" mode="outlined" onPress={handleImagePick}>
            Change
          </Button>
        )}
      </View>

      {editMode ? (
        <>
          <TextInput
            label="Name"
            value={editForm.name}
            onChangeText={text => setEditForm(prev => ({ ...prev, name: text }))}
            mode="outlined"
            style={styles.input}
          />
          <TextInput
            label="Bio"
            value={editForm.bio}
            onChangeText={text => setEditForm(prev => ({ ...prev, bio: text }))}
            mode="outlined"
            multiline
            numberOfLines={4}
            style={styles.input}
          />
        </>
      ) : (
        <>
          <Text style={styles.title}>{profile.name}</Text>
          <Text style={styles.subtitle}>{profile.bio || 'No bio set'}</Text>
          <Text style={styles.subtitle}>Email: {currentUser.email}</Text>
        </>
      )}

      <View style={styles.buttonRow}>
        {editMode ? (
          <>
            <Button onPress={() => setEditMode(false)} mode="outlined" color="red">
              Cancel
            </Button>
            <Button loading={saving} onPress={handleSave} mode="contained">
              Save
            </Button>
          </>
        ) : (
          <Button onPress={() => setEditMode(true)} icon="pencil" mode="contained">
            Edit Profile
          </Button>
        )}
      </View>

      <Text style={styles.groupTitle}>Joined Groups ({joinedGroups.length})</Text>
      {joinedGroups.length === 0 ? (
        <Text style={styles.subtitle}>You haven't joined any study groups yet.</Text>
      ) : (
        joinedGroups.map(group => (
          <TouchableOpacity
            key={group.id}
            style={styles.groupCard}
            onPress={() => navigation.navigate('Group', { groupId: group.id })}
          >
            <Image source={{ uri: group.image }} style={styles.groupImage} />
            <View style={{ flex: 1 }}>
              <Text style={styles.groupName}>{group.name}</Text>
            </View>
            <Icon
              name="more-vert"
              size={24}
              onPress={() =>
                Alert.alert(
                  group.name,
                  'Choose action',
                  [
                    {
                      text: 'Leave',
                      onPress: () =>
                        setDialogInfo({ type: 'leave', groupId: group.id, groupName: group.name }) ||
                        setDialogVisible(true)
                    },
                    {
                      text: 'Delete',
                      onPress: () =>
                        setDialogInfo({ type: 'delete', groupId: group.id, groupName: group.name }) ||
                        setDialogVisible(true)
                    },
                    { text: 'Cancel', style: 'cancel' }
                  ],
                  { cancelable: true }
                )
              }
            />
          </TouchableOpacity>
        ))
      )}

      <Snackbar
        visible={snackbar.visible}
        onDismiss={() => setSnackbar(prev => ({ ...prev, visible: false }))}
        duration={3000}
        style={{ backgroundColor: snackbar.severity === 'error' ? 'red' : 'green' }}
      >
        {snackbar.message}
      </Snackbar>

      <Portal>
        <Dialog visible={dialogVisible} onDismiss={() => setDialogVisible(false)}>
          <Dialog.Title>Confirm</Dialog.Title>
          <Dialog.Content>
            <Paragraph>
              Are you sure you want to {dialogInfo.type} group "{dialogInfo.groupName}"?
            </Paragraph>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDialogVisible(false)}>Cancel</Button>
            <Button onPress={confirmGroupAction}>Yes</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
      <View style={{ marginTop: 32, alignItems: 'center' }}>
        <Button
          icon="logout"
          mode="outlined"
          onPress={() => {
            setLoggingOut(true);
            Alert.alert('Logout', 'Are you sure you want to log out?', [
              { text: 'Cancel', style: 'cancel' ,
                onPress: () => setLoggingOut(false)
              },
              {
                text: 'Logout',
                onPress: () => {
                  try {
                    logout();
                  } catch (e) {
                    showSnackbar('Logout failed', 'error');
                  }
                }
              }
            ])
          }
        }
        >
          Logout
        </Button>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', textAlign: 'center' },
  subtitle: { fontSize: 16, color: 'gray', textAlign: 'center', marginBottom: 8 },
  input: { marginBottom: 12 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 16 },
  groupTitle: { fontSize: 20, fontWeight: 'bold', marginTop: 24, marginBottom: 12 },
  groupCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginBottom: 10
  },
  groupImage: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  groupName: { fontSize: 16, fontWeight: '500' },
  centerText: { textAlign: 'center', marginTop: 100, fontSize: 18 }
});
