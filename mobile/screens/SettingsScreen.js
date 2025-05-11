import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, List, Switch, Button, Divider, Portal, Dialog, TextInput, ActivityIndicator } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const SettingsScreen = () => {
  const { currentUser } = useAuth();
  const theme = useTheme();
  const [settings, setSettings] = useState({
    pushNotifications: false,
    darkMode: false
  });
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [password, setPassword] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    if (!currentUser) return;

    const fetchSettings = async () => {
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        const userDoc = await getDoc(userRef);
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setSettings({
            pushNotifications: userData.pushNotificationsEnabled || false,
            darkMode: userData.settings?.darkMode || false
          });
        }
      } catch (error) {
        console.error('Error fetching settings:', error);
        Alert.alert('Error', 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, [currentUser]);

  const handleSettingChange = async (setting, value) => {
    if (!currentUser) return;

    try {
      setLoading(true);
      const userRef = doc(db, 'users', currentUser.uid);
      
      if (setting === 'pushNotifications') {
        await updateDoc(userRef, {
          pushNotificationsEnabled: value
        });
      } else if (setting === 'darkMode') {
        await updateDoc(userRef, {
          'settings.darkMode': value
        });
      }

      setSettings(prev => ({
        ...prev,
        [setting]: value
      }));

      Alert.alert('Success', 'Settings updated successfully');
    } catch (error) {
      console.error('Error updating setting:', error);
      Alert.alert('Error', 'Failed to update setting');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!password) {
      Alert.alert('Error', 'Please enter your password to delete your account');
      return;
    }

    try {
      setDeleteLoading(true);
      // Implement account deletion logic here
      // This should include:
      // 1. Verify password
      // 2. Delete user data from Firestore
      // 3. Delete user authentication
      // 4. Sign out and navigate to login
      
      Alert.alert('Success', 'Account deleted successfully');
      // Navigate to login screen
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Error', 'Failed to delete account');
    } finally {
      setDeleteLoading(false);
      setShowDeleteDialog(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView>
        {/* Account Section */}
        <List.Section>
          <List.Subheader>Account</List.Subheader>
          <List.Item
            title="Email"
            description={currentUser?.email || 'No email set'}
            left={props => <List.Icon {...props} icon="email" />}
          />
          <List.Item
            title="Username"
            description={currentUser?.displayName || 'No username set'}
            left={props => <List.Icon {...props} icon="account" />}
          />
        </List.Section>

        <Divider />

        {/* Appearance Section */}
        <List.Section>
          <List.Subheader>Appearance</List.Subheader>
          <List.Item
            title="Dark Mode"
            description="Use dark theme to reduce eye strain in low light conditions"
            left={props => <List.Icon {...props} icon="theme-light-dark" />}
            right={() => (
              <Switch
                value={settings.darkMode}
                onValueChange={(value) => handleSettingChange('darkMode', value)}
              />
            )}
          />
        </List.Section>

        <Divider />

        {/* Notifications Section */}
        <List.Section>
          <List.Subheader>Notifications</List.Subheader>
          <List.Item
            title="Push Notifications"
            description="Get real-time alerts for messages and group updates"
            left={props => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={settings.pushNotifications}
                onValueChange={(value) => handleSettingChange('pushNotifications', value)}
              />
            )}
          />
        </List.Section>

        <Divider />

        {/* Data Management Section */}
        <List.Section>
          <List.Subheader>Data Management</List.Subheader>
          <List.Item
            title="Download Your Data"
            description="Get a copy of your data"
            left={props => <List.Icon {...props} icon="download" />}
            onPress={() => {
              // Implement data download logic
              Alert.alert('Coming Soon', 'This feature will be available soon');
            }}
          />
          <List.Item
            title="Delete Account"
            description="Permanently delete your account and all data"
            left={props => <List.Icon {...props} icon="delete" color="red" />}
            onPress={() => setShowDeleteDialog(true)}
          />
        </List.Section>
      </ScrollView>

      {/* Delete Account Dialog */}
      <Portal>
        <Dialog visible={showDeleteDialog} onDismiss={() => setShowDeleteDialog(false)}>
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              This action cannot be undone. All your data will be permanently deleted.
              Please enter your password to confirm.
            </Text>
            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.passwordInput}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button
              onPress={handleDeleteAccount}
              loading={deleteLoading}
              textColor="red"
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  passwordInput: {
    marginTop: 16,
  },
});

export default SettingsScreen; 