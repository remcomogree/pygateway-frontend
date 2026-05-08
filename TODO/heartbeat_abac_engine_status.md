# Heartbeat Endpoint — ABAC Engine Status

## Overview

The dataplane heartbeat endpoint now includes live ABAC engine status information. This allows the frontend to display ABAC engine health alongside dataplane status.

## Endpoint

```
POST /api/v1/dataplanes/{dataplane_id}/heartbeat
```

### Request Body

```json
{
    "message": "PING",
    "status": "healthy",
    "version": "abc123"
}
```

### Response

```json
{
    "message": "PONG",
    "timestamp": "2026-04-09T13:45:55.268672+00:00",
    "control_plane_status": "healthy",
    "abac_engine_status": "healthy",
    "abac_engine": {
        "registered_services": [
            "b2f10e35-9ab9-4233-b3ad-1c5b4e4f3f0e"
        ],
        "loaded_policies": {
            "b2f10e35-9ab9-4233-b3ad-1c5b4e4f3f0e": {
                "name": "allow-admins-policy",
                "rules_count": 3,
                "combining": "deny_overrides",
                "version": "1.0.0",
                "oidc_issuer": "https://sts.windows.net/..."
            }
        },
        "metrics": {
            "total_decisions": 10000,
            "allow_count": 9500,
            "deny_count": 500,
            "error_count": 0
        },
        "token_cache": {
            "size": 250,
            "max_size": 10000,
            "hits": 8750,
            "misses": 1250,
            "hit_rate": 0.875
        }
    }
}
```

## Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `message` | string | `"PONG"` if request sent `"PING"`, otherwise `"Heartbeat received"` |
| `timestamp` | string | ISO 8601 UTC timestamp of the response |
| `control_plane_status` | string | Always `"healthy"` (if the control plane responds, it's healthy) |
| `abac_engine_status` | string | One of: `"healthy"`, `"unhealthy"`, `"unreachable"`, `"unknown"` |
| `abac_engine` | object | Present only when `abac_engine_status` is `"healthy"`. Contains engine details. |

### `abac_engine_status` Values

| Value | Meaning | Frontend Action |
|-------|---------|-----------------|
| `"healthy"` | Engine is running and accepting decisions | Show green status indicator |
| `"unhealthy"` | Engine responded but is not started | Show yellow/warning indicator |
| `"unreachable"` | Engine did not respond (down or network issue) | Show red/error indicator |
| `"unknown"` | Could not determine status | Show grey/unknown indicator |

### `abac_engine` Object (when healthy)

| Field | Type | Description |
|-------|------|-------------|
| `registered_services` | array of strings | Service IDs with active OIDC configs |
| `loaded_policies` | object | Map of service_id → policy summary |
| `metrics` | object | Decision counters: `total_decisions`, `allow_count`, `deny_count`, `error_count` |
| `token_cache` | object | Cache stats: `size`, `max_size`, `hits`, `misses`, `hit_rate` |

## Frontend Implementation Notes

1. **Polling**: The heartbeat is typically called every 30 seconds by the dataplane. The frontend can call it on-demand or piggyback on existing polling.

2. **ABAC engine details** are only included when the engine is healthy. Always check `abac_engine_status` before accessing `abac_engine`.

3. **Metrics display**: The `token_cache.hit_rate` is a float between 0.0 and 1.0 — multiply by 100 to show as percentage.

4. **Policy count**: Use `Object.keys(response.abac_engine.loaded_policies).length` to get the number of active policies.
