# Plugin, Service, Route & Workspace Relationships

## Overview

PyGateway organizes API traffic management in a hierarchy:

```
Workspace
 └── Service (many per workspace)
      └── Route (many per service)
           └── Plugin (scoped to route, service, workspace, or global)
```

**Plugins** can be attached at different scope levels. A `request-transformer` plugin on a **service** applies to all traffic for that service. The same plugin on a **route** only applies to that specific route's traffic.

---

## Data Model

### Workspace
Container for organizing services.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier |
| `name` | string | Workspace name (globally unique) |
| `description` | string | Optional description |
| `enabled` | boolean | Active/inactive |

### Service
Represents a backend API target (host + port + path).

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier |
| `name` | string | Service name (unique per workspace) |
| `workspace_id` | string (UUID) | **FK → Workspace** |
| `host` | string | Backend hostname |
| `port` | integer | Backend port |
| `protocol` | string | `http` / `https` / `grpc` |
| `path` | string | Backend base path |
| `enabled` | boolean | Active/inactive |

### Route
Defines how incoming requests are matched and forwarded to a service.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier |
| `name` | string | Route name (unique per service) |
| `service_id` | string (UUID) | **FK → Service** |
| `paths` | string[] | URL paths to match (e.g. `["/api/v1/orders"]`) |
| `methods` | string[] | HTTP methods (e.g. `["GET", "POST"]`) |
| `protocols` | string[] | `["http", "https"]` |
| `strip_path` | boolean | Strip matched path before forwarding |
| `enabled` | boolean | Active/inactive |

### Plugin
Middleware that runs on traffic (auth, transforms, logging, etc).

| Field | Type | Description |
|-------|------|-------------|
| `id` | string (UUID) | Unique identifier |
| `name` | string | Plugin type (e.g. `key-auth`, `request-transformer`) |
| `config` | object | Plugin-specific configuration |
| `enabled` | boolean | Active/inactive |
| `workspace_id` | string / null | **FK → Workspace** (if workspace-scoped) |
| `service_id` | string / null | **FK → Service** (if service/route-scoped) |
| `route_id` | string / null | **FK → Route** (if route-scoped) |
| `consumer_id` | string / null | **FK → Consumer** (if consumer-scoped) |
| `priority` | integer | Execution order |

#### Plugin Scope Rules

| Scope | workspace_id | service_id | route_id | Applies to |
|-------|:---:|:---:|:---:|---|
| **Global** | null | null | null | All traffic |
| **Workspace** | ✓ | null | null | All traffic in workspace |
| **Service** | ✓ | ✓ | null | All routes on this service |
| **Route** | ✓ | ✓ | ✓ | Only this specific route |

Only **one plugin of the same name** is allowed per scope level (no duplicate `key-auth` on the same service).

---

## API Endpoints

Base URL: `http://localhost:8001/api/v1`

### Workspaces

```
GET    /workspaces/                    # List all workspaces
GET    /workspaces/?enabled=true       # Filter by enabled
GET    /workspaces/{id}                # Get single workspace
POST   /workspaces/                    # Create workspace
PUT    /workspaces/{id}                # Update workspace
DELETE /workspaces/{id}?force=true     # Delete (force=true cascades all children)
```

### Services

```
GET    /services/                           # List all services
GET    /services/?workspace_id={id}         # Filter by workspace
GET    /services/{id}                       # Get single service
POST   /services/                           # Create service
PUT    /services/{id}                       # Update service
DELETE /services/{id}                       # Delete service
```

### Routes

```
GET    /routes/                             # List all routes
GET    /routes/?service_id={id}             # Filter by service
GET    /routes/{id}                         # Get single route
POST   /routes/                             # Create route
PUT    /routes/{id}                         # Update route
DELETE /routes/{id}                         # Delete route
```

### Plugins

```
GET    /plugins/                            # List all plugins
GET    /plugins/?service_id={id}            # Filter by service
GET    /plugins/?route_id={id}              # Filter by route
GET    /plugins/?workspace_id={id}          # Filter by workspace
GET    /plugins/?enabled=true               # Filter by enabled
GET    /plugins/{id}                        # Get single plugin
GET    /plugins/available                   # List available plugin types
GET    /plugins/schema/{plugin_name}        # Get config schema for a plugin type
POST   /plugins/                            # Create plugin
PUT    /plugins/{id}                        # Update plugin
DELETE /plugins/{id}                        # Delete plugin
```

All list endpoints support **pagination**: `?offset=0&limit=100` (max 1000).

---

## Common Frontend Patterns

### 1. Load a workspace with all its services

```javascript
const BASE = 'http://localhost:8001/api/v1';

// Get workspace
const workspace = await fetch(`${BASE}/workspaces/${workspaceId}`).then(r => r.json());

// Get all services in this workspace
const services = await fetch(`${BASE}/services/?workspace_id=${workspaceId}&limit=1000`).then(r => r.json());
// services.items = [...], services.total = N
```

### 2. Load routes for a service

```javascript
const routes = await fetch(`${BASE}/routes/?service_id=${serviceId}&limit=1000`).then(r => r.json());
// routes.items = [...], routes.total = N
```

### 3. Load plugins for a service (includes route-level plugins)

```javascript
const plugins = await fetch(`${BASE}/plugins/?service_id=${serviceId}&limit=1000`).then(r => r.json());
// plugins.items = [...], plugins.total = N
```

### 4. Determine plugin scope from its fields

```javascript
function getPluginScope(plugin) {
  if (plugin.route_id)     return 'route';
  if (plugin.service_id)   return 'service';
  if (plugin.workspace_id) return 'workspace';
  return 'global';
}
```

### 5. Build a full hierarchy tree

```javascript
async function loadWorkspaceTree(workspaceId) {
  const [workspace, servicesData] = await Promise.all([
    fetch(`${BASE}/workspaces/${workspaceId}`).then(r => r.json()),
    fetch(`${BASE}/services/?workspace_id=${workspaceId}&limit=1000`).then(r => r.json()),
  ]);

  const services = servicesData.items;

  // Load routes and plugins for all services in parallel
  const enriched = await Promise.all(services.map(async (svc) => {
    const [routesData, pluginsData] = await Promise.all([
      fetch(`${BASE}/routes/?service_id=${svc.id}&limit=1000`).then(r => r.json()),
      fetch(`${BASE}/plugins/?service_id=${svc.id}&limit=1000`).then(r => r.json()),
    ]);

    const routes = routesData.items.map(route => ({
      ...route,
      plugins: pluginsData.items.filter(p => p.route_id === route.id),
    }));

    const servicePlugins = pluginsData.items.filter(p => !p.route_id);

    return { ...svc, routes, plugins: servicePlugins };
  }));

  // Workspace-level plugins (no service_id)
  const wsPlugins = await fetch(
    `${BASE}/plugins/?workspace_id=${workspaceId}&limit=1000`
  ).then(r => r.json());
  const workspacePlugins = wsPlugins.items.filter(p => !p.service_id);

  return { ...workspace, services: enriched, plugins: workspacePlugins };
}
```

### 6. Find plugins with specific config content

To find all `request-transformer` plugins containing a specific Authorization header:

```javascript
async function findPluginsByConfigContent(pluginName, searchString) {
  const data = await fetch(`${BASE}/plugins/?limit=1000`).then(r => r.json());

  const matches = data.items.filter(p =>
    p.name === pluginName && JSON.stringify(p.config).includes(searchString)
  );

  // Resolve service/route names
  const svcIds = [...new Set(matches.map(p => p.service_id).filter(Boolean))];
  const routeIds = [...new Set(matches.map(p => p.route_id).filter(Boolean))];

  // Fetch names in parallel
  const [svcs, routes] = await Promise.all([
    fetch(`${BASE}/services/?limit=1000`).then(r => r.json()),
    fetch(`${BASE}/routes/?limit=1000`).then(r => r.json()),
  ]);

  const svcMap = Object.fromEntries(svcs.items.map(s => [s.id, s.name]));
  const routeMap = Object.fromEntries(routes.items.map(r => [r.id, r.name]));

  return matches.map(p => ({
    pluginId: p.id,
    serviceName: svcMap[p.service_id] || null,
    routeName: routeMap[p.route_id] || null,
    scope: p.route_id ? 'route' : p.service_id ? 'service' : 'workspace',
    enabled: p.enabled,
  }));
}
```

---

## Relationship Diagram

```
┌─────────────┐
│  Workspace  │
│  (id, name) │
└──────┬──────┘
       │ 1:N (workspace_id)
       │
  ┌────▼─────┐         ┌──────────┐
  │ Service  │ 1:N     │  Plugin  │ ← workspace-scoped
  │ (id,name)├────────►│  (config)│    (service_id=null, route_id=null)
  └────┬─────┘         └──────────┘
       │ 1:N (service_id)
       │
  ┌────▼─────┐         ┌──────────┐
  │  Route   │ 1:N     │  Plugin  │ ← service-scoped
  │ (id,name)├────────►│  (config)│    (route_id=null)
  └────┬─────┘         └──────────┘
       │ 1:N (route_id)
       │
       │                ┌──────────┐
       └───────────────►│  Plugin  │ ← route-scoped
                        │  (config)│
                        └──────────┘
```

---

## Pagination

All list endpoints return a paginated response:

```json
{
  "items": [ ... ],
  "total": 141
}
```

Use `offset` and `limit` query params:
- `?offset=0&limit=100` — first 100 items
- `?offset=100&limit=100` — next 100 items
- Max `limit` is 1000

Loop until `offset >= total` to fetch all items.
