import React from 'react';
import { createDrawerNavigator } from '@react-navigation/drawer';
import DashboardScreen from '../screens/DashboardScreen';
import GroupDetails from '../screens/GroupDetailsScreen'
import CustomDrawerContent from './CustomDrawerContent';
import { Button } from 'react-native-paper';

const Drawer = createDrawerNavigator();

export default function DrawerNavigator() {
  return (
    <Drawer.Navigator
      drawerContent={(props) => <CustomDrawerContent {...props} />}
      screenOptions={({ navigation }) => ({
        headerShown: true, 
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
      })}
    >
      <Drawer.Screen name="Dashboard" component={DashboardScreen} />
      <Drawer.Screen name="GroupDetails" component={GroupDetails} />

      {/* Other screens */}
    </Drawer.Navigator>
  );
}


