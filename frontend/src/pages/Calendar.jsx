import { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  ViewDay as DayIcon,
  ViewWeek as WeekIcon,
  CalendarViewMonth as MonthIcon,
  Add as AddIcon
} from '@mui/icons-material';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { db, auth } from '../firebase';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  getDocs,
  where,
  getDoc,
  doc
} from 'firebase/firestore';
import { notifyGroupMembers } from '../services/notificationService';
import { useSnackbar } from 'notistack';

const locales = {
  'en-US': require('date-fns/locale/en-US')
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales
});

export default function Calendar() {
  const theme = useTheme();
  const [view, setView] = useState('month');
  const [events, setEvents] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start: new Date(),
    end: new Date(new Date().getTime() + 60 * 60 * 1000), // Default 1 hour meeting
    allDay: false,
    groupId: '',
    description: ''
  });
  const [groups, setGroups] = useState([]);
  const { enqueueSnackbar } = useSnackbar();
  const currentUserId = auth.currentUser?.uid;

  // Fetch user's groups
  useEffect(() => {
    if (!currentUserId) return;

    const fetchGroups = async () => {
      try {
        const q = query(
          collection(db, 'groups'),
          where('members', 'array-contains', currentUserId)
        );
        const snapshot = await getDocs(q);
        const groupsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setGroups(groupsData);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    fetchGroups();
  }, [currentUserId]);

  // Fetch events from Firestore
  useEffect(() => {
    if (!currentUserId) return;

    const q = query(collection(db, 'events'), orderBy('start', 'asc'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const eventsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title,
          start: data.start?.toDate() || new Date(),
          end: data.end?.toDate() || new Date(),
          allDay: data.allDay || false,
          resource: data.groupName || '',
          groupId: data.groupId || '',
          description: data.description || '',
          createdBy: data.createdBy || ''
        };
      }).filter(event => {
        // Only show events for groups the user is a member of
        return groups.some(group => group.id === event.groupId);
      });
      
      setEvents(eventsData);
    });
    
    return () => unsubscribe();
  }, [currentUserId, groups]);

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const handleDialogOpen = () => {
    setOpenDialog(true);
  };

  const handleDialogClose = () => {
    setOpenDialog(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewEvent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDateChange = (name, value) => {
    setNewEvent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddEvent = async () => {
    if (!newEvent.title || !newEvent.groupId) {
      enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
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
        allDay: newEvent.allDay,
        groupId: newEvent.groupId,
        groupName,
        description: newEvent.description,
        createdBy: currentUserId,
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, 'events'), eventData);

      // Get the current user's name for the notification
      const userRef = doc(db, 'users', currentUserId);
      const userSnap = await getDoc(userRef);
      const userName = userSnap.exists() ? userSnap.data().displayName || 'Someone' : 'Someone';
      
      // Create notifications for all group members
      await notifyGroupMembers(
        newEvent.groupId,
        currentUserId,
        'meeting',
        `${userName} scheduled a new meeting: "${newEvent.title}" on ${format(newEvent.start, 'PPp')}`
      );

      enqueueSnackbar('Meeting scheduled successfully', { variant: 'success' });
      setOpenDialog(false);
      
      // Reset form
      setNewEvent({
        title: '',
        start: new Date(),
        end: new Date(new Date().getTime() + 60 * 60 * 1000),
        allDay: false,
        groupId: '',
        description: ''
      });
    } catch (error) {
      console.error('Error adding event:', error);
      enqueueSnackbar('Failed to schedule meeting', { variant: 'error' });
    }
  };

  const calendarStyle = {
    '.rbc-calendar': {
      backgroundColor: theme.palette.background.paper,
      color: theme.palette.text.primary,
    },
    '.rbc-toolbar button': {
      color: theme.palette.text.primary,
      '&:hover': {
        backgroundColor: theme.palette.action.hover,
      },
      '&.rbc-active': {
        backgroundColor: theme.palette.primary.main,
        color: theme.palette.mode === 'light' ? 'black' : 'white',
      },
    },
    '.rbc-month-view, .rbc-time-view': {
      backgroundColor: theme.palette.background.paper,
      border: `1px solid ${theme.palette.divider}`,
    },
    '.rbc-header': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.mode === 'light' ? 'black' : 'white',
      padding: '8px',
      fontWeight: 600,
    },
    '.rbc-date-cell': {
      padding: '4px',
      fontSize: '0.9rem',
    },
    '.rbc-today': {
      backgroundColor: theme.palette.mode === 'light' 
        ? 'rgba(255, 215, 0, 0.1)' 
        : 'rgba(184, 134, 11, 0.1)',
    },
    '.rbc-event': {
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.mode === 'light' ? 'black' : 'white',
      border: 'none',
      borderRadius: '4px',
      padding: '2px 4px',
    },
    '.rbc-off-range-bg': {
      backgroundColor: theme.palette.mode === 'light'
        ? 'rgba(0, 0, 0, 0.05)'
        : 'rgba(255, 255, 255, 0.05)',
    },
    '.rbc-time-content': {
      borderTop: `1px solid ${theme.palette.divider}`,
    },
    '.rbc-time-header-content': {
      borderLeft: `1px solid ${theme.palette.divider}`,
    },
    '.rbc-time-header': {
      backgroundColor: theme.palette.background.paper,
    },
    '.rbc-timeslot-group': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },
    '.rbc-day-slot .rbc-time-slot': {
      borderTop: `1px solid ${theme.palette.divider}`,
    }
  };

  return (
    <Box sx={{ 
      p: { xs: 1, sm: 2, md: 3 },
      width: '100%',
      overflowX: 'hidden'
    }}>
      <Paper sx={{ 
        p: { xs: 1, sm: 2, md: 3 }, 
        mb: 3,
        overflowX: 'auto'
      }}>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between', 
          alignItems: { xs: 'stretch', sm: 'center' },
          gap: { xs: 2, sm: 0 },
          mb: 3 
        }}>
          <Typography 
            variant="h5" 
            component="h1" 
            sx={{ 
              fontWeight: 600,
              fontSize: { xs: '1.25rem', sm: '1.5rem' }
            }}
          >
            Calendar
          </Typography>
          <Box sx={{ 
            display: 'flex', 
            gap: 2,
            flexDirection: { xs: 'column', sm: 'row' },
            width: { xs: '100%', sm: 'auto' }
          }}>
            <ToggleButtonGroup
              value={view}
              exclusive
              onChange={handleViewChange}
              aria-label="calendar view"
              size="small"
              sx={{
                display: 'flex',
                '& .MuiToggleButton-root': {
                  flex: { xs: 1, sm: 'initial' }
                }
              }}
            >
              <ToggleButton value="month" aria-label="month view">
                <MonthIcon />
              </ToggleButton>
              <ToggleButton value="week" aria-label="week view">
                <WeekIcon />
              </ToggleButton>
              <ToggleButton value="day" aria-label="day view">
                <DayIcon />
              </ToggleButton>
            </ToggleButtonGroup>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleDialogOpen}
              fullWidth={false}
              size="small"
              sx={{ width: { xs: '100%', sm: 'auto' } }}
            >
              Schedule Meeting
            </Button>
          </Box>
        </Box>

        <Box sx={{
          ...calendarStyle,
          '.rbc-calendar': {
            ...calendarStyle['.rbc-calendar'],
            minHeight: { xs: 500, sm: 600 },
            maxWidth: '100%',
            overflowX: 'auto'
          },
          '.rbc-toolbar': {
            flexWrap: 'wrap',
            gap: 1,
            mb: 2,
            justifyContent: { xs: 'center', sm: 'space-between' }
          },
          '.rbc-toolbar-label': {
            margin: { xs: '8px 0', sm: 0 }
          },
          '.rbc-header': {
            padding: { xs: '4px', sm: '8px' },
            fontSize: { xs: '0.75rem', sm: '0.9rem' }
          },
          '.rbc-date-cell': {
            padding: { xs: '2px', sm: '4px' },
            fontSize: { xs: '0.75rem', sm: '0.9rem' }
          },
          '.rbc-event': {
            padding: { xs: '1px 2px', sm: '2px 4px' },
            fontSize: { xs: '0.75rem', sm: '0.875rem' }
          }
        }}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            style={{ 
              height: 'calc(100vh - 250px)',
              minHeight: '500px',
              maxWidth: '100%'
            }}
            views={['month', 'week', 'day']}
            popup
            selectable
            toolbar={true}
            onSelectSlot={(slotInfo) => {
              setNewEvent(prev => ({
                ...prev,
                start: slotInfo.start,
                end: slotInfo.end,
                allDay: slotInfo.slots.length === 1
              }));
              handleDialogOpen();
            }}
            eventPropGetter={(event) => ({
              style: {
                backgroundColor: theme.palette.primary.main,
              }
            })}
          />
        </Box>
      </Paper>

      {/* Dialog for adding new events */}
      <Dialog open={openDialog} onClose={handleDialogClose} maxWidth="sm" fullWidth>
        <DialogTitle>Schedule a Meeting</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Meeting Title"
              name="title"
              value={newEvent.title}
              onChange={handleInputChange}
              fullWidth
              required
            />
            
            <FormControl fullWidth required>
              <InputLabel id="group-select-label">Study Group</InputLabel>
              <Select
                labelId="group-select-label"
                name="groupId"
                value={newEvent.groupId}
                onChange={handleInputChange}
                label="Study Group"
              >
                {groups.map(group => (
                  <MenuItem key={group.id} value={group.id}>
                    {group.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Description"
              name="description"
              value={newEvent.description}
              onChange={handleInputChange}
              fullWidth
              multiline
              rows={3}
            />
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Start Date & Time"
                type="datetime-local"
                value={format(newEvent.start, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => handleDateChange('start', new Date(e.target.value))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              
              <TextField
                label="End Date & Time"
                type="datetime-local"
                value={format(newEvent.end, "yyyy-MM-dd'T'HH:mm")}
                onChange={(e) => handleDateChange('end', new Date(e.target.value))}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDialogClose}>Cancel</Button>
          <Button 
            variant="contained" 
            onClick={handleAddEvent}
            disabled={!newEvent.title || !newEvent.groupId}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
