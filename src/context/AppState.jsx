import React, { createContext, useContext, useReducer, useEffect } from 'react';
import api from '../api/PyGatewayAPI.js';
import { PyGatewayAPI } from '../api/PyGatewayAPI.js';

// API Configuration - Updated to match backend documentation
export const API_BASE_URL = '/api/v1';

// Fallback plugin schemas for common plugins when API is unavailable
const getFallbackPluginSchema = (pluginName) => {
  const fallbackSchemas = {
    'rate-limiting': {
      type: 'object',
      properties: {
        minute: { type: 'integer', minimum: 1, description: 'Requests per minute' },
        hour: { type: 'integer', minimum: 1, description: 'Requests per hour' },
        day: { type: 'integer', minimum: 1, description: 'Requests per day' },
        policy: { 
          type: 'string', 
          enum: ['local', 'cluster', 'redis'], 
          default: 'local',
          description: 'Rate limiting policy' 
        },
        hide_client_headers: { type: 'boolean', default: false },
        fault_tolerant: { type: 'boolean', default: true }
      }
    },
    'cors': {
      type: 'object',
      properties: {
        origins: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Allowed origins for CORS requests' 
        },
        methods: { 
          type: 'array', 
          items: { type: 'string' },
          default: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
          description: 'Allowed HTTP methods' 
        },
        headers: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Allowed headers' 
        },
        exposed_headers: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Headers exposed to the client' 
        },
        credentials: { type: 'boolean', default: false },
        max_age: { type: 'integer', minimum: 1, description: 'Preflight cache duration in seconds' }
      }
    },
    'key-auth': {
      type: 'object',
      properties: {
        key_names: { 
          type: 'array', 
          items: { type: 'string' },
          default: ['apikey'],
          description: 'Header or query parameter names to look for the API key' 
        },
        hide_credentials: { type: 'boolean', default: false },
        anonymous: { type: 'string', description: 'Anonymous consumer UUID' },
        run_on_preflight: { type: 'boolean', default: true }
      }
    },
    'basic-auth': {
      type: 'object',
      properties: {
        hide_credentials: { type: 'boolean', default: false },
        anonymous: { type: 'string', description: 'Anonymous consumer UUID' },
        run_on_preflight: { type: 'boolean', default: true }
      }
    },
    'request-transformer': {
      type: 'object',
      properties: {
        add_headers: { type: 'object', description: 'Headers to add' },
        remove_headers: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Headers to remove' 
        },
        replace_headers: { type: 'object', description: 'Headers to replace' },
        add_querystring: { type: 'object', description: 'Query parameters to add' },
        remove_querystring: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Query parameters to remove' 
        },
        replace_querystring: { type: 'object', description: 'Query parameters to replace' },
        add_body: { type: 'object', description: 'Body fields to add (JSON only)' },
        remove_body: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Body fields to remove (JSON only)' 
        },
        replace_body: { type: 'object', description: 'Body fields to replace (JSON only)' },
        rename_headers: { type: 'object', description: 'Headers to rename' },
        if_headers: { type: 'object', description: 'Conditional headers for transformation' }
      }
    },
    'response-transformer': {
      type: 'object',
      properties: {
        add_headers: { type: 'object', description: 'Headers to add to response' },
        remove_headers: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Headers to remove from response' 
        },
        replace_headers: { type: 'object', description: 'Headers to replace in response' },
        add_json: { type: 'object', description: 'JSON fields to add to response body' },
        remove_json: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'JSON fields to remove from response body' 
        },
        replace_json: { type: 'object', description: 'JSON fields to replace in response body' },
        rename_headers: { type: 'object', description: 'Headers to rename in response' }
      }
    },
    'jwt': {
      type: 'object',
      properties: {
        secret_key: { type: 'string', description: 'Secret key for JWT verification' },
        algorithm: { 
          type: 'string', 
          enum: ['HS256', 'HS384', 'HS512', 'RS256', 'RS384', 'RS512'],
          default: 'HS256',
          description: 'Algorithm for JWT verification' 
        },
        claims_to_verify: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'Claims to verify in JWT' 
        },
        key_claim_name: { type: 'string', default: 'iss', description: 'Claim name for the key' },
        anonymous: { type: 'string', description: 'Anonymous consumer UUID' }
      }
    },
    'oauth2': {
      type: 'object',
      properties: {
        scopes: { 
          type: 'array', 
          items: { type: 'string' },
          description: 'OAuth2 scopes required' 
        },
        mandatory_scope: { type: 'boolean', default: false, description: 'Whether scope is mandatory' },
        token_expiration: { type: 'integer', default: 7200, description: 'Token expiration time in seconds' },
        enable_authorization_code: { type: 'boolean', default: true, description: 'Enable authorization code flow' },
        enable_client_credentials: { type: 'boolean', default: false, description: 'Enable client credentials flow' },
        enable_implicit_grant: { type: 'boolean', default: false, description: 'Enable implicit grant flow' }
      }
    }
  };
  
  return fallbackSchemas[pluginName] || null;
};

// Initial state matching the original admin-ui structure
const initialState = {
  // Data
  certificates: [],
  workspaces: [],
  services: [],
  routes: [],
  providers: [],
  plugins: [],
  dataplanes: [],
  consumers: [],
  availablePlugins: [],
  pluginSchemas: {},
  
  // Policy data
  servicePolicies: {},  // keyed by serviceId
  consumerPolicies: {}, // keyed by consumerId
  abacPolicies: {
    items: [],
    total: 0
  },
  abacEngineStatus: null,
  
  // Pagination state - Updated to match backend documentation
  pagination: {
    workspaces: { offset: 0, limit: 100, total: 0, hasMore: true },
    services: { offset: 0, limit: 100, total: 0, hasMore: true },
    routes: { offset: 0, limit: 100, total: 0, hasMore: true },
    plugins: { offset: 0, limit: 100, total: 0, hasMore: true },
    consumers: { offset: 0, limit: 100, total: 0, hasMore: true },
    providers: { offset: 0, limit: 100, total: 0, hasMore: true },
    dataplanes: { offset: 0, limit: 100, total: 0, hasMore: true },
    abacPolicies: { offset: 0, limit: 100, total: 0, hasMore: true }
  },
  
  // UI state
  currentWorkspace: null,
  currentService: null,
  selectedWorkspaceId: null, // For workspace selection/filtering in API view
  selectedServiceId: null, // For service selection/filtering in API view
  selectedRouteId: null, // For route selection/filtering in API view
  serviceWorkspaceFilter: null,
  routeServiceFilter: null,
  
  // Auth state
  authToken: localStorage.getItem('authToken'),
  currentUser: null,
  ssoEnabled: false,
  
  // Auto-refresh state
  autoRefreshInterval: null,
  autoRefreshEnabled: false,
  
  // Circuit breaker state
  circuitBreaker: {
    failureCount: 0,
    lastFailureTime: null,
    isOpen: false,
    resetTimeout: 10000, // 10 seconds (reduced from 30)
    maxFailures: 5 // Allow more failures before opening (increased from 3)
  },
  
  // Loading states
  loading: {
    dashboard: false,
    workspaces: false,
    services: false,
    routes: false,
    providers: false,
    plugins: false,
    dataplanes: false,
    certificates: false,
    analytics: false,
    servicePolicies: false,
    consumerPolicies: false,
    abacPolicies: false,
    abacEngineStatus: false
  },
  
  // Error states
  errors: {},
  
  // Master data initialization state
  isInitializing: true,
  initError: null,
  dataLoaded: false,
  initStartTime: null
};

// Action types
export const ActionTypes = {
  // Data actions
  SET_CERTIFICATES: 'SET_CERTIFICATES',
  SET_WORKSPACES: 'SET_WORKSPACES',
  SET_SERVICES: 'SET_SERVICES',
  SET_ROUTES: 'SET_ROUTES',
  SET_PROVIDERS: 'SET_PROVIDERS',
  SET_PLUGINS: 'SET_PLUGINS',
  SET_DATAPLANES: 'SET_DATAPLANES',
  SET_CONSUMERS: 'SET_CONSUMERS',
  SET_AVAILABLE_PLUGINS: 'SET_AVAILABLE_PLUGINS',
  SET_PLUGIN_SCHEMAS: 'SET_PLUGIN_SCHEMAS',
  SET_DEBUG_ENTRIES: 'SET_DEBUG_ENTRIES',
  
  // Pagination actions
  SET_PAGINATION: 'SET_PAGINATION',
  RESET_PAGINATION: 'RESET_PAGINATION',
  
  // UI actions
  SET_CURRENT_WORKSPACE: 'SET_CURRENT_WORKSPACE',
  SET_CURRENT_SERVICE: 'SET_CURRENT_SERVICE',
  SET_SELECTED_WORKSPACE_ID: 'SET_SELECTED_WORKSPACE_ID',
  SET_SELECTED_SERVICE_ID: 'SET_SELECTED_SERVICE_ID',
  SET_SELECTED_ROUTE_ID: 'SET_SELECTED_ROUTE_ID',
  SET_SERVICE_WORKSPACE_FILTER: 'SET_SERVICE_WORKSPACE_FILTER',
  SET_ROUTE_SERVICE_FILTER: 'SET_ROUTE_SERVICE_FILTER',
  
  // Auth actions
  SET_AUTH_TOKEN: 'SET_AUTH_TOKEN',
  SET_CURRENT_USER: 'SET_CURRENT_USER',
  SET_SSO_ENABLED: 'SET_SSO_ENABLED',
  LOGOUT: 'LOGOUT',
  
  // Circuit breaker actions
  CIRCUIT_BREAKER_FAILURE: 'CIRCUIT_BREAKER_FAILURE',
  CIRCUIT_BREAKER_SUCCESS: 'CIRCUIT_BREAKER_SUCCESS',
  CIRCUIT_BREAKER_RESET: 'CIRCUIT_BREAKER_RESET',
  
  // Auto-refresh actions
  SET_AUTO_REFRESH: 'SET_AUTO_REFRESH',
  
  // Master data initialization actions
  SET_INITIALIZING: 'SET_INITIALIZING',
  SET_INIT_ERROR: 'SET_INIT_ERROR',
  SET_DATA_LOADED: 'SET_DATA_LOADED',
  
  // Loading actions
  SET_LOADING: 'SET_LOADING',
  
  // Error actions
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  
  // Policy actions
  SET_SERVICE_POLICY: 'SET_SERVICE_POLICY',
  SET_CONSUMER_POLICIES: 'SET_CONSUMER_POLICIES',
  SET_ABAC_POLICIES: 'SET_ABAC_POLICIES',
  SET_ABAC_ENGINE_STATUS: 'SET_ABAC_ENGINE_STATUS'
};

// Reducer function
function appReducer(state, action) {
  switch (action.type) {
    case ActionTypes.SET_CERTIFICATES:
      return { ...state, certificates: action.payload };
    case ActionTypes.SET_WORKSPACES:
      return { ...state, workspaces: action.payload };
    case ActionTypes.SET_SERVICES:
      return { ...state, services: action.payload };
    case ActionTypes.SET_ROUTES:
      return { ...state, routes: action.payload };
    case ActionTypes.SET_PROVIDERS:
      return { ...state, providers: action.payload };
    case ActionTypes.SET_PLUGINS:
      return { ...state, plugins: action.payload };
    case ActionTypes.SET_DATAPLANES:
      return { ...state, dataplanes: action.payload };
    case ActionTypes.SET_CONSUMERS:
      return { ...state, consumers: action.payload };
    case ActionTypes.SET_AVAILABLE_PLUGINS:
      return { ...state, availablePlugins: action.payload };
    case ActionTypes.SET_PLUGIN_SCHEMAS:
      return { ...state, pluginSchemas: { ...state.pluginSchemas, ...action.payload } };
    case ActionTypes.SET_DEBUG_ENTRIES:
      return { ...state, debugEntries: action.payload };
    
    case ActionTypes.SET_PAGINATION:
      return { 
        ...state, 
        pagination: { 
          ...state.pagination, 
          [action.payload.resource]: action.payload.data 
        } 
      };
    case ActionTypes.RESET_PAGINATION:
      return {
        ...state,
        pagination: {
          ...state.pagination,
          [action.payload]: { offset: 0, limit: 100, total: 0, hasMore: true }
        }
      };
    
    case ActionTypes.SET_CURRENT_WORKSPACE:
      return { ...state, currentWorkspace: action.payload };
    case ActionTypes.SET_CURRENT_SERVICE:
      return { ...state, currentService: action.payload };
    case ActionTypes.SET_SELECTED_WORKSPACE_ID:
      return { ...state, selectedWorkspaceId: action.payload };
    case ActionTypes.SET_SELECTED_SERVICE_ID:
      return { ...state, selectedServiceId: action.payload };
    case ActionTypes.SET_SELECTED_ROUTE_ID:
      return { ...state, selectedRouteId: action.payload };
    case ActionTypes.SET_SERVICE_WORKSPACE_FILTER:
      return { ...state, serviceWorkspaceFilter: action.payload };
    case ActionTypes.SET_ROUTE_SERVICE_FILTER:
      return { ...state, routeServiceFilter: action.payload };
    
    case ActionTypes.SET_AUTH_TOKEN:
      if (action.payload) {
        localStorage.setItem('authToken', action.payload);
      } else {
        localStorage.removeItem('authToken');
      }
      return { ...state, authToken: action.payload };
    case ActionTypes.SET_CURRENT_USER:
      return { ...state, currentUser: action.payload };
    case ActionTypes.SET_SSO_ENABLED:
      return { ...state, ssoEnabled: action.payload };
    case ActionTypes.LOGOUT:
      localStorage.removeItem('authToken');
      return { 
        ...state, 
        authToken: null, 
        currentUser: null,
        currentWorkspace: null,
        currentService: null
      };
    
    // Circuit breaker actions
    case ActionTypes.CIRCUIT_BREAKER_FAILURE:
      const newFailureCount = state.circuitBreaker.failureCount + 1;
      const shouldOpenCircuit = newFailureCount >= state.circuitBreaker.maxFailures; // Use configurable threshold
      return {
        ...state,
        circuitBreaker: {
          ...state.circuitBreaker,
          failureCount: newFailureCount,
          lastFailureTime: Date.now(),
          isOpen: shouldOpenCircuit
        }
      };
    
    case ActionTypes.CIRCUIT_BREAKER_SUCCESS:
      return {
        ...state,
        circuitBreaker: {
          ...state.circuitBreaker,
          failureCount: 0,
          isOpen: false,
          lastFailureTime: null
        }
      };
    
    case ActionTypes.CIRCUIT_BREAKER_RESET:
      return {
        ...state,
        circuitBreaker: {
          ...state.circuitBreaker,
          isOpen: false,
          failureCount: 0,
          lastFailureTime: null
        }
      };
    
    case ActionTypes.SET_AUTO_REFRESH:
      return { 
        ...state, 
        autoRefreshEnabled: action.payload.enabled,
        autoRefreshInterval: action.payload.interval
      };
    
    case ActionTypes.SET_LOADING:
      return {
        ...state,
        loading: { ...state.loading, [action.payload.key]: action.payload.value }
      };
    
    case ActionTypes.SET_ERROR:
      return {
        ...state,
        errors: { ...state.errors, [action.payload.key]: action.payload.error }
      };
    case ActionTypes.CLEAR_ERROR:
      const newErrors = { ...state.errors };
      delete newErrors[action.payload.key];
      return { ...state, errors: newErrors };
    
    // Policy reducers
    case ActionTypes.SET_SERVICE_POLICY:
      return {
        ...state,
        servicePolicies: {
          ...state.servicePolicies,
          [action.payload.serviceId]: action.payload.policy
        }
      };
    case ActionTypes.SET_CONSUMER_POLICIES:
      return {
        ...state,
        consumerPolicies: {
          ...state.consumerPolicies,
          [action.payload.consumerId]: action.payload.policies
        }
      };
    case ActionTypes.SET_ABAC_POLICIES:
      return {
        ...state,
        abacPolicies: {
          items: action.payload.items || [],
          total: action.payload.total || 0
        }
      };
    case ActionTypes.SET_ABAC_ENGINE_STATUS:
      return {
        ...state,
        abacEngineStatus: action.payload
      };
    
    // Master data initialization actions
    case ActionTypes.SET_INITIALIZING:
      return { ...state, isInitializing: action.payload };
    
    case ActionTypes.SET_INIT_ERROR:
      return { ...state, initError: action.payload };
    
    case ActionTypes.SET_DATA_LOADED:
      return { ...state, dataLoaded: action.payload, isInitializing: false };
    
    default:
      return state;
  }
}

// Context
const AppStateContext = createContext();

// Provider component
export function AppStateProvider({ children }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Auto-refresh functionality
  useEffect(() => {
    if (state.autoRefreshEnabled && state.autoRefreshInterval) {
      const intervalId = setInterval(() => {
        // Refresh data based on current view
        // This will be implemented by individual components
        window.dispatchEvent(new CustomEvent('autoRefresh'));
      }, state.autoRefreshInterval);

      return () => clearInterval(intervalId);
    }
  }, [state.autoRefreshEnabled, state.autoRefreshInterval]);

  // Master Data Initialization - Load all core resources on app mount
  // NOTE: Temporarily disabled due to API validation issues
  // Data will be loaded on-demand by individual components
  useEffect(() => {
    dispatch({ type: ActionTypes.SET_DATA_LOADED, payload: true });
    dispatch({ type: ActionTypes.SET_INITIALIZING, payload: false });
  }, []);

  // API helper functions - Updated to use professional API client
  const apiHelpers = {
    // Data loading functions - Updated to use backend pagination documentation
    async loadWorkspaces(offset = 0, limit = 100) {
      console.log('🏗️  loadWorkspaces - Starting with params:', { offset, limit });
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'workspaces', value: true } });
      try {
        const data = await api.getWorkspaces({ offset, limit });
        console.log('🏗️  loadWorkspaces - API response:', data);
        
        // Backend now consistently returns { items: [...], total: X } format
        const workspaces = data.items || [];
        const total = data.total || 0;
        
        dispatch({ type: ActionTypes.SET_WORKSPACES, payload: workspaces });
        dispatch({ 
          type: ActionTypes.SET_PAGINATION, 
          payload: { 
            resource: 'workspaces', 
            data: { offset, limit, total, hasMore: offset + limit < total } 
          } 
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'workspaces' } });
        console.log('🏗️  loadWorkspaces - Success, dispatched data with pagination:', { workspaces: workspaces.length, total, offset, limit });
      } catch (error) {
        console.error('🏗️  loadWorkspaces - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'workspaces', error } });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'workspaces', value: false } });
      }
    },

    setSelectedWorkspaceId(workspaceId) {
      console.log('🏢 setSelectedWorkspaceId - Setting to:', workspaceId);
      dispatch({ type: ActionTypes.SET_SELECTED_WORKSPACE_ID, payload: workspaceId });
    },

    setSelectedServiceId(serviceId) {
      console.log('🎯 setSelectedServiceId - Setting to:', serviceId);
      dispatch({ type: ActionTypes.SET_SELECTED_SERVICE_ID, payload: serviceId });
    },

    setSelectedRouteId(routeId) {
      console.log('🛣️ setSelectedRouteId - Setting to:', routeId);
      dispatch({ type: ActionTypes.SET_SELECTED_ROUTE_ID, payload: routeId });
    },

    async loadServices(offset = 0, limit = 100, filters = {}) {
      console.log('🎯 loadServices - Starting with params:', { offset, limit, filters });
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'services', value: true } });
      try {
        const params = { offset, limit };
        
        // Apply workspace filter from state or explicit filters
        const effectiveFilters = { ...filters };
        if (state.serviceWorkspaceFilter && !effectiveFilters.workspace_id) {
          effectiveFilters.workspace_id = state.serviceWorkspaceFilter;
        }
        
        if (effectiveFilters.workspace_id) {
          params.workspace_id = effectiveFilters.workspace_id;
          console.log('🎯 loadServices - Applied workspace filter:', effectiveFilters.workspace_id);
        }
        
        console.log('🎯 loadServices - Final params with filters:', params);
        
        const data = await api.getServices(params);
        console.log('🎯 loadServices - API response:', data);
        
        // Backend now consistently returns { items: [...], total: X } format
        const services = data.items || [];
        const total = data.total || 0;
        
        console.log('🎯 loadServices - Processed services:', { count: services.length, total });
        
        dispatch({ type: ActionTypes.SET_SERVICES, payload: services });
        dispatch({ 
          type: ActionTypes.SET_PAGINATION, 
          payload: { 
            resource: 'services', 
            data: { offset, limit, total, hasMore: offset + limit < total } 
          } 
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'services' } });
      } catch (error) {
        console.error('🎯 loadServices - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'services', error } });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'services', value: false } });
      }
    },

    async loadRoutes(offset = 0, limit = 100, filters = {}) {
      console.log('🛣️  loadRoutes - Starting with params:', { offset, limit, filters });
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'routes', value: true } });
      try {
        const params = { offset, limit };
        if (filters.service_id) params.service_id = filters.service_id;
        // Note: workspace_id filtering is done client-side, not supported by backend
        const data = await api.getRoutes(params);
        console.log('🛣️  loadRoutes - API response:', data);
        
        // Backend now consistently returns { items: [...], total: X } format
        const routes = data.items || [];
        const total = data.total || 0;
        
        dispatch({ type: ActionTypes.SET_ROUTES, payload: routes });
        dispatch({ 
          type: ActionTypes.SET_PAGINATION, 
          payload: { 
            resource: 'routes', 
            data: { offset, limit, total, hasMore: offset + limit < total } 
          } 
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'routes' } });
        console.log('🛣️  loadRoutes - Success, dispatched data with pagination:', { routes: routes.length, total, offset, limit });
      } catch (error) {
        console.error('🛣️  loadRoutes - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'routes', error } });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'routes', value: false } });
      }
    },

    // Load all routes with pagination to get complete dataset
    async loadAllRoutes() {
      console.log('🛣️  loadAllRoutes - Starting to load all routes...');
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'routes', value: true } });
      try {
        let allRoutes = [];
        let offset = 0;
        let limit = 1000;
        let total = Infinity;
        let count = 0;
        
        while (offset < total && count < 5) { // Limit to 5 requests max to prevent infinite loops
          console.log(`🛣️  loadAllRoutes - Fetching batch ${count + 1}: offset=${offset}, limit=${limit}`);
          
          const data = await api.getRoutes({ offset, limit });
          const routes = data.items || [];
          const routeTotal = data.total || 0;
          
          allRoutes = allRoutes.concat(routes);
          total = routeTotal;
          offset += limit;
          count++;
          
          console.log(`🛣️  loadAllRoutes - Batch ${count}: got ${routes.length} routes, total: ${routeTotal}, allRoutes so far: ${allRoutes.length}`);
          
          // Stop if we got all the routes
          if (offset >= total) {
            break;
          }
        }
        
        console.log(`🛣️  loadAllRoutes - Complete, loaded ${allRoutes.length} total routes`);
        
        dispatch({ type: ActionTypes.SET_ROUTES, payload: allRoutes });
        dispatch({ 
          type: ActionTypes.SET_PAGINATION, 
          payload: { 
            resource: 'routes', 
            data: { offset: 0, limit: allRoutes.length, total: allRoutes.length, hasMore: false } 
          } 
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'routes' } });
      } catch (error) {
        console.error('🛣️  loadAllRoutes - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'routes', error } });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'routes', value: false } });
      }
    },

    async loadProviders(offset = 0, limit = 100) {
      console.log('🔗 loadProviders - Starting with params:', { offset, limit });
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'providers', value: true } });
      try {
        const data = await api.getProviders({ offset, limit });
        console.log('🔗 loadProviders - API response:', data);
        
        // Backend now consistently returns { items: [...], total: X } format
        const providers = data.items || [];
        const total = data.total || 0;
        
        dispatch({ type: ActionTypes.SET_PROVIDERS, payload: providers });
        dispatch({ 
          type: ActionTypes.SET_PAGINATION, 
          payload: { 
            resource: 'providers', 
            data: { offset, limit, total, hasMore: offset + limit < total } 
          } 
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'providers' } });
        console.log('🔗 loadProviders - Success, dispatched data with pagination:', { providers: providers.length, total, offset, limit });
      } catch (error) {
        console.error('🔗 loadProviders - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'providers', error } });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'providers', value: false } });
      }
    },

    async loadPlugins(offset = 0, limit = 100, filters = {}) {
      console.log('🔌 loadPlugins - Starting with params:', { offset, limit, filters });
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'plugins', value: true } });
      try {
        const params = { offset, limit };
        // Add filters according to backend documentation
        if (filters.service_id) params.service_id = filters.service_id;
        if (filters.route_id) params.route_id = filters.route_id;
        if (filters.workspace_id) params.workspace_id = filters.workspace_id;
        if (filters.enabled !== undefined) params.enabled = filters.enabled;
        
        const data = await api.getPlugins(params);
        console.log('🔌 loadPlugins - API response:', data);
        
        // Backend now consistently returns { items: [...], total: X } format
        const plugins = data.items || [];
        const total = data.total || 0;
        
        dispatch({ type: ActionTypes.SET_PLUGINS, payload: plugins });
        dispatch({ 
          type: ActionTypes.SET_PAGINATION, 
          payload: { 
            resource: 'plugins', 
            data: { offset, limit, total, hasMore: offset + limit < total } 
          } 
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'plugins' } });
        console.log('🔌 loadPlugins - Success, dispatched data with pagination:', { plugins: plugins.length, total, offset, limit });
      } catch (error) {
        console.error('🔌 loadPlugins - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'plugins', error } });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'plugins', value: false } });
      }
    },

    async loadConsumers(offset = 0, limit = 100) {
      console.log('👥 loadConsumers - Starting with params:', { offset, limit });
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'consumers', value: true } });
      try {
        const data = await api.getConsumers({ offset, limit });
        console.log('👥 loadConsumers - API response:', data);
        
        // Backend now consistently returns { items: [...], total: X } format
        const consumers = data.items || [];
        const total = data.total || 0;
        
        dispatch({ type: ActionTypes.SET_CONSUMERS, payload: consumers });
        dispatch({ 
          type: ActionTypes.SET_PAGINATION, 
          payload: { 
            resource: 'consumers', 
            data: { offset, limit, total, hasMore: offset + limit < total } 
          } 
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'consumers' } });
        console.log('👥 loadConsumers - Success, dispatched data with pagination:', { consumers: consumers.length, total, offset, limit });
      } catch (error) {
        console.error('👥 loadConsumers - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'consumers', error } });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'consumers', value: false } });
      }
    },

    async loadAvailablePlugins() {
      console.log('🔌 loadAvailablePlugins - Starting...');
      try {
        const data = await api.getAvailablePlugins();
        console.log('🔌 loadAvailablePlugins - API response:', data);
        
        const availablePlugins = Array.isArray(data) ? data : (data.plugins || []);
        
        dispatch({ 
          type: ActionTypes.SET_PLUGIN_SCHEMAS, 
          payload: { available: availablePlugins } 
        });
      } catch (error) {
        console.error('🔌 loadAvailablePlugins - Error:', error);
      }
    },

    async loadPluginSchema(pluginName) {
      console.log('🔌 loadPluginSchema - Starting for plugin:', pluginName);
      try {
        const response = await api.getPluginSchema(pluginName);
        console.log('🔌 loadPluginSchema - API response for', pluginName, ':', response);
        
        // Backend returns { name, schema, description, version }
        // We need the schema property
        const schema = response.schema || response;
        
        dispatch({ 
          type: ActionTypes.SET_PLUGIN_SCHEMAS, 
          payload: { [pluginName]: schema } 
        });
        return schema;
      } catch (error) {
        console.error(`🔌 loadPluginSchema - Error loading schema for plugin ${pluginName}:`, error);
        
        // Fallback to basic schema for common plugins if API fails
        const fallbackSchema = getFallbackPluginSchema(pluginName);
        if (fallbackSchema) {
          console.log('🔌 loadPluginSchema - Using fallback schema for:', pluginName);
          dispatch({ 
            type: ActionTypes.SET_PLUGIN_SCHEMAS, 
            payload: { [pluginName]: fallbackSchema } 
          });
          return fallbackSchema;
        }
        
        throw error;
      }
    },

    async loadDataplanes() {
      console.log('🛰️  loadDataplanes - Starting...');
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'dataplanes', value: true } });
      try {
        const data = await api.getDataplanes();
        console.log('🛰️  loadDataplanes - API response:', data);
        dispatch({ type: ActionTypes.SET_DATAPLANES, payload: data });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'dataplanes' } });
      } catch (error) {
        console.error('🛰️  loadDataplanes - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'dataplanes', error } });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'dataplanes', value: false } });
      }
    },

    async getDataplaneHeartbeat(dataplaneId) {
      console.log('❤️  getDataplaneHeartbeat - Starting for dataplane:', dataplaneId);
      try {
        const heartbeat = await api.getDataplaneHeartbeat(dataplaneId);
        console.log('❤️  getDataplaneHeartbeat - Received:', { 
          dataplaneId, 
          abacStatus: heartbeat.abac_engine_status 
        });
        return heartbeat;
      } catch (error) {
        console.error('❤️  getDataplaneHeartbeat - Error:', error);
        throw error;
      }
    },

    async loadCertificates() {
      console.log('🔒 loadCertificates - Starting...');
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'certificates', value: true } });
      try {
        // Try certificates endpoint - may not be implemented in all deployments
        const data = await api.request('/api/v1/certificates');
        console.log('🔒 loadCertificates - API response:', data);
        dispatch({ type: ActionTypes.SET_CERTIFICATES, payload: data });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'certificates' } });
      } catch (error) {
        console.error('🔒 loadCertificates - Error:', error);
        // If certificates endpoint is not implemented, set empty array instead of error
        if (error.message?.includes('404')) {
          console.log('🔒 loadCertificates - Certificates endpoint not implemented, setting empty array');
          dispatch({ type: ActionTypes.SET_CERTIFICATES, payload: [] });
          dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'certificates' } });
        } else {
          dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'certificates', error } });
        }
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'certificates', value: false } });
      }
    },

    // CRUD operations - All updated to use new API client
    async createWorkspace(workspaceData) {
      console.log('🏗️  createWorkspace - Starting with data:', workspaceData);
      const data = await api.createWorkspace(workspaceData);
      console.log('🏗️  createWorkspace - Created workspace:', data);
      await this.loadWorkspaces(); // Refresh the list
      return data;
    },

    async updateWorkspace(id, workspaceData) {
      console.log('🏗️  updateWorkspace - Starting with id:', id, 'data:', workspaceData);
      const data = await api.updateWorkspace(id, workspaceData);
      console.log('🏗️  updateWorkspace - Updated workspace:', data);
      await this.loadWorkspaces(); // Refresh the list
      return data;
    },

    async deleteWorkspace(id) {
      console.log('🏗️  deleteWorkspace - Starting with id:', id);
      await api.deleteWorkspace(id);
      console.log('🏗️  deleteWorkspace - Deleted workspace:', id);
      await this.loadWorkspaces(); // Refresh the list
    },

    async createService(serviceData) {
      console.log('🎯 createService - Starting with data:', serviceData);
      const data = await api.createService(serviceData);
      console.log('🎯 createService - Created service:', data);
      await this.loadServices(); // Refresh the list
      return data;
    },

    async updateService(id, serviceData) {
      console.log('🎯 updateService - Starting with id:', id, 'data:', serviceData);
      const data = await api.updateService(id, serviceData);
      console.log('🎯 updateService - Updated service:', data);
      await this.loadServices(); // Refresh the list
      return data;
    },

    async deleteService(id) {
      console.log('🎯 deleteService - Starting with id:', id);
      await api.deleteService(id);
      console.log('🎯 deleteService - Deleted service:', id);
      await this.loadServices(); // Refresh the list
    },

    async createRoute(routeData) {
      console.log('🛣️  createRoute - Starting with data:', routeData);
      const data = await api.createRoute(routeData);
      console.log('🛣️  createRoute - Created route:', data);
      await this.loadRoutes(); // Refresh the list
      return data;
    },

    async updateRoute(id, routeData) {
      console.log('🛣️  updateRoute - Starting with id:', id, 'data:', routeData);
      const data = await api.updateRoute(id, routeData);
      console.log('🛣️  updateRoute - Updated route:', data);
      await this.loadRoutes(); // Refresh the list
      return data;
    },

    async deleteRoute(id) {
      console.log('🛣️  deleteRoute - Starting with id:', id);
      await api.deleteRoute(id);
      console.log('🛣️  deleteRoute - Deleted route:', id);
      await this.loadRoutes(); // Refresh the list
    },

    async createPlugin(pluginData) {
      console.log('🔌 createPlugin - Starting with data:', pluginData);
      const data = await api.createPlugin(pluginData);
      console.log('🔌 createPlugin - Created plugin:', data);
      await this.loadPlugins(); // Refresh the list
      return data;
    },

    async updatePlugin(id, pluginData) {
      console.log('🔌 updatePlugin - Starting with id:', id, 'data:', pluginData);
      const data = await api.updatePlugin(id, pluginData);
      console.log('🔌 updatePlugin - Updated plugin:', data);
      await this.loadPlugins(); // Refresh the list
      return data;
    },

    async deletePlugin(id) {
      console.log('🔌 deletePlugin - Starting with id:', id);
      await api.deletePlugin(id);
      console.log('🔌 deletePlugin - Deleted plugin:', id);
      await this.loadPlugins(); // Refresh the list
    },

    async createConsumer(consumerData) {
      console.log('👥 createConsumer - Starting with data:', consumerData);
      const response = await api.createConsumer(consumerData);
      console.log('👥 createConsumer - Created consumer:', response);
      return response;
    },

    async updateConsumer(id, consumerData) {
      console.log('👥 updateConsumer - Starting with id:', id, 'data:', consumerData);
      const response = await api.updateConsumer(id, consumerData);
      console.log('👥 updateConsumer - Updated consumer:', response);
      return response;
    },

    async deleteConsumer(id) {
      console.log('👥 deleteConsumer - Starting with id:', id);
      await api.deleteConsumer(id);
      console.log('👥 deleteConsumer - Deleted consumer:', id);
    },

    // Consumer API Key Management - based on admin-ui/js/consumers.js
    async getConsumerKeys(consumerId) {
      console.log('🔑 getConsumerKeys - Starting for consumer:', consumerId);
      try {
        const response = await api.request(`/consumers/${consumerId}/keys`);
        console.log('🔑 getConsumerKeys - API response:', response);
        return response;
      } catch (error) {
        console.error('🔑 getConsumerKeys - Error:', error);
        throw error;
      }
    },

    async getConsumerKeyValue(consumerId, keyName) {
      console.log('🔑 getConsumerKeyValue - Starting for consumer:', consumerId, 'key:', keyName);
      try {
        const response = await api.request(`/consumers/${consumerId}/keys/${keyName}`);
        console.log('🔑 getConsumerKeyValue - API response:', response);
        return response;
      } catch (error) {
        console.error('🔑 getConsumerKeyValue - Error:', error);
        throw error;
      }
    },

    async createConsumerKey(consumerId) {
      console.log('🔑 createConsumerKey - Starting for consumer:', consumerId);
      try {
        const response = await api.request(`/consumers/${consumerId}/keys`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('🔑 createConsumerKey - API response:', response);
        return response;
      } catch (error) {
        console.error('🔑 createConsumerKey - Error:', error);
        throw error;
      }
    },

    async deleteConsumerKey(consumerId, keyName) {
      console.log('🔑 deleteConsumerKey - Starting for consumer:', consumerId, 'key:', keyName);
      try {
        const response = await api.request(`/consumers/${consumerId}/keys/${keyName}`, {
          method: 'DELETE'
        });
        console.log('🔑 deleteConsumerKey - API response:', response);
        return response;
      } catch (error) {
        console.error('🔑 deleteConsumerKey - Error:', error);
        throw error;
      }
    },

    // ===========================================
    // POLICY MANAGEMENT METHODS
    // ===========================================
    
    // Service Policy Methods
    async loadServicePolicy(serviceId) {
      console.log('🔐 loadServicePolicy - Starting for service:', serviceId);
      try {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'servicePolicies', value: true } });
        const policy = await api.getServicePolicy(serviceId);
        console.log('🔐 loadServicePolicy - Loaded policy:', policy);
        
        dispatch({ 
          type: ActionTypes.SET_SERVICE_POLICY, 
          payload: { serviceId, policy } 
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'servicePolicies' } });
        return policy;
      } catch (error) {
        console.error('🔐 loadServicePolicy - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'servicePolicies', error } });
        throw error;
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'servicePolicies', value: false } });
      }
    },
    
    async createServicePolicy(serviceId, policyData) {
      console.log('🔐 createServicePolicy - Starting for service:', serviceId, 'data:', policyData);
      try {
        const policy = await api.createServicePolicy(serviceId, policyData);
        console.log('🔐 createServicePolicy - Created policy:', policy);
        
        dispatch({ 
          type: ActionTypes.SET_SERVICE_POLICY, 
          payload: { serviceId, policy } 
        });
        return policy;
      } catch (error) {
        console.error('🔐 createServicePolicy - Error:', error);
        throw error;
      }
    },
    
    async updateServicePolicy(serviceId, policyId, policyData) {
      console.log('🔐 updateServicePolicy - Starting for service:', serviceId, 'policy:', policyId, 'data:', policyData);
      try {
        const policy = await api.updateServicePolicy(serviceId, policyId, policyData);
        console.log('🔐 updateServicePolicy - Updated policy:', policy);
        
        dispatch({ 
          type: ActionTypes.SET_SERVICE_POLICY, 
          payload: { serviceId, policy } 
        });
        return policy;
      } catch (error) {
        console.error('🔐 updateServicePolicy - Error:', error);
        throw error;
      }
    },
    
    async deleteServicePolicy(serviceId, policyId) {
      console.log('🔐 deleteServicePolicy - Starting for service:', serviceId, 'policy:', policyId);
      try {
        await api.deleteServicePolicy(serviceId, policyId);
        console.log('🔐 deleteServicePolicy - Deleted policy successfully');
        
        dispatch({ 
          type: ActionTypes.SET_SERVICE_POLICY, 
          payload: { serviceId, policy: null } 
        });
      } catch (error) {
        console.error('🔐 deleteServicePolicy - Error:', error);
        throw error;
      }
    },
    
    // Consumer Policy Methods
    async loadConsumerPolicies(consumerId, offset = 0, limit = 100) {
      console.log('🔐 loadConsumerPolicies - Starting for consumer:', consumerId, 'params:', { offset, limit });
      try {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'consumerPolicies', value: true } });
        const policies = await api.getConsumerPolicies(consumerId, offset, limit);
        console.log('🔐 loadConsumerPolicies - Loaded policies:', policies);
        
        dispatch({ 
          type: ActionTypes.SET_CONSUMER_POLICIES, 
          payload: { consumerId, policies } 
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'consumerPolicies' } });
        return policies;
      } catch (error) {
        console.error('🔐 loadConsumerPolicies - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'consumerPolicies', error } });
        throw error;
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'consumerPolicies', value: false } });
      }
    },
    
    async createConsumerPolicy(consumerId, policyData) {
      console.log('🔐 createConsumerPolicy - Starting for consumer:', consumerId, 'data:', policyData);
      try {
        const policy = await api.createConsumerPolicy(consumerId, policyData);
        console.log('🔐 createConsumerPolicy - Created policy:', policy);
        
        // Reload all policies for this consumer
        await this.loadConsumerPolicies(consumerId);
        return policy;
      } catch (error) {
        console.error('🔐 createConsumerPolicy - Error:', error);
        throw error;
      }
    },
    
    async updateConsumerPolicy(consumerId, policyId, policyData) {
      console.log('🔐 updateConsumerPolicy - Starting for consumer:', consumerId, 'policy:', policyId, 'data:', policyData);
      try {
        const policy = await api.updateConsumerPolicy(consumerId, policyId, policyData);
        console.log('🔐 updateConsumerPolicy - Updated policy:', policy);
        
        // Reload all policies for this consumer
        await this.loadConsumerPolicies(consumerId);
        return policy;
      } catch (error) {
        console.error('🔐 updateConsumerPolicy - Error:', error);
        throw error;
      }
    },
    
    async deleteConsumerPolicy(consumerId, policyId) {
      console.log('🔐 deleteConsumerPolicy - Starting for consumer:', consumerId, 'policy:', policyId);
      try {
        await api.deleteConsumerPolicy(consumerId, policyId);
        console.log('🔐 deleteConsumerPolicy - Deleted policy successfully');
        
        // Reload all policies for this consumer
        await this.loadConsumerPolicies(consumerId);
      } catch (error) {
        console.error('🔐 deleteConsumerPolicy - Error:', error);
        throw error;
      }
    },

    // ===========================================
    // ABAC POLICIES MANAGEMENT
    // ===========================================

    async loadAbacPolicies(offset = 0, limit = 100, filters = {}) {
      console.log('🛡️  loadAbacPolicies - Starting with params:', { offset, limit, filters });
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'abacPolicies', value: true } });
      try {
        const params = { offset, limit };
        if (filters.service_id) params.service_id = filters.service_id;
        if (filters.enabled !== undefined) params.enabled = filters.enabled;
        
        const data = await api.getAbacPolicies(params);
        console.log('🛡️  loadAbacPolicies - API response:', data);
        
        const items = data.items || [];
        const total = data.total || 0;
        
        // Debug: log the fields in the first policy to verify id field exists
        if (items.length > 0) {
          console.log('🛡️  loadAbacPolicies - First policy fields:', { 
            keys: Object.keys(items[0]), 
            hasId: !!items[0].id,
            hasPolicy_id: !!items[0].policy_id,
            firstItem: items[0]
          });
        }
        
        dispatch({ type: ActionTypes.SET_ABAC_POLICIES, payload: { items, total } });
        dispatch({
          type: ActionTypes.SET_PAGINATION,
          payload: {
            resource: 'abacPolicies',
            data: { offset, limit, total, hasMore: offset + limit < total }
          }
        });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'abacPolicies' } });
        console.log('🛡️  loadAbacPolicies - Success:', { count: items.length, total });
        return data;  // Return the API response so callers can use it directly
      } catch (error) {
        console.error('🛡️  loadAbacPolicies - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'abacPolicies', error } });
        throw error;  // Re-throw so callers can handle it
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'abacPolicies', value: false } });
      }
    },

    async getAbacPolicy(policyId) {
      console.log('🛡️  getAbacPolicy - Starting for policy:', policyId);
      try {
        const policy = await api.getAbacPolicy(policyId);
        console.log('🛡️  getAbacPolicy - Retrieved policy:', policy);
        return policy;
      } catch (error) {
        console.error('🛡️  getAbacPolicy - Error:', error);
        throw error;
      }
    },

    async createAbacPolicy(policyData) {
      console.log('🛡️  createAbacPolicy - Starting with data:', policyData);
      try {
        const policy = await api.createAbacPolicy(policyData);
        console.log('🛡️  createAbacPolicy - Created policy:', policy);
        
        // Reload policies list
        await this.loadAbacPolicies();
        return policy;
      } catch (error) {
        console.error('🛡️  createAbacPolicy - Error:', error);
        throw error;
      }
    },

    async updateAbacPolicy(policyId, policyData) {
      console.log('🛡️  updateAbacPolicy - Starting for policy:', policyId, 'data:', policyData);
      try {
        const policy = await api.updateAbacPolicy(policyId, policyData);
        console.log('🛡️  updateAbacPolicy - Updated policy:', policy);
        
        // Reload policies list
        await this.loadAbacPolicies();
        return policy;
      } catch (error) {
        console.error('🛡️  updateAbacPolicy - Error:', error);
        throw error;
      }
    },

    async deleteAbacPolicy(policyId) {
      console.log('🛡️  deleteAbacPolicy - Starting for policy:', policyId);
      try {
        await api.deleteAbacPolicy(policyId);
        console.log('🛡️  deleteAbacPolicy - Deleted policy successfully');
        
        // Reload policies list
        await this.loadAbacPolicies();
      } catch (error) {
        console.error('🛡️  deleteAbacPolicy - Error:', error);
        throw error;
      }
    },

    async validateAbacDsl(dsl) {
      console.log('🛡️  validateAbacDsl - Starting validation');
      try {
        const result = await api.validateAbacDsl(dsl);
        console.log('🛡️  validateAbacDsl - Validation result:', result);
        return result;
      } catch (error) {
        console.error('🛡️  validateAbacDsl - Error:', error);
        throw error;
      }
    },

    async deployAbacPolicies(serviceIds = null) {
      console.log('🛡️  deployAbacPolicies - Starting deployment for services:', serviceIds);
      try {
        const params = {};
        if (serviceIds && serviceIds.length > 0) {
          params.service_ids = serviceIds;
        }
        
        const result = await api.deployAbacPolicies(params);
        console.log('🛡️  deployAbacPolicies - Deploy result:', result);
        
        // Load engine status after deployment
        await this.loadAbacEngineStatus();
        return result;
      } catch (error) {
        console.error('🛡️  deployAbacPolicies - Error:', error);
        throw error;
      }
    },

    async loadAbacEngineStatus() {
      console.log('🛡️  loadAbacEngineStatus - Starting');
      dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'abacEngineStatus', value: true } });
      try {
        const status = await api.getAbacEngineStatus();
        console.log('🛡️  loadAbacEngineStatus - Status retrieved:', status);
        
        dispatch({ type: ActionTypes.SET_ABAC_ENGINE_STATUS, payload: status });
        dispatch({ type: ActionTypes.CLEAR_ERROR, payload: { key: 'abacEngineStatus' } });
      } catch (error) {
        console.error('🛡️  loadAbacEngineStatus - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'abacEngineStatus', error } });
      } finally {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'abacEngineStatus', value: false } });
      }
    },

    // Debug functionality
    async enableDebug(serviceId) {
      console.log('🐛 enableDebug - Starting for service:', serviceId);
      try {
        const response = await api.enableServiceDebug(serviceId);
        console.log('🐛 enableDebug - Response:', response);
        return response;
      } catch (error) {
        console.error('🐛 enableDebug - Error:', error);
        throw error;
      }
    },

    async loadDebugEntries(offset = 0, limit = 100) {
      console.log('🐛 loadDebugEntries - Starting with params:', { offset, limit });
      try {
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'debug', value: true } });
        
        const data = await api.getDebugEntries({ offset, limit });
        console.log('🐛 loadDebugEntries - Response:', data);
        
        const entries = data.entries || data.data || data;
        dispatch({ type: ActionTypes.SET_DEBUG_ENTRIES, payload: entries });
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'debug', value: false } });
        
        return data;
      } catch (error) {
        console.error('🐛 loadDebugEntries - Error:', error);
        dispatch({ type: ActionTypes.SET_ERROR, payload: { key: 'debug', error } });
        dispatch({ type: ActionTypes.SET_LOADING, payload: { key: 'debug', value: false } });
        throw error;
      }
    },

    // Authentication endpoints
    async login(username, password) {
      console.log('🔐 login - Starting authentication...');
      try {
        const response = await api.login(username, password);
        console.log('🔐 login - Authentication successful:', response);
        
        if (response.access_token) {
          dispatch({ type: ActionTypes.SET_AUTH_TOKEN, payload: response.access_token });
          // Optionally set user info if available
          if (response.user) {
            dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: response.user });
          }
        }
        
        return response;
      } catch (error) {
        console.error('🔐 login - Authentication failed:', error);
        throw error;
      }
    },

    // Health check endpoint
    async healthCheck() {
      console.log('🏥 healthCheck - Checking API health...');
      try {
        const response = await api.getHealth();
        console.log('🏥 healthCheck - API health status:', response);
        return response;
      } catch (error) {
        console.error('🏥 healthCheck - Health check failed:', error);
        throw error;
      }
    },

    // Version check endpoint
    async getVersion() {
      console.log('📋 getVersion - Getting API version...');
      try {
        const response = await api.getVersion();
        console.log('📋 getVersion - API version:', response);
        return response;
      } catch (error) {
        console.error('📋 getVersion - Version check failed:', error);
        throw error;
      }
    }
  };

  const value = {
    state,
    dispatch,
    api: apiHelpers, // Use the new API helpers
    // Create validated API client that wraps the raw API
    validatedApi: (() => {
      const validated = new PyGatewayAPI({
        rawApi: api,
        validateSchemas: true,
        strictValidation: false, // Warnings only
        debug: process.env.NODE_ENV === 'development'
      });
      return validated;
    })(),
    // Also expose the raw API client for advanced usage
    rawApi: api,
    // Action creators for convenience
    actions: {
      setCurrentWorkspace: (workspace) => 
        dispatch({ type: ActionTypes.SET_CURRENT_WORKSPACE, payload: workspace }),
      setCurrentService: (service) => 
        dispatch({ type: ActionTypes.SET_CURRENT_SERVICE, payload: service }),
      setServiceWorkspaceFilter: (workspaceId) => {
        dispatch({ type: ActionTypes.SET_SERVICE_WORKSPACE_FILTER, payload: workspaceId });
        // Also reset pagination and reload services with the new filter
        dispatch({ type: ActionTypes.RESET_PAGINATION, payload: 'services' });
        // Reload services with the new filter
        const serviceFilters = workspaceId ? { workspace_id: workspaceId } : {};
        return apiHelpers.loadServices(0, 100, serviceFilters);
      },
      setRouteServiceFilter: (serviceId) => 
        dispatch({ type: ActionTypes.SET_ROUTE_SERVICE_FILTER, payload: serviceId }),
      setAuthToken: (token) => {
        // Update both local state and API client
        api.setToken(token);
        dispatch({ type: ActionTypes.SET_AUTH_TOKEN, payload: token });
      },
      setCurrentUser: (user) => 
        dispatch({ type: ActionTypes.SET_CURRENT_USER, payload: user }),
      logout: () => {
        // Clear token from API client and local state
        api.logout();
        dispatch({ type: ActionTypes.LOGOUT });
      },
      setAutoRefresh: (enabled, interval) => 
        dispatch({ type: ActionTypes.SET_AUTO_REFRESH, payload: { enabled, interval } }),
      resetCircuitBreaker: () => {
        // Reset both API client and local state circuit breaker
        api.resetCircuitBreaker();
        dispatch({ type: ActionTypes.CIRCUIT_BREAKER_RESET });
      },

      // Pagination helper functions according to backend documentation
      goToPage: (resource, page) => {
        const currentPagination = state.pagination[resource];
        if (currentPagination) {
          const offset = page * currentPagination.limit;
          switch (resource) {
            case 'workspaces':
              return apiHelpers.loadWorkspaces(offset, currentPagination.limit);
            case 'services':
              // For services, preserve any active workspace filter
              const serviceFilters = {};
              if (state.serviceWorkspaceFilter) {
                serviceFilters.workspace_id = state.serviceWorkspaceFilter;
              }
              return apiHelpers.loadServices(offset, currentPagination.limit, serviceFilters);
            case 'routes':
              return apiHelpers.loadRoutes(offset, currentPagination.limit);
            case 'plugins':
              return apiHelpers.loadPlugins(offset, currentPagination.limit);
            case 'consumers':
              return apiHelpers.loadConsumers(offset, currentPagination.limit);
            case 'providers':
              return apiHelpers.loadProviders(offset, currentPagination.limit);
            default:
              console.warn(`Unknown resource for pagination: ${resource}`);
          }
        }
      },

      changePageSize: (resource, newLimit) => {
        const currentPagination = state.pagination[resource];
        if (currentPagination) {
          const currentPage = Math.floor(currentPagination.offset / currentPagination.limit);
          const newOffset = currentPage * newLimit;
          switch (resource) {
            case 'workspaces':
              return apiHelpers.loadWorkspaces(newOffset, newLimit);
            case 'services':
              // For services, preserve any active workspace filter
              const serviceFilters = {};
              if (state.serviceWorkspaceFilter) {
                serviceFilters.workspace_id = state.serviceWorkspaceFilter;
              }
              return apiHelpers.loadServices(newOffset, newLimit, serviceFilters);
            case 'routes':
              return apiHelpers.loadRoutes(newOffset, newLimit);
            case 'plugins':
              return apiHelpers.loadPlugins(newOffset, newLimit);
            case 'consumers':
              return apiHelpers.loadConsumers(newOffset, newLimit);
            case 'providers':
              return apiHelpers.loadProviders(newOffset, newLimit);
            default:
              console.warn(`Unknown resource for pagination: ${resource}`);
          }
        }
      },

      nextPage: (resource) => {
        const currentPagination = state.pagination[resource];
        if (currentPagination && currentPagination.hasMore) {
          const nextOffset = currentPagination.offset + currentPagination.limit;
          switch (resource) {
            case 'workspaces':
              return apiHelpers.loadWorkspaces(nextOffset, currentPagination.limit);
            case 'services':
              // For services, preserve any active workspace filter
              const serviceFilters = {};
              if (state.serviceWorkspaceFilter) {
                serviceFilters.workspace_id = state.serviceWorkspaceFilter;
              }
              return apiHelpers.loadServices(nextOffset, currentPagination.limit, serviceFilters);
            case 'routes':
              return apiHelpers.loadRoutes(nextOffset, currentPagination.limit);
            case 'plugins':
              return apiHelpers.loadPlugins(nextOffset, currentPagination.limit);
            case 'consumers':
              return apiHelpers.loadConsumers(nextOffset, currentPagination.limit);
            case 'providers':
              return apiHelpers.loadProviders(nextOffset, currentPagination.limit);
            default:
              console.warn(`Unknown resource for pagination: ${resource}`);
          }
        }
      },

      previousPage: (resource) => {
        const currentPagination = state.pagination[resource];
        if (currentPagination && currentPagination.offset > 0) {
          const prevOffset = Math.max(0, currentPagination.offset - currentPagination.limit);
          switch (resource) {
            case 'workspaces':
              return apiHelpers.loadWorkspaces(prevOffset, currentPagination.limit);
            case 'services':
              // For services, preserve any active workspace filter
              const serviceFilters = {};
              if (state.serviceWorkspaceFilter) {
                serviceFilters.workspace_id = state.serviceWorkspaceFilter;
              }
              return apiHelpers.loadServices(prevOffset, currentPagination.limit, serviceFilters);
            case 'routes':
              return apiHelpers.loadRoutes(prevOffset, currentPagination.limit);
            case 'plugins':
              return apiHelpers.loadPlugins(prevOffset, currentPagination.limit);
            case 'consumers':
              return apiHelpers.loadConsumers(prevOffset, currentPagination.limit);
            case 'providers':
              return apiHelpers.loadProviders(prevOffset, currentPagination.limit);
            default:
              console.warn(`Unknown resource for pagination: ${resource}`);
          }
        }
      }
    }
  };

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

// Hook to use the app state
export function useAppState() {
  const context = useContext(AppStateContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}

export default AppStateContext;
