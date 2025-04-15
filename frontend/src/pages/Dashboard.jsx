import { useState, useEffect, useCallback } from 'react';
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
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Snackbar,
  Paper,
  CircularProgress,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import {
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  Search as SearchIcon
} from '@mui/icons-material';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { createGroup, joinGroup } from '../services/groupService';
import { useDropzone } from 'react-dropzone';

export default function Dashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    topics: '',
    image: '/test_wallpaper.png',
    creatorId: currentUser?.uid
  });

  const categories = ['All', 'Programming', 'Mathematics', 'Science', 'Languages', 'Business', 'Arts', 'Other'];

  // Fetch groups and set up real-time listener
  useEffect(() => {
    const groupsQuery = query(
      collection(db, 'groups'),
      orderBy('lastActive', 'desc')
    );

    const unsubscribe = onSnapshot(groupsQuery, (snapshot) => {
      const groupsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setGroups(groupsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching groups:', error);
      setError('Failed to load study groups');
      setShowError(true);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Filter groups based on search and category
  useEffect(() => {
    let filtered = [...groups];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(query) ||
        group.description.toLowerCase().includes(query) ||
        group.topics.some(topic => topic.toLowerCase().includes(query))
      );
    }

    if (filterCategory !== 'All') {
      filtered = filtered.filter(group => group.topics.includes(filterCategory));
    }

    setFilteredGroups(filtered);
  }, [groups, searchQuery, filterCategory]);

  // Enhanced file upload with react-dropzone
  const onDrop = useCallback(acceptedFiles => {
    if (acceptedFiles?.length > 0) {
      const file = acceptedFiles[0];
      setSelectedImage(file);
      setNewGroup(prev => ({
        ...prev,
        image: URL.createObjectURL(file)
      }));
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024 // 5MB max size
  });

  const handleCreateGroup = async () => {
    if (!newGroup.name || !newGroup.description) {
      setError('Please fill in all required fields');
      setShowError(true);
      return;
    }

    try {
      setLoading(true);
      
      // Use the centralized createGroup function from our service
      // which already handles Cloudinary uploads
      await createGroup({
        name: newGroup.name,
        description: newGroup.description,
        topics: newGroup.topics.split(',').map(topic => topic.trim()).filter(Boolean),
        image: selectedImage,
        createdBy: currentUser?.uid,
        members: [currentUser?.uid]
      });

      setOpenDialog(false);
      setNewGroup({
        name: '',
        description: '',
        topics: '',
        image: '/test_wallpaper.png',
        creatorId: currentUser?.uid
      });
      setSelectedImage(null);
    } catch (error) {
      console.error('Error creating group:', error);
      setError(error.message || 'Failed to create study group');
      setShowError(true);
    } finally {
      setLoading(false);
    }
  };

  // Enhanced function to handle both joining and viewing groups
  const handleGroupAction = async (group) => {
    const isAlreadyMember = group.members?.includes(currentUser?.uid);
    
    if (isAlreadyMember) {
      // If already a member, just navigate to the group
      navigate(`/group/${group.id}`);
    } else {
      // If not a member, join the group first
      try {
        setLoading(true);
        console.log(`Attempting to join group: ${group.id}`);
        
        // Import the joinGroup function at the top of the file
        await joinGroup(group.id, currentUser.uid);
        
        console.log("Successfully joined group");
        // Now navigate to the group page
        navigate(`/group/${group.id}`);
      } catch (error) {
        console.error('Error joining group:', error);
        setError(error.message || 'Failed to join the group');
        setShowError(true);
      } finally {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
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
          color: 'black', // Changed from 'white' to 'black' for better contrast
          boxShadow: '0 4px 8px rgba(0,0,0,0.2)'
        }}
      >
        <Typography variant="h4" gutterBottom sx={{ 
          fontWeight: 600, 
          color: 'black',
          textShadow: '0px 1px 2px rgba(255,255,255,0.5)' 
        }}>
          Welcome back, {currentUser?.name || 'User'}!
        </Typography>
        <Typography variant="body1" sx={{ 
          mb: 3, 
          maxWidth: 600, 
          color: 'black',
          textShadow: '0px 1px 1px rgba(255,255,255,0.4)'
        }}>
          Join study groups, collaborate with peers, and achieve your academic goals together.
        </Typography>
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
      </Paper>

      {/* Search and Filter */}
      <Box sx={{ mb: 4 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search groups..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={filterCategory}
                label="Category"
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                {categories.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>

      {/* Groups Grid */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
          Study Groups {filteredGroups.length > 0 && `(${filteredGroups.length})`}
        </Typography>
        <Grid container spacing={3}>
          {filteredGroups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.id}>
              <Card 
                elevation={3}
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
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
                  <Typography variant="h6" gutterBottom>
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
                        sx={{ bgcolor: theme.palette.primary.main, color: 'white' }}
                      />
                    ))}
                  </Box>
                  <Typography variant="body2" color="text.secondary">
                    {group.members?.length || 0} members
                  </Typography>
                </CardContent>
                <CardActions sx={{ p: 2 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleGroupAction(group)}
                  >
                    {group.members?.includes(currentUser?.uid) ? 'View Group' : 'Join Group'}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
          {filteredGroups.length === 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="body1" color="text.secondary">
                  No study groups found matching your criteria
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </Box>

      {/* Create Group Dialog with enhanced upload */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Study Group</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            <TextField
              fullWidth
              required
              label="Group Name"
              value={newGroup.name}
              onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              required
              label="Description"
              value={newGroup.description}
              onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
              sx={{ mb: 2 }}
            />
            <TextField
              fullWidth
              required
              label="Topics (comma-separated)"
              value={newGroup.topics}
              onChange={(e) => setNewGroup(prev => ({ ...prev, topics: e.target.value }))}
              helperText="Example: Mathematics, Physics, Engineering"
              sx={{ mb: 2 }}
            />
            
            {/* Enhanced Dropzone for image upload */}
            <Box sx={{ mb: 2 }}>
              <Box
                {...getRootProps()}
                sx={{
                  border: '2px dashed',
                  borderColor: isDragActive ? 'primary.main' : 'divider',
                  borderRadius: 2,
                  p: 2,
                  textAlign: 'center',
                  cursor: 'pointer',
                  bgcolor: isDragActive ? 'rgba(0, 0, 0, 0.04)' : 'transparent',
                  transition: '0.3s',
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              >
                <input {...getInputProps()} />
                <CloudUploadIcon sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                <Typography>
                  {isDragActive
                    ? "Drop the image here..."
                    : "Drag and drop a group image here, or click to select"}
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  (Supports JPG, PNG, GIF up to 5MB)
                </Typography>
              </Box>
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
          <Button 
            onClick={() => setOpenDialog(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateGroup}
            variant="contained"
            disabled={loading}
          >
            {loading ? <CircularProgress size={24} /> : 'Create'}
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