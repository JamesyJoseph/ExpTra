# ExpTra - (Expense Tracker)

A Firebase-powered expense tracking application with user authentication and real-time data synchronization.

## Setup Instructions

1. **Create a Firebase Project**:
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create a new project and enable Authentication and Firestore

2. **Configure Firebase**:
   - Replace the configuration in `js/firebase-config.js` with your actual Firebase config

3. **Set up Authentication**:
   - In Firebase Console, go to Authentication > Sign-in method
   - Enable "Email/Password" provider

4. **Set up Firestore**:
   - Go to Firestore Database and create database
   - Use test mode for development
   - Add the following security rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      
      match /transactions/{transactionId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
