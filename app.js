// REMOVED: const GAS_WEB_APP_URL = 'YOUR_GAS_WEB_APP_URL_HERE'; 

// Local storage for user session data (includes username, sheet IDs, and NOW gasUrl)
let userSession = JSON.parse(localStorage.getItem('crmUser')) || null;

// DOM Elements
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const authForm = document.getElementById('auth-form');
const authMessage = document.getElementById('auth-message');
const themeToggle = document.getElementById('theme-toggle');

// --- Core Function: API Communication (MODIFIED) ---
async function apiCall(action, payload = {}) {
    // Determine the URL based on context: use stored session URL or the one from the login field
    const gasUrl = userSession ? userSession.gasUrl : document.getElementById('gas-url').value.trim();
    
    if (!gasUrl) {
        authMessage.textContent = 'Error: Google Script URL is missing.';
        return null;
    }
    
    authMessage.textContent = 'Processing...';
    try {
        const response = await fetch(gasUrl, { // Using the dynamic URL
            method: 'POST',
            contentType: 'application/json',
            body: JSON.stringify({ action, ...payload })
        });
        const result = await response.json();
        
        if (result.status === 'success') {
            authMessage.textContent = '';
            return result.data;
        } else {
            throw new Error(result.message || 'API call failed');
        }
    } catch (error) {
        authMessage.textContent = `Error: ${error.message}. Check URL and CORS settings.`;
        console.error('API Error:', error);
        return null;
    }
}

// --- Authentication Process Core (MODIFIED) ---
async function processAuth(action) {
    const gasUrl = document.getElementById('gas-url').value.trim();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!gasUrl || !username || !password) {
        authMessage.textContent = 'Please fill in the URL, username, and password.';
        return;
    }
    
    // Check if the URL is valid (simple check)
    if (!gasUrl.startsWith('https://script.google.com/macros/')) {
        authMessage.textContent = 'Invalid URL. Must be a Google Script Web App URL.';
        return;
    }

    // Temporarily set a partial session object for the API call
    const tempSession = { gasUrl: gasUrl };
    const data = await apiCall(action, { username, password }, tempSession);
    
    if (data) {
        let finalData = data;
        
        // Handle login after successful signup
        if (action === 'signup') {
             // For simplicity, we automatically call login after signup
             const loginData = await apiCall('login', { username, password }, tempSession);
             if (loginData) {
                 finalData = loginData;
             }
        }
        
        // Final session object includes the URL, username, and sheet IDs
        if (finalData.username) {
            userSession = { ...finalData, gasUrl: gasUrl };
            localStorage.setItem('crmUser', JSON.stringify(userSession));
            showApp();
        }
    }
}

// --- Specific Authentication Handlers ---
function handleLoginSubmit(e) {
    e.preventDefault();
    processAuth('login');
}

function handleSignupClick(e) {
    e.preventDefault(); 
    processAuth('signup');
}

// --- Session and UI Functions (MODIFIED) ---

function checkSession() {
    // If a session exists, check if the URL is stored and pre-fill it for convenience
    if (userSession) {
        if (userSession.gasUrl) {
            document.getElementById('gas-url').value = userSession.gasUrl;
        }
        showApp();
    } else {
        showAuth();
    }
}

// ... (rest of the code remains the same) ...

// Initialization and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.add('light-mode');
    }
    
    checkSession();
    
    // AUTH LISTENERS
    authForm.addEventListener('submit', handleLoginSubmit);
    document.getElementById('signup-btn').addEventListener('click', handleSignupClick);

    // Theme Toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Navigation Listeners
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const target = e.target.getAttribute('data-target');
            if (target) {
                showPanel(target);
            }
        });
    });
    document.getElementById('logout-btn').addEventListener('click', handleLogout);

    // Entry Form Listener
    document.getElementById('crm-entry-form').addEventListener('submit', handleEntrySubmission);

    // DAR Form Listeners
    document.getElementById('add-dar-entry').addEventListener('click', addDarEntryField);
    document.getElementById('dar-entry-form').addEventListener('submit', handleDarSubmission);
    addDarEntryField(); 

    // History Controls Listener
    document.querySelectorAll('.history-controls button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleShowHistory(e.target.getAttribute('data-history-type'));
        });
    });
});
