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

// --- Authentication Process Core ---
async function processAuth(action) {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    if (!username || !password) {
        authMessage.textContent = 'Please enter both username and password.';
        return;
    }

    const data = await apiCall(action, { username, password });
    
    if (data) {
        // Handle login after successful signup
        if (action === 'signup') {
             // For simplicity, we automatically call login after signup
             const loginData = await apiCall('login', { username, password });
             if (loginData) {
                 userSession = loginData;
             }
        } else {
            // Data for login contains sheet IDs
            userSession = data;
        }
        
        if (userSession) {
            localStorage.setItem('crmUser', JSON.stringify(userSession));
            showApp();
        }
    }
}

// --- Specific Authentication Handlers (FIXED) ---
// 1. Handles the form's native 'submit' event (expected for the Login button)
function handleLoginSubmit(e) {
    e.preventDefault();
    processAuth('login');
}

// 2. Handles the explicit 'click' event for the Signup button (type="button")
function handleSignupClick(e) {
    e.preventDefault(); 
    processAuth('signup');
}

// --- Session and UI Functions ---

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
    fetchDashboardStats();
}

function handleLogout() {
    localStorage.removeItem('crmUser');
    userSession = null;
    showAuth();
}

// --- UI Navigation and Theme ---

function showPanel(targetId) {
    // Hide all panels
    document.querySelectorAll('.content-panel').forEach(panel => {
        panel.classList.remove('active');
        panel.classList.add('hidden');
    });
    
    // Show target panel with subtle animation
    const targetPanel = document.getElementById(`${targetId}-view`);
    if (targetPanel) {
        targetPanel.classList.remove('hidden');
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
    
    // --- START: Data Capture Logic ---
    const form = e.target;
    
    // Get primary connection data
    const connectionsSent = parseInt(form.elements.namedItem('connections_sent').value) || 0;
    const connectionsAccepted = parseInt(form.elements.namedItem('connections_accepted').value) || 0;
    const conversationRate = connectionsSent > 0 ? (connectionsAccepted / connectionsSent) * 100 : 0;
    
    // Get date/time/location data
    const dateIST = form.elements.namedItem('date_ist').value;
    const timeIST = form.elements.namedItem('time_ist').value;
    const countryTargeted = form.elements.namedItem('country_targeted').value;
    const state = form.elements.namedItem('state').value;
    
    // NOTE: Timezone calculation based on IST would need a robust library 
    // (like moment-timezone) or server-side calculation in GAS. 
    // We'll leave placeholders for the required data array.
    const timeCountry = 'Calculated Time'; // Placeholder
    const timeState = 'Calculated Time';   // Placeholder

    // Get prospect details (Example for a single prospect entry)
    const prospectName = form.elements.namedItem('prospect_name').value;
    const connectionDate = form.elements.namedItem('connection_date').value;
    const designation = form.elements.namedItem('designation').value;
    const followUpDate = connectionDate ? new Date(new Date(connectionDate).setDate(new Date(connectionDate).getDate() + 4)).toISOString().split('T')[0] : '';

    // Data array must match the column order in the Google Sheet template!
    const dataArray = [
        connectionsSent,
        connectionsAccepted,
        conversationRate.toFixed(2) + '%', 
        dateIST, 
        timeIST,
        countryTargeted, 
        state, 
        timeCountry, 
        timeState,
        prospectName, 
        connectionDate, 
        designation, 
        form.elements.namedItem('linkedin_url').value, 
        form.elements.namedItem('industry').value, 
        form.elements.namedItem('company_size').value, 
        form.elements.namedItem('recently_posted').checked ? 'Yes' : 'No', 
        form.elements.namedItem('relevance').value, 
        form.elements.namedItem('activity_rate').value, 
        form.elements.namedItem('hiring_tech').checked ? 'Yes' : 'No', 
        followUpDate
    ];
    // --- END: Data Capture Logic ---


    const payload = {
        masterSheetId: userSession.masterSheetId,
        sheetId: userSession.dataSheetId,
        data: dataArray 
    };

    const result = await apiCall('saveData', payload);
    if (result) {
        alert('CRM Entry Saved!');
        form.reset();
        fetchDashboardStats();
    }
}

// Function to handle adding more DAR fields (simplified)
function addDarEntryField() {
    const container = document.getElementById('dar-entries');
    const newEntry = document.createElement('div');
    newEntry.classList.add('dar-entry-row');
    newEntry.innerHTML = `
        <label>Date: <input type="date" name="dar_date" required></label>
        <label>Activity: <input type="text" name="dar_activity" placeholder="e.g., Email clean up" required></label>
        <label>Hours: <input type="number" name="dar_hours" step="0.5" required></label>
        <hr/>
    `;
    container.appendChild(newEntry);
}

// Function to handle DAR Submission (to save multiple entries)
async function handleDarSubmission(e) {
    e.preventDefault();
    const form = e.target;
    const entries = form.querySelectorAll('.dar-entry-row');
    const allDarData = [];

    entries.forEach(entry => {
        const date = entry.querySelector('input[name="dar_date"]').value;
        const activity = entry.querySelector('input[name="dar_activity"]').value;
        const hours = entry.querySelector('input[name="dar_hours"]').value;
        
        // Data array must match the %username% DAR sheet template (Date, Activity, Hours_Spent)
        allDarData.push([date, activity, parseFloat(hours) || 0]);
    });

    if (allDarData.length === 0) {
        alert("Please enter at least one activity.");
        return;
    }
    
    // We'll call the API for each row to keep the GAS save logic simple.
    // A more efficient method would be to send allDarData as a single array 
    // and modify the GAS script to use appendRows().
    for (const dataRow of allDarData) {
        const payload = {
            action: 'saveData', // Reusing the saveData action in GAS
            masterSheetId: userSession.masterSheetId,
            sheetId: userSession.darSheetId,
            data: dataRow 
        };
        await apiCall('saveData', payload);
    }
    
    alert('DAR Entries Saved!');
    form.reset();
}


// --- History Display Handler ---

async function handleShowHistory(sheetType) {
    const sheetId = sheetType === 'crm' ? userSession.dataSheetId : userSession.darSheetId;
    
    const payload = {
        masterSheetId: userSession.masterSheetId,
        sheetId: sheetId
    };

    // Ensure history view is active before fetching data
    const historyTable = document.getElementById('history-table');
    historyTable.innerHTML = '<tr><td colspan="100">Loading history...</td></tr>'; 
    
    const historyData = await apiCall('getHistory', payload);
    
    historyTable.innerHTML = ''; // Clear loading message
    
    if (historyData && historyData.length > 0) {
        // Extract headers from the first object key names
        const headers = Object.keys(historyData[0]);
        let html = `<thead><tr>${headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('')}</tr></thead><tbody>`;
        
        historyData.forEach(row => {
            html += `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`;
        });
        
        historyTable.innerHTML = html + '</tbody>';
    } else {
        historyTable.innerHTML = '<tr><td>No history found for this category.</td></tr>';
    }
}

// Utility function (Placeholder for full dashboard stats logic)
function fetchDashboardStats() {
    // Logic to call GAS action to aggregate data for dashboard
    console.log('Fetching and displaying dashboard stats...');
    document.getElementById('total-sent').textContent = '250'; // Mock data
    // Implement API call to retrieve actual calculated stats
}

// --- Initialization and Event Listeners ---

document.addEventListener('DOMContentLoaded', () => {
    // Apply saved theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    } else {
        document.body.add('light-mode');
    }
    
    checkSession();
    
    // --- AUTH LISTENERS (FIXED) ---
    // 1. Handle Login (on form submit)
    authForm.addEventListener('submit', handleLoginSubmit);

    // 2. Handle Signup (on button click)
    document.getElementById('signup-btn').addEventListener('click', handleSignupClick);
    // --- END AUTH LISTENERS FIX ---

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
    // Initialize one DAR row
    addDarEntryField(); 

    // History Controls Listener
    document.querySelectorAll('.history-controls button').forEach(btn => {
        btn.addEventListener('click', (e) => {
            handleShowHistory(e.target.getAttribute('data-history-type'));
        });
    });
});
