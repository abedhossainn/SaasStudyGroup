import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  Stack,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const VerifyOTP = () => {
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const { verifyOTP, loading, error, email, resendOTP } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');

    if (!otp) {
      setOtpError('Please enter the OTP');
      return;
    }

    try {
      await verifyOTP(email, otp);
      navigate('/dashboard');
    } catch (error) {
      console.error('Error verifying OTP:', error);
    }
  };

  const handleResendOTP = async () => {
    try {
      await resendOTP(email);
      // Show success message or handle as needed
    } catch (error) {
      console.error('Error resending OTP:', error);
    }
  };

  const handleGoBack = () => {
    navigate('/login');
  };

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%' }}>
          <Typography component="h1" variant="h5" align="center" gutterBottom>
            Verify OTP
          </Typography>
          <Typography variant="body2" align="center" sx={{ mb: 2 }}>
            Please check your email ({email}) for the OTP
          </Typography>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <TextField
              margin="normal"
              required
              fullWidth
              id="otp"
              label="OTP"
              name="otp"
              autoComplete="off"
              autoFocus
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              error={!!otpError}
              helperText={otpError}
            />
            <Stack direction="column" spacing={2} sx={{ mt: 3 }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
              >
                {loading ? 'Verifying...' : 'Verify OTP'}
              </Button>
              <Button
                fullWidth
                variant="outlined"
                onClick={handleResendOTP}
                disabled={loading}
              >
                Resend OTP
              </Button>
              <Button
                fullWidth
                variant="text"
                onClick={handleGoBack}
                disabled={loading}
              >
                Go back to login page
              </Button>
            </Stack>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default VerifyOTP; 