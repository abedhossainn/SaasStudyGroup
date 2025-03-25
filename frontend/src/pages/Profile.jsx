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
  CircularProgress
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateProfile } from '../services/profileService';
import { getGroups } from '../services/groupService';

export default function Profile() {
  const theme = useTheme();
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

  useEffect(() => {
    if (currentUser?.id) {
      fetchProfile();
    } else {
      setLoading(false);
    }
  }, [currentUser]);

  const fetchProfile = async () => {
    try {
      const profileData = await getUserProfile(currentUser.id);
      setProfile(profileData);
      setEditForm({
        name: profileData?.name || '',
        bio: profileData?.bio || '',
        avatar: profileData?.avatar || null
      });
      setPreviewImage(profileData?.avatar || null);

      // Fetch joined groups
      const groups = await getGroups();
      const userGroups = groups.filter(group => 
        group.members.includes(currentUser.id)
      );
      setJoinedGroups(userGroups);
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setEditing(true);
    setEditForm({
      name: profile?.name || '',
      bio: profile?.bio || '',
      avatar: null
    });
  };

  const handleCancel = () => {
    setEditing(false);
    setPreviewImage(null);
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setEditForm(prev => ({ ...prev, avatar: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const updatedProfile = await updateProfile(currentUser.id, {
        ...editForm,
        avatar: editForm.avatar || profile?.avatar
      });
      setProfile(updatedProfile);
      setEditing(false);
      setPreviewImage(null);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Grid container spacing={4}>
          {/* Profile Header */}
          <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
            <Box sx={{ position: 'relative', display: 'inline-block' }}>
              <Avatar
                src={previewImage || profile?.avatar}
                sx={{
                  width: 200,
                  height: 200,
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
                    '&:hover': { bgcolor: theme.palette.primary.dark }
                  }}
                >
                  <input
                    type="file"
                    hidden
                    accept="image/*"
                    onChange={handleImageChange}
                  />
                  <PhotoCameraIcon />
                </IconButton>
              )}
            </Box>
          </Grid>

          {/* Profile Info */}
          <Grid item xs={12} md={8}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Profile
              </Typography>
              {!editing ? (
                <Button
                  startIcon={<EditIcon />}
                  onClick={handleEdit}
                  variant="contained"
                >
                  Edit Profile
                </Button>
              ) : (
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                    variant="outlined"
                    color="error"
                  >
                    Cancel
                  </Button>
                  <Button
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                    variant="contained"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </Button>
                </Box>
              )}
            </Box>

            {editing ? (
              <Box component="form" sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Name"
                  value={editForm.name}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  fullWidth
                />
                <TextField
                  label="Bio"
                  value={editForm.bio}
                  onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                  multiline
                  rows={4}
                  fullWidth
                />
              </Box>
            ) : (
              <Box>
                <Typography variant="h6" gutterBottom>
                  {profile?.name}
                </Typography>
                <Typography color="text.secondary" paragraph>
                  {profile?.bio || 'No bio added yet'}
                </Typography>
                <Typography variant="subtitle1" gutterBottom>
                  Email: {profile?.email}
                </Typography>
              </Box>
            )}
          </Grid>

          {/* Joined Groups */}
          <Grid item xs={12}>
            <Divider sx={{ my: 4 }} />
            <Typography variant="h5" gutterBottom>
              Joined Groups ({joinedGroups.length})
            </Typography>
            <Grid container spacing={2}>
              {joinedGroups.map((group) => (
                <Grid item xs={12} sm={6} md={4} key={group.id}>
                  <Paper
                    sx={{
                      p: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 2,
                      '&:hover': { bgcolor: 'action.hover' }
                    }}
                  >
                    <Avatar src={group.image} />
                    <Box>
                      <Typography variant="subtitle1">
                        {group.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
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
    </Container>
  );
}