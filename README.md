# PyGateway Admin UI - React Implementation

A complete React reimplementation of the PyGateway admin interface, preserving all functionality from the original vanilla JavaScript version while providing modern development experience.

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Validate implementation
./test-implementation.sh
```

## 📋 Features

### ✅ Complete Feature Parity
This React implementation includes **all** functionality from the original `admin-ui` folder:

#### 🏠 Dashboard
- Real-time system statistics
- Interactive navigation cards
- Auto-refresh every 30 seconds
- Configuration display
- Dataplane status monitoring
- Quick action buttons

#### 🔧 API Management
- **Workspaces**: Create, edit, delete workspaces with service counts
- **Services**: Full CRUD with provider integration, health monitoring
- **Routes**: Path management, method filtering, service association
- **Plugins**: Configuration, scope management, enable/disable

#### 🔒 Security
- **Consumers**: API consumer management
- **API Keys**: Key generation, management, usage tracking
- **Authentication**: Multiple auth methods (API Key, Basic, JWT, OAuth2)
- **Rate Limiting**: Request throttling and IP restrictions

#### 🛡️ Administration
- **Audit Logs**: Searchable, filterable audit trail of all admin API operations (superadmin only)
  - Filter by method, username, resource type, status code, source IP, date range
  - Pagination with configurable page sizes
  - Purge old entries with date-based filtering
- **Certificates**: SSL/TLS certificate management (moved under Admin)
  - Certificate validation and expiry monitoring
  - SNI configuration
- **RBAC**: Role-based access control
  - `superadmin`: Full access including audit logs and dataplane management
  - `admin`: Read/write access to all resources
  - `readonly`: Read-only access, write operations hidden

#### 🔐 Authentication
- JWT-based authentication with Bearer tokens
- Login with username/password
- Token persistence in localStorage
- Automatic auth state restoration on page reload
- Fallback to superadmin login endpoint

#### 📊 Analytics & Monitoring
- Usage reports with interactive charts
- Request trends visualization
- Service performance metrics
- Error rate monitoring
- System information display

#### 🤖 LLM Management
- **Provider Management**: Configure OpenAI, Anthropic, Azure OpenAI, Google, etc.
- **Template System**: Create and manage prompt templates with variables
- **Tool Registry**: Custom LLM tools and function calling
- **Security & Content Filtering**: PII detection, prompt injection protection
- **Analytics & Monitoring**: Usage tracking, performance metrics, cost analysis
- **Billing Management**: Cost monitoring, budget tracking, usage reports
- **Code Splitting**: Lazy-loaded components for optimal performance

#### 🔐 Certificates (under Administration)
- SSL/TLS certificate management
- Certificate validation
- Expiry monitoring
- SNI configuration
- RBAC-aware: write operations hidden for readonly users

#### 🌐 Providers
- Upstream service providers
- Timeout and retry configuration
- Health check management

## 🏗️ Architecture

### State Management
- **React Context API**: Global state management replacing `window.AppState`
- **Custom Hooks**: `useAppState()` for consistent state access
- **Action Creators**: Centralized API operations and state updates

### Component Structure
```
src/
├── components/
│   ├── MainLayout.jsx           # Main app layout with navigation
│   ├── DashboardView.jsx        # Real-time dashboard
│   ├── APIView.jsx              # Tabbed API management
│   ├── SecurityView.jsx         # Security management
│   ├── AnalyticsView.jsx        # Analytics and monitoring
│   ├── AdminView.jsx            # Admin panel (Audit Logs + Certificates)
│   ├── CertificatesView.jsx     # Legacy standalone cert view
│   ├── admin/
│   │   ├── AuditLogsTab.jsx     # Audit log viewer (superadmin)
│   │   └── CertificatesTab.jsx  # Certificate management
│   ├── ProvidersView.jsx        # Service providers
│   ├── LLMManagementView.jsx    # AI model management
│   ├── api/
│   │   ├── WorkspacesTab.jsx    # Workspace CRUD
│   │   ├── ServicesTab.jsx      # Service management
│   │   ├── RoutesTab.jsx        # Route configuration
│   │   └── PluginsTab.jsx       # Plugin management
│   └── modals/
│       └── WorkspaceModal.jsx   # Workspace creation/editing
├── context/
│   └── AppState.jsx             # Global state provider
├── utils/
│   └── api.js                   # API utilities
├── App.jsx                      # Main application
└── main.jsx                     # React entry point
```

### Styling
- **Original CSS**: Complete preservation of `admin-ui/css/main.css`
- **Responsive Design**: Mobile-friendly layouts
- **Component Styling**: Modular CSS with original color schemes
- **Animations**: Preserved hover effects and transitions

## 🔄 Migration from Original

### What's Different
- **Framework**: React instead of vanilla JavaScript
- **State Management**: React Context instead of `window.AppState`
- **Module System**: ES6 imports instead of script tags
- **Build Process**: Vite instead of direct HTML serving

### What's Preserved
- **Visual Design**: Identical appearance and styling
- **Functionality**: All original features and workflows
- **API Integration**: Same endpoints and data structures
- **User Experience**: Identical navigation and interactions

## 🛠️ Development

### Prerequisites
- Node.js 18+ 
- npm 9+

### Environment Setup
```bash
# Clone the repository
git clone <repository-url>
cd pygateway-frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

### Available Scripts
- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm test` - Run test suite
- `npm run lint` - Run ESLint
- `./test-implementation.sh` - Validate complete implementation

### Development Features
- **Hot Module Replacement**: Instant updates during development
- **Source Maps**: Full debugging support
- **TypeScript Support**: Ready for TypeScript migration
- **Modern Tooling**: ESLint, Prettier configuration

## 📡 API Integration

### Authentication & RBAC
```javascript
// JWT authentication with automatic token handling
const { state, api, rawApi } = useAppState();
const user = state.currentUser; // { username, role, roles }

// Role-based access
if (user.role === 'superadmin') {
  const logs = await rawApi.getAuditLogs({ page: 1, page_size: 50 });
}

// API calls automatically include Bearer token
const data = await api.loadWorkspaces();
```

**Roles:**
| Role | Read | Write | Audit Logs | Dataplanes |
|------|------|-------|------------|------------|
| `superadmin` | Yes | Yes | Yes | Yes |
| `admin` | Yes | Yes | No | No |
| `readonly` | Yes | No | No | No |

### Error Handling
- Centralized error management
- Loading states for all operations
- User-friendly error messages
- Retry mechanisms

### Data Flow
1. Components use `useAppState()` hook
2. Actions trigger API calls via `api` methods
3. State updates trigger re-renders
4. Loading/error states managed automatically

## 🎨 UI Components

### Reusable Components
- **Cards**: Consistent styling for content areas
- **Tables**: Sortable, filterable data displays
- **Modals**: Form overlays for create/edit operations
- **Buttons**: Styled action buttons with states
- **Status Badges**: Visual status indicators

### Responsive Design
- Mobile-first approach
- Flexible grid layouts
- Collapsible navigation
- Touch-friendly interactions

## 🎨 Design System & Accessibility

### Standardized Components
- **Button System**: Consistent styling with `Button`, `IconButton`, `ActionButtons`
- **Modal Components**: Accessible modals with keyboard navigation and focus management
- **Form Components**: Standardized form inputs with validation
- **Accessibility Features**: ARIA labels, keyboard navigation, screen reader support

### Button Standards
```jsx
// Standard action buttons
<EditButton onClick={handleEdit} ariaLabel="Edit provider" />
<DeleteButton onClick={handleDelete} ariaLabel="Delete provider" />
<TestButton onClick={handleTest} loading={isTesting} />

// Consistent Cancel buttons
<Button variant="secondary" size="sm">Cancel</Button>
```

### Accessibility Features
- **Keyboard Navigation**: Full keyboard support for all components
- **ARIA Labels**: Comprehensive labeling for screen readers
- **Focus Management**: Proper focus handling in modals and forms
- **Color Contrast**: WCAG compliant color schemes
- **Semantic HTML**: Proper HTML structure for assistive technologies

## 🔧 TypeScript Integration

### Schema Validation
- **Zod Schemas**: Runtime validation with TypeScript types
- **API Type Safety**: Strongly typed API requests and responses
- **Form Validation**: Type-safe form handling and validation

### Type Definitions
```typescript
// Example: LLM Provider types
export type LLMProviderCreate = z.infer<typeof LLMProviderCreateSchema>;
export type LLMProviderResponse = z.infer<typeof LLMProviderResponseSchema>;

// Usage in components
const provider: LLMProviderResponse = await api.createLLMProvider(data);
```

### Migration Strategy
- API layer: Complete TypeScript schemas (`src/types/api-schemas.ts`)
- Components: Gradual migration from `.jsx` to `.tsx`
- Context: Type-safe state management
- Utils: Strongly typed utility functions

## ⚡ Performance Optimizations

### Code Splitting
```jsx
// Lazy loading for LLM components
import { LLMComponents, preloadLLMComponents } from './llm/LazyComponents';

// Automatic component lazy loading
const Component = LLMComponents[activeTab];
return <Component />;
```

### Performance Features
- **React.lazy**: Automatic code splitting for LLM modules
- **Preloading**: Strategic component preloading for better UX
- **Bundle Optimization**: Optimized builds with tree shaking
- **Memory Management**: Proper cleanup and state management

## 🔧 Configuration

### Environment Variables
```bash
VITE_API_BASE_URL=http://localhost:8000  # PyGateway API URL
VITE_APP_TITLE=PyGateway Admin           # Application title
```

### Build Configuration
- **Vite**: Modern build tool with optimal defaults
- **React**: Latest stable version with concurrent features
- **PostCSS**: CSS processing and optimization

## 🚀 Deployment

### Production Build
```bash
npm run build
```

### Deployment Options
- **Static Hosting**: Serve `dist/` folder
- **CDN**: Deploy to AWS CloudFront, Cloudflare, etc.
- **Docker**: Containerized deployment
- **CI/CD**: Automated builds and deployments

## 🔍 Troubleshooting

### Common Issues

#### Development Server Won't Start
```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### Build Errors
```bash
# Check for TypeScript errors
npm run type-check

# Lint for code issues
npm run lint
```

#### API Connection Issues
1. Check `VITE_API_BASE_URL` environment variable
2. Verify PyGateway backend is running
3. Check browser console for CORS errors

## 📚 Documentation

### Component Documentation
Each component includes:
- JSDoc comments
- Prop type definitions
- Usage examples
- State management patterns

### API Documentation
- Endpoint mappings
- Request/response schemas
- Error handling patterns
- Authentication requirements

## 🤝 Contributing

### Development Workflow
1. Fork the repository
2. Create feature branch
3. Implement changes with tests
4. Run validation script
5. Submit pull request

### Code Standards
- ESLint configuration enforced
- Prettier for consistent formatting
- Component naming conventions
- Git commit message standards

## 📄 License

This project is part of PyGateway and follows the same licensing terms.

## 🎯 Future Enhancements

### Planned Features
- **Dark Mode**: Theme switching capability
- **Internationalization**: Multi-language support
- **Advanced Analytics**: Enhanced reporting and visualization
- **Real-time Updates**: WebSocket integration for live data
- **Mobile App**: React Native companion app

### Migration Path
- TypeScript conversion for enhanced type safety
- GraphQL integration for optimized data fetching
- Progressive Web App (PWA) capabilities
- Advanced caching strategies

---

## 🏆 Achievement Summary

✅ **Complete Reimplementation**: All 11 sections from original admin-ui
✅ **Visual Parity**: Identical appearance and user experience  
✅ **Modern Architecture**: React, Context API, modern tooling
✅ **Performance**: Optimized loading and rendering
✅ **Maintainability**: Clean code structure and documentation
✅ **Future-Ready**: TypeScript ready, extensible design

The React implementation successfully preserves all functionality from the original admin-ui while providing a modern, maintainable codebase for future development.