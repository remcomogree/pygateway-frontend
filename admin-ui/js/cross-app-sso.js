/**
 * Cross-App SSO Token Sharing Manager
 * Handles secure token sharing across multiple applications and domains
 */

class CrossAppSSOManager {
    constructor() {
        this.config = null;
        this.listeners = [];
        this.initPromise = this.initialize();
    }

    async initialize() {
        try {
            const response = await fetch('/api/sso-config');
            if (response.ok) {
                this.config = await response.json();
                console.log('Cross-app SSO initialized:', this.config.crossAppSharing);
                
                // Set up cross-origin messaging listener
                if (this.config.crossAppSharing?.postMessageSharing) {
                    this.setupPostMessageListener();
                }
                
                return true;
            }
        } catch (error) {
            console.error('Failed to initialize cross-app SSO:', error);
        }
        return false;
    }

    /**
     * Get token from multiple sources with priority:
     * 1. URL parameters (for SSO redirects)
     * 2. Cookies (for same-domain sharing)
     * 3. localStorage (fallback)
     * 4. Cross-origin messaging (for different domains)
     */
    async getToken() {
        await this.initPromise;

        // 1. Check URL parameters first (SSO redirects)
        const urlToken = this.getTokenFromURL();
        if (urlToken) {
            console.log('Token found in URL parameters');
            this.storeToken(urlToken);
            // Clean URL
            this.clearTokenFromURL();
            return urlToken;
        }

        // 2. Check cookies (cross-subdomain sharing)
        const cookieToken = this.getTokenFromCookie();
        if (cookieToken && this.validateToken(cookieToken)) {
            console.log('Token found in cookie');
            this.storeToken(cookieToken);
            return cookieToken;
        }

        // 3. Check localStorage (same-origin)
        const localToken = localStorage.getItem('jwt_token');
        if (localToken && this.validateToken(localToken)) {
            console.log('Token found in localStorage');
            return localToken;
        }

        // 4. Try cross-origin messaging (different domains)
        if (this.config?.crossAppSharing?.postMessageSharing) {
            const crossOriginToken = await this.requestTokenFromTrustedOrigins();
            if (crossOriginToken) {
                console.log('Token found via cross-origin messaging');
                this.storeToken(crossOriginToken);
                return crossOriginToken;
            }
        }

        return null;
    }

    /**
     * Store token in multiple locations for cross-app sharing
     */
    storeToken(token) {
        if (!this.validateToken(token)) {
            console.warn('Attempting to store invalid token');
            return false;
        }

        // Always store in localStorage
        localStorage.setItem('jwt_token', token);

        // Store in domain storage if enabled
        if (this.config?.crossAppSharing?.domainStorage) {
            this.storeTokenInDomainStorage(token);
        }

        // Notify other windows/tabs
        this.broadcastTokenUpdate(token);

        return true;
    }

    /**
     * Clear token from all storage locations
     */
    clearToken() {
        localStorage.removeItem('jwt_token');
        
        // Clear from domain storage
        if (this.config?.crossAppSharing?.domainStorage) {
            this.clearTokenFromDomainStorage();
        }

        // Notify other windows/tabs
        this.broadcastTokenClear();

        // Clear cookie via API call (cookies are HTTP-only)
        this.clearTokenCookie();
    }

    /**
     * Validate JWT token structure and claims
     */
    validateToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return false;

            const payload = JSON.parse(atob(parts[1]));

            // Check expiration
            if (payload.exp && payload.exp < Date.now() / 1000) {
                console.log('Token expired');
                return false;
            }

            // Check required role if configured
            if (this.config?.requiredRole) {
                const roleClaimName = this.config.roleClaimName || 'roles';
                const roles = payload[roleClaimName] || payload.roles || payload.role || payload.groups || [];
                const userRoles = Array.isArray(roles) ? roles : [roles];
                
                if (!userRoles.some(role => role.toLowerCase() === this.config.requiredRole.toLowerCase())) {
                    console.log('User lacks required role');
                    return false;
                }
            }

            return true;
        } catch (error) {
            console.error('Token validation error:', error);
            return false;
        }
    }

    /**
     * Get token from URL parameters (for SSO redirects)
     */
    getTokenFromURL() {
        // Check URL fragment (for implicit flow)
        const fragment = window.location.hash.substring(1);
        if (fragment) {
            const params = new URLSearchParams(fragment);
            const idToken = params.get('id_token') || params.get('access_token');
            if (idToken) return idToken;
        }

        // Check query parameters
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('token') || urlParams.get('jwt_token');
    }

    /**
     * Clear token from URL
     */
    clearTokenFromURL() {
        // Clear fragment
        if (window.location.hash) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }

        // Clear query parameters
        const url = new URL(window.location);
        url.searchParams.delete('token');
        url.searchParams.delete('jwt_token');
        window.history.replaceState({}, document.title, url.pathname + url.search);
    }

    /**
     * Get token from cookie (via API since cookies may be HTTP-only)
     */
    getTokenFromCookie() {
        // Try to read cookie directly (if not HTTP-only)
        const cookieName = this.config?.crossAppSharing?.cookieName || 'pygateway_sso_token';
        const cookies = document.cookie.split(';');
        
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === cookieName) {
                return decodeURIComponent(value);
            }
        }

        return null;
    }

    /**
     * Store token in domain-level storage (for subdomain sharing)
     */
    storeTokenInDomainStorage(token) {
        try {
            // Use postMessage to communicate with iframe on parent domain
            if (this.config?.crossAppSharing?.sharedDomain) {
                // This would require an iframe on the parent domain
                // For now, we'll use a different approach
                this.broadcastToParentDomain(token);
            }
        } catch (error) {
            console.warn('Could not store token in domain storage:', error);
        }
    }

    /**
     * Clear token from domain storage
     */
    clearTokenFromDomainStorage() {
        try {
            if (this.config?.crossAppSharing?.sharedDomain) {
                this.broadcastClearToParentDomain();
            }
        } catch (error) {
            console.warn('Could not clear token from domain storage:', error);
        }
    }

    /**
     * Set up listener for cross-origin token sharing
     */
    setupPostMessageListener() {
        window.addEventListener('message', (event) => {
            // Verify origin is trusted
            if (!this.isTrustedOrigin(event.origin)) {
                return;
            }

            const data = event.data;
            if (data.type === 'SSO_TOKEN_REQUEST') {
                // Another app is requesting our token
                const token = localStorage.getItem('jwt_token');
                if (token && this.validateToken(token)) {
                    event.source.postMessage({
                        type: 'SSO_TOKEN_RESPONSE',
                        token: token,
                        origin: window.location.origin
                    }, event.origin);
                }
            } else if (data.type === 'SSO_TOKEN_RESPONSE') {
                // We received a token from another app
                if (data.token && this.validateToken(data.token)) {
                    this.storeToken(data.token);
                    this.notifyTokenReceived(data.token);
                }
            } else if (data.type === 'SSO_TOKEN_CLEAR') {
                // Another app cleared the token
                this.clearToken();
            }
        });
    }

    /**
     * Request token from trusted origins via postMessage
     */
    async requestTokenFromTrustedOrigins() {
        if (!this.config?.crossAppSharing?.trustedOrigins?.length) {
            return null;
        }

        return new Promise((resolve) => {
            let resolved = false;
            const timeout = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(null);
                }
            }, 2000); // 2 second timeout

            // Listen for responses
            const listener = (event) => {
                if (resolved) return;

                if (this.isTrustedOrigin(event.origin) && 
                    event.data.type === 'SSO_TOKEN_RESPONSE' && 
                    event.data.token) {
                    resolved = true;
                    clearTimeout(timeout);
                    window.removeEventListener('message', listener);
                    resolve(event.data.token);
                }
            };

            window.addEventListener('message', listener);

            // Request token from each trusted origin
            this.config.crossAppSharing.trustedOrigins.forEach(origin => {
                try {
                    // Try to send message to iframe or popup
                    const iframe = document.querySelector(`iframe[src*="${origin}"]`);
                    if (iframe && iframe.contentWindow) {
                        iframe.contentWindow.postMessage({
                            type: 'SSO_TOKEN_REQUEST',
                            origin: window.location.origin
                        }, origin);
                    }
                } catch (error) {
                    console.warn(`Could not request token from ${origin}:`, error);
                }
            });
        });
    }

    /**
     * Check if origin is trusted
     */
    isTrustedOrigin(origin) {
        if (!this.config?.crossAppSharing?.trustedOrigins?.length) {
            return true; // Allow all if none specified
        }
        return this.config.crossAppSharing.trustedOrigins.includes(origin);
    }

    /**
     * Broadcast token update to other windows/tabs
     */
    broadcastTokenUpdate(token) {
        // Use BroadcastChannel for same-origin communication
        try {
            const bc = new BroadcastChannel('sso_token_updates');
            bc.postMessage({ type: 'TOKEN_UPDATE', token: token });
            bc.close();
        } catch (error) {
            // Fallback to storage events
            localStorage.setItem('sso_token_update', Date.now().toString());
        }
    }

    /**
     * Broadcast token clear to other windows/tabs
     */
    broadcastTokenClear() {
        try {
            const bc = new BroadcastChannel('sso_token_updates');
            bc.postMessage({ type: 'TOKEN_CLEAR' });
            bc.close();
        } catch (error) {
            localStorage.setItem('sso_token_clear', Date.now().toString());
        }
    }

    /**
     * Clear token cookie via API
     */
    async clearTokenCookie() {
        try {
            await fetch('/api/sso-logout', { method: 'POST' });
        } catch (error) {
            console.warn('Could not clear SSO cookie:', error);
        }
    }

    /**
     * Notify listeners that token was received
     */
    notifyTokenReceived(token) {
        this.listeners.forEach(listener => {
            try {
                listener({ type: 'token_received', token: token });
            } catch (error) {
                console.error('Error in SSO listener:', error);
            }
        });
    }

    /**
     * Add event listener for SSO events
     */
    addEventListener(listener) {
        this.listeners.push(listener);
    }

    /**
     * Remove event listener
     */
    removeEventListener(listener) {
        const index = this.listeners.indexOf(listener);
        if (index > -1) {
            this.listeners.splice(index, 1);
        }
    }
}

// Global instance
window.crossAppSSO = new CrossAppSSOManager();

// Export for modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CrossAppSSOManager;
}
