// js/firebase-config.js

let firebaseConfig = null;
let auth = null;
let db = null;

// Global application state
let currentUser = null;
let userTransactions = [];

async function loadFirebaseConfig() {
    try {
        // Try different possible paths
        const possiblePaths = [
            '../config/firebase-config.txt',
            './config/firebase-config.txt',
            'config/firebase-config.txt',
            '/config/firebase-config.txt'
        ];
        
        let configText = '';
        let successfulPath = '';
        
        // Try each path until one works
        for (const path of possiblePaths) {
            try {
                const response = await fetch(path);
                if (response.ok) {
                    configText = await response.text();
                    successfulPath = path;
                    console.log('Found config file at:', path);
                    break;
                }
            } catch (error) {
                console.log('Failed to load from:', path);
                continue;
            }
        }
        
        if (!configText) {
            throw new Error('Could not find firebase-config.txt in any of the expected locations');
        }
        
        // Parse the text file into a config object
        const config = {};
        const lines = configText.split('\n');
        
        lines.forEach(line => {
            // Skip empty lines and comments
            if (line.trim() === '' || line.trim().startsWith('#')) {
                return;
            }
            const [key, value] = line.split('=');
            if (key && value) {
                config[key.trim()] = value.trim();
            }
        });
        
        // Validate that we have all required config values
        const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const missingKeys = requiredKeys.filter(key => !config[key]);
        
        if (missingKeys.length > 0) {
            throw new Error(`Missing Firebase configuration: ${missingKeys.join(', ')}`);
        }
        
        console.log('Firebase config loaded successfully:', config);
        return config;
        
    } catch (error) {
        console.error('Error loading Firebase config:', error);
        throw new Error('Failed to load Firebase configuration: ' + error.message);
    }
}

async function initializeFirebase() {
    try {
        // Load configuration from text file
        firebaseConfig = await loadFirebaseConfig();
        
        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        
        // Initialize Firebase services
        auth = firebase.auth();
        db = firebase.firestore();
        
        console.log("Firebase initialized successfully");
        
        // Enable offline persistence (optional)
        db.enablePersistence()
          .catch((err) => {
              console.log("Persistence failed: ", err);
          });
          
    } catch (error) {
        console.error("Firebase initialization error:", error);
        showFirebaseError(error.message);
    }
}

function showFirebaseError(message) {
    // Create error message for user
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        background: #e63946;
        color: white;
        padding: 15px;
        text-align: center;
        z-index: 10000;
        font-weight: bold;
    `;
    errorDiv.textContent = `Firebase Error: ${message}`;
    document.body.appendChild(errorDiv);
}

// Initialize Firebase when the script loads
initializeFirebase();