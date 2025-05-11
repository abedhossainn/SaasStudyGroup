import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const RequestOTP = () => {
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const { requestOTP, loading, error } = useAuth();
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    // If email is passed from signup, set it and automatically request OTP
    if (route.params?.email) {
      setEmail(route.params.email);
      handleSubmit(route.params.email);
    }
  }, [route.params]);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSubmit = async (emailToUse = email) => {
    setEmailError('');

    if (!validateEmail(emailToUse)) {
      setEmailError('Please enter a valid email address');
      return;
    }

    try {
      await requestOTP(emailToUse);
      navigation.navigate('VerifyOTP', { email: emailToUse });
    } catch (err) {
      console.error('Error requesting OTP:', err);
      Alert.alert('Error', err.message || 'Failed to request OTP');
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>Request OTP</Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        <TextInput
          style={[styles.input, emailError && styles.inputError]}
          placeholder="Email Address"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
          editable={!route.params?.email} // Disable editing if email is passed from signup
        />
        {emailError ? <Text style={styles.helperText}>{emailError}</Text> : null}

        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={() => handleSubmit()}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send OTP</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    paddingHorizontal: 24,
    flexGrow: 1,
    justifyContent: 'center',
    backgroundColor: '#fff',
  },
  box: {
    backgroundColor: '#f9f9f9',
    padding: 24,
    borderRadius: 12,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  inputError: {
    borderColor: 'red',
  },
  helperText: {
    color: 'red',
    marginBottom: 10,
  },
  errorText: {
    color: 'red',
    textAlign: 'center',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  primary: {
    backgroundColor: '#1976d2',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default RequestOTP;
