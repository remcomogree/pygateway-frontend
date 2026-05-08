/**
 * API Configuration and Utilities
 * 
 * This module provides centralized API configuration and utility functions
 * for making authenticated requests to the PyGateway backend.
 */

// API Configuration - adjust this based on your deployment
export const API_BASE_URL = '/api/v1'; // Use proxy for API endpoints

/**
 * Authenticated fetch wrapper
 * Adds authentication headers and handles common error cases
 */
export const authenticatedFetch = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };

  // Add authentication token if available
  const authToken = localStorage.getItem('authToken');
  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    // Handle authentication errors
    if (response.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
      throw new Error('Authentication required');
    }

    return response;
  } catch (error) {
    console.error('API request failed:', error);
    throw error;
  }
};

/**
 * Global app state management
 * Replicates the window.AppState from the original admin-ui
 */
export const AppState = {
  workspaces: [],
  services: [],
  routes: [],
  plugins: [],
  certificates: [],
  providers: [],
  consumers: [],
  dataplanes: [],
  config: {},
  user: null
};

// Make AppState globally available (for compatibility)
if (typeof window !== 'undefined') {
  window.AppState = AppState;
}
