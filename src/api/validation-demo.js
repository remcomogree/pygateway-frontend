/**
 * PyGateway API Configuration and Validation Demo
 * 
 * This file demonstrates how to use the enhanced PyGateway API client
 * with schema validation enabled.
 */

import { PyGatewayAPI } from './PyGatewayAPI.js';

/**
 * API Client Factory with different validation configurations
 */
export class PyGatewayAPIFactory {
  /**
   * Create API client with full validation (recommended for development)
   */
  static createWithValidation(rawApi, options = {}) {
    return new PyGatewayAPI({
      rawApi,
      validateSchemas: true,
      strictValidation: true,
      debug: true,
      ...options
    });
  }

  /**
   * Create API client with validation warnings only (recommended for production)
   */
  static createWithWarnings(rawApi, options = {}) {
    return new PyGatewayAPI({
      rawApi,
      validateSchemas: true,
      strictValidation: false,
      debug: false,
      ...options
    });
  }

  /**
   * Create API client without validation (legacy mode)
   */
  static createWithoutValidation(rawApi, options = {}) {
    return new PyGatewayAPI({
      rawApi,
      validateSchemas: false,
      strictValidation: false,
      debug: false,
      ...options
    });
  }

  /**
   * Create API client with custom configuration
   */
  static createCustom(rawApi, config = {}) {
    return new PyGatewayAPI({
      rawApi,
      ...config
    });
  }
}

/**
 * Validation Examples and Testing
 */
export class ValidationExamples {
  constructor(apiClient) {
    this.api = apiClient;
  }

  /**
   * Example: Create workspace with valid data
   */
  async createValidWorkspace() {
    try {
      const validWorkspace = {
        name: "My Test Workspace",
        description: "A test workspace for validation demo",
        enabled: true
      };

      console.log("✅ Creating workspace with valid data:", validWorkspace);
      const result = await this.api.createWorkspace(validWorkspace);
      console.log("✅ Workspace created successfully:", result);
      return result;
    } catch (error) {
      console.error("❌ Failed to create valid workspace:", error.message);
      throw error;
    }
  }

  /**
   * Example: Try to create workspace with invalid data
   */
  async createInvalidWorkspace() {
    try {
      const invalidWorkspace = {
        // Missing required 'name' field
        description: 123, // Wrong type, should be string
        enabled: "yes" // Wrong type, should be boolean
      };

      console.log("⚠️ Creating workspace with invalid data:", invalidWorkspace);
      const result = await this.api.createWorkspace(invalidWorkspace);
      console.log("⚠️ Workspace created despite validation issues:", result);
      return result;
    } catch (error) {
      console.error("❌ Validation caught invalid workspace data:", error.message);
      throw error;
    }
  }

  /**
   * Example: Create service with valid data
   */
  async createValidService(workspaceId) {
    try {
      const validService = {
        name: "Test Service",
        workspace_id: workspaceId,
        host: "api.example.com",
        port: 443,
        protocol: "https",
        path: "/v1",
        enabled: true
      };

      console.log("✅ Creating service with valid data:", validService);
      const result = await this.api.createService(validService);
      console.log("✅ Service created successfully:", result);
      return result;
    } catch (error) {
      console.error("❌ Failed to create valid service:", error.message);
      throw error;
    }
  }

  /**
   * Example: Test pagination parameters validation
   */
  async testPaginationValidation() {
    try {
      // Valid pagination
      console.log("✅ Testing valid pagination parameters");
      const validParams = { offset: 0, limit: 10 };
      const workspaces1 = await this.api.getWorkspaces(validParams);
      console.log("✅ Valid pagination worked:", workspaces1.total || workspaces1.length);

      // Invalid pagination (will trigger validation)
      console.log("⚠️ Testing invalid pagination parameters");
      const invalidParams = { offset: -1, limit: 2000 }; // offset too low, limit too high
      const workspaces2 = await this.api.getWorkspaces(invalidParams);
      console.log("⚠️ Invalid pagination handled:", workspaces2.total || workspaces2.length);

    } catch (error) {
      console.error("❌ Pagination validation error:", error.message);
      throw error;
    }
  }

  /**
   * Run all validation examples
   */
  async runAllExamples() {
    console.log("\n🧪 Starting PyGateway API Validation Examples\n");

    try {
      // Test pagination first
      await this.testPaginationValidation();

      // Test workspace creation
      let workspace;
      try {
        workspace = await this.createValidWorkspace();
      } catch (error) {
        console.log("⚠️ Valid workspace creation failed, continuing...");
      }

      // Test invalid workspace creation
      try {
        await this.createInvalidWorkspace();
      } catch (error) {
        console.log("✅ Invalid workspace creation properly rejected");
      }

      // Test service creation if we have a workspace
      if (workspace && workspace.id) {
        try {
          await this.createValidService(workspace.id);
        } catch (error) {
          console.log("⚠️ Valid service creation failed, continuing...");
        }
      }

      console.log("\n✅ Validation examples completed!\n");

    } catch (error) {
      console.error("\n❌ Validation examples failed:", error.message, "\n");
    }
  }
}

/**
 * Usage example for components
 */
export function createValidatedApiClient(rawApi, environment = 'development') {
  switch (environment) {
    case 'development':
      return PyGatewayAPIFactory.createWithValidation(rawApi);
    
    case 'staging':
      return PyGatewayAPIFactory.createWithWarnings(rawApi);
    
    case 'production':
      return PyGatewayAPIFactory.createWithWarnings(rawApi);
    
    default:
      return PyGatewayAPIFactory.createWithValidation(rawApi);
  }
}

/**
 * Configuration recommendations
 */
export const VALIDATION_CONFIG = {
  development: {
    validateSchemas: true,
    strictValidation: true,
    debug: true
  },
  
  staging: {
    validateSchemas: true,
    strictValidation: false,
    debug: true
  },
  
  production: {
    validateSchemas: true,
    strictValidation: false,
    debug: false
  },
  
  testing: {
    validateSchemas: true,
    strictValidation: true,
    debug: true
  }
};
