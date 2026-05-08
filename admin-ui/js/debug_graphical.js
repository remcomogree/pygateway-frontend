// Graphical Debug module for PyGateway Admin UI
// Visualizes request flow as a graphical diagram

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
    'upstream_forwarded': '🔄',
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

function showGraphicalDebugView(requestId, logEntries) {
    // Create overlay for graphical view
    let overlay = document.getElementById('graphical-debug-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'graphical-debug-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.9)';
        overlay.style.zIndex = '10000';
        overlay.style.overflow = 'auto';
        document.body.appendChild(overlay);
    }

    // Sort entries by step/timestamp
    const sortedEntries = logEntries.slice().sort((a, b) => {
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

    // Add client start entry if we have any entries
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

    // Determine which phases go on top line (up to and including upstream_forwarded) vs bottom line (after upstream_forwarded)
    const upstreamIndex = PHASE_ORDER.indexOf('upstream_forwarded');
    const topLinePhases = PHASE_ORDER.slice(0, upstreamIndex + 1); // includes upstream_forwarded
    const bottomLinePhases = PHASE_ORDER.slice(upstreamIndex + 1); // after upstream_forwarded

    const generatePhaseHTML = (phases, lineClass) => {
        return phases.map(phase => {
            const entries = entriesByPhase[phase] || [];
            if (entries.length === 0) return '';
            
            // Use the latest entry for this phase
            const entry = entries[entries.length - 1];
            
            // Special handling for client_start - never has errors
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
            
            return `
                <div class="phase-step ${hasError ? 'error' : 'success'}" 
                     onclick="showPhaseDetails('${phase}', '${requestId}')"
                     title="${name}">
                    <div class="phase-icon">${icon}</div>
                    <div class="phase-name">${name}</div>
                    ${hasError ? '<div class="error-indicator">!</div>' : ''}
                </div>
            `;
        }).join('');
    };

    overlay.innerHTML = `
        <div class="graphical-debug-container">
            <div class="graphical-debug-header">
                <h2>Request Flow Visualization</h2>
                <div class="request-info">
                    <span><strong>Request ID:</strong> ${requestId}</span>
                    <span><strong>Method:</strong> ${sortedEntries[0]?.info?.method || '-'}</span>
                    <span><strong>Service:</strong> ${sortedEntries[0]?.info?.service_name || '-'}</span>
                </div>
                <button class="close-btn" onclick="closeGraphicalDebugView()">&times;</button>
            </div>
            
            <div class="flow-diagram">
                <!-- Top line: Client through Upstream -->
                <div class="flow-line top-line">
                    ${generatePhaseHTML(topLinePhases.filter(p => entriesByPhase[p]), 'top-line')}
                </div>
                
                <!-- Connection lines -->
                <div class="connection-lines">
                    <svg width="100%" height="60" viewBox="0 0 800 60">
                        <!-- Horizontal line connecting all phases -->
                        <line x1="50" y1="30" x2="750" y2="30" stroke="#666" stroke-width="2"/>
                        <!-- Vertical line at upstream separation point -->
                        <line x1="${200 + (topLinePhases.length - 1) * 80}" y1="10" x2="${200 + (topLinePhases.length - 1) * 80}" y2="50" stroke="#666" stroke-width="2"/>
                    </svg>
                </div>
                
                <!-- Bottom line: Post-upstream phases -->
                <div class="flow-line bottom-line">
                    ${generatePhaseHTML(bottomLinePhases.filter(p => entriesByPhase[p]), 'bottom-line')}
                </div>
            </div>
            
            <div id="phase-details" class="phase-details-panel">
                <p>Click on any phase icon to see detailed information</p>
            </div>
        </div>
        
        <style>
            .graphical-debug-container {
                background: white;
                margin: 20px auto;
                max-width: 1200px;
                border-radius: 12px;
                padding: 24px;
                position: relative;
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            }
            
            .graphical-debug-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 15px;
                border-bottom: 2px solid #eee;
            }
            
            .graphical-debug-header h2 {
                margin: 0;
                color: #333;
            }
            
            .request-info {
                display: flex;
                gap: 20px;
                font-size: 14px;
                color: #666;
            }
            
            .close-btn {
                position: absolute;
                top: 20px;
                right: 20px;
                background: none;
                border: none;
                font-size: 24px;
                cursor: pointer;
                color: #999;
                width: 30px;
                height: 30px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            
            .close-btn:hover {
                background: #f0f0f0;
                color: #333;
            }
            
            .flow-diagram {
                margin: 30px 0;
                min-height: 200px;
            }
            
            .flow-line {
                display: flex;
                justify-content: center;
                align-items: center;
                gap: 15px;
                padding: 20px 0;
                flex-wrap: wrap;
            }
            
            .top-line {
                border-bottom: 1px dashed #ccc;
            }
            
            .connection-lines {
                text-align: center;
                margin: 10px 0;
            }
            
            .phase-step {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100px;
                height: 80px;
                border: 2px solid #ddd;
                border-radius: 12px;
                cursor: pointer;
                transition: all 0.3s ease;
                position: relative;
                background: white;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            }
            
            .phase-step:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                border-color: #007bff;
            }
            
            .phase-step.success {
                border-color: #28a745;
                background: linear-gradient(135deg, #f8fff9 0%, #e8f5e8 100%);
            }
            
            .phase-step.error {
                border-color: #dc3545;
                background: linear-gradient(135deg, #fff8f8 0%, #ffeaea 100%);
            }
            
            .phase-icon {
                font-size: 24px;
                margin-bottom: 5px;
            }
            
            .phase-name {
                font-size: 11px;
                text-align: center;
                color: #333;
                font-weight: 500;
            }
            
            .error-indicator {
                position: absolute;
                top: -5px;
                right: -5px;
                background: #dc3545;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 12px;
                font-weight: bold;
            }
            
            .phase-details-panel {
                background: #f8f9fa;
                border: 1px solid #dee2e6;
                border-radius: 8px;
                padding: 20px;
                margin-top: 30px;
                min-height: 150px;
            }
            
            .phase-details-panel h3 {
                margin: 0 0 15px 0;
                color: #333;
            }
            
            .detail-item {
                margin: 8px 0;
            }
            
            .detail-label {
                font-weight: bold;
                color: #555;
            }
            
            .detail-value {
                margin-left: 10px;
                color: #333;
            }
            
            .json-details {
                background: #2d3748;
                color: #e2e8f0;
                padding: 15px;
                border-radius: 6px;
                font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                font-size: 12px;
                overflow-x: auto;
                margin-top: 15px;
                max-height: 300px;
                overflow-y: auto;
            }
        </style>
    `;
    
    overlay.style.display = 'block';
}

function showPhaseDetails(phase, requestId) {
    // Handle special case for client_start
    if (phase === 'client_start') {
        const debugEntries = window.AppState.debugEntries || [];
        const requestEntries = debugEntries.filter(entry => 
            (entry.x_request_id === requestId || entry.info?.request_id === requestId || entry.id === requestId)
        );
        
        const firstEntry = requestEntries[0];
        if (!firstEntry) return;
        
        const detailsPanel = document.getElementById('phase-details');
        detailsPanel.innerHTML = `
            <h3>Client Request Start 👤</h3>
            
            <div class="detail-item">
                <span class="detail-label">Method:</span>
                <span class="detail-value">${firstEntry.info?.method || '-'}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">URL:</span>
                <span class="detail-value">${firstEntry.info?.url || '-'}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">Client IP:</span>
                <span class="detail-value">${firstEntry.info?.client || '-'}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">Service:</span>
                <span class="detail-value">${firstEntry.info?.service_name || '-'}</span>
            </div>
            
            <div class="detail-item">
                <span class="detail-label">Request ID:</span>
                <span class="detail-value">${requestId}</span>
            </div>
        `;
        return;
    }
    
    // Get all entries for this phase from current overlay context
    const debugEntries = window.AppState.debugEntries || [];
    const requestEntries = debugEntries.filter(entry => 
        (entry.x_request_id === requestId || entry.info?.request_id === requestId || entry.id === requestId)
    );
    
    const phaseEntries = requestEntries.filter(entry => entry.info?.phase === phase);
    const entry = phaseEntries[phaseEntries.length - 1]; // Get latest entry for this phase
    
    if (!entry) return;
    
    const detailsPanel = document.getElementById('phase-details');
    const hasError = entry.info?.status_code > 399 || 
                    entry.info?.plugin_errors?.length > 0 ||
                    phase.includes('failed') ||
                    phase.includes('circuit_breaker_opened') ||
                    (phase.includes('validation') && entry.info?.error) ||
                    entry.info?.error?.includes('validation failed');
    
    // Special handling for global_plugins_loaded to show global plugins
    let globalPluginsInfo = '';
    if (phase === 'global_plugins_loaded' && entry.info?.global_plugins) {
        globalPluginsInfo = `
            <div class="detail-item">
                <span class="detail-label">Global Plugins Loaded:</span>
                <span class="detail-value">${entry.info.global_plugins.length > 0 ? entry.info.global_plugins.join(', ') : 'None'}</span>
            </div>
        `;
    }
    
    // Special handling for validation phases to show validation data
    let validationInfo = '';
    if (phase.includes('validation') && entry.info?.error && entry.info?.validation_data) {
        const vData = entry.info.validation_data;
        if (phase === 'request_validation') {
            validationInfo = `
                <div class="detail-item">
                    <span class="detail-label">Validation Error:</span>
                    <span class="detail-value" style="color: #dc3545;">${entry.info.error}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Request Size:</span>
                    <span class="detail-value">${vData.request_size} bytes</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Max Allowed:</span>
                    <span class="detail-value">${vData.max_request_size} bytes</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Error Type:</span>
                    <span class="detail-value">${vData.error_type}</span>
                </div>
            `;
        } else if (phase === 'response_validation') {
            validationInfo = `
                <div class="detail-item">
                    <span class="detail-label">Validation Error:</span>
                    <span class="detail-value" style="color: #dc3545;">${entry.info.error}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Response Size:</span>
                    <span class="detail-value">${vData.content_length} bytes</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Max Allowed:</span>
                    <span class="detail-value">${vData.max_response_size} bytes</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Error Type:</span>
                    <span class="detail-value">${vData.error_type}</span>
                </div>
            `;
        }
    }
    
    // Special handling for circuit breaker phases
    let circuitBreakerInfo = '';
    if (phase.includes('circuit_breaker') && entry.info) {
        if (phase === 'circuit_breaker_opened') {
            circuitBreakerInfo = `
                <div class="detail-item">
                    <span class="detail-label">Circuit Breaker Status:</span>
                    <span class="detail-value" style="color: #dc3545;">OPEN</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Reason:</span>
                    <span class="detail-value">${entry.info.circuit_breaker_reason || 'High failure rate detected'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Failure Count:</span>
                    <span class="detail-value">${entry.info.failure_count || '-'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Next Retry:</span>
                    <span class="detail-value">${entry.info.next_retry_time || '-'}</span>
                </div>
            `;
        } else if (phase === 'circuit_breaker_fallback') {
            circuitBreakerInfo = `
                <div class="detail-item">
                    <span class="detail-label">Fallback Type:</span>
                    <span class="detail-value">${entry.info.fallback_type || 'Static Response'}</span>
                </div>
                <div class="detail-item">
                    <span class="detail-label">Fallback Response:</span>
                    <span class="detail-value">${entry.info.fallback_response ? JSON.stringify(entry.info.fallback_response, null, 2) : '-'}</span>
                </div>
            `;
        }
    }
    
    detailsPanel.innerHTML = `
        <h3>${PHASE_NAMES[phase] || phase} Details ${hasError ? ' ⚠️' : ' ✅'}</h3>
        
        <div class="detail-item">
            <span class="detail-label">Step:</span>
            <span class="detail-value">${entry.info?.step || '-'}</span>
        </div>
        
        <div class="detail-item">
            <span class="detail-label">Timestamp:</span>
            <span class="detail-value">${entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</span>
        </div>
        
        <div class="detail-item">
            <span class="detail-label">Time Used:</span>
            <span class="detail-value">${entry.info?.time_used ? (entry.info.time_used * 1000).toFixed(2) + 'ms' : '-'}</span>
        </div>
        
        <div class="detail-item">
            <span class="detail-label">Status Code:</span>
            <span class="detail-value" style="color: ${entry.info?.status_code > 399 ? '#dc3545' : '#28a745'}">
                ${entry.info?.status_code || '-'}
            </span>
        </div>
        
        ${globalPluginsInfo}
        
        ${validationInfo}
        
        ${circuitBreakerInfo}
        
        ${entry.info?.plugin_executed ? `
            <div class="detail-item">
                <span class="detail-label">Plugins Executed:</span>
                <span class="detail-value">${entry.info.plugin_executed.plugins ? entry.info.plugin_executed.plugins.join(', ') : '-'}</span>
            </div>
        ` : ''}
        
        ${entry.info?.plugin_errors && entry.info.plugin_errors.length > 0 ? `
            <div class="detail-item">
                <span class="detail-label">Plugin Errors:</span>
                <span class="detail-value" style="color: #dc3545;">
                    ${entry.info.plugin_errors.map(err => err.error || err).join(', ')}
                </span>
            </div>
        ` : ''}
        
        <details style="margin-top: 15px;">
            <summary style="cursor: pointer; font-weight: bold;">Full JSON Data</summary>
            <div class="json-details">${JSON.stringify(entry.info, null, 2)}</div>
        </details>
    `;
}

function closeGraphicalDebugView() {
    const overlay = document.getElementById('graphical-debug-overlay');
    if (overlay) {
        overlay.style.display = 'none';
    }
}

// Export functions for global access
window.showGraphicalDebugView = showGraphicalDebugView;
window.showPhaseDetails = showPhaseDetails;
window.closeGraphicalDebugView = closeGraphicalDebugView;
