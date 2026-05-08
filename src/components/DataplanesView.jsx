import React, { useState, useEffect, useRef } from 'react';
import { API_BASE_URL, authenticatedFetch } from '../utils/api';
import { useAppState } from '../context/AppState';
import {
  IconRefresh, IconCloud, IconCloudOff, IconWifi, IconWifiOff,
  IconShield, IconServer, IconChevronDown, IconChevronRight,
  IconCheck, IconX, IconCertificate, IconActivity, IconUsers,
  IconLink, IconLinkOff, IconFingerprint, IconAlertTriangle,
} from '@tabler/icons-react';

// ── helpers ────────────────────────────────────────────────────────────────

// Normalise server timestamps: bare ISO without tz-offset must be treated as UTC
const parseUTC = (ts) => {
  if (!ts) return null;
  // If no timezone suffix (+HH:MM or Z), append Z to force UTC parsing
  const s = String(ts);
  return new Date(/[Zz]|[+-]\d{2}:?\d{2}$/.test(s) ? s : s + 'Z');
};

const formatRelative = (ts) => {
  if (!ts) return '—';
  const d = parseUTC(ts);
  if (!d || isNaN(d)) return '—';
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 0) return 'in the future';
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const formatDate = (ts) => {
  if (!ts) return '—';
  const d = parseUTC(ts);
  if (!d || isNaN(d)) return '—';
  return d.toLocaleString();
};

const formatUptimeSec = (sec) => {
  if (sec == null) return '—';
  const s = Math.floor(sec);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  const h = Math.floor(s / 3600);
  if (h < 24) return `${h}h ${Math.floor((s % 3600) / 60)}m`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};

const StatusBadge = ({ ok, trueLabel = 'Yes', falseLabel = 'No' }) =>
  ok ? (
    <span className="badge bg-success-lt text-success"><IconCheck size={12} className="me-1" />{trueLabel}</span>
  ) : (
    <span className="badge bg-danger-lt text-danger"><IconX size={12} className="me-1" />{falseLabel}</span>
  );

// ── Worker row inside an active connection ─────────────────────────────────

const WorkerRow = ({ w, idx }) => {
  const queuePct = w.send_queue_capacity ? Math.round((w.send_queue_depth / w.send_queue_capacity) * 100) : 0;
  return (
    <tr>
      <td className="text-muted small">W{idx + 1}</td>
      <td><StatusBadge ok={w.heartbeat_ok} trueLabel="OK" falseLabel="FAIL" /></td>
      <td className="small">{formatUptimeSec(w.uptime_seconds)}</td>
      <td className="small">{w.last_heartbeat_ack_seconds_ago?.toFixed(1)}s ago</td>
      <td className="small">{w.messages_sent}</td>
      <td>
        <div className="d-flex align-items-center gap-2">
          <div className="progress flex-grow-1" style={{ height: 6 }}>
            <div
              className={`progress-bar ${queuePct > 75 ? 'bg-danger' : queuePct > 40 ? 'bg-warning' : 'bg-success'}`}
              style={{ width: `${queuePct}%` }}
            />
          </div>
          <span className="text-muted small" style={{ whiteSpace: 'nowrap' }}>
            {w.send_queue_depth}/{w.send_queue_capacity}
          </span>
        </div>
      </td>
    </tr>
  );
};

// ── Active connection card (collapsible) ───────────────────────────────────

const ActiveConnectionCard = ({ conn }) => {
  const [open, setOpen] = useState(false);
  const allOk = conn.heartbeat_ok;
  return (
    <div className="card mb-2">
      <div
        className="card-header cursor-pointer user-select-none"
        onClick={() => setOpen((v) => !v)}
        style={{ cursor: 'pointer' }}
      >
        <div className="d-flex align-items-center gap-2 flex-grow-1">
          {open ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
          <span className="fw-bold">{conn.dataplane_id}</span>
          <StatusBadge ok={allOk} trueLabel="Heartbeat OK" falseLabel="Heartbeat FAIL" />
          <span className="badge bg-azure-lt text-azure ms-1">
            <IconUsers size={12} className="me-1" />{conn.worker_count} workers
          </span>
        </div>
      </div>
      {open && (
        <div className="table-responsive">
          <table className="table table-sm table-vcenter card-table mb-0">
            <thead>
              <tr>
                <th>#</th>
                <th>Heartbeat</th>
                <th>Uptime</th>
                <th>Last ACK</th>
                <th>Msgs Sent</th>
                <th>Send Queue</th>
              </tr>
            </thead>
            <tbody>
              {conn.workers?.map((w, i) => <WorkerRow key={i} w={w} idx={i} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// ── Dataplane list item ────────────────────────────────────────────────────

const DataplaneListItem = ({ dp, selected, onClick }) => {
  const isOnline = dp.status === 'online';
  const wsConnected = dp.websocket_status === 'connected' || dp.websocket_active_in_memory;
  return (
    <div
      className={`list-group-item list-group-item-action d-flex align-items-center gap-2 py-2 px-3 ${selected ? 'active' : ''}`}
      onClick={onClick}
      style={{ cursor: 'pointer' }}
    >
      <span className={`status-dot ${isOnline ? 'status-green' : 'status-red'}`} />
      <span className="flex-grow-1 fw-medium text-truncate" style={{ maxWidth: 150 }}>
        {dp.name || dp.id}
      </span>
      {wsConnected
        ? <IconWifi size={14} className="text-success" title="WebSocket connected" />
        : <IconWifiOff size={14} className="text-muted" title="WebSocket disconnected" />}
    </div>
  );
};

// ── Detail panel for selected dataplane ───────────────────────────────────

const DataplaneDetail = ({ dp, activeConn, fingerprints }) => {
  const isOnline = dp.status === 'online';
  const wsActive = dp.websocket_status === 'connected' || dp.websocket_active_in_memory;
  const conn = activeConn?.find((c) => {
    // match by dp-NNN heuristic or exact id
    const shortId = dp.name?.replace('dataplane-', 'dp-0') || '';
    return c.dataplane_id === dp.id || c.dataplane_id === shortId ||
      dp.name?.toLowerCase().includes(c.dataplane_id?.replace('dp-0', '')) ||
      dp.name?.toLowerCase().replace('dataplane-', 'dp-') === c.dataplane_id?.toLowerCase();
  });

  const fp = fingerprints?.find((f) => f.source_ip === dp.ip);

  return (
    <div>
      {/* Status bar */}
      <div className="d-flex align-items-center gap-2 mb-3 flex-wrap">
        <span className={`badge ${isOnline ? 'bg-success' : 'bg-danger'} fs-6`}>{dp.status}</span>
        <span className={`badge ${wsActive ? 'bg-azure' : 'bg-secondary'}`}>
          {wsActive
            ? <><IconWifi size={12} className="me-1" />WS Connected</>
            : <><IconWifiOff size={12} className="me-1" />WS Disconnected</>}
        </span>
        {dp.websocket_status && (
          <span className="badge bg-secondary text-capitalize">{dp.websocket_status}</span>
        )}
      </div>

      {/* Info grid */}
      <div className="datagrid mb-3">
        <div className="datagrid-item">
          <div className="datagrid-title">ID</div>
          <div className="datagrid-content"><code className="small text-break">{dp.id}</code></div>
        </div>
        <div className="datagrid-item">
          <div className="datagrid-title">IP / Port</div>
          <div className="datagrid-content">{dp.ip}:{dp.port}</div>
        </div>
        <div className="datagrid-item">
          <div className="datagrid-title">Last Seen</div>
          <div className="datagrid-content">
            <span>{formatRelative(dp.last_seen)}</span>
            <div className="text-muted small">{formatDate(dp.last_seen)}</div>
          </div>
        </div>
        <div className="datagrid-item">
          <div className="datagrid-title">WS Connection ID</div>
          <div className="datagrid-content"><code className="small">{dp.websocket_connection_id || '—'}</code></div>
        </div>
        <div className="datagrid-item">
          <div className="datagrid-title">Last Cert Renewed</div>
          <div className="datagrid-content">
            {dp.last_operating_cert_issued ? (
              <>
                <span>{formatRelative(dp.last_operating_cert_issued)}</span>
                <div className="text-muted small">{formatDate(dp.last_operating_cert_issued)}</div>
              </>
            ) : (
              <span className="text-muted">Not yet issued</span>
            )}
          </div>
        </div>
        <div className="datagrid-item">
          <div className="datagrid-title">Cert Fingerprint</div>
          <div className="datagrid-content">
            <code className="small" title={dp.root_cert_fingerprint}>{dp.root_cert_fingerprint_short || '—'}</code>
          </div>
        </div>
      </div>

      {/* Active connection workers */}
      {conn ? (
        <div className="card mb-3">
          <div className="card-header">
            <IconActivity size={16} className="me-2 text-azure" />
            <span className="card-title">Active WebSocket Workers</span>
            <div className="card-options">
              <StatusBadge ok={conn.heartbeat_ok} trueLabel="Heartbeat OK" falseLabel="Heartbeat FAIL" />
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-sm table-vcenter card-table mb-0">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Heartbeat</th>
                  <th>Uptime</th>
                  <th>Last ACK</th>
                  <th>Msgs Sent</th>
                  <th>Send Queue</th>
                </tr>
              </thead>
              <tbody>
                {conn.workers?.map((w, i) => <WorkerRow key={i} w={w} idx={i} />)}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning d-flex align-items-center gap-2 mb-3">
          <IconWifiOff size={16} />
          No active WebSocket connection for this dataplane.
        </div>
      )}

      {/* Known fingerprint */}
      {fp && (
        <div className="card">
          <div className="card-header">
            <IconFingerprint size={16} className="me-2 text-purple" />
            <span className="card-title">Known Root Fingerprint</span>
          </div>
          <div className="card-body">
            <div className="datagrid">
              <div className="datagrid-item">
                <div className="datagrid-title">Dataplane ID</div>
                <div className="datagrid-content"><code className="small">{fp.dataplane_id}</code></div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">First Seen</div>
                <div className="datagrid-content">{formatRelative(fp.first_seen_at)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">Source IP</div>
                <div className="datagrid-content">{fp.source_ip}</div>
              </div>
              <div className="datagrid-item" style={{ gridColumn: '1 / -1' }}>
                <div className="datagrid-title">Fingerprint</div>
                <div className="datagrid-content"><code className="small text-break">{fp.fingerprint}</code></div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main view ──────────────────────────────────────────────────────────────

const DataplanesView = () => {
  const { api } = useAppState();
  const [wsStatus, setWsStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const initialSelect = useRef(false);

  const loadStatus = async () => {
    try {
      setError(null);
      const response = await authenticatedFetch(`${API_BASE_URL}/websocket/status`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      setWsStatus(data);
      if (!initialSelect.current && data.dataplanes?.length > 0) {
        setSelectedId(data.dataplanes[0].id);
        initialSelect.current = true;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    const interval = setInterval(loadStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const infra = wsStatus?.websocket_infrastructure;
  const rootCa = wsStatus?.root_ca;
  const dataplanes = wsStatus?.dataplanes ?? [];
  const activeConns = wsStatus?.active_connections ?? [];
  const fingerprints = wsStatus?.known_root_fingerprints ?? [];
  const crl = wsStatus?.crl;

  const onlineCount = dataplanes.filter((d) => d.status === 'online').length;
  const offlineCount = dataplanes.filter((d) => d.status !== 'online').length;

  const selectedDp = dataplanes.find((d) => d.id === selectedId) ?? null;

  if (loading && !wsStatus) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" />
        <p className="text-muted mt-2">Loading dataplane status…</p>
      </div>
    );
  }

  return (
    <>
      {/* Page header */}
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col"><h2 className="page-title">Dataplanes</h2></div>
          <div className="col-auto">
            <button className="btn btn-primary" onClick={loadStatus} disabled={loading}>
              <IconRefresh size={16} className={`me-1 ${loading ? 'rotating' : ''}`} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mt-3 d-flex align-items-center gap-2">
          <IconAlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ── Top stat cards ── */}
      <div className="row row-cards mt-3">
        <div className="col-6 col-sm-4 col-lg-2">
          <div className="card card-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-auto"><span className="bg-success-lt avatar"><IconCloud size={20} /></span></div>
                <div className="col">
                  <div className="fw-bold">{onlineCount}</div>
                  <div className="text-muted small">Online</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-sm-4 col-lg-2">
          <div className="card card-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-auto"><span className="bg-danger-lt avatar"><IconCloudOff size={20} /></span></div>
                <div className="col">
                  <div className="fw-bold">{offlineCount}</div>
                  <div className="text-muted small">Offline</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-sm-4 col-lg-2">
          <div className="card card-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-auto"><span className="bg-azure-lt avatar"><IconActivity size={20} /></span></div>
                <div className="col">
                  <div className="fw-bold">{infra?.active_connection_count ?? '—'}</div>
                  <div className="text-muted small">WS Connections</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-sm-4 col-lg-2">
          <div className="card card-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-auto"><span className="bg-teal-lt avatar"><IconServer size={20} /></span></div>
                <div className="col">
                  <div className="fw-bold">{infra?.connected_dataplane_count ?? '—'}</div>
                  <div className="text-muted small">WS Dataplanes</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-sm-4 col-lg-2">
          <div className="card card-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-auto"><span className="bg-purple-lt avatar"><IconUsers size={20} /></span></div>
                <div className="col">
                  <div className="fw-bold">{infra?.max_connections ?? '—'}</div>
                  <div className="text-muted small">Max Connections</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-6 col-sm-4 col-lg-2">
          <div className="card card-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-auto"><span className="bg-yellow-lt avatar"><IconFingerprint size={20} /></span></div>
                <div className="col">
                  <div className="fw-bold">{fingerprints.length}</div>
                  <div className="text-muted small">Fingerprints</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Infrastructure + Root CA row ── */}
      <div className="row row-cards mt-3">
        {infra && (
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header">
                <IconWifi size={16} className="me-2 text-azure" />
                <span className="card-title">WebSocket Infrastructure</span>
                <div className="card-options">
                  {infra.running
                    ? <span className="badge bg-success-lt text-success"><IconCheck size={12} className="me-1" />Running</span>
                    : <span className="badge bg-danger-lt text-danger"><IconX size={12} className="me-1" />Stopped</span>}
                </div>
              </div>
              <div className="card-body">
                <div className="datagrid">
                  <div className="datagrid-item">
                    <div className="datagrid-title">Enabled</div>
                    <div className="datagrid-content"><StatusBadge ok={infra.enabled} /></div>
                  </div>
                  <div className="datagrid-item">
                    <div className="datagrid-title">Running</div>
                    <div className="datagrid-content"><StatusBadge ok={infra.running} /></div>
                  </div>
                  <div className="datagrid-item">
                    <div className="datagrid-title">Active Connections</div>
                    <div className="datagrid-content fw-bold text-azure">{infra.active_connection_count}</div>
                  </div>
                  <div className="datagrid-item">
                    <div className="datagrid-title">Connected Dataplanes</div>
                    <div className="datagrid-content fw-bold">{infra.connected_dataplane_count}</div>
                  </div>
                  <div className="datagrid-item">
                    <div className="datagrid-title">Max Connections</div>
                    <div className="datagrid-content">{infra.max_connections}</div>
                  </div>
                  <div className="datagrid-item">
                    <div className="datagrid-title">Utilisation</div>
                    <div className="datagrid-content">
                      <div className="d-flex align-items-center gap-2">
                        <div className="progress flex-grow-1" style={{ height: 8 }}>
                          <div
                            className="progress-bar bg-azure"
                            style={{ width: `${Math.min(100, Math.round((infra.active_connection_count / infra.max_connections) * 100))}%` }}
                          />
                        </div>
                        <span className="text-muted small">
                          {Math.round((infra.active_connection_count / infra.max_connections) * 100)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {rootCa && (
          <div className="col-md-6">
            <div className="card h-100">
              <div className="card-header">
                <IconCertificate size={16} className="me-2 text-yellow" />
                <span className="card-title">Root CA</span>
                <div className="card-options">
                  <StatusBadge ok={rootCa.loaded} trueLabel="Loaded" falseLabel="Not Loaded" />
                </div>
              </div>
              <div className="card-body">
                <div className="datagrid">
                  <div className="datagrid-item" style={{ gridColumn: '1 / -1' }}>
                    <div className="datagrid-title">Subject</div>
                    <div className="datagrid-content"><code className="small text-break">{rootCa.subject}</code></div>
                  </div>
                  <div className="datagrid-item">
                    <div className="datagrid-title">Expires At</div>
                    <div className="datagrid-content">{formatDate(rootCa.expires_at)}</div>
                  </div>
                  <div className="datagrid-item">
                    <div className="datagrid-title">CRL Revoked</div>
                    <div className="datagrid-content">
                      {crl?.revoked_count > 0
                        ? <span className="badge bg-danger-lt text-danger"><IconAlertTriangle size={12} className="me-1" />{crl.revoked_count} revoked</span>
                        : <span className="badge bg-success-lt text-success"><IconCheck size={12} className="me-1" />Clean</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Split: Dataplane list + Detail panel ── */}
      <div className="row row-cards mt-3">
        {/* Left: scrollable list */}
        <div className="col-md-3 col-lg-2">
          <div className="card h-100">
            <div className="card-header">
              <IconServer size={16} className="me-2" />
              <span className="card-title">Dataplanes</span>
              <div className="card-options">
                <span className="badge bg-secondary">{dataplanes.length}</span>
              </div>
            </div>
            <div
              className="list-group list-group-flush overflow-auto"
              style={{ maxHeight: 480 }}
            >
              {dataplanes.length === 0 ? (
                <div className="list-group-item text-muted text-center py-3">No dataplanes</div>
              ) : dataplanes.map((dp) => (
                <DataplaneListItem
                  key={dp.id}
                  dp={dp}
                  selected={dp.id === selectedId}
                  onClick={() => setSelectedId(dp.id)}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Right: detail panel */}
        <div className="col-md-9 col-lg-10">
          {selectedDp ? (
            <div className="card">
              <div className="card-header">
                <div className="d-flex align-items-center gap-2">
                  <span className={`status-dot ${selectedDp.status === 'online' ? 'status-green' : 'status-red'}`} />
                  <span className="card-title">{selectedDp.name || selectedDp.id}</span>
                </div>
              </div>
              <div className="card-body">
                <DataplaneDetail
                  dp={selectedDp}
                  activeConn={activeConns}
                  fingerprints={fingerprints}
                />
              </div>
            </div>
          ) : (
            <div className="card">
              <div className="card-body text-center text-muted py-5">
                Select a dataplane from the list to view details.
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── All Active Connections (overview) ── */}
      {activeConns.length > 0 && (
        <div className="card mt-3">
          <div className="card-header">
            <IconActivity size={16} className="me-2 text-azure" />
            <span className="card-title">Active WebSocket Connections</span>
            <div className="card-options">
              <span className="badge bg-azure-lt text-azure">{activeConns.length} dataplanes</span>
            </div>
          </div>
          <div className="card-body pt-2">
            {activeConns.map((conn) => (
              <ActiveConnectionCard key={conn.dataplane_id} conn={conn} />
            ))}
          </div>
        </div>
      )}

      {/* ── Known Root Fingerprints ── */}
      {fingerprints.length > 0 && (
        <div className="card mt-3">
          <div className="card-header">
            <IconFingerprint size={16} className="me-2 text-purple" />
            <span className="card-title">Known Root Fingerprints</span>
            <div className="card-options">
              <span className="badge bg-purple-lt text-purple">{fingerprints.length}</span>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Dataplane ID</th>
                  <th>Short Fingerprint</th>
                  <th>Full Fingerprint</th>
                  <th>Source IP</th>
                  <th>First Seen</th>
                </tr>
              </thead>
              <tbody>
                {fingerprints.map((fp, i) => (
                  <tr key={i}>
                    <td><code className="small">{fp.dataplane_id}</code></td>
                    <td><code className="small text-muted">{fp.fingerprint_short}</code></td>
                    <td>
                      <code className="small text-break" style={{ fontSize: '0.7rem' }}>
                        {fp.fingerprint}
                      </code>
                    </td>
                    <td>{fp.source_ip}</td>
                    <td className="text-muted small">{formatRelative(fp.first_seen_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default DataplanesView;
