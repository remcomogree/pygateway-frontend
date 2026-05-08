import React, { useState } from 'react';

/**
 * GraphicalDebugView Component
 * 
 * Single-request flow visualization showing actual phases from debug data
 * Based on admin-ui/js/debug_graphical.js functionality
 */
const GraphicalDebugView = ({ requestId, debugEntries = [] }) => {
  const [selectedPhase, setSelectedPhase] = useState(null);

  // EXTENSIVE DEBUG LOGGING
  console.log('🔍 GraphicalDebugView - Props received:', {
    requestId,
    debugEntries,
    debugEntriesLength: debugEntries?.length,
    debugEntriesType: typeof debugEntries,
    debugEntriesIsArray: Array.isArray(debugEntries)
  });

  if (debugEntries && debugEntries.length > 0) {
    console.log('🔍 GraphicalDebugView - First debug entry structure:', debugEntries[0]);
    console.log('🔍 GraphicalDebugView - All debug entries:', debugEntries);
    
    debugEntries.forEach((entry, index) => {
      console.log(`🔍 Debug Entry ${index}:`, {
        timestamp: entry.timestamp,
        info: entry.info,
        hasInfo: !!entry.info,
        infoKeys: entry.info ? Object.keys(entry.info) : [],
        method: entry.info?.method || entry.method,
        url: entry.info?.url || entry.url || entry.info?.uri || entry.uri,
        client: entry.info?.client || entry.client || entry.info?.remote_addr || entry.remote_addr || entry.info?.source_ip || entry.source_ip,
        service_name: entry.info?.service_name || entry.service_name,
        phase: entry.info?.phase || entry.phase,
        step: entry.info?.step || entry.step
      });
    });
  }

  // Phase mapping to display order and icons
  const PHASE_ORDER = [
    'client_start',
    'global_plugins_loaded',
    'plugins_loaded', 
    'certificate_phase',
    'rewrite_phase',
    'access_phase',
    'access_plugin_failed',
    'request_validation',
    'circuit_breaker_opened',
    'circuit_breaker_fallback',
    'upstream_forwarded',
    'response_validation',
    'header_filter_phase',
    'body_filter_phase',
    'response_ready'
  ];

  const PHASE_ICONS = {
    'client_start': '👤',
    'global_plugins_loaded': '🌐',
    'plugins_loaded': '🔌',
    'certificate_phase': '🔒',
    'rewrite_phase': '✏️',
    'access_phase': '🚪',
    'access_plugin_failed': '❌',
    'request_validation': '📏',
    'circuit_breaker_opened': '🔴',
    'circuit_breaker_fallback': '🔄',
    'upstream_forwarded': '⬆️',
    'response_validation': '📐',
    'header_filter_phase': '📋',
    'body_filter_phase': '📄',
    'response_ready': '✅'
  };

  const PHASE_NAMES = {
    'client_start': 'Client Request',
    'global_plugins_loaded': 'Global Plugins',
    'plugins_loaded': 'Plugins Loaded',
    'certificate_phase': 'Certificate',
    'rewrite_phase': 'Rewrite',
    'access_phase': 'Access',
    'access_plugin_failed': 'Access Failed',
    'request_validation': 'Request Validation',
    'circuit_breaker_opened': 'Circuit Breaker Open',
    'circuit_breaker_fallback': 'Circuit Breaker Fallback',
    'upstream_forwarded': 'Upstream',
    'response_validation': 'Response Validation',
    'header_filter_phase': 'Header Filter',
    'body_filter_phase': 'Body Filter',
    'response_ready': 'Response Ready'
  };

  // Process debug entries to group by phase
  const processDebugEntries = () => {
    console.log('🔍 processDebugEntries - Starting with:', { debugEntries, length: debugEntries?.length });
    
    if (!debugEntries || debugEntries.length === 0) {
      console.log('🔍 processDebugEntries - No debug entries, returning empty');
      return { entriesByPhase: {}, firstEntry: null };
    }

    // Sort entries by step/timestamp
    const sortedEntries = debugEntries.slice().sort((a, b) => {
      const stepA = a.info && typeof a.info.step === 'number' ? a.info.step : 0;
      const stepB = b.info && typeof b.info.step === 'number' ? b.info.step : 0;
      return stepA - stepB;
    });

    console.log('🔍 processDebugEntries - Sorted entries:', sortedEntries);

    // Group entries by phase
    const entriesByPhase = {};
    sortedEntries.forEach((entry, index) => {
      const phase = entry.info?.phase || entry.phase || 'unknown';
      console.log(`🔍 processDebugEntries - Entry ${index} phase: ${phase}`, entry);
      
      if (!entriesByPhase[phase]) {
        entriesByPhase[phase] = [];
      }
      entriesByPhase[phase].push(entry);
    });

    console.log('🔍 processDebugEntries - Grouped by phase:', entriesByPhase);

    // Add client start entry if we have any entries
    const firstEntry = sortedEntries[0];
    console.log('🔍 processDebugEntries - First entry for client_start:', firstEntry);
    
    if (firstEntry) {
      // Try to get client info from various possible locations
      const clientInfo = firstEntry.info?.client || 
                        firstEntry.info?.remote_addr || 
                        firstEntry.info?.source_ip ||
                        firstEntry.client ||
                        firstEntry.remote_addr ||
                        firstEntry.source_ip ||
                        firstEntry.info?.client_ip ||
                        firstEntry.client_ip;
                        
      const methodInfo = firstEntry.info?.method || firstEntry.method;
      const urlInfo = firstEntry.info?.url || firstEntry.info?.uri || firstEntry.url || firstEntry.uri || firstEntry.info?.path || firstEntry.path;
      const serviceInfo = firstEntry.info?.service_name || firstEntry.service_name || firstEntry.info?.service || firstEntry.service;
      
      console.log('🔍 processDebugEntries - Extracted client info:', {
        clientInfo,
        methodInfo,
        urlInfo,
        serviceInfo,
        allPossibleFields: {
          'firstEntry.info?.client': firstEntry.info?.client,
          'firstEntry.info?.remote_addr': firstEntry.info?.remote_addr,
          'firstEntry.info?.source_ip': firstEntry.info?.source_ip,
          'firstEntry.client': firstEntry.client,
          'firstEntry.remote_addr': firstEntry.remote_addr,
          'firstEntry.source_ip': firstEntry.source_ip,
          'firstEntry.info?.client_ip': firstEntry.info?.client_ip,
          'firstEntry.client_ip': firstEntry.client_ip,
          'firstEntry.info?.method': firstEntry.info?.method,
          'firstEntry.method': firstEntry.method,
          'firstEntry.info?.url': firstEntry.info?.url,
          'firstEntry.info?.uri': firstEntry.info?.uri,
          'firstEntry.url': firstEntry.url,
          'firstEntry.uri': firstEntry.uri,
          'firstEntry.info?.path': firstEntry.info?.path,
          'firstEntry.path': firstEntry.path,
          'firstEntry.info?.service_name': firstEntry.info?.service_name,
          'firstEntry.service_name': firstEntry.service_name,
          'firstEntry.info?.service': firstEntry.info?.service,
          'firstEntry.service': firstEntry.service
        }
      });
      
      entriesByPhase['client_start'] = [{
        info: {
          phase: 'client_start',
          step: -1,
          method: methodInfo,
          url: urlInfo,
          service_name: serviceInfo,
          client: clientInfo,
          timestamp: firstEntry.timestamp
        },
        timestamp: firstEntry.timestamp
      }];
      
      console.log('🔍 processDebugEntries - Created client_start entry:', entriesByPhase['client_start'][0]);
    }

    const result = { entriesByPhase, firstEntry };
    console.log('🔍 processDebugEntries - Final result:', result);
    return result;
  };

  const { entriesByPhase, firstEntry } = processDebugEntries();

  // Determine which phases go on top line vs bottom line
  const upstreamIndex = PHASE_ORDER.indexOf('upstream_forwarded');
  const topLinePhases = PHASE_ORDER.slice(0, upstreamIndex + 1);
  const bottomLinePhases = PHASE_ORDER.slice(upstreamIndex + 1);

  const renderPhase = (phase) => {
    const entries = entriesByPhase[phase] || [];
    if (entries.length === 0) return null;
    
    const entry = entries[entries.length - 1]; // Use latest entry for this phase
    
    // Determine if phase has errors
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
        className={`phase-step ${hasError ? 'error' : 'success'} ${selectedPhase === phase ? 'selected' : ''}`}
        onClick={() => setSelectedPhase(phase)}
        title={name}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100px',
          height: '80px',
          border: `2px solid ${hasError ? '#dc3545' : '#28a745'}`,
          borderRadius: '12px',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          position: 'relative',
          background: selectedPhase === phase ? '#e3f2fd' : (hasError ? 'linear-gradient(135deg, #fff8f8 0%, #ffeaea 100%)' : 'linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%)'),
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          margin: '5px'
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
  };

  const renderPhaseDetails = () => {
    if (!selectedPhase) {
      return <p>Click on any phase icon to see detailed information</p>;
    }

    // Handle special case for client_start
    if (selectedPhase === 'client_start') {
      // Find plugins_loaded phase for request details
      const pluginsLoadedEntry = debugEntries.find(entry => 
        (entry.info?.phase === 'plugins_loaded' || entry.phase === 'plugins_loaded')
      );
      
      if (!pluginsLoadedEntry && !firstEntry) {
        return <p>No request data available</p>;
      }
      
      const data = pluginsLoadedEntry ? (pluginsLoadedEntry.info || pluginsLoadedEntry) : firstEntry;
      
      return (
        <div>
          <h3>Client Request Start 👤</h3>
          
          <div style={{ margin: '8px 0' }}>
            <span style={{ fontWeight: 'bold', color: '#555' }}>Method:</span>
            <span style={{ marginLeft: '10px', color: '#333' }}>{data?.method || data?.info?.method || '-'}</span>
          </div>
          
          <div style={{ margin: '8px 0' }}>
            <span style={{ fontWeight: 'bold', color: '#555' }}>URL:</span>
            <span style={{ marginLeft: '10px', color: '#333' }}>{data?.url || data?.info?.url || '-'}</span>
          </div>
          
          <div style={{ margin: '8px 0' }}>
            <span style={{ fontWeight: 'bold', color: '#555' }}>Client IP:</span>
            <span style={{ marginLeft: '10px', color: '#333' }}>{data?.client || data?.info?.client || '-'}</span>
          </div>
          
          <div style={{ margin: '8px 0' }}>
            <span style={{ fontWeight: 'bold', color: '#555' }}>Service:</span>
            <span style={{ marginLeft: '10px', color: '#333' }}>{data?.service_name || data?.info?.service_name || '-'}</span>
          </div>
          
          <div style={{ margin: '8px 0' }}>
            <span style={{ fontWeight: 'bold', color: '#555' }}>Request ID:</span>
            <span style={{ marginLeft: '10px', color: '#333' }}>{requestId || '-'}</span>
          </div>
        </div>
      );
    }

    // Get phase entries
    const phaseEntries = entriesByPhase[selectedPhase] || [];
    const entry = phaseEntries[phaseEntries.length - 1];
    
    if (!entry) {
      return <p>No data available for this phase</p>;
    }
    
    const hasError = entry.info?.status_code > 399 || 
                    entry.info?.plugin_errors?.length > 0 ||
                    selectedPhase.includes('failed') ||
                    selectedPhase.includes('circuit_breaker_opened') ||
                    (selectedPhase.includes('validation') && entry.info?.error) ||
                    entry.info?.error?.includes('validation failed');

    return (
      <div>
        <h3>{PHASE_NAMES[selectedPhase] || selectedPhase} Details {hasError ? ' ⚠️' : ' ✅'}</h3>
        
        <div style={{ margin: '8px 0' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>Step:</span>
          <span style={{ marginLeft: '10px', color: '#333' }}>{entry.info?.step || '-'}</span>
        </div>
        
        <div style={{ margin: '8px 0' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>Timestamp:</span>
          <span style={{ marginLeft: '10px', color: '#333' }}>{entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</span>
        </div>
        
        <div style={{ margin: '8px 0' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>Time Used:</span>
          <span style={{ marginLeft: '10px', color: '#333' }}>{entry.info?.time_used ? (entry.info.time_used * 1000).toFixed(2) + 'ms' : '-'}</span>
        </div>
        
        <div style={{ margin: '8px 0' }}>
          <span style={{ fontWeight: 'bold', color: '#555' }}>Status Code:</span>
          <span style={{ marginLeft: '10px', color: entry.info?.status_code > 399 ? '#dc3545' : '#28a745' }}>
            {entry.info?.status_code || '-'}
          </span>
        </div>
        
        {/* Plugin execution info */}
        {entry.info?.plugin_executed && (
          <div style={{ margin: '8px 0' }}>
            <span style={{ fontWeight: 'bold', color: '#555' }}>Plugins Executed:</span>
            <span style={{ marginLeft: '10px', color: '#333' }}>{entry.info.plugin_executed.plugins ? entry.info.plugin_executed.plugins.join(', ') : '-'}</span>
          </div>
        )}
        
        {/* Plugin errors */}
        {entry.info?.plugin_errors && entry.info.plugin_errors.length > 0 && (
          <div style={{ margin: '8px 0' }}>
            <span style={{ fontWeight: 'bold', color: '#555' }}>Plugin Errors:</span>
            <span style={{ marginLeft: '10px', color: '#dc3545' }}>
              {entry.info.plugin_errors.map(err => err.error || err).join(', ')}
            </span>
          </div>
        )}
        
        {/* Full JSON details */}
        <details style={{ marginTop: '15px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>Full JSON Data</summary>
          <div style={{
            background: '#2d3748',
            color: '#e2e8f0',
            padding: '15px',
            borderRadius: '6px',
            fontFamily: "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
            fontSize: '12px',
            overflowX: 'auto',
            marginTop: '15px',
            maxHeight: '300px',
            overflowY: 'auto'
          }}>
            {JSON.stringify(entry.info, null, 2)}
          </div>
        </details>
      </div>
    );
  };

  if (!debugEntries || debugEntries.length === 0) {
    return (
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        margin: '20px 0'
      }}>
        <p>No debug data available for visualization</p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      position: 'relative',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
      margin: '20px 0'
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
        <div style={{ display: 'flex', gap: '20px', fontSize: '14px', color: '#666' }}>
          <span><strong>Request ID:</strong> {requestId || '-'}</span>
          {(() => {
            // Find plugins_loaded phase for request details
            const pluginsLoadedEntry = debugEntries.find(entry => 
              (entry.info?.phase === 'plugins_loaded' || entry.phase === 'plugins_loaded')
            );
            console.log('🔍 GraphicalDebugView - plugins_loaded entry found:', pluginsLoadedEntry);
            if (pluginsLoadedEntry) {
              const data = pluginsLoadedEntry.info || pluginsLoadedEntry;
              console.log('🔍 GraphicalDebugView - Using plugins_loaded data:', data);
              return (
                <>
                  <span><strong>Method:</strong> {data.method || '-'}</span>
                  <span><strong>URL:</strong> {data.url || '-'}</span>
                  <span><strong>Client IP:</strong> {data.client || '-'}</span>
                  <span><strong>Service:</strong> {data.service_name || '-'}</span>
                </>
              );
            }
            console.log('🔍 GraphicalDebugView - Using firstEntry fallback:', firstEntry);
            // Fallback to firstEntry
            return (
              <>
                <span><strong>Method:</strong> {firstEntry?.info?.method || firstEntry?.method || '-'}</span>
                <span><strong>Service:</strong> {firstEntry?.info?.service_name || firstEntry?.service_name || '-'}</span>
              </>
            );
          })()}
        </div>
      </div>
      
      <div style={{ margin: '30px 0', minHeight: '200px' }}>
        {/* Top line: Client through Upstream */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          padding: '20px 0',
          flexWrap: 'wrap',
          borderBottom: '1px dashed #ccc'
        }}>
          {topLinePhases.map(phase => renderPhase(phase)).filter(Boolean)}
        </div>
        
        {/* Connection lines */}
        <div style={{ textAlign: 'center', margin: '10px 0' }}>
          <svg width="100%" height="60" viewBox="0 0 800 60">
            <line x1="50" y1="30" x2="750" y2="30" stroke="#666" strokeWidth="2"/>
            <line x1="400" y1="10" x2="400" y2="50" stroke="#666" strokeWidth="2"/>
          </svg>
        </div>
        
        {/* Bottom line: Post-upstream phases */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '15px',
          padding: '20px 0',
          flexWrap: 'wrap'
        }}>
          {bottomLinePhases.map(phase => renderPhase(phase)).filter(Boolean)}
        </div>
      </div>
      
      <div style={{
        background: '#f8f9fa',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        padding: '20px',
        marginTop: '30px',
        minHeight: '150px'
      }}>
        {renderPhaseDetails()}
      </div>
    </div>
  );
};

export default GraphicalDebugView;
