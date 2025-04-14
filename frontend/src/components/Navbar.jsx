import { useState, useEffect } from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Badge,
  Avatar,
  Menu,
  MenuItem,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  Dashboard as DashboardIcon,
  Group as GroupIcon,
  Message as MessageIcon,
  DateRange as CalendarIcon,
  Person as ProfileIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { subscribeToNotifications } from '../services/notificationService';

const navItems = [
  { text: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
  { text: 'Study Groups', icon: <GroupIcon />, path: '/study-groups' },
  { text: 'Messages', icon: <MessageIcon />, path: '/messages' },
  { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
];

// Increased drawer width to eliminate horizontal bar issues
const drawerWidth = 300;

export default function Navbar() {
  const theme = useTheme();
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  
  useEffect(() => {
    if (!currentUser) return;
    
    // Subscribe to notifications to get unread count
    const unsubscribe = subscribeToNotifications(currentUser.uid, (notifications) => {
      const unreadCount = notifications.filter(n => !n.read).length;
      setUnreadNotifications(unreadCount);
    });
    
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [currentUser]);
  
  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };
  
  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchor(event.currentTarget);
  };
  
  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };
  
  const handleLogout = async () => {
    try {
      await logout();
      handleProfileMenuClose();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const drawer = (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
        <Typography variant="h6" component="div" sx={{ fontWeight: 'bold' }}>
          SaasStudyGroup
        </Typography>
      </Box>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItem 
            button 
            component={RouterLink} 
            to={item.path} 
            key={item.text}
            selected={isActive(item.path)}
            onClick={isMobile ? handleDrawerToggle : undefined}
            sx={{
              backgroundColor: isActive(item.path) ? 'rgba(0, 0, 0, 0.08)' : 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
              }
            }}
          >
            <ListItemIcon sx={{ color: isActive(item.path) ? 'primary.main' : 'text.secondary' }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              primaryTypographyProps={{ 
                fontWeight: isActive(item.path) ? 'medium' : 'regular',
                color: isActive(item.path) ? 'primary.main' : 'text.primary' 
              }} 
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );

  const profileMenu = (
    <Menu
      anchorEl={profileMenuAnchor}
      open={Boolean(profileMenuAnchor)}
      onClose={handleProfileMenuClose}
      keepMounted
      transformOrigin={{ horizontal: 'right', vertical: 'top' }}
      anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
    >
      <MenuItem 
        component={RouterLink} 
        to="/profile" 
        onClick={handleProfileMenuClose}
      >
        <ListItemIcon>
          <ProfileIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Profile</ListItemText>
      </MenuItem>
      <MenuItem 
        component={RouterLink} 
        to="/settings" 
        onClick={handleProfileMenuClose}
      >
        <ListItemIcon>
          <SettingsIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Settings</ListItemText>
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <ListItemIcon>
          <LogoutIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText>Logout</ListItemText>
      </MenuItem>
    </Menu>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" elevation={1} color="default" sx={{ 
        zIndex: theme.zIndex.drawer + 1,
        width: { md: `calc(100% - ${isMobile ? 0 : drawerWidth}px)` },
        ml: { md: `${isMobile ? 0 : drawerWidth}px` }
      }}>
        <Toolbar>
          {isMobile && (
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}
          
          <Typography variant="h6" component="div" sx={{ display: { xs: 'none', sm: 'block' }, fontWeight: 'bold' }}>
            SaasStudyGroup
          </Typography>
          
          <Box sx={{ flexGrow: 1 }} />
          
          {!isMobile && (
            <Box sx={{ display: 'flex' }}>
              {navItems.map((item) => (
                <Button
                  key={item.text}
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    color: isActive(item.path) ? 'primary.main' : 'text.primary',
                    mx: 1,
                    minWidth: '120px',
                    fontWeight: isActive(item.path) ? 'medium' : 'regular',
                    textAlign: 'center',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                  startIcon={item.icon}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
          )}
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              component={RouterLink}
              to="/notifications"
              aria-label="notifications"
              sx={{ ml: 1 }}
            >
              <Badge badgeContent={unreadNotifications} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            
            <IconButton
              onClick={handleProfileMenuOpen}
              color="inherit"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              sx={{ ml: 1 }}
            >
              <Avatar
                alt={currentUser?.displayName || 'User'}
                src={currentUser?.photoURL}
                sx={{ width: 32, height: 32 }}
              />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      {profileMenu}
      
      {/* Mobile drawer - temporary */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawer}
      </Drawer>
      
      {/* Desktop drawer - permanent */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': { 
            boxSizing: 'border-box', 
            width: drawerWidth,
            borderRight: '1px solid rgba(0, 0, 0, 0.12)'
          },
        }}
        open
      >
        {drawer}
      </Drawer>
      
      {/* Main content wrapper with proper spacing */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${drawerWidth}px)` },
          mt: `${theme.mixins.toolbar.minHeight}px`
        }}
      >
        {/* Toolbar for spacing below AppBar */}
        <Toolbar sx={{ display: { xs: 'block', md: 'none' } }} />
      </Box>
    </Box>
  );
}