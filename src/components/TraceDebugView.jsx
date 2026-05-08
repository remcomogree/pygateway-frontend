import React, { useState } from 'react';
import {
  IconArrowLeft,
  IconRoute,
  IconServer,
  IconShieldCheck,
  IconArrowBarToDown,
  IconPuzzle,
  IconCertificate,
  IconArrowsExchange,
  IconLock,
  IconUserCheck,
  IconFileCheck,
  IconCloudUpload,
  IconCloud,
  IconAdjustments,
  IconCircleCheck,
  IconChevronRight,
  IconClock,
  IconAlertCircle,
  IconCode,
} from '@tabler/icons-react';

// ─── Phase configuration ────────────────────────────────────────────────────
// Uses the ACTUAL phase names returned by the PyGateway API
const PHASE_CONFIG = {
  route_match:           { Icon: IconRoute,           name: 'Route Match',     color: 'azure',   group: 'request',  order: 1  },
  service_resolve:       { Icon: IconServer,          name: 'Service',         color: 'azure',   group: 'request',  order: 2  },
  owasp_inspection:      { Icon: IconShieldCheck,     name: 'OWASP',           color: 'red',     group: 'request',  order: 3  },
  request_received:      { Icon: IconArrowBarToDown,  name: 'Request In',      color: 'blue',    group: 'request',  order: 4  },
  global_plugins_loaded: { Icon: IconPuzzle,          name: 'Global Plugins',  color: 'teal',    group: 'request',  order: 5  },
  phase_certificate:     { Icon: IconCertificate,     name: 'Certificate',     color: 'yellow',  group: 'request',  order: 6  },
  phase_rewrite:         { Icon: IconArrowsExchange,  name: 'Rewrite',         color: 'orange',  group: 'request',  order: 7  },
  phase_access:          { Icon: IconLock,            name: 'Access',          color: 'pink',    group: 'request',  order: 8  },
  abac_enforcement:      { Icon: IconUserCheck,       name: 'ABAC',            color: 'purple',  group: 'request',  order: 9  },
  policy_enforcement:    { Icon: IconFileCheck,       name: 'Policy',          color: 'indigo',  group: 'request',  order: 10 },
  forward_success:       { Icon: IconCloudUpload,     name: 'Forwarded',       color: 'green',   group: 'response', order: 11 },
  upstream_complete:     { Icon: IconCloud,           name: 'Upstream Done',   color: 'green',   group: 'response', order: 12 },
  response_filters:      { Icon: IconAdjustments,    name: 'Resp. Filters',   color: 'cyan',    group: 'response', order: 13 },
  response_finalized:    { Icon: IconCircleCheck,     name: 'Finalized',       color: 'success', group: 'response', order: 14 },
};

const COLORS = {
  azure:   { bg: 'bg-azure-lt',   text: 'text-azure',   bar: '#4299e1' },
  blue:    { bg: 'bg-blue-lt',    text: 'text-blue',    bar: '#206bc4' },
  teal:    { bg: 'bg-teal-lt',    text: 'text-teal',    bar: '#0ca678' },
  red:     { bg: 'bg-red-lt',     text: 'text-red',     bar: '#d63939' },
  yellow:  { bg: 'bg-yellow-lt',  text: 'text-yellow',  bar: '#f59f00' },
  orange:  { bg: 'bg-orange-lt',  text: 'text-orange',  bar: '#f76707' },
  pink:    { bg: 'bg-pink-lt',    text: 'text-pink',    bar: '#d6336c' },
  purple:  { bg: 'bg-purple-lt',  text: 'text-purple',  bar: '#ae3ec9' },
  indigo:  { bg: 'bg-indigo-lt',  text: 'text-indigo',  bar: '#3d63dd' },
  green:   { bg: 'bg-green-lt',   text: 'text-green',   bar: '#2fb344' },
  cyan:    { bg: 'bg-cyan-lt',    text: 'text-cyan',    bar: '#17a2b8' },
  success: { bg: 'bg-success-lt', text: 'text-success', bar: '#2fb344' },
};

// ─── Value renderer ──────────────────────────────────────────────────────────
const RenderValue = ({ fieldKey, value }) => {
  const [expanded, setExpanded] = useState(false);

  if (value === null || value === undefined) {
    return <span className="text-muted">—</span>;
  }
  if (typeof value === 'boolean') {
    return value
      ? <span className="badge bg-success-lt text-success">true</span>
      : <span className="badge bg-danger-lt text-danger">false</span>;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted">[ ]</span>;
    return (
      <div className="d-flex flex-wrap gap-1">
        {value.map((v, i) => (
          <span key={i} className="badge bg-secondary-lt text-secondary font-monospace">
            {typeof v === 'object' ? JSON.stringify(v) : String(v)}
          </span>
        ))}
      </div>
    );
  }
  // Objects that look like HTTP headers → table
  if (typeof value === 'object') {
    const entries = Object.entries(value);
    if (entries.length === 0) return <span className="text-muted">{ }</span>;
    return (
      <div>
        <button
          className="btn btn-sm btn-ghost-secondary py-0 px-1 mb-1"
          style={{ fontSize: 11 }}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? '▲ Hide' : `▼ ${entries.length} fields`}
        </button>
        {expanded && (
          <table className="table table-sm table-vcenter table-bordered mb-0" style={{ fontSize: 12 }}>
            <tbody>
              {entries.map(([k, v]) => (
                <tr key={k}>
                  <td className="text-muted font-monospace" style={{ width: '40%' }}>{k}</td>
                  <td className="font-monospace">{String(v)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  }
  // Status codes
  if (fieldKey.includes('status_code') || fieldKey === 'final_status_code') {
    const n = Number(value);
    const cls = n < 300 ? 'bg-success-lt text-success' : n < 400 ? 'bg-warning-lt text-warning' : 'bg-danger-lt text-danger';
    return <span className={`badge ${cls}`}>{value}</span>;
  }
  // Long string (body preview)
  if (typeof value === 'string' && value.length > 120) {
    return (
      <div>
        <button
          className="btn btn-sm btn-ghost-secondary py-0 px-1 mb-1"
          style={{ fontSize: 11 }}
          onClick={() => setExpanded(e => !e)}
        >
          {expanded ? '▲ Hide' : '▼ Show body'}
        </button>
        {expanded && (
          <pre className="small mb-0 p-2 rounded" style={{ maxHeight: 200, overflow: 'auto', fontSize: 11, background: 'var(--tblr-bg-surface-secondary)' }}>
            {value}
          </pre>
        )}
      </div>
    );
  }
  // Timing fields
  if (fieldKey.includes('elapsed') || fieldKey.includes('timeout') || fieldKey === 'total_elapsed_ms') {
    const n = Number(value);
    if (!isNaN(n)) {
      return (
        <span className="small">
          {n >= 1000 ? `${(n / 1000).toFixed(3)} s` : `${n} ms`}
        </span>
      );
    }
  }
  // URLs / paths
  if (fieldKey.includes('url') || fieldKey.includes('uri') || fieldKey === 'request_path' || fieldKey === 'upstream_path') {
    return <code className="small">{String(value)}</code>;
  }
  return <span className="small">{String(value)}</span>;
};

// ─── Main component ──────────────────────────────────────────────────────────
const TraceDebugView = ({ requestId, debugEntries = [], onBack }) => {
  const [selectedPhase, setSelectedPhase] = useState(null);

  // Sort chronologically
  const sorted = [...debugEntries].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // phase → first matching entry
  const phaseMap = {};
  sorted.forEach(entry => {
    const phase = entry.info?.phase || entry.phase;
    if (phase && !phaseMap[phase]) phaseMap[phase] = entry;
  });

  // Summary values
  const reqEntry   = phaseMap['request_received'] || sorted[0];
  const finalEntry = phaseMap['response_finalized'] || phaseMap['upstream_complete'] || sorted[sorted.length - 1];
  const totalMs    = finalEntry?.info?.total_elapsed_ms
    ?? (sorted.length >= 2 ? new Date(sorted[sorted.length - 1].timestamp) - new Date(sorted[0].timestamp) : 0);

  const method     = reqEntry?.info?.method || reqEntry?.info?.http_method || '?';
  const url        = reqEntry?.info?.url || reqEntry?.info?.request_url || '—';
  const statusCode = finalEntry?.info?.final_status_code ?? finalEntry?.info?.status_code ?? '—';
  const serviceName = reqEntry?.info?.service_name || finalEntry?.info?.service_name || '—';
  const isOk       = typeof statusCode === 'number' ? statusCode < 400 : true;

  // Timing helpers
  const startMs = sorted.length > 0 ? new Date(sorted[0].timestamp).getTime() : 0;
  const getSpanTiming = (entry) => {
    const wallEnd    = new Date(entry.timestamp).getTime() - startMs;
    const durationMs = entry.info?.elapsed_ms ?? entry.info?.upstream_elapsed_ms ?? 0;
    const wallStart  = Math.max(0, wallEnd - durationMs);
    return { wallStart, durationMs, wallEnd };
  };

  // Phases present in data, ordered by PHASE_CONFIG groups
  const requestPhases = Object.entries(PHASE_CONFIG)
    .filter(([k, c]) => c.group === 'request'  && phaseMap[k])
    .sort((a, b) => a[1].order - b[1].order);

  const responsePhases = Object.entries(PHASE_CONFIG)
    .filter(([k, c]) => c.group === 'response' && phaseMap[k])
    .sort((a, b) => a[1].order - b[1].order);

  // All phases for gantt, sorted by wall-clock end time
  const allSpans = Object.entries(phaseMap)
    .map(([phase, entry]) => ({ phase, entry, ...getSpanTiming(entry) }))
    .sort((a, b) => a.wallEnd - b.wallEnd);

  const selectedEntry = selectedPhase ? phaseMap[selectedPhase] : null;

  // ── Flow phase tile ──────────────────────────────────────────────────────
  const FlowTile = ({ phaseKey }) => {
    const cfg = PHASE_CONFIG[phaseKey];
    const entry = phaseMap[phaseKey];
    if (!cfg || !entry) return null;

    const isSelected = selectedPhase === phaseKey;
    const colors     = COLORS[cfg.color] || COLORS.blue;
    const { durationMs } = getSpanTiming(entry);
    const hasError   = entry.info?.denied === true || entry.info?.blocked === true
                    || (entry.info?.status_code && entry.info.status_code >= 400);

    return (
      <div
        className={`d-flex flex-column align-items-center p-2 rounded-3 border cursor-pointer
          ${isSelected ? 'border-primary' : 'border-2 border-transparent'}
          ${hasError ? 'bg-danger-lt' : colors.bg}`}
        style={{ minWidth: 78, maxWidth: 96, transition: 'box-shadow 0.15s', boxShadow: isSelected ? '0 0 0 2px var(--tblr-primary)' : undefined }}
        onClick={() => setSelectedPhase(isSelected ? null : phaseKey)}
        title={cfg.name}
      >
        <cfg.Icon size={20} className={hasError ? 'text-danger' : colors.text} />
        <div className="fw-medium text-center lh-sm mt-1" style={{ fontSize: 10 }}>
          {cfg.name}
        </div>
        <div className="text-muted mt-1" style={{ fontSize: 9 }}>
          {durationMs > 0
            ? durationMs >= 1000 ? `${(durationMs / 1000).toFixed(2)}s` : `${durationMs.toFixed(1)}ms`
            : ''}
        </div>
        {hasError && <IconAlertCircle size={11} className="text-danger mt-1" />}
      </div>
    );
  };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div>
      {/* ── Header strip ── */}
      <div className="d-flex align-items-center gap-2 flex-wrap mb-3">
        {onBack && (
          <button className="btn btn-sm btn-ghost-secondary" onClick={onBack}>
            <IconArrowLeft size={15} className="me-1" /> Back
          </button>
        )}
        <span className={`badge fs-6 ${isOk ? 'bg-success' : 'bg-danger'}`}>{statusCode}</span>
        {(() => { const mc = { GET: 'bg-azure text-white', POST: 'bg-green text-white', PUT: 'bg-orange text-white', PATCH: 'bg-yellow text-white', DELETE: 'bg-red text-white', OPTIONS: 'bg-purple text-white', HEAD: 'bg-teal text-white' }; return <span className={`badge ${mc[method?.toUpperCase()] || 'bg-secondary-lt text-secondary'}`}>{method}</span>; })()}
        <code className="small text-truncate" style={{ maxWidth: 420 }}>{url}</code>
        <span className="text-muted small">· {serviceName}</span>
        <span className="badge bg-purple-lt text-purple ms-auto">
          <IconClock size={11} className="me-1" />
          {Number(totalMs) >= 1000
            ? `${(Number(totalMs) / 1000).toFixed(3)} s`
            : `${Number(totalMs).toFixed(2)} ms`} total
        </span>
      </div>

      {/* ── Flow diagram ── */}
      <div className="card mb-3">
        <div className="card-body p-3">
          {/* Request row */}
          <div className="text-muted fw-medium mb-2 text-uppercase" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
            Request pipeline
          </div>
          <div className="d-flex align-items-center flex-wrap gap-1 mb-3 pb-3 border-bottom">
            {requestPhases.map(([key], i) => (
              <React.Fragment key={key}>
                {i > 0 && <IconChevronRight size={13} className="text-muted flex-shrink-0" />}
                <FlowTile phaseKey={key} />
              </React.Fragment>
            ))}
            {requestPhases.length === 0 && (
              <span className="text-muted small">No request phases recorded</span>
            )}
          </div>

          {/* Response row */}
          <div className="text-muted fw-medium mb-2 text-uppercase" style={{ fontSize: 10, letterSpacing: '0.06em' }}>
            Upstream / response
          </div>
          <div className="d-flex align-items-center flex-wrap gap-1">
            {responsePhases.map(([key], i) => (
              <React.Fragment key={key}>
                {i > 0 && <IconChevronRight size={13} className="text-muted flex-shrink-0" />}
                <FlowTile phaseKey={key} />
              </React.Fragment>
            ))}
            {responsePhases.length === 0 && (
              <span className="text-muted small">No response phases recorded</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Spans + Detail ── */}
      <div className="row g-3">

        {/* Left: Gantt / spans */}
        <div className="col-lg-5">
          <div className="card h-100">
            <div className="card-header">
              <h3 className="card-title">Spans</h3>
              <div className="card-subtitle">Click a span to inspect</div>
            </div>
            <div className="card-body p-0">
              <div className="list-group list-group-flush rounded-bottom" style={{ overflowY: 'auto', maxHeight: 420 }}>
                {allSpans.map(({ phase, entry, wallStart, durationMs }) => {
                  const cfg      = PHASE_CONFIG[phase];
                  const colors   = cfg ? (COLORS[cfg.color] || COLORS.blue) : COLORS.blue;
                  const isActive = selectedPhase === phase;
                  const hasError = entry.info?.denied === true || entry.info?.blocked === true;

                  const leftPct  = totalMs > 0 ? (wallStart / totalMs) * 100 : 0;
                  const widthPct = totalMs > 0 ? Math.max(0.4, (durationMs / totalMs) * 100) : 2;
                  const barColor = hasError ? '#d63939' : (cfg ? (COLORS[cfg.color]?.bar || '#4299e1') : '#4299e1');

                  return (
                    <div
                      key={phase}
                      className={`list-group-item list-group-item-action d-flex align-items-center gap-2 px-3 py-2 ${isActive ? 'active' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setSelectedPhase(isActive ? null : phase)}
                    >
                      {/* Name */}
                      <div style={{ width: 140, flexShrink: 0 }}>
                        {cfg ? (
                          <span className="d-flex align-items-center gap-1">
                            <cfg.Icon size={12} className={isActive ? '' : colors.text} />
                            <span style={{ fontSize: 11 }} className="text-truncate">{cfg.name}</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: 11 }} className="text-truncate font-monospace">{phase}</span>
                        )}
                      </div>

                      {/* Gantt bar */}
                      <div className="flex-fill position-relative" style={{ height: 16, minWidth: 60 }}>
                        {durationMs > 0 && (
                          <div
                            className="position-absolute rounded"
                            style={{
                              left: `${Math.min(leftPct, 98)}%`,
                              width: `${widthPct}%`,
                              top: 3, bottom: 3,
                              backgroundColor: barColor,
                              opacity: isActive ? 1 : 0.72,
                            }}
                          />
                        )}
                      </div>

                      {/* Duration */}
                      <div className="text-end text-nowrap" style={{ width: 58, flexShrink: 0, fontSize: 11 }}>
                        {durationMs > 0
                          ? durationMs >= 1000
                            ? `${(durationMs / 1000).toFixed(2)} s`
                            : `${durationMs >= 1 ? durationMs.toFixed(1) : durationMs.toFixed(2)} ms`
                          : '—'}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Phase detail */}
        <div className="col-lg-7">
          <div className="card h-100">
            {!selectedEntry ? (
              <div className="card-body d-flex flex-column align-items-center justify-content-center text-center py-5">
                <IconCode size={44} strokeWidth={1} className="text-muted mb-3" />
                <div className="h4 mb-1">Select a phase</div>
                <div className="text-muted small">
                  Click any phase tile or span row to view its full details
                </div>
              </div>
            ) : (() => {
              const cfg    = PHASE_CONFIG[selectedPhase];
              const colors = cfg ? (COLORS[cfg.color] || COLORS.blue) : COLORS.blue;
              const info   = selectedEntry.info || {};
              const hasError = info.denied === true || info.blocked === true
                            || (info.status_code && info.status_code >= 400);

              // Separate high-priority fields from the rest
              const PRIORITY = ['phase', 'method', 'url', 'request_url', 'status_code', 'final_status_code',
                                'elapsed_ms', 'upstream_elapsed_ms', 'total_elapsed_ms', 'timestamp'];
              const priorityEntries = Object.entries(info).filter(([k]) => PRIORITY.includes(k));
              const otherEntries    = Object.entries(info).filter(([k]) => !PRIORITY.includes(k));
              const allEntries      = [...priorityEntries, ...otherEntries];

              return (
                <>
                  <div className={`card-header ${hasError ? 'bg-danger-lt' : ''}`}>
                    <div className="d-flex align-items-center gap-2">
                      {cfg
                        ? <cfg.Icon size={18} className={hasError ? 'text-danger' : colors.text} />
                        : <IconCode size={18} className="text-muted" />}
                      <h3 className="card-title mb-0">{cfg ? cfg.name : selectedPhase}</h3>
                      {hasError && <span className="badge bg-danger ms-1">Error</span>}
                    </div>
                    <div className="card-subtitle font-monospace" style={{ fontSize: 11 }}>
                      {selectedPhase}
                      {selectedEntry.timestamp && (
                        <span className="text-muted ms-2">{new Date(selectedEntry.timestamp).toLocaleString()}</span>
                      )}
                    </div>
                  </div>

                  <div className="card-body overflow-auto p-3" style={{ maxHeight: 480 }}>
                    <div className="datagrid datagrid-0">
                      {allEntries.map(([key, value]) => (
                        <div className="datagrid-item" key={key}>
                          <div className="datagrid-title font-monospace" style={{ fontSize: 11 }}>{key}</div>
                          <div className="datagrid-content">
                            <RenderValue fieldKey={key} value={value} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TraceDebugView;
