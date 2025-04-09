import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  TextField,
  IconButton,
  Divider,
  Grid
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';

import { db, auth } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';

export default function Messages() {
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  const currentUserId = auth.currentUser?.uid;

  useEffect(() => {
    if (!currentUserId) return;
  
    const unsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
      const fetchedUsers = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data(),
          name: doc.data().displayName,
          avatar: doc.data().photoURL || '',
        }))
        .filter(user => user.id !== currentUserId);
  
      setAllUsers(fetchedUsers);
    });
  
    return () => unsubscribe();
  }, [currentUserId]);

  // Real-time message updates between current and selected user
  useEffect(() => {
    if (!currentUserId || allUsers.length === 0) return;
  
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
  
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
      // Find the most recent message involving this user
      const lastMessage = msgs.find(msg =>
        msg.senderId === currentUserId || msg.to === currentUserId
      );
  
      if (lastMessage) {
        // Identify the other user
        const otherUserId = lastMessage.senderId === currentUserId
          ? lastMessage.to
          : lastMessage.senderId;
  
        // Find that user in the allUsers list
        const chatPartner = allUsers.find(user => user.id === otherUserId);
  
        if (chatPartner) {
          setSelectedUser(chatPartner);
        }
      }
    });
  
    return () => unsubscribe();
  }, [currentUserId, allUsers]);

  useEffect(() => {
    if (!selectedUser || !currentUserId) return;
  
    const q = query(collection(db, 'messages'), orderBy('timestamp'));
  
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
      const filteredMsgs = msgs.filter(msg =>
        (msg.senderId === currentUserId && msg.to === selectedUser.id) ||
        (msg.senderId === selectedUser.id && msg.to === currentUserId)
      );
    
      setMessages(filteredMsgs);
    
      // 🔥 Mark unread messages as seen
      msgs.forEach((msg) => {
        if (
          msg.senderId === selectedUser.id &&
          msg.to === currentUserId &&
          !msg.seen
        ) {
          const msgRef = doc(db, 'messages', msg.id);
          updateDoc(msgRef, { seen: true });
        }
      });
    });
  
    return () => unsubscribe();
  }, [selectedUser, currentUserId]);  

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUserId) return;

    try {
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        senderId: currentUserId,
        senderName: auth.currentUser.displayName || '', // fallback just in case
        to: selectedUser.id,
        timestamp: serverTimestamp(),
      });
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = () => {
    if (!auth.currentUser || !selectedUser) return;
  
    const userRef = doc(db, 'users', auth.currentUser.uid);
  
    // Set typingTo to the selected user
    updateDoc(userRef, {
      typingTo: selectedUser.id
    });
  
    // Clear after 2 seconds of inactivity
    clearTimeout(window.typingTimeout);
    window.typingTimeout = setTimeout(() => {
      updateDoc(userRef, {
        typingTo: null
      });
    }, 2000);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Messages
      </Typography>

      <Grid container spacing={2}>
        {/* Contacts List */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ height: '70vh' }}>
            <Box sx={{ p: 2 }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search contacts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </Box>
            <Divider />
            <List sx={{ overflow: 'auto', maxHeight: 'calc(70vh - 70px)' }}>
              {allUsers
                .filter(user =>
                  user.name?.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((user) => (
                  <ListItem
                    key={user.id}
                    button
                    selected={selectedUser?.id === user.id}
                    onClick={() => setSelectedUser(user)}
                  >
                    <ListItemAvatar>
                      <Avatar src={user.avatar} alt={user.name}>
                        {!user.avatar && user.name?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Box display="flex" alignItems="center" gap={1}>
                          {user.name}
                          <Box
                            sx={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: user.status === 'online' ? 'green' : 'gray',
                              mt: '2px'
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        user.status === 'online'
                          ? 'Online'
                          : user.lastSeen
                            ? `Last seen ${formatDistanceToNow(user.lastSeen.toDate())} ago`
                            : 'Offline'
                      }
                    />
                  </ListItem>
                ))}
            </List>
          </Paper>
        </Grid>

        {/* Chat Area */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
            {selectedUser ? (
              <>
                <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography variant="h6">{selectedUser.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.typingTo === currentUserId
                      ? 'Typing...'
                      : selectedUser.status === 'online'
                        ? 'Online'
                        : selectedUser.lastSeen
                          ? `Last seen ${formatDistanceToNow(selectedUser.lastSeen.toDate())} ago`
                        : 'Offline'}
                  </Typography>
                </Box>

                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {messages.map((msg, index) => (
                    <Box key={msg.id}>
                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent:
                            msg.senderId === currentUserId ? 'flex-end' : 'flex-start',
                          mb: 1,
                        }}
                      >
                        <Paper
                          sx={{
                            p: 1,
                            backgroundColor:
                              msg.senderId === currentUserId ? 'primary.light' : 'grey.100',
                            maxWidth: '70%',
                          }}
                        >
                          <Typography variant="body2">{msg.text}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {msg.timestamp?.toDate().toLocaleTimeString()}
                          </Typography>
                        </Paper>
                      </Box>

                      {/* 👁️ Seen indicator for last message sent by current user */}
                      {index === messages.length - 1 &&
                        msg.senderId === currentUserId &&
                        msg.seen && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', pr: 1 }}>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                fontStyle: 'italic',
                                fontSize: '0.75rem',
                                mt: '-4px',
                              }}
                            >
                              Seen
                            </Typography>
                          </Box>
                      )}
                    </Box>
                  ))}
                </Box>

                <Box
                  component="form"
                  onSubmit={handleSendMessage}
                  sx={{
                    p: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    gap: 1,
                  }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => {
                      setNewMessage(e.target.value);
                      handleTyping();
                    }}
                  />
                  <IconButton color="primary" type="submit">
                    <SendIcon />
                  </IconButton>
                </Box>
              </>
            ) : (
              <Box
                sx={{
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Typography color="text.secondary">
                  Select a contact to start messaging
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
