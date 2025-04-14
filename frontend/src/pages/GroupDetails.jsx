import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Description as DescriptionIcon } from '@mui/icons-material';
import {
  Box,
  Typography,
  Paper,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  TextField,
  Button,
  Divider,
  Card,
  CardContent,
  useTheme,
  CircularProgress,
  Avatar,
  Snackbar,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ListItemAvatar,
  Link
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Event as EventIcon,
  Upload as UploadIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  CloudUpload as CloudUploadIcon
} from '@mui/icons-material';
import { getGroupById, deleteGroup, uploadGroupDocument, uploadImageToCloudinary } from '../services/groupService';
import { useAuth } from '../contexts/AuthContext';
import { collection, addDoc, serverTimestamp, onSnapshot, query, orderBy, getDoc, doc, where, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { notifyGroupMembers } from '../services/notificationService';

export default function GroupDetails() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { groupId } = useParams();
  const { currentUser } = useAuth();
  const [group, setGroup] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState('');
  const [showError, setShowError] = useState(false);
  const [serverStatus, setServerStatus] = useState('checking'); // 'checking', 'online', 'offline'
  const [memberProfiles, setMemberProfiles] = useState({});
  const [meetings, setMeetings] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  
  // Meeting state
  const [openMeetingDialog, setOpenMeetingDialog] = useState(false);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    description: '',
    date: new Date(),
    link: ''
  });

  // Update user's last active timestamp when they send a message
  const updateUserActivity = async () => {
    if (!currentUser?.uid) return;
    
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        lastActive: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error updating user activity:", error);
      // Don't show error to user as this is a background operation
    }
  };

  // Check if the backend server is running
  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/status', { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          // Short timeout to avoid long wait
          signal: AbortSignal.timeout(2000)
        });
        
        if (response.ok) {
          setServerStatus('online');
        } else {
          setServerStatus('offline');
        }
      } catch (error) {
        console.log('Backend server appears to be offline');
        setServerStatus('offline');
      }
    };
    
    checkServerStatus();
  }, []);

  useEffect(() => {
    const fetchGroup = async () => {
      try {
        // Set up a real-time listener for group data
        const groupRef = doc(db, 'groups', groupId);
        const unsubscribe = onSnapshot(groupRef, (docSnapshot) => {
          if (docSnapshot.exists()) {
            const groupData = { id: docSnapshot.id, ...docSnapshot.data() };
            setGroup(groupData);
            
            // Fetch member profiles whenever the members list changes
            if (groupData.members && groupData.members.length > 0) {
              fetchMemberProfiles(groupData.members);
            }
            
            console.log("Group data updated:", groupData);
            console.log("Member count:", groupData.members?.length || 0);
          } else {
            console.log("Group doesn't exist!");
            setError('Group not found');
            setShowError(true);
          }
        }, (error) => {
          console.error("Error getting group:", error);
          setError('Failed to load group details');
          setShowError(true);
        });
        
        setLoading(false);
        return unsubscribe;
      } catch (error) {
        console.error('Error setting up group listener:', error);
        setError('Failed to load group details');
        setShowError(true);
        setLoading(false);
      }
    };
    
    fetchGroup();
  }, [groupId]);
  
  // Fetch member profiles to display names instead of just UIDs
  const fetchMemberProfiles = async (memberIds) => {
    try {
      const profiles = {};
      
      for (const memberId of memberIds) {
        try {
          const userDoc = await getDoc(doc(db, 'users', memberId));
          if (userDoc.exists()) {
            profiles[memberId] = {
              ...userDoc.data(),
              lastActive: userDoc.data().lastActive || null
            };
          } else {
            // Fallback for users without profiles
            profiles[memberId] = { 
              displayName: memberId.substring(0, 8), 
              photoURL: null,
              lastActive: null
            };
          }
        } catch (err) {
          console.error(`Error fetching user ${memberId}:`, err);
          profiles[memberId] = { 
            displayName: memberId.substring(0, 8), 
            photoURL: null,
            lastActive: null
          };
        }
      }
      
      setMemberProfiles(profiles);
    } catch (error) {
      console.error('Error fetching member profiles:', error);
    }
  };

  // Set up real-time chat listener
  useEffect(() => {
    if (!groupId) return;
    
    const chatQuery = query(
      collection(db, `groups/${groupId}/messages`),
      orderBy('timestamp', 'asc')
    );
    
    const unsubscribe = onSnapshot(chatQuery, (snapshot) => {
      const messages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setChatMessages(messages);
      
      // Scroll to bottom on new messages
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error("Error getting chat messages:", error);
      setError('Failed to load chat messages');
      setShowError(true);
    });
    
    return () => unsubscribe();
  }, [groupId]);

  // Fetch meetings from the top-level meetings collection
  useEffect(() => {
    if (!groupId) return;
    
    const fetchMeetings = async () => {
      try {
        console.log("Fetching meetings for groupId:", groupId);
        
        // Query the top-level meetings collection filtered by groupId
        const meetingsRef = collection(db, 'meetings');
        const meetingsQuery = query(
          meetingsRef, 
          where('groupId', '==', groupId)
          // Temporarily remove the orderBy to simplify the query while debugging
          // orderBy('date', 'asc')
        );
        
        // Set up real-time listener for meetings
        const unsubscribe = onSnapshot(meetingsQuery, (snapshot) => {
          console.log("Raw meetings data:", snapshot.docs.map(doc => ({id: doc.id, ...doc.data()})));
          
          const meetingsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Filter out past meetings
          const now = new Date();
          // Set time to beginning of day for better comparison
          now.setHours(0, 0, 0, 0);
          console.log("Current date for filtering (beginning of day):", now);
          
          const upcomingMeetings = meetingsData.filter(meeting => {
            try {
              console.log("Meeting date before parsing:", meeting.date);
              const meetingDate = new Date(meeting.date);
              
              // Create a date object for just the date part (without time)
              const meetingDateOnly = new Date(meetingDate);
              meetingDateOnly.setHours(0, 0, 0, 0);
              
              console.log("Meeting date after parsing (date only):", meetingDateOnly);
              
              // Consider a meeting as upcoming if it's today or in the future
              const isToday = meetingDateOnly.getTime() === now.getTime();
              const isFuture = meetingDate > now;
              console.log(`Meeting "${meeting.title}" is today: ${isToday}, is future: ${isFuture}`);
              
              return isToday || isFuture;
            } catch (e) {
              console.error("Invalid date format:", meeting.date, e);
              return false;
            }
          });
          
          console.log("Filtered upcoming meetings:", upcomingMeetings);
          setMeetings(upcomingMeetings);
          
          // Also update the group object with the meetings
          setGroup(prevGroup => {
            if (!prevGroup) return null;
            return {
              ...prevGroup,
              meetings: upcomingMeetings
            };
          });
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching meetings:', error);
        setError('Failed to load meetings');
        setShowError(true);
      }
    };
    
    fetchMeetings();
  }, [groupId]);

  // Fetch documents from Firestore
  useEffect(() => {
    if (!groupId) return;
    
    const fetchDocuments = async () => {
      try {
        const documentsRef = collection(db, `groups/${groupId}/documents`);
        const documentsQuery = query(documentsRef, orderBy('createdAt', 'desc'));
        
        // Set up real-time listener for documents
        const unsubscribe = onSnapshot(documentsQuery, (snapshot) => {
          const documentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          
          // Update group documents in state
          setGroup(prevGroup => {
            if (!prevGroup) return null;
            return {
              ...prevGroup,
              documents: documentsData
            };
          });
        });
        
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching documents:', error);
        setError('Failed to load documents');
        setShowError(true);
      }
    };
    
    fetchDocuments();
  }, [groupId]);

  const handleDeleteGroup = async () => {
    if (!window.confirm('Are you sure you want to delete this group?')) return;
    try {
      await deleteGroup(groupId);
      navigate('/dashboard');
    } catch (err) {
      console.error('Error deleting group:', err);
      setError('Failed to delete group');
      setShowError(true);
    }
  };

  // Handle document upload with fallback to direct Cloudinary upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
      setUploading(true);
      
      let fileUrl = '';
      
      // If backend server is offline, use direct Cloudinary upload
      if (serverStatus === 'offline') {
        try {
          // Upload directly to Cloudinary
          fileUrl = await uploadImageToCloudinary(file, `group-documents/${groupId}`);
          console.log("Uploaded to Cloudinary, received URL:", fileUrl);
          
          if (!fileUrl) {
            throw new Error("Failed to get a valid URL from Cloudinary");
          }
        } catch (cloudinaryError) {
          console.error("Cloudinary upload error:", cloudinaryError);
          throw new Error("Failed to upload to Cloudinary: " + cloudinaryError.message);
        }
      } else {
        // Use backend upload if available
        try {
          const uploadResult = await uploadGroupDocument(file, groupId, currentUser?.uid || 'unknown-user');
          fileUrl = uploadResult.url || uploadResult.fileUrl || uploadResult.secure_url;
          console.log("Backend upload result:", uploadResult, "Using URL:", fileUrl);
          
          if (!fileUrl) {
            throw new Error("Failed to get a valid URL from backend upload");
          }
        } catch (backendError) {
          console.error("Backend upload error:", backendError);
          throw new Error("Failed to upload via backend: " + backendError.message);
        }
      }
      
      // Verify we have a valid URL before proceeding
      if (!fileUrl || typeof fileUrl !== 'string') {
        throw new Error("Invalid file URL received after upload: " + String(fileUrl));
      }
      
      // Create document record in Firestore with the verified URL
      console.log("Creating Firestore document with URL:", fileUrl);
      await addDoc(collection(db, `groups/${groupId}/documents`), {
        name: file.name,
        fileUrl: fileUrl, // Ensure this is not undefined
        fileType: file.type,
        uploadedBy: currentUser?.uid || 'unknown-user',
        createdAt: serverTimestamp()
      });
      
      // Note: We don't need to update local state here since the Firestore listener will do it
      
    } catch (error) {
      console.error("Error uploading document:", error);
      setError('Failed to upload document: ' + error.message);
      setShowError(true);
    } finally {
      setUploading(false);
      // Reset file input
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Handle document deletion
  const handleDeleteDocument = async (documentId) => {
    if (!currentUser) {
      setError('You must be logged in to delete a document');
      setShowError(true);
      return;
    }
    
    try {
      if (!window.confirm('Are you sure you want to delete this document?')) {
        return;
      }
      
      // First, get the document to check permissions
      const docRef = doc(db, `groups/${groupId}/documents/${documentId}`);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        throw new Error('Document not found');
      }
      
      const documentData = docSnap.data();
      
      // Check if the user is the uploader or the group creator
      if (documentData.uploadedBy !== currentUser.uid && group.creatorId !== currentUser.uid) {
        throw new Error('You do not have permission to delete this document');
      }
      
      // Delete the document
      await deleteDoc(docRef);
      
      // No need to update the UI state - the Firestore listener will handle that
      
    } catch (error) {
      console.error("Error deleting document:", error);
      setError('Failed to delete document: ' + error.message);
      setShowError(true);
    }
  };

  // Handle meeting deletion
  const handleDeleteMeeting = async (meetingId) => {
    if (!currentUser) {
      setError('You must be logged in to delete a meeting');
      setShowError(true);
      return;
    }
    
    try {
      if (!window.confirm('Are you sure you want to delete this meeting?')) {
        return;
      }
      
      // First, get the meeting to check permissions
      const meetingRef = doc(db, `meetings/${meetingId}`);
      const meetingSnap = await getDoc(meetingRef);
      
      if (!meetingSnap.exists()) {
        throw new Error('Meeting not found');
      }
      
      const meetingData = meetingSnap.data();
      
      // Check if the user is the creator of the meeting or the group creator
      if (meetingData.createdBy !== currentUser.uid && group.creatorId !== currentUser.uid) {
        throw new Error('You do not have permission to delete this meeting');
      }
      
      // Delete the meeting
      await deleteDoc(meetingRef);
      
      // No need to update the UI state - the Firestore listener will handle that
      
    } catch (error) {
      console.error("Error deleting meeting:", error);
      setError('Failed to delete meeting: ' + error.message);
      setShowError(true);
    }
  };

  // Send chat message
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !currentUser) return;
    
    try {
      setSendingMessage(true);
      await addDoc(collection(db, `groups/${groupId}/messages`), {
        text: message,
        userId: currentUser?.uid, // Using uid instead of id
        userName: currentUser?.displayName || currentUser?.email || 'User',
        photoURL: currentUser?.photoURL || null,
        timestamp: serverTimestamp()
      });
      setMessage('');
      updateUserActivity();
    } catch (error) {
      console.error("Error sending message:", error);
      setError('Failed to send message: ' + error.message);
      setShowError(true);
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle meeting creation with top-level collection
  const handleCreateMeeting = async () => {
    if (!currentUser) {
      setError('You must be logged in to create a meeting');
      setShowError(true);
      return;
    }
    
    try {
      // Format date as string to avoid serialization issues with Date objects
      const dateString = newMeeting.date instanceof Date 
        ? newMeeting.date.toISOString() 
        : new Date().toISOString();
        
      const meeting = {
        title: newMeeting.title,
        description: newMeeting.description,
        date: dateString,
        link: newMeeting.link,
        groupId: groupId, // Store which group this meeting belongs to
        createdBy: currentUser?.uid,
        creatorName: currentUser?.displayName || currentUser?.email || 'User',
        createdAt: serverTimestamp()
      };
      
      console.log("Creating meeting with data:", meeting);
      
      // Add to the top-level meetings collection
      const docRef = await addDoc(collection(db, 'meetings'), meeting);
      console.log("Meeting created with ID:", docRef.id);
      
      // Notify all group members about the new meeting
      try {
        console.log("Starting notification process for meeting:", meeting.title);
        console.log("Current group:", groupId, "Current user:", currentUser.uid);
        console.log("Group members:", group.members);
        
        const notificationContent = `${currentUser.displayName || 'Someone'} created a new meeting: ${meeting.title}`;
        console.log("Notification content:", notificationContent);
        
        // Check if notifyGroupMembers is properly imported
        if (typeof notifyGroupMembers !== 'function') {
          console.error("notifyGroupMembers is not a function!", typeof notifyGroupMembers);
          throw new Error("notifyGroupMembers function not available");
        }
        
        const notificationResults = await notifyGroupMembers(groupId, currentUser.uid, 'meeting', notificationContent);
        console.log("Meeting notifications sent successfully to group members:", notificationResults);
      } catch (notificationError) {
        console.error("Error sending meeting notifications:", notificationError);
        console.error("Error details:", JSON.stringify(notificationError, Object.getOwnPropertyNames(notificationError)));
        // Continue execution even if notifications fail
      }
      
      // Close dialog and reset form
      setOpenMeetingDialog(false);
      setNewMeeting({
        title: '',
        description: '',
        date: new Date(),
        link: ''
      });
    } catch (error) {
      console.error("Error creating meeting:", error);
      setError('Failed to create meeting: ' + error.message);
      setShowError(true);
    }
  };

  // Format date for display
  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return 'Invalid date';
    }
  };

  // Get display name for a member ID
  const getMemberDisplayName = (memberId) => {
    if (memberProfiles[memberId]?.displayName) {
      return memberProfiles[memberId].displayName;
    }
    return memberId.substring(0, 8) + '...'; // Fallback to truncated ID
  };

  // Get avatar for a member
  const getMemberAvatar = (memberId) => {
    const profile = memberProfiles[memberId];
    if (profile?.photoURL) {
      return <Avatar src={profile.photoURL} alt={profile.displayName || memberId} />;
    }
    return <Avatar>{(profile?.displayName || memberId)[0]?.toUpperCase()}</Avatar>;
  };

  if (loading) return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh' }}>
      <CircularProgress />
    </Box>
  );
  
  if (!group) return <Typography>Group not found</Typography>;

  // Define function for showing an appropriate message when the server is offline
  const getServerStatusMessage = () => {
    if (serverStatus === 'offline') {
      return (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Backend server appears to be offline. Some features may be limited.
        </Alert>
      );
    }
    return null;
  };

  return (
    <Box sx={{ p: 3 }}>
      {getServerStatusMessage()}
      
      <Paper
        sx={{
          p: 3,
          mb: 3,
          backgroundImage: `url(${group.image})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          height: 200,
          display: 'flex',
          alignItems: 'flex-end',
          position: 'relative',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)'
          }
        }}
      >
        <Box sx={{ position: 'relative', color: 'white', zIndex: 1, width: '100%' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <Box>
              <Typography variant="h4" gutterBottom>{group.name}</Typography>
              <Typography variant="subtitle1">{group.description}</Typography>
            </Box>
            {group.creatorId === currentUser?.uid && (
              <IconButton
                onClick={handleDeleteGroup}
                sx={{ color: 'white', bgcolor: 'rgba(255,0,0,0.7)', '&:hover': { bgcolor: 'rgba(255,0,0,0.9)' } }}
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Chat Section */}
        <Grid item xs={12} md={4}>
          <Box 
            sx={{ 
              position: 'sticky',
              top: 16,
              zIndex: 10
            }}
          >
            <Card sx={{ 
              height: 'calc(100vh - 130px)', /* Increased height to fit more of the screen */
              maxHeight: '800px', /* Increased maximum height */
              display: 'flex', 
              flexDirection: 'column',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
            }}>
              <CardContent sx={{ 
                flexGrow: 1, 
                overflow: 'auto', 
                p: 2, 
                pb: 0, /* Remove bottom padding to avoid double padding with the List component */
                position: 'relative'
              }}>
                {/* Chat content remains the same */}
                <List>
                  {chatMessages.length > 0 ? (
                    chatMessages.map((msg) => (
                      <ListItem 
                        key={msg.id} 
                        sx={{ 
                          flexDirection: 'column', 
                          alignItems: msg.userId === currentUser?.uid ? 'flex-end' : 'flex-start',
                          mb: 1,
                          p: 0
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            maxWidth: '70%',
                          }}
                        >
                          {msg.userId !== currentUser?.uid && (
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5, ml: 1 }}>
                              <Avatar 
                                src={msg.photoURL} 
                                sx={{ width: 24, height: 24, mr: 1 }}
                              >
                                {msg.userName?.[0]?.toUpperCase() || 'U'}
                              </Avatar>
                              <Typography variant="caption" sx={{ fontWeight: 'bold' }}>
                                {msg.userName || getMemberDisplayName(msg.userId)}
                              </Typography>
                            </Box>
                          )}
                          <Box
                            sx={{
                              bgcolor: msg.userId === currentUser?.uid ? theme.palette.primary.main : theme.palette.background.paper,
                              color: msg.userId === currentUser?.uid ? 'black' : 'inherit', // Changed from white to black
                              p: 1.5,
                              borderRadius: 2,
                              boxShadow: 1
                            }}
                          >
                            <Typography variant="body1">{msg.text}</Typography>
                            <Typography variant="caption" sx={{ display: 'block', mt: 0.5, opacity: 0.7 }}>
                              {msg.timestamp?.toDate().toLocaleTimeString() || 'Sending...'}
                            </Typography>
                          </Box>
                        </Box>
                      </ListItem>
                    ))
                  ) : (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                      <Typography variant="body1" color="text.secondary">
                        No messages yet. Start the conversation!
                      </Typography>
                    </Box>
                  )}
                  <div ref={messagesEndRef} />
                </List>
              </CardContent>
              <Divider />
              <Box 
                component="form" 
                onSubmit={handleSendMessage} 
                sx={{ p: 2, display: 'flex', gap: 1, borderTop: `1px solid ${theme.palette.divider}` }}
              >
                <TextField
                  fullWidth
                  placeholder="Type a message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  variant="outlined"
                  size="small"
                  disabled={sendingMessage || !currentUser}
                />
                <Button 
                  type="submit" 
                  variant="contained" 
                  color="primary" 
                  disabled={!message.trim() || sendingMessage || !currentUser}
                  endIcon={<SendIcon />}
                >
                  Send
                </Button>
              </Box>
            </Card>
          </Box>
        </Grid>

        {/* Documents, Members, and Meetings - Now takes 2/3 of the space */}
        <Grid item xs={12} md={8}>
          <Grid container spacing={2}>
            {/* Document Section with Upload Functionality */}
            <Grid item xs={12} md={6}>
              <Card sx={{ mb: 3, height: '100%' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Documents</Typography>
                    <Button 
                      component="label" 
                      startIcon={uploading ? <CircularProgress size={16} /> : serverStatus === 'offline' ? <CloudUploadIcon /> : <UploadIcon />} 
                      variant="contained"
                      disabled={uploading}
                      color={serverStatus === 'offline' ? 'secondary' : 'primary'}
                      size="small"
                    >
                      {uploading ? 'Uploading...' : serverStatus === 'offline' ? 'Direct Upload' : 'Upload'}
                      <input 
                        type="file" 
                        hidden 
                        onChange={handleFileUpload}
                        ref={fileInputRef}
                        accept=".pdf,.doc,.docx,.txt,.ppt,.pptx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                      />
                    </Button>
                  </Box>
                  <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
                    {(group.documents || []).length > 0 ? (
                      group.documents.map((doc) => (
                        <ListItem 
                          key={doc.id} 
                          sx={{ 
                            bgcolor: theme.palette.background.paper, 
                            mb: 1, 
                            borderRadius: 1,
                            '&:hover': { bgcolor: theme.palette.action.hover }
                          }}
                          secondaryAction={
                            <>
                              <IconButton 
                                edge="end" 
                                aria-label="download"
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <DownloadIcon />
                              </IconButton>
                              {(doc.uploadedBy === currentUser?.uid || group.creatorId === currentUser?.uid) && (
                                <IconButton 
                                  edge="end" 
                                  aria-label="delete"
                                  onClick={() => handleDeleteDocument(doc.id)}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </>
                          }
                        >
                          <ListItemIcon><DescriptionIcon /></ListItemIcon>
                          <ListItemText 
                            primary={doc.name} 
                            secondary={`Uploaded by ${doc.uploadedBy === currentUser?.uid ? 'you' : getMemberDisplayName(doc.uploadedBy)}`}
                            primaryTypographyProps={{ noWrap: true, style: { maxWidth: '200px' } }}
                          />
                        </ListItem>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No documents uploaded yet
                      </Typography>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Members Section with Display Names and Activity Status */}
            <Grid item xs={12} md={6}>
              <Card sx={{ mb: 3, height: '100%', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">
                      Members ({group.members?.length || 0})
                    </Typography>
                    {group.creatorId === currentUser?.uid && (
                      <Button variant="outlined" size="small">
                        Manage
                      </Button>
                    )}
                  </Box>
                  <List sx={{ maxHeight: '300px', overflow: 'auto' }}>
                    {group.members?.map(memberId => {
                      const isCreator = memberId === group.creatorId;
                      const memberProfile = memberProfiles[memberId] || {};
                      const lastActive = memberProfile.lastActive?.toDate ? memberProfile.lastActive?.toDate() : null;
                      
                      // Determine activity status
                      let activityStatus = "No recent activity";
                      let statusColor = "text.secondary";
                      
                      if (lastActive) {
                        const now = new Date();
                        const diffMs = now - lastActive;
                        const diffMins = Math.floor(diffMs / (1000 * 60));
                        
                        if (diffMins < 5) {
                          activityStatus = "Active now";
                          statusColor = "success.main";
                        } else if (diffMins < 60) {
                          activityStatus = `Active ${diffMins} minutes ago`;
                          statusColor = "info.main";
                        } else if (diffMins < 24 * 60) {
                          const hours = Math.floor(diffMins / 60);
                          activityStatus = `Active ${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
                        } else {
                          const days = Math.floor(diffMins / (24 * 60));
                          activityStatus = `Active ${days} ${days === 1 ? 'day' : 'days'} ago`;
                        }
                      }
                      
                      return (
                        <ListItem 
                          key={memberId}
                          secondaryAction={
                            memberProfile.lastActive && (
                              <Box 
                                sx={{ 
                                  width: 8, 
                                  height: 8, 
                                  borderRadius: '50%', 
                                  bgcolor: statusColor === "success.main" ? "success.main" : "text.disabled"
                                }}
                              />
                            )
                          }
                        >
                          <ListItemAvatar>
                            {getMemberAvatar(memberId)}
                          </ListItemAvatar>
                          <ListItemText 
                            primary={getMemberDisplayName(memberId)} 
                            secondary={
                              <Typography variant="caption" sx={{ color: statusColor }}>
                                {isCreator ? "Group Creator • " : ""}{activityStatus}
                              </Typography>
                            } 
                          />
                        </ListItem>
                      );
                    })}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Meetings Section with Create Meeting Button */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="h6">Upcoming Meetings</Typography>
                    <Button 
                      variant="contained" 
                      startIcon={<EventIcon />}
                      onClick={() => setOpenMeetingDialog(true)}
                      size="small"
                    >
                      Schedule
                    </Button>
                  </Box>
                  <List sx={{ 
                    height: 'calc(min(100vh - 445px, 255px))', 
                    maxHeight: '260px', 
                    overflow: 'auto' 
                  }}>
                    {(meetings.length > 0) ? (
                      meetings.map((meeting) => (
                        <ListItem 
                          key={meeting.id} 
                          sx={{ 
                            bgcolor: theme.palette.background.paper, 
                            mb: 1, 
                            borderRadius: 1,
                            flexDirection: 'column',
                            alignItems: 'flex-start',
                            padding: 2
                          }}
                          secondaryAction={
                            (meeting.createdBy === currentUser?.uid || group.creatorId === currentUser?.uid) && (
                              <IconButton 
                                edge="end" 
                                aria-label="delete"
                                onClick={() => handleDeleteMeeting(meeting.id)}
                              >
                                <DeleteIcon />
                              </IconButton>
                            )
                          }
                        >
                          <Box sx={{ display: 'flex', width: '100%', mb: 1 }}>
                            <ListItemIcon sx={{ minWidth: '40px' }}><EventIcon /></ListItemIcon>
                            <ListItemText 
                              primary={meeting.title} 
                              secondary={formatDate(meeting.date)}
                            />
                          </Box>
                          {meeting.description && (
                            <Typography variant="body2" color="text.secondary" sx={{ pl: 5, mb: 1 }}>
                              {meeting.description}
                            </Typography>
                          )}
                          {meeting.link && (
                            <Button 
                              variant="outlined" 
                              size="small" 
                              sx={{ ml: 5 }}
                              href={meeting.link}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              Join Meeting
                            </Button>
                          )}
                        </ListItem>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
                        No upcoming meetings
                      </Typography>
                    )}
                  </List>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Meeting Creation Dialog */}
      <Dialog 
        open={openMeetingDialog} 
        onClose={() => setOpenMeetingDialog(false)} 
        maxWidth="sm" 
        fullWidth
        aria-labelledby="meeting-dialog-title"
        disableEnforceFocus={false}
        disableAutoFocus={false}
        aria-modal={true}
        closeAfterTransition
      >
        <DialogTitle id="meeting-dialog-title">Schedule New Meeting</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              fullWidth
              label="Meeting Title"
              value={newMeeting.title}
              onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
              required
            />
            <TextField
              fullWidth
              label="Description"
              value={newMeeting.description}
              onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
              multiline
              rows={3}
            />
            <TextField
              fullWidth
              label="Meeting Date"
              type="datetime-local"
              value={newMeeting.date instanceof Date 
                ? newMeeting.date.toISOString().slice(0, 16) 
                : new Date().toISOString().slice(0, 16)}
              onChange={(e) => setNewMeeting(prev => ({ 
                ...prev, 
                date: new Date(e.target.value) 
              }))}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Meeting Link (optional)"
              value={newMeeting.link}
              onChange={(e) => setNewMeeting(prev => ({ ...prev, link: e.target.value }))}
              placeholder="e.g., Zoom or Google Meet URL"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenMeetingDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleCreateMeeting} 
            variant="contained"
            disabled={!newMeeting.title || !currentUser}
          >
            Schedule
          </Button>
        </DialogActions>
      </Dialog>

      {/* Error Snackbar */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        aria-live="assertive"
        role="status"
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
