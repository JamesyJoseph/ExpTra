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
        
        initializeDOMElements();
        setupEventListeners();
        
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
}

function setupEventListeners() {
    if (incomeBtn) incomeBtn.addEventListener('click', () => incomeModal.style.display = 'flex');
    if (expenseBtn) expenseBtn.addEventListener('click', () => expenseModal.style.display = 'flex');
    if (closeIncomeModal) closeIncomeModal.addEventListener('click', () => incomeModal.style.display = 'none');
    if (closeExpenseModal) closeExpenseModal.addEventListener('click', () => expenseModal.style.display = 'none');
    if (incomeForm) incomeForm.addEventListener('submit', handleIncome);
    if (expenseForm) expenseForm.addEventListener('submit', handleExpense);

    if (pdfBtn) {
        pdfBtn.addEventListener('click', generatePDF);
    }

    window.addEventListener('click', (e) => {
        if (e.target === incomeModal) incomeModal.style.display = 'none';
        if (e.target === expenseModal) expenseModal.style.display = 'none';
    });

    if (filterBtns) {
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderTransactions(btn.dataset.filter);
            });
        });
    }
}

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
    
    const currentBalance = calculateCurrentBalance();
    
    if (currentBalance - amount < 0) {
        showMessage('Insufficient balance! You cannot spend more than your current balance.', 'error');
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

function getServerTimestamp() {
    if (typeof firebase !== 'undefined' && firebase.firestore && firebase.firestore.FieldValue) {
        return firebase.firestore.FieldValue.serverTimestamp();
    } else {
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

function generatePDF() {
    if (!currentUser || userTransactions.length === 0) {
        showMessage('No transactions to export!', 'error');
        return;
    }

    try {
        if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
            showMessage('PDF library not loaded. Please refresh the page.', 'error');
            return;
        }

        const { jsPDF } = jspdf;
        const doc = new jsPDF();
        
        const currentDate = new Date().toLocaleDateString();
        const username = document.getElementById('usernameDisplay')?.textContent || 'User';
        
        doc.setFontSize(16);
        doc.setTextColor(67, 97, 238);
        doc.text('ExpTra - Transaction Report', 105, 20, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`User: ${username} | Generated: ${currentDate}`, 105, 30, { align: 'center' });
        
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Current Balance: $${calculateCurrentBalance().toFixed(2)}`, 20, 45);
        
        let yPosition = 60;
        
        userTransactions.forEach((transaction) => {
            if (yPosition > 270) {
                doc.addPage();
                yPosition = 20;
            }
            
            const date = new Date(transaction.date);
            const formattedDate = date.toLocaleDateString();
            const formattedTime = date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            doc.setFontSize(9);
            doc.setTextColor(0, 0, 0);
            doc.text(`${formattedDate} ${formattedTime}`, 20, yPosition);
            doc.text(transaction.note, 20, yPosition + 5);
            
            const amountText = `$${transaction.amount.toFixed(2)}`;
            if (transaction.type === 'income') {
                doc.setTextColor(76, 201, 240);
                doc.text(`+${amountText}`, 180, yPosition, { align: 'right' });
            } else {
                doc.setTextColor(247, 37, 133);
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

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing transactions...');
    initializeTransactions();
});
