// Debug module for PyGateway Admin UI

// --- Pagination state for debug entries ---
window.DebugPagination = {
    offset: 0,
    limit: 20,
    total: 0,
    isLastPage: true
};

const getDebugEntriesFromState = () => window.AppState.debugEntries || [];
const setDebugEntriesInState = (data) => { window.AppState.debugEntries = data; };

function loadDebugEntries(pageOffset) {
    if (typeof pageOffset === 'number') window.DebugPagination.offset = pageOffset;
    const offset = window.DebugPagination.offset || 0;
    const limit = window.DebugPagination.limit || 100;
    
    fetch(`${API_BASE_URL}/api/v1/debug?offset=${offset}&limit=${limit}`)
        .then(response => response.json())
        .then(data => {
            const entries = data.entries || [];
            setDebugEntriesInState(entries);
            if (Array.isArray(data.entries)) {
                window.DebugPagination.total = entries.length;
                window.DebugPagination.isLastPage = entries.length < limit;
            } else {
                window.DebugPagination.total = data.total || 0;
                window.DebugPagination.isLastPage = (offset + limit) >= (data.total || 0);
            }
            displayDebugEntries();
        })
        .catch(error => {
            document.getElementById('debug').innerHTML = `
                <div class="error">Failed to load debug entries: ${error.message}</div>
            `;
        });
}

function getGroupedDebugEntries() {
    const entries = getDebugEntriesFromState();
    // Group entries by request ID and get the latest entry for each
    const latestEntriesByRequestId = {};
    entries.forEach(entry => {
        const reqId = entry.x_request_id || entry.info.request_id || entry.id;
        if (!latestEntriesByRequestId[reqId] || new Date(entry.timestamp) > new Date(latestEntriesByRequestId[reqId].timestamp)) {
            latestEntriesByRequestId[reqId] = entry;
        }
    });
    return Object.values(latestEntriesByRequestId);
}

function renderDebugPaginationControls() {
    const offset = window.DebugPagination.offset || 0;
    const limit = window.DebugPagination.limit || 20;
    const latestEntries = getGroupedDebugEntries();
    
    const total = latestEntries.length; // Use actual displayed entries count
    const isFirst = offset === 0;
    const isLast = window.DebugPagination.isLastPage;
    const showingFrom = total === 0 ? 0 : 1; // Always start from 1 for current view
    const showingTo = total; // Show the total count of grouped entries
    return `
        <div style='margin-bottom:1rem; margin-top:1.5rem; display:flex; gap:1rem;'>
            <button class='btn blue' onclick='loadDebugEntries(${Math.max(0, offset - limit)})' ${isFirst ? 'disabled' : ''}>Previous</button>
            <button class='btn blue' onclick='loadDebugEntries(${offset + limit})' ${isLast ? 'disabled' : ''}>Next</button>
            <span>Showing ${showingFrom} - ${showingTo} of ${total}</span>
        </div>
    `;
}

function displayDebugEntries() {
    const content = document.getElementById('debug');
    const latestEntries = getGroupedDebugEntries();
    // Header and actions
    content.innerHTML = `
        ${renderDebugPaginationControls()}
        <div class="card">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <h2>API Debug Viewer</h2>
                <button class="btn btn-primary" onclick="refreshDebugEntries()" style="margin-left: 10px;">
                    🔄 Refresh
                </button>
            </div>
            <div style="display: flex;">
                <aside class="sidebar" style="width:320px;">
                    <h3>Log Entries</h3>
                    <table class="table">
                        <thead><tr><th style="width: 180px;">Time</th><th style="width: 80px;">Method</th><th style="min-width: 300px; width: auto;">Request ID</th><th>Service Name</th><th style="width: 80px;">Actions</th></tr></thead>
                        <tbody>
                            ${latestEntries.length === 0 ? '<tr><td colspan="5">No log entries</td></tr>' : latestEntries.map(entry => {
                                const statusCode = entry.info.status_code;
                                const methodClass = (typeof statusCode === 'number' && statusCode <= 399) ? 'green' : (typeof statusCode === 'number' ? 'red' : '');
                                const entryId = entry.x_request_id || entry.info.request_id || entry.id;
                                const isLLMRequest = entry.llm_request || entry.request_type === 'llm';
                                const llmIcon = isLLMRequest ? '🤖 ' : '';
                                return `
                                <tr>
                                    <td style="cursor:pointer; width: 180px; white-space: nowrap;" onclick="showDebugEntryDetails('${entryId}')">${entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</td>
                                    <td style="cursor:pointer; width: 80px;" onclick="showDebugEntryDetails('${entryId}')" class="${methodClass}">${llmIcon}${entry.info.method || '-'}</td>
                                    <td style="cursor:pointer; min-width: 300px; width: auto; font-family: monospace; font-size: 0.85em; word-wrap: break-word; overflow-wrap: break-word;" onclick="showDebugEntryDetails('${entryId}')">${entryId}</td>
                                    <td style="cursor:pointer;" onclick="showDebugEntryDetails('${entryId}')">${entry.info.service_name || '-'}</td>
                                    <td style="width: 80px;">
                                        <button style="background:none; border:none; cursor:pointer; font-size:16px; padding:4px;" 
                                                onclick="showGraphicalDebugViewForEntry('${entryId}')" 
                                                title="Graphical View">📊</button>
                                    </td>
                                </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </aside>
                <main class="main-panel" style="flex:1;">
                    <div id="debug-details"></div>
                </main>
            </div>
        </div>
    `;
}

function showDebugEntryDetails(entryId) {
    // Fetch all debug logs for this request from backend
    fetch(`${API_BASE_URL}/api/v1/debug/${entryId}`)
        .then(response => response.json())
        .then(data => {
            showDebugLogsOverlay(data.entries || []);
        })
        .catch(error => {
            const details = document.getElementById('debug-details');
            details.innerHTML = `<div class="error">Failed to load debug logs: ${error.message}</div>`;
        });
}

function showDebugLogsOverlay(logEntries) {
    // Store log entries globally for graphical view access
    window.currentDebugLogEntries = logEntries;
    
    // Sort entries by step (ascending)
    logEntries = logEntries.slice().sort((a, b) => {
        const stepA = a.info && typeof a.info.step === 'number' ? a.info.step : 0;
        const stepB = b.info && typeof b.info.step === 'number' ? b.info.step : 0;
        return stepA - stepB;
    });
    // Get request ID from first entry
    const requestId = logEntries.length > 0 ? (logEntries[0].x_request_id || logEntries[0].info.request_id || '-') : '-';
    // Create overlay
    let overlay = document.getElementById('debug-log-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'debug-log-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.background = 'rgba(0,0,0,0.8)';
        overlay.style.zIndex = '9999';
        overlay.style.overflow = 'auto';
        document.body.appendChild(overlay);
    }
    overlay.innerHTML = `
        <div style="background:#fff; margin:40px auto; max-width:900px; border-radius:8px; padding:32px; position:relative;">
            <button style="position:absolute; top:16px; right:16px; font-size:20px;" onclick="closeDebugLogsOverlay()">&times;</button>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h2>Debug Logs for Request <span style='font-size:0.8em;color:#888;'>${requestId}</span></h2>
                <button style="background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 14px;" 
                        onclick="openGraphicalViewFromOverlay('${requestId}')">
                    📊 Graphical View
                </button>
            </div>
            <div style="max-height:70vh; overflow:auto;">
                ${logEntries.length === 0 ? '<div>No debug logs found.</div>' : logEntries.map((entry, idx) => `
                    <div style="border-bottom:1px solid #eee; margin-bottom:16px; padding-bottom:8px;">
                        <strong>Step ${entry.info.step || idx + 1} - ${entry.info.phase || ''}</strong><br>
                        <span><b>Time:</b> ${entry.timestamp ? new Date(entry.timestamp).toLocaleString() : '-'}</span><br>
                        <span><b>Method:</b> ${entry.info.method || '-'}</span><br>
                        <span><b>Service:</b> ${entry.info.service_name || '-'}</span><br>
                        <span><b>Status:</b> ${entry.info.status_code !== undefined ? entry.info.status_code : '-'}</span><br>
                        <span><b>Plugins Executed:</b> ${Array.isArray(entry.info.plugin_executed) ? entry.info.plugin_executed.map(pe => pe.plugins ? pe.plugins.join(', ') : '').join(' | ') : '-'}</span><br>
                        <details style="margin-top:8px;"><summary>Full Debug Info</summary><pre>${JSON.stringify(entry.info, null, 2)}</pre></details>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    overlay.style.display = 'block';
}

function closeDebugLogsOverlay() {
    const overlay = document.getElementById('debug-log-overlay');
    if (overlay) overlay.style.display = 'none';
}

function showGraphicalDebugViewForEntry(entryId) {
    // Fetch all debug logs for this request and show graphical view
    fetch(`${API_BASE_URL}/api/v1/debug/${entryId}`)
        .then(response => response.json())
        .then(data => {
            if (window.showGraphicalDebugView) {
                window.showGraphicalDebugView(entryId, data.entries || []);
            } else {
                alert('Graphical debug view not available');
            }
        })
        .catch(error => {
            alert('Failed to load debug logs: ' + error.message);
        });
}

function openGraphicalViewFromOverlay(requestId) {
    // Use the current log entries from the overlay
    const currentLogEntries = window.currentDebugLogEntries || [];
    if (window.showGraphicalDebugView) {
        window.showGraphicalDebugView(requestId, currentLogEntries);
    } else {
        alert('Graphical debug view not available');
    }
}

function startDebugSession() {
    // Implement API call to start debug session
    alert('Start Debug session (not implemented)');
}

function stopDebugSession() {
    // Implement API call to stop debug session
    alert('Stop Debug session (not implemented)');
}

function refreshDebugEntries() {
    // Reset to first page and reload
    window.DebugPagination.offset = 0;
    loadDebugEntries(0);
}

// Expose for navigation
window.loadDebugEntries = loadDebugEntries;
window.displayDebugEntries = displayDebugEntries;
window.showDebugEntryDetails = showDebugEntryDetails;
window.showGraphicalDebugViewForEntry = showGraphicalDebugViewForEntry;
window.openGraphicalViewFromOverlay = openGraphicalViewFromOverlay;
window.refreshDebugEntries = refreshDebugEntries;
window.startDebugSession = startDebugSession;
window.stopDebugSession = stopDebugSession;
window.refreshDebugEntries = refreshDebugEntries;
