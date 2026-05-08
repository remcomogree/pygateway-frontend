import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  IconX,
  IconArrowRight,
  IconUser,
  IconShield,
  IconRoute,
  IconPuzzle,
  IconServer,
  IconLock,
  IconKey,
  IconBug,
  IconCloud,
  IconRefresh,
  IconSitemap,
} from '@tabler/icons-react';
import { useAppState } from '../../context/AppState';

// ------- Style maps (from guide) -------
const NODE_COLORS = {
  client:         'bg-blue-lt text-blue',
  security:       'bg-red-lt text-red',
  route:          'bg-cyan-lt text-cyan',
  plugin:         'bg-purple-lt text-purple',
  service:        'bg-green-lt text-green',
  abac_policy:    'bg-orange-lt text-orange',
  service_policy: 'bg-yellow-lt text-yellow',
  debug:          'bg-gray-lt text-muted',
  upstream:       'bg-teal-lt text-teal',
};

const STATUS_CLS = {
  active:   'bg-success',
  disabled: 'bg-warning',
  inactive: 'bg-secondary',
};

const ICON_MAP = {
  user:    IconUser,
  shield:  IconShield,
  route:   IconRoute,
  puzzle:  IconPuzzle,
  server:  IconServer,
  lock:    IconLock,
  key:     IconKey,
  bug:     IconBug,
  cloud:   IconCloud,
};

// ------- Sub-components -------

function NodeCard({ node, isSelected, onClick }) {
  const active  = node.status === 'active';
  const colorCls = active
    ? (NODE_COLORS[node.type] || 'bg-secondary-lt text-secondary')
    : 'bg-secondary-lt text-muted';
  const Icon = ICON_MAP[node.icon] || IconServer;

  return (
    <div
      className={`card card-sm ${colorCls}`}
      style={{
        minWidth: 110,
        maxWidth: 160,
        cursor: 'pointer',
        border: isSelected ? '2px solid var(--tblr-primary)' : '1px solid transparent',
        boxShadow: isSelected ? '0 0 0 3px rgba(32,107,196,.25)' : undefined,
        transition: 'box-shadow 0.15s, border 0.15s',
        opacity: active ? 1 : 0.65,
      }}
      onClick={() => onClick(node)}
      title={node.description || node.label}
    >
      <div className="card-body p-2">
        <div className="d-flex align-items-start gap-2">
          <Icon size={15} className="flex-shrink-0 mt-1" />
          <div style={{ overflow: 'hidden' }}>
            <div className="fw-semibold" style={{ fontSize: '0.75rem', lineHeight: 1.3 }}>{node.label}</div>
            {node.scope && (
              <div
                style={{ fontSize: '0.6rem', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase',
                  color: node.scope === 'global' ? 'var(--tblr-yellow)' :
                         node.scope === 'route'  ? 'var(--tblr-cyan)'  : 'var(--tblr-purple)' }}
              >
                {node.scope === 'global' ? '⬡ global' : node.scope === 'route' ? '→ route' : '◆ service'}
              </div>
            )}
          </div>
        </div>
        {!active && (
          <span className={`badge mt-1 ${STATUS_CLS[node.status] || 'bg-secondary'}`} style={{ fontSize: '0.6rem' }}>
            {node.status}
          </span>
        )}
      </div>
    </div>
  );
}

function SummaryBar({ summary }) {
  const items = [
    { label: 'Routes',          value: summary.routes,                          icon: IconRoute,  color: 'azure' },
    { label: 'Global Plugins',  value: summary.global_plugins ?? 0,             icon: IconPuzzle, color: 'yellow' },
    { label: 'Service Plugins', value: summary.service_plugins,                 icon: IconPuzzle, color: 'purple' },
    { label: 'Route Plugins',   value: summary.route_plugins,                   icon: IconPuzzle, color: 'indigo' },
    { label: 'ABAC Policies',   value: summary.abac_policies,                   icon: IconLock,   color: 'orange' },
    { label: 'Role Policy',     value: summary.role_policy ? 'Active' : 'None', icon: IconKey,    color: summary.role_policy   ? 'yellow'  : 'secondary' },
    { label: 'Debug',           value: summary.debug_active ? 'Active' : 'Off', icon: IconBug,    color: summary.debug_active  ? 'green'   : 'secondary' },
  ];

  return (
    <div className="d-flex flex-wrap gap-2 mb-1">
      {items.map(({ label, value, icon: Icon, color }) => (
        <div
          key={label}
          className={`alert alert-${color} d-inline-flex align-items-center gap-2 py-1 px-3 mb-0`}
          style={{ fontSize: '0.8rem' }}
        >
          <Icon size={14} />
          <strong>{value}</strong>
          <span className="text-muted fw-normal">{label}</span>
        </div>
      ))}
    </div>
  );
}

function NodeDetail({ node, onClose }) {
  const Icon = ICON_MAP[node.icon] || IconServer;
  const colorCls = NODE_COLORS[node.type] || 'bg-secondary-lt text-secondary';

  const renderValue = (v) => {
    if (v === null || v === undefined) return <span className="text-muted">—</span>;
    if (typeof v === 'boolean') return v
      ? <span className="badge bg-success-lt text-success">Yes</span>
      : <span className="badge bg-secondary-lt text-secondary">No</span>;
    if (Array.isArray(v)) return v.length
      ? <span className="text-wrap">{v.join(', ')}</span>
      : <span className="text-muted">—</span>;
    if (typeof v === 'object') return (
      <code style={{ fontSize: '0.7rem', wordBreak: 'break-all' }}>{JSON.stringify(v)}</code>
    );
    return <span className="text-wrap" style={{ wordBreak: 'break-all' }}>{String(v)}</span>;
  };

  return (
    <div className="card h-100" style={{ position: 'sticky', top: 0 }}>
      <div className="card-header">
        <div className="card-title d-flex align-items-center gap-2">
          <span className={`badge ${colorCls} p-1`}>
            <Icon size={14} />
          </span>
          <span style={{ fontSize: '0.85rem' }}>{node.label}</span>
        </div>
        <div className="card-options d-flex align-items-center gap-2">
          <span className={`badge ${STATUS_CLS[node.status] || 'bg-secondary'}`}>{node.status}</span>
          <button className="btn btn-sm btn-ghost-secondary" onClick={onClose} title="Close detail">
            <IconX size={14} />
          </button>
        </div>
      </div>
      {node.description && (
        <div className="border-bottom px-3 py-2">
          <p className="text-muted mb-0" style={{ fontSize: '0.8rem' }}>{node.description}</p>
        </div>
      )}
      <div className="table-responsive" style={{ maxHeight: 380, overflowY: 'auto' }}>
        <table className="table table-sm table-vcenter card-table">
          <tbody>
            {Object.entries(node.details || {}).length === 0 ? (
              <tr><td className="text-muted text-center py-3">No details available</td></tr>
            ) : Object.entries(node.details || {}).map(([k, v]) => (
              <tr key={k}>
                <td className="text-muted text-nowrap" style={{ width: '45%', fontSize: '0.75rem' }}>
                  {k.replace(/_/g, ' ')}
                </td>
                <td style={{ fontSize: '0.75rem' }}>{renderValue(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ------- Main Modal -------
export default function ServiceVisualizeModal({ isOpen, service, onClose }) {
  const { rawApi } = useAppState();
  const [data, setData]               = useState(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const fetchData = async () => {
    if (!service?.id) return;
    setLoading(true);
    setError(null);
    try {
      const ts  = Date.now();
      const res = await rawApi.request(`/api/v1/services/${service.id}/visualize?_ts=${ts}`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && service?.id) {
      fetchData();
      setSelectedNode(null);
    }
    if (!isOpen) {
      setData(null);
      setError(null);
      setSelectedNode(null);
    }
  }, [isOpen, service?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!isOpen) return null;

  // Build node lookup
  const nodeMap    = data ? Object.fromEntries(data.nodes.map(n => [n.id, n])) : {};
  const pipelineSet = new Set(data?.pipeline || []);
  const sideNodes  = data?.nodes.filter(n => !pipelineSet.has(n.id)) || [];

  // Group side nodes by their upstream pipeline parent
  const parentOf = {};
  data?.edges?.forEach(e => {
    if (!pipelineSet.has(e.to) && pipelineSet.has(e.from)) {
      parentOf[e.to] = e.from;
    }
  });

  const handleNodeClick = (node) => {
    setSelectedNode(prev => prev?.id === node.id ? null : node);
  };

  const isNotFound  = error && (error.includes('404') || error.toLowerCase().includes('not found'));
  const is503       = error && (error.includes('503') || error.toLowerCase().includes('unavailable'));

  return createPortal(
    <>
      <div className="modal-backdrop fade show" />
      <div
        className="modal modal-blur fade show"
        style={{ display: 'block' }}
        onClick={onClose}
      >
        <div
          className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable"
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-content">

            {/* Header */}
            <div className="modal-header">
              <IconSitemap size={20} className="me-2 text-primary flex-shrink-0" />
              <h5 className="modal-title text-truncate" style={{ maxWidth: '60%' }}>
                Pipeline: <span className="text-primary">{service?.name}</span>
              </h5>
              <div className="ms-auto d-flex align-items-center gap-2">
                <button
                  className="btn btn-sm btn-ghost-secondary"
                  onClick={fetchData}
                  disabled={loading}
                  title="Refresh visualization"
                >
                  <IconRefresh size={16} className={loading ? 'spin' : ''} />
                </button>
                <button type="button" className="btn-close" onClick={onClose} />
              </div>
            </div>

            {/* Body */}
            <div className="modal-body" style={{ minHeight: 300 }}>
              {loading && (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary mb-2" />
                  <p className="text-muted">Loading pipeline…</p>
                </div>
              )}

              {!loading && error && (
                <div className={`alert ${isNotFound || is503 ? 'alert-warning' : 'alert-danger'} d-flex align-items-start gap-3`}>
                  <div>
                    <strong>
                      {isNotFound
                        ? 'Visualization not available'
                        : is503
                        ? 'Service unavailable'
                        : 'Failed to load visualization'}
                    </strong>
                    <div className="mt-1 small">{error}</div>
                  </div>
                  <button className="btn btn-sm btn-ghost-secondary ms-auto flex-shrink-0" onClick={fetchData}>
                    Retry
                  </button>
                </div>
              )}

              {!loading && data && (
                <div className="row g-3">

                  {/* Summary bar */}
                  <div className="col-12">
                    <SummaryBar summary={data.summary} />
                  </div>

                  {/* Pipeline flow + optionally detail panel */}
                  <div className={selectedNode ? 'col-8' : 'col-12'}>

                    {/* Main pipeline */}
                    <div className="card mb-3">
                      <div className="card-header">
                        <h3 className="card-title">Request Pipeline</h3>
                        <div className="card-options text-muted small">
                          Click a node to inspect
                        </div>
                      </div>
                      <div className="card-body pb-3">
                        {/* Step order label */}
                        <div className="text-muted mb-3" style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>
                          client → route → owasp → global plugins → service → policies → upstream
                        </div>
                        <div
                          className="d-flex align-items-start flex-wrap gap-2"
                          style={{ overflowX: 'auto', paddingBottom: 4 }}
                        >
                          {(data.pipeline || []).map((nodeId, i) => {
                            const node = nodeMap[nodeId];
                            if (!node) return null;
                            return (
                              <React.Fragment key={nodeId}>
                                {i > 0 && (
                                  <IconArrowRight size={16} className="text-muted flex-shrink-0 mt-3" />
                                )}
                                <div className="d-flex flex-column align-items-center gap-1">
                                  <span
                                    className="badge bg-secondary-lt text-secondary"
                                    style={{ fontSize: '0.6rem', lineHeight: 1 }}
                                  >
                                    step {i + 1}
                                  </span>
                                  <NodeCard
                                    node={node}
                                    isSelected={selectedNode?.id === node.id}
                                    onClick={handleNodeClick}
                                  />
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Side / attached nodes */}
                    {sideNodes.length > 0 && (
                      <div className="card">
                        <div className="card-header">
                          <h3 className="card-title">Attached Components</h3>
                          <div className="card-options text-muted small">
                            {sideNodes.length} component{sideNodes.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                        <div className="card-body">
                          {/* Plugins grouped by scope, then other types */}
                          {[
                            { key: 'global-plugin',  label: '⬡ Global Plugins',  filter: n => n.type === 'plugin' && n.scope === 'global' },
                            { key: 'service-plugin', label: '◆ Service Plugins', filter: n => n.type === 'plugin' && n.scope === 'service' },
                            { key: 'route-plugin',   label: '→ Route Plugins',   filter: n => n.type === 'plugin' && n.scope === 'route' },
                            { key: 'plugin-other',   label: 'Plugins',            filter: n => n.type === 'plugin' && !n.scope },
                            { key: 'abac_policy',    label: 'ABAC Policies',      filter: n => n.type === 'abac_policy' },
                            { key: 'service_policy', label: 'Role Policies',      filter: n => n.type === 'service_policy' },
                            { key: 'debug',          label: 'Debug',              filter: n => n.type === 'debug' },
                            { key: 'route',          label: 'Routes',             filter: n => n.type === 'route' },
                          ].map(({ key, label, filter }) => {
                            const nodes = sideNodes.filter(filter);
                            if (nodes.length === 0) return null;
                            return (
                              <div key={key} className="mb-3">
                                <div
                                  className="text-muted mb-2"
                                  style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}
                                >
                                  {label}
                                </div>
                                <div className="d-flex flex-wrap gap-2">
                                  {nodes.map(n => (
                                    <NodeCard
                                      key={n.id}
                                      node={n}
                                      isSelected={selectedNode?.id === n.id}
                                      onClick={handleNodeClick}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                          {/* Catch-all for any unclassified node types */}
                          {sideNodes
                            .filter(n => !['plugin','abac_policy','service_policy','debug','route'].includes(n.type))
                            .length > 0 && (
                            <div className="d-flex flex-wrap gap-2 mt-2">
                              {sideNodes
                                .filter(n => !['plugin','abac_policy','service_policy','debug','route'].includes(n.type))
                                .map(n => (
                                  <NodeCard
                                    key={n.id}
                                    node={n}
                                    isSelected={selectedNode?.id === n.id}
                                    onClick={handleNodeClick}
                                  />
                                ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Detail panel */}
                  {selectedNode && (
                    <div className="col-4">
                      <NodeDetail node={selectedNode} onClose={() => setSelectedNode(null)} />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {data && (
              <div className="modal-footer justify-content-start py-2">
                <small className="text-muted">
                  Generated {new Date(data.generated_at).toLocaleString()}
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
