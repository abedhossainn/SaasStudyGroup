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
import { mockApi } from '../services/mockApi';

export default function Messages() {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const messagesData = await mockApi.getMessages();
        setMessages(messagesData);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };
    fetchMessages();
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;

    try {
      const newMsg = await mockApi.sendMessage({
        text: newMessage,
        from: 1, // Current user ID
        to: selectedUser.id,
        timestamp: new Date().toISOString()
      });
      setMessages([...messages, newMsg]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
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
              />
            </Box>
            <Divider />
            <List sx={{ overflow: 'auto', maxHeight: 'calc(70vh - 70px)' }}>
              {[
                { id: 2, name: 'George Alan', avatar: 'https://i.pravatar.cc/150?img=2' },
                { id: 3, name: 'Safiya Fareena', avatar: 'https://i.pravatar.cc/150?img=3' },
                { id: 4, name: 'Robert Allen', avatar: 'https://i.pravatar.cc/150?img=4' }
              ].map((user) => (
                <ListItem
                  key={user.id}
                  button
                  selected={selectedUser?.id === user.id}
                  onClick={() => setSelectedUser(user)}
                >
                  <ListItemAvatar>
                    <Avatar src={user.avatar} alt={user.name} />
                  </ListItemAvatar>
                  <ListItemText
                    primary={user.name}
                    secondary="Click to view conversation"
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
                  <Typography variant="h6">
                    {selectedUser.name}
                  </Typography>
                </Box>

                <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2 }}>
                  {messages
                    .filter(msg => 
                      (msg.from === 1 && msg.to === selectedUser.id) ||
                      (msg.from === selectedUser.id && msg.to === 1)
                    )
                    .map((msg) => (
                      <Box
                        key={msg.id}
                        sx={{
                          display: 'flex',
                          justifyContent: msg.from === 1 ? 'flex-end' : 'flex-start',
                          mb: 1
                        }}
                      >
                        <Paper
                          sx={{
                            p: 1,
                            backgroundColor: msg.from === 1 ? 'primary.light' : 'grey.100',
                            maxWidth: '70%'
                          }}
                        >
                          <Typography variant="body2">{msg.text}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </Typography>
                        </Paper>
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
                    gap: 1
                  }}
                >
                  <TextField
                    size="small"
                    fullWidth
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
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
                  justifyContent: 'center'
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