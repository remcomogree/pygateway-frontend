/**
 * Schema Validation Test Component
 * 
 * This component demonstrates and tests the schema validation functionality
 */

import React, { useState } from 'react';
import { useAppState } from '../context/AppState';

const ValidationTest = () => {
  const { validatedApi } = useAppState();
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const addResult = (test, success, message, data = null) => {
    setTestResults(prev => [...prev, {
      id: Date.now(),
      test,
      success,
      message,
      data,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const runValidationTests = async () => {
    setLoading(true);
    setTestResults([]);

    try {
      // Test 1: Valid workspace creation
      console.log("🧪 Testing valid workspace creation...");
      try {
        const validWorkspace = {
          name: "Test Workspace",
          description: "A test workspace for validation",
          enabled: true
        };
        const result = await validatedApi.createWorkspace(validWorkspace);
        addResult("Valid Workspace Creation", true, "Workspace created successfully", result);
      } catch (error) {
        addResult("Valid Workspace Creation", false, error.message);
      }

      // Test 2: Invalid workspace creation (missing required field)
      console.log("🧪 Testing invalid workspace creation...");
      try {
        const invalidWorkspace = {
          // Missing required 'name' field
          description: 123, // Wrong type
          enabled: "yes" // Wrong type
        };
        const result = await validatedApi.createWorkspace(invalidWorkspace);
        addResult("Invalid Workspace Creation", false, "Should have failed validation but didn't", result);
      } catch (error) {
        addResult("Invalid Workspace Creation", true, `Validation correctly caught: ${error.message}`);
      }

      // Test 3: Valid service creation with null provider_id
      console.log("🧪 Testing service creation with null provider_id...");
      try {
        const validService = {
          name: "Test Service",
          workspace_id: "test-workspace-id",
          provider_id: "", // This should be converted to null
          host: "api.example.com",
          port: 443,
          protocol: "https",
          enabled: true
        };
        const result = await validatedApi.createService(validService);
        addResult("Service with null provider_id", true, "Service created successfully", result);
      } catch (error) {
        addResult("Service with null provider_id", false, error.message);
      }

      // Test 4: Invalid service creation (missing required fields)
      console.log("🧪 Testing invalid service creation...");
      try {
        const invalidService = {
          // Missing required 'name' and 'workspace_id' fields
          host: "invalid",
          port: -1, // Invalid port
          enabled: "maybe" // Wrong type
        };
        const result = await validatedApi.createService(invalidService);
        addResult("Invalid Service Creation", false, "Should have failed validation but didn't", result);
      } catch (error) {
        addResult("Invalid Service Creation", true, `Validation correctly caught: ${error.message}`);
      }

      // Test 5: Query parameter validation
      console.log("🧪 Testing query parameter validation...");
      try {
        const invalidParams = {
          offset: -1, // Invalid (negative)
          limit: 2000, // Invalid (too high)
          enabled: "maybe" // Invalid type
        };
        const result = await validatedApi.getWorkspaces(invalidParams);
        addResult("Invalid Query Parameters", true, `Query params validated/corrected`, result);
      } catch (error) {
        addResult("Invalid Query Parameters", false, error.message);
      }

    } catch (error) {
      addResult("Test Suite", false, `Test suite failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const clearResults = () => {
    setTestResults([]);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '1000px', margin: '0 auto' }}>
      <h2>🧪 Schema Validation Test Suite</h2>
      <p>This component tests the Zod schema validation implementation in the PyGateway API client.</p>

      <div style={{ marginBottom: '20px' }}>
        <button 
          onClick={runValidationTests} 
          disabled={loading}
          style={{
            padding: '10px 20px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            marginRight: '10px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Running Tests...' : 'Run Validation Tests'}
        </button>
        
        <button 
          onClick={clearResults}
          style={{
            padding: '10px 20px',
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Clear Results
        </button>
      </div>

      {testResults.length > 0 && (
        <div>
          <h3>Test Results</h3>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            {testResults.map(result => (
              <div 
                key={result.id} 
                style={{
                  padding: '10px',
                  margin: '5px 0',
                  borderRadius: '4px',
                  backgroundColor: result.success ? '#d4edda' : '#f8d7da',
                  border: `1px solid ${result.success ? '#c3e6cb' : '#f5c6cb'}`,
                  color: result.success ? '#155724' : '#721c24'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <strong>{result.success ? '✅' : '❌'} {result.test}</strong>
                  <small>{result.timestamp}</small>
                </div>
                <div style={{ marginTop: '5px' }}>{result.message}</div>
                {result.data && (
                  <details style={{ marginTop: '5px' }}>
                    <summary style={{ cursor: 'pointer' }}>View Response Data</summary>
                    <pre style={{ 
                      marginTop: '5px', 
                      padding: '10px', 
                      backgroundColor: 'rgba(0,0,0,0.1)', 
                      borderRadius: '3px',
                      fontSize: '12px',
                      overflow: 'auto'
                    }}>
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
        <h4>How to Use Schema Validation</h4>
        <p>The PyGateway API client now includes automatic schema validation using Zod. Here's how it works:</p>
        <ul>
          <li><strong>Request Validation:</strong> All request data is validated against OpenAPI schemas before sending</li>
          <li><strong>Response Validation:</strong> API responses are validated to ensure they match expected schemas</li>
          <li><strong>Query Parameter Validation:</strong> URL parameters are validated and normalized</li>
          <li><strong>Empty String to Null Conversion:</strong> Empty strings in nullable fields are automatically converted to null</li>
          <li><strong>Type Coercion:</strong> Basic type conversion (e.g., string numbers to integers) where appropriate</li>
        </ul>
        
        <h4>Configuration Options</h4>
        <ul>
          <li><strong>validateSchemas:</strong> Enable/disable validation (default: true)</li>
          <li><strong>strictValidation:</strong> Throw errors vs. warnings only (default: false)</li>
          <li><strong>debug:</strong> Enable detailed logging (default: development mode)</li>
        </ul>
      </div>
    </div>
  );
};

export default ValidationTest;
