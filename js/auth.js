// js/auth.js

// Shared Firebase wait function with better error handling
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds total
        
        const checkFirebase = () => {
            attempts++;
            
            if (typeof firebase !== 'undefined' && 
                typeof auth !== 'undefined' && auth !== null && 
                typeof db !== 'undefined' && db !== null) {
                console.log('Firebase is ready after', attempts, 'attempts');
                resolve();
            } else if (attempts >= maxAttempts) {
                reject(new Error('Firebase initialization timeout. Please refresh the page.'));
            } else {
                setTimeout(checkFirebase, 100);
            }
        };
        
        checkFirebase();
    });
}

// Initialize application when Firebase is ready
async function initializeApp() {
    try {
        console.log('Waiting for Firebase...');
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
        showMessage('Failed to connect to database: ' + error.message, 'error');
        
        // Show a retry button
        const loadingMessage = document.getElementById('loadingMessage');
        if (loadingMessage) {
            loadingMessage.innerHTML = `
                <div style="text-align: center;">
                    <p>Failed to initialize: ${error.message}</p>
                    <button onclick="location.reload()" class="btn-primary">Retry</button>
                </div>
            `;
        }
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
            
            // Redirect to dashboard if on auth pages
            if (window.location.pathname.includes('login.html') || 
                window.location.pathname === '/' || 
                window.location.pathname.endsWith('index.html')) {
                window.location.href = 'dashboard.html';
            }
            updateUI();
        } else {
            currentUser = null;
            console.log('User logged out');
            
            // Notify transactions module about user logout
            if (typeof onUserAuthenticated === 'function') {
                onUserAuthenticated(null);
            }
            
            // Redirect to login if on dashboard
            if (window.location.pathname.includes('dashboard.html')) {
                window.location.href = 'login.html';
            }
            updateUI();
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
    console.log('Logout initiated...');
    
    if (!auth) {
        console.error('Auth not available for logout');
        showMessage('Authentication service unavailable. Please refresh the page.', 'error');
        return;
    }
    
    try {
        // Show loading state
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.textContent = 'Logging out...';
            logoutBtn.disabled = true;
        }
        
        console.log('Calling auth.signOut()...');
        await auth.signOut();
        console.log('Sign out successful');
        
        // Clear any local data
        currentUser = null;
        
        // The auth state observer will handle the redirect
        showMessage('Logged out successfully', 'success');
        
    } catch (error) {
        console.error('Sign out error:', error);
        showMessage('Logout error: ' + error.message, 'error');
        
        // Reset button state
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.textContent = 'Logout';
            logoutBtn.disabled = false;
        }
        
        // Force redirect if auth fails completely
        if (error.code === 'auth/network-request-failed') {
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1000);
        }
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
        `;
        document.body.appendChild(messageElement);
    }
    
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.classList.remove('hidden');
    
    setTimeout(() => hideMessage(), 5000);
}

function hideMessage() {
    const authMessage = document.getElementById('authMessage');
    const tempAuthMessage = document.getElementById('tempAuthMessage');
    
    if (authMessage) {
        authMessage.style.display = 'none';
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
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (currentUser && userInfo && usernameDisplay && db) {
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
                usernameDisplay.textContent = currentUser.email;
            });
            
        userInfo.style.display = 'flex';
        
        // Reset logout button state
        if (logoutBtn) {
            logoutBtn.textContent = 'Logout';
            logoutBtn.disabled = false;
        }
    } else if (userInfo) {
        userInfo.style.display = 'none';
    }
}

// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting app initialization...');
    initializeApp();
});
