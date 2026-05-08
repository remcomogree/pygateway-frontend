# PyGateway API Schema Validation

This document explains the comprehensive schema validation implementation added to the PyGateway API client.

## Overview

The PyGateway API client now includes automatic request and response validation using **Zod schemas** based on the OpenAPI specification from `http://localhost:8001/openapi.json`. This ensures data integrity, provides better error messages, and catches validation issues early in development.

## Implementation Details

### 1. Schema Definitions (`src/api/schemas.js`)

- **Complete OpenAPI Coverage**: Schemas for all major entities (Workspaces, Services, Routes, Providers, Consumers, Certificates, Plugins, Monetization, Dataplanes)
- **Request Schemas**: Validation for create/update operations
- **Response Schemas**: Validation for API responses
- **Query Parameter Schemas**: Validation for pagination and filtering
- **Smart Type Conversion**: Empty strings automatically converted to `null` for nullable fields
- **Comprehensive Error Messages**: Detailed validation error reporting

### 2. Enhanced API Client (`src/api/PyGatewayAPI.js`)

#### Features Added:
- **Request Validation**: All request bodies validated before sending
- **Response Validation**: API responses validated against expected schemas  
- **Query Parameter Validation**: URL parameters validated and normalized
- **Dual API Support**: Works with both standalone fetch and AppState's rawApi
- **Configurable Validation**: Enable/disable validation per environment
- **Smart Error Handling**: Graceful degradation when validation fails

#### Configuration Options:
```javascript
const apiClient = new PyGatewayAPI({
  rawApi: existingApiClient,        // Optional: use existing API client
  validateSchemas: true,            // Enable/disable validation
  strictValidation: false,          // Throw errors vs warnings only
  debug: true                       // Enable detailed logging
});
```

### 3. Validation Modes

#### Development Mode (Recommended):
```javascript
validateSchemas: true,
strictValidation: true,
debug: true
```
- Full validation with errors thrown
- Detailed logging for debugging
- Catches issues early in development

#### Production Mode (Recommended):
```javascript
validateSchemas: true,
strictValidation: false,
debug: false
```
- Validation with warnings only
- Minimal logging
- Graceful degradation for unexpected data

#### Legacy Mode:
```javascript
validateSchemas: false
```
- No validation (backward compatibility)
- Use when troubleshooting validation issues

## Key Features

### 1. Empty String to Null Conversion

The validation automatically handles the common issue where forms send empty strings (`""`) but the database expects `null` for nullable foreign keys:

```javascript
// Before: This would cause database constraint errors
{
  provider_id: "",  // Empty string
  host: "",
  port: ""
}

// After: Automatically converted to proper null values
{
  provider_id: null,  // Converted to null
  host: null,
  port: null
}
```

### 2. Type Coercion and Validation

```javascript
// Input validation with automatic type conversion
const serviceData = {
  name: "My Service",           // ✅ Valid string
  workspace_id: "workspace-1", // ✅ Required string
  provider_id: "",             // ✅ Converted to null
  port: "443",                 // ✅ Converted to number 443
  enabled: true                // ✅ Valid boolean
};
```

### 3. Comprehensive Error Messages

```javascript
// Example validation error:
"Validation failed for request: name: Required, port: Expected number, received string"
```

### 4. Query Parameter Validation

```javascript
// Invalid parameters are corrected:
getWorkspaces({ offset: -1, limit: 2000 })
// Becomes: { offset: 0, limit: 100 } with warnings
```

## Usage Examples

### 1. Basic Service Creation

```javascript
import { useAppState } from '../context/AppState';

const { validatedApi } = useAppState();

// This will be validated automatically
const serviceData = {
  name: "My API Service",
  workspace_id: "workspace-123",
  provider_id: "", // Automatically converted to null
  host: "api.example.com",
  port: 443,
  protocol: "https",
  enabled: true
};

try {
  const service = await validatedApi.createService(serviceData);
  console.log("Service created:", service);
} catch (error) {
  console.error("Validation or API error:", error.message);
}
```

### 2. Workspace Management

```javascript
// Get workspaces with validated pagination
const workspaces = await validatedApi.getWorkspaces({
  offset: 0,
  limit: 50,
  enabled: true
});

// Create workspace with validation
const workspace = await validatedApi.createWorkspace({
  name: "Production Workspace",
  description: "Main production environment",
  enabled: true
});
```

### 3. Error Handling

```javascript
try {
  await validatedApi.createService({
    // Missing required 'name' field
    workspace_id: "test"
  });
} catch (error) {
  // Validation error with detailed message:
  // "Validation failed for request: name: Required"
  console.error(error.message);
}
```

## Integration with Existing Code

### AppState Integration

The validated API client is automatically available in the AppState context:

```javascript
const { validatedApi } = useAppState();
```

### Modal Components

Updated components like `ServiceModal.jsx` now use the validated API:

```javascript
// Before: Raw API calls
await rawApi.request('/api/v1/services/', {
  method: 'POST',
  body: JSON.stringify(serviceData)
});

// After: Validated API calls
await validatedApi.createService(serviceData);
```

## Benefits

### 1. **Data Integrity**
- Ensures all API requests match expected schemas
- Prevents invalid data from reaching the backend
- Automatic type conversion and normalization

### 2. **Better Error Messages**
- Clear, specific validation error messages
- Field-level error reporting
- Context-aware error descriptions

### 3. **Developer Experience**
- Early error detection in development
- Detailed logging and debugging information
- Auto-completion support for request/response data

### 4. **Database Constraint Prevention**
- Automatic conversion of empty strings to null
- Prevents foreign key constraint violations
- Proper handling of nullable fields

### 5. **API Evolution Support**
- Schema validation ensures compatibility
- Easy to update when API changes
- Backward compatibility options

## Testing

Use the `ValidationTest` component to verify the implementation:

1. Navigate to the validation test page
2. Run the test suite to verify all validation scenarios
3. Check browser console for detailed validation logs

## Configuration Recommendations

### Development:
```javascript
const validatedApi = new PyGatewayAPI({
  rawApi: api,
  validateSchemas: true,
  strictValidation: true,
  debug: true
});
```

### Production:
```javascript
const validatedApi = new PyGatewayAPI({
  rawApi: api,
  validateSchemas: true,
  strictValidation: false,
  debug: false
});
```

## Troubleshooting

### Common Issues:

1. **Validation Errors in Production**
   - Set `strictValidation: false` to use warnings instead of errors
   - Check browser console for validation details

2. **Performance Concerns**
   - Validation overhead is minimal (<1ms per request)
   - Can be disabled entirely with `validateSchemas: false`

3. **Schema Mismatches**
   - Update schemas in `src/api/schemas.js` when API changes
   - Use `debug: true` to see detailed validation logs

4. **Type Conversion Issues**
   - Review the nullable field transforms in schemas
   - Check browser console for conversion details

## Future Enhancements

- **Runtime Schema Generation**: Auto-generate schemas from OpenAPI spec
- **Custom Validation Rules**: Business logic validation
- **Form Integration**: Direct form validation support
- **Performance Monitoring**: Validation timing metrics
