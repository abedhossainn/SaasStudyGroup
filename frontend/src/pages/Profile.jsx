import { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Avatar,
  Paper,
  Grid,
  IconButton,
  Divider,
  useTheme,
  CircularProgress,
  Snackbar,
  Alert
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateProfile } from '../services/profileService';
import { getGroups } from '../services/groupService';
import { uploadFileToCloudinary } from '../services/fileService';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [joinedGroups, setJoinedGroups] = useState([]);
  const [editForm, setEditForm] = useState({
    name: '',
    bio: '',
    avatar: null
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  useEffect(() => {
    if (currentUser?.uid) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchProfile = async () => {
    try {
      const profileData = await getUserProfile(currentUser.uid);
      // Use the profile name if it exists, otherwise use the currentUser's displayName
      const displayName = profileData?.name || currentUser?.displayName || '';
      
      setProfile({
        ...profileData,
        name: displayName // Ensure the profile always has a name
      });
      
      setEditForm({
        name: displayName,
        bio: profileData?.bio || '',
        avatar: profileData?.avatar || null
      });
      setPreviewImage(profileData?.avatar || null);

      // Fetch joined groups
      const groups = await getGroups();
      const userGroups = groups.filter(group => 
        group.members.some(member => member.id === currentUser.uid)
      );
      setJoinedGroups(userGroups);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setSnackbar({
        open: true,
        message: 'Error loading profile',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setEditForm({
      name: profile?.name || '',
      bio: profile?.bio || '',
      avatar: profile?.avatar || null
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setPreviewImage(profile?.avatar || null);
  };

  const handleImageChange = async (event) => {
    const file = event.target.files[0];
    if (file) {
      try {
        setSaving(true);
        const imageUrl = await uploadFileToCloudinary(file);
        setEditForm(prev => ({ ...prev, avatar: imageUrl }));
        setPreviewImage(imageUrl);
      } catch (error) {
        console.error('Error uploading image:', error);
        setSnackbar({
          open: true,
          message: 'Error uploading image',
          severity: 'error'
        });
      } finally {
        setSaving(false);
      }
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedProfile = await updateProfile(currentUser.uid, {
        ...editForm,
        avatar: editForm.avatar || profile?.avatar || null
      });
      updatedProfile.email = profile?.email || "";
      setProfile(updatedProfile);
      setEditing(false);
      setSnackbar({
        open: true,
        message: 'Profile updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      setSnackbar({
        open: true,
        message: 'Error updating profile',
        severity: 'error'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleGroupClick = (groupId) => {
    navigate(`/group/${groupId}`);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!currentUser) {
    return (
      <Box textAlign="center" p={4}>
        <Typography variant="h5">Please log in to view your profile</Typography>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
      <Paper sx={{ p: { xs: 2, md: 4 }, borderRadius: 2 }}>
        <Grid container spacing={{ xs: 2, md: 4 }}>
          {/* Profile Header */}
          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                src={previewImage || profile?.avatar}
                sx={{
                  width: { xs: 120, sm: 150, md: 200 },
                  height: { xs: 120, sm: 150, md: 200 },
                  border: `4px solid ${theme.palette.primary.main}`
                }}
              />
              {editing && (
                <IconButton
                  component="label"
                  sx={{
                    position: 'absolute',
                    bottom: 0,
                    right: 0,
                    bgcolor: theme.palette.primary.main,
                    '&:hover': { bgcolor: theme.palette.primary.dark },
                    width: { xs: 32, sm: 40 },
                    height: { xs: 32, sm: 40 }
                  }}
                >
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <PhotoCameraIcon sx={{ fontSize: { xs: 18, sm: 24 } }} />
                </IconButton>
              )}
            </Box>
          </Grid>

          {/* Profile Info */}
          <Grid item xs={12} md={8}>
            <Box sx={{ 
              display: 'flex', 
              flexDirection: { xs: 'column', sm: 'row' }, 
              justifyContent: 'space-between', 
              alignItems: { xs: 'stretch', sm: 'center' },
              gap: { xs: 2, sm: 0 },
              mb: 3 
            }}>
              <Typography variant="h4" component="h1" gutterBottom sx={{ 
                fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2.125rem' },
                mb: { xs: 1, sm: 0 }
              }}>
                Profile
              </Typography>
              {!editing ? (
                <Button
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  variant="contained"
                  fullWidth={false}
                  sx={{ width: { xs: '100%', sm: 'auto' } }}
                >
                  Edit Profile
                </Button>
              ) : (
                <Box sx={{ 
                  display: 'flex', 
                  gap: 1,
                  flexDirection: { xs: 'column', sm: 'row' },
                  width: { xs: '100%', sm: 'auto' }
                }}>
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    variant="outlined"
                    color="error"
                    fullWidth={false}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    Cancel
                  </Button>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                    fullWidth={false}
                    sx={{ width: { xs: '100%', sm: 'auto' } }}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </Box>
              )}
            </Box>

            {editing ? (
              <Box component="form" sx={{ 
                display: 'flex', 
                flexDirection: 'column', 
                gap: { xs: 2, md: 3 }
              }}>
                <TextField
                  label="Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  fullWidth
                  required
                  size="medium"
                  sx={{ '& .MuiInputBase-input': { fontSize: { xs: '0.875rem', sm: '1rem' } } }}
                />
                <TextField
                  label="Bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  multiline
                  rows={4}
                  fullWidth
                  size="medium"
                  sx={{ '& .MuiInputBase-input': { fontSize: { xs: '0.875rem', sm: '1rem' } } }}
                />
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom sx={{ 
                  fontSize: { xs: '1.1rem', sm: '1.25rem' },
                  wordBreak: 'break-word'
                }}>
                  {profile?.name || currentUser?.displayName || 'No name set'}
                </Typography>
                <Typography color="text.secondary" paragraph sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  wordBreak: 'break-word'
                }}>
                  {profile?.bio || 'No bio added yet'}
                </Typography>
                <Typography variant="subtitle1" gutterBottom sx={{ 
                  fontSize: { xs: '0.875rem', sm: '1rem' },
                  wordBreak: 'break-word'
                }}>
                  Email: {currentUser?.email}
                </Typography>
              </Box>
            )}
          </Grid>

          {/* Joined Groups */}
          <Grid item xs={12}>
            <Divider sx={{ my: { xs: 2, md: 4 } }} />
            <Typography variant="h5" gutterBottom sx={{ 
              fontSize: { xs: '1.25rem', sm: '1.5rem' },
              mb: { xs: 2, md: 3 }
            }}>
              Joined Groups ({joinedGroups.length})
            </Typography>
            <Grid container spacing={{ xs: 1, sm: 2, md: 3 }}>
              {joinedGroups.map((group) => (
                <Grid item xs={12} sm={6} md={4} key={group.id}>
                  <Paper
                    onClick={() => handleGroupClick(group.id)}
                    sx={{
                      p: { xs: 1.5, sm: 2 },
                      display: 'flex',
                      alignItems: 'center',
                      gap: { xs: 1, sm: 2 },
                      cursor: 'pointer',
                      '&:hover': { 
                        bgcolor: 'action.hover',
                        transform: 'translateY(-2px)',
                        transition: 'transform 0.2s'
                      }
                    }}
                  >
                    <Avatar 
                      src={group.image}
                      sx={{ 
                        width: { xs: 40, sm: 48 }, 
                        height: { xs: 40, sm: 48 } 
                      }}
                    >
                      <GroupIcon sx={{ fontSize: { xs: 24, sm: 28 } }} />
                    </Avatar>
                    <Box sx={{ overflow: 'hidden' }}>
                      <Typography 
                        variant="subtitle1" 
                        sx={{ 
                          fontSize: { xs: '0.875rem', sm: '1rem' },
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {group.name}
                      </Typography>
                      <Typography 
                        variant="body2" 
                        color="text.secondary" 
                        sx={{ 
                          fontSize: { xs: '0.75rem', sm: '0.875rem' },
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {group.members.length} members
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </Grid>
        </Grid>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        sx={{
          bottom: { xs: 16, sm: 24 }
        }}
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
    </Container>
  );
}