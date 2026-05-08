/**
 * Frontend Validation Script
 * Tests all components and API integration without backend
 */

export class FrontendValidator {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  addTest(name, testFn) {
    this.tests.push({ name, testFn });
  }

  async runAll() {
    console.log('🔧 Starting Frontend Validation...\n');
    
    for (const test of this.tests) {
      try {
        await test.testFn();
        this.passed++;
        console.log(`✅ ${test.name}`);
      } catch (error) {
        this.failed++;
        console.error(`❌ ${test.name}: ${error.message}`);
      }
    }
    
    console.log(`\n📊 Validation Results: ${this.passed} passed, ${this.failed} failed`);
    return this.failed === 0;
  }
}

// Create validator instance
const validator = new FrontendValidator();

// Test API Client Import
validator.addTest('API Client Import', async () => {
  const { default: api } = await import('../api/PyGatewayAPI.js');
  if (!api) throw new Error('API client not imported');
  if (typeof api.getWorkspaces !== 'function') throw new Error('getWorkspaces method missing');
  if (typeof api.createWorkspace !== 'function') throw new Error('createWorkspace method missing');
});

// Test AppState Import
validator.addTest('AppState Context Import', async () => {
  const { useAppState, AppStateProvider } = await import('../context/AppState.jsx');
  if (!useAppState) throw new Error('useAppState hook not imported');
  if (!AppStateProvider) throw new Error('AppStateProvider not imported');
});

// Test Component Imports
validator.addTest('Component Imports', async () => {
  const components = [
    '../components/DashboardView.jsx',
    '../components/WorkspacesView.jsx',
    '../components/modals/PluginModal.jsx',
    '../components/modals/DynamicPluginConfig.jsx'
  ];
  
  for (const component of components) {
    const { default: Component } = await import(component);
    if (!Component) throw new Error(`Component ${component} not imported`);
  }
});

// Test API Client Methods
validator.addTest('API Client Methods', async () => {
  const { default: api } = await import('../api/PyGatewayAPI.js');
  
  const requiredMethods = [
    'getWorkspaces', 'createWorkspace', 'updateWorkspace', 'deleteWorkspace',
    'getServices', 'createService', 'updateService', 'deleteService',
    'getRoutes', 'createRoute', 'updateRoute', 'deleteRoute',
    'getPlugins', 'createPlugin', 'updatePlugin', 'deletePlugin',
    'getConsumers', 'createConsumer', 'updateConsumer', 'deleteConsumer',
    'getProviders', 'getAvailablePlugins', 'getPluginSchema',
    'login', 'getHealth', 'getVersion'
  ];
  
  for (const method of requiredMethods) {
    if (typeof api[method] !== 'function') {
      throw new Error(`Missing API method: ${method}`);
    }
  }
});

// Test Plugin Schema Fallbacks
validator.addTest('Plugin Schema Fallbacks', async () => {
  const { default: AppState } = await import('../context/AppState.jsx');
  
  // Import the fallback function (it's not exported, so we'll test it differently)
  // We'll test by checking if the AppState file contains the fallback logic
  const AppStateSource = await fetch('/src/context/AppState.jsx').then(r => r.text());
  
  if (!AppStateSource.includes('getFallbackPluginSchema')) {
    throw new Error('Fallback plugin schema function missing');
  }
  
  if (!AppStateSource.includes('rate-limiting')) {
    throw new Error('Rate limiting fallback schema missing');
  }
});

// Test Configuration
validator.addTest('Configuration Values', async () => {
  const { API_BASE_URL } = await import('../context/AppState.jsx');
  
  if (!API_BASE_URL) throw new Error('API_BASE_URL not defined');
  if (!API_BASE_URL.includes('localhost:8001')) {
    throw new Error('API_BASE_URL should point to localhost:8001');
  }
});

// Test React Router Integration
validator.addTest('Router Integration', async () => {
  // Test if useNavigate is properly imported where needed
  const componentsWithNavigation = [
    '../components/WorkspacesView.jsx',
    '../components/api/WorkspacesTab.jsx'
  ];
  
  for (const component of componentsWithNavigation) {
    const componentSource = await fetch(component).then(r => r.text());
    
    if (!componentSource.includes('useNavigate')) {
      throw new Error(`${component} missing useNavigate import`);
    }
  }
});

// Run validation if called directly
if (typeof window !== 'undefined') {
  // Browser environment
  window.validateFrontend = () => validator.runAll();
  console.log('🔧 Frontend validator loaded. Run validateFrontend() in console to test.');
}

export default validator;
