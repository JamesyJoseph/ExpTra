// js/firebase-config.js

// Global Firebase variables
let firebaseConfig = null;
let auth = null;
let db = null;

// Global application state
let currentUser = null;
let userTransactions = [];

// Check if Firebase scripts are loaded
function checkFirebaseDependencies() {
    if (typeof firebase === 'undefined') {
        throw new Error('Firebase SDK not loaded. Check your internet connection and script tags.');
    }
    
    if (typeof firebase.app === 'undefined') {
        throw new Error('Firebase App not available.');
    }
    
    return true;
}

async function loadFirebaseConfig() {
    try {
        console.log('Loading Firebase configuration...');
        
        // Try different possible paths for config file
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
            throw new Error('Could not find firebase-config.txt in any of the expected locations: ' + possiblePaths.join(', '));
        }
        
        // Parse the text file into a config object
        const config = {};
        const lines = configText.split('\n');
        
        lines.forEach(line => {
            // Skip empty lines and comments
            const trimmedLine = line.trim();
            if (trimmedLine === '' || trimmedLine.startsWith('#')) {
                return;
            }
            const [key, value] = trimmedLine.split('=');
            if (key && value) {
                config[key.trim()] = value.trim().replace(/['"]/g, ''); // Remove quotes
            }
        });
        
        // Validate that we have all required config values
        const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId'];
        const missingKeys = requiredKeys.filter(key => !config[key]);
        
        if (missingKeys.length > 0) {
            throw new Error(`Missing Firebase configuration keys: ${missingKeys.join(', ')}`);
        }
        
        console.log('Firebase config loaded successfully from:', successfulPath);
        return config;
        
    } catch (error) {
        console.error('Error loading Firebase config:', error);
        throw new Error('Failed to load Firebase configuration: ' + error.message);
    }
}

async function initializeFirebase() {
    try {
        console.log('Initializing Firebase...');
        
        // Check if Firebase SDK is available
        checkFirebaseDependencies();
        
        // Load configuration from text file
        firebaseConfig = await loadFirebaseConfig();
        
        console.log('Firebase config:', {
            ...firebaseConfig,
            apiKey: `${firebaseConfig.apiKey.substring(0, 10)}...` // Hide full API key in logs
        });
        
        // Initialize Firebase
        let app;
        if (firebase.apps.length === 0) {
            app = firebase.initializeApp(firebaseConfig);
            console.log('Firebase app initialized');
        } else {
            app = firebase.app();
            console.log('Using existing Firebase app');
        }
        
        // Initialize Firebase services
        auth = firebase.auth();
        db = firebase.firestore();
        
        // Configure Firestore settings
        db.settings({
            cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
        });
        
        // Enable offline persistence
        try {
            await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
            console.log("Auth persistence set to SESSION (clears when tab closes)");
        } catch (err) {
            console.warn('Firestore persistence failed:', err.code);
            if (err.code === 'failed-precondition') {
                console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
            } else if (err.code === 'unimplemented') {
                console.warn('The current browser doesn\'t support persistence');
            }
        }
        
        console.log("Firebase initialized successfully");
        return { auth, db };
        
    } catch (error) {
        console.error("Firebase initialization error:", error);
        showFirebaseError(error.message);
        throw error;
    }
}

function showFirebaseError(message, isCritical = false) {
    console.error('Firebase Error:', message);
    
    // Only show user-facing error for critical issues
    if (!isCritical) {
        console.log('Non-critical Firebase error, not showing user message');
        return;
    }
    
    // Don't show multiple error messages
    if (document.querySelector('.firebase-error-message')) {
        return;
    }
    
    // Create error message for user
    const errorDiv = document.createElement('div');
    errorDiv.className = 'firebase-error-message';
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
        font-family: Arial, sans-serif;
        border-bottom: 2px solid #c1121f;
    `;
    errorDiv.innerHTML = `
        <strong>Connection Error:</strong> ${message}
        <button onclick="this.parentNode.remove()" style="
            background: none;
            border: 1px solid white;
            color: white;
            margin-left: 15px;
            padding: 2px 8px;
            border-radius: 4px;
            cursor: pointer;
        ">×</button>
    `;
    document.body.appendChild(errorDiv);
    
    // Remove error after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.parentNode.removeChild(errorDiv);
        }
    }, 10000);
}

// Initialize Firebase when the script loads
// But don't block other scripts - let them wait for initialization
initializeFirebase().catch(error => {
    console.error('Failed to initialize Firebase:', error);
});
