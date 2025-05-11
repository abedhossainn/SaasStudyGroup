import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import DashboardScreen from '../screens/DashboardScreen';
import GroupDetails from '../screens/GroupDetailsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import CustomDrawerContent from './CustomDrawerContent';
import { Button, IconButton, Avatar} from 'react-native-paper';
import { TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import CalendarScreen from '../screens/CalendarScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import SettingsScreen from '../screens/SettingsScreen';
import MessagesScreen from '../screens/MessagesScreen';
const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  const { currentUser } = useAuth();
  
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true,
        headerTitle: '',
        drawerPosition: 'left',
        drawerType: 'slide',
        headerLeft: () => (
          <Button
            icon="menu"
            onPress={() => navigation.openDrawer()}
            style={{ marginLeft: 10 }}
          >
            Menu
          </Button>
        ),
        headerRight: () => (
          <TouchableOpacity
          onPress={() => navigation.navigate('ProfileScreen')}
          style={{ marginRight: 10 }}
        >
          {currentUser?.Avatar ? (
            <Image
              source={{ uri: currentUser.Avatar }}
              style={{ width: 32, height: 32, borderRadius: 16 }}
            />
          ) : (
            <Avatar.Icon size={32} icon="account-circle" />
          )}
        </TouchableOpacity>
        )
      })}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="GroupDetails" component={GroupDetails} />
      <Drawer.Screen name="ProfileScreen" component={ProfileScreen} />
      <Drawer.Screen name="Calendar" component={CalendarScreen} />
      <Drawer.Screen name="Notifications" component={NotificationsScreen} />
      <Drawer.Screen name="Settings" component={SettingsScreen} />
      <Drawer.Screen name="Messages" component={MessagesScreen} />

    </Drawer.Navigator>
  );
}


