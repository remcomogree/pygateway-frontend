# WebSocket Proxying & Request Buffering/Streaming — API Reference

## Overview

Two new service-level fields control WebSocket proxying and request body streaming:

| Field | Type | Default | Description |
|---|---|---|---|
| `websocket_enabled` | `boolean` | `false` | When `true`, the data plane accepts WebSocket upgrade requests for routes belonging to this service and proxies them bidirectionally to the upstream. |
| `request_buffer_size` | `integer \| null` | `null` | Threshold in **bytes**. When a request body's `Content-Length` exceeds this value the data plane streams the body to the upstream instead of buffering it in memory. `null` means always buffer (existing behaviour). |

These fields are available on the existing **Service** CRUD endpoints.

---

## Endpoints

### Create Service — `POST /services/`

New optional fields in the request body:

```json
{
  "name": "my-ws-service",
  "workspace_id": "<workspace-id>",
  "host": "echo.example.com",
  "port": 8080,
  "protocol": "http",
  "websocket_enabled": true,
  "request_buffer_size": 1048576,
  "streaming": true
}
```

| Field | Required | Default | Notes |
|---|---|---|---|
| `websocket_enabled` | No | `false` | Set to `true` to allow WebSocket connections. |
| `request_buffer_size` | No | `null` | Set to a byte threshold (e.g. `1048576` = 1 MB). Bodies larger than this are streamed. |
| `streaming` | No | `false` | Enables streaming **responses** from upstream (already existed). |

### Update Service — `PUT /services/{service_id}`

Same fields, all optional:

```json
{
  "websocket_enabled": true,
  "request_buffer_size": 5242880
}
```

### Get Service — `GET /services/{service_id}`

Response now includes:

```json
{
  "id": "...",
  "name": "my-ws-service",
  "websocket_enabled": true,
  "request_buffer_size": 1048576,
  "streaming": true,
  ...
}
```

### List Services — `GET /services/?offset=0&limit=100`

Each item in `items` contains the new fields.

---

## Behaviour

### WebSocket Proxying

1. Client sends a WebSocket upgrade request to any route path on the data plane (port 8000 / 8003).
2. The data plane matches the path against configured routes (same routing engine as HTTP).
3. If the matched service has `websocket_enabled: false` (default), the connection is closed with code `1008` ("WebSocket not enabled for this service").
4. If enabled, the data plane opens a `ws://` or `wss://` connection to the upstream service and relays frames bidirectionally (text and binary).
5. When either side disconnects, the other side is closed gracefully.

**Headers forwarded**: `authorization`, `cookie`, `sec-websocket-protocol`, `x-request-id`.

**Max message size**: Controlled by `request_buffer_size` on the service (defaults to 10 MB if not set).

### Request Buffering vs Streaming

| Scenario | Behaviour |
|---|---|
| `request_buffer_size` is `null` | Body is fully buffered in memory before forwarding (default, existing behaviour). |
| `request_buffer_size` is set and `Content-Length <= request_buffer_size` | Body is buffered normally. |
| `request_buffer_size` is set and `Content-Length > request_buffer_size` | Body is streamed chunk-by-chunk to upstream without buffering the full payload. Size validation is skipped (cannot check total size when streaming). |
| `streaming: true` and no `Content-Length` header (chunked) | Body is streamed to upstream. |

---

## UI Implementation Notes

### Service Form

Add two new fields to the service create/edit form:

1. **WebSocket Enabled** — Toggle/checkbox, maps to `websocket_enabled`.
2. **Request Buffer Size** — Numeric input (bytes) with optional helper text (e.g. "Leave empty to always buffer. Set to a value like 1048576 for 1 MB threshold."). Maps to `request_buffer_size`. Can be `null`.

### Service List/Detail

Display the new fields alongside existing ones like `streaming`, `max_request_size`, `max_response_size`.

### Validation

- `request_buffer_size` must be a positive integer or `null`.
- `websocket_enabled` must be a boolean.
- No cross-field dependencies — both fields are independently optional.
