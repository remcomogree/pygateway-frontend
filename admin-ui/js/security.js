// Security utilities for PyGateway Admin UI
class AdminUISecurity {
    constructor() {
        this.csrfToken = null;
        this.sessionId = null;
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return true;
        
        try {
            // Get initial CSRF token
            const response = await fetch('/api/csrf-token', {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.csrfToken = data.csrf_token;
                this.sessionId = data.session_id;
                this.initialized = true;
                console.log('Security context initialized');
                return true;
            } else {
                console.error('Failed to initialize security context:', response.status);
                return false;
            }
        } catch (error) {
            console.error('Error initializing security context:', error);
            return false;
        }
    }

    async refreshCSRFToken() {
        try {
            const response = await fetch('/api/csrf-token', {
                method: 'GET',
                credentials: 'same-origin'
            });
            
            if (response.ok) {
                const data = await response.json();
                this.csrfToken = data.csrf_token;
                return true;
            }
        } catch (error) {
            console.error('Error refreshing CSRF token:', error);
        }
        return false;
    }

    async secureRequest(url, options = {}) {
        // Ensure security context is initialized
        if (!this.initialized) {
            await this.initialize();
        }

        // Prepare secure request options
        const secureOptions = {
            ...options,
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        };

        // Add CSRF token for state-changing operations
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase())) {
            secureOptions.headers['X-CSRF-Token'] = this.csrfToken;
        }

        try {
            const response = await fetch(url, secureOptions);
            
            // Update CSRF token if provided in response
            const newCSRFToken = response.headers.get('X-CSRF-Token');
            if (newCSRFToken) {
                this.csrfToken = newCSRFToken;
            }

            // Handle 403 (CSRF failure) by refreshing token and retrying once
            if (response.status === 403 && !options._retried) {
                console.log('CSRF token expired, refreshing...');
                if (await this.refreshCSRFToken()) {
                    return this.secureRequest(url, { ...options, _retried: true });
                }
            }

            return response;
        } catch (error) {
            console.error('Secure request failed:', error);
            throw error;
        }
    }

    // Convenience methods for common operations
    async get(url, options = {}) {
        return this.secureRequest(url, { ...options, method: 'GET' });
    }

    async post(url, data, options = {}) {
        return this.secureRequest(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(url, data, options = {}) {
        return this.secureRequest(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(url, options = {}) {
        return this.secureRequest(url, { ...options, method: 'DELETE' });
    }

    // Handle logout - clear security context
    logout() {
        this.csrfToken = null;
        this.sessionId = null;
        this.initialized = false;
    }

    // Check if request failed due to security issues
    isSecurityError(response) {
        return response.status === 403 || response.status === 401;
    }

    // Handle security errors
    handleSecurityError(response) {
        if (response.status === 401) {
            console.log('Authentication required, redirecting to login');
            window.location.href = '/login.html';
        } else if (response.status === 403) {
            console.error('Access forbidden - possible CSRF or origin issue');
            // Could show user-friendly error message
        }
    }
}

// Global security instance
const adminSecurity = new AdminUISecurity();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminUISecurity;
}
