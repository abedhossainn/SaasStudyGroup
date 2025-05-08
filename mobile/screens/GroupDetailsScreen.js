import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, ScrollView, FlatList, TextInput, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { Text, Button, Snackbar, ActivityIndicator, Card, Avatar, Paragraph } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { db, storage } from '../config/firebase'; 
import { useAuth } from '../contexts/AuthContext';
import * as DocumentPicker from 'expo-document-picker';
import { Agenda } from 'react-native-calendars';
import { collection, doc, getDocs, onSnapshot, addDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'; 

const GroupDetails = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { groupId } = route.params;
  const currentUser = useAuth();

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [calendarItems, setCalendarItems] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'groups', groupId), (docSnap) => {
      if (docSnap.exists()) {
        setGroup({ id: docSnap.id, ...docSnap.data() });
        setLoading(false);
      } else {
        setError('Group not found');
        setShowError(true);
        setLoading(false);
      }
    }, (err) => {
      setError(err.message);
      setShowError(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [groupId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'groups', groupId, 'messages'), (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt.toDate(),
      }));
      const sorted = newMessages.sort((a, b) => b.createdAt - a.createdAt);
      setMessages(sorted);
    });

    return () => unsubscribe();
  }, [groupId]);

  const sendMessage = async () => {
    if (newMessage.trim().length === 0) return;

    await addDoc(collection(db, 'groups', groupId, 'messages'), {
      text: newMessage,
      createdAt: new Date(),
      user: {
        _id: currentUser.uid,
        name: currentUser.displayName,
        avatar: currentUser.photoURL,
      }
    });

    setNewMessage('');
  };

  const handleFileUpload = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: "*/*",
      });

      if (res.type === 'success') {
        const fileUri = res.uri;
        const fileName = res.name;

        const fileRef = ref(storage, `group-documents/${groupId}/${fileName}`);
        const uploadTask = uploadBytesResumable(fileRef, fileUri);

        uploadTask.on('state_changed', 
          (snapshot) => {}, 
          (error) => {
            setError(error.message);
            setShowError(true);
          }, 
          async () => {
            const fileUrl = await getDownloadURL(uploadTask.snapshot.ref);
            await addDoc(collection(db, 'groups', groupId, 'documents'), {
              name: fileName,
              fileUrl,
              uploadedBy: currentUser.uid,
              createdAt: serverTimestamp(),
            });
          }
        );
      }
    } catch (err) {
      if (err.type !== 'cancel') {
        setError(err.message);
        setShowError(true);
      }
    }
  };

  const fetchCalendarItems = async () => {
    try {
      const meetingsSnapshot = await getDocs(collection(db, 'groups', groupId, 'meetings'));
      const items = {};
      meetingsSnapshot.forEach(doc => {
        const data = doc.data();
        const date = data.date;
        if (!items[date]) items[date] = [];
        items[date].push({ title: data.title, description: data.description });
      });
      setCalendarItems(items);
    } catch (err) {
      setError(err.message);
      setShowError(true);
    }
  };

  useEffect(() => {
    fetchCalendarItems();
  }, [groupId]);

  if (loading) return <ActivityIndicator animating={true} style={styles.centered} />;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      <ScrollView style={styles.container}>
        <Text variant="headlineMedium">{group?.name}</Text>
        <Text>{group?.description}</Text>
        <Button onPress={handleFileUpload} mode="contained" style={styles.button}>Upload Document</Button>

        <Text variant="titleLarge" style={styles.sectionTitle}>Chat</Text>
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          inverted
          renderItem={({ item }) => (
            <View style={item.user._id === currentUser.uid ? styles.myMessage : styles.otherMessage}>
              <Text style={styles.messageUser}>{item.user.name}</Text>
              <Text>{item.text}</Text>
              <Text style={styles.messageTime}>{item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
            </View>
          )}
        />

        <View style={styles.inputContainer}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            style={styles.input}
          />
          <Button mode="contained" onPress={sendMessage}>Send</Button>
        </View>

        <Text variant="titleLarge" style={styles.sectionTitle}>Meetings</Text>
        <Agenda
          items={calendarItems}
          selected={new Date().toISOString().split('T')[0]}
          renderItem={(item) => (
            <Card style={styles.card}>
              <Card.Title title={item.title} />
              <Card.Content>
                <Paragraph>{item.description}</Paragraph>
              </Card.Content>
            </Card>
          )}
        />

        <Snackbar
          visible={showError}
          onDismiss={() => setShowError(false)}
          duration={3000}
        >
          {error}
        </Snackbar>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 16,
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    marginVertical: 16,
  },
  sectionTitle: {
    marginTop: 24,
    marginBottom: 8,
  },
  card: {
    marginBottom: 10,
    padding: 10,
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
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#DCF8C5',
    borderRadius: 10,
    padding: 8,
    marginVertical: 4,
    maxWidth: '80%',
  },
  otherMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#eee',
    borderRadius: 10,
    padding: 8,
    marginVertical: 4,
    maxWidth: '80%',
  },
  messageUser: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  messageTime: {
    fontSize: 10,
    marginTop: 2,
    textAlign: 'right',
  },
});

export default GroupDetails;