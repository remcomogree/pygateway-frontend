# ABAC OIDC Engine — Frontend Integration Guide

**Base URL:** `http://localhost:8001/api/v1`  
**Authentication:** Superadmin JWT (Bearer token)  
**Last Updated:** April 7, 2026

---

## Overview

PyGateway uses Attribute-Based Access Control (ABAC) with OIDC token validation to authorize requests at the dataplane. The system has three parts:

1. **Control Plane API** (`/api/v1/abac-policies/`) — CRUD for policies, validation, deployment
2. **ABAC Engine** (sidecar container) — Receives deployed policies, validates JWTs, evaluates rules
3. **ABAC Plugin** (dataplane) — Attached to a service, calls the engine via UNIX socket IPC on every request

**Complete flow:**

```
Create Policy → Deploy to Engine → Attach ABAC Plugin to Service → Requests are authorized
```

---

## Data Model

### ABAC Policy

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | auto | Policy ID |
| `name` | string | yes | Unique name. Must match `^[a-zA-Z][a-zA-Z0-9_-]{0,127}$` |
| `description` | string | no | Human-readable description |
| `service_id` | string | yes | ID of the service this policy protects |
| `dsl` | object | yes | Policy rules in DSL format (see DSL Reference below) |
| `oidc_config` | object | yes | OIDC provider config for JWT validation |
| `version` | string | no | Semantic version (default: `"1.0.0"`) |
| `enabled` | boolean | no | Whether policy is deployable (default: `true`) |
| `created_at` | datetime | auto | Creation timestamp |
| `updated_at` | datetime | auto | Last update timestamp |

### OIDC Config

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `issuer` | string | yes | — | OIDC issuer URL (e.g. `https://login.microsoftonline.com/{tenant}/v2.0`) |
| `audience` | string | yes | — | Expected JWT audience (e.g. `api://my-app`) |
| `jwks_uri` | string | no | `""` | JWKS endpoint URL. Auto-derived from issuer if empty |
| `role_claim` | string | no | `"roles"` | JWT claim containing user roles |
| `groups_claim` | string | no | `"groups"` | JWT claim containing user groups |
| `algorithms` | string[] | no | `["RS256"]` | Allowed JWT signing algorithms |
| `verify_ssl` | boolean | no | `true` | Verify SSL for JWKS endpoint |

---

## API Endpoints

### 1. Create ABAC Policy

```
POST /api/v1/abac-policies/
```

**Request Body:**
```json
{
  "name": "my-api-policy",
  "description": "Protect my API with role-based ABAC",
  "service_id": "svc-abc-123",
  "oidc_config": {
    "issuer": "https://login.microsoftonline.com/tenant-id/v2.0",
    "audience": "api://my-api",
    "role_claim": "roles",
    "groups_claim": "groups"
  },
  "dsl": {
    "version": 1,
    "name": "my-api-policy",
    "description": "Role-based access for my API",
    "combining": "deny_overrides",
    "rules": [
      {
        "id": "allow-admins",
        "description": "Allow admin role full access",
        "effect": "allow",
        "condition": "\"admin\" IN subject.roles"
      },
      {
        "id": "allow-readers-get",
        "description": "Readers can only GET",
        "effect": "allow",
        "condition": "\"reader\" IN subject.roles AND action.method == \"GET\""
      },
      {
        "id": "deny-all",
        "description": "Deny everything else",
        "effect": "deny",
        "condition": "true"
      }
    ]
  },
  "version": "1.0.0",
  "enabled": true
}
```

**Response `201 Created`:**
```json
{
  "id": "pol-uuid-here",
  "name": "my-api-policy",
  "description": "Protect my API with role-based ABAC",
  "service_id": "svc-abc-123",
  "dsl": { ... },
  "oidc_config": { ... },
  "version": "1.0.0",
  "enabled": true,
  "created_at": "2026-04-07T12:00:00Z",
  "updated_at": "2026-04-07T12:00:00Z"
}
```

**Error Responses:**

| Status | Cause |
|--------|-------|
| `400` | DSL validation failed or service not found |
| `409` | Policy name already exists |
| `422` | Invalid request body (schema validation) |

**`400` example:**
```json
{
  "detail": "DSL validation failed: 'version' must be 1, got 2; Rule 'allow-admins': Invalid attribute 'subject.roole'. Did you mean 'subject.role'?"
}
```

---

### 2. List ABAC Policies

```
GET /api/v1/abac-policies/
```

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `offset` | int | `0` | Pagination offset |
| `limit` | int | `100` | Page size (max 1000) |
| `service_id` | string | — | Filter by service ID |
| `enabled` | boolean | — | Filter by enabled status |

**Response `200 OK`:**
```json
{
  "items": [
    {
      "id": "pol-uuid-here",
      "name": "my-api-policy",
      "description": "...",
      "service_id": "svc-abc-123",
      "dsl": { ... },
      "oidc_config": { ... },
      "version": "1.0.0",
      "enabled": true,
      "created_at": "2026-04-07T12:00:00Z",
      "updated_at": "2026-04-07T12:00:00Z"
    }
  ],
  "total": 1,
  "limit": 100,
  "offset": 0
}
```

**Frontend Usage:**
```javascript
// List all policies for a service
const response = await fetch('/api/v1/abac-policies/?service_id=svc-abc-123', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const data = await response.json();
// data.items, data.total, data.limit, data.offset
```

---

### 3. Get ABAC Policy by ID

```
GET /api/v1/abac-policies/{policy_id}
```

**Response `200 OK`:** Single `AbacPolicyResponse` object (same shape as list items).

**Response `404 Not Found`:**
```json
{ "detail": "ABAC policy 'nonexistent-id' not found" }
```

---

### 4. Update ABAC Policy

```
PUT /api/v1/abac-policies/{policy_id}
```

All fields are optional — only include fields you want to change.

**Request Body:**
```json
{
  "description": "Updated description",
  "dsl": {
    "version": 1,
    "name": "my-api-policy",
    "combining": "deny_overrides",
    "rules": [ ... ]
  },
  "version": "1.1.0",
  "enabled": false
}
```

**Response `200 OK`:** Updated `AbacPolicyResponse`.

**Error Responses:**

| Status | Cause |
|--------|-------|
| `400` | DSL validation failed |
| `404` | Policy not found |
| `409` | New name conflicts with existing policy |

> **Important:** After updating a policy, you must re-deploy (see endpoint 7) for changes to take effect in the ABAC engine.

---

### 5. Delete ABAC Policy

```
DELETE /api/v1/abac-policies/{policy_id}
```

**Response `200 OK`:**
```json
{ "message": "ABAC policy 'my-api-policy' deleted" }
```

The policy is also unloaded from the ABAC engine automatically.

**Response `404`:** Policy not found.

---

### 6. Validate DSL (without saving)

```
POST /api/v1/abac-policies/validate
```

Use this for real-time validation in a DSL editor. The body is the raw DSL object (not wrapped).

**Request Body:**
```json
{
  "version": 1,
  "name": "test-policy",
  "combining": "deny_overrides",
  "rules": [
    {
      "id": "rule-1",
      "effect": "allow",
      "condition": "subject.roole == \"admin\""
    }
  ]
}
```

**Response `200 OK`:**
```json
{
  "valid": false,
  "errors": [
    "Rule 'rule-1': Unknown attribute 'subject.roole'. Did you mean 'subject.role'?"
  ]
}
```

**Response when valid:**
```json
{
  "valid": true,
  "errors": []
}
```

**Frontend Usage — Live Validation:**
```javascript
async function validateDSL(dsl) {
  const response = await fetch('/api/v1/abac-policies/validate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(dsl)
  });
  const result = await response.json();
  return result; // { valid: boolean, errors: string[] }
}
```

---

### 7. Deploy Policies to ABAC Engine

```
POST /api/v1/abac-policies/deploy
```

Pushes all enabled policies (or a filtered set) to the ABAC engine. The engine compiles the DSL and loads the OIDC config for JWT validation.

**Request Body:**
```json
{
  "service_ids": ["svc-abc-123"]
}
```

Pass `null` or omit `service_ids` to deploy **all** enabled policies.

**Response `200 OK`:**
```json
{
  "deployed": 1,
  "engine_response": {
    "total_loaded": 1,
    "total_errors": 0,
    "results": [
      {
        "service_id": "svc-abc-123",
        "status": "loaded",
        "policy_name": "my-api-policy"
      }
    ]
  }
}
```

**Error Responses:**

| Status | Response |
|--------|----------|
| `200` | No policies to deploy: `{ "deployed": 0, "message": "No enabled policies to deploy" }` |
| `502` | ABAC engine returned an error |
| `503` | ABAC engine container unreachable |

**Frontend Usage:**
```javascript
async function deployPolicies(serviceIds = null) {
  const body = serviceIds ? { service_ids: serviceIds } : {};
  const response = await fetch('/api/v1/abac-policies/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (response.status === 503) {
    showError('ABAC engine is not running. Please check the container.');
    return null;
  }

  return await response.json();
}
```

---

### 8. Get ABAC Engine Status

```
GET /api/v1/abac-policies/engine/status
```

Returns the live status from the ABAC engine container.

**Response `200 OK`:**
```json
{
  "status": "running",
  "loaded_policies": 3,
  "services": ["svc-abc-123", "svc-def-456", "svc-ghi-789"],
  "uptime_seconds": 3600,
  "cache": {
    "token_cache_size": 42,
    "token_cache_max": 10000
  }
}
```

**Response `503`:** ABAC engine is not reachable.

---

## Attaching the ABAC Plugin to a Service

After creating and deploying a policy, you must attach the `abac` plugin to the same service. This tells the dataplane to enforce ABAC on incoming requests.

```
POST /api/v1/plugins/
```

**Request Body:**
```json
{
  "name": "abac",
  "service_id": "svc-abc-123",
  "config": {
    "deny_on_error": true,
    "timeout_ms": 50
  },
  "enabled": true
}
```

**Plugin Config Options:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `deny_on_error` | boolean | `true` | Deny requests when engine is unreachable (fail-closed) |
| `deny_on_no_policy` | boolean | `false` | Deny requests when no policy is loaded for the service |
| `timeout_ms` | integer | `50` | Max time to wait for engine response (milliseconds) |

> **Note:** `socket_path` is configured globally via settings and should not be set per-plugin unless you have a custom setup.

---

## Complete Setup Flow

Here's the full sequence a frontend should implement:

### Step 1 — Create a Service (if not existing)
```
POST /api/v1/services/
{ "name": "my-api", "host": "backend.internal", "port": 8080, "protocol": "http" }
→ { "id": "svc-abc-123", ... }
```

### Step 2 — Create a Route for the Service
```
POST /api/v1/routes/
{ "name": "my-api-route", "service_id": "svc-abc-123", "paths": ["/my-api"], "methods": ["GET","POST","PUT","DELETE"] }
```

### Step 3 — Create an ABAC Policy with OIDC Config
```
POST /api/v1/abac-policies/
{ "name": "my-api-policy", "service_id": "svc-abc-123", "oidc_config": {...}, "dsl": {...} }
→ { "id": "pol-xyz-789", ... }
```

### Step 4 — Deploy the Policy to the Engine
```
POST /api/v1/abac-policies/deploy
{ "service_ids": ["svc-abc-123"] }
→ { "deployed": 1, "engine_response": { "total_loaded": 1, "total_errors": 0 } }
```

### Step 5 — Attach the ABAC Plugin to the Service
```
POST /api/v1/plugins/
{ "name": "abac", "service_id": "svc-abc-123", "config": { "deny_on_error": true, "timeout_ms": 50 }, "enabled": true }
```

### Result — Requests Are Now Authorized

```
Client → GET /my-api (Authorization: Bearer <JWT>)
  → Dataplane matches route → service
  → ABAC plugin intercepts in "access" phase
  → Calls ABAC engine via UNIX socket (msgpack IPC, ~100µs)
  → Engine validates JWT (RS256, checks issuer/audience/expiry)
  → Engine extracts claims → builds ABAC context
  → Engine evaluates compiled policy rules
  → Returns allow/deny
  → allow → request forwarded to upstream
  → deny → 403 Forbidden returned to client
```

---

## DSL Reference

### Structure

```json
{
  "version": 1,
  "name": "policy-name",
  "description": "Optional description",
  "combining": "deny_overrides",
  "rules": [
    {
      "id": "rule-id",
      "description": "Optional",
      "effect": "allow",
      "condition": "<expression>"
    }
  ]
}
```

### Combining Algorithms

| Algorithm | Behavior |
|-----------|----------|
| `deny_overrides` | If any rule denies, the result is deny (default, recommended) |
| `allow_overrides` | If any rule allows, the result is allow |
| `first_applicable` | First matching rule wins |

### Available Attributes

**Subject** (from JWT claims):
| Attribute | Type | Description |
|-----------|------|-------------|
| `subject.sub` | string | JWT subject (user ID) |
| `subject.email` | string | User email |
| `subject.name` | string | User display name |
| `subject.role` | string | Single role claim |
| `subject.roles` | string[] | Role array from `role_claim` |
| `subject.groups` | string[] | Group array from `groups_claim` |
| `subject.department` | string | Department claim |
| `subject.iss` | string | Token issuer |

**Action** (from HTTP request):
| Attribute | Type | Description |
|-----------|------|-------------|
| `action.method` | string | HTTP method (GET, POST, etc.) |
| `action.path` | string | Request path |

**Resource** (from service metadata):
| Attribute | Type | Description |
|-----------|------|-------------|
| `resource.type` | string | Resource type |
| `resource.owner` | string | Resource owner |
| `resource.sensitivity` | string | Sensitivity level |
| `resource.classification` | string | Data classification |

**Environment** (from request context):
| Attribute | Type | Description |
|-----------|------|-------------|
| `environment.ip` | string | Client IP address |
| `environment.user_agent` | string | User-Agent header |
| `environment.origin` | string | Origin header |
| `environment.timestamp` | string | Request timestamp |
| `environment.time_hour` | integer | Current hour (0-23) |

### Expression Syntax

```
# Comparison operators
subject.role == "admin"
environment.time_hour >= 9

# Logical operators
subject.role == "admin" AND action.method == "GET"
subject.role == "admin" OR subject.role == "superadmin"
NOT (action.method == "DELETE")

# Set operators
"admin" IN subject.roles
"engineering" IN subject.groups

# Literal true/false (for catch-all rules)
true
false
```

### Common Policy Patterns

**Admin-only:**
```json
{
  "id": "admin-only",
  "effect": "allow",
  "condition": "\"admin\" IN subject.roles"
}
```

**Read-only for viewers:**
```json
{
  "id": "viewer-read",
  "effect": "allow",
  "condition": "\"viewer\" IN subject.roles AND action.method == \"GET\""
}
```

**Business hours only:**
```json
{
  "id": "business-hours",
  "effect": "deny",
  "condition": "environment.time_hour < 8 OR environment.time_hour > 18"
}
```

**Block DELETE on sensitive resources:**
```json
{
  "id": "no-delete-sensitive",
  "effect": "deny",
  "condition": "action.method == \"DELETE\" AND resource.sensitivity == \"confidential\""
}
```

---

## Architecture Diagram

```
┌──────────────────────────────┐
│        Frontend / Admin UI   │
│   Create policy + deploy     │
└───────────┬──────────────────┘
            │  REST API
            ▼
┌──────────────────────────────┐     HTTP POST /bundles
│   Control Plane              │────────────────────────┐
│   /api/v1/abac-policies/     │                        │
│   CRUD + validate + deploy   │                        ▼
└──────────────────────────────┘         ┌──────────────────────────┐
                                         │   ABAC Engine (sidecar)  │
                                         │   - Compiles DSL         │
                                         │   - Validates JWTs       │
                                         │   - Evaluates policies   │
                                         │   HTTP :9000 (admin)     │
                                         │   UNIX socket (hot-path) │
                                         └───────────┬──────────────┘
                                                     │ UNIX socket
                                                     │ msgpack IPC
                                                     │ ~100µs
┌──────────────────────────────┐                     │
│   Dataplane                  │◄────────────────────┘
│   ABAC Plugin (access phase) │
│   → allow: forward to upstream
│   → deny:  return 403        │
└──────────────────────────────┘
```

---

## Error Handling

### Display validation errors in a DSL editor

```javascript
async function handlePolicySave(dsl, oidcConfig, serviceId) {
  // Step 1: Validate DSL first
  const validation = await fetch('/api/v1/abac-policies/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(dsl)
  });
  const result = await validation.json();

  if (!result.valid) {
    // Show errors in the editor
    result.errors.forEach(err => displayEditorError(err));
    return;
  }

  // Step 2: Create or update the policy
  const response = await fetch('/api/v1/abac-policies/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({
      name: dsl.name,
      service_id: serviceId,
      oidc_config: oidcConfig,
      dsl: dsl
    })
  });

  if (response.status === 400) {
    const error = await response.json();
    showToast('error', error.detail);
  } else if (response.status === 409) {
    showToast('error', 'A policy with this name already exists');
  } else if (response.status === 201) {
    showToast('success', 'Policy created');
    // Step 3: Deploy
    await deployPolicies([serviceId]);
  }
}
```

### Handle deploy failures

```javascript
async function deployWithRetry(serviceIds) {
  const response = await fetch('/api/v1/abac-policies/deploy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify({ service_ids: serviceIds })
  });

  switch (response.status) {
    case 200:
      const data = await response.json();
      if (data.deployed === 0) {
        showToast('info', 'No enabled policies found to deploy');
      } else if (data.engine_response.total_errors > 0) {
        showToast('warning', `Deployed with ${data.engine_response.total_errors} error(s)`);
      } else {
        showToast('success', `${data.deployed} policy(s) deployed`);
      }
      return data;
    case 502:
      showToast('error', 'ABAC engine returned an error');
      break;
    case 503:
      showToast('error', 'ABAC engine is not running. Check container status.');
      break;
    default:
      showToast('error', 'Unexpected error during deployment');
  }
  return null;
}
```

---

## Suggested UI Components

### Policy List Page
- Table with columns: Name, Service, Version, Enabled, Created, Actions
- Filter by service (dropdown) and enabled status (toggle)
- "Deploy All" button at the top
- Per-row actions: Edit, Delete, Deploy (single service)

### Policy Editor Page
- **Left panel:** DSL editor (JSON/YAML with syntax highlighting)
- **Right panel:** OIDC config form (issuer, audience, role_claim, etc.)
- **Bottom panel:** Validation errors (live, from `/validate` endpoint)
- **Toolbar:** Save, Validate, Deploy, Delete
- Template selector dropdown (admin-only, read-only, business-hours, etc.)

### Engine Status Panel
- Show engine status from `/engine/status`
- Display: loaded policies count, uptime, cache size
- Refresh button
- Visual indicator: green (healthy), red (503 unreachable)

### Service ABAC Status
- On the service detail page, show whether ABAC is configured:
  - Has ABAC policy? (link to policy)
  - Has ABAC plugin attached? (link to plugin)
  - Policy deployed to engine?
  - Engine reachable?
