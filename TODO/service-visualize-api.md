# Service Visualize API — Frontend Implementation Guide

## Endpoint

```
GET /api/v1/services/{service_id}/visualize
```

Returns a graph-ready JSON structure describing the full request pipeline for a service.

**Actual pipeline order** (matches the dataplane orchestration):
```
client → route(s) → owasp_security → global_plugins → service → service_plugins → abac/policy → upstream
```

- **Route matching** happens first — before OWASP, before any plugin
- **OWASP** inspects the already-matched request (step 3b in orchestration)
- **Global plugins** (no `service_id`, no `route_id`) run after OWASP for every request
- **Service plugins** run in cert → rewrite → access phase order
- **ABAC / Role policies** enforce access after service plugins

---

## Response Shape

```ts
interface VisualizeResponse {
  service_id: string;
  service_name: string;
  generated_at: string; // ISO-8601
  summary: {
    routes: number;
    global_plugins: number;   // plugins with no service_id and no route_id
    route_plugins: number;
    service_plugins: number;
    abac_policies: number;
    role_policy: boolean;
    debug_active: boolean;
  };
  nodes: Node[];
  edges: Edge[];
  pipeline: string[]; // ordered node IDs for the main linear flow
}

interface Node {
  id: string;
  type: NodeType;
  label: string;
  description: string;
  icon: string;         // Tabler icon name (see icon map below)
  status: "active" | "disabled" | "inactive";
  scope?: "global" | "service" | "route"; // only on plugin nodes
  service_id?: string;              // only on service-scoped plugins
  route_id?: string;                // only on route-scoped plugins
  details: Record<string, unknown>; // type-specific fields
}

interface Edge {
  id: string;
  from: string;   // node id
  to: string;     // node id
  label: string;
  type: "request" | "match" | "forward" | "plugin" | "policy" | "debug";
}

type NodeType =
  | "client"
  | "security"
  | "route"
  | "plugin"
  | "service"
  | "abac_policy"
  | "service_policy"
  | "debug"
  | "upstream";
```

---

## Node Types and Their `details` Fields

### `client`
```ts
{}  // no extra details
```

### `security` (OWASP)
```ts
{
  sql_injection_detection: boolean;
  xss_detection: boolean;
  path_traversal_detection: boolean;
  ssrf_prevention: boolean;
  scanner_detection: boolean;
  ip_allowlist_blocklist: boolean;
  max_request_size_bytes: number;
  enforce_https: boolean;
  content_security_policy: string;
}
```

### `route`
```ts
{
  id: string;
  name: string;
  protocols: string[];
  methods: string[];
  hosts: string[];
  paths: string[];
  strip_path: boolean;
  preserve_host: boolean;
  regex_priority: number;
}
```

### `plugin`
```ts
{
  id: string;
  name: string;           // plugin type key, e.g. "jwt-auth", "rate-limit"
  priority: number;
  config: Record<string, unknown>;  // plugin-specific config
}
```

### `service`
```ts
{
  id: string;
  name: string;
  protocol: string;
  host: string;
  port: number;
  path: string;
  connect_timeout_ms: number;
  read_timeout_ms: number;
  write_timeout_ms: number;
  retries: number;
  streaming: boolean;
  websocket_enabled: boolean;
  max_request_size_bytes: number | null;
  max_response_size_bytes: number | null;
}
```

### `abac_policy`
```ts
{
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  oidc_issuer: string;
  oidc_audience: string;
  rules_count: number;
}
```

### `service_policy`
```ts
{
  id: string;
  required_roles: string[];
  enabled: boolean;
}
```

### `debug`
```ts
{
  enabled: boolean;
  expires_at: string | null;  // ISO-8601 or null
  phases_tracked: string[];
}
```

### `upstream`
```ts
{
  url: string;          // full URL e.g. "http://backend.example.com:8080/"
  host: string;
  port: number;
  protocol: string;
  path: string;
}
```

---

## Example Response (Minimal Service)

```json
{
  "service_id": "b2f10e35-9ab9-4233-b3ad-1c5b4e4f3f0e",
  "service_name": "testremog",
  "generated_at": "2026-04-24T10:00:00.000000+00:00",
  "summary": {
    "routes": 1,
    "route_plugins": 0,
    "service_plugins": 1,
    "abac_policies": 1,
    "role_policy": false,
    "debug_active": true
  },
  "nodes": [
    { "id": "client", "type": "client", "label": "Client", ... },
    { "id": "owasp_security", "type": "security", "label": "OWASP Security", ... },
    { "id": "route_50ba96...", "type": "route", "label": "Route: testroute", ... },
    { "id": "service_b2f10e...", "type": "service", "label": "Service: testremog", ... },
    { "id": "plugin_aa11bb...", "type": "plugin", "label": "rate-limit", "scope": "service", ... },
    { "id": "abac_cc22dd...", "type": "abac_policy", "label": "ABAC: allow-admins-policy", ... },
    { "id": "debug_collector", "type": "debug", "label": "Debug Collector", "status": "active", ... },
    { "id": "upstream", "type": "upstream", "label": "Upstream: mybackend.internal", ... }
  ],
  "edges": [
    { "id": "e_client_owasp", "from": "client", "to": "owasp_security", "label": "request", "type": "request" },
    { "id": "e_owasp_50ba96...", "from": "owasp_security", "to": "route_50ba96...", "label": "match", "type": "match" },
    { "id": "e_50ba96..._service", "from": "route_50ba96...", "to": "service_b2f10e...", "label": "forward", "type": "forward" },
    { "id": "e_service_aa11bb...", "from": "service_b2f10e...", "to": "plugin_aa11bb...", "label": "execute", "type": "plugin" },
    { "id": "e_service_cc22dd...", "from": "service_b2f10e...", "to": "abac_cc22dd...", "label": "enforce", "type": "policy" },
    { "id": "e_service_debug", "from": "service_b2f10e...", "to": "debug_collector", "label": "trace", "type": "debug" },
    { "id": "e_service_upstream", "from": "service_b2f10e...", "to": "upstream", "label": "proxy", "type": "request" }
  ],
  "pipeline": [
    "client",
    "owasp_security",
    "service_b2f10e...",
    "abac_cc22dd...",
    "upstream"
  ]
}
```

---

## Tabler Implementation Guide

### 1. Install Dependencies

```bash
npm install @tabler/core @tabler/icons-react
```

### 2. Tabler Icon Map

Map `node.icon` values to Tabler icon components:

```ts
import {
  IconUser,
  IconShield,
  IconRoute,
  IconPuzzle,
  IconServer,
  IconLock,
  IconKey,
  IconBug,
  IconCloud,
} from "@tabler/icons-react";

const ICON_MAP: Record<string, React.ComponentType> = {
  user: IconUser,
  shield: IconShield,
  route: IconRoute,
  puzzle: IconPuzzle,
  server: IconServer,
  lock: IconLock,
  key: IconKey,
  bug: IconBug,
  cloud: IconCloud,
};
```

### 3. Node Color Scheme (Tabler semantic colors)

```ts
const NODE_COLORS: Record<string, string> = {
  client:         "bg-blue-lt text-blue",
  security:       "bg-red-lt text-red",
  route:          "bg-cyan-lt text-cyan",
  plugin:         "bg-purple-lt text-purple",
  service:        "bg-green-lt text-green",
  abac_policy:    "bg-orange-lt text-orange",
  service_policy: "bg-yellow-lt text-yellow",
  debug:          "bg-gray-lt text-muted",
  upstream:       "bg-teal-lt text-teal",
};

// For disabled/inactive nodes:
const DISABLED_BADGE = "bg-muted text-muted";
```

### 4. Edge Style Map

```ts
const EDGE_STYLES: Record<string, { stroke: string; dashed: boolean }> = {
  request: { stroke: "#206bc4", dashed: false },
  match:   { stroke: "#0ca678", dashed: false },
  forward: { stroke: "#0ca678", dashed: false },
  plugin:  { stroke: "#ae3ec9", dashed: true },
  policy:  { stroke: "#f76707", dashed: true },
  debug:   { stroke: "#adb5bd", dashed: true },
};
```

### 5. Rendering the Pipeline (Linear Flow)

The `pipeline` array gives you the main linear left-to-right flow. Use it to render the primary "happy path" lane. Everything else (plugins, debug, policies) hangs off the main lane as child nodes.

```tsx
// Simple horizontal pipeline using Tabler cards
function Pipeline({ pipeline, nodes }: { pipeline: string[]; nodes: Node[] }) {
  const nodeMap = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className="d-flex align-items-center gap-3 flex-wrap">
      {pipeline.map((nodeId, i) => {
        const node = nodeMap[nodeId];
        if (!node) return null;
        const Icon = ICON_MAP[node.icon] ?? IconServer;
        return (
          <React.Fragment key={nodeId}>
            {i > 0 && <IconArrowRight className="text-muted" size={18} />}
            <div className={`card card-sm p-2 ${NODE_COLORS[node.type]}`}>
              <div className="d-flex align-items-center gap-2">
                <Icon size={16} />
                <span className="fw-medium">{node.label}</span>
                {node.status !== "active" && (
                  <span className="badge bg-muted ms-1">{node.status}</span>
                )}
              </div>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}
```

### 6. Full DAG Rendering with React Flow

For a proper directed-graph view (like the Kong Konnect screenshot), use **React Flow**:

```bash
npm install reactflow
```

```tsx
import ReactFlow, { Node as RFNode, Edge as RFEdge } from "reactflow";
import "reactflow/dist/style.css";

function ServiceFlowDiagram({ data }: { data: VisualizeResponse }) {
  // Convert API nodes to React Flow nodes with auto-layout positions
  const rfNodes: RFNode[] = data.nodes.map((node, i) => ({
    id: node.id,
    type: "default",
    position: getLayoutPosition(node, data.pipeline, i), // see layout section
    data: {
      label: (
        <div className={`d-flex align-items-center gap-2 p-1 rounded ${NODE_COLORS[node.type]}`}>
          {React.createElement(ICON_MAP[node.icon] ?? IconServer, { size: 14 })}
          <span style={{ fontSize: 12 }}>{node.label}</span>
        </div>
      ),
    },
  }));

  const rfEdges: RFEdge[] = data.edges.map(edge => ({
    id: edge.id,
    source: edge.from,
    target: edge.to,
    label: edge.label,
    animated: edge.type === "request" || edge.type === "forward",
    style: {
      stroke: EDGE_STYLES[edge.type]?.stroke ?? "#adb5bd",
      strokeDasharray: EDGE_STYLES[edge.type]?.dashed ? "5 5" : undefined,
    },
  }));

  return (
    <div style={{ height: 500 }}>
      <ReactFlow nodes={rfNodes} edges={rfEdges} fitView>
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}
```

### 7. Auto-Layout Logic

Since the API does not return `x/y` positions, compute them from the pipeline and node type:

```ts
function getLayoutPosition(node: Node, pipeline: string[], index: number) {
  const LANE_Y: Record<NodeType, number> = {
    client:         200,
    security:       200,
    route:          200,
    plugin:         380,   // below main lane
    service:        200,
    abac_policy:    380,
    service_policy: 380,
    debug:          380,
    upstream:       200,
  };
  const pipelineIndex = pipeline.indexOf(node.id);
  const x = pipelineIndex >= 0 ? pipelineIndex * 200 : index * 200;
  return { x, y: LANE_Y[node.type] ?? 200 };
}
```

### 8. Node Detail Panel

When a user clicks a node, show its `details` in a Tabler side panel:

```tsx
function NodeDetailPanel({ node }: { node: Node | null }) {
  if (!node) return null;

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{node.label}</h3>
        <span className={`badge ms-2 ${node.status === "active" ? "bg-success" : "bg-muted"}`}>
          {node.status}
        </span>
      </div>
      <div className="card-body">
        <p className="text-muted">{node.description}</p>
        <table className="table table-sm table-card">
          <tbody>
            {Object.entries(node.details).map(([k, v]) => (
              <tr key={k}>
                <td className="text-muted" style={{ width: "40%" }}>{k}</td>
                <td>
                  {Array.isArray(v) ? v.join(", ") || "—"
                    : v === null || v === undefined ? "—"
                    : String(v)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

### 9. Summary Bar

Use the `summary` object to render quick stats at the top:

```tsx
function SummaryBar({ summary }: { summary: VisualizeResponse["summary"] }) {
  return (
    <div className="row g-2 mb-3">
      {[
        { label: "Routes", value: summary.routes, icon: IconRoute, color: "blue" },
        { label: "Route Plugins", value: summary.route_plugins, icon: IconPuzzle, color: "purple" },
        { label: "Service Plugins", value: summary.service_plugins, icon: IconPuzzle, color: "purple" },
        { label: "ABAC Policies", value: summary.abac_policies, icon: IconLock, color: "orange" },
        { label: "Debug", value: summary.debug_active ? "Active" : "Off", icon: IconBug,
          color: summary.debug_active ? "green" : "muted" },
      ].map(({ label, value, icon: Icon, color }) => (
        <div key={label} className="col-auto">
          <div className={`alert alert-${color} d-flex align-items-center gap-2 py-2 px-3 mb-0`}>
            <Icon size={16} />
            <strong>{value}</strong>
            <span className="text-muted">{label}</span>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### 10. Complete Page Example

```tsx
import { useEffect, useState } from "react";
import ReactFlow, { Background, Controls } from "reactflow";

export function ServiceVisualizePage({ serviceId }: { serviceId: string }) {
  const [data, setData] = useState<VisualizeResponse | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    fetch(`/api/v1/services/${serviceId}/visualize`)
      .then(r => r.json())
      .then(setData);
  }, [serviceId]);

  if (!data) return <div className="spinner-border" />;

  return (
    <div className="container-xl py-4">
      <div className="page-header">
        <div className="page-title">
          <h2>{data.service_name}</h2>
          <small className="text-muted">Service pipeline visualization</small>
        </div>
      </div>

      <SummaryBar summary={data.summary} />

      <div className="row g-3">
        <div className={selectedNode ? "col-8" : "col-12"}>
          <div className="card" style={{ height: 520 }}>
            <div className="card-body p-0">
              <ServiceFlowDiagram
                data={data}
                onNodeClick={node => setSelectedNode(node)}
              />
            </div>
          </div>
        </div>
        {selectedNode && (
          <div className="col-4">
            <NodeDetailPanel node={selectedNode} />
          </div>
        )}
      </div>
    </div>
  );
}
```

---

## Pipeline Node Order

The `pipeline` array always follows this order (nodes may be absent if not configured):

| Position | Node ID | Always present? |
|---|---|---|
| 1 | `client` | ✅ |
| 2 | `owasp_security` | ✅ |
| 3 | `service_{id}` | ✅ |
| 4 | `abac_{id}` | Only if ABAC policy exists |
| 5 | `policy_{id}` | Only if role policy exists |
| 6 | `upstream` | ✅ |

Route nodes and plugin nodes in the `nodes` array are attached via `edges` but are **not** in `pipeline` since routes fan out laterally rather than sequentially on the main path.
