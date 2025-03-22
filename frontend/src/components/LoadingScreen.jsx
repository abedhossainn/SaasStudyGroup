import { Box, CircularProgress, Typography } from '@mui/material';

export default function LoadingScreen() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
        bgcolor: '#F0F4F3'
      }}
    >
      <CircularProgress sx={{ color: '#4CAF50' }} />
      <Typography variant="h6" color="text.secondary">
        Loading...
      </Typography>
    </Box>
  );
}
