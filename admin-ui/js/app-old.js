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

function validateJWTToken(token) {
    // Use the cross-app SSO manager for validation
    if (window.crossAppSSO && window.crossAppSSO.validateToken(token)) {
        // Extract user info from the token
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                
                // Set current user info
                currentUser = {
                    sub: payload.sub,
                    email: payload.email || payload.preferred_username || payload.upn,
                    name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim() || payload.email || payload.sub,
                    roles: payload.roles || payload.role || payload.groups || []
                };
                
                console.log('User info extracted:', currentUser);
                
                // Update user info display immediately
                updateUserInfoDisplay();
                
                return true;
            }
        } catch (error) {
            console.error('Error extracting user info:', error);
        }
    }
    return false;
}

function updateUserInfoDisplay() {
    if (ssoEnabled && currentUser) {
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        if (userInfo && userName) {
            userName.textContent = currentUser.name || currentUser.email || currentUser.sub || 'User';
            userInfo.style.display = 'flex';
            console.log('User info displayed:', userName.textContent);
        } else {
            console.log('User info elements not found in DOM');
        }
    }
}

async function logout() {
    try {
        // Try to call the appropriate logout endpoint
        if (currentUser && currentUser.is_superadmin) {
            // Superadmin logout
            await fetch('/api/superadmin/logout', { method: 'POST' });
        } else {
            // SSO logout
            await fetch('/api/sso-logout', { method: 'POST' });
        }
    } catch (error) {
        console.error('Logout API call failed:', error);
    }
    
    // Clear local state
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('admin_token');
    authToken = null;
    currentUser = null;
    
    // Clear session storage
    sessionStorage.clear();
    
    // Redirect to login
    window.location.href = '/login.html';
}

// Authentication functions
function getAuthHeaders() {
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    return headers;
}

function setAuthToken(token) {
    authToken = token;
    if (token) {
        if (ssoEnabled && window.crossAppSSO) {
            window.crossAppSSO.storeToken(token);
        } else {
            localStorage.setItem('admin_token', token);
        }
    } else {
        if (ssoEnabled && window.crossAppSSO) {
            window.crossAppSSO.clearToken();
        } else {
            localStorage.removeItem('admin_token');
        }
    }
}

function loadAuthToken() {
    if (ssoEnabled && window.crossAppSSO) {
        // Use cross-app SSO manager to get token
        window.crossAppSSO.getToken().then(token => {
            if (token) {
                authToken = token;
            }
        });
    } else {
        const token = localStorage.getItem('admin_token');
        if (token) {
            authToken = token;
        }
    }
}

async function checkAuthStatus() {
    // Check SSO configuration from the SSO config endpoint
    try {
        const ssoResponse = await fetch('/api/sso-config');
        if (ssoResponse.ok) {
            const ssoConfig = await ssoResponse.json();
            ssoEnabled = ssoConfig.enabled;
            window.SSO_CONFIG = ssoConfig;
            
            if (ssoEnabled) {
                // Check if we have a valid token stored
                const token = localStorage.getItem('jwt_token');
                if (token && validateJWTToken(token)) {
                    authToken = token;
                    updateUIForAuthenticatedUser();
                    return true;
                } else {
                    showLoginPrompt();
                    return false;
                }
            }
        }
    } catch (error) {
        console.log('SSO config check failed, assuming no SSO:', error);
        ssoEnabled = false;
    }
    
    return true;
}

function updateUIForAuthenticatedUser() {
    // Add user info to header
    const headerContent = document.querySelector('.header-content');
    if (headerContent && currentUser && !document.querySelector('.user-info')) {
        const userInfo = document.createElement('div');
        userInfo.className = 'user-info';
        userInfo.style.cssText = 'margin-left: auto; color: white; display: flex; align-items: center; gap: 10px;';
        
        const userName = currentUser.username || currentUser.name || currentUser.email || currentUser.sub || 'User';
        const authMethod = currentUser.is_superadmin ? 'Superadmin' : 'SSO';
        const authIcon = currentUser.is_superadmin ? '🔧' : '👤';
        
        userInfo.innerHTML = `
            <span title="Authenticated via ${authMethod}">${authIcon} ${userName}</span>
            <span style="font-size: 0.8em; opacity: 0.8;">(${authMethod})</span>
            <button onclick="logout()" style="background: rgba(255,255,255,0.2); border: none; color: white; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Logout</button>
        `;
        headerContent.appendChild(userInfo);
    }
}

function showLoginPrompt() {
    const loginHtml = `
        <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 1000;">
            <div style="background: white; padding: 2rem; border-radius: 8px; max-width: 400px; width: 90%;">
                <h2 style="margin-top: 0;">Authentication Required</h2>
                <p>Please enter your JWT token to access the PyGateway Admin UI:</p>
                <div style="margin: 1rem 0;">
                    <label for="jwt-token" style="display: block; margin-bottom: 0.5rem;">JWT Token:</label>
                    <textarea id="jwt-token" placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..." 
                        style="width: 100%; height: 100px; padding: 0.5rem; border: 1px solid #ddd; border-radius: 4px; font-family: monospace; font-size: 12px;"></textarea>
                </div>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button onclick="login()" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">Login</button>
                </div>
                <div id="login-error" style="color: red; margin-top: 10px; display: none;"></div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', loginHtml);
}

async function login() {
    const tokenInput = document.getElementById('jwt-token');
    const errorDiv = document.getElementById('login-error');
    const token = tokenInput.value.trim();
    
    if (!token) {
        errorDiv.textContent = 'Please enter a JWT token';
        errorDiv.style.display = 'block';
        return;
    }
    
    try {
        // Validate JWT token locally (frontend-only)
        if (!validateJWTToken(token)) {
            errorDiv.textContent = 'Invalid JWT token or insufficient permissions';
            errorDiv.style.display = 'block';
            return;
        }
        
        setAuthToken(token);
        
        // Remove login prompt
        const loginPrompt = document.querySelector('[style*="position: fixed"]');
        if (loginPrompt) {
            loginPrompt.remove();
        }
        
        // Update UI and reload data
        updateUIForAuthenticatedUser();
        await initializeApp();
        
    } catch (error) {
        errorDiv.textContent = 'Token validation error: ' + error.message;
        errorDiv.style.display = 'block';
        setAuthToken(null);
    }
}

// Alternative logout function (remove duplicate)
// This function is now redundant - using the async logout above

// Enhanced fetch function with auth
async function authenticatedFetch(url, options = {}) {
    const defaultOptions = {
        headers: getAuthHeaders()
    };
    
    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers
        }
    };
    
    const response = await fetch(url, mergedOptions);
    
    // Handle authentication errors
    if (response.status === 401 && ssoEnabled) {
        logout();
        return null;
    }
    
    return response;
}

// Initialize the application
async function initializeApp() {
    // Show user info if SSO is enabled
    if (ssoEnabled && currentUser) {
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        if (userInfo && userName) {
            userName.textContent = currentUser.name || currentUser.email || currentUser.sub || 'User';
            userInfo.style.display = 'flex';
        }
    }
    
    loadDashboard();
    loadWorkspaces();
    loadServices();
    loadRoutes();
    loadPlugins();
    loadDataplanes();
    loadAvailablePlugins();
    loadAnalytics();
}

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

// Navigation
function showSection(sectionName) {
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
    
    // Show selected section
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

// Make showSection globally accessible
window.showSection = showSection;

// Dashboard
function loadDashboard() {
    console.log('Loading dashboard...');
    
    // Simple test first
    document.getElementById('dashboard-stats').innerHTML = '<div>JavaScript is working...</div>';
    
    // Load both config and dataplanes data
    Promise.all([
        authenticatedFetch(`${API_BASE_URL}/api/v1/config/sync`).then(response => {
            console.log('Config response:', response);
            if (!response.ok) {
                throw new Error(`Config API error: ${response.status}`);
            }
            return response.json();
        }),
        authenticatedFetch(`${API_BASE_URL}/api/v1/dataplanes/`).then(response => {
            console.log('Dataplanes response:', response);
            if (!response.ok) {
                throw new Error(`Dataplanes API error: ${response.status}`);
            }
            return response.json();
        })
    ])
    .then(([configData, dataplanesData]) => {
        console.log('Config data:', configData);
        console.log('Dataplanes data:', dataplanesData);
        const onlineDataplanes = dataplanesData.filter(dp => dp.status === 'online').length;
        const totalDataplanes = dataplanesData.length;
        
        // Create dashboard stats container
        const dashboardContainer = document.createElement('div');
        dashboardContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;';
        
        // Create workspace card
        const workspaceCard = document.createElement('div');
        workspaceCard.className = 'card dashboard-card';
        workspaceCard.style.cursor = 'pointer';
        workspaceCard.innerHTML = `
            <h3>Workspaces</h3>
            <p style="font-size: 2rem; font-weight: bold; color: #9b59b6;">${configData.workspaces.length}</p>
        `;
        workspaceCard.addEventListener('click', () => showSection('workspaces'));
        
        // Create services card
        const servicesCard = document.createElement('div');
        servicesCard.className = 'card dashboard-card';
        servicesCard.style.cursor = 'pointer';
        servicesCard.innerHTML = `
            <h3>Services</h3>
            <p style="font-size: 2rem; font-weight: bold; color: #3498db;">${configData.services.length}</p>
        `;
        servicesCard.addEventListener('click', () => showSection('services'));
        
        // Create routes card
        const routesCard = document.createElement('div');
        routesCard.className = 'card dashboard-card';
        routesCard.style.cursor = 'pointer';
        routesCard.innerHTML = `
            <h3>Routes</h3>
            <p style="font-size: 2rem; font-weight: bold; color: #27ae60;">${configData.routes.length}</p>
        `;
        routesCard.addEventListener('click', () => showSection('routes'));
        
        // Create plugins card
        const pluginsCard = document.createElement('div');
        pluginsCard.className = 'card dashboard-card';
        pluginsCard.style.cursor = 'pointer';
        pluginsCard.innerHTML = `
            <h3>Plugins</h3>
            <p style="font-size: 2rem; font-weight: bold; color: #e74c3c;">${configData.plugins.length}</p>
        `;
        pluginsCard.addEventListener('click', () => showSection('plugins'));
        
        // Create dataplanes card
        const dataplanesCard = document.createElement('div');
        dataplanesCard.className = 'card dashboard-card';
        dataplanesCard.style.cursor = 'pointer';
        dataplanesCard.innerHTML = `
            <h3>Dataplanes</h3>
            <p style="font-size: 2rem; font-weight: bold; color: #f39c12;">
                <span class="status-indicator ${onlineDataplanes > 0 ? 'status-online' : 'status-offline'}"></span>
                ${onlineDataplanes}/${totalDataplanes}
            </p>
            <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                ${onlineDataplanes === totalDataplanes ? 'All Online' : 
                  onlineDataplanes === 0 ? 'All Offline' : 
                  `${totalDataplanes - onlineDataplanes} Offline`}
            </p>
        `;
        dataplanesCard.addEventListener('click', () => showSection('dataplanes'));
        
        // Create config version card
        const configCard = document.createElement('div');
        configCard.className = 'card';
        configCard.innerHTML = `
            <h3>Config Version</h3>
            <p style="font-size: 1.2rem; font-weight: bold; color: #8e44ad;">${configData.version}</p>
        `;
        
        // Append all cards to container
        dashboardContainer.appendChild(workspaceCard);
        dashboardContainer.appendChild(servicesCard);
        dashboardContainer.appendChild(routesCard);
        dashboardContainer.appendChild(pluginsCard);
        dashboardContainer.appendChild(dataplanesCard);
        dashboardContainer.appendChild(configCard);
        
        // Clear and set the dashboard stats
        const dashboardStats = document.getElementById('dashboard-stats');
        dashboardStats.innerHTML = '';
        dashboardStats.appendChild(dashboardContainer);
        
        // Add dataplane status details if there are any dataplanes
        if (dataplanesData.length > 0) {
            const dataplaneDetails = document.createElement('div');
            dataplaneDetails.className = 'card';
            dataplaneDetails.style.marginTop = '1rem';
            dataplaneDetails.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>Dataplane Status</h2>
                    <button class="btn btn-small" onclick="showSection('dataplanes')">View All</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    ${dataplanesData.map(dp => `
                        <div class="dashboard-dataplane-card ${dp.status === 'offline' ? 'offline' : ''}">
                            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                                <span class="status-indicator ${dp.status === 'online' ? 'status-online' : 'status-offline'}"></span>
                                <strong style="margin-left: 0.5rem;">${dp.name}</strong>
                                <span style="margin-left: auto; font-size: 0.8em; color: #666; text-transform: capitalize;">${dp.status}</span>
                            </div>
                            <div style="font-size: 0.9rem; color: #666;">
                                <div>ID: <code style="font-size: 0.8em;">${dp.id.substring(0, 8)}...</code></div>
                                <div>Last seen: ${formatLastSeen(dp.last_seen)}</div>
                                <div>Uptime: ${formatUptime(dp.created_at)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            document.getElementById('dashboard-stats').appendChild(dataplaneDetails);
        }
    })
    .catch(error => {
        console.error('Error loading dashboard:', error);
        document.getElementById('dashboard-stats').innerHTML = `
            <div class="error">Failed to load dashboard: ${error.message}</div>
        `;
    });
}

// Workspaces
function loadWorkspaces() {
    authenticatedFetch(`${API_BASE_URL}/api/v1/workspaces`)
        .then(response => response.json())
        .then(data => {
            workspaces = data;
            displayWorkspaces();
            updateWorkspaceSelects();
        })
        .catch(error => {
            document.getElementById('workspaces-content').innerHTML = `
                <div class="error">Failed to load workspaces: ${error.message}</div>
            `;
        });
}

function displayWorkspaces() {
    const content = document.getElementById('workspaces-content');
    if (workspaces.length === 0) {
        content.innerHTML = '<p>No workspaces found. Create your first workspace to get started.</p>';
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Services</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${workspaces.map(workspace => {
                    const workspaceServices = services.filter(s => s.workspace_id === workspace.id);
                    const serviceCount = workspaceServices.length;
                    
                    return `
                        <tr>
                            <td>
                                <strong>
                                    <a href="#" onclick="showWorkspaceServices('${workspace.id}', '${workspace.name}')" 
                                       style="color: #2c3e50; text-decoration: none; cursor: pointer;">
                                        ${workspace.name}
                                    </a>
                                </strong>
                            </td>
                            <td>${workspace.description || 'No description'}</td>
                            <td>
                                <div class="service-count">${serviceCount} service${serviceCount !== 1 ? 's' : ''}</div>
                            </td>
                            <td>
                                <span class="status-badge ${workspace.enabled ? 'status-enabled' : 'status-disabled'}">
                                    ${workspace.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </td>
                            <td>${new Date(workspace.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn" onclick="editWorkspace('${workspace.id}')">Edit</button>
                                <button class="btn btn-danger" onclick="deleteWorkspace('${workspace.id}', '${workspace.name}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = table;
}

function updateWorkspaceSelects() {
    const workspaceSelects = document.querySelectorAll('select[name="workspace_id"]');
    workspaceSelects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select a workspace...</option>';
        workspaces.forEach(workspace => {
            if (workspace.enabled) {
                const option = document.createElement('option');
                option.value = workspace.id;
                option.textContent = workspace.name;
                option.selected = option.value === currentValue;
                select.appendChild(option);
            }
        });
    });
}

function showCreateWorkspaceModal() {
    document.getElementById('createWorkspaceModal').style.display = 'block';
}

function editWorkspace(workspaceId) {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;

    // Fill form with current values
    document.getElementById('workspaceName').value = workspace.name;
    document.getElementById('workspaceDescription').value = workspace.description || '';
    document.getElementById('workspaceEnabled').checked = workspace.enabled;

    // Change form action to update
    const form = document.getElementById('createWorkspaceForm');
    form.onsubmit = function(e) {
        e.preventDefault();
        updateWorkspace(workspaceId);
    };

    // Show modal with updated title
    document.querySelector('#createWorkspaceModal h2').textContent = 'Edit Workspace';
    document.getElementById('createWorkspaceModal').style.display = 'block';
}

function deleteWorkspace(workspaceId, workspaceName) {
    if (!confirm(`Are you sure you want to delete workspace "${workspaceName}"?`)) {
        return;
    }

    fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            loadWorkspaces();
            loadServices(); // Refresh services as they may be affected
        } else {
            return response.json().then(err => Promise.reject(err));
        }
    })
    .catch(error => {
        alert(`Failed to delete workspace: ${error.detail || error.message}`);
    });
}

function updateWorkspace(workspaceId) {
    const formData = new FormData(document.getElementById('createWorkspaceForm'));
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        enabled: formData.get('enabled') === 'on'
    };

    fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            closeModal('createWorkspaceModal');
            loadWorkspaces();
            // Reset form
            document.getElementById('createWorkspaceForm').reset();
            document.getElementById('createWorkspaceForm').onsubmit = createWorkspace;
            document.querySelector('#createWorkspaceModal h2').textContent = 'Create Workspace';
        } else {
            return response.json().then(err => Promise.reject(err));
        }
    })
    .catch(error => {
        alert(`Failed to update workspace: ${error.detail || error.message}`);
    });
}

// Show services for a specific workspace
function showWorkspaceServices(workspaceId, workspaceName) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show services section
    document.getElementById('services').style.display = 'block';
    
    // Update the services section header
    const servicesSection = document.getElementById('services');
    const cardHeader = servicesSection.querySelector('.card > div:first-child');
    cardHeader.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
            <button class="btn" onclick="showSection('workspaces')" style="margin-right: 1rem;">← Back to Workspaces</button>
            <h2 style="margin: 0; margin-right: 2rem;">Services in "${workspaceName}" workspace</h2>
            <button class="btn btn-success" onclick="showCreateServiceModalForWorkspace('${workspaceId}', '${workspaceName}')" 
                    style="margin-left: auto;">Add Service</button>
        </div>
    `;
    
    // Filter and display services for this workspace
    const workspaceServices = services.filter(s => s.workspace_id === workspaceId);
    
    const content = document.getElementById('services-content');
    content.innerHTML = `
        <div id="workspace-services-list">
            ${workspaceServices.length === 0 ? 
                '<p>No services found in this workspace.</p>' : 
                generateServicesTable(workspaceServices, true)
            }
        </div>
    `;
}

// Generate services table HTML
function generateServicesTable(servicesList, isWorkspaceView = false) {
    return `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th>Protocol</th>
                    ${!isWorkspaceView ? '<th>Workspace</th>' : ''}
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${servicesList.map(service => {
                    const workspace = workspaces.find(w => w.id === service.workspace_id);
                    return `
                        <tr>
                            <td><strong>${service.name}</strong></td>
                            <td>${service.host}</td>
                            <td>${service.port}</td>
                            <td>${service.protocol}</td>
                            ${!isWorkspaceView ? `<td>${workspace ? workspace.name : 'Unknown'}</td>` : ''}
                            <td>
                                <span class="status-badge ${service.enabled ? 'status-enabled' : 'status-disabled'}">
                                    ${service.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </td>
                            <td>
                                <button class="btn" onclick="editService('${service.id}')">Edit</button>
                                <button class="btn btn-danger" onclick="deleteService('${service.id}', '${service.name}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// Make function globally accessible
window.showWorkspaceServices = showWorkspaceServices;

// Services
function loadServices() {
    fetch(`${API_BASE_URL}/api/v1/services`)
        .then(response => response.json())
        .then(data => {
            services = data;
            displayServices();
        })
        .catch(error => {
            document.getElementById('services-content').innerHTML = `
                <div class="error">Failed to load services: ${error.message}</div>
            `;
        });
}

function displayServices() {
    // Restore normal services header
    const servicesSection = document.getElementById('services');
    const cardHeader = servicesSection.querySelector('.card > div:first-child');
    cardHeader.innerHTML = `
        <h2>Services</h2>
        <button class="btn btn-success" onclick="showCreateServiceModal()">Add Service</button>
    `;
    
    const content = document.getElementById('services-content');
    if (services.length === 0) {
        content.innerHTML = '<p>No services configured.</p>';
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Workspace</th>
                    <th>Protocol</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${services.map(service => {
                    const workspace = workspaces.find(w => w.id === service.workspace_id);
                    const workspaceName = workspace ? workspace.name : 'Unknown';
                    return `
                        <tr>
                            <td>${service.name}</td>
                            <td><strong>${workspaceName}</strong></td>
                            <td>${service.protocol}</td>
                            <td>${service.host}</td>
                            <td>${service.port}</td>
                            <td>${service.path || '/'}</td>
                            <td>
                                <span class="status-badge ${service.enabled ? 'status-enabled' : 'status-disabled'}">
                                    ${service.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-danger" onclick="deleteService('${service.id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = table;
}

function showCreateServiceModal() {
    // Reset the form for new service creation
    const form = document.getElementById('createServiceForm');
    form.removeAttribute('data-service-id');
    form.reset();
    
    // Reset modal title and button
    const modalTitle = document.querySelector('#createServiceModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Create Service';
    }
    
    const submitButton = document.querySelector('#createServiceForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Service';
    }
    
    document.getElementById('createServiceModal').style.display = 'block';
}

function showCreateServiceModalForWorkspace(workspaceId, workspaceName) {
    // Pre-fill the workspace in the form using correct field ID
    document.getElementById('serviceWorkspace').value = workspaceId;
    
    // Reset the form for new service creation
    const form = document.getElementById('createServiceForm');
    form.removeAttribute('data-service-id');
    
    // Reset modal title and button
    const modalTitle = document.querySelector('#createServiceModal h2');
    if (modalTitle) {
        modalTitle.textContent = `Add Service to "${workspaceName}" workspace`;
    }
    
    const submitButton = document.querySelector('#createServiceForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Service';
    }
    
    // Show the modal
    document.getElementById('createServiceModal').style.display = 'block';
}

// Make function globally accessible
window.showCreateServiceModalForWorkspace = showCreateServiceModalForWorkspace;

function editService(serviceId) {
    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    // Fill form with current values using correct field IDs
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceHost').value = service.host;
    document.getElementById('servicePort').value = service.port;
    document.getElementById('serviceProtocol').value = service.protocol;
    document.getElementById('servicePath').value = service.path || '/';
    
    // Set workspace using correct ID
    document.getElementById('serviceWorkspace').value = service.workspace_id;

    // Change form action to update
    const form = document.getElementById('createServiceForm');
    form.setAttribute('data-service-id', serviceId);
    
    // Update modal title
    const modalTitle = document.querySelector('#createServiceModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Service';
    }
    
    // Update submit button text
    const submitButton = document.querySelector('#createServiceForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Update Service';
    }
    
    // Show modal
    document.getElementById('createServiceModal').style.display = 'block';
}

// Make function globally accessible
window.editService = editService;

function deleteService(serviceId) {
    if (confirm('Are you sure you want to delete this service?')) {
        fetch(`${API_BASE_URL}/api/v1/services/${serviceId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            loadServices();
            loadDashboard();
        })
        .catch(error => {
            alert('Failed to delete service: ' + error.message);
        });
    }
}

// Dataplanes
function loadDataplanes() {
    fetch(`${API_BASE_URL}/api/v1/dataplanes/`)
        .then(response => response.json())
        .then(data => {
            dataplanes = data;
            displayDataplanes();
        })
        .catch(error => {
            document.getElementById('dataplanes-content').innerHTML = `
                <div class="error">Failed to load dataplanes: ${error.message}</div>
            `;
        });
}

function displayDataplanes() {
    const content = document.getElementById('dataplanes-content');
    if (dataplanes.length === 0) {
        content.innerHTML = '<p>No dataplanes registered.</p>';
        updateDataplaneCount();
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Status</th>
                    <th>Name</th>
                    <th>ID</th>
                    <th>Version</th>
                    <th>Last Seen</th>
                    <th>Uptime</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${dataplanes.map(dataplane => `
                    <tr>
                        <td>
                            <span class="status-indicator ${getDataplaneStatusClass(dataplane.status)}"></span>
                            <span style="text-transform: capitalize;">${dataplane.status}</span>
                        </td>
                        <td>${dataplane.name}</td>
                        <td><code>${dataplane.id}</code></td>
                        <td>${dataplane.config_version ? dataplane.config_version.substring(0, 8) : 'Unknown'}</td>
                        <td class="last-seen">${formatLastSeen(dataplane.last_seen)}</td>
                        <td>${formatUptime(dataplane.created_at)}</td>
                        <td>
                            <button class="btn btn-small" onclick="viewDataplaneDetails('${dataplane.id}')">Details</button>
                            ${dataplane.status === 'offline' ? 
                                `<button class="btn btn-danger btn-small" onclick="removeDataplane('${dataplane.id}')">Remove</button>` : 
                                ''
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    content.innerHTML = table;
    updateDataplaneCount();
}

function getDataplaneStatusClass(status) {
    switch(status) {
        case 'online':
            return 'status-online';
        case 'offline':
            return 'status-offline';
        default:
            return 'status-unknown';
    }
}

function formatLastSeen(lastSeen) {
    if (!lastSeen) return 'Never';
    const now = new Date();
    // Ensure we're parsing the UTC timestamp correctly
    const lastSeenDate = new Date(lastSeen.endsWith('Z') ? lastSeen : lastSeen + 'Z');
    const diffInSeconds = Math.floor((now - lastSeenDate) / 1000);
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds}s ago`;
    } else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)}m ago`;
    } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)}h ago`;
    } else {
        return `${Math.floor(diffInSeconds / 86400)}d ago`;
    }
}

function formatUptime(createdAt) {
    if (!createdAt) return 'Unknown';
    const now = new Date();
    // Ensure we're parsing the UTC timestamp correctly
    const createdDate = new Date(createdAt.endsWith('Z') ? createdAt : createdAt + 'Z');
    const diffInSeconds = Math.floor((now - createdDate) / 1000);
    
    if (diffInSeconds < 60) {
        return `${diffInSeconds}s`;
    } else if (diffInSeconds < 3600) {
        return `${Math.floor(diffInSeconds / 60)}m`;
    } else if (diffInSeconds < 86400) {
        return `${Math.floor(diffInSeconds / 3600)}h`;
    } else {
        return `${Math.floor(diffInSeconds / 86400)}d`;
    }
}

function viewDataplaneDetails(dataplaneId) {
    const dataplane = dataplanes.find(dp => dp.id === dataplaneId);
    if (!dataplane) return;

    const details = `
        <div class="dataplane-details">
            <div class="dataplane-info">
                <p><strong>Name:</strong> ${dataplane.name}</p>
                <p><strong>ID:</strong> <code>${dataplane.id}</code></p>
                <p><strong>IP Address:</strong> ${dataplane.ip}</p>
                <p><strong>Port:</strong> ${dataplane.port}</p>
                <p><strong>Status:</strong> <span class="status-indicator ${getDataplaneStatusClass(dataplane.status)}"></span> <span style="text-transform: capitalize;">${dataplane.status}</span></p>
                <p><strong>Config Version:</strong> <code>${dataplane.config_version}</code></p>
                <p><strong>Created:</strong> ${new Date(dataplane.created_at).toLocaleString()}</p>
                <p><strong>Last Seen:</strong> ${dataplane.last_seen ? new Date(dataplane.last_seen).toLocaleString() : 'Never'}</p>
                <p><strong>Uptime:</strong> ${formatUptime(dataplane.created_at)}</p>
            </div>
        </div>
    `;

    document.getElementById('dataplaneDetailsContent').innerHTML = details;
    openModal('dataplaneDetailsModal');
}

function removeDataplane(dataplaneId) {
    if (!confirm('Are you sure you want to remove this dataplane?')) {
        return;
    }

    fetch(`${API_BASE_URL}/api/v1/dataplanes/${dataplaneId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            loadDataplanes();
        } else {
            return response.json().then(err => Promise.reject(err));
        }
    })
    .catch(error => {
        alert(`Failed to remove dataplane: ${error.detail || error.message}`);
    });
}

function toggleAutoRefresh() {
    autoRefreshEnabled = !autoRefreshEnabled;
    const btn = document.getElementById('autoRefreshBtn');
    
    if (autoRefreshEnabled) {
        btn.textContent = 'Auto-refresh: ON';
        btn.classList.add('btn-success');
        autoRefreshInterval = setInterval(() => {
            if (document.getElementById('dataplanes').style.display !== 'none') {
                loadDataplanes();
            }
        }, AUTO_REFRESH_INTERVAL);
    } else {
        btn.textContent = 'Auto-refresh: OFF';
        btn.classList.remove('btn-success');
        if (autoRefreshInterval) {
            clearInterval(autoRefreshInterval);
            autoRefreshInterval = null;
        }
    }
}

function updateDataplaneCount() {
    const countElement = document.getElementById('dataplaneCount');
    if (countElement && dataplanes.length > 0) {
        const onlineCount = dataplanes.filter(dp => dp.status === 'online').length;
        const totalCount = dataplanes.length;
        countElement.textContent = `(${onlineCount}/${totalCount} online)`;
    }
}

// Routes
function loadRoutes() {
    fetch(`${API_BASE_URL}/api/v1/routes`)
        .then(response => response.json())
        .then(data => {
            routes = data;
            displayRoutes();
        })
        .catch(error => {
            document.getElementById('routes-content').innerHTML = `
                <div class="error">Failed to load routes: ${error.message}</div>
            `;
        });
}

function displayRoutes() {
    const content = document.getElementById('routes-content');
    if (routes.length === 0) {
        content.innerHTML = '<p>No routes configured.</p>';
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Service</th>
                    <th>Paths</th>
                    <th>Hosts</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${routes.map(route => {
                    const service = services.find(s => s.id === route.service_id);
                    return `
                        <tr>
                            <td>${route.name}</td>
                            <td>${service ? service.name : 'Unknown'}</td>
                            <td>${route.paths.join(', ')}</td>
                            <td>${route.hosts.join(', ')}</td>
                            <td>
                                <span class="status-badge ${route.enabled ? 'status-enabled' : 'status-disabled'}">
                                    ${route.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-danger" onclick="deleteRoute('${route.id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = table;
}

function showCreateRouteModal() {
    // Populate service options
    const serviceSelect = document.getElementById('routeService');
    serviceSelect.innerHTML = '<option value="">Select a service</option>';
    services.forEach(service => {
        serviceSelect.innerHTML += `<option value="${service.id}">${service.name}</option>`;
    });
    
    document.getElementById('createRouteModal').style.display = 'block';
}

function deleteRoute(routeId) {
    if (confirm('Are you sure you want to delete this route?')) {
        fetch(`${API_BASE_URL}/api/v1/routes/${routeId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            loadRoutes();
            loadDashboard();
        })
        .catch(error => {
            alert('Failed to delete route: ' + error.message);
        });
    }
}

// Plugins
function loadPlugins() {
    fetch(`${API_BASE_URL}/api/v1/plugins`)
        .then(response => response.json())
        .then(data => {
            plugins = data;
            displayPlugins();
        })
        .catch(error => {
            document.getElementById('plugins-content').innerHTML = `
                <div class="error">Failed to load plugins: ${error.message}</div>
            `;
        });
}

function displayPlugins() {
    const content = document.getElementById('plugins-content');
    if (plugins.length === 0) {
        content.innerHTML = '<p>No plugins configured.</p>';
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Service</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${plugins.map(plugin => {
                    const service = services.find(s => s.id === plugin.service_id);
                    const route = routes.find(r => r.id === plugin.route_id);
                    return `
                        <tr>
                            <td>${plugin.name}</td>
                            <td>${plugin.name}</td>
                            <td>${service ? service.name : 'Global'}</td>
                            <td>${route ? route.name : 'Any'}</td>
                            <td>
                                <span class="status-badge ${plugin.enabled ? 'status-enabled' : 'status-disabled'}">
                                    ${plugin.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-danger" onclick="deletePlugin('${plugin.id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = table;
}

// Configuration
function loadConfiguration() {
    const content = document.getElementById('config-content');
    content.innerHTML = '<div class="loading">Loading configuration...</div>';
    
    fetch(`${API_BASE_URL}/api/v1/config/sync`)
        .then(response => response.json())
        .then(data => {
            renderConfiguration(data);
        })
        .catch(error => {
            content.innerHTML = '<div class="error">Failed to load configuration</div>';
        });
}

function renderConfiguration(config) {
    const content = document.getElementById('config-content');
    
    const renderConfigItems = (items, type) => {
        return items.map(item => {
            let displayText = '';
            let details = '';
            
            switch(type) {
                case 'service':
                    displayText = item.name;
                    details = `${item.protocol}://${item.host}:${item.port}${item.path || ''}`;
                    break;
                case 'route':
                    displayText = item.name;
                    details = `Paths: ${item.paths.join(', ')} | Methods: ${item.methods.join(', ')}`;
                    break;
                case 'plugin':
                    displayText = item.name;
                    details = `Priority: ${item.priority} | Enabled: ${item.enabled}`;
                    break;
                case 'consumer':
                    displayText = item.username || item.id;
                    details = `ID: ${item.id}`;
                    break;
            }
            
            return `
                <div class="config-item" onclick="editConfigItem('${type}', '${item.id}', '${item.name || item.username || item.id}')">
                    <div class="config-item-header">
                        <div class="config-item-name">${displayText}</div>
                        <div class="config-item-type">${type}</div>
                    </div>
                    <div class="config-item-details">${details}</div>
                </div>
            `;
        }).join('');
    };
    
    const html = `
        <div class="config-container">
            <!-- Statistics -->
            <div class="config-stats">
                <div class="config-stat">
                    <div class="config-stat-number">${config.services.length}</div>
                    <div class="config-stat-label">Services</div>
                </div>
                <div class="config-stat">
                    <div class="config-stat-number">${config.routes.length}</div>
                    <div class="config-stat-label">Routes</div>
                </div>
                <div class="config-stat">
                    <div class="config-stat-number">${config.plugins.length}</div>
                    <div class="config-stat-label">Plugins</div>
                </div>
                <div class="config-stat">
                    <div class="config-stat-number">${config.consumers.length}</div>
                    <div class="config-stat-label">Consumers</div>
                </div>
            </div>

            <!-- Configuration Info -->
            <div class="config-section">
                <h3>📊 Configuration Overview</h3>
                <p><strong>Version:</strong> ${config.version}</p>
                <p><strong>Last Updated:</strong> ${new Date(config.timestamp).toLocaleString()}</p>
            </div>

            <!-- Services -->
            <div class="config-section">
                <h3>🚀 Services (${config.services.length})</h3>
                ${config.services.length > 0 ? renderConfigItems(config.services, 'service') : '<p>No services configured</p>'}
            </div>

            <!-- Routes -->
            <div class="config-section">
                <h3>🛣️ Routes (${config.routes.length})</h3>
                ${config.routes.length > 0 ? renderConfigItems(config.routes, 'route') : '<p>No routes configured</p>'}
            </div>

            <!-- Plugins -->
            <div class="config-section">
                <h3>🔌 Plugins (${config.plugins.length})</h3>
                ${config.plugins.length > 0 ? renderConfigItems(config.plugins, 'plugin') : '<p>No plugins configured</p>'}
            </div>

            <!-- Consumers -->
            <div class="config-section">
                <h3>👥 Consumers (${config.consumers.length})</h3>
                ${config.consumers.length > 0 ? renderConfigItems(config.consumers, 'consumer') : '<p>No consumers configured</p>'}
            </div>
        </div>
    `;
    
    content.innerHTML = html;
}

function downloadConfiguration() {
    fetch(`${API_BASE_URL}/api/v1/config/sync`)
        .then(response => response.json())
        .then(data => {
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `pygateway-config-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        })
        .catch(error => {
            alert('Failed to download configuration');
        });
}

// Edit functionality
let currentEditItem = null;

function editConfigItem(type, id, name) {
                <div class="config-stat">
                    <div class="config-stat-number">${config.services.length}</div>
    // Fetch current item data
    let endpoint = '';
    switch(type) {
        case 'service':
            endpoint = `services/${id}`;
            break;
        case 'route':
            endpoint = `routes/${id}`;
            break;
        case 'plugin':
            endpoint = `plugins/${id}`;
            break;
        case 'consumer':
            endpoint = `consumers/${id}`;
            break;
    }
    
    fetch(`${API_BASE_URL}/api/v1/${endpoint}`)
        .then(response => response.json())
        .then(data => {
            document.getElementById('editModalTitle').textContent = `Edit ${type}: ${name}`;
            document.getElementById('editConfigTextarea').value = JSON.stringify(data, null, 2);
            document.getElementById('editConfigModal').style.display = 'block';
        })
        .catch(error => {
            alert(`Failed to load ${type} configuration`);
        });
}

function closeEditModal() {
    document.getElementById('editConfigModal').style.display = 'none';
    currentEditItem = null;
}

function saveConfiguration() {
    if (!currentEditItem) return;
    
    const textarea = document.getElementById('editConfigTextarea');
    let config;
    
    try {
        config = JSON.parse(textarea.value);
    } catch (error) {
        alert('Invalid JSON format. Please check your configuration.');
        return;
    }
    
    // Determine API endpoint and method
    let endpoint = '';
    switch(currentEditItem.type) {
        case 'service':
            endpoint = `services/${currentEditItem.id}`;
            break;
        case 'route':
            endpoint = `routes/${currentEditItem.id}`;
            break;
        case 'plugin':
            endpoint = `plugins/${currentEditItem.id}`;
            break;
        case 'consumer':
            endpoint = `consumers/${currentEditItem.id}`;
            break;
    }
    
    fetch(`${API_BASE_URL}/api/v1/${endpoint}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
    })
    .then(response => {
        if (response.ok) {
            alert(`${currentEditItem.type} updated successfully!`);
            closeEditModal();
            loadConfiguration(); // Refresh the configuration view
        } else {
            throw new Error(`Failed to update ${currentEditItem.type}`);
        }
    })
    .catch(error => {
        alert(`Error updating ${currentEditItem.type}: ${error.message}`);
    });
}

function loadAvailablePlugins() {
    fetch(`${API_BASE_URL}/api/v1/plugins/available`)
        .then(response => response.json())
        .then(data => {
            availablePlugins = data;
        })
        .catch(error => {
            console.error('Failed to load available plugins:', error);
        });
}

function showCreatePluginModal() {
    // Populate plugin options
    const pluginSelect = document.getElementById('pluginName');
    pluginSelect.innerHTML = '<option value="">Select a plugin</option>';
    availablePlugins.forEach(plugin => {
        pluginSelect.innerHTML += `<option value="${plugin.name}">${plugin.name}</option>`;
    });
    
    // Populate service options
    const serviceSelect = document.getElementById('pluginService');
    serviceSelect.innerHTML = '<option value="">Global plugin</option>';
    services.forEach(service => {
        serviceSelect.innerHTML += `<option value="${service.id}">${service.name}</option>`;
    });
    
    // Populate route options
    const routeSelect = document.getElementById('pluginRoute');
    routeSelect.innerHTML = '<option value="">Any route</option>';
    routes.forEach(route => {
        routeSelect.innerHTML += `<option value="${route.id}">${route.name}</option>`;
    });
    
    document.getElementById('createPluginModal').style.display = 'block';
}

// Plugin Schema Functions
function loadPluginSchema() {
    const pluginName = document.getElementById('pluginName').value;
    const configSection = document.getElementById('pluginConfigSection');
    const configFields = document.getElementById('pluginConfigFields');
    
    if (!pluginName) {
        configSection.style.display = 'none';
        return;
    }
    
    // Show loading state
    configFields.innerHTML = '<div class="loading">Loading plugin configuration...</div>';
    configSection.style.display = 'block';
    
    // Fetch plugin schema
    fetch(`${API_BASE_URL}/api/v1/plugins/schema/${pluginName}`)
        .then(response => response.json())
        .then(schema => {
            generatePluginForm(schema);
        })
        .catch(error => {
            console.error('Failed to load plugin schema:', error);
            configFields.innerHTML = '<div class="error">Failed to load plugin configuration</div>';
        });
}

function generatePluginForm(pluginSchema) {
    const configFields = document.getElementById('pluginConfigFields');
    const fieldCounter = document.getElementById('fieldCounter');
    const schema = pluginSchema.schema;
    
    if (!schema.properties) {
        configFields.innerHTML = '<p>No configuration options available for this plugin.</p>';
        fieldCounter.textContent = '';
        return;
    }
    
    const propertyCount = Object.keys(schema.properties).length;
    fieldCounter.textContent = `(${propertyCount} field${propertyCount !== 1 ? 's' : ''})`;
    
    let formHTML = '';
    
    // Add plugin description
    if (pluginSchema.description) {
        formHTML += `<div class="config-field-group" style="background-color: #e7f3ff; border-color: #b3d7ff;"><p style="color: #0056b3; margin: 0; font-style: italic;"><strong>📋 Description:</strong> ${pluginSchema.description}</p></div>`;
    }
    
    // Generate fields for each property
    Object.entries(schema.properties).forEach(([key, prop]) => {
        formHTML += generateField(key, prop);
    });
    
    configFields.innerHTML = formHTML;
}

function generateField(key, property) {
    const fieldId = `plugin_${key}`;
    const defaultValue = property.default || '';
    const description = property.description || '';
    const isRequired = property.required || false;
    
    let fieldHTML = `<div class="config-field-group">`;
    fieldHTML += `<label for="${fieldId}">
        ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
        ${isRequired ? '<span style="color: #dc3545;">*</span>' : ''}
        ${property.type ? `<span style="font-size: 0.8em; color: #6c757d; font-weight: normal;">(${property.type})</span>` : ''}
    </label>`;
    
    if (property.type === 'boolean') {
        fieldHTML += `<select id="${fieldId}" name="${key}" class="plugin-config-field" ${isRequired ? 'required' : ''}>`;
        fieldHTML += `<option value="true" ${defaultValue === true ? 'selected' : ''}>Yes</option>`;
        fieldHTML += `<option value="false" ${defaultValue === false ? 'selected' : ''}>No</option>`;
        fieldHTML += `</select>`;
    } else if (property.enum) {
        fieldHTML += `<select id="${fieldId}" name="${key}" class="plugin-config-field" ${isRequired ? 'required' : ''}>`;
        if (!isRequired) {
            fieldHTML += `<option value="">-- Select an option --</option>`;
        }
        property.enum.forEach(option => {
            fieldHTML += `<option value="${option}" ${defaultValue === option ? 'selected' : ''}>${option}</option>`;
        });
        fieldHTML += `</select>`;
    } else if (property.type === 'array') {
        // Handle arrays with a textarea for JSON input
        const arrayValue = Array.isArray(defaultValue) ? JSON.stringify(defaultValue) : '[]';
        fieldHTML += `<textarea id="${fieldId}" name="${key}" class="plugin-config-field" rows="3" placeholder="Enter JSON array, e.g., [&quot;item1&quot;, &quot;item2&quot;]" ${isRequired ? 'required' : ''}>${arrayValue}</textarea>`;
        fieldHTML += `<small style="color: #28a745; display: block; margin-top: 0.25rem;">💡 Tip: Use JSON format for arrays</small>`;
    } else if (property.type === 'integer' || property.type === 'number') {
        const minAttr = property.minimum !== undefined ? `min="${property.minimum}"` : '';
        const maxAttr = property.maximum !== undefined ? `max="${property.maximum}"` : '';
        fieldHTML += `<input type="number" id="${fieldId}" name="${key}" value="${defaultValue}" class="plugin-config-field" ${property.type === 'integer' ? 'step="1"' : ''} ${minAttr} ${maxAttr} ${isRequired ? 'required' : ''}/>`;
    } else {
        const placeholder = property.example ? `placeholder="${property.example}"` : '';
        fieldHTML += `<input type="text" id="${fieldId}" name="${key}" value="${defaultValue}" class="plugin-config-field" ${placeholder} ${isRequired ? 'required' : ''}/>`;
    }
    
    if (description) {
        fieldHTML += `<div class="config-field-description">📄 ${description}</div>`;
    }
    
    fieldHTML += `</div>`;
    return fieldHTML;
}

function toggleRawJsonMode() {
    const useRawJson = document.getElementById('useRawJson').checked;
    const rawJsonSection = document.getElementById('rawJsonSection');
    const dynamicFields = document.getElementById('pluginConfigFields');
    
    if (useRawJson) {
        rawJsonSection.style.display = 'block';
        dynamicFields.style.display = 'none';
        
        // Pre-populate JSON from form fields
        const config = collectPluginConfig();
        document.getElementById('pluginConfig').value = JSON.stringify(config, null, 2);
    } else {
        rawJsonSection.style.display = 'none';
        dynamicFields.style.display = 'block';
        
        // Try to populate form from JSON
        try {
            const config = JSON.parse(document.getElementById('pluginConfig').value);
            populatePluginForm(config);
        } catch (e) {
            // Ignore parse errors
        }
    }
}

function collectPluginConfig() {
    const config = {};
    const fields = document.querySelectorAll('.plugin-config-field');
    
    fields.forEach(field => {
        const key = field.name;
        let value = field.value;
        
        // Convert types based on field characteristics
        if (field.tagName.toLowerCase() === 'textarea') {
            // Handle arrays in textareas
            try {
                value = JSON.parse(value);
            } catch (e) {
                // If JSON parsing fails, treat as string
                console.warn(`Failed to parse JSON for field ${key}:`, e);
            }
        } else if (field.type === 'number') {
            value = field.step && field.step !== 'any' ? parseInt(value) : parseFloat(value);
        } else if (value === 'true') {
            value = true;
        } else if (value === 'false') {
            value = false;
        }
        
        if (value !== '' && value !== null) {
            config[key] = value;
        }
    });
    
    return config;
}

function populatePluginForm(config) {
    Object.entries(config).forEach(([key, value]) => {
        const field = document.querySelector(`[name="${key}"]`);
        if (field) {
            field.value = value;
        }
    });
}

function deletePlugin(pluginId) {
    if (confirm('Are you sure you want to delete this plugin?')) {
        fetch(`${API_BASE_URL}/api/v1/plugins/${pluginId}`, {
            method: 'DELETE'
        })
        .then(response => response.json())
        .then(data => {
            loadPlugins();
            loadDashboard();
        })
        .catch(error => {
            alert('Failed to delete plugin: ' + error.message);
        });
    }
}

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Form submissions
document.getElementById('createWorkspaceForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        enabled: formData.get('enabled') === 'on'
    };
    
    fetch(`${API_BASE_URL}/api/v1/workspaces`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        loadWorkspaces();
        closeModal('createWorkspaceModal');
        this.reset();
    })
    .catch(error => {
        alert(`Failed to create workspace: ${error.detail || error.message}`);
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
    
    // Handle boolean checkboxes
    data.strip_path = this.querySelector('#routeStripPath').checked;
    data.preserve_host = this.querySelector('#routePreserveHost').checked;
    data.enabled = this.querySelector('#routeEnabled').checked;
    
    // Handle numeric fields
    data.regex_priority = parseInt(data.regex_priority) || 0;
    
    // Parse comma-separated values for paths and hosts
    if (data.paths) {
        data.paths = data.paths.split(',').map(p => p.trim()).filter(p => p);
    } else {
        data.paths = [];
    }
    if (data.hosts) {
        data.hosts = data.hosts.split(',').map(h => h.trim()).filter(h => h);
    } else {
        data.hosts = [];
    }
    
    // Ensure required arrays have defaults
    if (data.protocols.length === 0) {
        data.protocols = ['http', 'https'];
    }
    if (data.methods.length === 0) {
        data.methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
    }
    
    console.log('Creating route with data:', data);
    
    fetch(`${API_BASE_URL}/api/v1/routes`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(`HTTP ${response.status}: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        loadRoutes();
        loadDashboard();
        closeModal('createRouteModal');
        this.reset();
        // Reset checkboxes to default state
        this.querySelectorAll('input[name="protocols"]').forEach(cb => {
            cb.checked = (cb.value === 'http' || cb.value === 'https');
        });
        this.querySelectorAll('input[name="methods"]').forEach(cb => cb.checked = true);
        this.querySelector('#routeStripPath').checked = true;
        this.querySelector('#routePreserveHost').checked = false;
        this.querySelector('#routeEnabled').checked = true;
    })
    .catch(error => {
        alert('Failed to create route: ' + error.message);
        console.error('Route creation error:', error);
    });
});

document.getElementById('createPluginForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const data = Object.fromEntries(formData);
    
    // Get plugin configuration
    const useRawJson = document.getElementById('useRawJson').checked;
    
    if (useRawJson) {
        // Parse JSON configuration from textarea
        if (data.config) {
            try {
                data.config = JSON.parse(data.config);
            } catch (e) {
                alert('Invalid JSON configuration');
                return;
            }
        } else {
            data.config = {};
        }
    } else {
        // Collect configuration from dynamic form fields
        data.config = collectPluginConfig();
    }
    
    // Remove empty values
    if (!data.service_id) delete data.service_id;
    if (!data.route_id) delete data.route_id;
    
    fetch(`${API_BASE_URL}/api/v1/plugins`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        loadPlugins();
        loadDashboard();
        closeModal('createPluginModal');
        this.reset();
    })
    .catch(error => {
        alert('Failed to create plugin: ' + error.message);
    });
});

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });
}

// Analytics function
function loadAnalytics() {
    fetch(`${API_BASE_URL}/api/v1/usage/report`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Analytics API error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Analytics data:', data);
            
            const totalRequests = data.counters.total_requests;
            const recentRequests = data.counters.buckets[data.counters.buckets.length - 1];
            
            document.getElementById('analytics-content').innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                    <div class="card">
                        <h3>Total Requests</h3>
                        <p style="font-size: 2rem; font-weight: bold; color: #3498db;">${totalRequests.toLocaleString()}</p>
                    </div>
                    <div class="card">
                        <h3>Services</h3>
                        <p style="font-size: 2rem; font-weight: bold; color: #27ae60;">${data.services_count}</p>
                    </div>
                    <div class="card">
                        <h3>Routes</h3>
                        <p style="font-size: 2rem; font-weight: bold; color: #e74c3c;">${data.routes_count}</p>
                    </div>
                    <div class="card">
                        <h3>Connected Dataplanes</h3>
                        <p style="font-size: 2rem; font-weight: bold; color: #f39c12;">${data.deployment_info.connected_dp_count}</p>
                    </div>
                </div>
                
                <div class="card">
                    <h3>Request Trends</h3>
                    <div style="height: 400px; margin: 1rem 0;">
                        <canvas id="requestTrendsChart"></canvas>
                    </div>
                    <div style="margin-top: 1rem;">
                        ${data.counters.buckets.map(bucket => `
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #eee;">
                                <span>${bucket.bucket}</span>
                                <span style="font-weight: bold;">${bucket.request_count.toLocaleString()}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                <div class="card" style="margin-top: 1rem;">
                    <h3>System Information</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                        <div>
                            <h4>Deployment</h4>
                            <p><strong>Type:</strong> ${data.deployment_info.type}</p>
                            <p><strong>Version:</strong> ${data.version}</p>
                            <p><strong>Database:</strong> ${data.db_version}</p>
                        </div>
                        <div>
                            <h4>System</h4>
                            <p><strong>Hostname:</strong> ${data.system_info.hostname}</p>
                            <p><strong>OS:</strong> ${data.system_info.uname}</p>
                            <p><strong>CPU Cores:</strong> ${data.system_info.cores}</p>
                        </div>
                    </div>
                </div>
            `;
            
            // Create the chart after the HTML is rendered
            setTimeout(() => {
                // Destroy existing chart if it exists
                if (requestTrendsChart) {
                    requestTrendsChart.destroy();
                }
                
                const ctx = document.getElementById('requestTrendsChart');
                if (ctx) {
                    requestTrendsChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: data.counters.buckets.map(bucket => bucket.bucket),
                            datasets: [{
                                label: 'Requests',
                                data: data.counters.buckets.map(bucket => bucket.request_count),
                                borderColor: '#3498db',
                                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                                borderWidth: 3,
                                fill: true,
                                tension: 0.4
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: {
                                    display: false
                                }
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        callback: function(value) {
                                            return value.toLocaleString();
                                        }
                                    }
                                }
                            },
                            elements: {
                                point: {
                                    radius: 6,
                                    hoverRadius: 8
                                }
                            }
                        }
                    });
                }
            }, 100);
        })
        .catch(error => {
            console.error('Error loading analytics:', error);
            document.getElementById('analytics-content').innerHTML = `
                <div class="error">Failed to load analytics: ${error.message}</div>
            `;
        });
}
