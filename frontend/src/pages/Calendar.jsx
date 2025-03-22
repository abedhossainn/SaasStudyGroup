import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  ToggleButton,
  ToggleButtonGroup,
  useTheme
} from '@mui/material';
import {
  ViewDay as DayIcon,
  ViewWeek as WeekIcon,
  CalendarViewMonth as MonthIcon
} from '@mui/icons-material';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { mockApi } from '../services/mockApi';

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
  const [events] = useState([
    {
      title: 'Math Study Session',
      start: new Date(2025, 2, 20, 10, 0),
      end: new Date(2025, 2, 20, 12, 0),
      allDay: false,
      resource: 'Study Group A'
    },
    {
      title: 'Physics Group Meeting',
      start: new Date(2025, 2, 22, 14, 0),
      end: new Date(2025, 2, 22, 16, 0),
      allDay: false,
      resource: 'Study Group B'
    }
  ]);

  const handleViewChange = (event, newView) => {
    if (newView !== null) {
      setView(newView);
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
    <Box sx={{ p: 3 }}>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 600 }}>
            Calendar
          </Typography>
          <ToggleButtonGroup
            value={view}
            exclusive
            onChange={handleViewChange}
            aria-label="calendar view"
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
        </Box>

        <Box sx={calendarStyle}>
          <BigCalendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            style={{ height: 'calc(100vh - 250px)' }}
            views={['month', 'week', 'day']}
            popup
            selectable
            toolbar={true}
          />
        </Box>
      </Paper>
    </Box>
  );
}
