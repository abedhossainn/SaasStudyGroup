import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Provider as PaperProvider } from 'react-native-paper';
import DrawerNavigator from '../navigation/DrawerNavigator';
import LoginScreen from '../screens/LoginScreen';
import Dashboard from '../screens/DashboardScreen';
import VerifyOTP from '../screens/VerifyOTP';
import RequestOTP from '../screens/RequestOTP';

import { AuthProvider, useAuth } from '../contexts/AuthContext';

const Stack = createNativeStackNavigator();

function AuthStack() {
  return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="RequestOTP" component={RequestOTP} />
        <Stack.Screen name="VerifyOTP" component={VerifyOTP} />
      </Stack.Navigator>
  );
}

function AppStack() {
  return (
    <PaperProvider>
      <DrawerNavigator />
    </PaperProvider>
  );
}

function RootNavigator() {
  const { currentUser, loading } = useAuth();

  if (loading) return null; 

  return currentUser ? <AppStack /> : <AuthStack />;
}


const App = () => {
  return (
    
    <AuthProvider>
      <RootNavigator />
    </AuthProvider>
  );
}

export default App;