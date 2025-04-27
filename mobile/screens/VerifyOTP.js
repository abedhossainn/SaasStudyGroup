import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const { verifyOTP, loading, error, email, resendOTP } = useAuth();
  const navigation = useNavigation();

  const handleSubmit = async () => {
    setOtpError('');

    if (!otp) {
      setOtpError('Please enter the OTP');
      return;
    }

    try {
      await verifyOTP(email, otp);
      navigation.navigate('Dashboard');
    } catch (err) {
      console.error('Error verifying OTP:', err);
    }
  };

  const handleResendOTP = async () => {
    try {
      await resendOTP(email);
      Alert.alert('OTP Sent', 'A new OTP has been sent to your email.');
    } catch (err) {
      console.error('Error resending OTP:', err);
    }
  };

  const handleGoBack = () => {
    navigation.navigate('Login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.box}>
        <Text style={styles.title}>Verify OTP</Text>
        <Text style={styles.subText}>
          Please check your email ({email}) for the OTP
        </Text>

        {error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : null}

        <TextInput
          style={[styles.input, otpError && styles.inputError]}
          placeholder="Enter OTP"
          value={otp}
          onChangeText={setOtp}
          keyboardType="numeric"
        />
        {otpError ? <Text style={styles.helperText}>{otpError}</Text> : null}

        <TouchableOpacity
          style={[styles.button, styles.primary]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Verify OTP</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.outlined]}
          onPress={handleResendOTP}
          disabled={loading}
        >
          <Text style={styles.outlinedText}>Resend OTP</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.textButton}
          onPress={handleGoBack}
          disabled={loading}
        >
          <Text style={styles.textLink}>Go back to login page</Text>
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
    marginBottom: 12,
  },
  subText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    color: '#555',
  },
  input: {
    borderWidth: 1,
    borderColor: '#999',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    fontSize: 16,
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
    marginBottom: 16,
    textAlign: 'center',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  primary: {
    backgroundColor: '#1976d2',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  outlined: {
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  outlinedText: {
    color: '#1976d2',
    fontWeight: 'bold',
  },
  textButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  textLink: {
    color: '#1976d2',
    fontSize: 14,
  },
});

export default VerifyOTP;