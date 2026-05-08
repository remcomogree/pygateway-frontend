/**
 * PyGateway API Test Suite
 * 
 * Comprehensive test suite for validating API integration
 * Tests all endpoints according to backend documentation
 * 
 * @author Senior Frontend Developer
 * @version 2.0.0
 */

import api from './PyGatewayAPI.js';

/**
 * Test runner with detailed reporting
 */
class APITestSuite {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      skipped: 0,
      details: []
    };
  }
  
  /**
   * Log test results
   */
  log(message, data = null, level = 'info') {
    const timestamp = new Date().toISOString();
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️', 
      error: '❌',
      test: '🧪'
    }[level] || 'ℹ️';
    
    console.log(`${emoji} [${timestamp}] ${message}`, data || '');
  }
  
  /**
   * Run a single test
   */
  async runTest(name, testFn, options = {}) {
    const startTime = Date.now();
    
    try {
      this.log(`🧪 Testing: ${name}`, null, 'test');
      
      if (options.skip) {
        this.results.skipped++;
        this.results.details.push({
          name,
          status: 'skipped',
          reason: options.skipReason || 'Test skipped',
          duration: 0
        });
        this.log(`⏭️  Skipped: ${name}`, options.skipReason, 'warning');
        return;
      }
      
      const result = await testFn();
      const duration = Date.now() - startTime;
      
      this.results.passed++;
      this.results.details.push({
        name,
        status: 'passed',
        result,
        duration
      });
      
      this.log(`✅ Passed: ${name} (${duration}ms)`, result, 'success');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      
      this.results.failed++;
      this.results.details.push({
        name,
        status: 'failed',
        error: error.message,
        details: error,
        duration
      });
      
      this.log(`❌ Failed: ${name} (${duration}ms)`, error.message, 'error');
    }
  }
  
  /**
   * Generate test report
   */
  generateReport() {
    const total = this.results.passed + this.results.failed + this.results.skipped;
    const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
    
    const report = {
      summary: {
        total,
        passed: this.results.passed,
        failed: this.results.failed,
        skipped: this.results.skipped,
        successRate: `${successRate}%`
      },
      details: this.results.details,
      timestamp: new Date().toISOString()
    };
    
    console.log('\n📊 API Test Report:');
    console.table(report.summary);
    
    if (this.results.failed > 0) {
      console.log('\n❌ Failed Tests:');
      this.results.details
        .filter(test => test.status === 'failed')
        .forEach(test => {
          console.log(`  • ${test.name}: ${test.error}`);
        });
    }
    
    return report;
  }
  
  // ===========================================
  // CONNECTION TESTS
  // ===========================================
  
  async testAPIConnectivity() {
    await this.runTest('API Connectivity', async () => {
      const result = await api.testConnection();
      if (!result.success) {
        throw new Error(`Connection failed: ${result.error}`);
      }
      return result.data;
    });
  }
  
  async testHealthCheck() {
    await this.runTest('Health Check Endpoint', async () => {
      const health = await api.getHealth();
      if (!health) {
        throw new Error('Health check returned empty response');
      }
      return health;
    });
  }
  
  async testVersionCheck() {
    await this.runTest('Version Check Endpoint', async () => {
      const version = await api.getVersion();
      if (!version) {
        throw new Error('Version check returned empty response');
      }
      return version;
    });
  }
  
  // ===========================================
  // AUTHENTICATION TESTS
  // ===========================================
  
  async testSuperadminLogin() {
    await this.runTest('Superadmin Authentication', async () => {
      const response = await api.login('admin', 'admin123');
      
      if (!response.access_token) {
        throw new Error('No access token received');
      }
      
      if (response.token_type !== 'bearer') {
        throw new Error(`Unexpected token type: ${response.token_type}`);
      }
      
      return {
        hasToken: !!response.access_token,
        tokenType: response.token_type,
        expiresIn: response.expires_in
      };
    });
  }
  
  // ===========================================
  // CORE RESOURCE TESTS
  // ===========================================
  
  async testWorkspacesEndpoint() {
    await this.runTest('Workspaces List Endpoint', async () => {
      const workspaces = await api.getWorkspaces();
      
      if (!Array.isArray(workspaces)) {
        throw new Error('Workspaces response is not an array');
      }
      
      return {
        count: workspaces.length,
        sample: workspaces.slice(0, 2)
      };
    });
  }
  
  async testServicesEndpoint() {
    await this.runTest('Services List Endpoint', async () => {
      const response = await api.getServices({ offset: 0, limit: 10 });
      
      // Handle both paginated and direct array responses
      const services = Array.isArray(response) ? response : response.items;
      const total = response.total || services.length;
      
      if (!Array.isArray(services)) {
        throw new Error('Services response does not contain array');
      }
      
      return {
        count: services.length,
        total: total,
        isPaginated: !Array.isArray(response),
        sample: services.slice(0, 2)
      };
    });
  }
  
  async testRoutesEndpoint() {
    await this.runTest('Routes List Endpoint', async () => {
      const response = await api.getRoutes({ offset: 0, limit: 10 });
      
      const routes = Array.isArray(response) ? response : response.items;
      const total = response.total || routes.length;
      
      if (!Array.isArray(routes)) {
        throw new Error('Routes response does not contain array');
      }
      
      return {
        count: routes.length,
        total: total,
        isPaginated: !Array.isArray(response),
        sample: routes.slice(0, 2)
      };
    });
  }
  
  async testConsumersEndpoint() {
    await this.runTest('Consumers List Endpoint', async () => {
      const response = await api.getConsumers({ offset: 0, limit: 10 });
      
      const consumers = Array.isArray(response) ? response : response.items || response.data;
      const total = response.total || consumers.length;
      
      if (!Array.isArray(consumers)) {
        throw new Error('Consumers response does not contain array');
      }
      
      return {
        count: consumers.length,
        total: total,
        isPaginated: !Array.isArray(response),
        sample: consumers.slice(0, 2)
      };
    });
  }
  
  async testProvidersEndpoint() {
    await this.runTest('Providers List Endpoint', async () => {
      const providers = await api.getProviders();
      
      if (!Array.isArray(providers)) {
        throw new Error('Providers response is not an array');
      }
      
      return {
        count: providers.length,
        sample: providers.slice(0, 2)
      };
    });
  }
  
  // ===========================================
  // PLUGIN TESTS
  // ===========================================
  
  async testPluginsEndpoint() {
    await this.runTest('Plugins List Endpoint', async () => {
      const response = await api.getPlugins({ offset: 0, limit: 10 });
      
      const plugins = Array.isArray(response) ? response : response.items;
      const total = response.total || plugins.length;
      
      if (!Array.isArray(plugins)) {
        throw new Error('Plugins response does not contain array');
      }
      
      return {
        count: plugins.length,
        total: total,
        isPaginated: !Array.isArray(response),
        sample: plugins.slice(0, 2)
      };
    });
  }
  
  async testAvailablePlugins() {
    await this.runTest('Available Plugins Endpoint', async () => {
      const availablePlugins = await api.getAvailablePlugins();
      
      if (!Array.isArray(availablePlugins)) {
        throw new Error('Available plugins response is not an array');
      }
      
      return {
        count: availablePlugins.length,
        plugins: availablePlugins
      };
    });
  }
  
  async testPluginSchemas() {
    await this.runTest('Plugin Schema Endpoints', async () => {
      // Test common plugin schemas
      const commonPlugins = ['rate-limiting', 'cors', 'key-auth', 'basic-auth'];
      const results = {};
      
      for (const pluginName of commonPlugins) {
        try {
          const schema = await api.getPluginSchema(pluginName);
          results[pluginName] = {
            success: true,
            hasSchema: !!schema.schema,
            properties: schema.schema ? Object.keys(schema.schema.properties || {}).length : 0
          };
        } catch (error) {
          results[pluginName] = {
            success: false,
            error: error.message
          };
        }
      }
      
      return results;
    });
  }
  
  // ===========================================
  // LLM TESTS
  // ===========================================
  
  async testLLMProviders() {
    await this.runTest('LLM Providers Endpoint', async () => {
      const providers = await api.getLLMProviders();
      
      if (!Array.isArray(providers)) {
        throw new Error('LLM providers response is not an array');
      }
      
      return {
        count: providers.length,
        sample: providers.slice(0, 2)
      };
    }, { skip: false }); // Enable when LLM is available
  }
  
  async testLLMTemplates() {
    await this.runTest('LLM Templates Endpoint', async () => {
      const templates = await api.getLLMTemplates();
      
      if (!Array.isArray(templates)) {
        throw new Error('LLM templates response is not an array');
      }
      
      return {
        count: templates.length,
        sample: templates.slice(0, 2)
      };
    }, { skip: false }); // Enable when LLM is available
  }
  
  async testLLMAnalytics() {
    await this.runTest('LLM Usage Analytics', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const endDate = new Date().toISOString().split('T')[0];
      
      const analytics = await api.getLLMUsageAnalytics({
        start_date: startDate,
        end_date: endDate
      });
      
      if (!analytics) {
        throw new Error('Analytics response is empty');
      }
      
      return {
        hasData: !!analytics.totalRequests,
        period: `${startDate} to ${endDate}`,
        summary: {
          totalRequests: analytics.totalRequests || 0,
          totalTokens: analytics.totalTokens || 0,
          totalCost: analytics.totalCost || 0
        }
      };
    }, { skip: false }); // Enable when LLM is available
  }
  
  // ===========================================
  // PAGINATION TESTS
  // ===========================================
  
  async testPagination() {
    await this.runTest('Pagination Functionality', async () => {
      // Test services pagination
      const page1 = await api.getServices({ offset: 0, limit: 5 });
      const page2 = await api.getServices({ offset: 5, limit: 5 });
      
      const services1 = Array.isArray(page1) ? page1 : page1.items;
      const services2 = Array.isArray(page2) ? page2 : page2.items;
      
      return {
        page1Count: services1.length,
        page2Count: services2.length,
        totalFromPage1: page1.total || services1.length,
        hasMore: page1.has_more,
        differentResults: services1[0]?.id !== services2[0]?.id
      };
    });
  }
  
  // ===========================================
  // ERROR HANDLING TESTS
  // ===========================================
  
  async testErrorHandling() {
    await this.runTest('404 Error Handling', async () => {
      try {
        await api.getWorkspace('non-existent-id');
        throw new Error('Expected 404 error but request succeeded');
      } catch (error) {
        if (error.status === 404) {
          return { 
            handledCorrectly: true, 
            status: error.status,
            message: error.message 
          };
        }
        throw error;
      }
    });
  }
  
  async testCircuitBreaker() {
    await this.runTest('Circuit Breaker Functionality', async () => {
      const status = api.getCircuitBreakerStatus();
      
      return {
        isImplemented: typeof status.isOpen === 'boolean',
        currentStatus: status,
        canReset: typeof api.resetCircuitBreaker === 'function'
      };
    });
  }
  
  // ===========================================
  // RUN ALL TESTS
  // ===========================================
  
  async runAllTests() {
    this.log('🚀 Starting PyGateway API Test Suite', null, 'info');
    
    // Connection tests
    await this.testAPIConnectivity();
    await this.testHealthCheck();
    await this.testVersionCheck();
    
    // Authentication tests
    await this.testSuperadminLogin();
    
    // Core resource tests
    await this.testWorkspacesEndpoint();
    await this.testServicesEndpoint();
    await this.testRoutesEndpoint();
    await this.testConsumersEndpoint();
    await this.testProvidersEndpoint();
    
    // Plugin tests
    await this.testPluginsEndpoint();
    await this.testAvailablePlugins();
    await this.testPluginSchemas();
    
    // LLM tests (skip if not available)
    await this.testLLMProviders();
    await this.testLLMTemplates();
    await this.testLLMAnalytics();
    
    // Advanced functionality tests
    await this.testPagination();
    await this.testErrorHandling();
    await this.testCircuitBreaker();
    
    // Generate final report
    return this.generateReport();
  }
}

// ===========================================
// QUICK TEST FUNCTIONS
// ===========================================

/**
 * Quick connectivity test
 */
export async function quickConnectivityTest() {
  console.log('🔍 Running quick connectivity test...');
  
  try {
    const result = await api.testConnection();
    if (result.success) {
      console.log('✅ API is reachable and healthy');
      return true;
    } else {
      console.log('❌ API connectivity failed:', result.error);
      return false;
    }
  } catch (error) {
    console.log('❌ Connectivity test error:', error.message);
    return false;
  }
}

/**
 * Test all endpoints quickly
 */
export async function quickEndpointTest() {
  console.log('🔍 Testing all endpoints...');
  
  const endpoints = [
    { name: 'Workspaces', fn: () => api.getWorkspaces() },
    { name: 'Services', fn: () => api.getServices({ limit: 5 }) },
    { name: 'Routes', fn: () => api.getRoutes({ limit: 5 }) },
    { name: 'Consumers', fn: () => api.getConsumers({ limit: 5 }) },
    { name: 'Providers', fn: () => api.getProviders() },
    { name: 'Plugins', fn: () => api.getPlugins({ limit: 5 }) },
    { name: 'Available Plugins', fn: () => api.getAvailablePlugins() }
  ];
  
  const results = {};
  
  for (const endpoint of endpoints) {
    try {
      const data = await endpoint.fn();
      results[endpoint.name] = {
        success: true,
        dataType: Array.isArray(data) ? 'array' : typeof data,
        count: Array.isArray(data) ? data.length : data.items?.length || 0
      };
      console.log(`✅ ${endpoint.name}: OK`);
    } catch (error) {
      results[endpoint.name] = {
        success: false,
        error: error.message
      };
      console.log(`❌ ${endpoint.name}: ${error.message}`);
    }
  }
  
  return results;
}

/**
 * Validate API responses match documentation
 */
export async function validateResponseFormats() {
  console.log('🔍 Validating response formats...');
  
  const validations = [];
  
  // Test workspace response format
  try {
    const workspaces = await api.getWorkspaces();
    validations.push({
      endpoint: 'Workspaces',
      isArray: Array.isArray(workspaces),
      hasExpectedFields: workspaces[0] ? 
        ['id', 'name', 'enabled'].every(field => field in workspaces[0]) : 
        true
    });
  } catch (error) {
    validations.push({
      endpoint: 'Workspaces',
      error: error.message
    });
  }
  
  // Test services pagination format
  try {
    const services = await api.getServices({ offset: 0, limit: 5 });
    const isPaginated = !Array.isArray(services) && services.items;
    validations.push({
      endpoint: 'Services',
      isPaginated,
      hasItems: isPaginated ? Array.isArray(services.items) : Array.isArray(services),
      hasTotal: isPaginated ? 'total' in services : true
    });
  } catch (error) {
    validations.push({
      endpoint: 'Services',
      error: error.message
    });
  }
  
  console.table(validations);
  return validations;
}

// Export test suite
export default APITestSuite;

// Make available globally for browser console testing
if (typeof window !== 'undefined') {
  window.PyGatewayAPITests = {
    APITestSuite,
    quickConnectivityTest,
    quickEndpointTest,
    validateResponseFormats,
    api
  };
}
