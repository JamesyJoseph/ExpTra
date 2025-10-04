// js/auth.js

// Global variables
let currentUser = null;

// Shared Firebase wait function
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        const checkAuth = () => {
            if (typeof auth !== 'undefined' && auth !== null && typeof db !== 'undefined' && db !== null) {
                resolve();
            } else {
                setTimeout(checkAuth, 100);
            }
        };
        checkAuth();
        
        // Timeout after 10 seconds
        setTimeout(() => reject(new Error('Firebase initialization timeout')), 10000);
    });
}

// Initialize application when Firebase is ready
async function initializeApp() {
    try {
        await waitForFirebase();
        console.log('Firebase is ready, initializing application...');
        
        // Hide loading message and show main content
        const loadingMessage = document.getElementById('loadingMessage');
        const balanceSection = document.querySelector('.balance-section');
        const transactionSection = document.querySelector('.transaction-section');
        
        if (loadingMessage) {
            loadingMessage.style.display = 'none';
        }
        if (balanceSection) {
            balanceSection.style.display = 'block';
        }
        if (transactionSection) {
            transactionSection.style.display = 'block';
        }
        
        // Set up auth state observer and other initialization
        setupAuthObserver();
        setupEventListeners();
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        showMessage('Failed to connect to database. Please refresh the page.', 'error');
    }
}

function setupAuthObserver() {
    auth.onAuthStateChanged((user) => {
        if (user) {
            currentUser = user;
            console.log('User logged in:', user.email);
            
            // Notify transactions module about user authentication
            if (typeof onUserAuthenticated === 'function') {
                onUserAuthenticated(user);
            }
            
            // Update UI for logged-in user
            updateUI();
            
            // Redirect to dashboard if on auth pages
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname === '/' || 
                window.location.pathname.endsWith('index.html')) {
                window.location.href = 'dashboard.html';
            }
        } else {
            currentUser = null;
            console.log('User logged out');
            
            // Notify transactions module about user logout
            if (typeof onUserAuthenticated === 'function') {
                onUserAuthenticated(null);
            }
            
            // Update UI for logged-out user
            updateUI();
            
            // Redirect to login if on dashboard
            if (window.location.pathname.includes('dashboard.html')) {
                window.location.href = 'login.html';
            }
        }
    });
}

function setupEventListeners() {
    // DOM Elements
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const authMessage = document.getElementById('authMessage');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const showLogin = document.getElementById('showLogin');
    const showSignup = document.getElementById('showSignup');

    // Check URL parameters for signup
    if (window.location.search.includes('action=signup')) {
        showSignupForm();
    }

    // Event Listeners
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
    if (signupForm) {
        signupForm.addEventListener('submit', handleSignup);
    }
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    if (loginTab) {
        loginTab.addEventListener('click', showLoginForm);
    }
    if (signupTab) {
        signupTab.addEventListener('click', showSignupForm);
    }
    if (showLogin) {
        showLogin.addEventListener('click', showLoginForm);
    }
    if (showSignup) {
        showSignup.addEventListener('click', showSignupForm);
    }
}

// Functions
async function handleLogin(e) {
    if (e) e.preventDefault();
    
    if (typeof auth === 'undefined' || auth === null) {
        showMessage('Authentication service is not available. Please refresh the page.', 'error');
        return;
    }
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login successful:', userCredential.user.email);
        
        if (document.getElementById('loginForm')) {
            document.getElementById('loginForm').reset();
        }
        showMessage('Login successful!', 'success');
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login error: ' + error.message, 'error');
    }
}

async function handleSignup(e) {
    if (e) e.preventDefault();
    
    if (typeof auth === 'undefined' || auth === null) {
        showMessage('Authentication service is not available. Please refresh the page.', 'error');
        return;
    }
    
    const username = document.getElementById('signupUsername').value;
    const email = document.getElementById('signupEmail').value;
    const password = document.getElementById('signupPassword').value;
    
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        console.log('Signup successful:', user.email);
        
        // Create user document in Firestore
        if (typeof db !== 'undefined' && db !== null) {
            await db.collection('users').doc(user.uid).set({
                username: username,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('User document created in Firestore');
        } else {
            console.error('Firestore is not available');
            showMessage('Database connection error. Please try again.', 'error');
            return;
        }
        
        if (document.getElementById('signupForm')) {
            document.getElementById('signupForm').reset();
        }
        showMessage('Account created successfully!', 'success');
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Signup error: ' + error.message, 'error');
    }
}

async function handleLogout() {
    try {
        if (typeof auth !== 'undefined' && auth !== null) {
            await auth.signOut();
            console.log('User signed out successfully');
            // The auth state observer will handle the redirect
        } else {
            console.error('Firebase auth is not available for logout');
            showMessage('Authentication service unavailable', 'error');
        }
    } catch (error) {
        console.error('Sign out error:', error);
        showMessage('Logout error: ' + error.message, 'error');
    }
}

function showLoginForm(e) {
    if (e) e.preventDefault();
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginTab) loginTab.classList.add('active');
    if (signupTab) signupTab.classList.remove('active');
    if (loginForm) loginForm.classList.add('active');
    if (signupForm) signupForm.classList.remove('active');
    hideMessage();
}

function showSignupForm(e) {
    if (e) e.preventDefault();
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (loginTab) loginTab.classList.remove('active');
    if (signupTab) signupTab.classList.add('active');
    if (loginForm) loginForm.classList.remove('active');
    if (signupForm) signupForm.classList.add('active');
    hideMessage();
}

function showMessage(message, type) {
    // Try to use authMessage first, then create a temporary one
    let messageElement = document.getElementById('authMessage');
    
    if (!messageElement) {
        // Create a temporary message element
        messageElement = document.createElement('div');
        messageElement.id = 'tempAuthMessage';
        messageElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            font-weight: 600;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            max-width: 300px;
            transition: all 0.3s ease;
        `;
        
        // Add CSS classes for different message types
        if (type === 'error') {
            messageElement.style.backgroundColor = '#e74c3c';
            messageElement.style.borderLeft = '4px solid #c0392b';
        } else if (type === 'success') {
            messageElement.style.backgroundColor = '#27ae60';
            messageElement.style.borderLeft = '4px solid #229954';
        } else {
            messageElement.style.backgroundColor = '#3498db';
            messageElement.style.borderLeft = '4px solid #2980b9';
        }
        
        document.body.appendChild(messageElement);
    } else {
        // Style the existing message element
        messageElement.style.position = 'fixed';
        messageElement.style.top = '20px';
        messageElement.style.right = '20px';
        messageElement.style.padding = '15px 20px';
        messageElement.style.borderRadius = '8px';
        messageElement.style.color = 'white';
        messageElement.style.zIndex = '10000';
        messageElement.style.fontWeight = '600';
        messageElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
        messageElement.style.maxWidth = '300px';
        messageElement.style.transition = 'all 0.3s ease';
        
        if (type === 'error') {
            messageElement.style.backgroundColor = '#e74c3c';
            messageElement.style.borderLeft = '4px solid #c0392b';
        } else if (type === 'success') {
            messageElement.style.backgroundColor = '#27ae60';
            messageElement.style.borderLeft = '4px solid #229954';
        } else {
            messageElement.style.backgroundColor = '#3498db';
            messageElement.style.borderLeft = '4px solid #2980b9';
        }
    }
    
    messageElement.textContent = message;
    messageElement.style.display = 'block';
    messageElement.style.opacity = '1';
    
    setTimeout(() => hideMessage(), 5000);
}

function hideMessage() {
    const authMessage = document.getElementById('authMessage');
    const tempAuthMessage = document.getElementById('tempAuthMessage');
    
    if (authMessage) {
        authMessage.style.opacity = '0';
        setTimeout(() => {
            authMessage.style.display = 'none';
        }, 300);
    }
    if (tempAuthMessage) {
        tempAuthMessage.style.opacity = '0';
        setTimeout(() => {
            if (tempAuthMessage.parentNode) {
                tempAuthMessage.parentNode.removeChild(tempAuthMessage);
            }
        }, 300);
    }
}

function updateUI() {
    const userInfo = document.getElementById('userInfo');
    const usernameDisplay = document.getElementById('usernameDisplay');
    
    if (currentUser && userInfo && usernameDisplay && typeof db !== 'undefined' && db !== null) {
        // Load user profile data
        db.collection('users').doc(currentUser.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    usernameDisplay.textContent = userData.username;
                }
            })
            .catch(error => {
                console.error('Error loading user data:', error);
            });
            
        userInfo.style.display = 'flex';
    } else if (userInfo) {
        userInfo.style.display = 'none';
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
