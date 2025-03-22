import { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Switch,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Button,
  FormControlLabel,
  Select,
  MenuItem,
  Stack
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

export default function Settings() {
  const { currentUser } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    darkMode: false,
    language: 'en',
    timeZone: 'UTC',
    calendarView: 'month'
  });

  const handleSettingChange = (setting) => (event) => {
    setSettings(prev => ({
      ...prev,
      [setting]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
    }));
  };

  const settingSections = [
    {
      title: 'Account',
      settings: [
        {
          name: 'email',
          label: 'Email',
          description: currentUser?.email || 'No email set',
          type: 'info'
        }
      ]
    },
    {
      title: 'Notifications',
      settings: [
        {
          name: 'emailNotifications',
          label: 'Email Notifications',
          description: 'Receive updates via email',
          type: 'switch'
        },
        {
          name: 'pushNotifications',
          label: 'Push Notifications',
          description: 'Receive updates via browser notifications',
          type: 'switch'
        }
      ]
    },
    {
      title: 'Appearance',
      settings: [
        {
          name: 'darkMode',
          label: 'Dark Mode',
          description: 'Use dark theme',
          type: 'switch'
        }
      ]
    },
    {
      title: 'Preferences',
      settings: [
        {
          name: 'language',
          label: 'Language',
          type: 'select',
          options: [
            { value: 'en', label: 'English' },
            { value: 'es', label: 'Spanish' },
            { value: 'fr', label: 'French' }
          ]
        },
        {
          name: 'timeZone',
          label: 'Time Zone',
          type: 'select',
          options: [
            { value: 'UTC', label: 'UTC' },
            { value: 'EST', label: 'Eastern Time' },
            { value: 'PST', label: 'Pacific Time' }
          ]
        },
        {
          name: 'calendarView',
          label: 'Default Calendar View',
          type: 'select',
          options: [
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
            { value: 'day', label: 'Day' }
          ]
        }
      ]
    }
  ];

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your account settings and preferences
        </Typography>
      </Box>

      {/* Settings Sections */}
      <Stack spacing={3} sx={{ maxWidth: 800, mx: 'auto' }}>
        {settingSections.map((section) => (
          <Paper key={section.title} sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom color="primary">
              {section.title}
            </Typography>
            <List disablePadding>
              {section.settings.map((setting, index) => (
                <Box key={setting.name}>
                  {index > 0 && <Divider />}
                  <ListItem sx={{ px: 0 }}>
                    {setting.type === 'switch' ? (
                      <>
                        <ListItemText
                          primary={setting.label}
                          secondary={setting.description}
                          primaryTypographyProps={{
                            fontWeight: 500
                          }}
                        />
                        <ListItemSecondaryAction>
                          <Switch
                            edge="end"
                            checked={settings[setting.name]}
                            onChange={handleSettingChange(setting.name)}
                            color="primary"
                          />
                        </ListItemSecondaryAction>
                      </>
                    ) : setting.type === 'select' ? (
                      <FormControlLabel
                        control={
                          <Select
                            size="small"
                            value={settings[setting.name]}
                            onChange={handleSettingChange(setting.name)}
                            sx={{ minWidth: 120, ml: 2 }}
                          >
                            {setting.options.map((option) => (
                              <MenuItem key={option.value} value={option.value}>
                                {option.label}
                              </MenuItem>
                            ))}
                          </Select>
                        }
                        label={setting.label}
                        labelPlacement="start"
                        sx={{
                          mx: 0,
                          width: '100%',
                          justifyContent: 'space-between'
                        }}
                      />
                    ) : setting.type === 'info' ? (
                      <>
                        <ListItemText
                          primary={setting.label}
                          secondary={setting.description}
                          primaryTypographyProps={{
                            fontWeight: 500
                          }}
                        />
                      </>
                    ) : null}
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        ))}

        {/* Action Buttons */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button
            variant="contained"
            onClick={() => {
              // Save settings
              console.log('Saving settings:', settings);
            }}
            fullWidth
            sx={{
              py: 1.5,
              fontSize: '1rem'
            }}
          >
            Save Changes
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              // Reset settings
              setSettings({
                emailNotifications: true,
                pushNotifications: false,
                darkMode: false,
                language: 'en',
                timeZone: 'UTC',
                calendarView: 'month'
              });
            }}
            fullWidth
            sx={{
              py: 1.5,
              fontSize: '1rem'
            }}
          >
            Reset to Default
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
