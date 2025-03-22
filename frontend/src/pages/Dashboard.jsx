import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Chip,
  AvatarGroup,
  Avatar,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Paper,
  IconButton
} from '@mui/material';
import {
  Add as AddIcon,
  Upload as UploadIcon,
  School as SchoolIcon
} from '@mui/icons-material';
import { mockApi, mockUsers } from '../services/mockApi';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    topics: '',
    image: '/test_wallpaper.png',
    creatorId: currentUser?.id
  });
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const data = await mockApi.getGroups();
      setGroups(data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('Failed to load study groups');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.description) {
      setError('Please fill in all required fields');
      setShowError(true);
      return;
    }

    try {
      const imageUrl = selectedImage ? URL.createObjectURL(selectedImage) : '/test_wallpaper.png';
      const createdGroup = await mockApi.createGroup({
        ...newGroup,
        image: imageUrl,
        topics: newGroup.topics.split(',').map(topic => topic.trim()),
      });
      setGroups(prev => [...prev, createdGroup]);
      setOpenDialog(false);
      setNewGroup({
        name: '',
        description: '',
        topics: '',
        image: '/test_wallpaper.png',
        creatorId: currentUser?.id
      });
      setSelectedImage(null);
    } catch (error) {
      console.error('Error creating group:', error);
      setError('Failed to create study group');
      setShowError(true);
    }
  };

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedImage(file);
      setNewGroup(prev => ({
        ...prev,
        image: URL.createObjectURL(file)
      }));
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading study groups...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: theme.palette.background.default, minHeight: '100vh' }}>
      {/* Welcome Section */}
      <Paper
        sx={{
          p: 3,
          mb: 4,
          background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
          color: theme.palette.mode === 'light' ? 'black' : 'white',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          <Typography variant="h4" gutterBottom sx={{ fontWeight: 600 }}>
            Welcome back, {currentUser?.name || 'User'}!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3, maxWidth: 600, opacity: 0.9 }}>
            Join study groups, collaborate with peers, and achieve your academic goals together.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setOpenDialog(true)}
              sx={{
                bgcolor: 'white',
                color: 'black',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                }
              }}
            >
              Create New Group
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate('/groups')}
              sx={{
                bgcolor: 'white',
                color: 'black',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.9)',
                }
              }}
            >
              Browse Groups
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* Study Groups Grid */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom sx={{ fontWeight: 600 }}>
          Active Study Groups
        </Typography>
        <Grid container spacing={3}>
          {groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.id}>
              <Card 
                elevation={3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  bgcolor: theme.palette.background.paper,
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    transition: 'transform 0.2s ease-in-out'
                  }
                }}
              >
                <CardMedia
                  component="img"
                  height="140"
                  image={group.image}
                  alt={group.name}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" component="h2" gutterBottom>
                    {group.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {group.description}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    {group.topics.slice(0, 3).map((topic, index) => (
                      <Chip
                        key={index}
                        label={topic}
                        size="small"
                        sx={{ bgcolor: theme.palette.primary.main, color: theme.palette.mode === 'light' ? 'black' : 'white' }}
                      />
                    ))}
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24 } }}>
                      {group.members.map((memberId) => {
                        const member = mockUsers.find(u => u.id === memberId);
                        return (
                          <Avatar
                            key={memberId}
                            src={member?.avatar}
                            alt={member?.name}
                            sx={{ width: 24, height: 24 }}
                          />
                        );
                      })}
                    </AvatarGroup>
                    <Typography variant="body2" color="text.secondary">
                      {group.members.length} members
                    </Typography>
                  </Box>
                </CardContent>
                <CardActions sx={{ p: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => navigate(`/group/${group.id}`)}
                    sx={{
                      bgcolor: theme.palette.primary.main,
                      color: theme.palette.mode === 'light' ? 'black' : 'white',
                      '&:hover': {
                        bgcolor: theme.palette.primary.dark
                      }
                    }}
                  >
                    {group.members.includes(currentUser?.id) ? 'View Group' : 'Join Group'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Create Group Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Study Group</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Group Name"
              value={newGroup.name}
              onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Description"
              value={newGroup.description}
              onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              label="Topics (comma-separated)"
              value={newGroup.topics}
              onChange={(e) => setNewGroup(prev => ({ ...prev, topics: e.target.value }))}
              helperText="Example: Mathematics, Physics, Engineering"
              sx={{ mb: 2 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
              >
                Upload Group Image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </Button>
              {selectedImage && (
                <Typography variant="body2" color="text.secondary">
                  {selectedImage.name}
                </Typography>
              )}
            </Box>
            {newGroup.image && (
              <Box sx={{ width: '100%', height: 200, mb: 2 }}>
                <img
                  src={newGroup.image}
                  alt="Group preview"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    borderRadius: 8
                  }}
                />
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            sx={{
              bgcolor: theme.palette.primary.main,
              color: theme.palette.mode === 'light' ? 'black' : 'white',
              '&:hover': {
                bgcolor: theme.palette.primary.dark
              }
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setShowError(false)}
          severity="error"
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </Box>
  );
}