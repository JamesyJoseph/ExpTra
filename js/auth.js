// js/auth.js
let skipRedirect = false;
// Shared Firebase wait function with better error handling
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50;

        const checkFirebase = () => {
            attempts++;
            if (typeof firebase !== 'undefined' && auth && db) {
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

        if (window.location.pathname.includes('login.html') || window.location.pathname.includes('signup.html')) {
            currentUser = null;
            clearLocalData();
            skipRedirect = true;

            if (window.location.search.includes('action=signup')) {
                showSignupForm();
            } else {
                showLoginForm();
            }
            
        }
        
        // Just set up auth and event listeners — don't unhide dashboard yet
        setupAuthObserver();
        setupEventListeners();

    } catch (error) {
        console.error('Failed to initialize application:', error);
        showMessage('Failed to connect to database: ' + error.message, 'error');

        // Show retry button
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
        const loadingMessage = document.getElementById('loadingMessage');
        const balanceSection = document.querySelector('.balance-section');
        const transactionSection = document.querySelector('.transaction-section');

        console.log('Auth state changed:', user ? `User: ${user.email}` : 'No user');

        if (user) {
            currentUser = user;
            console.log('User logged in:', user.email);

            // Hide loading and show dashboard
            if (loadingMessage) loadingMessage.style.display = 'none';
            if (balanceSection) balanceSection.style.display = 'block';
            if (transactionSection) transactionSection.style.display = 'block';

            if (typeof onUserAuthenticated === 'function') {
                onUserAuthenticated(user);
            }

            // Redirect if on login/signup
            if (!skipRedirect && ['/', '/index.html', '/login.html'].includes(window.location.pathname)) {
                window.location.href = 'dashboard.html';
            }
            updateUI();
        } else {
            currentUser = null;
            console.log('User logged out - clearing data');
            clearLocalData();

            if (typeof onUserAuthenticated === 'function') {
                onUserAuthenticated(null);
            }

            // Hide dashboard and show login redirect
            if (balanceSection) balanceSection.style.display = 'none';
            if (transactionSection) transactionSection.style.display = 'none';
            if (loadingMessage) loadingMessage.style.display = 'block';

            if (!['/login.html', '/signup.html'].some(p => window.location.pathname.includes(p))) {
                setTimeout(() => window.location.href = 'login.html', 1000);
            }
            updateUI();
        }
    });
}


function setupEventListeners() {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    const logoutBtn = document.getElementById('logoutBtn');
    const loginTab = document.getElementById('loginTab');
    const signupTab = document.getElementById('signupTab');

    // Check URL parameters for signup
    if (window.location.search.includes('action=signup')) {
        showSignupForm();
    }

    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    if (signupForm) signupForm.addEventListener('submit', handleSignup);
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    if (loginTab) loginTab.addEventListener('click', showLoginForm);
    if (signupTab) signupTab.addEventListener('click', showSignupForm);
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
        // Ensure fresh session
        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login successful:', userCredential.user.email);
        
        if (document.getElementById('loginForm')) {
            document.getElementById('loginForm').reset();
        }
        showMessage('Login successful!', 'success');
        skipRedirect = false;
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Login error:', error);
        showMessage('Login error: Invalid Credentials', 'error');
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
        // Ensure fresh session
        await auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);
        
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
        skipRedirect = false;
        window.location.href = 'dashboard.html';
    } catch (error) {
        console.error('Signup error:', error);
        showMessage('Signup error: ' + error.message, 'error');
    }
}

async function handleLogout() {
    console.log('Logout initiated');

    if (!auth) {
        console.error('Firebase auth not available for logout');
        clearLocalData();
        window.location.href = 'login.html';
        return;
    }

    try {
        // Hide dashboard immediately
        const balanceSection = document.querySelector('.balance-section');
        const transactionSection = document.querySelector('.transaction-section');
        if (balanceSection) balanceSection.style.display = 'none';
        if (transactionSection) transactionSection.style.display = 'none';

        // Clear local data
        clearLocalData();

        // Actually sign out
        await auth.signOut();
        console.log('User signed out successfully');

        showMessage('Logged out successfully', 'success');

        // Redirect right away (don’t wait for observer)
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 500);

    } catch (error) {
        console.error('Sign out error:', error);
        showMessage('Error logging out: ' + error.message, 'error');
    }
}



function clearLocalData() {
    try {
        localStorage.clear();
        sessionStorage.clear();

        currentUser = null;
        userTransactions = [];

        console.log('Local data cleared successfully');
    } catch (error) {
        console.error('Error clearing local data:', error);
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
    console.log(`Message [${type}]:`, message);
    
    // Remove any existing temporary messages
    const existingMessages = document.querySelectorAll('#tempAuthMessage, .firebase-error-message');
    existingMessages.forEach(msg => {
        if (msg.parentNode) {
            msg.parentNode.removeChild(msg);
        }
    });
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.id = 'tempAuthMessage';
    
    // Set styles
    const styles = {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '15px 20px',
        borderRadius: '8px',
        color: 'white',
        zIndex: '10000',
        fontWeight: '600',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        maxWidth: '300px',
        fontSize: '14px',
        lineHeight: '1.4',
        border: '1px solid rgba(255,255,255,0.2)'
    };
    
    Object.assign(messageElement.style, styles);
    
    // Set background color based on type
    switch(type) {
        case 'success':
            messageElement.style.backgroundColor = 'var(--success)';
            break;
        case 'error':
            messageElement.style.backgroundColor = 'var(--danger)';
            break;
        case 'warning':
            messageElement.style.backgroundColor = 'var(--warning)';
            break;
        default:
            messageElement.style.backgroundColor = 'var(--primary)';
    }
    
    messageElement.textContent = message;
    document.body.appendChild(messageElement);
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '&times;';
    closeBtn.style.cssText = `
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        margin-left: 10px;
        float: right;
        line-height: 1;
    `;
    closeBtn.onclick = () => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    };
    messageElement.appendChild(closeBtn);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
        if (messageElement.parentNode) {
            messageElement.parentNode.removeChild(messageElement);
        }
    }, 5000);
}

function hideMessage() {
    const tempAuthMessage = document.getElementById('tempAuthMessage');
    
    if (tempAuthMessage && tempAuthMessage.parentNode) {
        tempAuthMessage.parentNode.removeChild(tempAuthMessage);
    }
}

function updateUI() {
    const userInfo = document.getElementById('userInfo');
    const usernameDisplay = document.getElementById('usernameDisplay');

    if (currentUser && userInfo && usernameDisplay && typeof db !== 'undefined' && db !== null) {
        db.collection('users').doc(currentUser.uid).get()
            .then(doc => {
                if (doc.exists) {
                    const userData = doc.data();
                    usernameDisplay.textContent = userData.username || currentUser.email;
                } else {
                    usernameDisplay.textContent = currentUser.email;
                }
            })
            .catch(error => {
                console.error('Error loading user data:', error);
                usernameDisplay.textContent = currentUser.email;
            });

        userInfo.style.display = 'flex';
    } else if (userInfo) {
        userInfo.style.display = 'none';
        if (usernameDisplay) usernameDisplay.textContent = 'User';
    }
}


// Start the application when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);
