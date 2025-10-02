// Firebase Configuration - REPLACE WITH YOUR CONFIG
const firebaseConfig = {
    apiKey: "AIzaSyDDog0wPrHI-S0xGqHwjs_dgAPv-Oq_M0k",
    authDomain: "exptra-13b3b.firebaseapp.com",
    projectId: "exptra-13b3b",
    storageBucket: "exptra-13b3b.firebasestorage.app",
    messagingSenderId: "647780793617",
    appId: "1:647780793617:web:3b3ded6e9dc53594eca0b0"
};

// Initialize Firebase
try {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase initialized successfully");
} catch (error) {
    console.error("Firebase initialization error:", error);
}

const auth = firebase.auth();
const db = firebase.firestore();

// Global application state
let currentUser = null;
let userTransactions = [];

// Enable offline persistence (optional)
db.enablePersistence()
  .catch((err) => {
      console.log("Persistence failed: ", err);
  });