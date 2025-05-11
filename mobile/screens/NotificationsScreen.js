import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { Text, List, Divider, IconButton, Button, ActivityIndicator, Card } from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc, updateDoc, getDocs } from 'firebase/firestore';
import { format } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const NotificationsScreen = () => {
  const { currentUser } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userDisplayNames, setUserDisplayNames] = useState({});

  useEffect(() => {
    if (!currentUser) return;

    // Set up real-time listener for notifications
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', currentUser.uid),
      orderBy('timestamp', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp?.toDate()
      }));
      setNotifications(notificationsData);
      fetchUserDisplayNames(notificationsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

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

  const handleMarkAllRead = async () => {
    if (!currentUser) return;

    try {
      const q = query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        where('read', '==', false)
      );

      const snapshot = await getDocs(q);
      const updatePromises = snapshot.docs.map(doc =>
        updateDoc(doc.ref, { read: true })
      );

      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const notificationRef = doc(db, 'notifications', notificationId);
      await updateDoc(notificationRef, { read: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'message':
        return 'message-text';
      case 'meeting':
        return 'calendar-clock';
      case 'document':
        return 'file-document';
      case 'group_join':
        return 'account-plus';
      case 'group_leave':
        return 'account-minus';
      case 'group_update':
        return 'update';
      default:
        return 'bell';
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

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // The real-time listener will automatically update the notifications
    setRefreshing(false);
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <Button
            mode="contained"
            onPress={handleMarkAllRead}
            style={styles.markAllButton}
          >
            Mark all as read
          </Button>
        )}
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {notifications.map((notification, index) => (
          <Card
            key={notification.id}
            style={[
              styles.notificationCard,
              !notification.read && styles.unreadCard
            ]}
          >
            <Card.Content style={styles.cardContent}>
              <View style={styles.notificationHeader}>
                <MaterialCommunityIcons
                  name={getNotificationIcon(notification.type)}
                  size={24}
                  color="#6200ee"
                />
                {!notification.read && (
                  <IconButton
                    icon="check"
                    size={20}
                    onPress={() => handleMarkAsRead(notification.id)}
                    style={styles.markReadButton}
                  />
                )}
              </View>

              <View style={styles.notificationContent}>
                <Text variant="titleMedium" style={styles.notificationTitle}>
                  {notification.senderUserId && userDisplayNames[notification.senderUserId]
                    ? userDisplayNames[notification.senderUserId]
                    : 'Someone'}
                </Text>
                <Text variant="bodyMedium" style={styles.notificationText}>
                  {notification.content}
                </Text>
                <Text variant="bodySmall" style={styles.timestamp}>
                  {formatTimestamp(notification.timestamp)}
                  {notification.groupName && ` • ${notification.groupName}`}
                </Text>
              </View>
            </Card.Content>
          </Card>
        ))}

        {notifications.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="bell-off"
              size={48}
              color="#666"
            />
            <Text variant="bodyLarge" style={styles.emptyStateText}>
              No notifications yet
            </Text>
          </View>
        )}
      </ScrollView>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontWeight: 'bold',
  },
  markAllButton: {
    marginLeft: 8,
  },
  notificationCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  unreadCard: {
    backgroundColor: '#fff8e1',
  },
  cardContent: {
    flexDirection: 'row',
    padding: 12,
  },
  notificationHeader: {
    marginRight: 12,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  notificationText: {
    marginBottom: 4,
  },
  timestamp: {
    color: '#666',
  },
  markReadButton: {
    margin: 0,
    padding: 0,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyStateText: {
    marginTop: 16,
    color: '#666',
  },
});

export default NotificationsScreen; 