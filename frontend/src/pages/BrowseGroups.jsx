import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Grid,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress
} from '@mui/material';
import {
  Search as SearchIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getGroups, joinGroup } from '../services/groupService';

const CATEGORIES = [
  'All',
  'Programming',
  'Mathematics',
  'Science',
  'Languages',
  'Business',
  'Arts',
  'Other'
];

export default function BrowseGroups() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(null);
  const [groups, setGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  useEffect(() => {
    fetchGroups();
  }, []);

  useEffect(() => {
    filterGroups();
  }, [searchQuery, selectedCategory, groups]);

  const fetchGroups = async () => {
    try {
      const fetchedGroups = await getGroups();
      setGroups(fetchedGroups);
      setFilteredGroups(fetchedGroups);
    } catch (error) {
      console.error('Error fetching groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterGroups = () => {
    let filtered = [...groups];

    // Apply category filter
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(group => group.category === selectedCategory);
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(group =>
        group.name.toLowerCase().includes(query) ||
        group.description?.toLowerCase().includes(query) ||
        group.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    setFilteredGroups(filtered);
  };

  const handleJoinGroup = async (groupId) => {
    setJoining(groupId);
    try {
      console.log("Attempting to join group:", groupId);
      console.log("Current user:", currentUser.uid);
      
      await joinGroup(groupId, currentUser.uid);
      console.log("Join group operation completed successfully");
      
      // Refresh groups to update UI
      await fetchGroups();
      
      // Navigate to the group details page after joining
      navigate(`/group/${groupId}`);
    } catch (error) {
      console.error('Error joining group:', error);
      alert(`Failed to join the group: ${error.message}`);
    } finally {
      setJoining(null);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '80vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Browse Study Groups
        </Typography>
        
        {/* Search and Filter */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
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
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={2}>
            <Button
              fullWidth
              variant="contained"
              onClick={() => navigate('/create-group')}
              sx={{ height: '100%' }}
            >
              Create Group
            </Button>
          </Grid>
        </Grid>

        {/* Groups Grid */}
        <Grid container spacing={3}>
          {filteredGroups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardMedia
                  component="img"
                  height="140"
                  image={group.image || '/default-group-image.jpg'}
                  alt={group.name}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography gutterBottom variant="h6" component="h2">
                    {group.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    {group.description}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <PeopleIcon sx={{ mr: 1, fontSize: 20 }} />
                    <Typography variant="body2">
                      {group.members.length} / {group.maxMembers} members
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {group.tags?.map((tag) => (
                      <Chip
                        key={tag}
                        label={tag}
                        size="small"
                        sx={{ mr: 0.5, mb: 0.5 }}
                      />
                    ))}
                  </Box>
                </CardContent>
                <CardActions>
                  <Button
                    fullWidth
                    variant={group.members.includes(currentUser.uid) ? "outlined" : "contained"}
                    disabled={group.members.includes(currentUser.uid) || joining === group.id}
                    onClick={() => handleJoinGroup(group.id)}
                  >
                    {joining === group.id ? (
                      <CircularProgress size={24} />
                    ) : group.members.includes(currentUser.uid) ? (
                      'Joined'
                    ) : (
                      'Join Group'
                    )}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {filteredGroups.length === 0 && (
          <Box sx={{ textAlign: 'center', mt: 4 }}>
            <Typography variant="h6" color="text.secondary">
              No groups found matching your criteria
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/create-group')}
              sx={{ mt: 2 }}
            >
              Create a New Group
            </Button>
          </Box>
        )}
      </Box>
    </Container>
  );
}
