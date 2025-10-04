// js/transactions.js

// DOM Elements
let incomeBtn, expenseBtn, incomeModal, expenseModal, incomeForm, expenseForm;
let closeIncomeModal, closeExpenseModal, balanceAmount, transactionList, filterBtns, pdfBtn;

// Initialize transactions when Firebase is ready
async function initializeTransactions() {
    try {
        console.log('Initializing transactions...');
        await waitForFirebase();
        console.log('Firebase ready for transactions');
        
        // Initialize DOM elements after Firebase is ready
        initializeDOMElements();
        
        // Set up event listeners
        setupEventListeners();
        
        // Load transactions if user is authenticated
        if (currentUser) {
            loadTransactions();
        }
        
    } catch (error) {
        console.error('Failed to initialize transactions:', error);
        showMessage('Failed to initialize transactions: ' + error.message, 'error');
    }
}

function initializeDOMElements() {
    incomeBtn = document.getElementById('incomeBtn');
    expenseBtn = document.getElementById('expenseBtn');
    incomeModal = document.getElementById('incomeModal');
    expenseModal = document.getElementById('expenseModal');
    incomeForm = document.getElementById('incomeForm');
    expenseForm = document.getElementById('expenseForm');
    closeIncomeModal = document.getElementById('closeIncomeModal');
    closeExpenseModal = document.getElementById('closeExpenseModal');
    balanceAmount = document.getElementById('balanceAmount');
    transactionList = document.getElementById('transactionList');
    filterBtns = document.querySelectorAll('.filter-btn');
    pdfBtn = document.getElementById('pdfBtn');
    
    console.log('DOM elements initialized');
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Event Listeners
    if (incomeBtn) incomeBtn.addEventListener('click', () => incomeModal.style.display = 'flex');
    if (expenseBtn) expenseBtn.addEventListener('click', () => expenseModal.style.display = 'flex');
    if (closeIncomeModal) closeIncomeModal.addEventListener('click', () => incomeModal.style.display = 'none');
    if (closeExpenseModal) closeExpenseModal.addEventListener('click', () => expenseModal.style.display = 'none');
    if (incomeForm) incomeForm.addEventListener('submit', handleIncome);
    if (expenseForm) expenseForm.addEventListener('submit', handleExpense);

    if (pdfBtn) {
        pdfBtn.addEventListener('click', generatePDF);
    }

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === incomeModal) incomeModal.style.display = 'none';
        if (e.target === expenseModal) expenseModal.style.display = 'none';
    });

    // Filter buttons
    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTransactions(btn.dataset.filter);
            });
        });
    }
    
    console.log('Event listeners setup complete');
}

// Use the auth state observer from auth.js instead of duplicating it
// This will be called by auth.js when the user state changes
function onUserAuthenticated(user) {
    console.log('User authentication state changed:', user ? 'Logged in' : 'Logged out');
    if (user) {
        loadTransactions();
    } else {
        userTransactions = [];
        updateBalance();
        renderTransactions('all');
    }
}

// Functions
async function handleIncome(e) {
    e.preventDefault();
    
    if (typeof db === 'undefined' || db === null) {
        showMessage('Database not available. Please try again.', 'error');
        return;
    }
    
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    const note = document.getElementById('incomeNote').value || 'Income';
    
    if (amount <= 0) {
        alert('Please enter a positive amount');
        return;
    }
    
    try {
        const transaction = {
            type: 'income',
            amount: amount,
            note: note,
            date: new Date().toISOString(),
            timestamp: getServerTimestamp()
        };
        
        await db.collection('users').doc(currentUser.uid)
            .collection('transactions').add(transaction);
        
        incomeModal.style.display = 'none';
        incomeForm.reset();
        showMessage('Income added successfully!', 'success');
    } catch (error) {
        console.error('Error adding income:', error);
        showMessage('Error adding income: ' + error.message, 'error');
    }
}

async function handleExpense(e) {
    e.preventDefault();
    
    if (typeof db === 'undefined' || db === null) {
        showMessage('Database not available. Please try again.', 'error');
        return;
    }
    
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const note = document.getElementById('expenseNote').value || 'Expense';
    
    if (amount <= 0) {
        alert('Please enter a positive amount');
        return;
    }
    
    // Calculate current balance before adding the expense
    const currentBalance = calculateCurrentBalance();
    
    // Check if expense would make balance negative
    if (currentBalance - amount < 0) {
        alert('Insufficient balance! You cannot spend more than your current balance.');
        return;
    }
    
    try {
        const transaction = {
            type: 'expense',
            amount: amount,
            note: note,
            date: new Date().toISOString(),
            timestamp: getServerTimestamp()
        };
        
        await db.collection('users').doc(currentUser.uid)
            .collection('transactions').add(transaction);
        
        expenseModal.style.display = 'none';
        expenseForm.reset();
        showMessage('Expense added successfully!', 'success');
    } catch (error) {
        console.error('Error adding expense:', error);
        showMessage('Error adding expense: ' + error.message, 'error');
    }
}

// Safe server timestamp function
function getServerTimestamp() {
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        return firebase.firestore.FieldValue.serverTimestamp();
    } else {
        // Fallback to client timestamp if Firebase not available
        console.warn('Firebase not available, using client timestamp');
        return new Date();
    }
}

function calculateCurrentBalance() {
    if (!currentUser || userTransactions.length === 0) {
        return 0;
    }
    
    return userTransactions.reduce((total, transaction) => {
        return transaction.type === 'income' ? 
            total + transaction.amount : 
            total - transaction.amount;
    }, 0);
}

function loadTransactions() {
    if (!currentUser || typeof db === 'undefined' || db === null) {
        console.log('Cannot load transactions: no user or database');
        return;
    }
    
    console.log('Loading transactions for user:', currentUser.uid);
    
    // Load transactions with real-time updates
    db.collection('users').doc(currentUser.uid)
        .collection('transactions')
        .orderBy('timestamp', 'desc')
        .onSnapshot((snapshot) => {
            userTransactions = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                userTransactions.push({
                    id: doc.id,
                    ...data,
                    // Ensure date is properly formatted
                    date: data.date || data.timestamp?.toDate?.() || new Date()
                });
            });
            console.log(`Loaded ${userTransactions.length} transactions`);
            updateBalance();
            renderTransactions('all');
        }, (error) => {
            console.error('Error loading transactions: ', error);
            showMessage('Error loading transactions: ' + error.message, 'error');
        });
}

function updateBalance() {
    const balance = calculateCurrentBalance();
    
    if (balanceAmount) {
        balanceAmount.textContent = `$${Math.max(0, balance).toFixed(2)}`;
        
        // Add visual indicator for low balance
        if (balance < 50 && balance > 0) {
            balanceAmount.style.color = 'var(--warning)';
        } else if (balance <= 0) {
            balanceAmount.style.color = 'var(--danger)';
        } else {
            balanceAmount.style.color = 'var(--dark)';
        }
    }
}

function renderTransactions(filter) {
    if (!currentUser) {
        if (transactionList) transactionList.innerHTML = '<div class="transaction-item">Please login to view transactions</div>';
        return;
    }
    
    if (userTransactions.length === 0) {
        if (transactionList) transactionList.innerHTML = '<div class="transaction-item">No transactions yet</div>';
        return;
    }
    
    let filteredTransactions = [...userTransactions];
    
    // Apply filter
    if (filter === 'today') {
        const today = new Date().toDateString();
        filteredTransactions = filteredTransactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.toDateString() === today;
        });
    } else if (filter === 'month') {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        filteredTransactions = filteredTransactions.filter(t => {
            const transactionDate = new Date(t.date);
            return transactionDate.getMonth() === currentMonth && 
                   transactionDate.getFullYear() === currentYear;
        });
    }
    
    if (filteredTransactions.length === 0) {
        if (transactionList) transactionList.innerHTML = '<div class="transaction-item">No transactions found for selected filter</div>';
        return;
    }
    
    if (transactionList) {
        transactionList.innerHTML = filteredTransactions.map(transaction => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-note">${escapeHtml(transaction.note)}</div>
                    <div class="transaction-time">${formatDate(transaction.date)}</div>
                </div>
                <div class="transaction-amount ${transaction.type === 'income' ? 'income-amount' : 'expense-amount'}">
                    ${transaction.type === 'income' ? '+' : '-'}$${transaction.amount.toFixed(2)}
                </div>
            </div>
        `).join('');
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: 'numeric'
        });
    } catch (error) {
        console.error('Error formatting date:', error);
        return 'Invalid Date';
    }
}

function showMessage(message, type) {
    // Create a temporary message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        z-index: 10000;
        font-weight: 600;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    if (type === 'success') {
        messageDiv.style.backgroundColor = 'var(--success)';
    } else if (type === 'error') {
        messageDiv.style.backgroundColor = 'var(--danger)';
    } else {
        messageDiv.style.backgroundColor = 'var(--warning)';
    }
    
    document.body.appendChild(messageDiv);
    
    // Remove message after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.parentNode.removeChild(messageDiv);
        }
    }, 3000);
}

// Simple PDF generation
function generatePDF() {
    if (!currentUser || userTransactions.length === 0) {
        showMessage('No transactions to export!', 'error');
        return;
    }

    try {
        // Check if jsPDF is available
        if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
            showMessage('PDF library not loaded. Please refresh the page.', 'error');
            return;
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        const currentDate = new Date().toLocaleDateString();
        const username = document.getElementById('usernameDisplay')?.textContent || 'User';
        
        // Title
        doc.setFontSize(16);
        doc.setTextColor(67, 97, 238);
        doc.text('ExpTra - Transaction Report', 105, 20, { align: 'center' });
        
        // User info
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`User: ${username} | Generated: ${currentDate}`, 105, 30, { align: 'center' });
        
        // Balance
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Current Balance: $${calculateCurrentBalance().toFixed(2)}`, 20, 45);
        
        // Simple two-column layout
        let yPosition = 60;
        
        userTransactions.forEach((transaction) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString();
            const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Left side - Details
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(`${formattedDate} ${formattedTime}`, 20, yPosition);
            doc.text(transaction.note, 20, yPosition + 5);
            
            // Right side - Amount with color coding
            const amountText = `$${transaction.amount.toFixed(2)}`;
            if (transaction.type === 'income') {
                doc.setTextColor(76, 201, 240); // Income color
                doc.text(`+${amountText}`, 180, yPosition, { align: 'right' });
            } else {
                doc.setTextColor(247, 37, 133); // Expense color
                doc.text(`-${amountText}`, 180, yPosition, { align: 'right' });
            }
            
            doc.setTextColor(100, 100, 100);
            doc.setFontSize(8);
            doc.text(transaction.type.toUpperCase(), 180, yPosition + 5, { align: 'right' });
            
            yPosition += 15;
        });
        
        const fileName = `ExpTra_${username.replace(/\s+/g, '_')}_${currentDate.replace(/\//g, '-')}.pdf`;
        doc.save(fileName);
        
        showMessage('PDF exported successfully!', 'success');
        
    } catch (error) {
        console.error('PDF generation error:', error);
        showMessage('Error generating PDF: ' + error.message, 'error');
    }
}

// Wait for Firebase function
function waitForFirebase() {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds
        
        const checkFirebase = () => {
            attempts++;
            console.log(`Checking Firebase... attempt ${attempts}`);
            
            if (typeof firebase !== 'undefined' && 
                typeof auth !== 'undefined' && auth !== null && 
                typeof db !== 'undefined' && db !== null) {
                console.log('Firebase is ready!');
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

// Initialize transactions when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing transactions...');
    initializeTransactions();
});
