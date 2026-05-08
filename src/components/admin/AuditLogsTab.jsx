import React, { useState, useCallback } from 'react';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';

const METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
const RESOURCE_TYPES = ['services', 'routes', 'plugins', 'consumers', 'workspaces', 'certificates', 'providers'];

const AuditLogsTab = () => {
  const { state, rawApi } = useAppState();
  const toast = useToast();
  const userRole = state.currentUser?.role || 'readonly';
  const isSuperAdmin = userRole === 'superadmin';

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalEntries, setTotalEntries] = useState(0);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Filters
  const [filters, setFilters] = useState({
    method: '',
    username: '',
    resource_type: '',
    status_code: '',
    source_ip: '',
    since: '',
    until: '',
  });

  // Purge state
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [purgeBeforeDate, setPurgeBeforeDate] = useState('');
  const [purging, setPurging] = useState(false);

  const fetchLogs = useCallback(async (pageNum = page) => {
    setLoading(true);
    setError(null);
    try {
      const params = { page: pageNum, page_size: pageSize };
      // Add active filters
      for (const [key, value] of Object.entries(filters)) {
        if (value) params[key] = value;
      }
      const response = await rawApi.getAuditLogs(params);
      // API returns { data: [...], pagination: { total, page, page_size, total_pages } }
      if (response && response.data) {
        setLogs(response.data);
        setTotalEntries(response.pagination?.total || response.data.length);
      } else if (Array.isArray(response)) {
        setLogs(response);
        setTotalEntries(response.length);
      } else {
        setLogs([]);
        setTotalEntries(0);
      }
    } catch (err) {
      if (err.message?.includes('403')) {
        setError('Access denied. Audit logs require superadmin privileges.');
      } else {
        setError(`Failed to load audit logs: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [rawApi, page, pageSize, filters]);

  const handleSearch = () => {
    setPage(1);
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setFilters({ method: '', username: '', resource_type: '', status_code: '', source_ip: '', since: '', until: '' });
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchLogs(newPage);
  };

  const handlePurge = async () => {
    setPurging(true);
    try {
      const result = await rawApi.purgeAuditLogs(purgeBeforeDate || null);
      const deleted = result?.deleted || 0;
      toast.success(`Successfully purged ${deleted} audit log entries.`);
      setShowPurgeConfirm(false);
      setPurgeBeforeDate('');
      fetchLogs(1);
    } catch (err) {
      toast.error(`Failed to purge audit logs: ${err.message}`);
    } finally {
      setPurging(false);
    }
  };

  const getMethodColor = (method) => {
    switch (method) {
      case 'GET': return '#28a745';
      case 'POST': return '#007bff';
      case 'PUT': return '#ffc107';
      case 'DELETE': return '#dc3545';
      case 'PATCH': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getStatusColor = (code) => {
    if (code >= 200 && code < 300) return '#28a745';
    if (code >= 300 && code < 400) return '#ffc107';
    if (code >= 400 && code < 500) return '#dc3545';
    if (code >= 500) return '#721c24';
    return '#6c757d';
  };

  const formatTimestamp = (ts) => {
    if (!ts) return '-';
    try {
      return new Date(ts).toLocaleString();
    } catch {
      return ts;
    }
  };

  const totalPages = Math.ceil(totalEntries / pageSize) || 1;

  if (!isSuperAdmin) {
    return (
      <div className="card card-body text-center py-5">
        <h3>Access Restricted</h3>
        <p>Audit logs require <strong>superadmin</strong> privileges.</p>
        <p>Your current role: <strong>{userRole}</strong></p>
      </div>
    );
  }

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 style={{ margin: 0 }}>Audit Logs</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading}>
            {loading ? 'Loading...' : 'Load Logs'}
          </button>
          <button className="btn btn-danger" onClick={() => setShowPurgeConfirm(true)}>
            Purge Logs
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card card-body mb-3">
        <div className="row g-2">
        <div className="col-auto">
          <label className="form-label small fw-bold">Method</label>
          <select value={filters.method} onChange={(e) => setFilters(f => ({ ...f, method: e.target.value }))}
            className="form-select form-select-sm">
            <option value="">All</option>
            {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div className="col-auto">
          <label className="form-label small fw-bold">Username</label>
          <input type="text" value={filters.username} placeholder="Filter by user"
            onChange={(e) => setFilters(f => ({ ...f, username: e.target.value }))}
            className="form-control form-control-sm" />
        </div>
        <div className="col-auto">
          <label className="form-label small fw-bold">Resource</label>
          <select value={filters.resource_type} onChange={(e) => setFilters(f => ({ ...f, resource_type: e.target.value }))}
            className="form-select form-select-sm">
            <option value="">All</option>
            {RESOURCE_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>
        <div className="col-auto">
          <label className="form-label small fw-bold">Status Code</label>
          <input type="number" value={filters.status_code} placeholder="e.g. 200"
            onChange={(e) => setFilters(f => ({ ...f, status_code: e.target.value }))}
            className="form-control form-control-sm" />
        </div>
        <div className="col-auto">
          <label className="form-label small fw-bold">Source IP</label>
          <input type="text" value={filters.source_ip} placeholder="e.g. 10.0.0.1"
            onChange={(e) => setFilters(f => ({ ...f, source_ip: e.target.value }))}
            className="form-control form-control-sm" />
        </div>
        <div className="col-auto">
          <label className="form-label small fw-bold">Since</label>
          <input type="datetime-local" value={filters.since}
            onChange={(e) => setFilters(f => ({ ...f, since: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            className="form-control form-control-sm" />
        </div>
        <div className="col-auto">
          <label className="form-label small fw-bold">Until</label>
          <input type="datetime-local" value={filters.until}
            onChange={(e) => setFilters(f => ({ ...f, until: e.target.value ? new Date(e.target.value).toISOString() : '' }))}
            className="form-control form-control-sm" />
        </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <button className="btn btn-sm btn-primary" onClick={handleSearch} disabled={loading}>
          Apply Filters
        </button>
        <button className="btn btn-sm btn-secondary" onClick={handleClearFilters}>
          Clear Filters
        </button>
        {totalEntries > 0 && (
          <span style={{ alignSelf: 'center', fontSize: '0.85rem', color: '#666' }}>
            Showing page {page} of {totalPages} ({totalEntries} total entries)
          </span>
        )}
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {/* Logs Table */}
      {logs.length === 0 && !loading && !error ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#999' }}>
          {totalEntries === 0 && page === 1 ? 'Click "Load Logs" to fetch audit log entries.' : 'No audit log entries found for the current filters.'}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="table table-vcenter table-striped" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Method</th>
                <th>Path</th>
                <th>Status</th>
                <th>Username</th>
                <th>Source IP</th>
                <th>Resource</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, idx) => (
                <tr key={log.id || idx}>
                  <td style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>
                    {formatTimestamp(log.timestamp || log.created_at)}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                      color: '#fff', fontWeight: 600, fontSize: '0.8rem',
                      backgroundColor: getMethodColor(log.method)
                    }}>
                      {log.method}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                    title={log.path || log.endpoint}>
                    {log.path || log.endpoint || '-'}
                  </td>
                  <td>
                    <span style={{
                      display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                      color: '#fff', fontWeight: 600, fontSize: '0.8rem',
                      backgroundColor: getStatusColor(log.status_code)
                    }}>
                      {log.status_code || '-'}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{log.user || '-'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{log.source_ip || '-'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{log.resource_type || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalEntries > pageSize && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button className="btn btn-sm" onClick={() => handlePageChange(1)} disabled={page === 1 || loading}>
            ⟨⟨
          </button>
          <button className="btn btn-sm" onClick={() => handlePageChange(page - 1)} disabled={page === 1 || loading}>
            ⟨
          </button>
          <span style={{ fontSize: '0.9rem' }}>
            Page {page} of {totalPages}
          </span>
          <button className="btn btn-sm" onClick={() => handlePageChange(page + 1)} disabled={page >= totalPages || loading}>
            ⟩
          </button>
          <button className="btn btn-sm" onClick={() => handlePageChange(totalPages)} disabled={page >= totalPages || loading}>
            ⟩⟩
          </button>
          <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
            className="form-select form-select-sm" style={{ width: 'auto', marginLeft: '1rem' }}>
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
            <option value={200}>200 / page</option>
            <option value={500}>500 / page</option>
          </select>
        </div>
      )}

      {/* Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show" style={{display:'block'}} onClick={() => setShowPurgeConfirm(false)}>
            <div className="modal-dialog modal-sm modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header"><h5 className="modal-title text-danger">Purge Audit Logs</h5><button type="button" className="btn-close" onClick={() => setShowPurgeConfirm(false)} /></div>
                <div className="modal-body">
                  <p>This will permanently delete audit log entries. This action cannot be undone.</p>
                  <div className="mb-3">
                    <label className="form-label fw-bold">Delete entries before (optional):</label>
                    <input type="datetime-local" value={purgeBeforeDate}
                      onChange={(e) => setPurgeBeforeDate(e.target.value)}
                      className="form-control" />
                    <small className="form-hint">Leave empty to delete ALL entries.</small>
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn me-auto" onClick={() => setShowPurgeConfirm(false)} disabled={purging}>Cancel</button>
                  <button className="btn btn-danger" onClick={handlePurge} disabled={purging}>{purging ? 'Purging...' : 'Confirm Purge'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AuditLogsTab;
