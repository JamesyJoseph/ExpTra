# [ExpTra - (Expense Tracker)](https://exptra.vercel.app)

A Firebase-powered expense tracking application with user authentication and real-time data synchronization.


<img width="1107" height="895" alt="Screenshot 2025-10-05 023110" src="https://github.com/user-attachments/assets/efa8c483-d1aa-4bc0-99c4-9543c08d923d" />


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
