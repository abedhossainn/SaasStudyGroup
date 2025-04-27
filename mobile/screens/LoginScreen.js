import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView } from 'react-native';
import { TextInput, Button, Checkbox, IconButton, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const { login, googleSignIn, signup, error: authError } = useAuth();
  const navigation = useNavigation();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const result = await login(email, password);
      if (result?.success) {
        navigation.navigate('VerifyOTP');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async () => {
    if (!signupEmail || !signupPassword || !displayName) {
      setError('Please fill in all fields');
      return;
    }
    try {
      setLoading(true);
      setError('');
      const result = await signup(signupEmail, signupPassword, displayName);
      if (result?.success) {
        navigation.navigate('VerifyOTP');
      }
    } catch (err) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Image source={require('@frontend/public/image.png')} style={styles.logo} />
      <Text style={styles.title}>SaaS Study Group</Text>

      {(error || authError) && (
        <Text style={styles.error}>{error || authError}</Text>
      )}

      {isLoginView ? (
        <>
          <TextInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            style={styles.input}
          />
          <View style={styles.checkboxContainer}>
            <Checkbox
              status={rememberMe ? 'checked' : 'unchecked'}
              onPress={() => setRememberMe(!rememberMe)}
            />
            <Text style={styles.checkboxLabel}>Remember Me?</Text>
          </View>
          <Button mode="contained" onPress={handleLogin} loading={loading} style={styles.button}>
            {loading ? 'Signing in...' : 'Continue'}
          </Button>
          <TouchableOpacity onPress={() => setIsLoginView(false)}>
            <Text style={styles.switchText}>Don't have an account? Sign up</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <TextInput
            label="Display Name"
            value={displayName}
            onChangeText={setDisplayName}
            style={styles.input}
          />
          <TextInput
            label="Email"
            value={signupEmail}
            onChangeText={setSignupEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
          />
          <TextInput
            label="Password"
            value={signupPassword}
            onChangeText={setSignupPassword}
            secureTextEntry
            style={styles.input}
          />
          <Button mode="contained" onPress={handleSignup} loading={loading} style={styles.button}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Button>
          <TouchableOpacity onPress={() => setIsLoginView(true)}>
            <Text style={styles.switchText}>Already have an account? Login</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
    flexGrow: 1,
    backgroundColor: '#f5f5f5',
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  input: {
    width: '100%',
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
    width: '100%',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  checkboxLabel: {
    fontSize: 14,
  },
  switchText: {
    marginTop: 12,
    color: 'blue',
    textDecorationLine: 'underline',
  },
  error: {
    color: 'red',
    marginBottom: 8,
  },
});

