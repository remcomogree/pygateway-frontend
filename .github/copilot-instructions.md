# Copilot Instructions for PyGateway Frontend

This document provides essential guidance for AI coding agents working on the PyGateway Frontend project - a React reimplementation of the PyGateway admin interface with full feature parity.

## 1. **Architecture & Data Flow**

### **Core Components**
- **Framework:** React 18 with Context API for global state management
- **Build:** Vite with hot module replacement and modern tooling  
- **API Client:** Professional-grade client with Zod validation (`src/api/PyGatewayAPI.js`)
- **State:** Centralized in `src/context/AppState.jsx` with reducer pattern

### **Critical Data Flow Pattern**
```javascript
// Always use this pattern for API operations:
const { state, api } = useAppState();

// Load data with automatic pagination/error handling:
await api.loadServices(offset, limit, { workspace_id: 'filter' });

// Access data from global state:
const services = state.services;
const loading = state.loading.services;
const error = state.errors.services;
```

### **State Architecture**
- **Global State:** Managed in `AppStateProvider` with reducer pattern
- **Pagination:** Built-in for all resources (workspaces, services, routes, plugins, consumers)
- **Error/Loading:** Automatic per-resource tracking
- **Circuit Breaker:** Built-in failure resilience with configurable thresholds

## 2. **Component Patterns & Conventions**

### **Modal Pattern (Critical)**
All CRUD operations use consistent modal pattern:
```jsx
// In parent component:
const [showModal, setShowModal] = useState(false);
const [editingItem, setEditingItem] = useState(null);

// Modal component structure:
<ServiceModal
  isOpen={showModal}
  service={editingItem}  // null for create, object for edit
  onClose={() => { setShowModal(false); setEditingItem(null); }}
  onServiceCreated={(newService) => {
    // Refresh data and close modal
    api.loadServices();
    setShowModal(false);
  }}
  onServiceUpdated={(updatedService) => {
    api.loadServices();
    setShowModal(false);
  }}
/>
```

### **Form Validation Pattern**
```javascript
// Always validate before submission:
const validateForm = () => {
  const newErrors = {};
  if (!formData.name?.trim()) {
    newErrors.name = 'Name is required';
  }
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// In submit handler:
if (!validateForm()) return;
```

### **Debug Component Pattern**
Debug views follow specific architecture:
- **FancyGraphicalDebugView:** Enhanced animated debug visualization
- **GraphicalDebugView:** Basic graphical debug flow
- **DebugView:** Tabular debug interface with overlays
- All extract data from `plugins_loaded` phase for request details

## 3. **API Integration Specifics**

### **Schema Validation (Zod)**
```javascript
// API client automatically validates requests/responses:
const { validatedApi } = useAppState();

// This will validate against ServiceCreateSchema:
await validatedApi.createService({
  name: "My Service",
  workspace_id: "workspace-123",
  provider_id: "", // Automatically converted to null
  port: "443",     // Automatically converted to number
});
```

### **Pagination Pattern**
```javascript
// All list operations support consistent pagination:
const handlePageChange = (offset, limit) => {
  api.loadServices(offset, limit, currentFilters);
};

// Pagination state is automatic in AppState:
const pagination = state.pagination.services;
```

### **Error Handling**
```javascript
// Errors are handled at AppState level:
try {
  await api.createService(serviceData);
  // Success automatically updates state
} catch (err) {
  // Error automatically sets state.errors.services
  // Display with: {state.errors.services && <div>{state.errors.services}</div>}
}
```

## 4. **Testing & Validation**

### **Schema Validation Testing**
```bash
# Test API validation:
npm run test -- ValidationTest.jsx

# Test component rendering:
npm run test -- --coverage
```

### **E2E Testing**
```bash
# Run Cypress tests:
npm run e2e

# Interactive testing:
npm run cypress
```

### **API Testing**
Use `APITestSuite.js` for comprehensive API validation:
```javascript
import { APITestSuite } from './src/api/APITestSuite.js';
const suite = new APITestSuite();
await suite.runAllTests();
```

## 5. **Development Workflows**

### **Debug Workflow**
1. Enable debug for service: `api.enableDebug(serviceId)`
2. Make requests to generate debug entries
3. View in Debug section with graphical/tabular views
4. Debug entries auto-refresh every 30 seconds

### **Development Commands**
```bash
npm run dev          # Start with proxy to backend
npm run build        # Production build
npm run test:all     # Run all tests including E2E
npm run lint         # Code quality checks
```

### **Backend Integration**
- API proxy configured in `vite.config.js` for `/api/v1/*`
- Backend expected at `localhost:8001`
- All API calls use relative URLs (no hardcoded base URLs)

## 6. **Key Files & Patterns**

### **Critical Files**
- `src/context/AppState.jsx` - Global state management (1200+ lines)
- `src/api/PyGatewayAPI.js` - Professional API client with validation
- `src/api/schemas.js` - Zod schemas for all API operations
- `src/components/modals/*.jsx` - CRUD modal components

### **Styling Conventions**
- Use `src/main.css` for global styles
- Modal overlays: `position: fixed; z-index: 10000+`
- Responsive breakpoints in CSS Grid/Flexbox
- Color scheme: Blues (#007bff) for primary, standard semantic colors

### **Logging Patterns**
```javascript
// Use emoji prefixes for categorized logging:
console.log('🏗️  loadWorkspaces - Starting with params:', { offset, limit });
console.log('✅ Workspace created successfully:', result);
console.error('❌ Failed to create workspace:', error);
```

## 7. **Common Pitfalls & Solutions**

### **Double URL Prefixes**
❌ `await api.request('/api/v1/services')` (creates `/api/v1/api/v1/services`)
✅ `await api.request('/services')` (proxy handles `/api/v1` prefix)

### **Empty String Validation**
Schema validation automatically converts empty strings to `null` for nullable fields:
```javascript
// Input: { provider_id: "" }
// Output: { provider_id: null }
```

### **Pagination State**
Always check pagination state before navigation:
```javascript
const canGoNext = pagination.hasMore;
const canGoPrevious = pagination.offset > 0;
```

---

**When making changes:**
1. Always test with validation suite
2. Check both basic and graphical debug views
3. Verify modal patterns follow established conventions
4. Ensure pagination works correctly
5. Test error handling scenarios
6. make a new  implementation report md file in new_implemented folder
7. all llm development should be in a seperate llm folder like src/components/llm folder

always run:  npm run test:run at the end to test
