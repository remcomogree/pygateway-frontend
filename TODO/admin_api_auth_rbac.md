# Admin API Authentication & RBAC — Frontend Implementation Guide

## Overview

PyGateway's Admin API (port 8001) now supports JWT-based authentication with Role-Based Access Control (RBAC).
When `ADMIN_API_AUTH_ENABLED=true`, all `/api/v1/*` endpoints require a valid Bearer token.

## Roles

| Role | Read | Write | Dataplane Mgmt | Audit Logs |
|---|---|---|---|---|
| `superadmin` | Yes | Yes | Yes | Yes |
| `admin` | Yes | Yes | No | No |
| `readonly` | Yes | No | No | No |

## Authentication Flow

### 1. Login (get token)

```http
POST http://localhost:8002/api/superadmin/login
Content-Type: application/json
Origin: http://localhost:8002

{
  "username": "admin",
  "password": "admin123"
}
```

Response:
```json
{
  "success": true,
  "message": "Superadmin login successful",
  "user": {
    "username": "admin",
    "role": "superadmin",
    "roles": ["superadmin", "admin"]
  },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### 2. Use token for API calls

```http
GET http://localhost:8001/api/v1/services
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### 3. Token is also accepted via cookie

The `superadmin_token` cookie is set on login and is automatically sent by browsers.

## Error Responses

### 401 — No/invalid token
```json
{
  "detail": "Authentication required"
}
```

### 403 — Insufficient role
```json
{
  "detail": "Read-only access — write operations not permitted"
}
```

### 403 — Superadmin-only endpoint
```json
{
  "detail": "Superadmin access required for this endpoint"
}
```

## Audit Log Endpoints

### GET /api/v1/audit/logs

Requires `superadmin` role. Returns paginated, filterable audit log entries from the database.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `page` | int | Page number (default: 1) |
| `page_size` | int | Items per page (default: 50, max: 500) |
| `method` | string | Filter by HTTP method (GET, POST, PUT, DELETE) |
| `username` | string | Filter by username |
| `resource_type` | string | Filter by resource type (services, routes, etc.) |
| `status_code` | int | Filter by HTTP status code |
| `source_ip` | string | Filter by client IP address |
| `since` | string | ISO-8601 start time |
| `until` | string | ISO-8601 end time |

```http
GET /api/v1/audit/logs?method=DELETE&page=1&page_size=20
Authorization: Bearer {token}
```

### DELETE /api/v1/audit/logs

Requires `superadmin` role. Purges audit log entries from the database.

**Query Parameters:**
| Parameter | Type | Description |
|---|---|---|
| `before` | string | ISO-8601 timestamp — delete entries older than this. If omitted, deletes **all** entries. |

```http
DELETE /api/v1/audit/logs?before=2026-01-01T00:00:00
Authorization: Bearer {token}
```

Response:
```json
{
  "deleted": 142
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ADMIN_API_AUTH_ENABLED` | `false` | Enable auth on admin API (set `true` for production) |
| `AUDIT_LOG_READS` | `false` | Log GET requests to audit log |
| `DATA_MASKING_ENABLED` | `true` | Mask sensitive data in logs |
| `MTLS_ENABLED` | `false` | Enable mTLS for CP↔DP communication |

## Frontend Integration

```javascript
// Store token after login
const loginResponse = await fetch('/api/superadmin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username, password })
});
const { token } = await loginResponse.json();

// Use token in API requests
const response = await fetch('http://localhost:8001/api/v1/services', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```
