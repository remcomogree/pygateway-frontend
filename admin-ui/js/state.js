// Shared state for PyGateway Admin UI

// Configuration
const API_BASE_URL = 'http://localhost:8001';

// Module registration system
window.ModuleRegistry = {
    registered: {},
    register: function(moduleName, functions) {
        console.log(`Registering module: ${moduleName}`, Object.keys(functions));
        this.registered[moduleName] = functions;
        // Also add to window for backward compatibility
        Object.assign(window, functions);
    },
    isReady: function(moduleName) {
        return !!this.registered[moduleName];
    },
    waitForModule: function(moduleName) {
        return new Promise((resolve) => {
            if (this.isReady(moduleName)) {
                resolve(this.registered[moduleName]);
                return;
            }
            
            const checkInterval = setInterval(() => {
                if (this.isReady(moduleName)) {
                    clearInterval(checkInterval);
                    resolve(this.registered[moduleName]);
                }
            }, 10);
        });
    }
};

// Global state (shared across all modules)
window.AppState = {
    // Data
    certificates: [],
    workspaces: [],
    services: [],
    routes: [],
    providers: [],
    plugins: [],
    dataplanes: [],
    availablePlugins: [],
    
    // UI state
    currentWorkspace: null,
    currentService: null,
    requestTrendsChart: null,
    
    // Auth state (these are also in app.js, but duplicated here for safety)
    authToken: null,
    currentUser: null,
    ssoEnabled: false,
    
    // Auto-refresh state
    autoRefreshInterval: null,
    autoRefreshEnabled: false
};

// Helper function to access state
window.getState = () => window.AppState;
window.setState = (key, value) => { window.AppState[key] = value; };
