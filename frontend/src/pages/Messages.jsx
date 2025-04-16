import { useState, useEffect, useRef } from 'react';
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
  Grid,
  Badge,
  Dialog,
  AppBar,
  Toolbar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { Send as SendIcon } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import { db, auth } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useSnackbar } from 'notistack';

export default function Messages() {
  const [allUsers, setAllUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const chatEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null); // Add a ref for the text input field
  const currentUserId = auth.currentUser?.uid;
  const { enqueueSnackbar } = useSnackbar();
  const hasAutoSelectedRef = useRef(false);
  
  // Flag to track if we need to scroll to bottom
  const shouldScrollToBottomRef = useRef(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDialogOpen, setMobileDialogOpen] = useState(false);

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

  // Separate effect for tracking unread message counts
  useEffect(() => {
    if (!currentUserId) return;
    
    // This is a general listener for all messages to count unread ones
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    
      // Count unread messages per sender
      const unreadMap = {};
      const lastMsgsMap = {};
      
      // Group messages by conversation
      msgs.forEach(msg => {
        // Skip messages without timestamp
        if (!msg.timestamp) return;
        
        // Determine the other user in the conversation
        const otherUserId = msg.senderId === currentUserId ? msg.to : msg.senderId;
        
        // Count unread messages
        if (msg.to === currentUserId && !msg.seen && msg.senderId) {
          unreadMap[msg.senderId] = (unreadMap[msg.senderId] || 0) + 1;
        }
        
        // Track the last message for each conversation
        if (!lastMsgsMap[otherUserId] && 
            (msg.senderId === currentUserId || msg.to === currentUserId)) {
          lastMsgsMap[otherUserId] = {
            text: msg.text,
            timestamp: msg.timestamp,
            isFromMe: msg.senderId === currentUserId
          };
        }
      });
      
      setUnreadCounts(unreadMap);
      setLastMessages(lastMsgsMap);
    });
    
    return () => unsubscribe();
  }, [currentUserId]);

  // Auto-select the first chat if none selected
  useEffect(() => {
    if (!currentUserId || allUsers.length === 0 || hasAutoSelectedRef.current) return;
  
    const q = query(collection(db, 'messages'), orderBy('timestamp', 'desc'));
  
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      // Only auto-select chat if it hasn't been done yet
      if (!hasAutoSelectedRef.current && !selectedUser) {
        const lastMessage = msgs.find(msg =>
          msg.senderId === currentUserId || msg.to === currentUserId
        );
  
        if (lastMessage) {
          const otherUserId = lastMessage.senderId === currentUserId
            ? lastMessage.to
            : lastMessage.senderId;
  
          const chatPartner = allUsers.find(user => user.id === otherUserId);
  
          if (chatPartner) {
            setSelectedUser(chatPartner);
            shouldScrollToBottomRef.current = true; // Flag to scroll on first load
            hasAutoSelectedRef.current = true; // prevents re-selection
          }
        }
      }
    });
  
    return () => unsubscribe();
  }, [currentUserId, selectedUser, allUsers, enqueueSnackbar]);

  // Set flag to scroll to bottom whenever selectedUser changes
  useEffect(() => {
    if (selectedUser) {
      shouldScrollToBottomRef.current = true;
    }
  }, [selectedUser]);

  // Load and filter messages for the selected chat
  useEffect(() => {
    if (!selectedUser || !currentUserId) return;

    const q = query(
      collection(db, 'messages'),
      orderBy('timestamp', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(msg => 
          (msg.senderId === currentUserId && msg.to === selectedUser.id) ||
          (msg.senderId === selectedUser.id && msg.to === currentUserId)
        );
      
      setMessages(msgs);

      // Scroll to bottom when messages change
      if (shouldScrollToBottomRef.current && chatEndRef.current) {
        setTimeout(() => {
          chatEndRef.current.scrollIntoView({ behavior: 'auto' });
          shouldScrollToBottomRef.current = false;
        }, 100);
      } else if (chatEndRef.current) {
        // If a new message is from the other user, don't auto-scroll
        // If from current user, do auto-scroll
        const lastMsg = msgs[msgs.length - 1];
        if (lastMsg?.senderId === currentUserId) {
          chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
      }

      // Mark messages as seen when viewing them
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

  // Maintain focus on the input field after each render if inputRef exists
  useEffect(() => {
    // Restore focus to the input field after Firestore updates cause re-renders
    if (inputRef.current && selectedUser) {
      inputRef.current.focus();
    }
  });

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser || !currentUserId) return;
    try {
      // Add the message to Firestore
      await addDoc(collection(db, 'messages'), {
        text: newMessage,
        senderId: currentUserId,
        senderName: auth.currentUser.displayName || '',
        to: selectedUser.id,
        timestamp: serverTimestamp(),
        seen: false,
      });
      
      // Get the current user's name for the notification
      const userRef = doc(db, 'users', currentUserId);
      const userSnap = await getDoc(userRef);
      const senderName = userSnap.exists() ? userSnap.data().displayName || 'Someone' : 'Someone';
      
      // Create a notification for the recipient
      await addDoc(collection(db, 'notifications'), {
        type: 'message',
        content: `${senderName} sent you a message: "${newMessage.length > 30 ? newMessage.substring(0, 30) + '...' : newMessage}"`,
        userId: selectedUser.id,
        senderUserId: currentUserId,
        read: false,
        timestamp: serverTimestamp()
      });
      
      setNewMessage('');
      // Set flag to scroll to bottom after sending
      shouldScrollToBottomRef.current = true;
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleTyping = () => {
    // Do nothing - removing Firestore updates on typing to prevent losing focus
    // The typing indicator is nice but not worth breaking the user experience
    return;
  };

  // Format the last message preview text
  const formatLastMessagePreview = (userId) => {
    const lastMsg = lastMessages[userId];
    if (!lastMsg) return "No messages yet";
    
    const prefix = lastMsg.isFromMe ? "You: " : "";
    let text = lastMsg.text;
    
    // Truncate long messages
    if (text.length > 25) {
      text = text.substring(0, 25) + "...";
    }
    
    return prefix + text;
  };

  // Add effect to handle mobile dialog
  useEffect(() => {
    if (selectedUser && isMobile) {
      setMobileDialogOpen(true);
    }
  }, [selectedUser, isMobile]);

  const handleCloseMobileDialog = () => {
    setMobileDialogOpen(false);
    setSelectedUser(null);
  };

  // Chat content component to avoid duplication
  const ChatContent = () => (
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

      <Box 
        ref={messagesContainerRef}
        sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}
      >
        {messages.map((msg, index) => (
          <Box key={msg.id}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: msg.senderId === currentUserId ? 'flex-end' : 'flex-start',
                mb: 1,
              }}
            >
              <Paper
                sx={{
                  p: 1,
                  backgroundColor: msg.senderId === currentUserId ? 'primary.light' : 'grey.100',
                  maxWidth: '70%',
                }}
              >
                <Typography variant="body2">{msg.text}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {msg.timestamp?.toDate().toLocaleTimeString()}
                </Typography>
              </Paper>
            </Box>

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
        <div ref={chatEndRef} />
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
          inputRef={inputRef} // Attach the ref to the input field
        />
        <IconButton color="primary" type="submit">
          <SendIcon />
        </IconButton>
      </Box>
    </>
  );

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
                    onClick={() => {
                      setSelectedUser(user);
                      shouldScrollToBottomRef.current = true;
                    }}
                  >
                    <ListItemAvatar>
                      <Badge
                        color="error"
                        badgeContent={unreadCounts[user.id] || 0}
                        invisible={!unreadCounts[user.id]}
                      >
                        <Avatar src={user.avatar} alt={user.name}>
                          {!user.avatar && user.name?.[0]}
                        </Avatar>
                      </Badge>
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
                      secondary={formatLastMessagePreview(user.id)}
                    />
                  </ListItem>
                ))}
            </List>
          </Paper>
        </Grid>

        {/* Desktop Chat Area */}
        {!isMobile && (
          <Grid item xs={12} md={8}>
            <Paper sx={{ height: '70vh', display: 'flex', flexDirection: 'column' }}>
              {selectedUser ? (
                <ChatContent />
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
        )}
      </Grid>

      {/* Mobile Chat Dialog */}
      <Dialog
        fullScreen
        open={isMobile && mobileDialogOpen}
        onClose={handleCloseMobileDialog}
      >
        {selectedUser && (
          <>
            <AppBar sx={{ position: 'relative' }}>
              <Toolbar>
                <IconButton
                  edge="start"
                  color="inherit"
                  onClick={handleCloseMobileDialog}
                  aria-label="close"
                >
                  <ArrowBackIcon />
                </IconButton>
                <Typography sx={{ ml: 2, flex: 1 }} variant="h6">
                  {selectedUser.name}
                </Typography>
              </Toolbar>
            </AppBar>
            <Box sx={{ height: 'calc(100vh - 56px)', display: 'flex', flexDirection: 'column' }}>
              <ChatContent />
            </Box>
          </>
        )}
      </Dialog>
    </Box>
  );
}