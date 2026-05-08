import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/AppState';

/**
 * DebugView Component
 * 
 * Exact replica of admin-ui/js/debug.js + debug_graphical.js functionality
 * including pagination, request grouping, and graphical flow visualization
 */
const DebugView = () => {
  const { api } = useAppState();
  const [debugEntries, setDebugEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    offset: 0,
    limit: 20,
    total: 0,
    isLastPage: true
  });
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [showLogsOverlay, setShowLogsOverlay] = useState(false);
  const [showGraphicalView, setShowGraphicalView] = useState(false);
  const [currentLogEntries, setCurrentLogEntries] = useState([]);

  // Load debug entries with pagination - exact replica of original loadDebugEntries
  const loadDebugEntries = async (pageOffset = null) => {
    if (pageOffset !== null) {
      setPagination(prev => ({ ...prev, offset: pageOffset }));
    }
    
    const offset = pageOffset !== null ? pageOffset : pagination.offset;
    const limit = pagination.limit;
    
    setLoading(true);
    setError(null);
    
    try {
      const data = await api.call(`/api/v1/debug?offset=${offset}&limit=${limit}`);
      const entries = data.entries || [];
      
      setDebugEntries(entries);
      setPagination(prev => ({
        ...prev,
        offset,
        total: entries.length,
        isLastPage: entries.length < limit
      }));
    } catch (error) {
      console.error('Failed to load debug entries:', error);
      setError(`Failed to load debug entries: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebugEntries();
  }, []);

  // Get grouped debug entries - exact replica of original getGroupedDebugEntries
  const getGroupedDebugEntries = () => {
    const latestEntriesByRequestId = {};
    debugEntries.forEach(entry => {
      const reqId = entry.x_request_id || entry.info?.request_id || entry.id;
      if (!latestEntriesByRequestId[reqId] || 
          new Date(entry.timestamp) > new Date(latestEntriesByRequestId[reqId].timestamp)) {
        latestEntriesByRequestId[reqId] = entry;
      }
    });
    return Object.values(latestEntriesByRequestId);
  };

  // Show debug entry details - exact replica of original showDebugEntryDetails
  const showDebugEntryDetails = async (entryId) => {
    try {
      const data = await api.call(`/api/v1/debug/${entryId}`);
      const logEntries = data.entries || [];
      setCurrentLogEntries(logEntries);
      setSelectedEntry(entryId);
      setShowLogsOverlay(true);
    } catch (error) {
      alert(`Failed to load debug logs: ${error.message}`);
    }
  };

  // Show graphical debug view - exact replica of original functionality
  const showGraphicalDebugViewForEntry = async (entryId) => {
    try {
      const data = await api.call(`/api/v1/debug/${entryId}`);
      setCurrentLogEntries(data.entries || []);
      setSelectedEntry(entryId);
      setShowGraphicalView(true);
    } catch (error) {
      alert(`Failed to load debug logs: ${error.message}`);
    }
  };

  // Pagination controls - exact replica of original renderDebugPaginationControls
  const renderPaginationControls = () => {
    const latestEntries = getGroupedDebugEntries();
    const total = latestEntries.length;
    const isFirst = pagination.offset === 0;
    const isLast = pagination.isLastPage;
    const showingFrom = total === 0 ? 0 : 1;
    const showingTo = total;

    return (
      <div style={{ marginBottom: '1rem', marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
        <button 
          className="btn blue" 
          onClick={() => loadDebugEntries(Math.max(0, pagination.offset - pagination.limit))}
          disabled={isFirst}
        >
          Previous
        </button>
        <button 
          className="btn blue" 
          onClick={() => loadDebugEntries(pagination.offset + pagination.limit)}
          disabled={isLast}
        >
          Next
        </button>
        <span>Showing {showingFrom} - {showingTo} of {total}</span>
      </div>
    );
  };

  // GraphicalDebugOverlay component
  const GraphicalDebugOverlay = () => {
    if (!showGraphicalView || !currentLogEntries.length) return null;

    // Phase configuration from original debug_graphical.js
    const PHASE_ORDER = [
      'client_start', 'global_plugins_loaded', 'plugins_loaded', 'certificate_phase',
      'rewrite_phase', 'access_phase', 'access_plugin_failed', 'request_validation',
      'circuit_breaker_opened', 'circuit_breaker_fallback', 'upstream_forwarded',
      'response_validation', 'header_filter_phase', 'body_filter_phase', 'response_ready'
    ];

    const PHASE_ICONS = {
      'client_start': '👤', 'global_plugins_loaded': '🌐', 'plugins_loaded': '🔌',
      'certificate_phase': '🔒', 'rewrite_phase': '✏️', 'access_phase': '🚪',
      'access_plugin_failed': '❌', 'request_validation': '📏', 'circuit_breaker_opened': '🔴',
      'circuit_breaker_fallback': '🔄', 'upstream_forwarded': '🔄', 'response_validation': '📐',
      'header_filter_phase': '📋', 'body_filter_phase': '📄', 'response_ready': '✅'
    };

    const PHASE_NAMES = {
      'client_start': 'Client Request', 'global_plugins_loaded': 'Global Plugins',
      'plugins_loaded': 'Plugins Loaded', 'certificate_phase': 'Certificate',
      'rewrite_phase': 'Rewrite', 'access_phase': 'Access', 'access_plugin_failed': 'Access Failed',
      'request_validation': 'Request Validation', 'circuit_breaker_opened': 'Circuit Breaker Open',
      'circuit_breaker_fallback': 'Circuit Breaker Fallback', 'upstream_forwarded': 'Upstream',
      'response_validation': 'Response Validation', 'header_filter_phase': 'Header Filter',
      'body_filter_phase': 'Body Filter', 'response_ready': 'Response Ready'
    };

    const sortedEntries = currentLogEntries.slice().sort((a, b) => {
      const stepA = a.info && typeof a.info.step === 'number' ? a.info.step : 0;
      const stepB = b.info && typeof b.info.step === 'number' ? b.info.step : 0;
      return stepA - stepB;
    });

    // Group entries by phase
    const entriesByPhase = {};
    sortedEntries.forEach(entry => {
      const phase = entry.info?.phase || 'unknown';
      if (!entriesByPhase[phase]) {
        entriesByPhase[phase] = [];
      }
      entriesByPhase[phase].push(entry);
    });

    // Add client start entry
    if (sortedEntries.length > 0) {
      const firstEntry = sortedEntries[0];
      entriesByPhase['client_start'] = [{
        info: {
          phase: 'client_start',
          step: -1,
          method: firstEntry.info?.method,
          url: firstEntry.info?.url,
          service_name: firstEntry.info?.service_name,
          client: firstEntry.info?.client,
          timestamp: firstEntry.timestamp
        },
        timestamp: firstEntry.timestamp
      }];
    }

    const upstreamIndex = PHASE_ORDER.indexOf('upstream_forwarded');
    const topLinePhases = PHASE_ORDER.slice(0, upstreamIndex + 1);
    const bottomLinePhases = PHASE_ORDER.slice(upstreamIndex + 1);

    const generatePhaseHTML = (phases) => {
      return phases.map(phase => {
        const entries = entriesByPhase[phase] || [];
        if (entries.length === 0) return null;
        
        const entry = entries[entries.length - 1];
        
        let hasError = false;
        if (phase !== 'client_start') {
          hasError = entry.info?.status_code > 399 || 
                    entry.info?.plugin_errors?.length > 0 ||
                    phase.includes('failed') ||
                    phase.includes('circuit_breaker_opened') ||
                    (phase.includes('validation') && entry.info?.error) ||
                    entry.info?.error?.includes('validation failed');
        }
        
        const icon = PHASE_ICONS[phase] || '⚪';
        const name = PHASE_NAMES[phase] || phase;
        
        return (
          <div 
            key={phase}
            className={`phase-step ${hasError ? 'error' : 'success'}`}
            onClick={() => showPhaseDetails(phase)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100px',
              height: '80px',
              border: hasError ? '2px solid #dc3545' : '2px solid #28a745',
              borderRadius: '12px',
              cursor: 'pointer',
              margin: '0 0.5rem',
              background: hasError ? 'linear-gradient(135deg, #fff8f8 0%, #ffeaea 100%)' : 'linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%)',
              position: 'relative'
            }}
          >
            <div style={{ fontSize: '24px', marginBottom: '5px' }}>{icon}</div>
            <div style={{ fontSize: '11px', textAlign: 'center', color: '#333', fontWeight: '500' }}>{name}</div>
            {hasError && (
              <div style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: '#dc3545',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>!</div>
            )}
          </div>
        );
      }).filter(Boolean);
    };

    const showPhaseDetails = (phase) => {
      // Implementation for showing phase details
      console.log('Show phase details for:', phase);
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.9)',
        zIndex: 10000,
        overflow: 'auto'
      }}>
        <div style={{
          background: 'white',
          margin: '20px auto',
          maxWidth: '1200px',
          borderRadius: '12px',
          padding: '24px',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '30px',
            paddingBottom: '15px',
            borderBottom: '2px solid #eee'
          }}>
            <h2 style={{ margin: 0, color: '#333' }}>Request Flow Visualization</h2>
            <button 
              onClick={() => setShowGraphicalView(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'none',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#999'
              }}
            >
              ×
            </button>
          </div>
          
          <div style={{ margin: '30px 0', minHeight: '200px' }}>
            {/* Top line: Client through Upstream */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '15px', 
              padding: '20px 0',
              borderBottom: '1px dashed #ccc'
            }}>
              {generatePhaseHTML(topLinePhases)}
            </div>
            
            {/* Bottom line: Post-upstream phases */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'center', 
              alignItems: 'center', 
              gap: '15px', 
              padding: '20px 0'
            }}>
              {generatePhaseHTML(bottomLinePhases)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Debug logs overlay
  const DebugLogsOverlay = () => {
    if (!showLogsOverlay || !currentLogEntries.length) return null;

    const sortedEntries = currentLogEntries.slice().sort((a, b) => {
      const stepA = a.info && typeof a.info.step === 'number' ? a.info.step : 0;
      const stepB = b.info && typeof b.info.step === 'number' ? b.info.step : 0;
      return stepA - stepB;
    });

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(0,0,0,0.8)',
        zIndex: 9999,
        overflow: 'auto'
      }}>
        <div style={{
          background: '#fff',
          margin: '40px auto',
          maxWidth: '900px',
          borderRadius: '8px',
          padding: '32px',
          position: 'relative'
        }}>
          <button 
            onClick={() => setShowLogsOverlay(false)}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              fontSize: '20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            ×
          </button>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2>Debug Logs for Request <span style={{ fontSize: '0.8em', color: '#888' }}>{selectedEntry}</span></h2>
            <button 
              onClick={() => {
                setShowLogsOverlay(false);
                setShowGraphicalView(true);
              }}
              style={{
                background: '#007bff',
                color: 'white',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px'
              }}
            >
              📊 Graphical View
            </button>
          </div>
          <div style={{ maxHeight: '70vh', overflow: 'auto' }}>
            {sortedEntries.map((entry, idx) => (
              <div key={idx} style={{ borderBottom: '1px solid #eee', marginBottom: '16px', paddingBottom: '8px' }}>
                <strong>Step {entry.info?.step || idx + 1} - {entry.info?.phase || ''}</strong><br />
                <span><b>Time:</b> {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</span><br />
                <span><b>Method:</b> {entry.info?.method || '-'}</span><br />
                <span><b>Service:</b> {entry.info?.service_name || '-'}</span><br />
                <span><b>Status:</b> {entry.info?.status_code !== undefined ? entry.info.status_code : '-'}</span><br />
                <span><b>Plugins Executed:</b> {Array.isArray(entry.info?.plugin_executed) ? 
                  entry.info.plugin_executed.map(pe => pe.plugins ? pe.plugins.join(', ') : '').join(' | ') : '-'}</span><br />
                <details style={{ marginTop: '8px' }}>
                  <summary>Full Debug Info</summary>
                  <pre>{JSON.stringify(entry.info, null, 2)}</pre>
                </details>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="section" id="debug">
        <div className="card">
          <div className="loading-spinner">
            <div className="spinner"></div>
            <p>Loading debug entries...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="section" id="debug">
        <div className="card">
          <div className="error">{error}</div>
        </div>
      </div>
    );
  }

  const latestEntries = getGroupedDebugEntries();

  return (
    <div className="section" id="debug">
      {renderPaginationControls()}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>API Debug Viewer</h2>
          <button 
            className="btn btn-primary" 
            onClick={() => loadDebugEntries(0)}
            style={{ marginLeft: '10px' }}
          >
            🔄 Refresh
          </button>
        </div>
        <div style={{ display: 'flex' }}>
          <aside style={{ width: '320px' }}>
            <h3>Log Entries</h3>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: '180px' }}>Time</th>
                  <th style={{ width: '80px' }}>Method</th>
                  <th style={{ minWidth: '300px', width: 'auto' }}>Request ID</th>
                  <th>Service Name</th>
                  <th style={{ width: '80px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {latestEntries.length === 0 ? (
                  <tr><td colSpan="5">No log entries</td></tr>
                ) : (
                  latestEntries.map(entry => {
                    const statusCode = entry.info?.status_code;
                    const methodClass = (typeof statusCode === 'number' && statusCode <= 399) ? 'green' : 
                                       (typeof statusCode === 'number' ? 'red' : '');
                    const entryId = entry.x_request_id || entry.info?.request_id || entry.id;
                    const isLLMRequest = entry.llm_request || entry.request_type === 'llm';
                    const llmIcon = isLLMRequest ? '🤖 ' : '';
                    
                    return (
                      <tr key={entryId}>
                        <td 
                          style={{ cursor: 'pointer', width: '180px', whiteSpace: 'nowrap' }}
                          onClick={() => showDebugEntryDetails(entryId)}
                        >
                          {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}
                        </td>
                        <td 
                          style={{ cursor: 'pointer', width: '80px' }}
                          onClick={() => showDebugEntryDetails(entryId)}
                          className={methodClass}
                        >
                          {llmIcon}{entry.info?.method || '-'}
                        </td>
                        <td 
                          style={{ 
                            cursor: 'pointer', 
                            minWidth: '300px', 
                            width: 'auto', 
                            fontFamily: 'monospace', 
                            fontSize: '0.85em', 
                            wordWrap: 'break-word', 
                            overflowWrap: 'break-word' 
                          }}
                          onClick={() => showDebugEntryDetails(entryId)}
                        >
                          {entryId}
                        </td>
                        <td 
                          style={{ cursor: 'pointer' }}
                          onClick={() => showDebugEntryDetails(entryId)}
                        >
                          {entry.info?.service_name || '-'}
                        </td>
                        <td style={{ width: '80px' }}>
                          <button 
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              fontSize: '16px',
                              padding: '4px'
                            }}
                            onClick={() => showGraphicalDebugViewForEntry(entryId)}
                            title="Graphical View"
                          >
                            📊
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </aside>
          <main style={{ flex: 1 }}>
            <div id="debug-details">
              <p>Click on any log entry to see detailed information</p>
            </div>
          </main>
        </div>
      </div>

      {/* Overlays */}
      <DebugLogsOverlay />
      <GraphicalDebugOverlay />
    </div>
  );
};

export default DebugView;
  };

  const loadDataplaneStatus = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/status/dataplanes`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      setDataplaneStatus(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load dataplane status:', err);
      setDataplaneStatus([]);
    }
  };

  const loadDebugLogs = async () => {
    try {
      const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/debug/logs`);
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      setDebugLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load debug logs:', err);
      setDebugLogs([]);
    }
  };

  const handleDebugTest = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setDebugResult(null);

      const testData = {
        ...debugForm,
        headers: debugForm.headers ? JSON.parse(debugForm.headers) : {}
      };

      const response = await authenticatedFetch(`${API_BASE_URL}/api/v1/debug/test-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testData)
      });

      const result = await response.json();
      setDebugResult(result);
    } catch (err) {
      console.error('Debug test failed:', err);
      setError(`Debug test failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field, value) => {
    setDebugForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const addHeader = () => {
    const key = prompt('Header name:');
    const value = prompt('Header value:');
    if (key && value) {
      try {
        const headers = debugForm.headers ? JSON.parse(debugForm.headers) : {};
        headers[key] = value;
        setDebugForm(prev => ({
          ...prev,
          headers: JSON.stringify(headers, null, 2)
        }));
      } catch (err) {
        alert('Invalid JSON in headers');
      }
    }
  };

  const clearDebugResult = () => {
    setDebugResult(null);
    setError(null);
  };

  return (
    <div className="card">
      <h2><i className="fas fa-bug"></i> Debug Tools</h2>
      
      {/* Debug Test Form - replicate original debug form layout */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Test Proxy Request</h3>
        <form onSubmit={handleDebugTest}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <div className="form-group">
              <label htmlFor="debug-method">HTTP Method:</label>
              <select
                id="debug-method"
                value={debugForm.method}
                onChange={(e) => handleFormChange('method', e.target.value)}
                className="form-control"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="debug-workspace">Workspace:</label>
              <select
                id="debug-workspace"
                value={debugForm.workspace}
                onChange={(e) => handleFormChange('workspace', e.target.value)}
                className="form-control"
              >
                <option value="">Select Workspace</option>
                {workspaces.map(ws => (
                  <option key={ws.id} value={ws.name}>{ws.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="debug-url">Request URL:</label>
            <input
              type="text"
              id="debug-url"
              value={debugForm.url}
              onChange={(e) => handleFormChange('url', e.target.value)}
              className="form-control"
              placeholder="e.g., /api/test or https://example.com/api/test"
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: '1rem' }}>
            <label htmlFor="debug-headers">Headers (JSON):</label>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end' }}>
              <textarea
                id="debug-headers"
                value={debugForm.headers}
                onChange={(e) => handleFormChange('headers', e.target.value)}
                className="form-control"
                placeholder='{"Authorization": "Bearer token", "Content-Type": "application/json"}'
                rows="3"
                style={{ flex: 1 }}
              />
              <button type="button" onClick={addHeader} className="btn btn-secondary">
                Add Header
              </button>
            </div>
          </div>

          {(debugForm.method === 'POST' || debugForm.method === 'PUT' || debugForm.method === 'PATCH') && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label htmlFor="debug-body">Request Body:</label>
              <textarea
                id="debug-body"
                value={debugForm.body}
                onChange={(e) => handleFormChange('body', e.target.value)}
                className="form-control"
                placeholder="Request body content"
                rows="4"
              />
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button type="submit" disabled={loading} className="btn btn-primary">
              {loading ? 'Testing...' : 'Test Request'}
            </button>
            <button type="button" onClick={clearDebugResult} className="btn btn-secondary">
              Clear Results
            </button>
          </div>
        </form>
      </div>

      {/* Debug Results - replicate original results display */}
      {error && (
        <div className="card" style={{ marginBottom: '1rem', backgroundColor: '#ffe6e6' }}>
          <h3 style={{ color: '#d32f2f' }}>Error</h3>
          <pre style={{ color: '#d32f2f', whiteSpace: 'pre-wrap' }}>{error}</pre>
        </div>
      )}

      {debugResult && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <h3>Debug Results</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <h4>Request Info</h4>
              <p><strong>Method:</strong> {debugResult.request?.method}</p>
              <p><strong>URL:</strong> {debugResult.request?.url}</p>
              <p><strong>Status:</strong> 
                <span style={{ 
                  color: debugResult.response?.status >= 400 ? '#d32f2f' : '#2e7d32',
                  fontWeight: 'bold'
                }}>
                  {debugResult.response?.status} {debugResult.response?.statusText}
                </span>
              </p>
              <p><strong>Duration:</strong> {debugResult.duration}ms</p>
            </div>
            <div>
              <h4>Response Headers</h4>
              <pre style={{ fontSize: '0.8rem', backgroundColor: '#f5f5f5', padding: '0.5rem' }}>
                {JSON.stringify(debugResult.response?.headers || {}, null, 2)}
              </pre>
            </div>
          </div>
          <div style={{ marginTop: '1rem' }}>
            <h4>Response Body</h4>
            <pre style={{ 
              backgroundColor: '#f5f5f5', 
              padding: '1rem', 
              maxHeight: '300px', 
              overflow: 'auto',
              fontSize: '0.9rem'
            }}>
              {typeof debugResult.response?.body === 'object' 
                ? JSON.stringify(debugResult.response.body, null, 2)
                : debugResult.response?.body || 'No response body'
              }
            </pre>
          </div>
        </div>
      )}

      {/* Dataplane Status - replicate original status monitoring */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3>Dataplane Status</h3>
        {dataplaneStatus.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {dataplaneStatus.map((dp, index) => (
              <div key={index} className="card" style={{ backgroundColor: '#f8f9fa' }}>
                <h4>{dp.id || `Dataplane ${index + 1}`}</h4>
                <p><strong>Status:</strong> 
                  <span style={{ 
                    color: dp.status === 'connected' ? '#2e7d32' : '#d32f2f',
                    fontWeight: 'bold'
                  }}>
                    {dp.status || 'Unknown'}
                  </span>
                </p>
                <p><strong>Last Seen:</strong> {dp.last_seen || 'Never'}</p>
                <p><strong>Version:</strong> {dp.version || 'Unknown'}</p>
                <p><strong>Config Hash:</strong> {dp.config_hash || 'Unknown'}</p>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            No dataplanes connected
          </div>
        )}
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button onClick={loadDataplaneStatus} className="btn btn-secondary">
            <i className="fas fa-sync"></i> Refresh Status
          </button>
        </div>
      </div>

      {/* Debug Logs - replicate original log viewer */}
      <div className="card">
        <h3>Recent Debug Logs</h3>
        {debugLogs.length > 0 ? (
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Level</th>
                  <th>Source</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {debugLogs.map((log, index) => (
                  <tr key={index}>
                    <td style={{ fontSize: '0.8rem' }}>{log.timestamp}</td>
                    <td>
                      <span style={{ 
                        color: log.level === 'error' ? '#d32f2f' : 
                               log.level === 'warn' ? '#f57c00' : '#2e7d32',
                        fontWeight: 'bold'
                      }}>
                        {log.level}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.8rem' }}>{log.source}</td>
                    <td style={{ fontSize: '0.9rem' }}>{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#666' }}>
            No debug logs available
          </div>
        )}
        <div style={{ marginTop: '1rem', textAlign: 'right' }}>
          <button onClick={loadDebugLogs} className="btn btn-secondary">
            <i className="fas fa-sync"></i> Refresh Logs
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugView;
