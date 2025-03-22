import { useState } from 'react';
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
  Switch,
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

const drawerWidth = 240;

export default function Layout({ toggleTheme, mode }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [open, setOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);

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
    { text: 'Messages', icon: <MessageIcon />, path: '/messages', badge: 3 },
    { text: 'Notifications', icon: <NotificationsIcon />, path: '/notifications', badge: 5 },
    { text: 'Settings', icon: <SettingsIcon />, path: '/settings' }
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* App Bar */}
      <AppBar
        position="fixed"
        sx={{
          zIndex: theme.zIndex.drawer + 1,
          bgcolor: theme.palette.primary.main,
          color: theme.palette.mode === 'light' ? 'black' : 'white'
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/image.png" alt="Logo" style={{ height: 40 }} />
            <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 600 }}>
              Study Groups
            </Typography>
          </Box>

          <Box sx={{ flexGrow: 1 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton color="inherit" onClick={toggleTheme}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>

            <IconButton
              onClick={handleProfileMenuOpen}
              sx={{ padding: 0.5 }}
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
          transition: theme.transitions.create('width', {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          '& .MuiDrawer-paper': {
            width: open ? drawerWidth : 72,
            overflowX: 'hidden',
            transition: theme.transitions.create('width', {
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
        <Box sx={{ overflow: 'auto', py: 2 }}>
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
                {open && <ListItemText primary={item.text} />}
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
