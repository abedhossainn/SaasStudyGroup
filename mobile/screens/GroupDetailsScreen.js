import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, FlatList, TextInput, KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Text, Button, Snackbar, ActivityIndicator, Card, Avatar, Paragraph, Dialog, Portal, IconButton, Divider } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, storage } from '../config/firebase'; 
import { useAuth } from '../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Agenda } from 'react-native-calendars';
import { collection, doc, getDocs, onSnapshot, addDoc, serverTimestamp, query, orderBy, where, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { uploadGroupDocument, deleteGroup } from '../services/groupService';
import { notifyGroupMembers } from '../services/notificationService';
import { getUserProfiles } from '../services/userService';

const GroupDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;
  const { currentUser } = useAuth();
  const flatListRef = useRef(null);

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [memberProfiles, setMemberProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [showMeetingDialog, setShowMeetingDialog] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    date: new Date(),
    link: ''
  });

  // Fetch group data and member profiles
  useEffect(() => {
    const fetchGroupAndMembers = async () => {
      try {
        const groupDoc = await getDoc(doc(db, 'groups', groupId));
        if (groupDoc.exists()) {
          const groupData = { id: groupDoc.id, ...groupDoc.data() };
          setGroup(groupData);
          
          // Fetch member profiles using the new userService
          if (groupData.members && Array.isArray(groupData.members)) {
            try {
              const profiles = await getUserProfiles(groupData.members);
              setMemberProfiles(profiles);
            } catch (profileError) {
              console.error('Error fetching member profiles:', profileError);
            }
          }
        } else {
          setError('Group not found');
          setShowError(true);
        }
      } catch (err) {
        setError('Error fetching group data');
        setShowError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchGroupAndMembers();
  }, [groupId]);

  // Fetch messages
  useEffect(() => {
    const messagesQuery = query(
      collection(db, `groups/${groupId}/messages`),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, async (snapshot) => {
      try {
        const newMessages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp?.toDate()
        }));

        // Get unique sender IDs from new messages
        const senderIds = [...new Set(newMessages.map(msg => msg.senderId).filter(Boolean))];
        
        if (senderIds.length > 0) {
          try {
            // Fetch any missing user profiles
            const newProfiles = await getUserProfiles(senderIds);
            
            // Update member profiles with any new users
            setMemberProfiles(prev => ({
              ...prev,
              ...newProfiles
            }));
          } catch (profileError) {
            console.error('Error fetching message sender profiles:', profileError);
          }
        }

        setMessages(newMessages);
        setTimeout(scrollToBottom, 100);
      } catch (error) {
        console.error('Error processing messages:', error);
      }
    });

    return () => unsubscribe();
  }, [groupId]);

  // Fetch documents
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, `groups/${groupId}/documents`), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setDocuments(docs);
    });

    return () => unsubscribe();
  }, [groupId]);

  // Fetch meetings
  useEffect(() => {
    const meetingsQuery = query(
      collection(db, 'meetings'),
      where('groupId', '==', groupId)
    );

    const unsubscribe = onSnapshot(meetingsQuery, (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMeetings(meetingsData);
    });

    return () => unsubscribe();
  }, [groupId]);

  const sendMessage = async () => {
    if (newMessage.trim().length === 0) return;

    try {
      const messageData = {
        content: newMessage,
        senderId: currentUser.uid,
        timestamp: serverTimestamp()
      };

      await addDoc(collection(db, `groups/${groupId}/messages`), messageData);

      // Update group's lastActive timestamp
      await updateDoc(doc(db, 'groups', groupId), {
        lastActive: serverTimestamp()
      });

      setNewMessage('');
    } catch (err) {
      setError('Failed to send message');
      setShowError(true);
    }
  };

  const handleFileUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
      });

      if (res.type === 'success') {
        setUploading(true);
        await uploadGroupDocument(res, groupId, currentUser.uid, res.name);
        setUploading(false);
      }
    } catch (err) {
      if (err.type !== 'cancel') {
        setError(err.message);
        setShowError(true);
      }
      setUploading(false);
    }
  };

  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.description) {
      setError('Please fill in all required fields');
      setShowError(true);
      return;
    }

    try {
      await addDoc(collection(db, 'meetings'), {
        ...newMeeting,
        groupId,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      });

      setShowMeetingDialog(false);
      setNewMeeting({
        title: '',
        description: '',
        date: new Date(),
        link: ''
      });

      // Notify group members
      await notifyGroupMembers(
        groupId,
        currentUser.uid,
        'meeting',
        `New meeting scheduled: ${newMeeting.title}`
      );
    } catch (err) {
      setError('Failed to create meeting');
      setShowError(true);
    }
  };

  const handleDeleteGroup = async () => {
    try {
      await deleteGroup(groupId);
      navigation.goBack();
    } catch (err) {
      setError('Failed to delete group');
      setShowError(true);
    }
  };

  const scrollToBottom = () => {
    if (messages.length > 0) {
      flatListRef.current?.scrollToEnd({ animated: true });
    }
  };

  const handleDownloadFile = async (fileUrl, fileName) => {
    try {
      // Show loading state
      setUploading(true);

      // Get the file extension
      const fileExtension = fileName.split('.').pop();
      
      // Create a local file path
      const localUri = `${FileSystem.documentDirectory}${fileName}`;

      // Download the file
      const downloadResult = await FileSystem.downloadAsync(fileUrl, localUri);

      if (downloadResult.status === 200) {
        // Open the file
        await Linking.openURL(downloadResult.uri);
      } else {
        throw new Error('Download failed');
      }
    } catch (err) {
      setError('Failed to download file: ' + err.message);
      setShowError(true);
    } finally {
      setUploading(false);
    }
  };

  const renderMessage = ({ item }) => {
    const sender = memberProfiles[item.senderId];
    const isCurrentUser = item.senderId === currentUser.uid;

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.myMessage : styles.otherMessage
      ]}>
        <View style={styles.messageHeader}>
          {sender?.photoURL ? (
            <Avatar.Image size={24} source={{ uri: sender.photoURL }} style={styles.messageAvatar} />
          ) : (
            <Avatar.Text 
              size={24} 
              label={sender?.displayName?.substring(0, 2).toUpperCase() || '??'} 
              style={styles.messageAvatar} 
            />
          )}
          <Text style={styles.messageUser}>
            {isCurrentUser ? 'You' : (sender?.displayName || 'Unknown User')}
          </Text>
        </View>
        <Text style={styles.messageText}>{item.content}</Text>
        <Text style={styles.messageTime}>
          {item.timestamp?.toLocaleTimeString()}
        </Text>
      </View>
    );
  };

  const renderDocument = (doc) => {
    const uploader = memberProfiles[doc.uploadedBy];
    return (
      <Card key={doc.id} style={styles.documentCard}>
        <Card.Title
          title={doc.name}
          subtitle={`Uploaded by ${uploader?.displayName || 'Unknown User'}`}
          left={(props) => (
            <Avatar.Icon
              {...props}
              icon="file"
              size={40}
            />
          )}
        />
        <Card.Actions>
          <Button
            icon="download"
            mode="contained"
            onPress={() => handleDownloadFile(doc.fileUrl, doc.name)}
            loading={uploading}
          >
            Download
          </Button>
        </Card.Actions>
      </Card>
    );
  };

  if (loading) return <ActivityIndicator animating={true} style={styles.centered} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        ListHeaderComponent={() => (
          <>
            <View style={styles.header}>
              <Text variant="headlineMedium">{group?.name}</Text>
              <Text variant="bodyLarge">{group?.description}</Text>
              <Text variant="bodySmall">Members: {group?.members?.length || 0}</Text>
            </View>

            <View style={styles.actions}>
              <Button
                icon="file-upload"
                mode="contained"
                onPress={handleFileUpload}
                loading={uploading}
                style={styles.actionButton}
              >
                Upload Document
              </Button>
              <Button
                icon="calendar-plus"
                mode="contained"
                onPress={() => setShowMeetingDialog(true)}
                style={styles.actionButton}
              >
                Schedule Meeting
              </Button>
              {group?.creatorId === currentUser.uid && (
                <Button
                  icon="delete"
                  mode="contained"
                  onPress={handleDeleteGroup}
                  style={[styles.actionButton, styles.deleteButton]}
                >
                  Delete Group
                </Button>
              )}
            </View>

            <Text variant="titleLarge" style={styles.sectionTitle}>Chat</Text>
          </>
        )}
        ListFooterComponent={() => (
          <>
            <View style={styles.inputContainer}>
              <TextInput
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Type a message..."
                style={styles.input}
              />
              <Button mode="contained" onPress={sendMessage}>Send</Button>
            </View>

            <Text variant="titleLarge" style={styles.sectionTitle}>Documents</Text>
            {documents.map(renderDocument)}

            <Text variant="titleLarge" style={styles.sectionTitle}>Meetings</Text>
            {meetings.map(meeting => (
              <Card key={meeting.id} style={styles.meetingCard}>
                <Card.Title
                  title={meeting.title}
                  subtitle={new Date(meeting.date).toLocaleString()}
                />
                <Card.Content>
                  <Paragraph>{meeting.description}</Paragraph>
                  {meeting.link && (
                    <Button
                      icon="video"
                      mode="contained"
                      onPress={() => Linking.openURL(meeting.link)}
                      style={styles.meetingLink}
                    >
                      Join Meeting
                    </Button>
                  )}
                </Card.Content>
              </Card>
            ))}
          </>
        )}
        contentContainerStyle={styles.container}
        onContentSizeChange={scrollToBottom}
        onLayout={scrollToBottom}
      />

      <Portal>
        <Dialog visible={showMeetingDialog} onDismiss={() => setShowMeetingDialog(false)}>
          <Dialog.Title>Schedule New Meeting</Dialog.Title>
          <Dialog.Content>
            <TextInput
              label="Title"
              value={newMeeting.title}
              onChangeText={(text) => setNewMeeting(prev => ({ ...prev, title: text }))}
              style={styles.input}
            />
            <TextInput
              label="Description"
              value={newMeeting.description}
              onChangeText={(text) => setNewMeeting(prev => ({ ...prev, description: text }))}
              multiline
              style={styles.input}
            />
            <TextInput
              label="Meeting Link (optional)"
              value={newMeeting.link}
              onChangeText={(text) => setNewMeeting(prev => ({ ...prev, link: text }))}
              style={styles.input}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowMeetingDialog(false)}>Cancel</Button>
            <Button onPress={handleCreateMeeting}>Schedule</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={3000}
      >
        {error}
      </Snackbar>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  actionButton: {
    flex: 1,
    minWidth: 150,
  },
  deleteButton: {
    backgroundColor: '#ff4444',
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 12,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  messageAvatar: {
    marginRight: 8,
  },
  messageContainer: {
    padding: 10,
    marginVertical: 4,
    borderRadius: 10,
    maxWidth: '80%',
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C5',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#eee',
  },
  messageUser: {
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageText: {
    marginBottom: 4,
    fontSize: 16,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginRight: 8,
    backgroundColor: 'white',
  },
  documentCard: {
    marginBottom: 10,
  },
  meetingCard: {
    marginBottom: 10,
  },
  meetingLink: {
    marginTop: 10,
  },
});

export default GroupDetails;