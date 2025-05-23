import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { DrawerContentScrollView } from '@react-navigation/drawer';
import Icon from 'react-native-vector-icons/MaterialIcons';

const navItems = [
  { text: 'Dashboard', icon: 'dashboard', path: 'Dashboard' },
  { text: 'Messages', icon: 'message', path: 'Messages' },
  { text: 'Calendar', icon: 'date-range', path: 'Calendar' },
  { text: 'Notifications', icon: 'notifications', path: 'Notifications' },
  { text: 'Settings', icon: 'settings', path: 'Settings' },
];

export default function CustomDrawerContent({ navigation }) {
  return (
    <DrawerContentScrollView contentContainerStyle={{ flex: 1 }}>
      <View style={styles.drawerContent}>
        {navItems.map((item) => (
          <TouchableOpacity
            key={item.text}
            style={styles.drawerItem}
            onPress={() => navigation.navigate(item.path)}
          >
            <Icon name={item.icon} size={24} style={styles.drawerIcon} />
            <Text style={styles.drawerText}>{item.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </DrawerContentScrollView>
  );
}

const styles = StyleSheet.create({
  drawerContent: {
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  drawerIcon: {
    marginRight: 16,
  },
  drawerText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});
