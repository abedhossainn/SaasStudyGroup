import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Button,
  Divider,
  Avatar,
  Card,
  CardContent,
  useTheme,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Description as DocumentIcon,
  Event as EventIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';

export default function GroupDetails() {
  const theme = useTheme();
  const { groupId } = useParams();
  const { currentUser } = useAuth();
  const [group, setGroup] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        const data = await mockApi.getGroupById(groupId);
        setGroup(data);
      } catch (error) {
        console.error('Error fetching group:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchGroup();
  }, [groupId]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      const newMessage = await mockApi.sendMessage(groupId, {
        userId: currentUser.id,
        message: message.trim()
      });
      setGroup(prev => ({
        ...prev,
        chat: [...prev.chat, newMessage]
      }));
      setMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const newDoc = await mockApi.uploadDocument(groupId, {
        name: file.name,
        url: URL.createObjectURL(file)
      });
      setGroup(prev => ({
        ...prev,
        documents: [...prev.documents, newDoc]
      }));
    } catch (error) {
      console.error('Error uploading document:', error);
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (!group) {
    return <Typography>Group not found</Typography>;
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundImage: `url(${group.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: 200,
          display: 'flex',
          alignItems: 'flex-end',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)'
          }
        }}
      >
        <Box sx={{ position: 'relative', color: 'white', zIndex: 1 }}>
          <Typography variant="h4" gutterBottom>
            {group.name}
          </Typography>
          <Typography variant="subtitle1">
            {group.description}
          </Typography>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Left Side - Documents and Meetings */}
        <Grid item xs={12} md={4}>
          {/* Documents Section */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Documents</Typography>
                <Button
                  component="label"
                  startIcon={<UploadIcon />}
                  variant="contained"
                >
                  Upload
                  <input
                    type="file"
                    hidden
                    onChange={handleFileUpload}
                  />
                </Button>
              </Box>
              <List>
                {group.documents.map((doc) => (
                  <ListItem
                    key={doc.id}
                    sx={{
                      bgcolor: theme.palette.background.paper,
                      mb: 1,
                      borderRadius: 1
                    }}
                  >
                    <ListItemIcon>
                      <DocumentIcon />
                    </ListItemIcon>
                    <ListItemText primary={doc.name} />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>

          {/* Meetings Section */}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Upcoming Meetings
              </Typography>
              <List>
                {group.meetings.map((meeting) => (
                  <ListItem
                    key={meeting.id}
                    sx={{
                      bgcolor: theme.palette.background.paper,
                      mb: 1,
                      borderRadius: 1
                    }}
                  >
                    <ListItemIcon>
                      <EventIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary={meeting.title}
                      secondary={new Date(meeting.date).toLocaleString()}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Right Side - Group Chat */}
        <Grid item xs={12} md={8}>
          <Card sx={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
            <CardContent sx={{ flexGrow: 1, overflow: 'auto' }}>
              <List>
                {group.chat.map((msg) => (
                  <ListItem
                    key={msg.id}
                    sx={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: msg.userId === currentUser.id ? 'flex-end' : 'flex-start',
                      mb: 1
                    }}
                  >
                    <Box
                      sx={{
                        bgcolor: msg.userId === currentUser.id ? theme.palette.primary.main : theme.palette.background.paper,
                        color: msg.userId === currentUser.id ? 'black' : 'inherit',
                        p: 1.5,
                        borderRadius: 2,
                        maxWidth: '70%'
                      }}
                    >
                      <Typography variant="body1">{msg.message}</Typography>
                      <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                        {msg.timestamp}
                      </Typography>
                    </Box>
                  </ListItem>
                ))}
              </List>
            </CardContent>
            <Divider />
            <Box
              component="form"
              onSubmit={handleSendMessage}
              sx={{
                p: 2,
                bgcolor: theme.palette.background.paper,
                display: 'flex',
                gap: 1
              }}
            >
              <IconButton
                component="label"
                size="small"
              >
                <AttachFileIcon />
                <input
                  type="file"
                  hidden
                  onChange={handleFileUpload}
                />
              </IconButton>
              <TextField
                fullWidth
                placeholder="Type a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                variant="outlined"
                size="small"
              />
              <IconButton
                type="submit"
                color="primary"
                disabled={!message.trim()}
              >
                <SendIcon />
              </IconButton>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}