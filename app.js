// REPLACE with your deployed Google Apps Script Web App URL
const GAS_WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbzFISNfFkP_lDXI_mlVv_ijCxbJLFKv1ihRyzuzmOC_U4d-oy98YQI0Aqo2mvxWrjOV/exec'; 

// Local storage for user session data
let userSession = JSON.parse(localStorage.getItem('crmUser')) || null;

// DOM Elements
const authView = document.getElementById('auth-view');
const appView = document.getElementById('app-view');
const authForm = document.getElementById('auth-form');
const authMessage = document.getElementById('auth-message');
const themeToggle = document.getElementById('theme-toggle');

// --- Core Function: API Communication ---
async function apiCall(action, payload = {}) {
    authMessage.textContent = 'Processing...';
    try {
        const response = await fetch(GAS_WEB_APP_URL, {
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
        authMessage.textContent = `Error: ${error.message}`;
        console.error('API Error:', error);
        return null;
    }
}

// --- Authentication Handlers ---

function checkSession() {
    if (userSession) {
        showApp();
    } else {
        showAuth();
    }
}

function showAuth() {
    authView.classList.remove('hidden');
    appView.classList.add('hidden');
}

function showApp() {
    authView.classList.add('hidden');
    appView.classList.remove('hidden');
    document.getElementById('welcome-msg').textContent = `Welcome, ${userSession.username}!`;
    showPanel('dashboard'); // Default to dashboard
    // Fetch initial dashboard stats here
    fetchDashboardStats();
}

async function handleAuth(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const isSignup = e.submitter.id === 'signup-btn';
    
    const action = isSignup ? 'signup' : 'login';
    const data = await apiCall(action, { username, password });

    if (data) {
        // For login, data contains sheet IDs. For signup, log in automatically.
        if (action === 'signup') {
             // For simplicity, automatically log in after signup (re-call API or simulate data)
             // A real app would prompt a new login or return sheet IDs directly.
             // Placeholder: assuming GAS returns login-like data on successful signup
             const loginData = await apiCall('login', { username, password });
             if (loginData) {
                 userSession = loginData;
             }
        } else {
            userSession = data;
        }
        
        if (userSession) {
            localStorage.setItem('crmUser', JSON.stringify(userSession));
            showApp();
        }
    }
}

function handleLogout() {
    localStorage.removeItem('crmUser');
    userSession = null;
    showAuth();
}

// --- UI Navigation and Theme ---

function showPanel(targetId) {
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });
    
    const targetPanel = document.getElementById(`${targetId}-view`);
    if (targetPanel) {
        targetPanel.classList.remove('hidden');
        // A slight delay ensures the transition/animation runs
        setTimeout(() => targetPanel.classList.add('active'), 50); 
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    document.body.classList.toggle('light-mode');
    localStorage.setItem('theme', document.body.classList.contains('dark-mode') ? 'dark' : 'light');
}

// --- Data Submission Handlers ---

async function handleEntrySubmission(e) {
    e.preventDefault();
    // 1. Get all form data
    const formData = new FormData(e.target);
    const dataArray = [
        // Map form fields to the array format expected by GAS (must match column order!)
        formData.get('connections_sent'),
        // ... all other fields
        // IMPORTANT: Calculate Conversation_Rate, Time_Country, Follow_Up_Date here in JS
    ];

    const payload = {
        masterSheetId: userSession.masterSheetId,
        sheetId: userSession.dataSheetId,
        data: dataArray // The array of form values
    };

    const result = await apiCall('saveData', payload);
    if (result) {
        alert('CRM Entry Saved!');
        e.target.reset();
        fetchDashboardStats(); // Refresh stats after saving
    }
}

// --- History Display Handler ---

async function handleShowHistory(sheetType) {
    const sheetId = sheetType === 'crm' ? userSession.dataSheetId : userSession.darSheetId;
    
    const payload = {
        masterSheetId: userSession.masterSheetId,
        sheetId: sheetId
    };

    const historyData = await apiCall('getHistory', payload);
    const historyTable = document.getElementById('history-table');
    historyTable.innerHTML = ''; // Clear existing table
    
    if (historyData && historyData.length > 0) {
        // Simple rendering: Extract headers from the first object key names
        const headers = Object.keys(historyData[0]);
        let html = `<thead><tr>${headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('')}</tr></thead><tbody>`;
        
        historyData.forEach(row => {
            html += `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`;
        });
        
        historyTable.innerHTML = html + '</tbody>';
    } else {
        historyTable.innerHTML = '<tr><td>No history found.</td></tr>';
    }
}

// --- Initialization and Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.add('light-mode');
    }
    
    checkSession();
    
    // Auth Listeners
    authForm.addEventListener('click', (e) => {
        if (e.target.type === 'submit' || e.target.id === 'signup-btn') {
            handleAuth(e);
        }
    });

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

    // History Controls Listener
    document.querySelectorAll('.history-controls button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleShowHistory(e.target.getAttribute('data-history-type'));
        });
    });
});

// Utility function (Placeholder for full dashboard stats logic)
function fetchDashboardStats() {
    // In a full implementation, this would call a GAS action to aggregate data
    // from the user's sheets (e.g., total connections, conversion rates).
    console.log('Fetching and displaying dashboard stats...');
}
