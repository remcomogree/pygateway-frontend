# PyGateway Admin UI

React + [Tabler](https://tabler.io/) admin interface for PyGateway.

## Quick Start

```bash
npm install
npm run dev        # development server (proxies /api/v1/* → localhost:8001)
npm run build      # production build → dist/
npm run test:run   # run test suite
npm run lint       # ESLint
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 |
| UI | Tabler 1.4 + `@tabler/icons-react` |
| Build | Vite |
| State | React Context + reducer (`AppState.jsx`) |
| Validation | Zod |
| Charts | Chart.js + react-chartjs-2 |
| Routing | React Router v6 |
| Tests | Vitest + Cypress (E2E) |

## Features

### Dashboard
- Live stat cards: workspaces, services, routes, plugins, consumers
- Auto-refresh every 30 s
- System configuration display
- Backend health monitoring

### API Management (`/api`)
- **Workspaces** — CRUD with service-count display
- **Services** — CRUD, provider integration, streaming & buffer config
- **Routes** — Path/host/method/protocol management, service association
- **Plugins** — Dynamic schema-driven config, scope targeting, enable/disable
- **ABAC Policies** — Attribute-based access control rules + OIDC engine management

### Security
- **Consumers** — User/API-key lifecycle management
- **API Keys** — Generation, revocation, usage tracking
- **Consumer Policies** — Role and method-level permissions per consumer
- **Service Policies** — Required-role enforcement per service

### Dataplanes
Fetches `/api/v1/websocket/status` (auto-refresh every 30 s) and displays:

- **Summary stat cards** — Online/offline counts, active WS connections, connected dataplanes, max-connection utilisation bar, known fingerprint count
- **WebSocket Infrastructure card** — enabled/running state, connection utilisation progress bar
- **Root CA card** — subject, expiry date, CRL revoke count
- **Dataplane list + detail split panel** — scrollable list of up to 500 dataplanes; click any entry to see:
  - IP/port, last-seen (relative + absolute UTC-corrected datetime)
  - WebSocket status badge, connection ID
  - Last certificate renewed (relative + absolute datetime)
  - Root cert fingerprint (short + full on hover)
  - Per-worker table: heartbeat status, uptime, last ACK age, messages sent, send-queue depth/capacity progress bar
- **Active Connections section** — collapsible per-dataplane cards showing all workers
- **Known Root Fingerprints table** — full fingerprint, short hash, source IP, first seen

> Timestamps from the backend (bare ISO strings without timezone) are forced to UTC before display so relative times are always correct regardless of the browser's local timezone.

### Debug
Three views for inspecting live request traces:
- **Tabular** (`DebugView`) — paginated log with overlay detail
- **Graphical** (`GraphicalDebugView`) — flow diagram per request phase
- **Fancy/Animated** (`FancyGraphicalDebugView`) — interactive animated trace with timing breakdown
- **Trace** (`TraceDebugView`) — timeline view aligned to actual backend phase names

### Administration (`/admin`)
- **Audit Logs** — filterable by method, username, resource type, status code, source IP, date range; pagination; purge by date (superadmin only)
- **Certificates** — SSL/TLS upload, SNI config, expiry monitoring

### Analytics
- Request trend charts, service performance metrics, error-rate monitoring

### Providers
- Upstream provider CRUD with timeout, retry, and health-check configuration

### Monetization
- Plans, subscriptions, usage aggregation

### LLM Management (`/llm`)
- Provider config (OpenAI, Anthropic, Azure, Google, …)
- Prompt template management with variable substitution
- Tool/function registry
- PII detection and prompt-injection filtering
- Usage analytics, cost tracking, budget alerts
- Lazy-loaded code-split modules for fast initial load

## RBAC

| Role | Read | Write | Audit Logs | Dataplanes |
|---|---|---|---|---|
| `superadmin` | ✓ | ✓ | ✓ | ✓ |
| `admin` | ✓ | ✓ | — | — |
| `readonly` | ✓ | — | — | — |

Write actions (create/edit/delete buttons) are hidden automatically for `readonly` users.

## Component Structure

```
src/
├── api/
│   ├── PyGatewayAPI.js       # API client with Zod validation & circuit breaker
│   └── schemas.js            # Zod schemas for all resources
├── components/
│   ├── MainLayout.jsx        # Sidebar navigation + routing
│   ├── DashboardView.jsx
│   ├── DataplanesView.jsx    # WebSocket / dataplane status dashboard
│   ├── APIView.jsx
│   ├── SecurityView.jsx
│   ├── AnalyticsView.jsx
│   ├── AdminView.jsx
│   ├── DebugView.jsx
│   ├── TraceDebugView.jsx
│   ├── GraphicalDebugView.jsx
│   ├── FancyGraphicalDebugView.jsx
│   ├── ProvidersView.jsx
│   ├── MonetizationView.jsx
│   ├── ConfigView.jsx
│   ├── LoginView.jsx
│   ├── admin/
│   │   ├── AuditLogsTab.jsx
│   │   └── CertificatesTab.jsx
│   ├── api/
│   │   ├── WorkspacesTab.jsx
│   │   ├── ServicesTab.jsx
│   │   ├── RoutesTab.jsx
│   │   ├── PluginsTab.jsx
│   │   ├── ConsumersTab.jsx
│   │   └── ABACPoliciesTab.jsx
│   ├── modals/
│   │   ├── ServiceModal.jsx
│   │   ├── WorkspaceModal.jsx
│   │   ├── RouteModal.jsx
│   │   ├── ConsumerModal.jsx
│   │   ├── ConsumerPoliciesModal.jsx
│   │   ├── ServicePolicyModal.jsx
│   │   ├── PluginModal.jsx
│   │   ├── ABACPolicyModal.jsx
│   │   ├── ServiceVisualizeModal.jsx
│   │   └── DynamicPluginConfig.jsx
│   ├── shared/
│   │   ├── DataTable.jsx
│   │   ├── StatusBadge.jsx
│   │   └── FilterStatusBar.jsx
│   ├── ui/
│   │   ├── Button.jsx
│   │   ├── Modal.jsx
│   │   └── TablerModal.jsx
│   └── llm/                  # Lazy-loaded LLM management modules
├── context/
│   └── AppState.jsx          # Global state (reducer + API action helpers)
├── utils/
│   └── api.js                # authenticatedFetch, API_BASE_URL
└── main.jsx
```

## API Client

`PyGatewayAPI.js` wraps every endpoint with:
- Automatic `Authorization: Bearer <token>` headers
- Zod request/response validation
- Empty-string → `null` coercion for nullable fields
- Circuit breaker (configurable failure threshold)
- Emoji-prefixed console logging (`🏗️` start, `✅` success, `❌` error)

Backend is expected at `localhost:8001`. The Vite dev proxy rewrites `/api/v1/*` so no base URL is hardcoded in components.

## Deployment

```bash
npm run build      # outputs to dist/
```

Serve `dist/` from any static host. Ensure `/api/v1/*` requests are proxied to the PyGateway backend.

## Troubleshooting

**Dev server won't start**
```bash
rm -rf node_modules package-lock.json && npm install
```

**API errors in browser console**
- Confirm PyGateway backend is running on port 8001
- Check `vite.config.js` proxy target if using a different port