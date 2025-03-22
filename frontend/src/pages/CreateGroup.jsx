import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  CircularProgress
} from '@mui/material';
import {
  AddPhotoAlternate as AddPhotoIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { createGroup } from '../services/groupService';

const CATEGORIES = [
  'Programming',
  'Mathematics',
  'Science',
  'Languages',
  'Business',
  'Arts',
  'Other'
];

export default function CreateGroup() {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    maxMembers: 10,
    tags: [],
    image: null
  });
  const [previewImage, setPreviewImage] = useState(null);
  const [tagInput, setTagInput] = useState('');

  const handleImageChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFormData(prev => ({ ...prev, image: file }));
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleTagAdd = (event) => {
    if (event.key === 'Enter' && tagInput.trim()) {
      event.preventDefault();
      if (!formData.tags.includes(tagInput.trim())) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tagInput.trim()]
        }));
      }
      setTagInput('');
    }
  };

  const handleTagDelete = (tagToDelete) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToDelete)
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      // && backend changes
      // 1. Set up Firestore rules for groups collection
      // 2. Configure Firebase Storage for group images
      // 3. Add validation for group name uniqueness
      // 4. Set up proper error handling
      const newGroup = {
        ...formData,
        createdBy: currentUser.id,
        members: [currentUser.id],
        createdAt: new Date().toISOString()
      };

      await createGroup(newGroup);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error creating group:', error);
      // Handle error appropriately
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4, borderRadius: 2 }}>
        <Typography variant="h4" gutterBottom>
          Create New Study Group
        </Typography>

        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 3 }}>
          <Grid container spacing={3}>
            {/* Group Image */}
            <Grid item xs={12} sx={{ textAlign: 'center' }}>
              <Box
                sx={{
                  width: '100%',
                  height: 200,
                  border: '2px dashed #ccc',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: 'background.default'
                }}
              >
                {previewImage ? (
                  <>
                    <img
                      src={previewImage}
                      alt="Group preview"
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover'
                      }}
                    />
                    <IconButton
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        bgcolor: 'background.paper'
                      }}
                      onClick={() => {
                        setPreviewImage(null);
                        setFormData(prev => ({ ...prev, image: null }));
                      }}
                    >
                      <CloseIcon />
                    </IconButton>
                  </>
                ) : (
                  <Button
                    component="label"
                    startIcon={<AddPhotoIcon />}
                  >
                    Add Group Image
                    <input
                      type="file"
                      hidden
                      accept="image/*"
                      onChange={handleImageChange}
                    />
                  </Button>
                )}
              </Box>
            </Grid>

            {/* Group Details */}
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Group Name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                multiline
                rows={4}
                label="Description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Category</InputLabel>
                <Select
                  value={formData.category}
                  label="Category"
                  onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                >
                  {CATEGORIES.map((category) => (
                    <MenuItem key={category} value={category}>
                      {category}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="Maximum Members"
                value={formData.maxMembers}
                onChange={(e) => setFormData(prev => ({ ...prev, maxMembers: parseInt(e.target.value) }))}
                InputProps={{ inputProps: { min: 2, max: 100 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Add Tags (Press Enter)"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={handleTagAdd}
                helperText="Add tags to help others find your group"
              />
              <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {formData.tags.map((tag) => (
                  <Chip
                    key={tag}
                    label={tag}
                    onDelete={() => handleTagDelete(tag)}
                  />
                ))}
              </Box>
            </Grid>

            <Grid item xs={12} sx={{ mt: 2 }}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                size="large"
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} /> : 'Create Group'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}