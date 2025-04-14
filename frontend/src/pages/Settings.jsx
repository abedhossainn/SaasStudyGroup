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
  Stack,
  Alert,
  Snackbar,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';

export default function Settings() {
  const { currentUser } = useAuth();
  const { mode, toggleTheme } = useThemeContext();
  
  const [settings, setSettings] = useState({
    pushNotifications: false,
    language: 'en',
    timeZone: 'UTC',
    calendarView: 'month',
    sessionTimeout: '30m',
    enableStudyTimer: false,
    twoFactorAuth: false,
    autoLogout: false
  });
  
  // State for feedback messages
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });
  
  // State for confirmation dialog
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    title: '',
    message: '',
    action: null
  });

  const handleSettingChange = (setting) => (event) => {
    setSettings(prev => ({
      ...prev,
      [setting]: event.target.type === 'checkbox' ? event.target.checked : event.target.value
    }));
  };
  
  const handleSaveSettings = () => {
    // Here you would add the API call to save settings to the backend
    console.log('Saving settings:', settings);
    setSnackbar({
      open: true,
      message: 'Settings saved successfully!',
      severity: 'success'
    });
  };
  
  const handleDeleteAccount = () => {
    setConfirmDialog({
      open: true,
      title: 'Delete Account',
      message: 'This action cannot be undone. All your data will be permanently deleted. Are you sure you want to proceed?',
      action: 'delete'
    });
  };
  
  const handleConfirmAction = () => {
    if (confirmDialog.action === 'delete') {
      // API call to delete account would go here
      console.log('Account deletion requested');
      setSnackbar({
        open: true,
        message: 'Account deletion process initiated. You will receive a confirmation email.',
        severity: 'info'
      });
    }
    setConfirmDialog({ ...confirmDialog, open: false });
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
        },
        {
          name: 'username',
          label: 'Username',
          description: currentUser?.displayName || 'No username set',
          type: 'info'
        }
      ]
    },
    {
      title: 'Appearance',
      settings: [
        {
          name: 'darkMode',
          label: 'Dark Mode',
          description: 'Use dark theme to reduce eye strain in low light conditions',
          type: 'theme-switch'
        }
      ]
    },
    {
      title: 'Notifications',
      settings: [
        {
          name: 'pushNotifications',
          label: 'Push Notifications',
          description: 'Get real-time alerts for messages and group updates',
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
            { value: 'fr', label: 'French' },
            { value: 'de', label: 'German' },
            { value: 'zh', label: 'Chinese' }
          ]
        },
        {
          name: 'timeZone',
          label: 'Time Zone',
          type: 'select',
          options: [
            { value: 'UTC', label: 'UTC' },
            { value: 'EST', label: 'Eastern Time (ET)' },
            { value: 'CST', label: 'Central Time (CT)' },
            { value: 'MST', label: 'Mountain Time (MT)' },
            { value: 'PST', label: 'Pacific Time (PT)' },
            { value: 'GMT', label: 'Greenwich Mean Time (GMT)' }
          ]
        },
        {
          name: 'calendarView',
          label: 'Default Calendar View',
          type: 'select',
          options: [
            { value: 'month', label: 'Month' },
            { value: 'week', label: 'Week' },
            { value: 'day', label: 'Day' },
            { value: 'agenda', label: 'Agenda' }
          ]
        }
      ]
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
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
          <Paper key={section.title} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
            <Typography variant="h6" gutterBottom color="primary">
              {section.title}
            </Typography>
            <List disablePadding>
              {section.settings.map((setting, index) => (
                <Box key={setting.name}>
                  {index > 0 && <Divider />}
                  <ListItem sx={{ px: 0, py: 1.5 }}>
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
                            inputProps={{ 'aria-label': `Toggle ${setting.label}` }}
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
                            sx={{ minWidth: 150, ml: 2 }}
                            aria-label={`Select ${setting.label}`}
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
                    ) : setting.type === 'theme-switch' ? (
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
                            checked={mode === 'dark'}
                            onChange={toggleTheme}
                            color="primary"
                            inputProps={{ 'aria-label': `Toggle ${setting.label}` }}
                          />
                        </ListItemSecondaryAction>
                      </>
                    ) : null}
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        ))}

        {/* Data Management Section */}
        <Paper sx={{ p: { xs: 2, md: 3 }, borderRadius: 2 }}>
          <Typography variant="h6" gutterBottom color="primary">
            Data Management
          </Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Button 
              variant="outlined" 
              color="primary"
              aria-label="Download your data"
            >
              Download Your Data
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              onClick={handleDeleteAccount}
              aria-label="Delete your account"
            >
              Delete Account
            </Button>
          </Stack>
        </Paper>

        {/* Action Buttons */}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={handleSaveSettings}
            fullWidth
            sx={{
              py: 1.5,
              fontSize: '1rem'
            }}
            aria-label="Save changes"
          >
            Save Changes
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              // Reset settings
              setSettings({
                pushNotifications: false,
                language: 'en',
                timeZone: 'UTC',
                calendarView: 'month',
                sessionTimeout: '30m',
                enableStudyTimer: false,
                twoFactorAuth: false,
                autoLogout: false
              });
              setSnackbar({
                open: true,
                message: 'Settings reset to default',
                severity: 'info'
              });
            }}
            fullWidth
            sx={{
              py: 1.5,
              fontSize: '1rem'
            }}
            aria-label="Reset to default settings"
          >
            Reset to Default
          </Button>
        </Stack>
      </Stack>
      
      {/* Feedback Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      
      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ ...confirmDialog, open: false })}
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-description"
      >
        <DialogTitle id="confirm-dialog-title">{confirmDialog.title}</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-dialog-description">
            {confirmDialog.message}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} color="primary">
            Cancel
          </Button>
          <Button onClick={handleConfirmAction} color="error" autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
