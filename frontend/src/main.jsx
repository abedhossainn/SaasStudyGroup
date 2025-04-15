import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import { SnackbarProvider } from 'notistack';

// Add global styles to target specific MUI classes
const globalStyles = `
  .MuiButton-colorPrimary,
  .css-164w3cz-MuiButtonBase-root-MuiButton-root {
    color: black !important;
    text-shadow: 0 1px 2px rgba(255,255,255,0.3);
  }
  
  .MuiTypography-subtitle2.css-122pakj-MuiTypography-root,
  .MuiTypography-gutterBottom.css-122pakj-MuiTypography-root {
    color: black !important;
    font-weight: 500;
  }
`;

// Add the global styles to the document
const style = document.createElement('style');
style.textContent = globalStyles;
document.head.appendChild(style);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <SnackbarProvider maxSnack={3}>
            <Router>
              <App />
            </Router>
          </SnackbarProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
