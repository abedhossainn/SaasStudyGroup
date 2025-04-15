import { useState, useEffect } from 'react';
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
  Stack,
  Alert,
  Snackbar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  TextField
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';
import { getPushNotificationSettings, updatePushNotificationSettings } from '../services/userPreferenceService';
import { getUserData, deleteUserAccount } from '../services/userAccountService';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
  const { currentUser } = useAuth();
  const { mode, toggleTheme } = useThemeContext();
  const navigate = useNavigate();
  
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
  
  // Add loading state
  const [setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // State for authentication
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  
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

  // Fetch current push notification settings when component loads
  useEffect(() => {
    const fetchSettings = async () => {
      if (currentUser?.uid) {
        try {
          const notificationsEnabled = await getPushNotificationSettings(currentUser.uid);
          setSettings(prev => ({
            ...prev,
            pushNotifications: notificationsEnabled
          }));
        } catch (error) {
          console.error('Error fetching push notification settings:', error);
          setSnackbar({
            open: true,
            message: 'Error loading notification settings',
            severity: 'error'
          });
        }
      }
    };
    
    fetchSettings();
  }, [currentUser]);

  const handleSettingChange = (setting) => async (event) => {
    const newValue = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    
    setSettings(prev => ({
      ...prev,
      [setting]: newValue
    }));
    
    // For push notifications, save immediately when toggled
    if (setting === 'pushNotifications' && currentUser?.uid) {
      try {
        setLoading(true);
        await updatePushNotificationSettings(currentUser.uid, newValue);
        setSnackbar({
          open: true,
          message: `Push notifications ${newValue ? 'enabled' : 'disabled'}`,
          severity: 'success'
        });
      } catch (error) {
        console.error('Error updating push notification setting:', error);
        // Revert the setting if it failed
        setSettings(prev => ({
          ...prev,
          [setting]: !newValue
        }));
        setSnackbar({
          open: true,
          message: 'Failed to update push notification setting',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };
  
  const handleDeleteAccount = () => {
    setConfirmDialog({
      open: true,
      title: 'Delete Account',
      message: 'This action cannot be undone. All your data will be permanently deleted. Are you sure you want to proceed?',
      action: 'delete'
    });
  };
  
  const handleConfirmAction = async () => {
    if (confirmDialog.action === 'delete') {
      if (!password) {
        setPasswordError('Password is required to delete account');
        return;
      }
      setDeleteLoading(true);
      try {
        await deleteUserAccount(currentUser.uid, password);
        setSnackbar({
          open: true,
          message: 'Account deleted successfully',
          severity: 'success'
        });
        
        // Navigate to login page without calling logout first
        // This avoids the error when trying to access currentUser.uid after deletion
        navigate('/login');
      } catch (error) {
        console.error('Error deleting account:', error);
        setSnackbar({
          open: true,
          message: 'Failed to delete account: ' + error.message,
          severity: 'error'
        });
      } finally {
        setDeleteLoading(false);
      }
    }
    setConfirmDialog({ ...confirmDialog, open: false });
  };

  const handleDownloadData = async () => {
    if (!currentUser?.uid) {
      setSnackbar({
        open: true,
        message: 'You must be logged in to download your data',
        severity: 'error'
      });
      return;
    }
    
    setDataLoading(true);
    
    try {
      // Fetch all user data
      const userData = await getUserData(currentUser.uid);
      
      // Convert to JSON and create downloadable file
      const dataStr = JSON.stringify(userData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      // Create a download link and trigger the download
      const downloadLink = document.createElement('a');
      downloadLink.href = url;
      downloadLink.download = `study_group_data_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      
      setSnackbar({
        open: true,
        message: 'Your data has been downloaded successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error downloading user data:', error);
      setSnackbar({
        open: true,
        message: 'Failed to download your data: ' + error.message,
        severity: 'error'
      });
    } finally {
      setDataLoading(false);
    }
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
    }
    // Preferences section commented out
    /*
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
    */
  ];

  return (
    <Box 
      sx={{ 
        p: { xs: 1.5, sm: 2, md: 3 },
        maxWidth: '100%',
        overflowX: 'hidden'
      }}
    >
      {/* Header */}
      <Box sx={{ mb: { xs: 2, sm: 3, md: 4 } }}>
        <Typography 
          variant="h4" 
          gutterBottom 
          sx={{ 
            fontSize: { xs: '1.25rem', sm: '1.5rem', md: '2.125rem' },
            wordBreak: 'break-word'
          }}
        >
          Settings
        </Typography>
        <Typography 
          variant="body1" 
          color="text.secondary" 
          sx={{ 
            fontSize: { xs: '0.813rem', sm: '0.875rem', md: '1rem' },
            wordBreak: 'break-word'
          }}
        >
          Manage your account settings and preferences
        </Typography>
      </Box>

      {/* Settings Sections */}
      <Stack 
        spacing={{ xs: 1.5, sm: 2, md: 3 }} 
        sx={{ 
          maxWidth: { xs: '100%', sm: '600px', md: '800px' }, 
          mx: 'auto',
          '& .MuiPaper-root': {
            width: '100%'
          }
        }}
      >
        {settingSections.map((section) => (
          <Paper 
            key={section.title} 
            sx={{ 
              p: { xs: 1.5, sm: 2, md: 3 }, 
              borderRadius: { xs: 1, sm: 2 },
              width: '100%'
            }}
          >
            <Typography 
              variant="h6" 
              gutterBottom 
              color="primary" 
              sx={{ 
                fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
                wordBreak: 'break-word'
              }}
            >
              {section.title}
            </Typography>
            <List disablePadding>
              {section.settings.map((setting, index) => (
                <Box key={setting.name}>
                  {index > 0 && <Divider />}
                  <ListItem 
                    sx={{ 
                      px: { xs: 0.5, sm: 1, md: 1.5 }, 
                      py: { xs: 1.5, sm: 2 },
                      flexDirection: { xs: 'column', sm: 'row' },
                      alignItems: { xs: 'flex-start', sm: 'center' },
                      gap: { xs: 0.5, sm: 1 },
                      position: 'relative'
                    }}
                  >
                    {setting.type === 'switch' || setting.type === 'theme-switch' ? (
                      <>
                        <ListItemText
                          primary={setting.label}
                          secondary={setting.description}
                          primaryTypographyProps={{
                            fontWeight: 500,
                            fontSize: { xs: '0.938rem', sm: '1rem' },
                            mb: { xs: 0.25, sm: 0.5 },
                            wordBreak: 'break-word'
                          }}
                          secondaryTypographyProps={{
                            fontSize: { xs: '0.75rem', sm: '0.813rem' },
                            wordBreak: 'break-word',
                            pr: { sm: 8 }
                          }}
                          sx={{
                            m: 0,
                            flex: 1,
                            width: '100%',
                            maxWidth: { sm: 'calc(100% - 58px)' }
                          }}
                        />
                        <ListItemSecondaryAction 
                          sx={{ 
                            right: { xs: '8px', sm: '16px' },
                            top: { xs: 'auto', sm: '50%' },
                            transform: { xs: 'none', sm: 'translateY(-50%)' },
                            position: { xs: 'relative', sm: 'absolute' },
                            mt: { xs: 1, sm: 0 }
                          }}
                        >
                          <Switch
                            edge="end"
                            checked={setting.type === 'theme-switch' ? mode === 'dark' : settings[setting.name]}
                            onChange={setting.type === 'theme-switch' ? toggleTheme : handleSettingChange(setting.name)}
                            color="primary"
                            size={window.innerWidth < 600 ? "small" : "medium"}
                            inputProps={{ 'aria-label': `Toggle ${setting.label}` }}
                          />
                        </ListItemSecondaryAction>
                      </>
                    ) : setting.type === 'info' ? (
                      <ListItemText
                        primary={setting.label}
                        secondary={setting.description}
                        primaryTypographyProps={{
                          fontWeight: 500,
                          fontSize: { xs: '0.938rem', sm: '1rem' },
                          mb: { xs: 0.25, sm: 0.5 },
                          wordBreak: 'break-word'
                        }}
                        secondaryTypographyProps={{
                          fontSize: { xs: '0.75rem', sm: '0.813rem' },
                          wordBreak: 'break-word'
                        }}
                        sx={{
                          m: 0,
                          flex: 1
                        }}
                      />
                    ) : null}
                  </ListItem>
                </Box>
              ))}
            </List>
          </Paper>
        ))}

        {/* Data Management Section */}
        <Paper 
          sx={{ 
            p: { xs: 1.5, sm: 2, md: 3 }, 
            borderRadius: { xs: 1, sm: 2 }
          }}
        >
          <Typography 
            variant="h6" 
            gutterBottom 
            color="primary" 
            sx={{ 
              fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
              wordBreak: 'break-word'
            }}
          >
            Data Management
          </Typography>
          <Stack spacing={{ xs: 1, sm: 1.5, md: 2 }} sx={{ mt: { xs: 1.5, sm: 2 } }}>
            <Button 
              variant="outlined" 
              color="success"
              aria-label="Download your data"
              onClick={handleDownloadData}
              sx={{ 
                py: { xs: 0.75, sm: 1, md: 1.5 },
                fontSize: { xs: '0.813rem', sm: '0.875rem', md: '1rem' }
              }}
            >
              {dataLoading ? <CircularProgress size={24} color="success" /> : 'Download Your Data'}
            </Button>
            <Button 
              variant="outlined" 
              color="error"
              onClick={handleDeleteAccount}
              aria-label="Delete your account"
              sx={{ 
                py: { xs: 0.75, sm: 1, md: 1.5 },
                fontSize: { xs: '0.813rem', sm: '0.875rem', md: '1rem' }
              }}
            >
              Delete Account
            </Button>
          </Stack>
        </Paper>
      </Stack>
      
      {/* Feedback Snackbar */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={6000} 
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        sx={{ bottom: { xs: 16, sm: 24 } }}
      >
        <Alert 
          onClose={() => setSnackbar({ ...snackbar, open: false })} 
          severity={snackbar.severity}
          sx={{ 
            width: '100%',
            fontSize: { xs: '0.875rem', md: '1rem' }
          }}
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
        sx={{
          '& .MuiDialog-paper': {
            width: { xs: '90%', sm: 'auto' },
            m: { xs: 2, sm: 3 }
          }
        }}
      >
        <DialogTitle 
          id="confirm-dialog-title"
          sx={{ fontSize: { xs: '1.1rem', md: '1.25rem' } }}
        >
          {confirmDialog.title}
        </DialogTitle>
        <DialogContent>
          <DialogContentText 
            id="confirm-dialog-description"
            sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
          >
            {confirmDialog.message}
          </DialogContentText>
          {confirmDialog.action === 'delete' && (
            <TextField
              label="Password"
              type="password"
              fullWidth
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={!!passwordError}
              helperText={passwordError}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: { xs: 2, md: 3 } }}>
          <Button 
            onClick={() => setConfirmDialog({ ...confirmDialog, open: false })} 
            color="primary"
            sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConfirmAction} 
            color="error" 
            autoFocus
            disabled={deleteLoading}
            sx={{ fontSize: { xs: '0.875rem', md: '1rem' } }}
          >
            {deleteLoading ? <CircularProgress size={24} /> : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
