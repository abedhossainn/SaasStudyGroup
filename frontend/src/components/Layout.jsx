import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  Typography,
  Divider,
  IconButton,
  ListItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Message as MessageIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  AccountCircle as AccountCircleIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useThemeContext } from '../contexts/ThemeContext';
import { db } from '../firebase';
import {
  collection,
  query,
  onSnapshot,
  where
} from 'firebase/firestore';

const drawerWidth = 240;

export default function Layout() {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const { mode, toggleTheme } = useThemeContext();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);

  // Effect to track unread messages
  useEffect(() => {
    if (!currentUser?.uid) return;

    const q = query(
      collection(db, 'messages'),
      where('to', '==', currentUser.uid),
      where('seen', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadMessageCount(snapshot.docs.length);
    });

    return () => unsubscribe();
  }, [currentUser]);

  // Effect to track unread notifications
  useEffect(() => {
    if (!currentUser?.uid) return;

    // Set up a real-time listener for unread notifications
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'notifications'),
        where('userId', '==', currentUser.uid),
        where('read', '==', false)
      ),
      (snapshot) => {
        setNotificationCount(snapshot.docs.length);
      }
    );

    return () => unsubscribe();
  }, [currentUser]);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: '/' },
    { text: 'Calendar', icon: <CalendarIcon />, path: '/calendar' },
    { 
      text: 'Messages', 
      icon: <MessageIcon />, 
      path: '/messages', 
      badge: unreadMessageCount > 0 ? unreadMessageCount : null 
    },
    { 
      text: 'Notifications', 
      icon: <NotificationsIcon />, 
      path: '/notifications', 
      badge: notificationCount > 0 ? notificationCount : null 
    },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', overflow: 'hidden' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.mode === 'light' ? 'black' : 'white',
          width: '100%'
        }}
      >
        <Toolbar sx={{ pr: { xs: 1, sm: 2 } }}>
          <IconButton
            color="inherit"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
            <img src="/image.png" alt="Logo" style={{ height: 40 }} />
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                fontWeight: 600,
                display: { xs: 'none', sm: 'block' }
              }}
            >
              Study Groups
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 1, sm: 2 } }}>
            {/* Message notification in toolbar */}
            <IconButton 
              color="inherit" 
              onClick={() => navigate('/messages')}
              size="large"
            >
              <Badge badgeContent={unreadMessageCount} color="error">
                <MessageIcon />
              </Badge>
            </IconButton>
            
            {/* Notification icon in toolbar */}
            <IconButton 
              color="inherit" 
              onClick={() => navigate('/notifications')}
              size="large"
            >
              <Badge badgeContent={notificationCount} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
            
            <IconButton 
              color="inherit" 
              onClick={toggleTheme}
              size="large"
            >
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{ 
                padding: 0.5,
                ml: { xs: 0.5, sm: 1 }
              }}
            >
              <Avatar
                src={currentUser?.avatar}
                alt={currentUser?.name}
                sx={{ width: 40, height: 40 }}
              />
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>

      {/* Profile Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        aria-hidden={false} // Ensure this isn't hidden from screen readers
        disableEnforceFocus={false} // Make sure focus is properly trapped
        disableAutoFocus={false} 
        MenuListProps={{
          'aria-labelledby': 'profile-button',
          role: 'menu',
        }}
      >
        <MenuItem onClick={() => { navigate('/profile'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <AccountCircleIcon />
          </ListItemIcon>
          <ListItemText primary="Profile" />
        </MenuItem>
        <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <SettingsIcon />
          </ListItemIcon>
          <ListItemText primary="Settings" />
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemText primary="Logout" />
        </MenuItem>
      </Menu>

      {/* Drawer */}
      <Drawer
        variant="permanent"
        open={open}
        sx={{
          width: open ? drawerWidth : 72,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 72,
            overflowX: 'hidden',
            transition: theme.transitions.create(['width'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            boxSizing: 'border-box',
            bgcolor: theme.palette.primary.main,
            borderRight: 'none'
          },
        }}
      >
        <Toolbar />
        <Box sx={{ 
          overflow: 'hidden',
          py: 2
        }}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => {
                  navigate(item.path);
                  if (isMobile) setOpen(false);
                }}
                selected={location.pathname === item.path}
                sx={{
                  mb: 1,
                  mx: 1,
                  borderRadius: 1,
                  minHeight: 48,
                  px: 2.5,
                  justifyContent: open ? 'initial' : 'center',
                  color: theme.palette.mode === 'light' ? 'black' : 'white',
                  '&.Mui-selected': {
                    bgcolor: 'rgba(0, 0, 0, 0.1)',
                    color: theme.palette.mode === 'light' ? 'black' : 'white',
                    '&:hover': {
                      bgcolor: 'rgba(0, 0, 0, 0.2)'
                    }
                  },
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.1)'
                  }
                }}
              >
                <ListItemIcon 
                  sx={{ 
                    color: 'inherit',
                    minWidth: 0,
                    mr: open ? 2 : 'auto',
                    justifyContent: 'center'
                  }}
                >
                  {item.badge ? (
                    <Badge badgeContent={item.badge} color="error">
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                {open && (
                  <ListItemText 
                    primary={item.text} 
                    sx={{ 
                      opacity: open ? 1 : 0,
                      overflow: 'hidden'
                    }} 
                  />
                )}
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: theme.palette.background.default,
          minHeight: '100vh',
          p: 3
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}