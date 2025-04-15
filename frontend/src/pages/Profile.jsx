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
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Group as GroupIcon,
  MoreVert as MoreVertIcon,
  ExitToApp as ExitIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile, updateProfile } from '../services/profileService';
import { getGroups, leaveGroup, deleteGroup } from '../services/groupService';
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
  
  // New state variables for group actions
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({
    open: false,
    type: '', // 'leave' or 'delete'
    groupId: null,
    groupName: ''
  });
  const [actionLoading, setActionLoading] = useState(false);

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
      // Filter groups to find those where current user is a member
      // Handle both possible data structures: member objects with id field or direct user IDs
      const userGroups = groups.filter(group => 
        group.members && group.members.some(member => 
          (typeof member === 'object' && member.id === currentUser.uid) || 
          member === currentUser.uid
        )
      );
      console.log("Fetched groups:", groups);
      console.log("User joined groups:", userGroups);
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

  // Functions for group actions
  const handleMenuOpen = (event, group) => {
    event.stopPropagation(); // Prevent triggering the group click
    setAnchorEl(event.currentTarget);
    setSelectedGroup(group);
  };

  const handleMenuClose = (event) => {
    if (event) {
      event.stopPropagation(); // Prevent triggering the group click
    }
    setAnchorEl(null);
    setSelectedGroup(null);
  };

  const handleLeaveGroup = async () => {
    if (!selectedGroup) return;
    
    setConfirmDialog({
      open: true,
      type: 'leave',
      groupId: selectedGroup.id,
      groupName: selectedGroup.name
    });
    handleMenuClose();
  };

  const handleDeleteGroup = async () => {
    if (!selectedGroup) return;
    
    setConfirmDialog({
      open: true,
      type: 'delete',
      groupId: selectedGroup.id,
      groupName: selectedGroup.name
    });
    handleMenuClose();
  };

  const confirmAction = async () => {
    setActionLoading(true);
    try {
      if (confirmDialog.type === 'leave') {
        await leaveGroup(confirmDialog.groupId, currentUser.uid);
        setSnackbar({
          open: true,
          message: `You have left ${confirmDialog.groupName}`,
          severity: 'success'
        });
      } else if (confirmDialog.type === 'delete') {
        await deleteGroup(confirmDialog.groupId);
        setSnackbar({
          open: true,
          message: `Group ${confirmDialog.groupName} has been deleted`,
          severity: 'success'
        });
      }
      
      // Refresh the groups list
      await fetchProfile();
    } catch (error) {
      console.error(`Error ${confirmDialog.type === 'leave' ? 'leaving' : 'deleting'} group:`, error);
      setSnackbar({
        open: true,
        message: `Error ${confirmDialog.type === 'leave' ? 'leaving' : 'deleting'} group: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setActionLoading(false);
      setConfirmDialog({
        open: false,
        type: '',
        groupId: null,
        groupName: ''
      });
    }
  };

  const cancelAction = () => {
    setConfirmDialog({
      open: false,
      type: '',
      groupId: null,
      groupName: ''
    });
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
              {joinedGroups.length === 0 ? (
                <Grid item xs={12}>
                  <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 4 }}>
                    You haven't joined any study groups yet.
                  </Typography>
                </Grid>
              ) : (
                joinedGroups.map((group) => (
                  <Grid item xs={12} sm={6} md={4} key={group.id}>
                    <Paper
                      elevation={3}
                      sx={{
                        p: { xs: 1.5, sm: 2 },
                        display: 'flex',
                        alignItems: 'center',
                        gap: { xs: 1, sm: 2 },
                        cursor: 'pointer',
                        borderRadius: 2,
                        boxShadow: 3,
                        position: 'relative',
                        '&:hover': { 
                          bgcolor: 'action.hover',
                          transform: 'translateY(-2px)',
                          transition: 'transform 0.2s, box-shadow 0.2s',
                          boxShadow: 6
                        }
                      }}
                    >
                      <Box 
                        sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 }, flexGrow: 1 }}
                        onClick={() => handleGroupClick(group.id)}
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
                              fontWeight: 'medium',
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
                            {group.members?.length || 0} members
                          </Typography>
                        </Box>
                      </Box>
                      <IconButton 
                        onClick={(e) => handleMenuOpen(e, group)} 
                        size="small"
                        sx={{ 
                          color: 'text.secondary',
                          '&:hover': { color: 'primary.main' } 
                        }}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Paper>
                  </Grid>
                ))
              )}
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

      {/* Group Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        sx={{ mt: 1 }}
      >
        <MenuItem 
          onClick={handleLeaveGroup}
          sx={{ 
            color: 'text.secondary',
            gap: 1, 
            py: 1
          }}
        >
          <ExitIcon fontSize="small" />
          Leave Group
        </MenuItem>
        {selectedGroup && selectedGroup.creatorId === currentUser.uid && (
          <MenuItem 
            onClick={handleDeleteGroup}
            sx={{ 
              color: 'error.main',
              gap: 1,
              py: 1
            }}
          >
            <DeleteIcon fontSize="small" />
            Delete Group
          </MenuItem>
        )}
      </Menu>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={cancelAction}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">
          {confirmDialog.type === 'leave' 
            ? `Leave "${confirmDialog.groupName}"?`
            : `Delete "${confirmDialog.groupName}"?`}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            {confirmDialog.type === 'leave'
              ? `Are you sure you want to leave this group? You can always rejoin later if you change your mind.`
              : `Are you sure you want to delete this group? This action cannot be undone and all group content will be permanently removed.`}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={cancelAction}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button 
            onClick={confirmAction}
            color={confirmDialog.type === 'delete' ? 'error' : 'primary'}
            variant="contained"
            autoFocus
            disabled={actionLoading}
          >
            {actionLoading 
              ? <CircularProgress size={24} /> 
              : confirmDialog.type === 'leave' 
                ? 'Leave' 
                : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}