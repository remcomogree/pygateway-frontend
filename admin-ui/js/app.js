// PyGateway Admin UI JavaScript - Core Module

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
        // Wait for all required modules to be registered
        console.log('Waiting for modules to register...');
        if (window.ModuleRegistry) {
            await Promise.all([
                window.ModuleRegistry.waitForModule('workspaces'),
                window.ModuleRegistry.waitForModule('services'),
                window.ModuleRegistry.waitForModule('routes')
            ]);
            console.log('All modules registered successfully');
        }
        
        // Now load initial data since all modules are available
        console.log('Loading initial data...');
        await Promise.all([
            window.loadWorkspaces(),
            window.loadCertificates(),
            window.loadProviders(),
            window.loadServices(), 
            window.loadRoutes(),
            loadPlugins(),
            loadDataplanes(),
            new Promise(resolve => loadAvailablePlugins(resolve))  // Ensure this completes
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
    if ([
        'dashboard', 'certificates','providers', 'workspaces', 'services', 'routes', 'plugins', 'dataplanes', 'analytics', 'config', 'api', 'consumers', 'monetization'
    ].includes(sectionName)) {
        window.AppState.currentWorkspace = null;
        window.AppState.currentService = null;
    }
    // Clear auto-refresh when switching sections
    if (typeof autoRefreshEnabled !== 'undefined' && autoRefreshEnabled && sectionName !== 'dataplanes') {
        if (typeof toggleAutoRefresh === 'function') toggleAutoRefresh();
    }
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    // Remove active class from all nav links
    document.querySelectorAll('.nav a').forEach(link => {
        link.classList.remove('active');
    });
    // Special handling for API section
    if (sectionName === 'api') {
        document.getElementById('api').style.display = 'block';
        showApiTab('workspaces');
        document.querySelectorAll('#api .tabs .tab-btn').forEach(btn => btn.classList.remove('active'));
        const wsTabBtn = Array.from(document.querySelectorAll('#api .tabs .tab-btn')).find(btn => btn.textContent.trim() === 'Workspaces');
        if (wsTabBtn) wsTabBtn.classList.add('active');
    } else {
        // Show target section
        const sectionEl = document.getElementById(sectionName);
        if (sectionEl) sectionEl.style.display = 'block';
    }
    // Load section data
    switch(sectionName) {
        case 'dashboard':
            if (window.loadDashboard) window.loadDashboard();
            break;
        case 'certificates':
            if (window.loadCertificates) window.loadCertificates();
            break;
        case 'providers':
            if (window.loadProviders) window.loadProviders();
            break;
        case 'workspaces':
            if (window.loadWorkspaces) window.loadWorkspaces();
            break;
        case 'services':
            if (window.loadServices) window.loadServices();
            break;
        case 'routes':
            if (window.loadRoutes) window.loadRoutes();
            break;
        case 'plugins':
            if (window.loadPlugins) window.loadPlugins();
            break;
        case 'dataplanes':
            if (window.loadDataplanes) window.loadDataplanes();
            break;
        case 'analytics':
            if (window.loadAnalytics) window.loadAnalytics();
            break;
        case 'config':
            if (window.loadConfiguration) window.loadConfiguration();
            break;
        case 'consumers':
            if (window.loadConsumers) window.loadConsumers();
            break;
        case 'monetization':
            if (window.loadMonetization) window.loadMonetization();
            break;
        case 'debug':
            // Show debug section and load debug entries
            const debugSection = document.getElementById('debug');
            if (debugSection) {
                debugSection.innerHTML = '';
                if (window.loadDebugEntries) {
                    window.loadDebugEntries();
                }
            }
            break;
    }
    // Add active class to corresponding nav link
    const navLinks = document.querySelectorAll('.nav a');
    navLinks.forEach(link => {
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
    
    // Give modules a moment to register their functions
    await new Promise(resolve => setTimeout(resolve, 100));
    
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
    
    // Convert numeric fields
    if (data.port) data.port = parseInt(data.port);
    if (data.connect_timeout) data.connect_timeout = parseInt(data.connect_timeout);
    if (data.max_request_size) data.max_request_size = parseInt(data.max_request_size);
    if (data.max_response_size) data.max_response_size = parseInt(data.max_response_size);
    
    // Convert boolean fields
    data.streaming = data.streaming === 'true';

    // Clean up empty/null fields so backend can apply defaults
    if (!data.provider_id || data.provider_id === '') {
        delete data.provider_id;
    }
    if (!data.host || data.host === '') {
        delete data.host;
    }
    if (!data.port) {
        delete data.port;
    }
    if (!data.connect_timeout) {
        delete data.connect_timeout;
    }
    if (!data.max_request_size) {
        delete data.max_request_size;
    }
    if (!data.max_response_size) {
        delete data.max_response_size;
    }
    
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
    .then(response => {
        if (!response.ok) {
            return response.json().then(errorData => {
                throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
            });
        }
        return response.json();
    })
    .then(data => {
        loadServices();
        closeModal('createServiceModal');
        this.reset();
        // Clear the service ID for future operations
        this.removeAttribute('data-service-id');
    })
    .catch(error => {
        console.error('Service operation error:', error);
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
    
    // Handle paths, hosts, and resources (convert comma-separated strings to arrays)
    data.paths = data.paths ? data.paths.split(',').map(p => p.trim()).filter(p => p) : [];
    data.hosts = data.hosts ? data.hosts.split(',').map(h => h.trim()).filter(h => h) : [];
    data.resources = data.resources ? data.resources.split(',').map(r => r.trim()).filter(r => r) : [];
    
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

// Plugin creation form submission handler
document.getElementById('createPluginForm')?.addEventListener('submit', function(e) {
    e.preventDefault();
    const formData = new FormData(this);
    const data = {};
    // Use correct field names for backend schema
    data.name = formData.get('name'); // pluginName select uses name="name"
    data.service_id = formData.get('service_id') || undefined;
    data.route_id = formData.get('route_id') || undefined;
    data.enabled = formData.get('enabled') === 'on'; // Properly handle checkbox - unchecked = false
    
    // Handle configuration properly
    const rawJsonCheckbox = document.getElementById('useRawJson');
    const rawJsonTextarea = document.getElementById('pluginConfig');
    
    if (rawJsonCheckbox && rawJsonCheckbox.checked && rawJsonTextarea && rawJsonTextarea.value.trim()) {
        // Use raw JSON configuration
        try {
            data.config = JSON.parse(rawJsonTextarea.value);
        } catch (e) {
            alert('Invalid JSON in configuration. Please check your syntax.');
            return;
        }
    } else {
        // Collect config from form fields
        data.config = {};
        this.querySelectorAll('[name]').forEach(input => {
            const key = input.name;
            if (["name", "service_id", "route_id", "enabled", "config"].includes(key)) return;
            if (input.type === 'checkbox') {
                data.config[key] = input.checked;
            } else if (input.type === 'textarea' && input.value) {
                // For arrays, split by comma and trim
                data.config[key] = input.value.split(',').map(v => v.trim()).filter(v => v);
            } else if (input.type === 'number') {
                data.config[key] = Number(input.value);
            } else if (input.value) {
                data.config[key] = input.value;
            }
        });
    }
    
    // Remove empty service_id/route_id for global plugins
    if (!data.service_id) delete data.service_id;
    if (!data.route_id) delete data.route_id;
    // Check if this is an edit operation
    const pluginId = this.getAttribute('data-plugin-id');
    const isEdit = pluginId !== null;
    const url = isEdit ? `${API_BASE_URL}/api/v1/plugins/${pluginId}` : `${API_BASE_URL}/api/v1/plugins`;
    const method = isEdit ? 'PUT' : 'POST';
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) throw new Error('Failed to save plugin');
        return response.json();
    })
    .then(data => {
        loadPlugins();
        closeModal('createPluginModal');
        this.reset();
        this.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
        this.removeAttribute('data-plugin-id');
    })
    .catch(error => {
        alert(`Failed to ${isEdit ? 'update' : 'create'} plugin: ` + error.message);
    });
});

// Functions for other sections
function loadPlugins() {
    console.log('Loading plugins...');
    const content = document.getElementById('plugins-content');
    content.innerHTML = '<div class="loading">Loading plugins...</div>';
    
    fetch(`${API_BASE_URL}/api/v1/plugins`)
        .then(response => response.json())
        .then(data => {
            // Ensure plugins is always an array
            if (Array.isArray(data)) {
                plugins = data;
                window.AppState.plugins = data;
            } else if (data && Array.isArray(data.items)) {
                plugins = data.items;
                window.AppState.plugins = data.items;
            } else {
                plugins = [];
                window.AppState.plugins = [];
            }
            displayPlugins();
        })
        .catch(error => {
            console.error('Error loading plugins:', error);
            plugins = []; // Initialize as empty array on error
            window.AppState.plugins = [];
            content.innerHTML = `
                <div class="error">Failed to load plugins: ${error.message}</div>
            `;
        });
}

function displayPlugins() {
    const content = document.getElementById('plugins-content');
    try {
        // Ensure plugins is always an array
        if (!Array.isArray(plugins)) {
            plugins = [];
        }
        
        if (plugins.length === 0) {
            content.innerHTML = '<p>No plugins configured.</p>';
            return;
        }
        // Get services and routes from shared state for lookups
        const currentServices = Array.isArray(window.AppState.services) ? window.AppState.services : [];
        const currentRoutes = Array.isArray(window.AppState.routes) ? window.AppState.routes : [];
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
                        const service = currentServices.find(s => s.id === plugin.service_id);
                        const route = currentRoutes.find(r => r.id === plugin.route_id);
                        return `
                            <tr>
                                <td>${plugin.name}</td>
                                <td>${plugin.type || ''}</td>
                                <td>${service ? service.name : 'Global'}</td>
                                <td>${route ? route.name : ''}</td>
                                <td>
                                    <span class="status-badge ${plugin.enabled ? 'status-enabled' : 'status-disabled'}">
                                        ${plugin.enabled ? 'Enabled' : 'Disabled'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-primary" onclick="editPlugin('${plugin.id}')">Edit</button>
                                    <button class="btn btn-danger" onclick="deletePlugin('${plugin.id}')">Delete</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
        content.innerHTML = table;
    } catch (e) {
        console.error('Failed to load plugins:', e);
        content.innerHTML = `<div class="error">Failed to load plugins: ${e.message}</div>`;
    }
}

function loadDataplanes() {
    console.log('Loading dataplanes...');
    const content = document.getElementById('dataplanes-content');
    content.innerHTML = '<div class="loading">Loading dataplanes...</div>';
    
    fetch(`${API_BASE_URL}/api/v1/dataplanes/`)
        .then(response => response.json())
        .then(data => {
            dataplanes = data;
            displayDataplanes();
        })
        .catch(error => {
            console.error('Error loading dataplanes:', error);
            content.innerHTML = `
                <div class="error">Failed to load dataplanes: ${error.message}</div>
            `;
        });
}

function displayDataplanes() {
    const content = document.getElementById('dataplanes-content');
    
    if (dataplanes.length === 0) {
        content.innerHTML = '<p>No dataplanes registered.</p>';
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
                            <button class="btn btn-success" onclick="viewDataplaneDetails('${dataplane.id}')" style="background: #3498db; background: -moz-linear-gradient(top,  #3498db 0%, #2980b9 100%); background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#3498db), color-stop(100%,#2980b9)); background: -webkit-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: -o-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: -ms-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: linear-gradient(top,  #3498db 0%,#2980b9 100%); border: 1px solid #2980b9; color: white;">Details</button>
                            ${dataplane.status === 'offline' ? 
                                `<button class="btn btn-success" onclick="removeDataplane('${dataplane.id}')" style="background: #e74c3c; background: -moz-linear-gradient(top,  #e74c3c 0%, #c0392b 100%); background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#e74c3c), color-stop(100%,#c0392b)); background: -webkit-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: -o-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: -ms-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: linear-gradient(top,  #e74c3c 0%,#c0392b 100%); border: 1px solid #c0392b; color: white;">Remove</button>` : 
                                ''
                            }
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = table;
}

// Fetch system info for analytics and dashboard
async function fetchSystemInfo() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/v1/config/system`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e) {
        console.error('Failed to fetch system info:', e);
        return null;
    }
}

// --- Configuration ---
function loadConfiguration() {
    console.log('Loading configuration...');
    const content = document.getElementById('config-content');
    content.innerHTML = '<div class="loading">Loading configuration...</div>';
    
    fetch(`${API_BASE_URL}/api/v1/config/sync`)
        .then(response => response.json())
        .then(data => {
            renderConfiguration(data);
        })
        .catch(error => {
            console.error('Error loading configuration:', error);
            content.innerHTML = `
                <div class="error">Failed to load configuration: ${error.message}</div>
            `;
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
                case 'provider':
                    displayText = item.name;
                    details = `${item.protocol}://${item.host}:${item.port}${item.path || ''}`;
                    break;
                case 'certificate':
                    displayText = item.name;
                    details = `Date: ${item.date ? new Date(item.date).toLocaleDateString() : ''} | Enabled: ${item.enabled}`;
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
                    <div class="config-stat-number">${config.certificates ? config.certificates.length : 0}</div>
                    <div class="config-stat-label">Certificates</div>
                </div>
                <div class="config-stat">
                    <div class="config-stat-number">${config.providers ? config.providers.length : 0}</div>
                    <div class="config-stat-label">Providers</div>
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
            <!-- Certificates -->
            <div class="config-section">
                <h3>📜 Certificates (${config.certificates ? config.certificates.length : 0})</h3>
                ${config.certificates && config.certificates.length > 0 ? renderConfigItems(config.certificates, 'certificate') : '<p>No certificates configured</p>'}
            </div>
            <!-- Providers -->
            <div class="config-section">
                <h3>🏢 Providers (${config.providers ? config.providers.length : 0})</h3>
                ${config.providers && config.providers.length > 0 ? renderConfigItems(config.providers, 'provider') : '<p>No providers configured</p>'}
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
    // Store current edit item
    currentEditItem = { type, id, name };
    
    // Fetch current item data
    let endpoint = '';
    switch(type) {
        case 'service':
            endpoint = `services/${id}`;
            break;
        case 'certificate':
            endpoint = `certificates/${id}`;
            break;
        case 'provider':
            endpoint = `providers/${id}`;
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
            // Check if modal exists, if not create it
            let modal = document.getElementById('editConfigModal');
            if (!modal) {
                createEditConfigModal();
                modal = document.getElementById('editConfigModal');
            }
            
            document.getElementById('editModalTitle').textContent = `Edit ${type}: ${name}`;
            document.getElementById('editConfigTextarea').value = JSON.stringify(data, null, 2);
            modal.style.display = 'block';
        })
        .catch(error => {
            alert(`Failed to load ${type} configuration: ${error.message}`);
        });
}

function createEditConfigModal() {
    const modalHTML = `
        <div id="editConfigModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="editModalTitle">Edit Configuration</h2>
                    <span class="close" onclick="closeEditModal()">&times;</span>
                </div>
                <div class="modal-body">
                    <textarea id="editConfigTextarea" rows="20" style="width: 100%; font-family: monospace; font-size: 12px; border: 1px solid #ddd; padding: 10px;"></textarea>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-success" onclick="saveConfiguration()">Save Changes</button>
                    <button class="btn" onclick="closeEditModal()">Cancel</button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

function closeEditModal() {
    const modal = document.getElementById('editConfigModal');
    if (modal) {
        modal.style.display = 'none';
    }
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
        case 'certificate':
            endpoint = `certificates/${currentEditItem.id}`;
            break;
        case 'provider':
            endpoint = `providers/${currentEditItem.id}`;
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
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(config)
    })
    .then(response => {
        if (response.ok) {
            alert(`${currentEditItem.type} configuration updated successfully`);
            closeEditModal();
        } else {
            alert('Failed to update configuration');
        }
    })
    .catch(error => {
        alert('Failed to update configuration: ' + error.message);
    });
}

// Dataplane helper functions
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

    // Show details in a modal or dedicated section - for now just alert
    alert(`Dataplane Details:\n\nName: ${dataplane.name}\nID: ${dataplane.id}\nStatus: ${dataplane.status}\nLast Seen: ${formatLastSeen(dataplane.last_seen)}`);
}

function removeDataplane(dataplaneId) {
    if (!confirm('Are you sure you want to remove this offline dataplane?')) {
        return;
    }
    
    fetch(`${API_BASE_URL}/api/v1/dataplanes/${dataplaneId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            loadDataplanes();
            loadDashboard();
        } else {
            alert('Failed to remove dataplane');
        }
    })
    .catch(error => {
        alert('Failed to remove dataplane: ' + error.message);
    });
}

function deletePlugin(pluginId) {
    if (!confirm('Are you sure you want to delete this plugin? This action cannot be undone.')) {
        return;
    }

    fetch(`${API_BASE_URL}/api/v1/plugins/${pluginId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            loadPlugins();
            loadDashboard();
        } else {
            alert('Failed to delete plugin');
        }
    })
    .catch(error => {
        alert('Failed to delete plugin: ' + error.message);
    });
}

function showCreatePluginModal() {
    // Load available plugins first
    loadAvailablePlugins(() => {
        // Ensure services and routes are loaded first
        Promise.all([
            fetch(`${API_BASE_URL}/api/v1/services`).then(r => r.json()).catch(() => []),
            fetch(`${API_BASE_URL}/api/v1/routes`).then(r => r.json()).catch(() => [])
        ]).then(([servicesData, routesData]) => {
            // Store in global state
            window.AppState.services = Array.isArray(servicesData) ? servicesData : servicesData.items || [];
            window.AppState.routes = Array.isArray(routesData) ? routesData : routesData.items || [];
            
            // Populate plugin options from available plugins
            const pluginSelect = document.getElementById('pluginName');
            if (pluginSelect) {
                pluginSelect.innerHTML = '<option value="">Select a plugin</option>';
                if (Array.isArray(window.AppState.availablePlugins)) {
                    window.AppState.availablePlugins.forEach(plugin => {
                        pluginSelect.innerHTML += `<option value="${plugin.name}">${plugin.name}</option>`;
                    });
                }
            }
            
            // Populate service options
            const serviceSelect = document.getElementById('pluginService');
            if (serviceSelect) {
                serviceSelect.innerHTML = '<option value="">Global plugin</option>';
                window.AppState.services.forEach(service => {
                    serviceSelect.innerHTML += `<option value="${service.id}">${service.name}</option>`;
                });
                
                // Add change handler to filter routes by service
                serviceSelect.addEventListener('change', function() {
                    filterRoutesByService(this.value);
                });
            }
            
            // Populate route options (initially all routes)
            const routeSelect = document.getElementById('pluginRoute');
            if (routeSelect) {
                populateRouteOptions();
            }
            
            // Reset form for new plugin creation
            const form = document.getElementById('createPluginForm');
            if (form) {
                form.removeAttribute('data-plugin-id');
                form.reset();
            }
            
            // Set modal title and button for create
            const modalTitle = document.querySelector('#createPluginModal h2');
            if (modalTitle) modalTitle.textContent = 'Create Plugin';
            
            const submitButton = document.querySelector('#createPluginForm button[type="submit"]');
            if (submitButton) submitButton.textContent = 'Create Plugin';
            
            const modal = document.getElementById('createPluginModal');
            if (modal) {
                modal.style.display = 'block';
            } else {
                // If modal doesn't exist, show a simple alert for now
                alert('Plugin creation modal not implemented yet. This feature requires a modal form in the HTML.');
            }
        }).catch(error => {
            console.error('Failed to load services/routes:', error);
            alert('Failed to load required data. Please try again.');
        });
    });
}

// Plugin-related functions

function loadAvailablePlugins(callback) {
    fetch(`${API_BASE_URL}/api/v1/plugins/available`)
        .then(response => response.json())
        .then(data => {
            window.AppState.availablePlugins = Array.isArray(data) ? data : [];
            availablePlugins = window.AppState.availablePlugins;
            if (typeof callback === 'function') callback();
        })
        .catch(error => {
            console.error('Failed to load available plugins:', error);
            // Fallback to common plugins if API fails
            window.AppState.availablePlugins = [
                { name: 'rate-limiting', description: 'Rate limiting for APIs' },
                { name: 'key-auth', description: 'Authentication via API keys' },
                { name: 'cors', description: 'Cross-Origin Resource Sharing' },
                { name: 'request-transformer', description: 'Transform requests' },
                { name: 'response-transformer', description: 'Transform responses' }
            ];
            availablePlugins = window.AppState.availablePlugins;
            if (typeof callback === 'function') callback();
        });
}

function loadPluginSchema() {
    const pluginName = document.getElementById('pluginName').value;
    const configSection = document.getElementById('pluginConfigSection');
    const configFields = document.getElementById('pluginConfigFields');
    
    if (!pluginName) {
        if (configSection) configSection.style.display = 'none';
        return;
    }
    
    // Show loading state
    if (configFields) {
        configFields.innerHTML = '<div class="loading">Loading plugin configuration...</div>';
    }
    if (configSection) {
        configSection.style.display = 'block';
    }
    
    // Fetch plugin schema
    fetch(`${API_BASE_URL}/api/v1/plugins/schema/${pluginName}`)
        .then(response => response.json())
        .then(schema => {
            generatePluginForm(schema);
        })
        .catch(error => {
            console.error('Failed to load plugin schema:', error);
            if (configFields) {
                configFields.innerHTML = '<div class="error">Failed to load plugin configuration</div>';
            }
        });
}

function generatePluginForm(pluginSchema) {
    const configFields = document.getElementById('pluginConfigFields');
    const fieldCounter = document.getElementById('fieldCounter');
    
    if (!configFields) return;
    
    const schema = pluginSchema.schema;
    
    if (!schema.properties) {
        configFields.innerHTML = '<p>No configuration options available for this plugin.</p>';
        if (fieldCounter) fieldCounter.textContent = '';
        return;
    }
    
    const propertyCount = Object.keys(schema.properties).length;
    if (fieldCounter) {
        fieldCounter.textContent = `(${propertyCount} field${propertyCount !== 1 ? 's' : ''})`;
    }
    
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
    const type = property.type || 'string';
    
    let inputHTML = '';
    
    switch (type) {
         case 'boolean':
            inputHTML = `<input type="checkbox" id="${fieldId}" name="${key}" ${defaultValue ? 'checked' : ''}>`;
            break;
        case 'integer':       
        case 'number':

            inputHTML = `<input type="number" id="${fieldId}" name="${key}" value="${defaultValue}" ${isRequired ? 'required' : ''}>`;
            break;
        case 'array':
            inputHTML = `<textarea id="${fieldId}" name="${key}" placeholder="Enter items separated by commas" ${isRequired ? 'required' : ''}>${Array.isArray(defaultValue) ? defaultValue.join(', ') : defaultValue}</textarea>`;
            break;
        default:
            inputHTML = `<input type="text" id="${fieldId}" name="${key}" value="${defaultValue}" ${isRequired ? 'required' : ''}>`;
    }
    
    return `
        <div class="config-field-group">
            <label for="${fieldId}">${key}${isRequired ? ' *' : ''}</label>
            ${inputHTML}
            ${description ? `<small class="field-description">${description}</small>` : ''}
        </div>
    `;
}

// Make core functions globally accessible
window.showSection = showSection;
window.closeModal = closeModal;
window.logout = logout;
window.authenticatedFetch = authenticatedFetch;

// Helper functions to filter routes by service
function populateRouteOptions(serviceId = null) {
    const routeSelect = document.getElementById('pluginRoute');
    if (!routeSelect) return;
    
    routeSelect.innerHTML = '<option value="">Any route</option>';
    
    const routes = window.AppState.routes || [];
    const filteredRoutes = serviceId ? routes.filter(route => route.service_id === serviceId) : routes;
    
    filteredRoutes.forEach(route => {
        routeSelect.innerHTML += `<option value="${route.id}">${route.name || route.paths?.join(', ') || route.id}</option>`;
    });
}

function filterRoutesByService(serviceId) {
    populateRouteOptions(serviceId);
}

// Ensure all functions and blocks are properly closed at the end of the file
// Add missing closing braces or parentheses if needed
async function fetchAndDisplayLLMData() {
    try {
        // Fetch security data
        const securityResponse = await fetch('/api/llm/security');
        if (securityResponse.ok) {
            const securityData = await securityResponse.json();
            document.getElementById('securityData').innerText = JSON.stringify(securityData, null, 2);
        } else {
            console.error('Failed to fetch security data');
        }

        // Fetch cost data
        const costResponse = await fetch('/api/llm/cost');
        if (costResponse.ok) {
            const costData = await costResponse.json();
            document.getElementById('costData').innerText = JSON.stringify(costData, null, 2);
        } else {
            console.error('Failed to fetch cost data');
        }

        // Fetch billing data
        const billingResponse = await fetch('/api/llm/billing');
        if (billingResponse.ok) {
            const billingData = await billingResponse.json();
            document.getElementById('billingData').innerText = JSON.stringify(billingData, null, 2);
        } else {
            console.error('Failed to fetch billing data');
        }
    } catch (error) {
        console.error('Error fetching LLM data:', error);
    }
}

// Call the function on page load
document.addEventListener('DOMContentLoaded', fetchAndDisplayLLMData);
