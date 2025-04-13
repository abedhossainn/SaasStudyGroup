// Backend API configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

export const API_ENDPOINTS = {
  REQUEST_OTP: `${BACKEND_URL}/api/auth/request-otp`,
  VERIFY_OTP: `${BACKEND_URL}/api/auth/verify-otp`,
}; 