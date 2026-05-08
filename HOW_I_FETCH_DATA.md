# How I Fetch Data - PyGateway Frontend API Integration

## 🔄 **Data Loading Architecture Overview**

The PyGateway frontend uses a centralized state management system with a comprehensive API layer that handles all backend communication. Here's exactly how each data type is loaded and processed.

## 🏗️ **Workspaces Data Loading**

### **Function**: `loadWorkspaces()`
**Location**: `src/context/AppState.jsx` line ~430

### **Process Flow**:
1. **Dispatch Loading State**: `SET_LOADING` with key 'workspaces' = true
2. **API Call**: `GET /api/v1/workspaces`
3. **Response Processing**: Direct assignment (expects array or object)
4. **State Update**: Dispatches `SET_WORKSPACES` with raw data
5. **Error Handling**: Dispatches `SET_ERROR` on failure
6. **Loading Complete**: `SET_LOADING` with key 'workspaces' = false

### **API Endpoint Expected**:
```
GET http://localhost:8001/api/v1/workspaces
```

### **Expected Response Format**:
```json
[
  {
    "id": "workspace_id",
    "name": "Workspace Name",
    "description": "Workspace description",
    "enabled": true,
    "created_at": "timestamp"
  }
]
```

### **Usage Locations**:
- `WorkspacesView.jsx` - Initial load on component mount
- `ServicesTab.jsx` - For workspace filtering
- Various modals for workspace selection

---

## 🎯 **Services Data Loading**

### **Function**: `loadServices(offset = 0, limit = 20, filters = {})`
**Location**: `src/context/AppState.jsx` line ~446

### **Process Flow**:
1. **Build Query Parameters**: 
   - `offset`: Pagination offset
   - `limit`: Number of items per page (default 20)
   - `workspace_id`: Optional workspace filter
2. **Dispatch Loading State**: `SET_LOADING` with key 'services' = true
3. **API Call**: `GET /api/v1/services?offset={offset}&limit={limit}&workspace_id={id}`
4. **Response Processing**: 
   - Extract services: `Array.isArray(data) ? data : (data.items || data.data || [])`
   - Calculate total: `data.total || services.length`
5. **State Updates**:
   - `SET_SERVICES` with processed services array
   - `SET_PAGINATION` with pagination metadata
6. **Error Handling**: Dispatches `SET_ERROR` on failure
7. **Loading Complete**: `SET_LOADING` with key 'services' = false

### **API Endpoint Expected**:
```
GET http://localhost:8001/api/v1/services?offset=0&limit=20
GET http://localhost:8001/api/v1/services?offset=0&limit=20&workspace_id=workspace123
```

### **Expected Response Format**:
```json
{
  "items": [
    {
      "id": "service_id",
      "name": "Service Name",
      "workspace_id": "workspace_id",
      "provider_id": "provider_id",
      "host": "example.com",
      "port": 80,
      "protocol": "http",
      "path": "/api",
      "enabled": true
    }
  ],
  "total": 100,
  "offset": 0,
  "limit": 20
}
```

### **Alternative Response Format** (also supported):
```json
[
  {
    "id": "service_id",
    "name": "Service Name",
    // ... service fields
  }
]
```

### **Usage Locations**:
- `ServicesTab.jsx` - Main services management
- `WorkspacesView.jsx` - When clicking workspace to show services
- Service modals for CRUD operations

---

## 🛣️ **Routes Data Loading**

### **Function**: `loadRoutes(offset = 0, limit = 20)`
**Location**: `src/context/AppState.jsx` line ~475

### **Process Flow**:
1. **Build Query Parameters**: offset, limit
2. **Dispatch Loading State**: `SET_LOADING` with key 'routes' = true
3. **API Call**: `GET /api/v1/routes?offset={offset}&limit={limit}`
4. **Response Processing**: 
   - Extract routes: `Array.isArray(data) ? data : (data.items || [])`
   - Calculate total: `data.total || routes.length`
5. **State Updates**:
   - `SET_ROUTES` with processed routes array
   - `SET_PAGINATION` with pagination metadata
6. **Error Handling**: Dispatches `SET_ERROR` on failure
7. **Loading Complete**: `SET_LOADING` with key 'routes' = false

### **API Endpoint Expected**:
```
GET http://localhost:8001/api/v1/routes?offset=0&limit=20
```

### **Expected Response Format**:
```json
{
  "items": [
    {
      "id": "route_id",
      "name": "Route Name",
      "service_id": "service_id",
      "protocols": ["http", "https"],
      "methods": ["GET", "POST"],
      "hosts": ["example.com"],
      "paths": ["/api/v1"],
      "enabled": true
    }
  ],
  "total": 50,
  "offset": 0,
  "limit": 20
}
```

### **Usage Locations**:
- `RoutesTab.jsx` - Main routes management
- Route modals for CRUD operations
- Service detail views

---

## 🔌 **Plugins Data Loading**

### **Function**: `loadPlugins(offset = 0, limit = 20)`
**Location**: `src/context/AppState.jsx` line ~515

### **Process Flow**:
1. **Build Query Parameters**: offset, limit
2. **Dispatch Loading State**: `SET_LOADING` with key 'plugins' = true
3. **API Call**: `GET /api/v1/plugins?offset={offset}&limit={limit}`
4. **Response Processing**: 
   - Extract plugins: `Array.isArray(data) ? data : (data.items || [])`
   - Calculate total: `data.total || plugins.length`
5. **State Updates**:
   - `SET_PLUGINS` with processed plugins array
   - `SET_PAGINATION` with pagination metadata
6. **Error Handling**: Dispatches `SET_ERROR` on failure
7. **Loading Complete**: `SET_LOADING` with key 'plugins' = false

### **API Endpoint Expected**:
```
GET http://localhost:8001/api/v1/plugins?offset=0&limit=20
```

### **Expected Response Format**:
```json
{
  "items": [
    {
      "id": "plugin_id",
      "name": "rate-limiting",
      "service_id": "service_id",
      "route_id": "route_id",
      "consumer_id": "consumer_id",
      "enabled": true,
      "config": {
        "minute": 100,
        "hour": 1000
      },
      "tags": ["production"]
    }
  ],
  "total": 25,
  "offset": 0,
  "limit": 20
}
```

### **Additional Plugin Endpoints**:

#### **Available Plugins List**:
```
GET http://localhost:8001/api/v1/plugins/available
```
**Expected Response**:
```json
[
  "rate-limiting",
  "cors",
  "key-auth",
  "basic-auth",
  "oauth2"
]
```

#### **Plugin Schema**:
```
GET http://localhost:8001/api/v1/plugins/schema/{plugin_name}
```
**Expected Response**:
```json
{
  "type": "object",
  "properties": {
    "minute": {
      "type": "integer",
      "minimum": 1,
      "description": "Requests per minute"
    },
    "hour": {
      "type": "integer", 
      "minimum": 1,
      "description": "Requests per hour"
    }
  }
}
```

### **Usage Locations**:
- `PluginsTab.jsx` - Main plugins management
- `PluginModal.jsx` - Plugin creation/editing with dynamic configuration

---

## 👥 **Consumers Data Loading**

### **Function**: `loadConsumers(offset = 0, limit = 20)`
**Location**: `src/context/AppState.jsx` line ~560

### **Process Flow**:
1. **Build Query Parameters**: offset, limit
2. **Dispatch Loading State**: `SET_LOADING` with key 'consumers' = true
3. **API Call**: `GET /api/v1/consumers?offset={offset}&limit={limit}`
4. **Response Processing**: 
   - Extract consumers: `Array.isArray(data) ? data : (data.items || data.data || [])`
   - Calculate total: `data.total || consumers.length`
5. **State Updates**:
   - `SET_CONSUMERS` with processed consumers array
   - `SET_PAGINATION` with pagination metadata
6. **Error Handling**: Dispatches `SET_ERROR` on failure
7. **Loading Complete**: `SET_LOADING` with key 'consumers' = false

### **API Endpoint Expected**:
```
GET http://localhost:8001/api/v1/consumers?offset=0&limit=20
```

### **Expected Response Format**:
```json
{
  "data": [
    {
      "id": "consumer_id",
      "username": "api_user",
      "custom_id": "custom_123",
      "tags": ["production", "api"],
      "created_at": 1640995200
    }
  ],
  "total": 15,
  "offset": 0,
  "limit": 20
}
```

### **Usage Locations**:
- `ConsumersView.jsx` - Main consumers management
- Consumer modals for CRUD operations
- Plugin configuration for consumer-specific plugins

---

## 🔍 **Debug Data Loading**

### **Function**: API calls in `DebugView.jsx`
**Location**: `src/components/DebugView.jsx`

### **Debug Entries List**:
```
GET http://localhost:8001/api/v1/debug?offset=0&limit=20
```

### **Specific Debug Entry Details**:
```
GET http://localhost:8001/api/v1/debug/{entry_id}
```

### **Expected Debug Response Format**:
```json
{
  "entries": [
    {
      "x_request_id": "req_77bf7776-8c9e-4c3e-87cd-b3b5f7c94fc6",
      "timestamp": "2025-08-15T10:30:00Z",
      "info": {
        "step": 1,
        "phase": "access_phase",
        "method": "GET",
        "url": "/api/v1/test",
        "service_name": "test-service",
        "client": "192.168.1.100",
        "status_code": 200,
        "time_used": 0.005,
        "plugin_executed": {
          "plugins": ["rate-limiting", "cors"]
        }
      }
    }
  ]
}
```

---

## 🔄 **Generic API Call Method**

### **Function**: `api.call(endpoint, options = {})`
**Location**: `src/context/AppState.jsx` line ~360

### **Features**:
- **Circuit Breaker Protection**: Prevents cascading failures
- **Automatic Authentication**: Adds Bearer token if available
- **Error Handling**: Comprehensive error logging and state management
- **Timeout Management**: 10-second request timeout
- **Debug Logging**: Extensive console logging for troubleshooting

### **Circuit Breaker Configuration**:
```javascript
{
  failureThreshold: 8,      // Open after 8 failures
  successThreshold: 3,      // Close after 3 successes
  timeout: 45000,           // 45 second timeout
  state: 'closed',          // closed, open, half-open
}
```

### **Headers Sent**:
```javascript
{
  'Content-Type': 'application/json',
  'Authorization': 'Bearer {token}' // if authenticated
}
```

---

## 🚨 **Error Handling Strategy**

### **Error Types Handled**:
1. **Network Errors**: Connection failures, timeouts
2. **HTTP Errors**: 4xx, 5xx status codes  
3. **JSON Parse Errors**: Invalid response format
4. **Circuit Breaker Errors**: Service temporarily unavailable

### **Error State Management**:
- Each data type has its own error state
- Errors are stored in `state.errors[dataType]`
- Circuit breaker state is global
- Loading states prevent multiple simultaneous requests

### **Fallback Mechanisms**:
- Plugin schemas have fallback configurations
- Empty arrays returned for failed list operations
- User-friendly error messages displayed

---

## 📊 **State Management Structure**

### **Redux-like State**:
```javascript
{
  workspaces: [],
  services: [],
  routes: [],
  plugins: [],
  consumers: [],
  
  loading: {
    workspaces: false,
    services: false,
    routes: false,
    plugins: false,
    consumers: false
  },
  
  errors: {
    workspaces: null,
    services: null,
    routes: null,
    plugins: null,
    consumers: null
  },
  
  pagination: {
    services: { offset: 0, limit: 20, total: 100, hasMore: true },
    routes: { offset: 0, limit: 20, total: 50, hasMore: true },
    plugins: { offset: 0, limit: 20, total: 25, hasMore: true },
    consumers: { offset: 0, limit: 20, total: 15, hasMore: false }
  },
  
  circuitBreaker: {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: null,
    maxFailures: 8,
    resetTimeout: 45000
  }
}
```

---

## 🎯 **Backend Developer Integration Checklist**

### **Required API Endpoints**:
- ✅ `GET /api/v1/workspaces`
- ✅ `GET /api/v1/services?offset=0&limit=20&workspace_id={id}`
- ✅ `GET /api/v1/routes?offset=0&limit=20`
- ✅ `GET /api/v1/plugins?offset=0&limit=20`
- ✅ `GET /api/v1/consumers?offset=0&limit=20`
- ✅ `GET /api/v1/plugins/available`
- ✅ `GET /api/v1/plugins/schema/{plugin_name}`
- ✅ `GET /api/v1/debug?offset=0&limit=20`
- ✅ `GET /api/v1/debug/{entry_id}`

### **Response Format Requirements**:
- Support both paginated (`{items: [], total: N}`) and direct array responses
- Include pagination metadata for list endpoints
- Consistent error response format
- CORS headers for browser compatibility

### **Performance Considerations**:
- Implement proper pagination (offset/limit)
- Add workspace filtering for services
- Consider caching for schema endpoints
- Optimize debug data serialization

### **Error Handling Requirements**:
- Return appropriate HTTP status codes
- Include meaningful error messages
- Handle malformed requests gracefully
- Implement rate limiting if needed

This documentation provides the complete picture of how the frontend expects to communicate with the backend. All API calls include extensive debugging output in the browser console for troubleshooting.
