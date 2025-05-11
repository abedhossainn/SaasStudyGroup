import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, List, Avatar, TextInput, IconButton, Divider, Searchbar, ActivityIndicator, Portal, Dialog } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, getDoc } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

const MessagesScreen = () => {
  const { currentUser } = useAuth();
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [loading, setLoading] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const flatListRef = useRef(null);

  // Fetch all users
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().displayName,
          avatar: doc.data().photoURL || '',
        }))
        .filter(user => user.id !== currentUser.uid);

      setAllUsers(fetchedUsers);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Track unread messages and last messages
  useEffect(() => {
    if (!currentUser) return;
    
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    
      const unreadMap = {};
      const lastMsgsMap = {};
      
      msgs.forEach(msg => {
        if (!msg.timestamp) return;
        
        const otherUserId = msg.senderId === currentUser.uid ? msg.to : msg.senderId;
        
        if (msg.to === currentUser.uid && !msg.seen && msg.senderId) {
          unreadMap[msg.senderId] = (unreadMap[msg.senderId] || 0) + 1;
        }
        
        if (!lastMsgsMap[otherUserId] && 
            (msg.senderId === currentUser.uid || msg.to === currentUser.uid)) {
          lastMsgsMap[otherUserId] = {
            text: msg.text,
            timestamp: msg.timestamp,
            isFromMe: msg.senderId === currentUser.uid
          };
        }
      });
      
      setUnreadCounts(unreadMap);
      setLastMessages(lastMsgsMap);
    });
    
    return () => unsubscribe();
  }, [currentUser]);

  // Load messages for selected chat
  useEffect(() => {
    if (!selectedUser || !currentUser) return;

    const q = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(msg => 
          (msg.senderId === currentUser.uid && msg.to === selectedUser.id) ||
          (msg.senderId === selectedUser.id && msg.to === currentUser.uid)
        );
      
      setMessages(msgs);

      // Mark messages as seen
      msgs.forEach((msg) => {
        if (
          msg.senderId === selectedUser.id &&
          msg.to === currentUser.uid &&
          !msg.seen
        ) {
          const msgRef = doc(db, 'messages', msg.id);
          updateDoc(msgRef, { seen: true });
        }
      });
    });

    return () => unsubscribe();
  }, [selectedUser, currentUser]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedUser || !currentUser) return;
    
    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        senderId: currentUser.uid,
        senderName: currentUser.displayName || '',
        to: selectedUser.id,
        timestamp: serverTimestamp(),
        seen: false,
      });
      
      // Create notification for recipient
      await addDoc(collection(db, 'notifications'), {
        type: 'message',
        content: `${currentUser.displayName || 'Someone'} sent you a message: "${newMessage.length > 30 ? newMessage.substring(0, 30) + '...' : newMessage}"`,
        userId: selectedUser.id,
        senderUserId: currentUser.uid,
        read: false,
        timestamp: serverTimestamp()
      });
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const formatLastMessagePreview = (userId) => {
    const lastMsg = lastMessages[userId];
    if (!lastMsg) return "No messages yet";
    
    const prefix = lastMsg.isFromMe ? "You: " : "";
    let text = lastMsg.text;
    
    if (text.length > 25) {
      text = text.substring(0, 25) + "...";
    }
    
    return prefix + text;
  };

  const renderMessage = ({ item: msg }) => (
    <View style={[
      styles.messageContainer,
      msg.senderId === currentUser.uid ? styles.sentMessage : styles.receivedMessage
    ]}>
      <View style={[
        styles.messageBubble,
        msg.senderId === currentUser.uid ? styles.sentBubble : styles.receivedBubble
      ]}>
        <Text style={styles.messageText}>{msg.text}</Text>
        <Text style={styles.messageTime}>
          {msg.timestamp?.toDate().toLocaleTimeString()}
        </Text>
      </View>
      {msg.senderId === currentUser.uid && msg.seen && (
        <Text style={styles.seenText}>Seen</Text>
      )}
    </View>
  );

  const renderUserItem = ({ item: user }) => (
    <List.Item
      title={user.name}
      description={formatLastMessagePreview(user.id)}
      left={props => (
        <View style={styles.avatarContainer}>
          <Avatar.Image
            {...props}
            size={40}
            source={user.avatar ? { uri: user.avatar } : null}
          />
          {unreadCounts[user.id] > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCounts[user.id]}</Text>
            </View>
          )}
        </View>
      )}
      onPress={() => {
        setSelectedUser(user);
        setShowChat(true);
      }}
      style={styles.userItem}
    />
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {!showChat ? (
        // Users List View
        <>
          <Searchbar
            placeholder="Search contacts..."
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchBar}
          />
          <FlatList
            data={allUsers.filter(user =>
              user.name?.toLowerCase().includes(searchQuery.toLowerCase())
            )}
            renderItem={renderUserItem}
            keyExtractor={item => item.id}
            ItemSeparatorComponent={() => <Divider />}
          />
        </>
      ) : (
        // Chat View
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.chatContainer}
        >
          <View style={styles.chatHeader}>
            <IconButton
              icon="arrow-left"
              onPress={() => setShowChat(false)}
            />
            <Text style={styles.chatHeaderTitle}>{selectedUser.name}</Text>
          </View>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={item => item.id}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd()}
            style={styles.messagesList}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={newMessage}
              onChangeText={setNewMessage}
              placeholder="Type a message..."
              multiline
            />
            <IconButton
              icon="send"
              onPress={handleSendMessage}
              disabled={!newMessage.trim()}
            />
          </View>
        </KeyboardAvoidingView>
      )}
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
  searchBar: {
    margin: 8,
    elevation: 2,
  },
  userItem: {
    paddingVertical: 8,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 8,
  },
  unreadBadge: {
    position: 'absolute',
    right: -4,
    top: -4,
    backgroundColor: 'red',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  chatContainer: {
    flex: 1,
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  chatHeaderTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  messagesList: {
    flex: 1,
    padding: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 16,
    maxWidth: '100%',
  },
  sentBubble: {
    backgroundColor: '#DCF8C6',
  },
  receivedBubble: {
    backgroundColor: '#E8E8E8',
  },
  messageText: {
    fontSize: 16,
  },
  messageTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  seenText: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    marginRight: 8,
    maxHeight: 100,
  },
});

export default MessagesScreen; 