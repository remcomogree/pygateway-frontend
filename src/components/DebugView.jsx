import React, { useEffect, useState, useCallback } from 'react';
import { useAppState } from '../context/AppState';
import { useToast } from '../context/ToastContext';
import TraceDebugView from './TraceDebugView';
import { IconRefresh, IconChartDots, IconTrash } from '@tabler/icons-react';

const PAGE_SIZE = 50;

const METHOD_BADGE = {
  GET:     'bg-azure text-white',
  POST:    'bg-green text-white',
  PUT:     'bg-orange text-white',
  PATCH:   'bg-yellow text-white',
  DELETE:  'bg-red text-white',
  OPTIONS: 'bg-purple text-white',
  HEAD:    'bg-teal text-white',
};

const DebugView = () => {
  const { rawApi } = useAppState();
  const toast = useToast();

  // All raw entries fetched from API — grouped to one-per-request for the list
  const [allEntries, setAllEntries]       = useState([]); // grouped unique requests
  const [totalRaw, setTotalRaw]           = useState(0);  // total raw entries from API
  const [loading, setLoading]             = useState(true);
  const [error, setError]                 = useState(null);
  const [page, setPage]                   = useState(0);  // 0-based page index

  // Trace view state
  const [selectedEntry,    setSelectedEntry]    = useState(null);
  const [showTraceView,    setShowTraceView]     = useState(false);
  const [currentLogEntries, setCurrentLogEntries] = useState([]);
  const [traceLoading,     setTraceLoading]      = useState(false);

  // Fetch all debug entries — use a large limit so we capture many unique requests.
  // Cache-bust with _ts so every manual refresh goes to the server.
  const loadDebugEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch up to 1000 raw entries, cache-busted timestamp
      const ts = Date.now();
      const data = await rawApi.request(`/api/v1/debug?offset=0&limit=1000&_ts=${ts}`);
      const raw = Array.isArray(data) ? data : (data.entries || data.items || []);
      const serverTotal = data.total ?? raw.length;

      // Group by request-id, keeping the entry with the latest timestamp per request
      const byId = {};
      raw.forEach((e) => {
        const id = e.x_request_id || e.info?.request_id || e.id;
        if (!id) return;
        if (!byId[id] || new Date(e.timestamp) > new Date(byId[id].timestamp)) {
          byId[id] = e;
        }
      });

      // Sort newest first
      const grouped = Object.values(byId).sort(
        (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
      );

      setAllEntries(grouped);
      setTotalRaw(serverTotal);
      setPage(0);
    } catch (err) {
      setError(`Failed to load debug entries: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [rawApi]);

  // Fetch on mount and whenever we navigate back to this component
  useEffect(() => { loadDebugEntries(); }, [loadDebugEntries]);

  const openTrace = async (entryId) => {
    setTraceLoading(true);
    try {
      const ts = Date.now();
      const data = await rawApi.request(`/api/v1/debug/${entryId}?_ts=${ts}`);
      setCurrentLogEntries(Array.isArray(data) ? data : (data.entries || []));
      setSelectedEntry(entryId);
      setShowTraceView(true);
    } catch (err) {
      toast.error(`Failed to load debug trace: ${err.message}`);
    } finally {
      setTraceLoading(false);
    }
  };

  const handleClear = async () => {
    if (!confirm('Clear all debug entries? This cannot be undone.')) return;
    try {
      await rawApi.request('/api/v1/debug/clear', { method: 'POST' });
      toast.success('Debug entries cleared.');
      loadDebugEntries();
    } catch (err) {
      toast.error(`Failed to clear debug entries: ${err.message}`);
    }
  };

  // Pagination
  const totalPages = Math.max(1, Math.ceil(allEntries.length / PAGE_SIZE));
  const pageEntries = allEntries.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);
  const fromIdx = allEntries.length === 0 ? 0 : page * PAGE_SIZE + 1;
  const toIdx   = Math.min(page * PAGE_SIZE + PAGE_SIZE, allEntries.length);

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col">
            <h2 className="page-title">API Debug Viewer</h2>
            {!loading && !showTraceView && (
              <div className="page-subtitle text-muted">
                {allEntries.length} unique request{allEntries.length !== 1 ? 's' : ''}
                {totalRaw !== allEntries.length && ` (${totalRaw} log lines)`}
              </div>
            )}
          </div>
          {!showTraceView && (
            <div className="col-auto d-flex gap-2">
              <button className="btn btn-outline-danger btn-sm" onClick={handleClear} disabled={loading || allEntries.length === 0}>
                <IconTrash size={14} className="me-1" /> Clear
              </button>
              <button className="btn btn-primary" onClick={loadDebugEntries} disabled={loading}>
                {loading
                  ? <><span className="spinner-border spinner-border-sm me-1" />Loading…</>
                  : <><IconRefresh size={16} className="me-1" />Refresh</>}
              </button>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="alert alert-danger mt-3">
          <div className="d-flex align-items-center gap-2">
            <span>{error}</span>
            <button className="btn btn-sm btn-danger ms-auto" onClick={loadDebugEntries}>Retry</button>
          </div>
        </div>
      )}

      {/* ── Trace detail view ── */}
      {showTraceView ? (
        <div className="mt-3">
          <TraceDebugView
            requestId={selectedEntry}
            debugEntries={currentLogEntries}
            onBack={() => { setShowTraceView(false); setCurrentLogEntries([]); setSelectedEntry(null); }}
          />
        </div>
      ) : (
        /* ── Entry list ── */
        <div className="card mt-3">
          <div className="card-header">
            <h3 className="card-title">Log Entries</h3>
            {totalPages > 1 && (
              <div className="card-options">
                <span className="text-muted small me-3">{fromIdx}–{toIdx} of {allEntries.length}</span>
                <div className="btn-list">
                  <button
                    className="btn btn-sm"
                    disabled={page === 0}
                    onClick={() => setPage(p => p - 1)}
                  >&lsaquo; Prev</button>
                  <button
                    className="btn btn-sm"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                  >Next &rsaquo;</button>
                </div>
              </div>
            )}
          </div>

          {loading ? (
            <div className="card-body text-center py-5">
              <div className="spinner-border text-primary mb-2" />
              <p className="text-muted">Loading debug entries…</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-vcenter card-table table-hover">
                <thead>
                  <tr>
                    <th style={{ width: 160 }}>Time</th>
                    <th style={{ width: 80  }}>Method</th>
                    <th>URL</th>
                    <th>Request ID</th>
                    <th style={{ width: 120 }}>Service</th>
                    <th style={{ width: 70  }}>Status</th>
                    <th style={{ width: 40  }}></th>
                  </tr>
                </thead>
                <tbody>
                  {pageEntries.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center text-muted py-5">
                        <div className="mb-2" style={{ fontSize: '2rem' }}>🐛</div>
                        No debug entries found.
                        <div className="small mt-1">Enable debug on a service, then make requests to it.</div>
                      </td>
                    </tr>
                  ) : pageEntries.map((entry) => {
                    const entryId    = entry.x_request_id || entry.info?.request_id || entry.id;
                    const statusCode = entry.info?.final_status_code ?? entry.info?.status_code;
                    const isOk       = typeof statusCode === 'number' && statusCode < 400;
                    const isErr      = typeof statusCode === 'number' && statusCode >= 500;
                    const method     = entry.info?.method || entry.info?.http_method;
                    const url        = entry.info?.url || entry.info?.request_url || '—';
                    const methodCls  = METHOD_BADGE[method?.toUpperCase()] || 'bg-secondary-lt text-secondary';
                    const statusCls  = isErr ? 'bg-danger text-white' : isOk ? 'bg-success-lt text-success' : 'bg-warning-lt text-warning';

                    return (
                      <tr
                        key={entryId}
                        className="cursor-pointer"
                        onClick={() => !traceLoading && openTrace(entryId)}
                        style={{ opacity: traceLoading ? 0.6 : 1 }}
                      >
                        <td className="text-nowrap text-muted small">
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '—'}
                        </td>
                        <td>
                          {method && <span className={`badge ${methodCls}`}>{method.toUpperCase()}</span>}
                        </td>
                        <td>
                          <code className="small" style={{ wordBreak: 'break-all' }}>{url}</code>
                        </td>
                        <td>
                          <code className="small text-muted">{entryId || '—'}</code>
                        </td>
                        <td className="small text-truncate" style={{ maxWidth: 120 }}>
                          {entry.info?.service_name || '—'}
                        </td>
                        <td>
                          {statusCode != null && (
                            <span className={`badge ${statusCls}`}>{statusCode}</span>
                          )}
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <button
                            className="btn btn-sm btn-ghost-primary"
                            onClick={() => openTrace(entryId)}
                            disabled={traceLoading}
                            title="Open trace"
                          >
                            <IconChartDots size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer pagination */}
          {!loading && allEntries.length > 0 && (
            <div className="card-footer d-flex align-items-center">
              <p className="m-0 text-secondary">
                Showing <span className="fw-bold">{fromIdx}</span>–<span className="fw-bold">{toIdx}</span> of <span className="fw-bold">{allEntries.length}</span> requests
              </p>
              {totalPages > 1 && (
                <ul className="pagination m-0 ms-auto">
                  <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(0)} disabled={page === 0}>&laquo;</button>
                  </li>
                  <li className={`page-item ${page === 0 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p => p - 1)} disabled={page === 0}>prev</button>
                  </li>
                  {/* Page number pills */}
                  {Array.from({ length: totalPages }, (_, i) => i)
                    .filter(i => Math.abs(i - page) <= 2)
                    .map(i => (
                      <li key={i} className={`page-item ${i === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(i)}>{i + 1}</button>
                      </li>
                    ))
                  }
                  <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages - 1}>next</button>
                  </li>
                  <li className={`page-item ${page >= totalPages - 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(totalPages - 1)} disabled={page >= totalPages - 1}>&raquo;</button>
                  </li>
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default DebugView;
