/**
 * PyGateway API Client
 * 
 * Professional-grade API client implementing the complete PyGateway API specification.
 * Built according to backend documentation with comprehensive error handling,
 * circuit breaker pattern, extensive logging for debugging, and schema validation.
 * 
 * SCHEMA VALIDATION:
 * This client includes automatic request/response validation using Zod schemas
 * based on the OpenAPI specification. This ensures data integrity and provides
 * better error messages for invalid data.
 * 
 * @author Senior Frontend Developer
 * @version 2.1.0
 */

import { SCHEMAS, validateData, safeValidateData } from './schemas.js';

// API Configuration
const API_CONFIG = {
  development: "", // Use empty since Vite proxy handles /api/v1
  production: "https://your-production-domain.com/api/v1",
  staging: "https://staging.your-domain.com/api/v1"
};

const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const CIRCUIT_BREAKER_THRESHOLD = 5;
const CIRCUIT_BREAKER_TIMEOUT = 45000; // 45 seconds

/**
 * Professional PyGateway API Client
 * Implements all endpoints according to backend documentation
 */
class PyGatewayAPI {
  constructor(options = {}) {
    // If rawApi is provided, use it instead of building our own client
    this.rawApi = options.rawApi || null;
    
    this.baseURL = options.baseURL || API_CONFIG[process.env.NODE_ENV || 'development'];
    this.timeout = options.timeout || DEFAULT_TIMEOUT;
    this.token = localStorage.getItem('auth_token');
    this.debug = options.debug || process.env.NODE_ENV === 'development';
    
    // Schema validation configuration
    this.validateSchemas = options.validateSchemas !== false; // Default: true
    this.strictValidation = options.strictValidation || false; // Default: false (warnings only)
    
    // Circuit breaker state (only used when not using rawApi)
    this.circuitBreaker = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: null,
      threshold: CIRCUIT_BREAKER_THRESHOLD,
      timeout: CIRCUIT_BREAKER_TIMEOUT
    };
    
    // Request deduplication cache - prevents duplicate simultaneous requests
    // Stores pending promises keyed by request string
    this.requestCache = new Map();
    this.responseCacheMap = new Map();
    this.cacheTimeout = 30000; // 30 seconds cache TTL
    
    // Request interceptors
    this.requestInterceptors = [];
    this.responseInterceptors = [];
    
    this.log('🚀 PyGateway API Client initialized', { 
      baseURL: this.baseURL,
      validation: this.validateSchemas,
      strict: this.strictValidation,
      usingRawApi: !!this.rawApi
    });
  }
  
  /**
   * Enhanced logging with categorization
   */
  log(message, data = null, level = 'info') {
    if (!this.debug) return;
    
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
      debug: '🔍'
    }[level] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] ${message}`, data || '');
  }
  
  /**
   * Set authentication token
   */
  setToken(token) {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
    this.log('🔑 Auth token updated', { hasToken: !!token });
  }
  
  /**
   * Circuit breaker implementation
   */
  isCircuitOpen() {
    if (!this.circuitBreaker.isOpen) return false;
    
    const timeSinceFailure = Date.now() - this.circuitBreaker.lastFailureTime;
    if (timeSinceFailure > this.circuitBreaker.timeout) {
      this.circuitBreaker.isOpen = false;
      this.circuitBreaker.failureCount = 0;
      this.log('🔄 Circuit breaker reset after timeout');
      return false;
    }
    
    return true;
  }
  
  recordFailure() {
    this.circuitBreaker.failureCount++;
    this.circuitBreaker.lastFailureTime = Date.now();
    
    if (this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
      this.circuitBreaker.isOpen = true;
      this.log('🚫 Circuit breaker opened', { 
        failureCount: this.circuitBreaker.failureCount,
        threshold: this.circuitBreaker.threshold 
      }, 'warning');
    }
  }
  
  recordSuccess() {
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.lastFailureTime = null;
  }

  /**
   * Validate request data against schema
   */
  validateRequest(schemaName, data, context = 'request') {
    if (!this.validateSchemas || !SCHEMAS[schemaName]) {
      return data;
    }

    try {
      const validatedData = validateData(SCHEMAS[schemaName], data, context);
      this.log(`✅ Request validation passed for ${schemaName}`, null, 'debug');
      return validatedData;
    } catch (error) {
      this.log(`❌ Request validation failed for ${schemaName}`, { error: error.message }, 'error');
      
      if (this.strictValidation) {
        throw new Error(`Request validation failed: ${error.message}`);
      } else {
        this.log(`⚠️ Proceeding with invalid data (strict validation disabled)`, null, 'warning');
        return data;
      }
    }
  }

  /**
   * Validate response data against schema
   */
  validateResponse(schemaName, data, context = 'response') {
    if (!this.validateSchemas || !SCHEMAS[schemaName]) {
      return data;
    }

    const result = safeValidateData(SCHEMAS[schemaName], data);
    
    if (result.success) {
      this.log(`✅ Response validation passed for ${schemaName}`, null, 'debug');
      return result.data;
    } else {
      this.log(`❌ Response validation failed for ${schemaName}`, { error: result.error }, 'error');
      
      if (this.strictValidation) {
        throw new Error(`Response validation failed: ${result.error}`);
      } else {
        this.log(`⚠️ Returning unvalidated response data (strict validation disabled)`, null, 'warning');
        return data;
      }
    }
  }

  /**
   * Validate query parameters against schema
   */
  validateQueryParams(schemaName, params) {
    if (!this.validateSchemas || !SCHEMAS[schemaName]) {
      return params;
    }

    try {
      const validatedParams = validateData(SCHEMAS[schemaName], params, 'query parameters');
      this.log(`✅ Query params validation passed for ${schemaName}`, null, 'debug');
      return validatedParams;
    } catch (error) {
      this.log(`❌ Query params validation failed for ${schemaName}`, { error: error.message }, 'error');
      
      if (this.strictValidation) {
        throw new Error(`Query parameters validation failed: ${error.message}`);
      } else {
        this.log(`⚠️ Proceeding with invalid query params (strict validation disabled)`, null, 'warning');
        return params;
      }
    }
  }
  
  /**
   * Core request method with comprehensive error handling
   */
  /**
   * Generate a cache key from endpoint and options
   */
  getCacheKey(endpoint, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    // Only cache GET requests
    if (method !== 'GET') return null;
    return `${method}:${endpoint}`;
  }

  /**
   * Get cached response if available and not expired
   */
  getCachedResponse(cacheKey) {
    if (!cacheKey) return null;
    
    const cached = this.responseCacheMap.get(cacheKey);
    if (!cached) return null;
    
    // Check if cache has expired
    if (Date.now() > cached.expiresAt) {
      this.responseCacheMap.delete(cacheKey);
      return null;
    }
    
    this.log(`📦 Cache HIT for: ${cacheKey}`);
    return cached.response;
  }

  /**
   * Set response in cache
   */
  setCachedResponse(cacheKey, response) {
    if (!cacheKey) return;
    
    this.responseCacheMap.set(cacheKey, {
      response,
      expiresAt: Date.now() + this.cacheTimeout,
      timestamp: Date.now()
    });
    
    this.log(`💾 Cached response for: ${cacheKey}`);
  }

  /**
   * Check if request is already pending, if so return the promise
   */
  getPendingRequest(cacheKey) {
    if (!cacheKey) return null;
    return this.requestCache.get(cacheKey);
  }

  /**
   * Set a pending request promise
   */
  setPendingRequest(cacheKey, promise) {
    if (!cacheKey) return;
    this.requestCache.set(cacheKey, promise);
    
    // Clean up from cache after promise resolves/rejects
    promise.finally(() => {
      this.requestCache.delete(cacheKey);
    });
  }

  async request(endpoint, options = {}) {
    const cacheKey = this.getCacheKey(endpoint, options);
    
    // Check response cache first
    const cachedResponse = this.getCachedResponse(cacheKey);
    if (cachedResponse !== null) {
      return cachedResponse;
    }
    
    // Check if request is already pending
    const pendingRequest = this.getPendingRequest(cacheKey);
    if (pendingRequest) {
      this.log(`⏳ Request already pending for: ${cacheKey}, returning pending promise`);
      return pendingRequest;
    }
    
    // If rawApi is available, use it (from AppState context)
    if (this.rawApi && typeof this.rawApi.request === 'function') {
      try {
        this.log(`🌐 Using rawApi for: ${options.method || 'GET'} ${endpoint}`);
        const promise = this.rawApi.request(endpoint, options);
        
        // Set pending request for deduplication
        if (cacheKey) {
          this.setPendingRequest(cacheKey, promise);
        }
        
        const response = await promise;
        
        // Cache successful GET responses
        if (cacheKey) {
          this.setCachedResponse(cacheKey, response);
        }
        
        return response;
      } catch (error) {
        this.log(`❌ rawApi request failed: ${error.message}`, null, 'error');
        throw error;
      }
    }

    // Fallback to fetch-based implementation
    const promise = this.fetchRequest(endpoint, options);
    
    if (cacheKey) {
      this.setPendingRequest(cacheKey, promise);
    }
    
    try {
      const response = await promise;
      if (cacheKey) {
        this.setCachedResponse(cacheKey, response);
      }
      return response;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Fetch-based request implementation (fallback)
   */
  async fetchRequest(endpoint, options = {}) {
    // Circuit breaker check
    if (this.isCircuitOpen()) {
      const error = new Error('Circuit breaker is open - service temporarily unavailable');
      error.code = 'CIRCUIT_BREAKER_OPEN';
      throw error;
    }
    
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const requestId = Math.random().toString(36).substr(2, 9);
    
    // Build headers
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'X-Request-ID': requestId,
      ...options.headers
    };
    
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    
    // Build request config
    const config = {
      method: 'GET',
      ...options,
      headers,
      signal: AbortSignal.timeout(this.timeout)
    };
    
    this.log(`🌐 API Request [${requestId}]`, {
      method: config.method,
      url,
      headers: Object.keys(headers),
      hasBody: !!config.body
    });
    
    let retries = 0;
    while (retries <= MAX_RETRIES) {
      try {
        const response = await fetch(url, config);
        
        this.log(`📡 Response [${requestId}]`, {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          const error = new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
          error.status = response.status;
          error.code = errorData.error_code || `HTTP_${response.status}`;
          error.details = errorData;
          throw error;
        }
        
        // Parse response
        const contentType = response.headers.get('content-type');
        let data;
        
        if (contentType && contentType.includes('application/json')) {
          data = await response.json();
        } else {
          data = await response.text();
        }
        
        this.log(`✅ Success [${requestId}]`, { dataType: typeof data }, 'success');
        this.recordSuccess();
        
        return data;
        
      } catch (error) {
        this.log(`❌ Error [${requestId}] (Attempt ${retries + 1})`, {
          name: error.name,
          message: error.message,
          status: error.status,
          code: error.code
        }, 'error');
        
        // Don't retry on client errors (4xx)
        if (error.status >= 400 && error.status < 500) {
          throw error;
        }
        
        retries++;
        if (retries > MAX_RETRIES) {
          this.recordFailure();
          throw error;
        }
        
        // Exponential backoff
        const delay = Math.pow(2, retries) * 1000;
        this.log(`⏳ Retrying in ${delay}ms...`, null, 'warning');
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  /**
   * Parse error response with fallbacks
   */
  async parseErrorResponse(response) {
    try {
      const data = await response.json();
      return {
        message: data.detail || data.message || `HTTP ${response.status}`,
        error_code: data.error_code || `HTTP_${response.status}`,
        timestamp: data.timestamp || new Date().toISOString(),
        path: data.path || response.url,
        ...data
      };
    } catch (e) {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
        error_code: `HTTP_${response.status}`,
        timestamp: new Date().toISOString(),
        path: response.url
      };
    }
  }
  
  // ===========================================
  // AUTHENTICATION ENDPOINTS
  // ===========================================
  
  /**
   * Superadmin authentication
   */
  async login(username, password) {
    const response = await this.request('/api/v1/auth/superadmin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password })
    });
    
    if (response.access_token) {
      this.setToken(response.access_token);
    }
    
    return response;
  }
  
  /**
   * Logout (client-side token cleanup)
   */
  logout() {
    this.setToken(null);
    this.log('👋 User logged out');
  }
  
  // ===========================================
  // CORE RESOURCE ENDPOINTS
  // ===========================================
  
  // --- Workspaces ---
  async getWorkspaces(params = {}) {
    // Validate query parameters
    const validatedParams = this.validateQueryParams('WorkspaceQuery', params);
    
    const query = new URLSearchParams();
    if (validatedParams.offset !== undefined) query.append('offset', validatedParams.offset);
    if (validatedParams.limit !== undefined) query.append('limit', validatedParams.limit);
    if (validatedParams.enabled !== undefined) query.append('enabled', validatedParams.enabled);
    
    const endpoint = query.toString() ? `/api/v1/workspaces/?${query.toString()}` : '/api/v1/workspaces/';
    const response = await this.request(endpoint);
    
    // Validate response if it's a paginated response
    if (response && typeof response === 'object' && 'items' in response) {
      return this.validateResponse('PaginatedWorkspaceResponse', response);
    }
    
    return response;
  }
  
  async getWorkspace(id) {
    if (!id) {
      throw new Error('Workspace ID is required');
    }
    
    const response = await this.request(`/api/v1/workspaces/${id}`);
    return this.validateResponse('WorkspaceResponse', response);
  }
  
  async createWorkspace(data) {
    // Validate request data
    const validatedData = this.validateRequest('WorkspaceCreate', data);
    
    const response = await this.request('/api/v1/workspaces/', {
      method: 'POST',
      body: JSON.stringify(validatedData)
    });
    
    return this.validateResponse('WorkspaceResponse', response);
  }
  
  async updateWorkspace(id, data) {
    if (!id) {
      throw new Error('Workspace ID is required');
    }
    
    // Validate request data
    const validatedData = this.validateRequest('WorkspaceUpdate', data);
    
    const response = await this.request(`/api/v1/workspaces/${id}`, {
      method: 'PUT',
      body: JSON.stringify(validatedData)
    });
    
    return this.validateResponse('WorkspaceResponse', response);
  }
  
  async deleteWorkspace(id) {
    if (!id) {
      throw new Error('Workspace ID is required');
    }
    
    return this.request(`/api/v1/workspaces/${id}`, {
      method: 'DELETE'
    });
  }
  
  // --- Services ---
  async getServices(params = {}) {
    // Validate query parameters
    const validatedParams = this.validateQueryParams('ServiceQuery', params);
    
    const queryParams = new URLSearchParams();
    
    // Standard pagination
    if (validatedParams.offset !== undefined) queryParams.append('offset', validatedParams.offset);
    if (validatedParams.limit !== undefined) queryParams.append('limit', validatedParams.limit);
    
    // Filters
    if (validatedParams.workspace_id) queryParams.append('workspace_id', validatedParams.workspace_id);
    
    const query = queryParams.toString();
    const response = await this.request(`/api/v1/services/${query ? `?${query}` : ''}`);
    
    // Validate response if it's a paginated response
    if (response && typeof response === 'object' && 'items' in response) {
      return this.validateResponse('PaginatedServiceResponse', response);
    }
    
    return response;
  }
  
  async getService(id) {
    if (!id) {
      throw new Error('Service ID is required');
    }
    
    const response = await this.request(`/api/v1/services/${id}`);
    return this.validateResponse('ServiceResponse', response);
  }
  
  async createService(data) {
    // Validate request data
    const validatedData = this.validateRequest('ServiceCreate', data);
    
    const response = await this.request('/api/v1/services/', {
      method: 'POST',
      body: JSON.stringify(validatedData)
    });
    
    return this.validateResponse('ServiceResponse', response);
  }
  
  async updateService(id, data) {
    if (!id) {
      throw new Error('Service ID is required');
    }
    
    // Validate request data
    const validatedData = this.validateRequest('ServiceUpdate', data);
    
    const response = await this.request(`/api/v1/services/${id}`, {
      method: 'PUT',
      body: JSON.stringify(validatedData)
    });
    
    return this.validateResponse('ServiceResponse', response);
  }
  
  async deleteService(id) {
    return this.request(`/api/v1/services/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Service Debug Methods ---
  async enableServiceDebug(serviceId) {
    return this.request(`/api/v1/services/${serviceId}/debug`, {
      method: 'POST',
      body: JSON.stringify({ enable: true })
    });
  }

  async disableServiceDebug(serviceId) {
    return this.request(`/api/v1/services/${serviceId}/debug`, {
      method: 'POST',
      body: JSON.stringify({ enable: false })
    });
  }
  
  // --- Routes ---
  async getRoutes(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.service_id) queryParams.append('service_id', params.service_id);
    
    const query = queryParams.toString();
    return this.request(`/api/v1/routes/${query ? `?${query}` : ''}`);
  }
  
  async getRoute(id) {
    return this.request(`/api/v1/routes/${id}`);
  }
  
  async createRoute(data) {
    return this.request('/api/v1/routes/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async updateRoute(id, data) {
    return this.request(`/api/v1/routes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async deleteRoute(id) {
    return this.request(`/api/v1/routes/${id}`, {
      method: 'DELETE'
    });
  }
  
  // --- Consumers ---
  async getConsumers(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    
    const query = queryParams.toString();
    return this.request(`/api/v1/consumers/${query ? `?${query}` : ''}`);
  }
  
  async getConsumer(id) {
    return this.request(`/api/v1/consumers/${id}`);
  }
  
  async createConsumer(data) {
    return this.request('/api/v1/consumers/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async updateConsumer(id, data) {
    return this.request(`/api/v1/consumers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async deleteConsumer(id) {
    return this.request(`/api/v1/consumers/${id}`, {
      method: 'DELETE'
    });
  }
  
  // --- Providers ---
  async getProviders(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    
    const query = queryParams.toString();
    return this.request(`/api/v1/providers/${query ? `?${query}` : ''}`);
  }
  
  async getProvider(id) {
    return this.request(`/api/v1/providers/${id}`);
  }
  
  async createProvider(data) {
    return this.request('/api/v1/providers/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async updateProvider(id, data) {
    return this.request(`/api/v1/providers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async deleteProvider(id) {
    return this.request(`/api/v1/providers/${id}`, {
      method: 'DELETE'
    });
  }

  // --- Dataplanes ---
  async getDataplanes(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    
    const query = queryParams.toString();
    return this.request(`/api/v1/dataplanes/${query ? `?${query}` : ''}`);
  }

  async getDataplane(id) {
    return this.request(`/api/v1/dataplanes/${id}`);
  }

  async getWebsocketStatus() {
    this.log('🏗️  getWebsocketStatus - Starting');
    const result = await this.request('/api/v1/websocket/status');
    this.log('✅ WebSocket status received', { dataplanes: result.dataplanes?.length });
    return result;
  }

  /**
   * Get dataplane heartbeat with ABAC engine status
   * @param {string} dataplaneId - Dataplane ID
   * @returns {Promise<Object>} Heartbeat response with ABAC engine status
   */
  async getDataplaneHeartbeat(dataplaneId) {
    if (!dataplaneId) throw new Error('Dataplane ID is required');
    
    this.log('🏗️  getDataplaneHeartbeat - Starting', { dataplaneId });
    const result = await this.request(`/api/v1/dataplanes/${dataplaneId}/heartbeat`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'PING',
        status: 'healthy'
      })
    });
    
    this.log('✅ Dataplane heartbeat received', { 
      dataplaneId, 
      abacStatus: result.abac_engine_status,
      timestamp: result.timestamp
    });
    return result;
  }

  // --- Debug Methods ---
  async getDebugEntries(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    
    const query = queryParams.toString();
    return this.request(`/api/v1/debug${query ? `?${query}` : ''}`);
  }

  async clearDebugEntries() {
    return this.request('/api/v1/debug/clear', {
      method: 'POST'
    });
  }
  
  // ===========================================
  // PLUGIN MANAGEMENT
  // ===========================================
  
  async getPlugins(params = {}) {
    const queryParams = new URLSearchParams();
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.service_id) queryParams.append('service_id', params.service_id);
    if (params.route_id) queryParams.append('route_id', params.route_id);
    if (params.workspace_id) queryParams.append('workspace_id', params.workspace_id);
    if (params.enabled !== undefined) queryParams.append('enabled', params.enabled);
    
    const query = queryParams.toString();
    return this.request(`/api/v1/plugins${query ? `?${query}` : ''}`);
  }
  
  async getPlugin(id) {
    return this.request(`/api/v1/plugins/${id}`);
  }
  
  async createPlugin(data) {
    return this.request('/api/v1/plugins', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async updatePlugin(id, data) {
    return this.request(`/api/v1/plugins/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async deletePlugin(id) {
    return this.request(`/api/v1/plugins/${id}`, {
      method: 'DELETE'
    });
  }
  
  async getAvailablePlugins() {
    return this.request('/api/v1/plugins/available');
  }
  
  async getPluginSchema(pluginName) {
    return this.request(`/api/v1/plugins/schema/${pluginName}`);
  }
  
  // ===========================================
  // CERTIFICATES MANAGEMENT
  // ===========================================
  
  async getCertificates(params = {}) {
    // Validate query parameters
    const validatedParams = this.validateQueryParams('CertificateQuery', params);
    
    const queryParams = new URLSearchParams();
    if (validatedParams.offset !== undefined) queryParams.append('offset', validatedParams.offset);
    if (validatedParams.limit !== undefined) queryParams.append('limit', validatedParams.limit);
    if (validatedParams.enabled !== undefined) queryParams.append('enabled', validatedParams.enabled);
    
    const query = queryParams.toString();
    const response = await this.request(`/api/v1/certificates/${query ? `?${query}` : ''}`);
    
    // Based on OpenAPI spec, this returns an array directly, not paginated
    if (Array.isArray(response)) {
      return response.map(cert => this.validateResponse('CertificateResponse', cert));
    }
    
    return response;
  }
  
  async getCertificate(id) {
    if (!id) {
      throw new Error('Certificate ID is required');
    }
    
    const response = await this.request(`/api/v1/certificates/${id}`);
    return this.validateResponse('CertificateResponse', response);
  }
  
  async createCertificate(data) {
    // Validate request data
    const validatedData = this.validateRequest('CertificateCreate', data);
    
    const response = await this.request('/api/v1/certificates/', {
      method: 'POST',
      body: JSON.stringify(validatedData)
    });
    
    return this.validateResponse('CertificateResponse', response);
  }
  
  async updateCertificate(id, data) {
    if (!id) {
      throw new Error('Certificate ID is required');
    }
    
    // Validate request data
    const validatedData = this.validateRequest('CertificateUpdate', data);
    
    const response = await this.request(`/api/v1/certificates/${id}`, {
      method: 'PUT',
      body: JSON.stringify(validatedData)
    });
    
    return this.validateResponse('CertificateResponse', response);
  }
  
  async deleteCertificate(id) {
    if (!id) {
      throw new Error('Certificate ID is required');
    }
    
    return this.request(`/api/v1/certificates/${id}`, {
      method: 'DELETE'
    });
  }

  // ===========================================
  // CONSUMER CREDENTIALS MANAGEMENT  
  // ===========================================
  
  async getConsumerCredentials(consumerId) {
    return this.request(`/api/v1/consumers/${consumerId}/keys`);
  }
  
  async createConsumerCredential(consumerId, data = {}) {
    return this.request(`/api/v1/consumers/${consumerId}/keys`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async deleteConsumerCredential(consumerId, keyName) {
    return this.request(`/api/v1/consumers/${consumerId}/keys/${keyName}`, {
      method: 'DELETE'
    });
  }
  
  async getConsumerCredentialValue(consumerId, keyName) {
    return this.request(`/api/v1/consumers/${consumerId}/keys/${keyName}`);
  }

  // ===========================================
  // POLICY MANAGEMENT ENDPOINTS
  // ===========================================
  
  // Service Policy Methods
  async getServicePolicy(serviceId) {
    this.log('🏗️  getServicePolicy - Starting', { serviceId });
    const result = await this.request(`/api/v1/services/${serviceId}/policy`);
    this.log('✅ Service policy fetched successfully', result);
    return result;
  }
  
  async createServicePolicy(serviceId, data) {
    this.log('🏗️  createServicePolicy - Starting', { serviceId, data });
    const result = await this.request(`/api/v1/services/${serviceId}/policy`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.log('✅ Service policy created successfully', result);
    return result;
  }
  
  async updateServicePolicy(serviceId, policyId, data) {
    this.log('🏗️  updateServicePolicy - Starting', { serviceId, policyId, data });
    const result = await this.request(`/api/v1/services/${serviceId}/policy/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    this.log('✅ Service policy updated successfully', result);
    return result;
  }
  
  async deleteServicePolicy(serviceId, policyId) {
    this.log('🏗️  deleteServicePolicy - Starting', { serviceId, policyId });
    await this.request(`/api/v1/services/${serviceId}/policy/${policyId}`, {
      method: 'DELETE'
    });
    this.log('✅ Service policy deleted successfully');
  }
  
  // Consumer Policy Methods
  async getConsumerPolicies(consumerId, offset = 0, limit = 100) {
    this.log('🏗️  getConsumerPolicies - Starting', { consumerId, offset, limit });
    const result = await this.request(`/api/v1/consumers/${consumerId}/policies?offset=${offset}&limit=${limit}`);
    this.log('✅ Consumer policies fetched successfully', result);
    return result;
  }
  
  async createConsumerPolicy(consumerId, data) {
    this.log('🏗️  createConsumerPolicy - Starting', { consumerId, data });
    const result = await this.request(`/api/v1/consumers/${consumerId}/policies`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    this.log('✅ Consumer policy created successfully', result);
    return result;
  }
  
  async getConsumerPolicy(consumerId, policyId) {
    this.log('🏗️  getConsumerPolicy - Starting', { consumerId, policyId });
    const result = await this.request(`/api/v1/consumers/${consumerId}/policy/${policyId}`);
    this.log('✅ Consumer policy fetched successfully', result);
    return result;
  }
  
  async updateConsumerPolicy(consumerId, policyId, data) {
    this.log('🏗️  updateConsumerPolicy - Starting', { consumerId, policyId, data });
    const result = await this.request(`/api/v1/consumers/${consumerId}/policy/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    this.log('✅ Consumer policy updated successfully', result);
    return result;
  }
  
  async deleteConsumerPolicy(consumerId, policyId) {
    this.log('🏗️  deleteConsumerPolicy - Starting', { consumerId, policyId });
    await this.request(`/api/v1/consumers/${consumerId}/policy/${policyId}`, {
      method: 'DELETE'
    });
    this.log('✅ Consumer policy deleted successfully');
  }
  
  async getConsumerPolicyLegacy(consumerId) {
    this.log('🏗️  getConsumerPolicyLegacy - Starting', { consumerId });
    const result = await this.request(`/api/v1/consumers/${consumerId}/policy`);
    this.log('✅ Consumer policy (legacy) fetched successfully', result);
    return result;
  }

  // ===========================================
  // ABAC POLICIES MANAGEMENT ENDPOINTS
  // ===========================================

  /**
   * List ABAC Policies
   * @param {Object} params - Query parameters
   * @param {number} params.offset - Pagination offset (default: 0)
   * @param {number} params.limit - Page size (default: 100, max: 1000)
   * @param {string} params.service_id - Filter by service ID
   * @param {boolean} params.enabled - Filter by enabled status
   */
  async getAbacPolicies(params = {}) {
    this.log('🏗️  getAbacPolicies - Starting with params:', params);
    
    const queryParams = new URLSearchParams();
    if (params.offset !== undefined) queryParams.append('offset', params.offset);
    if (params.limit !== undefined) queryParams.append('limit', params.limit);
    if (params.service_id) queryParams.append('service_id', params.service_id);
    if (params.enabled !== undefined) queryParams.append('enabled', params.enabled);
    
    const query = queryParams.toString();
    const result = await this.request(`/api/v1/abac-policies/${query ? `?${query}` : ''}`);
    this.log('✅ ABAC policies fetched successfully', { 
      count: result?.items?.length || 0, 
      total: result?.total 
    });
    return result;
  }

  /**
   * Get single ABAC Policy by ID
   * @param {string} policyId - Policy ID
   */
  async getAbacPolicy(policyId) {
    if (!policyId) throw new Error('Policy ID is required');
    
    this.log('🏗️  getAbacPolicy - Starting', { policyId });
    const result = await this.request(`/api/v1/abac-policies/${policyId}`);
    this.log('✅ ABAC policy fetched successfully', result);
    return result;
  }

  /**
   * Create ABAC Policy
   * @param {Object} data - Policy data
   */
  async createAbacPolicy(data) {
    this.log('🏗️  createAbacPolicy - Starting', { name: data.name, service_id: data.service_id });
    
    if (!data.name) throw new Error('Policy name is required');
    if (!data.service_id) throw new Error('Service ID is required');
    if (!data.oidc_config) throw new Error('OIDC config is required');
    if (!data.dsl) throw new Error('DSL is required');
    
    const result = await this.request('/api/v1/abac-policies/', {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    this.log('✅ ABAC policy created successfully', { id: result.id, name: result.name });
    return result;
  }

  /**
   * Update ABAC Policy
   * @param {string} policyId - Policy ID
   * @param {Object} data - Update data (all fields optional)
   */
  async updateAbacPolicy(policyId, data) {
    if (!policyId) throw new Error('Policy ID is required');
    
    this.log('🏗️  updateAbacPolicy - Starting', { policyId, changes: Object.keys(data) });
    this.log('🏗️  updateAbacPolicy - Full request body:', { policyId, dataKeys: Object.keys(data), bodySnippet: JSON.stringify(data).substring(0, 200) });
    
    const result = await this.request(`/api/v1/abac-policies/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(data)
    });
    
    this.log('✅ ABAC policy updated successfully', { id: result.id, name: result.name });
    return result;
  }

  /**
   * Delete ABAC Policy
   * @param {string} policyId - Policy ID
   */
  async deleteAbacPolicy(policyId) {
    if (!policyId) throw new Error('Policy ID is required');
    
    this.log('🏗️  deleteAbacPolicy - Starting', { policyId });
    const result = await this.request(`/api/v1/abac-policies/${policyId}`, {
      method: 'DELETE'
    });
    
    this.log('✅ ABAC policy deleted successfully', policyId);
    return result;
  }

  /**
   * Validate DSL (without saving)
   * @param {Object} dsl - DSL object to validate
   */
  async validateAbacDsl(dsl) {
    this.log('🏗️  validateAbacDsl - Starting');
    
    if (!dsl) throw new Error('DSL is required');
    
    const result = await this.request('/api/v1/abac-policies/validate', {
      method: 'POST',
      body: JSON.stringify(dsl)
    });
    
    if (result.valid) {
      this.log('✅ ABAC DSL is valid', result);
    } else {
      this.log('⚠️  ABAC DSL validation failed', { errors: result.errors });
    }
    
    return result;
  }

  /**
   * Deploy ABAC Policies to Engine
   * @param {Object} params - Deploy parameters
   * @param {string[]} params.service_ids - Service IDs to deploy for (null = all enabled)
   */
  async deployAbacPolicies(params = {}) {
    this.log('🏗️  deployAbacPolicies - Starting', { 
      service_ids: params.service_ids || 'ALL ENABLED'
    });
    
    const body = {};
    if (params.service_ids) {
      body.service_ids = params.service_ids;
    }
    
    const result = await this.request('/api/v1/abac-policies/deploy', {
      method: 'POST',
      body: JSON.stringify(body)
    });
    
    this.log('✅ ABAC policies deployed', { 
      deployed: result.deployed,
      errors: result.engine_response?.total_errors || 0
    });
    return result;
  }

  /**
   * Get ABAC Engine Status
   */
  async getAbacEngineStatus() {
    this.log('🏗️  getAbacEngineStatus - Starting');
    
    try {
      const result = await this.request('/api/v1/abac-policies/engine/status');
      this.log('✅ ABAC engine status fetched', result);
      return result;
    } catch (error) {
      this.log('⚠️  ABAC engine unavailable', error, 'warning');
      throw error;
    }
  }

  // ===========================================
  // SYSTEM ENDPOINTS
  // ===========================================
  
  async getHealth() {
    return this.request('/api/v1/config/health');
  }
  
  async getVersion() {
    return this.request('/api/v1/config/version');
  }
  
  // ===========================================
  // UTILITY METHODS
  // ===========================================
  
  /**
   * Test API connectivity
   */
  async testConnection() {
    try {
      const health = await this.getHealth();
      this.log('✅ API connection test successful', health, 'success');
      return { success: true, data: health };
    } catch (error) {
      this.log('❌ API connection test failed', error, 'error');
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus() {
    return {
      isOpen: this.circuitBreaker.isOpen,
      failureCount: this.circuitBreaker.failureCount,
      lastFailureTime: this.circuitBreaker.lastFailureTime,
      threshold: this.circuitBreaker.threshold,
      timeout: this.circuitBreaker.timeout
    };
  }
  
  /**
   * Reset circuit breaker manually
   */
  resetCircuitBreaker() {
    this.circuitBreaker.isOpen = false;
    this.circuitBreaker.failureCount = 0;
    this.circuitBreaker.lastFailureTime = null;
    this.log('🔄 Circuit breaker manually reset', null, 'warning');
  }

  // ===========================================
  // AUDIT LOG ENDPOINTS
  // ===========================================

  /**
   * Get audit log entries (superadmin only)
   * @param {Object} params - Query parameters
   * @param {number} params.page - Page number (default: 1)
   * @param {number} params.page_size - Items per page (default: 50, max: 500)
   * @param {string} params.method - Filter by HTTP method
   * @param {string} params.username - Filter by username
   * @param {string} params.resource_type - Filter by resource type
   * @param {number} params.status_code - Filter by status code
   * @param {string} params.source_ip - Filter by source IP
   * @param {string} params.since - ISO-8601 start time
   * @param {string} params.until - ISO-8601 end time
   */
  async getAuditLogs(params = {}) {
    const queryParams = new URLSearchParams();
    const allowedParams = ['page', 'page_size', 'method', 'username', 'resource_type', 'status_code', 'source_ip', 'since', 'until'];
    for (const key of allowedParams) {
      if (params[key] !== undefined && params[key] !== '' && params[key] !== null) {
        queryParams.append(key, params[key]);
      }
    }
    const query = queryParams.toString();
    return this.request(`/api/v1/audit/logs${query ? `?${query}` : ''}`);
  }

  /**
   * Purge audit log entries (superadmin only)
   * @param {string} before - ISO-8601 timestamp, delete entries older than this. Omit to delete all.
   */
  async purgeAuditLogs(before = null) {
    const queryParams = new URLSearchParams();
    if (before) {
      queryParams.append('before', before);
    }
    const query = queryParams.toString();
    return this.request(`/api/v1/audit/logs${query ? `?${query}` : ''}`, {
      method: 'DELETE'
    });
  }
}

// Export singleton instance with validation enabled
const api = new PyGatewayAPI({
  validateSchemas: true,
  strictValidation: false, // Warnings only in production
  debug: process.env.NODE_ENV === 'development'
});

export default api;
export { PyGatewayAPI };
