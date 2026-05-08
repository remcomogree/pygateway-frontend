// PyGateway Admin UI JavaScript - Core Module

// Configuration
const API_BASE_URL = 'http://localhost:8001';

// Global state (shared across modules)
let plugins = [];
let dataplanes = [];
let availablePlugins = [];
let requestTrendsChart = null;

// Authentication state
let authToken = null;
let currentUser = null;
let ssoEnabled = false;

// Auto-refresh state
let autoRefreshInterval = null;
let autoRefreshEnabled = false;
const AUTO_REFRESH_INTERVAL = 30000; // 30 seconds

// Authentication functions (supports both SSO and Superadmin)
async function initializeAuth() {
    try {
        // Check if we're already on the login page to prevent redirect loop
        if (window.location.pathname === '/login.html') {
            console.log('Already on login page, skipping auth check');
            return true;
        }
        
        // Check current authentication status
        const response = await fetch('/api/auth/status');
        if (response.ok) {
            const authStatus = await response.json();
            
            if (authStatus.authenticated) {
                // User is authenticated
                currentUser = authStatus.user;
                authToken = 'authenticated'; // We don't need the actual token for UI
                ssoEnabled = authStatus.sso_enabled;
                
                console.log(`Authenticated via ${authStatus.auth_method}:`, authStatus.user);
                updateUIForAuthenticatedUser();
                return true;
            } else {
                // Not authenticated - redirect to login
                console.log('Not authenticated, redirecting to login');
                ssoEnabled = authStatus.sso_enabled;
                
                // Prevent redirect loop
                const redirectFlag = sessionStorage.getItem('auth_redirect_attempted');
                if (!redirectFlag) {
                    sessionStorage.setItem('auth_redirect_attempted', 'true');
                    window.location.href = '/login.html';
                } else {
                    console.log('Redirect loop prevented - showing error');
                    document.body.innerHTML = `
                        <div style="padding: 20px; text-align: center; font-family: Arial;">
                            <h2>Authentication Required</h2>
                            <p>Please <a href="/login.html">click here to login</a></p>
                            <button onclick="sessionStorage.clear(); window.location.reload();">Retry</button>
                        </div>
                    `;
                }
                return false;
            }
        } else {
            console.error('Failed to check auth status');
            return false;
        }
    } catch (error) {
        console.error('Auth initialization error:', error);
        return false;
    }
}

function updateUIForAuthenticatedUser() {
    if (currentUser) {
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        if (userInfo && userName) {
            userName.textContent = currentUser.name || currentUser.username || 'User';
            userInfo.style.display = 'block';
        }
    }
}

// App initialization
async function initializeApp() {
    console.log('Initializing app...');
    
    // Clear any redirect flags
    sessionStorage.removeItem('auth_redirect_attempted');
    
    try {
        // Load all data
        await Promise.all([
            loadWorkspaces(),
            loadServices(), 
            loadRoutes(),
            loadPlugins(),
            loadDataplanes()
        ]);
        
        // Load initial section (dashboard)
        showSection('dashboard');
        
        console.log('App initialized successfully');
    } catch (error) {
        console.error('Error initializing app:', error);
        document.body.innerHTML = `
            <div style="padding: 20px; text-align: center; font-family: Arial;">
                <h2>Initialization Error</h2>
                <p>Failed to load application data: ${error.message}</p>
                <button onclick="window.location.reload();">Retry</button>
            </div>
        `;
    }
}

// Navigation
function showSection(sectionName) {
    // Clear workspace/service context when navigating to main sections
    if (['dashboard', 'workspaces', 'services', 'routes', 'plugins', 'dataplanes', 'analytics', 'config'].includes(sectionName)) {
        window.currentWorkspace = null;
        window.currentService = null;
    }
    
    // Clear auto-refresh when switching sections
    if (autoRefreshEnabled && sectionName !== 'dataplanes') {
        toggleAutoRefresh(); // This will turn off auto-refresh
    }
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show target section
    document.getElementById(sectionName).style.display = 'block';
    
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'workspaces':
            loadWorkspaces();
            break;
        case 'services':
            loadServices();
            break;
        case 'routes':
            loadRoutes();
            break;
        case 'plugins':
            loadPlugins();
            break;
        case 'dataplanes':
            loadDataplanes();
            break;
        case 'config':
            loadConfiguration();
            break;
    }
    
    // Add active class to corresponding nav link
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
        // Check if the onclick handler matches the section
        const onclickMatch = link.getAttribute('onclick');
        if (onclickMatch && onclickMatch.includes(`'${sectionName}'`)) {
            link.classList.add('active');
        }
    });
}

// Utility function for authenticated requests
async function authenticatedFetch(url, options = {}) {
    const defaultOptions = {
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        }
    };
    
    return fetch(url, { ...defaultOptions, ...options });
}

// Modal functions
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function logout() {
    // Redirect to login
    window.location.href = '/login.html';
}

// Form event listeners
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOM loaded, starting initialization...');
    
    try {
        // Initialize authentication (both SSO and Superadmin)
        console.log('Initializing authentication...');
        const authInitialized = await initializeAuth();
        console.log('Auth initialization result:', authInitialized);
        
        if (!authInitialized) {
            return; // Authentication redirect will happen
        }
        
        // If authenticated, initialize the app
        await initializeApp();
    } catch (error) {
        console.error('Initialization error:', error);
        document.body.insertAdjacentHTML('afterbegin', 
            `<div style="position: fixed; top: 0; left: 0; background: red; color: white; padding: 5px; z-index: 9999;">
                Error: ${error.message}
            </div>`
        );
    }
});

// Form submission handlers
document.getElementById('createWorkspaceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    // Check if this is an edit operation
    const workspaceId = this.getAttribute('data-workspace-id');
    const isEdit = workspaceId !== null;
    
    const url = isEdit ? `${API_BASE_URL}/api/v1/workspaces/${workspaceId}` : `${API_BASE_URL}/api/v1/workspaces`;
    const method = isEdit ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        loadWorkspaces();
        loadDashboard();
        closeModal('createWorkspaceModal');
        this.reset();
        // Clear the workspace ID for future operations
        this.removeAttribute('data-workspace-id');
    })
    .catch(error => {
        alert(`Failed to ${isEdit ? 'update' : 'create'} workspace: ` + error.message);
    });
});

document.getElementById('createServiceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    data.port = parseInt(data.port);
    
    // Check if this is an edit operation
    const serviceId = this.getAttribute('data-service-id');
    const isEdit = serviceId !== null;
    
    const url = isEdit ? `${API_BASE_URL}/api/v1/services/${serviceId}` : `${API_BASE_URL}/api/v1/services`;
    const method = isEdit ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        loadServices();
        loadDashboard();
        closeModal('createServiceModal');
        this.reset();
        // Clear the service ID for future operations
        this.removeAttribute('data-service-id');
    })
    .catch(error => {
        alert(`Failed to ${isEdit ? 'update' : 'create'} service: ` + error.message);
    });
});

document.getElementById('createRouteForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = {};
    
    // Handle regular form fields
    for (let [key, value] of formData.entries()) {
        if (key === 'protocols' || key === 'methods') {
            // Skip - we'll handle these arrays separately
            continue;
        }
        data[key] = value;
    }
    
    // Handle checkbox arrays for protocols and methods
    data.protocols = Array.from(this.querySelectorAll('input[name="protocols"]:checked')).map(cb => cb.value);
    data.methods = Array.from(this.querySelectorAll('input[name="methods"]:checked')).map(cb => cb.value);
    
    // Handle paths and hosts (convert comma-separated strings to arrays)
    data.paths = data.paths ? data.paths.split(',').map(p => p.trim()).filter(p => p) : [];
    data.hosts = data.hosts ? data.hosts.split(',').map(h => h.trim()).filter(h => h) : [];
    
    // Convert boolean fields
    data.strip_path = data.strip_path === 'on';
    data.preserve_host = data.preserve_host === 'on';
    data.regex_priority = parseInt(data.regex_priority) || 0;
    
    // Check if this is an edit operation
    const routeId = this.getAttribute('data-route-id');
    const isEdit = routeId !== null;
    
    const url = isEdit ? `${API_BASE_URL}/api/v1/routes/${routeId}` : `${API_BASE_URL}/api/v1/routes`;
    const method = isEdit ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        loadRoutes();
        loadDashboard();
        closeModal('createRouteModal');
        this.reset();
        // Reset checkboxes
        this.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        // Clear the route ID for future operations
        this.removeAttribute('data-route-id');
    })
    .catch(error => {
        alert(`Failed to ${isEdit ? 'update' : 'create'} route: ` + error.message);
    });
});

// Stub functions for modules not yet created (plugins, dataplanes, etc.)
function loadPlugins() {
    // Placeholder - implement when needed
    console.log('Loading plugins...');
}

function loadDataplanes() {
    // Placeholder - implement when needed  
    console.log('Loading dataplanes...');
}

function loadConfiguration() {
    // Placeholder - implement when needed
    console.log('Loading configuration...');
}

function toggleAutoRefresh() {
    // Placeholder - implement when needed
    console.log('Toggle auto refresh...');
}

// Make core functions globally accessible
window.showSection = showSection;
window.closeModal = closeModal;
window.logout = logout;
window.authenticatedFetch = authenticatedFetch;
