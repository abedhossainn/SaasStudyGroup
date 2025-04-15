import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  Divider,
  IconButton,
  useTheme,
  Alert,
  useMediaQuery,
  Stack
} from '@mui/material';
import {
  Google as GoogleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const navigate = useNavigate();
  const { login, googleSignIn, signup, error: authError } = useAuth();
  
  // Login states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  
  // Signup states
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isLoginView, setIsLoginView] = useState(true);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setError('');
      setLoading(true);
      const result = await login(email, password);
      if (result && result.success) {
        navigate('/verify-otp');
      }
    } catch (error) {
      setError(error.message || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!signupEmail || !signupPassword || !displayName) {
      setError('Please fill in all fields');
      return;
    }
    
    try {
      setError('');
      setLoading(true);
      const result = await signup(signupEmail, signupPassword, displayName);
      if (result && result.success) {
        navigate('/verify-otp');
      }
    } catch (error) {
      setError(error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError('');
      setLoading(true);
      await googleSignIn();
      navigate('/dashboard');
    } catch (error) {
      setError(error.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const toggleView = () => {
    setIsLoginView(!isLoginView);
    setError('');
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: theme.palette.background.default,
        overflow: 'hidden'
      }}
    >
      <Container 
        maxWidth="lg" 
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          py: { xs: 2, md: 3 }
        }}
      >
        {/* Company Logo and Title */}
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            mb: { xs: 2, md: 4 }
          }}
        >
          <Box
            component="img"
            src="/image.png"
            alt="SaaS Study Group Logo"
            sx={{
              width: { xs: 80, sm: 100, md: 120 },
              height: 'auto',
              mb: { xs: 1, md: 2 }
            }}
          />
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              textAlign: 'center',
              color: 'black',
              fontFamily: '"Poppins", "Roboto", "Arial", sans-serif',
              letterSpacing: '0.5px',
              mb: { xs: 1, md: 2 }
            }}
          >
            SaaS Study Group
          </Typography>
        </Box>

        {(error || authError) && (
          <Alert 
            severity="error" 
            sx={{ 
              position: 'fixed', 
              top: 16, 
              right: 16, 
              zIndex: 1000,
              maxWidth: '90vw'
            }}
          >
            {error || authError}
          </Alert>
        )}
        
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={{ xs: 2, md: 3 }}
          sx={{ 
            flex: 1,
            maxHeight: { xs: 'calc(100vh - 200px)', md: 'calc(100vh - 250px)' }
          }}
        >
          {/* Login Section */}
          <Box
            sx={{
              flex: 1,
              bgcolor: theme.palette.primary.main,
              borderRadius: 4,
              p: { xs: 2, sm: 3 },
              display: isMobile && !isLoginView ? 'none' : 'block',
              overflow: 'auto'
            }}
          >
            <Typography variant="h4" component="h2" gutterBottom sx={{ 
              color: 'black', 
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              mb: 1
            }}>
              Login
            </Typography>

            <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
              <Typography sx={{ color: 'black', mb: 0.5, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                Email
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={{
                  mb: 2,
                  bgcolor: 'white',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { border: 'none' }
                  }
                }}
                size={isMobile ? "small" : "medium"}
              />

              <Typography sx={{ color: 'black', mb: 0.5, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                Password
              </Typography>
              <TextField
                fullWidth
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{
                  mb: 1,
                  bgcolor: 'white',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { border: 'none' }
                  }
                }}
                size={isMobile ? "small" : "medium"}
              />

              <FormControlLabel
                control={
                  <Checkbox
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    sx={{
                      color: 'black',
                      '&.Mui-checked': { color: 'black' }
                    }}
                    size={isMobile ? "small" : "medium"}
                  />
                }
                label="Remember Me?"
                sx={{ 
                  color: 'black', 
                  mb: 1,
                  '& .MuiFormControlLabel-label': {
                    fontSize: { xs: '0.875rem', md: '1rem' }
                  }
                }}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  mb: 1,
                  bgcolor: 'white',
                  color: 'black',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }}
                size={isMobile ? "small" : "medium"}
              >
                {loading ? 'Signing in...' : 'Continue'}
              </Button>

              <Typography
                component="a"
                href="#"
                sx={{
                  display: 'block',
                  textAlign: 'center',
                  color: 'black',
                  textDecoration: 'none',
                  mb: 2,
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }}
              >
                Forgot Password
              </Typography>

              <Divider sx={{ my: 2, color: 'black' }}>Or</Divider>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <IconButton
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  sx={{
                    color: 'black',
                    border: '2px solid black',
                    borderRadius: '50%',
                    p: 1
                  }}
                  size={isMobile ? "small" : "medium"}
                >
                  <GoogleIcon />
                </IconButton>
              </Box>

              {isMobile && (
                <Button
                  fullWidth
                  onClick={toggleView}
                  sx={{
                    mt: 2,
                    color: 'black',
                    textDecoration: 'underline',
                    fontSize: { xs: '0.875rem', md: '1rem' }
                  }}
                  size="small"
                >
                  Don't have an account? Sign up
                </Button>
              )}
            </Box>
          </Box>

          {/* Sign Up Section */}
          <Box
            sx={{
              flex: 1,
              bgcolor: theme.palette.primary.main,
              borderRadius: 4,
              p: { xs: 2, sm: 3 },
              display: isMobile && isLoginView ? 'none' : 'block',
              overflow: 'auto'
            }}
          >
            <Typography variant="h4" component="h2" gutterBottom sx={{ 
              color: 'black', 
              fontWeight: 600,
              fontSize: { xs: '1.5rem', sm: '1.75rem' },
              mb: 1
            }}>
              Create an account
            </Typography>

            <Box component="form" onSubmit={handleSignup} sx={{ mt: 1 }}>
              <Typography sx={{ color: 'black', mb: 0.5, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                Display Name
              </Typography>
              <TextField
                fullWidth
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                sx={{
                  mb: 2,
                  bgcolor: 'white',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { border: 'none' }
                  }
                }}
                size={isMobile ? "small" : "medium"}
              />

              <Typography sx={{ color: 'black', mb: 0.5, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                Email
              </Typography>
              <TextField
                fullWidth
                type="email"
                value={signupEmail}
                onChange={(e) => setSignupEmail(e.target.value)}
                sx={{
                  mb: 2,
                  bgcolor: 'white',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { border: 'none' }
                  }
                }}
                size={isMobile ? "small" : "medium"}
              />

              <Typography sx={{ color: 'black', mb: 0.5, fontSize: { xs: '0.875rem', md: '1rem' } }}>
                Password
              </Typography>
              <TextField
                fullWidth
                type="password"
                value={signupPassword}
                onChange={(e) => setSignupPassword(e.target.value)}
                sx={{
                  mb: 2,
                  bgcolor: 'white',
                  borderRadius: 1,
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': { border: 'none' }
                  }
                }}
                size={isMobile ? "small" : "medium"}
              />

              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{
                  bgcolor: 'white',
                  color: 'black',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                  fontSize: { xs: '0.875rem', md: '1rem' }
                }}
                size={isMobile ? "small" : "medium"}
              >
                {loading ? 'Creating Account...' : 'Sign Up'}
              </Button>

              {isMobile && (
                <Button
                  fullWidth
                  onClick={toggleView}
                  sx={{
                    mt: 2,
                    color: 'black',
                    textDecoration: 'underline',
                    fontSize: { xs: '0.875rem', md: '1rem' }
                  }}
                  size="small"
                >
                  Already have an account? Login
                </Button>
              )}
            </Box>
          </Box>
        </Stack>
      </Container>
    </Box>
  );
}