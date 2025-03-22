import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  useTheme
} from '@mui/material';
import {
  Google as GoogleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const theme = useTheme();
  const navigate = useNavigate();
  const { login, googleSignIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await login(email, password);
      navigate('/');
    } catch (error) {
      setError('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        bgcolor: theme.palette.background.default,
        py: 4
      }}
    >
      <Container maxWidth="lg" sx={{ display: 'flex', gap: 4 }}>
        {/* Left Side - Login */}
        <Box
          sx={{
            flex: 1,
            bgcolor: theme.palette.primary.main,
            borderRadius: 4,
            p: 4
          }}
        >
          <Typography variant="h4" component="h1" gutterBottom sx={{ color: 'black', fontWeight: 600 }}>
            Login
          </Typography>

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Typography sx={{ color: 'black', mb: 1 }}>Email</Typography>
            <TextField
              fullWidth
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={{
                mb: 3,
                bgcolor: 'white',
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { border: 'none' }
                }
              }}
            />

            <Typography sx={{ color: 'black', mb: 1 }}>Password</Typography>
            <TextField
              fullWidth
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                mb: 2,
                bgcolor: 'white',
                borderRadius: 1,
                '& .MuiOutlinedInput-root': {
                  '& fieldset': { border: 'none' }
                }
              }}
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
                />
              }
              label="Remember Me?"
              sx={{ color: 'black', mb: 2 }}
            />

            <Button
              fullWidth
              type="submit"
              variant="contained"
              disabled={loading}
              sx={{
                mb: 2,
                bgcolor: 'white',
                color: 'black',
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
              }}
            >
              Continue
            </Button>

            <Typography
              component={Link}
              to="/forgot-password"
              sx={{
                display: 'block',
                textAlign: 'center',
                color: 'black',
                textDecoration: 'none',
                mb: 3
              }}
            >
              Forgot Password
            </Typography>

            <Divider sx={{ my: 3, color: 'black' }}>Or</Divider>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <IconButton
                onClick={googleSignIn}
                sx={{
                  color: 'black',
                  border: '2px solid black',
                  borderRadius: '50%',
                  p: 1
                }}
              >
                <GoogleIcon />
              </IconButton>
            </Box>

            <Typography
              sx={{
                mt: 3,
                textAlign: 'center',
                color: 'black'
              }}
            >
              Don't have an account? <Link to="/signup" style={{ color: 'black' }}>Sign Up</Link>
            </Typography>
          </Box>
        </Box>

        {/* Right Side - Create Account */}
        <Box
          sx={{
            flex: 1,
            bgcolor: theme.palette.primary.main,
            borderRadius: 4,
            p: 4
          }}
        >
          <Typography variant="h4" component="h2" gutterBottom sx={{ color: 'black', fontWeight: 600 }}>
            Create an account
          </Typography>

          <Typography sx={{ color: 'black', mb: 1 }}>Email</Typography>
          <TextField
            fullWidth
            type="email"
            sx={{
              mb: 2,
              bgcolor: 'white',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { border: 'none' }
              }
            }}
          />

          <Typography sx={{ color: 'black', mb: 1 }}>Username</Typography>
          <TextField
            fullWidth
            sx={{
              mb: 2,
              bgcolor: 'white',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { border: 'none' }
              }
            }}
          />

          <Typography sx={{ color: 'black', mb: 1 }}>Password</Typography>
          <TextField
            fullWidth
            type="password"
            sx={{
              mb: 3,
              bgcolor: 'white',
              borderRadius: 1,
              '& .MuiOutlinedInput-root': {
                '& fieldset': { border: 'none' }
              }
            }}
          />

          <Button
            fullWidth
            variant="contained"
            sx={{
              bgcolor: 'white',
              color: 'black',
              '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' }
            }}
          >
            Continue
          </Button>

          <Typography
            sx={{
              mt: 3,
              textAlign: 'center',
              color: 'black'
            }}
          >
            Already have an account? <Link to="/login" style={{ color: 'black' }}>Login</Link>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
}