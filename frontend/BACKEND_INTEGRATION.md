# Backend Integration Guide for Study Group App

## Overview
This document outlines the steps needed to integrate Firebase backend with the Study Group application. The app is currently using mock data but is fully prepared for Firebase integration.

## Prerequisites
1. Firebase project created in Firebase Console
2. Firebase services enabled:
   - Authentication (Email/Password and Google Sign-in)
   - Firestore Database
   - Storage

## Integration Steps

### 1. Environment Setup
Create a `.env` file in the root directory with your Firebase credentials:
```
REACT_APP_FIREBASE_API_KEY=your-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
```

### 2. Firebase Configuration
Update `src/config/appConfig.js`:
```javascript
export const USE_MOCK_API = false; // Change this to false to use Firebase
```

### 3. Firestore Collections Setup
Create the following collections in Firestore:

#### Users Collection
```javascript
users/{userId}
{
  name: string,
  email: string,
  avatar: string (URL),
  bio: string,
  groups: array<string>, // Group IDs
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### Groups Collection
```javascript
groups/{groupId}
{
  name: string,
  description: string,
  category: string,
  image: string (URL),
  maxMembers: number,
  members: array<string>, // User IDs
  tags: array<string>,
  createdBy: string (User ID),
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 4. Security Rules Setup

#### Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Groups collection
    match /groups/{groupId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update: if request.auth != null && (
        resource.data.createdBy == request.auth.uid ||
        request.auth.uid in resource.data.members
      );
    }
  }
}
```

#### Storage Rules
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Profile images
    match /profile-images/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Group images
    match /group-images/{groupId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

### 5. Authentication Setup
1. Enable Email/Password authentication in Firebase Console
2. Enable Google Sign-in provider
3. Configure OAuth consent screen if needed

### 6. Key Files to Review
The following files contain backend integration comments (marked with `&& backend changes`):

1. `src/firebase.js` - Firebase initialization
2. `src/contexts/AuthContext.jsx` - Authentication methods
3. `src/services/groupService.js` - Group operations
4. `src/services/profileService.js` - User profile operations

### 7. Testing Checklist
- [ ] User registration with email/password
- [ ] Google sign-in
- [ ] Profile creation and updates
- [ ] Group creation with image upload
- [ ] Group joining functionality
- [ ] Real-time updates for group changes
- [ ] Profile image uploads
- [ ] Security rules effectiveness

## Additional Notes
1. All Firebase operations are wrapped in try-catch blocks with error handling
2. Image uploads use Firebase Storage with proper path structure
3. Real-time updates are implemented where necessary
4. The app uses proper loading states during async operations

## Support
For any questions about the frontend implementation, please refer to the code comments marked with `&& backend changes` in the respective files.
