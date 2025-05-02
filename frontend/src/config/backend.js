// Backend API configuration
const NODE_BACKEND_URL = process.env.REACT_APP_NODE_BACKEND_URL || 'http://localhost:5000';
const PYTHON_BACKEND_URL = process.env.REACT_APP_PYTHON_BACKEND_URL || 'http://localhost:5001'; // Assuming local Flask runs on 5001

export const API_ENDPOINTS = {
  // Node.js Endpoints (Example: File Uploads)
  CLOUDINARY_UPLOAD: `${NODE_BACKEND_URL}/api/cloudinary/upload`,
  GET_FILES: `${NODE_BACKEND_URL}/api/files`,
  DELETE_FILE: `${NODE_BACKEND_URL}/api/files`,
  STATUS: `${NODE_BACKEND_URL}/api/status`,

  // Python/Flask Endpoints (OTP)
  REQUEST_OTP: `${PYTHON_BACKEND_URL}/api/auth/request-otp`,
  VERIFY_OTP: `${PYTHON_BACKEND_URL}/api/auth/verify-otp`,
};