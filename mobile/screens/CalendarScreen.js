import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Text, Button, Dialog, Portal, TextInput, ActivityIndicator, Card, IconButton, Menu, Snackbar } from 'react-native-paper';
import { Calendar } from 'react-native-calendars';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../config/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDoc, doc, deleteDoc, updateDoc, getDocs } from 'firebase/firestore';
import { notifyGroupMembers } from '../services/notificationService';
import { format } from 'date-fns';

const CalendarScreen = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [showEventDialog, setShowEventDialog] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [creatorName, setCreatorName] = useState('');

  const [newEvent, setNewEvent] = useState({
    title: '',
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000),
    groupId: '',
    description: '',
    link: ''
  });

  // Helper function to normalize date to start of day
  const normalizeDate = (date) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  // Helper function to check if two dates are the same day
  const isSameDay = (date1, date2) => {
    const d1 = normalizeDate(date1);
    const d2 = normalizeDate(date2);
    return d1.getTime() === d2.getTime();
  };

  // Fetch user's groups
  useEffect(() => {
    if (!currentUser) return;

    const fetchGroups = async () => {
      try {
        const q = query(
          collection(db, 'groups'),
          where('members', 'array-contains', currentUser.uid)
        );
        const snapshot = await getDocs(q);
        const groupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGroups(groupsData);
      } catch (error) {
        console.error('Error fetching groups:', error);
        setError('Failed to load groups');
        setShowError(true);
      }
    };

    fetchGroups();
  }, [currentUser]);

  // Fetch events
  useEffect(() => {
    if (!currentUser) return;

    const q = query(collection(db, 'events'), orderBy('start', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          start: data.start?.toDate() || new Date(),
          end: data.end?.toDate() || new Date(),
          groupId: data.groupId || '',
          groupName: data.groupName || '',
          description: data.description || '',
          createdBy: data.createdBy || '',
          link: data.link || ''
        };
      }).filter(event => {
        // Only show events for groups the user is a member of
        return groups.some(group => group.id === event.groupId);
      });
      
      setEvents(eventsData);
      setLoading(false);
    });
    
    return () => unsubscribe();
  }, [currentUser, groups]);

  const handleDateSelect = (date) => {
    // Create a new date object from the selected date
    const clickedDate = new Date(date.timestamp);
    setSelectedDate(clickedDate);
    
    // Find events for the selected date
    const eventsForDate = events.filter(event => isSameDay(event.start, clickedDate));

    if (eventsForDate.length > 0) {
      // If there are events, show the first one
      setSelectedEvent(eventsForDate[0]);
      setEditMode(false);
      setShowEventDialog(true);
      
      // Fetch creator's name
      const fetchCreatorName = async () => {
        try {
          const userRef = doc(db, 'users', eventsForDate[0].createdBy);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setCreatorName(userSnap.data().displayName || 'Unknown User');
          } else {
            setCreatorName('Unknown User');
          }
        } catch (error) {
          console.error('Error fetching creator name:', error);
          setCreatorName('Unknown User');
        }
      };
      
      fetchCreatorName();
    } else {
      // If no events, create a new one
      setSelectedEvent(null);
      setNewEvent(prev => ({
        ...prev,
        start: clickedDate,
        end: new Date(clickedDate.getTime() + 60 * 60 * 1000)
      }));
      setShowEventDialog(true);
    }
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.groupId) {
      setError('Please fill in all required fields');
      setShowError(true);
      return;
    }

    try {
      // Find the group name
      const selectedGroup = groups.find(group => group.id === newEvent.groupId);
      const groupName = selectedGroup ? selectedGroup.name : 'Unknown Group';

      // Add the event to Firestore
      const eventData = {
        title: newEvent.title,
        start: newEvent.start,
        end: newEvent.end,
        groupId: newEvent.groupId,
        groupName,
        description: newEvent.description,
        link: newEvent.link,
        createdBy: currentUser.uid,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'events'), eventData);

      // Get the current user's name for the notification
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data().displayName || 'Someone' : 'Someone';
      
      // Create notifications for all group members
      await notifyGroupMembers(
        newEvent.groupId,
        currentUser.uid,
        'meeting',
        `${userName} scheduled a new meeting: "${newEvent.title}" on ${format(newEvent.start, 'PPp')}`
      );

      setShowEventDialog(false);
      setNewEvent({
        title: '',
        start: new Date(),
        end: new Date(new Date().getTime() + 60 * 60 * 1000),
        groupId: '',
        description: '',
        link: ''
      });
    } catch (error) {
      console.error('Error adding event:', error);
      setError('Failed to schedule meeting');
      setShowError(true);
    }
  };

  const handleDeleteEvent = async () => {
    if (!selectedEvent) return;

    try {
      const eventRef = doc(db, 'events', selectedEvent.id);
      await deleteDoc(eventRef);
      setShowEventDialog(false);
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      setError('Failed to delete event');
      setShowError(true);
    }
  };

  const handleEditEvent = async () => {
    if (!selectedEvent) return;

    try {
      const eventRef = doc(db, 'events', selectedEvent.id);
      await updateDoc(eventRef, {
        title: selectedEvent.title,
        description: selectedEvent.description,
        start: selectedEvent.start,
        end: selectedEvent.end,
        link: selectedEvent.link
      });
      setEditMode(false);
    } catch (error) {
      console.error('Error updating event:', error);
      setError('Failed to update event');
      setShowError(true);
    }
  };

  const renderEventDialog = () => (
    <Portal>
      <Dialog visible={showEventDialog} onDismiss={() => {
        setShowEventDialog(false);
        setSelectedEvent(null);
        setEditMode(false);
      }}>
        <Dialog.Title>
          {selectedEvent ? (editMode ? 'Edit Event' : 'Event Details') : 'Schedule Meeting'}
        </Dialog.Title>
        <Dialog.Content>
          {selectedEvent && !editMode ? (
            <View>
              <Text variant="titleMedium" style={styles.eventTitle}>{selectedEvent.title}</Text>
              <Text variant="bodyMedium" style={styles.eventDetail}>Created by: {creatorName}</Text>
              <Text variant="bodyMedium" style={styles.eventDetail}>Group: {selectedEvent.groupName}</Text>
              <Text variant="bodyMedium" style={styles.eventDetail}>
                Start: {format(selectedEvent.start, 'PPp')}
              </Text>
              <Text variant="bodyMedium" style={styles.eventDetail}>
                End: {format(selectedEvent.end, 'PPp')}
              </Text>
              {selectedEvent.description && (
                <Text variant="bodyMedium" style={styles.eventDescription}>
                  {selectedEvent.description}
                </Text>
              )}
              {selectedEvent.link && (
                <Button
                  mode="contained"
                  onPress={() => Linking.openURL(selectedEvent.link)}
                  style={styles.linkButton}
                >
                  Join Meeting
                </Button>
              )}
            </View>
          ) : (
            <View>
              <TextInput
                label="Title"
                value={selectedEvent ? selectedEvent.title : newEvent.title}
                onChangeText={(text) => 
                  selectedEvent 
                    ? setSelectedEvent(prev => ({ ...prev, title: text }))
                    : setNewEvent(prev => ({ ...prev, title: text }))
                }
                style={styles.input}
              />
              
              {!selectedEvent && (
                <View style={styles.groupSelector}>
                  <Text variant="bodyMedium">Select Group:</Text>
                  {groups.map(group => (
                    <Button
                      key={group.id}
                      mode={newEvent.groupId === group.id ? "contained" : "outlined"}
                      onPress={() => setNewEvent(prev => ({ ...prev, groupId: group.id }))}
                      style={styles.groupButton}
                    >
                      {group.name}
                    </Button>
                  ))}
                </View>
              )}
              
              <TextInput
                label="Description"
                value={selectedEvent ? selectedEvent.description : newEvent.description}
                onChangeText={(text) =>
                  selectedEvent
                    ? setSelectedEvent(prev => ({ ...prev, description: text }))
                    : setNewEvent(prev => ({ ...prev, description: text }))
                }
                multiline
                style={styles.input}
              />

              <TextInput
                label="Meeting Link (optional)"
                value={selectedEvent ? selectedEvent.link : newEvent.link}
                onChangeText={(text) =>
                  selectedEvent
                    ? setSelectedEvent(prev => ({ ...prev, link: text }))
                    : setNewEvent(prev => ({ ...prev, link: text }))
                }
                style={styles.input}
              />

              {!selectedEvent && (
                <View style={styles.dateTimeContainer}>
                  <Text variant="bodyMedium">Selected Date: {format(newEvent.start, 'PP')}</Text>
                  <Text variant="bodyMedium">Selected Time: {format(newEvent.start, 'p')}</Text>
                </View>
              )}
            </View>
          )}
        </Dialog.Content>
        <Dialog.Actions>
          {selectedEvent ? (
            editMode ? (
              <>
                <Button onPress={() => setEditMode(false)}>Cancel</Button>
                <Button onPress={handleEditEvent}>Save</Button>
              </>
            ) : (
              <>
                <Button onPress={() => setShowEventDialog(false)}>Close</Button>
                <Button onPress={() => setEditMode(true)}>Edit</Button>
                <Button onPress={handleDeleteEvent}>Delete</Button>
              </>
            )
          ) : (
            <>
              <Button onPress={() => setShowEventDialog(false)}>Cancel</Button>
              <Button onPress={handleAddEvent}>Schedule</Button>
            </>
          )}
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  // Convert events to the format required by react-native-calendars
  const markedDates = events.reduce((acc, event) => {
    const date = format(normalizeDate(event.start), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = {
        marked: true,
        dotColor: '#6200ee',
        selected: true,
        selectedColor: '#6200ee'
      };
    }
    return acc;
  }, {});

  return (
    <View style={styles.container}>
      <Calendar
        onDayPress={handleDateSelect}
        markedDates={markedDates}
        theme={{
          todayTextColor: '#6200ee',
          selectedDayBackgroundColor: '#6200ee',
          arrowColor: '#6200ee',
          dotColor: '#6200ee',
          selectedDotColor: '#ffffff'
        }}
      />

      <ScrollView style={styles.eventsList}>
        <Text variant="titleLarge" style={styles.sectionTitle}>Upcoming Events</Text>
        {events
          .filter(event => event.start >= new Date())
          .sort((a, b) => a.start - b.start)
          .map(event => (
            <Card
              key={event.id}
              style={styles.eventCard}
              onPress={() => {
                setSelectedEvent(event);
                setEditMode(false);
                setShowEventDialog(true);
                // Fetch creator's name
                const fetchCreatorName = async () => {
                  try {
                    const userRef = doc(db, 'users', event.createdBy);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                      setCreatorName(userSnap.data().displayName || 'Unknown User');
                    } else {
                      setCreatorName('Unknown User');
                    }
                  } catch (error) {
                    console.error('Error fetching creator name:', error);
                    setCreatorName('Unknown User');
                  }
                };
                fetchCreatorName();
              }}
            >
              <Card.Content>
                <Text variant="titleMedium">{event.title}</Text>
                <Text variant="bodyMedium">{event.groupName}</Text>
                <Text variant="bodySmall">
                  {format(event.start, 'PPp')}
                </Text>
                {event.description && (
                  <Text variant="bodySmall" numberOfLines={2}>
                    {event.description}
                  </Text>
                )}
              </Card.Content>
            </Card>
          ))}
      </ScrollView>

      {renderEventDialog()}

      <Snackbar
        visible={showError}
        onDismiss={() => setShowError(false)}
        duration={3000}
      >
        {error}
      </Snackbar>
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
  eventsList: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  eventCard: {
    marginBottom: 8,
  },
  input: {
    marginBottom: 16,
  },
  linkButton: {
    marginTop: 8,
  },
  dateTimeContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
  },
  eventTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  eventDetail: {
    marginBottom: 4,
  },
  eventDescription: {
    marginTop: 8,
    marginBottom: 8,
  },
  linkButton: {
    marginTop: 16,
  },
  groupSelector: {
    marginVertical: 16,
  },
  groupButton: {
    marginVertical: 4,
  },
});

export default CalendarScreen; 