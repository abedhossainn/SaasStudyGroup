import { useState, useEffect } from 'react';
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
  Circle as UnreadIcon,
  Update as UpdateIcon,
  ExitToApp as LeaveIcon,
  PersonAdd as JoinIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead,
  subscribeToNotifications
} from '../services/notificationService';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function Notifications() {
  const theme = useTheme();
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userDisplayNames, setUserDisplayNames] = useState({});
  
  useEffect(() => {
    if (!currentUser) return;
    
    // Initial fetch of notifications
    const fetchInitialNotifications = async () => {
      setLoading(true);
      try {
        const userNotifications = await getNotifications(currentUser.uid);
        setNotifications(userNotifications);
        
        // Fetch user display names for each notification
        fetchUserDisplayNames(userNotifications);
      } catch (error) {
        console.error('Error fetching notifications:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialNotifications();
    
    // Set up real-time listener for new notifications
    const unsubscribe = subscribeToNotifications(currentUser.uid, (updatedNotifications) => {
      setNotifications(updatedNotifications);
      
      // Fetch user display names for any new notifications
      fetchUserDisplayNames(updatedNotifications);
      setLoading(false);
    });
    
    // Clean up subscription when component unmounts
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);
  
  // Function to fetch user display names
  const fetchUserDisplayNames = async (notificationList) => {
    const userIds = notificationList
      .filter(notification => notification.senderUserId)
      .map(notification => notification.senderUserId);
      
    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds)];
    
    // Skip if we already have all the names or no IDs to fetch
    if (uniqueUserIds.length === 0) return;
    
    // Only fetch names we don't already have
    const idsToFetch = uniqueUserIds.filter(id => !userDisplayNames[id]);
    if (idsToFetch.length === 0) return;
    
    // Fetch each user's display name
    const newDisplayNames = { ...userDisplayNames };
    
    for (const userId of idsToFetch) {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          newDisplayNames[userId] = userData.displayName || userData.name || 'User';
        } else {
          newDisplayNames[userId] = 'User';
        }
      } catch (error) {
        console.error(`Error fetching user ${userId}:`, error);
        newDisplayNames[userId] = 'User';
      }
    }
    
    setUserDisplayNames(newDisplayNames);
  };

  // Function to format notification content based on type
  const formatNotificationContent = (notification) => {
    if (!notification) return '';
    
    // For join notifications that already contain the username in content
    if (notification.type === 'group_join' && notification.content) {
      // If content contains "User" or an ID followed by "joined group", reformat it
      const joinRegex = /^(.+?)\s+joined\s+group\s+(.+)$/i;
      const match = notification.content.match(joinRegex);
      
      if (match) {
        return `joined group ${match[2]}`;
      }
    }
    
    // For leave notifications that already contain the username in content
    if (notification.type === 'group_leave' && notification.content) {
      const leaveRegex = /^(.+?)\s+left\s+the\s+group$/i;
      const match = notification.content.match(leaveRegex);
      
      if (match) {
        return 'left the group';
      }
    }
    
    // For meeting notifications
    if (notification.type === 'meeting' && notification.content) {
      const meetingRegex = /^(.+?)\s+scheduled\s+a\s+new\s+meeting:\s+(.+)$/i;
      const match = notification.content.match(meetingRegex);
      
      if (match) {
        return `scheduled a new meeting: ${match[2]}`;
      }
    }
    
    // For message notifications
    if (notification.type === 'message' && notification.content) {
      const messageRegex = /^(.+?)\s+sent\s+a\s+new\s+message\s+in\s+(.+)$/i;
      const match = notification.content.match(messageRegex);
      
      if (match) {
        return `sent a new message in ${match[2]}`;
      }
    }
    
    // For document notifications
    if (notification.type === 'document' && notification.content) {
      const docRegex = /^(.+?)\s+uploaded\s+a\s+new\s+document:\s+(.+)$/i;
      const match = notification.content.match(docRegex);
      
      if (match) {
        return `uploaded a new document: ${match[2]}`;
      }
    }
    
    return notification.content;
  };

  const handleMarkAllRead = async () => {
    if (!currentUser) return;
    
    try {
      await markAllNotificationsAsRead(currentUser.uid);
      // No need to update state manually as the real-time listener will update it
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await markNotificationAsRead(notificationId);
      // No need to update state manually as the real-time listener will update it
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
      case 'group_join':
        return <JoinIcon color="primary" />;
      case 'group_leave':
        return <LeaveIcon color="primary" />;
      case 'group_update':
        return <UpdateIcon color="primary" />;
      case 'group':
      default:
        return <GroupIcon color="primary" />;
    }
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Date unknown';
    
    const now = new Date();
    const diff = now - timestamp;
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
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: notification.read ? 400 : 600 }}>
                      {notification.senderUserId && userDisplayNames[notification.senderUserId] ? (
                        <Box component="span" sx={{ fontWeight: 600 }}>
                          {userDisplayNames[notification.senderUserId]}
                        </Box>
                      ) : null}
                      {notification.senderUserId && userDisplayNames[notification.senderUserId] ? ' • ' : ''}
                      {formatNotificationContent(notification)}
                    </Typography>
                  }
                  secondary={
                    <>
                      {formatTimestamp(notification.timestamp)}
                      {notification.groupName && (
                        <span> • {notification.groupName}</span>
                      )}
                    </>
                  }
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
