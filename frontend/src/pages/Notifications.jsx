import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Paper,
  Button,
  Divider,
  useTheme,
  Badge
} from '@mui/material';
import {
  Message as MessageIcon,
  Event as MeetingIcon,
  Description as DocumentIcon,
  Group as GroupIcon,
  Notifications as NotificationsIcon,
  DoneAll as MarkReadIcon,
  Circle as UnreadIcon
} from '@mui/icons-material';
import { mockApi } from '../services/mockApi';

export default function Notifications() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const data = await mockApi.getNotifications();
      setNotifications(data);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await mockApi.markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (error) {
      console.error('Error marking notifications as read:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await mockApi.markNotificationAsRead(notificationId);
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return <MessageIcon color="primary" />;
      case 'meeting':
        return <MeetingIcon color="primary" />;
      case 'document':
        return <DocumentIcon color="primary" />;
      case 'group':
        return <GroupIcon color="primary" />;
      default:
        return <NotificationsIcon color="primary" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading notifications...</Typography>
      </Box>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Badge badgeContent={unreadCount} color="error">
                <NotificationsIcon color="primary" />
              </Badge>
            )}
          </Box>
          {unreadCount > 0 && (
            <Button
              startIcon={<MarkReadIcon />}
              onClick={handleMarkAllRead}
              sx={{
                color: theme.palette.mode === 'light' ? 'black' : 'white',
              }}
            >
              Mark all as read
            </Button>
          )}
        </Box>

        <List>
          {notifications.map((notification, index) => (
            <Box key={notification.id}>
              {index > 0 && <Divider />}
              <ListItem
                sx={{
                  bgcolor: notification.read ? 'transparent' : 'rgba(255, 215, 0, 0.1)',
                  transition: 'background-color 0.2s',
                  '&:hover': {
                    bgcolor: notification.read ? 'action.hover' : 'rgba(255, 215, 0, 0.2)'
                  }
                }}
                secondaryAction={
                  !notification.read && (
                    <IconButton
                      edge="end"
                      onClick={() => handleMarkAsRead(notification.id)}
                      sx={{ color: theme.palette.primary.main }}
                    >
                      <UnreadIcon fontSize="small" />
                    </IconButton>
                  )
                }
              >
                <ListItemIcon>
                  {getNotificationIcon(notification.type)}
                </ListItemIcon>
                <ListItemText
                  primary={notification.content}
                  secondary={formatTimestamp(notification.timestamp)}
                  sx={{
                    '& .MuiListItemText-primary': {
                      fontWeight: notification.read ? 400 : 600
                    }
                  }}
                />
              </ListItem>
            </Box>
          ))}
        </List>

        {notifications.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <NotificationsIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography color="text.secondary">
              No notifications yet
            </Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}
