import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';
import ABACPolicyModal from '../modals/ABACPolicyModal';

/**
 * ABAC Policies Tab Component
 * 
 * Manages ABAC (Attribute-Based Access Control) policies with OIDC integration.
 * Allows creating, updating, deleting, and deploying policies to the ABAC engine.
 */
const ABACPoliciesTab = () => {
  const { state, api } = useAppState();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedServiceFilter, setSelectedServiceFilter] = useState(null);
  const [deployingPolicies, setDeployingPolicies] = useState(false);
  const [engineLoading, setEngineLoading] = useState(false);

  const refreshEngineStatus = async () => {
    setEngineLoading(true);
    try {
      await api.loadAbacEngineStatus();
    } catch (_) {
      // error is stored in state.errors.abacEngineStatus
    } finally {
      setEngineLoading(false);
    }
  };

  // Load ABAC policies on mount
  useEffect(() => {
    loadPolicies();
    refreshEngineStatus();
  }, []);

  const loadPolicies = async () => {
    try {
      const filters = {};
      if (selectedServiceFilter) {
        filters.service_id = selectedServiceFilter;
      }
      await api.loadAbacPolicies(0, 100, filters);
    } catch (error) {
      console.error('Failed to load ABAC policies:', error);
    }
  };

  const handleCreateNew = () => {
    setEditingPolicy(null);
    setShowModal(true);
  };

  const handleEdit = (policy) => {
    const keys = Object.keys(policy);
    console.log('📝 ABACPoliciesTab.handleEdit:');
    console.log('   - ID:', policy.id);
    console.log('   - Name:', policy.name);
    console.log('   - Keys:', keys);
    if (keys.length === 1) {
      console.log('   - Only one key:', keys[0]);
      console.log('   - Value:', policy[keys[0]]);
    }
    setEditingPolicy(policy);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPolicy(null);
  };

  const handleDelete = async (policy) => {
    try {
      await api.deleteAbacPolicy(policy.id);
      loadPolicies();
      setDeleteConfirm(null);
      toast.success('ABAC policy deleted successfully');
    } catch (error) {
      console.error('Failed to delete ABAC policy:', error);
      toast.error(`Failed to delete policy: ${error.message}`);
    }
  };

  const handleDeployPolicies = async (serviceIds = null) => {
    setDeployingPolicies(true);
    try {
      const result = await api.deployAbacPolicies(serviceIds);
      
      if (result.deployed === 0) {
        toast.warning('No enabled policies to deploy');
      } else {
        const errors = result.engine_response?.total_errors || 0;
        if (errors > 0) {
          toast.warning(`${result.deployed} policy(s) deployed with ${errors} error(s)`);
        } else {
          toast.success(`${result.deployed} policy(s) deployed successfully`);
        }
      }
      
      await loadPolicies();
      await refreshEngineStatus();
    } catch (error) {
      console.error('Failed to deploy policies:', error);
      toast.error(`Deployment failed: ${error.message}`);
    } finally {
      setDeployingPolicies(false);
    }
  };

  const policies = state.abacPolicies?.items || [];
  const loading = state.loading.abacPolicies;
  const engineStatus = state.abacEngineStatus;

  // Normalize engine status values — the real API may return objects instead of scalars
  const engineLoadedCount = (() => {
    const v = engineStatus?.loaded_policies;
    if (v == null) return null;
    if (typeof v === 'number') return v;
    if (typeof v === 'object') return Object.keys(v).length;
    return String(v);
  })();
  const engineServicesCount = (() => {
    const v = engineStatus?.services;
    if (v == null) return null;
    if (Array.isArray(v)) return v.length;
    if (typeof v === 'object') return Object.keys(v).length;
    return String(v);
  })();

  const fmtUptime = (s) => {
    if (s == null) return null;
    const sec = typeof s === 'number' ? s : parseFloat(s);
    if (isNaN(sec)) return String(s);
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const r = Math.floor(sec % 60);
    return h > 0 ? `${h}h ${m}m` : m > 0 ? `${m}m ${r}s` : `${r}s`;
  };
  const fmtUs = (v) => v == null ? '—' : `${Number(v).toFixed(2)} µs`;
  const fmtNum = (v) => v == null ? '—' : Number(v).toLocaleString();

  const engineUptime = fmtUptime(engineStatus?.uptime_seconds ?? engineStatus?.metrics?.uptime_seconds);
  const engineCacheSize = (() => {
    const c = engineStatus?.cache;
    if (!c) return null;
    const used = typeof c.token_cache_size === 'number' ? c.token_cache_size : '?';
    const max  = typeof c.token_cache_max  === 'number' ? c.token_cache_max  : '?';
    return `${used} / ${max}`;
  })();

  const metrics = engineStatus?.metrics ?? null;
  const jwks = engineStatus?.jwks ? Object.entries(engineStatus.jwks) : [];

  return (
    <div>
      <div className="d-flex justify-content-between align-items-start mb-3 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">ABAC Policies</h2>
          <p className="text-muted mb-0 small">
            Manage Attribute-Based Access Control (ABAC) policies with OIDC token validation
          </p>
        </div>

        <div className="d-flex gap-2 align-items-center flex-wrap">
          <div className="d-flex gap-2 align-items-center">
            <label htmlFor="service-filter" className="form-label mb-0 small">Service:</label>
            <select
              id="service-filter"
              className="form-select form-select-sm"
              style={{maxWidth:'200px'}}
              value={selectedServiceFilter || ''}
              onChange={(e) => {
                setSelectedServiceFilter(e.target.value || null);
                api.loadAbacPolicies(0, 100, { service_id: e.target.value || null });
              }}
              disabled={loading}
            >
              <option value="">All Services</option>
              {state.services?.map(service => (
                <option key={service.id} value={service.id}>{service.name}</option>
              ))}
            </select>
          </div>
          <button className="btn btn-primary btn-sm" onClick={handleCreateNew} disabled={loading}>Create Policy</button>
          <button className="btn btn-success btn-sm" onClick={() => handleDeployPolicies()} disabled={loading || deployingPolicies || policies.length === 0}>
            {deployingPolicies ? 'Deploying...' : 'Deploy All'}
          </button>
        </div>
      </div>

      {/* Engine Status Card - always shown */}
      <div className={`card mb-3 border-2 ${engineStatus?.status === 'running' ? 'border-success' : 'border-danger'}`}>
        {/* Header row */}
        <div className="card-header py-2">
          <div className="d-flex align-items-center gap-2">
            <span className={`status-indicator ${engineStatus?.status === 'running' ? 'status-green' : 'status-red'} ${engineLoading ? 'status-indicator-animated' : ''}`} />
            <strong>ABAC Engine</strong>
            {engineLoading && <span className="spinner-border spinner-border-sm text-muted ms-1" />}
            {!engineLoading && engineStatus && (
              <span className={`badge ms-1 ${engineStatus.status === 'running' ? 'bg-success-lt text-success' : 'bg-danger-lt text-danger'}`}>
                {engineStatus.status}
              </span>
            )}
            {!engineLoading && !engineStatus && (
              <span className="badge bg-secondary-lt text-secondary ms-1">unknown</span>
            )}
            <span className="text-muted small ms-3">Policies: <strong className="text-body">{engineLoadedCount ?? (engineLoading ? '…' : 'N/A')}</strong></span>
            <span className="text-muted small ms-2">Services: <strong className="text-body">{engineServicesCount ?? (engineLoading ? '…' : 'N/A')}</strong></span>
            <span className="text-muted small ms-2">Uptime: <strong className="text-body">{engineUptime ?? (engineLoading ? '…' : 'N/A')}</strong></span>
            {engineCacheSize && <span className="text-muted small ms-2">Token Cache: <strong className="text-body">{engineCacheSize}</strong></span>}
            <button className="btn btn-sm btn-ghost-secondary ms-auto" onClick={refreshEngineStatus} disabled={engineLoading} title="Refresh engine status">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 11A8 8 0 1 0 9 3.93"/><polyline points="20 3 20 11 12 11"/></svg>
            </button>
          </div>
          {state.errors?.abacEngineStatus && (
            <div className="alert alert-danger mt-2 mb-0 py-1 small">Engine unreachable: {state.errors.abacEngineStatus?.message || String(state.errors.abacEngineStatus) || 'Connection failed'}</div>
          )}
        </div>

        {/* Metrics datagrid */}
        {metrics && (
          <div className="card-body py-3">
            <h4 className="card-title mb-3">Decision Metrics</h4>
            <div className="datagrid">
              <div className="datagrid-item">
                <div className="datagrid-title">Total Decisions</div>
                <div className="datagrid-content fw-bold">{fmtNum(metrics.total_decisions)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">Allow</div>
                <div className="datagrid-content text-success fw-bold">{fmtNum(metrics.allow_count)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">Deny</div>
                <div className="datagrid-content text-danger fw-bold">{fmtNum(metrics.deny_count)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">Errors</div>
                <div className="datagrid-content">
                  <span className={metrics.error_count > 0 ? 'text-warning fw-bold' : 'text-muted'}>{fmtNum(metrics.error_count)}</span>
                </div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">Total Requests</div>
                <div className="datagrid-content">{fmtNum(metrics.total_requests)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">Requests / sec</div>
                <div className="datagrid-content">{metrics.requests_per_second != null ? Number(metrics.requests_per_second).toFixed(2) : '—'}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">Avg Latency</div>
                <div className="datagrid-content">{fmtUs(metrics.avg_latency_us)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">Max Latency</div>
                <div className="datagrid-content">{fmtUs(metrics.max_latency_us)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">P50 Latency</div>
                <div className="datagrid-content">{fmtUs(metrics.p50_latency_us)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">P95 Latency</div>
                <div className="datagrid-content">{fmtUs(metrics.p95_latency_us)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">P99 Latency</div>
                <div className="datagrid-content">{fmtUs(metrics.p99_latency_us)}</div>
              </div>
              <div className="datagrid-item">
                <div className="datagrid-title">Uptime</div>
                <div className="datagrid-content">{fmtUptime(metrics.uptime_seconds) ?? '—'}</div>
              </div>
              {metrics.unprotected_services_count != null && (
                <div className="datagrid-item">
                  <div className="datagrid-title">Unprotected Services</div>
                  <div className="datagrid-content">
                    <span className={metrics.unprotected_services_count > 0 ? 'text-warning fw-bold' : 'text-muted'}>{metrics.unprotected_services_count}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* JWKS Issuers */}
        {jwks.length > 0 && (
          <div className="card-body border-top py-3">
            <h4 className="card-title mb-3">JWKS Issuers</h4>
            <div className="table-responsive">
              <table className="table table-sm table-vcenter">
                <thead>
                  <tr>
                    <th>Issuer</th>
                    <th>JWKS URI</th>
                    <th className="text-center">Keys Cached</th>
                    <th className="text-center">Refreshes</th>
                    <th className="text-end">Cache Age</th>
                    <th>Last Error</th>
                  </tr>
                </thead>
                <tbody>
                  {jwks.map(([issuer, info]) => {
                    const healthy = info.keys_cached > 0;
                    const cacheAge = info.cache_age_seconds != null && info.cache_age_seconds >= 0
                      ? `${Math.round(info.cache_age_seconds)}s`
                      : '—';
                    return (
                      <tr key={issuer}>
                        <td>
                          <span className={`status-indicator status-indicator-sm ${healthy ? 'status-green' : 'status-secondary'} me-1`} />
                          <code className="small" title={issuer}>{issuer.length > 50 ? issuer.slice(0, 47) + '…' : issuer}</code>
                        </td>
                        <td>
                          {info.jwks_uri
                            ? <code className="small text-muted" title={info.jwks_uri}>{info.jwks_uri.length > 40 ? info.jwks_uri.slice(0, 37) + '…' : info.jwks_uri}</code>
                            : <span className="text-muted small">auto-detect</span>
                          }
                        </td>
                        <td className="text-center">
                          <span className={`badge ${info.keys_cached > 0 ? 'bg-success-lt text-success' : 'bg-secondary-lt text-secondary'}`}>
                            {info.keys_cached}
                          </span>
                        </td>
                        <td className="text-center text-muted small">{info.refresh_count ?? 0}</td>
                        <td className="text-end text-muted small">{cacheAge}</td>
                        <td>
                          {info.last_error
                            ? <span className="text-danger small" title={info.last_error}>{String(info.last_error).slice(0, 40)}</span>
                            : <span className="text-muted small">—</span>
                          }
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center py-5"><div className="spinner-border text-primary" /><div className="text-muted mt-2">Loading ABAC policies...</div></div>
      )}

      {state.errors?.abacPolicies && (
        <div className="alert alert-danger d-flex justify-content-between align-items-center">
          <span>Failed to load ABAC policies: {state.errors.abacPolicies.message}</span>
          <button className="btn btn-sm btn-secondary" onClick={loadPolicies}>Retry</button>
        </div>
      )}

      {!loading && policies.length === 0 && (
        <div className="card card-body text-center py-5">
          <div className="mb-3" style={{fontSize:'48px'}}>🛡️</div>
          <h3>No ABAC Policies</h3>
          <p className="text-muted">Create your first ABAC policy to control access with attribute-based rules.</p>
          <div><button className="btn btn-primary" onClick={handleCreateNew}>Create Your First Policy</button></div>
        </div>
      )}

      {!loading && policies.length > 0 && (
        <>
          <div className="row row-cards">
            {policies.map(policy => (
              <div key={policy.id} className="col-md-6 col-lg-4">
                <div className="card">
                  <div className="card-header">
                    <div>
                      <h4 className="card-title mb-0">{policy.name}</h4>
                      {policy.description && <p className="text-muted small mb-0">{policy.description}</p>}
                    </div>
                    <span className={`badge ${policy.enabled ? 'bg-success-lt' : 'bg-secondary-lt'}`}>
                      {policy.enabled ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-1 small"><span className="text-muted">Service:</span><span>{state.services?.find(s => s.id === policy.service_id)?.name || policy.service_id}</span></div>
                    <div className="d-flex justify-content-between mb-1 small"><span className="text-muted">Version:</span><span>{policy.version || '1.0.0'}</span></div>
                    <div className="d-flex justify-content-between mb-1 small"><span className="text-muted">DSL Rules:</span><span>{policy.dsl?.rules?.length || 0} rule(s)</span></div>
                    <div className="d-flex justify-content-between mb-1 small"><span className="text-muted">OIDC Issuer:</span><span className="text-truncate ms-2" style={{maxWidth:'150px'}}>{policy.oidc_config?.issuer}</span></div>
                    <div className="d-flex justify-content-between mt-2 pt-2 border-top small text-muted">
                      <span>Created: {new Date(policy.created_at).toLocaleDateString()}</span>
                      <span>Updated: {new Date(policy.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="card-footer d-flex gap-1">
                    <button className="btn btn-sm btn-primary flex-fill" onClick={() => handleEdit(policy)}>Edit</button>
                    <button className="btn btn-sm btn-info flex-fill" onClick={() => handleDeployPolicies([policy.service_id])}>Deploy</button>
                    <button className="btn btn-sm btn-danger flex-fill" onClick={() => setDeleteConfirm(policy)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {state.pagination?.abacPolicies && (
            <div className="d-flex justify-content-center align-items-center gap-3 mt-3 pt-3 border-top">
              <button className="btn btn-sm" disabled={!(state.pagination.abacPolicies.offset > 0)} onClick={() => { const o = Math.max(0, state.pagination.abacPolicies.offset - 100); api.loadAbacPolicies(o, 100, { service_id: selectedServiceFilter || null }); }}>Previous</button>
              <span className="text-muted small">Page {Math.floor(state.pagination.abacPolicies.offset / 100) + 1} of {Math.ceil(state.abacPolicies.total / 100) || 1}</span>
              <button className="btn btn-sm" disabled={!state.pagination.abacPolicies.hasMore} onClick={() => { const o = state.pagination.abacPolicies.offset + 100; api.loadAbacPolicies(o, 100, { service_id: selectedServiceFilter || null }); }}>Next</button>
            </div>
          )}
        </>
      )}

      <ABACPolicyModal
        isOpen={showModal}
        policy={editingPolicy}
        onClose={handleCloseModal}
        onPolicySaved={() => { handleCloseModal(); loadPolicies(); }}
      />

      {deleteConfirm && (
        <>
          <div className="modal-backdrop fade show" style={{zIndex:10001}} />
          <div className="modal fade show" style={{display:'block',zIndex:10002}} onClick={() => setDeleteConfirm(null)}>
            <div className="modal-dialog modal-sm modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header"><h5 className="modal-title">Delete ABAC Policy</h5><button type="button" className="btn-close" onClick={() => setDeleteConfirm(null)} /></div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this policy?</p>
                  <div className="card card-body bg-light small">
                    <strong>Name:</strong> {deleteConfirm.name}<br />
                    <strong>Service:</strong> {state.services?.find(s => s.id === deleteConfirm.service_id)?.name}<br />
                    <strong>Status:</strong> {deleteConfirm.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn me-auto" onClick={() => setDeleteConfirm(null)}>Cancel</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)}>Delete Policy</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ABACPoliciesTab;
