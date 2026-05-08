// Handles CRUD and display for Workspaces, Services, Routes, and Plugins in the API section
// This should mirror the structure of monetization.js but for API entities

function showApiTab(tab) {
    // Hide all API tab contents
    document.querySelectorAll('.api-tab-content').forEach(el => el.style.display = 'none');
    // Show selected tab
    document.getElementById(`api-${tab}-content`).style.display = '';
    // Show/hide Add Workspace, Add Service, Add Route, and Add Plugin buttons
    const addWorkspaceBtn = document.getElementById('apiAddWorkspaceBtn');
    if (addWorkspaceBtn) addWorkspaceBtn.style.display = (tab === 'workspaces') ? '' : 'none';
    const addServiceBtn = document.getElementById('apiAddServiceBtn');
    if (addServiceBtn) addServiceBtn.style.display = (tab === 'services') ? '' : 'none';
    const addRouteBtn = document.getElementById('apiAddRouteBtn');
    if (addRouteBtn) addRouteBtn.style.display = (tab === 'routes') ? '' : 'none';
    const addPluginBtn = document.getElementById('apiAddPluginBtn');
    if (addPluginBtn) addPluginBtn.style.display = (tab === 'plugins') ? '' : 'none';
    // Show/hide workspace filter only on services tab, but only if the container exists
    var wsFilterContainer = document.getElementById('apiServiceWorkspaceFilterContainer');
    if (wsFilterContainer) {
        wsFilterContainer.style.display = (tab === 'services') ? 'flex' : 'none';
    }
    // Highlight the active tab button
    document.querySelectorAll('.tabs .tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    const activeBtn = document.querySelector(`.tabs .tab-btn[onclick*="showApiTab('${tab}')"]`);
    if (activeBtn) activeBtn.classList.add('active');
    // Optionally, load data for the selected tab
    if (tab === 'workspaces') loadApiWorkspaces();
    if (tab === 'services') loadApiServices();
    if (tab === 'routes') loadApiRoutes();
    if (tab === 'plugins') loadApiPlugins();
}

// Make showApiTab globally accessible
window.showApiTab = showApiTab;

function loadApiWorkspaces() {
    const container = document.getElementById('api-workspaces-content');
    container.innerHTML = '<div class="loading">Loading workspaces...</div>';
    fetch(`${API_BASE_URL}/api/v1/workspaces`)
        .then(response => response.json())
        .then(data => {
            window.AppState.workspaces = data;
            displayApiWorkspaces();
        })
        .catch(error => {
            container.innerHTML = `<div class="error">Failed to load workspaces: ${error.message}</div>`;
        });
}

// Map to store service counts per workspace
window.ServiceCountsByWorkspace = {};

function fetchServiceCountForWorkspace(workspaceId) {
    // Only fetch if not already loaded
    if (window.ServiceCountsByWorkspace[workspaceId] !== undefined) return;
    fetch(`${API_BASE_URL}/api/v1/services?workspace_id=${workspaceId}&limit=1`)
        .then(response => response.json())
        .then(data => {
            window.ServiceCountsByWorkspace[workspaceId] = data.total || 0;
            displayApiWorkspaces(); // Re-render to update count
        })
        .catch(() => {
            window.ServiceCountsByWorkspace[workspaceId] = 0;
            displayApiWorkspaces();
        });
}

function displayApiWorkspaces() {
    const container = document.getElementById('api-workspaces-content');
    const workspaces = window.AppState.workspaces || [];
    let services = window.AppState.services;
    if (!Array.isArray(services)) services = [];
    if (workspaces.length === 0) {
        container.innerHTML = '<p>No workspaces found. Create your first workspace to get started.</p>';
        return;
    }
    // Fetch service counts for all workspaces
    workspaces.forEach(ws => fetchServiceCountForWorkspace(ws.id));
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Services</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${workspaces.map(workspace => {
                    const serviceCount = window.ServiceCountsByWorkspace[workspace.id] !== undefined
                        ? window.ServiceCountsByWorkspace[workspace.id]
                        : '<span class="loading">...</span>';
                    return `
                        <tr>
                            <td><a href="#" onclick="filterServicesByWorkspace('${workspace.id}', '${workspace.name}')">${workspace.name}</a></td>
                            <td>${workspace.description || '-'}</td>
                            <td>${workspace.enabled ? 'Enabled' : 'Disabled'}</td>
                            <td>${serviceCount}</td>
                            <td>
                                <button class="btn blue" onclick="editApiWorkspace('${workspace.id}')">Edit</button>
                                <button class="btn red" onclick="deleteApiWorkspace('${workspace.id}', '${workspace.name}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>`;
    container.innerHTML = table;
}

function editApiWorkspace(workspaceId) {
    const workspaces = window.AppState.workspaces || [];
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;
    // Fill form with current values
    document.getElementById('workspaceName').value = workspace.name;
    document.getElementById('workspaceDescription').value = workspace.description || '';
    document.getElementById('workspaceEnabled').checked = !!workspace.enabled;
    // Change form action to update
    const form = document.getElementById('createWorkspaceForm');
    form.setAttribute('data-workspace-id', workspaceId);
    // Update modal title and button
    document.getElementById('workspaceModalTitle').textContent = 'Update Workspace';
    document.getElementById('workspaceModalSaveBtn').textContent = 'Save Changes';
    // Show modal
    document.getElementById('createWorkspaceModal').style.display = 'block';
}

function deleteApiWorkspace(workspaceId, workspaceName) {
    const services = window.AppState.services || [];
    const attached = services.some(s => s.workspace_id === workspaceId);
    if (attached) {
        alert(`Cannot delete workspace '${workspaceName}' because it has services attached. Please remove all services first.`);
        return;
    }
    if (!confirm(`Are you sure you want to delete workspace '${workspaceName}'? This action cannot be undone.`)) return;
    fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.ok) {
            loadApiWorkspaces();
        } else {
            alert('Failed to delete workspace');
        }
    })
    .catch(error => {
        alert('Failed to delete workspace: ' + error.message);
    });
}

// --- Pagination state ---
window.ServicePagination = {
    offset: 0,
    limit: 100,
    total: null
};

function loadApiServices(pageOffset) {
    const container = document.getElementById('api-services-content');
    container.innerHTML = '<div class="loading">Loading services...</div>';
    if (typeof pageOffset === 'number') window.ServicePagination.offset = pageOffset;
    const offset = window.ServicePagination.offset || 0;
    const limit = window.ServicePagination.limit || 100;
    let url = `${API_BASE_URL}/api/v1/services?offset=${offset}&limit=${limit}`;
    // Add workspace filter if set
    if (window.AppState.serviceWorkspaceFilter) {
        url += `&workspace_id=${window.AppState.serviceWorkspaceFilter}`;
    }
    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                window.AppState.services = data;
                window.ServicePagination.total = data.length;
                window.ServicePagination.isLastPage = data.length < limit;
            } else {
                window.AppState.services = data.items || [];
                window.ServicePagination.total = data.total || 0;
                window.ServicePagination.isLastPage = (offset + limit) >= (data.total || 0);
            }
            displayApiServices();
        })
        .catch(error => {
            container.innerHTML = `<div class="error">Failed to load services: ${error.message}</div>`;
        });
}

function renderServicePaginationControls() {
    const offset = window.ServicePagination.offset || 0;
    const limit = window.ServicePagination.limit || 100;
    const total = window.ServicePagination.total || 0;
    const isFirst = offset === 0;
    const isLast = window.ServicePagination.isLastPage;
    const showingFrom = total === 0 ? 0 : offset + 1;
    const showingTo = Math.min(offset + (window.AppState.services ? window.AppState.services.length : 0), total);
    return `
        <div style='margin-bottom:1rem; margin-top:1.5rem; display:flex; gap:1rem;'>
            <button class='btn blue' onclick='loadApiServices(${Math.max(0, offset - limit)})' ${isFirst ? 'disabled' : ''}>Previous</button>
            <button class='btn blue' onclick='loadApiServices(${offset + limit})' ${isLast ? 'disabled' : ''}>Next</button>
            <span>Showing ${showingFrom} - ${showingTo} of ${total}</span>
        </div>
    `;
}

function displayApiServices() {
    const container = document.getElementById('api-services-content');
    let services = window.AppState.services || [];
    const workspaces = window.AppState.workspaces || [];
    // Render pagination controls at the top
    container.innerHTML = renderServicePaginationControls();
    // Filter by selected workspace if set
    if (window.AppState.serviceWorkspaceFilter) {
        services = services.filter(s => s.workspace_id === window.AppState.serviceWorkspaceFilter);
        // Add a clear filter button
        container.innerHTML += `<div style='margin-bottom:1rem;'>
            <button class='btn blue' onclick='clearServiceWorkspaceFilter()'>Show all services</button>
        </div>`;
    }
    if (services.length === 0) {
        container.innerHTML += '<p>No services found. Create your first service to get started.</p>';
        return;
    }
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Workspace</th>
                    <th>Provider</th>
                    <th>Protocol</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${services.map(service => {
                    const workspace = workspaces.find(w => w.id === service.workspace_id);
                    const workspaceName = workspace ? workspace.name : 'Unknown';
                    const providers = window.AppState.providers || [];
                    const provider = service.provider_id ? providers.find(p => p.id === service.provider_id) : null;
                    const providerDisplay = provider ? provider.name : (service.provider_id ? 'Unknown Provider' : 'Manual');
                    const displayHost = service.host || (provider ? provider.host : '-');
                    const displayPort = service.port || (provider ? provider.port : '-');
                    const displayProtocol = provider ? provider.protocol : service.protocol;
                    return `
                        <tr>
                            <td><a href="#" onclick="showApiServiceRoutes('${service.id}', '${service.name}')" style="color: #007bff; text-decoration: none; font-weight: 500;">${service.name}</a></td>
                            <td><strong>${workspaceName}</strong></td>
                            <td>${providerDisplay}</td>
                            <td>${displayProtocol}</td>
                            <td>${displayHost}</td>
                            <td>${displayPort}</td>
                            <td>${service.path || '/'}</td>
                            <td><span class="status-badge ${service.enabled ? 'status-enabled' : 'status-disabled'}">${service.enabled ? 'Enabled' : 'Disabled'}</span></td>
                            <td>
                                <button class="btn blue" onclick="editApiService('${service.id}')">Edit</button>
                                <button class="btn red" onclick="deleteApiService('${service.id}')">Delete</button>
                                <button class="btn btn-success" style="background-color:#7ed957; color:#222;" onclick="enableDebugApiService('${service.id}')">Enable Debug</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>`;
    container.innerHTML += table;
    // Render pagination controls at the bottom (optional, can remove if only top is desired)
    // container.innerHTML += renderServicePaginationControls();
}

function showApiServiceRoutes(serviceId, serviceName) {
    // Set filter in AppState and switch to routes tab
    window.AppState.routeServiceFilter = serviceId;
    showApiTab('routes');
    // Optionally, scroll to the routes table
    setTimeout(() => {
        const el = document.getElementById('api-routes-content');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// --- Pagination state for routes ---
window.RoutePagination = {
    offset: 0,
    limit: 100,
    total: null
};

function loadApiRoutes(pageOffset) {
    const container = document.getElementById('api-routes-content');
    container.innerHTML = '<div class="loading">Loading routes...</div>';
    if (typeof pageOffset === 'number') window.RoutePagination.offset = pageOffset;
    const offset = window.RoutePagination.offset || 0;
    const limit = window.RoutePagination.limit || 100;
    let url = `${API_BASE_URL}/api/v1/routes?offset=${offset}&limit=${limit}`;
    if (window.AppState.routeServiceFilter) {
        url += `&service_id=${window.AppState.routeServiceFilter}`;
    }
    
    // Ensure services are loaded first for route display
    fetch(`${API_BASE_URL}/api/v1/services`)
        .then(response => response.json())
        .then(servicesData => {
            // Ensure services is always an array
            window.AppState.services = Array.isArray(servicesData) ? servicesData : servicesData.items || [];
            return fetch(url);
        })
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                window.AppState.routes = data;
                window.RoutePagination.total = data.length;
                window.RoutePagination.isLastPage = data.length < limit;
            } else {
                window.AppState.routes = data.items || [];
                window.RoutePagination.total = data.total || 0;
                window.RoutePagination.isLastPage = (offset + limit) >= (data.total || 0);
            }
            displayApiRoutes();
        })
        .catch(error => {
            container.innerHTML = `<div class="error">Failed to load routes: ${error.message}</div>`;
        });
}

function renderRoutePaginationControls() {
    const offset = window.RoutePagination.offset || 0;
    const limit = window.RoutePagination.limit || 100;
    const total = window.RoutePagination.total || 0;
    const isFirst = offset === 0;
    const isLast = window.RoutePagination.isLastPage;
    const showingFrom = total === 0 ? 0 : offset + 1;
    const showingTo = Math.min(offset + (window.AppState.routes ? window.AppState.routes.length : 0), total);
    return `
        <div style='margin-bottom:1rem; margin-top:1.5rem; display:flex; gap:1rem;'>
            <button class='btn blue' onclick='loadApiRoutes(${Math.max(0, offset - limit)})' ${isFirst ? 'disabled' : ''}>Previous</button>
            <button class='btn blue' onclick='loadApiRoutes(${offset + limit})' ${isLast ? 'disabled' : ''}>Next</button>
            <span>Showing ${showingFrom} - ${showingTo} of ${total}</span>
        </div>
    `;
}

function displayApiRoutes() {
    const container = document.getElementById('api-routes-content');
    let routes = window.AppState.routes || [];
    const services = window.AppState.services || [];
    // Render pagination controls at the top
    container.innerHTML = renderRoutePaginationControls();
    // Filter by selected service if set
    if (window.AppState.routeServiceFilter) {
        routes = routes.filter(r => r.service_id === window.AppState.routeServiceFilter);
        // Add a clear filter button
        container.innerHTML += `<div style='margin-bottom:1rem;'>
            <button class='btn blue' onclick='clearRouteServiceFilter()'>Show all routes</button>
        </div>`;
    }
    if (routes.length === 0) {
        container.innerHTML += '<p>No routes found. Create your first route to get started.</p>';
        return;
    }
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Service</th>
                    <th>Paths</th>
                    <th>Resources</th>
                    <th>Hosts</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${routes.map(route => {
                    const service = services.find(s => s.id === route.service_id);
                    const serviceName = service ? service.name : 'Unknown';
                    return `
                        <tr>
                            <td>${route.name}</td>
                            <td>${serviceName}</td>
                            <td>${Array.isArray(route.paths) ? route.paths.join(', ') : route.paths}</td>
                            <td>${Array.isArray(route.resources) ? route.resources.join(', ') : (route.resources || '')}</td>
                            <td>${Array.isArray(route.hosts) ? route.hosts.join(', ') : route.hosts || ''}</td>
                            <td><span class="status-badge ${route.enabled ? 'status-enabled' : 'status-disabled'}">${route.enabled ? 'Enabled' : 'Disabled'}</span></td>
                            <td>
                                <button class="btn blue" onclick="editApiRoute('${route.id}')">Edit</button>
                                <button class="btn red" onclick="deleteApiRoute('${route.id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>`;
    container.innerHTML += table;
    // Optionally, render pagination controls at the bottom
    // container.innerHTML += renderRoutePaginationControls();
}

function clearRouteServiceFilter() {
    window.AppState.routeServiceFilter = null;
    displayApiRoutes();
}

function editApiRoute(routeId) {
    const routes = window.AppState.routes || [];
    const services = window.AppState.services || [];
    const route = routes.find(r => r.id === routeId);
    if (!route) return;
    document.getElementById('createRouteModal').style.display = 'block';
    const serviceSelect = document.getElementById('routeService');
    serviceSelect.innerHTML = '<option value="">Select a service</option>';
    services.forEach(service => {
        serviceSelect.innerHTML += `<option value="${service.id}">${service.name}</option>`;
    });
    document.getElementById('routeName').value = route.name;
    document.getElementById('routeService').value = route.service_id;
    document.getElementById('routePaths').value = Array.isArray(route.paths) ? route.paths.join(', ') : route.paths;
    document.getElementById('routeHosts').value = Array.isArray(route.hosts) ? route.hosts.join(', ') : route.hosts || '';
    document.getElementById('routeRegexPriority').value = route.regex_priority || 0;
    document.getElementById('routeResources').value = Array.isArray(route.resources) ? route.resources.join(', ') : (route.resources || '');
    document.getElementById('routeStripPath').checked = route.strip_path;
    document.getElementById('routePreserveHost').checked = route.preserve_host;
    document.getElementById('routeEnabled').checked = route.enabled;
    const protocolCheckboxes = document.querySelectorAll('input[name="protocols"]');
    protocolCheckboxes.forEach(cb => {
        cb.checked = Array.isArray(route.protocols) ? route.protocols.includes(cb.value) : route.protocols === cb.value;
    });
    const methodCheckboxes = document.querySelectorAll('input[name="methods"]');
    methodCheckboxes.forEach(cb => { cb.checked = false; });
    if (Array.isArray(route.methods)) {
        methodCheckboxes.forEach(cb => {
            if (route.methods.includes(cb.value)) cb.checked = true;
        });
    } else if (route.methods) {
        methodCheckboxes.forEach(cb => {
            if (cb.value === route.methods) cb.checked = true;
        });
    }
    // gRPC fields and visibility logic
    const grpcFields = document.getElementById('grpcFields');
    function updateGrpcFieldsVisibility() {
        const selected = services.find(s => s.id === serviceSelect.value);
        if (selected && selected.protocol === 'grpc') {
            grpcFields.style.display = '';
        } else {
            grpcFields.style.display = 'none';
        }
    }
    serviceSelect.onchange = updateGrpcFieldsVisibility;
    updateGrpcFieldsVisibility();
    document.getElementById('grpcService').value = route.grpc_service || '';
    document.getElementById('grpcMethod').value = route.grpc_method || '';
    document.getElementById('protobufDefinition').value = route.protobuf_definition || '';
    const form = document.getElementById('createRouteForm');
    form.setAttribute('data-route-id', routeId);
    const modalTitle = document.querySelector('#createRouteModal h2');
    if (modalTitle) modalTitle.textContent = 'Edit Route';
    const submitButton = document.querySelector('#createRouteForm button[type="submit"]');
    if (submitButton) submitButton.textContent = 'Update Route';
}

function deleteApiRoute(routeId) {
    if (!confirm('Are you sure you want to delete this route? This action cannot be undone.')) return;
    fetch(`${API_BASE_URL}/api/v1/routes/${routeId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.ok) {
            loadApiRoutes();
        } else {
            alert('Failed to delete route');
        }
    })
    .catch(error => {
        alert('Failed to delete route: ' + error.message);
    });
}

// --- Pagination state for plugins ---
window.PluginPagination = {
    offset: 0,
    limit: 100,
    total: null
};

function loadApiPlugins(pageOffsetOrCallback, callback) {
    const container = document.getElementById('api-plugins-content');
    container.innerHTML = '<div class="loading">Loading plugins...</div>';
    
    // Handle function overloading - could be called with (pageOffset) or (callback) or (pageOffset, callback)
    let pageOffset, finalCallback;
    if (typeof pageOffsetOrCallback === 'function') {
        finalCallback = pageOffsetOrCallback;
        pageOffset = undefined;
    } else if (typeof pageOffsetOrCallback === 'number') {
        pageOffset = pageOffsetOrCallback;
        finalCallback = callback;
    } else {
        finalCallback = callback;
    }
    
    if (typeof pageOffset === 'number') window.PluginPagination.offset = pageOffset;
    const offset = window.PluginPagination.offset || 0;
    const limit = window.PluginPagination.limit || 100;
    let url = `${API_BASE_URL}/api/v1/plugins?offset=${offset}&limit=${limit}`;
    
    // Ensure services and routes are loaded first for plugin display
    Promise.all([
        fetch(`${API_BASE_URL}/api/v1/services`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE_URL}/api/v1/routes`).then(r => r.json()).catch(() => [])
    ]).then(([servicesData, routesData]) => {
        window.AppState.services = Array.isArray(servicesData) ? servicesData : servicesData.items || [];
        window.AppState.routes = Array.isArray(routesData) ? routesData : routesData.items || [];
        
        return fetch(url);
    }).then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                window.AppState.plugins = data;
                window.PluginPagination.total = data.length;
                window.PluginPagination.isLastPage = data.length < limit;
            } else {
                window.AppState.plugins = data.items || [];
                window.PluginPagination.total = data.total || 0;
                window.PluginPagination.isLastPage = (offset + limit) >= (data.total || 0);
            }
            displayApiPlugins();
            if (typeof finalCallback === 'function') finalCallback();
        })
        .catch(error => {
            container.innerHTML = `<div class="error">Failed to load plugins: ${error.message}</div>`;
            if (typeof finalCallback === 'function') finalCallback();
        });
}

function renderPluginPaginationControls() {
    const offset = window.PluginPagination.offset || 0;
    const limit = window.PluginPagination.limit || 100;
    const total = window.PluginPagination.total || 0;
    const isFirst = offset === 0;
    const isLast = window.PluginPagination.isLastPage;
    const showingFrom = total === 0 ? 0 : offset + 1;
    const showingTo = Math.min(offset + (window.AppState.plugins ? window.AppState.plugins.length : 0), total);
    return `
        <div style='margin-bottom:1rem; margin-top:1.5rem; display:flex; gap:1rem;'>
            <button class='btn blue' onclick='loadApiPlugins(${Math.max(0, offset - limit)})' ${isFirst ? 'disabled' : ''}>Previous</button>
            <button class='btn blue' onclick='loadApiPlugins(${offset + limit})' ${isLast ? 'disabled' : ''}>Next</button>
            <span>Showing ${showingFrom} - ${showingTo} of ${total}</span>
        </div>
    `;
}

function displayApiPlugins() {
    const container = document.getElementById('api-plugins-content');
    let plugins = window.AppState.plugins;
    if (!Array.isArray(plugins)) plugins = [];
    const services = window.AppState.services || [];
    const routes = window.AppState.routes || [];
    // Render pagination controls at the top
    container.innerHTML = renderPluginPaginationControls();
    if (plugins.length === 0) {
        container.innerHTML += '<p>No plugins configured.</p>';
        return;
    }
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Service</th>
                    <th>Route</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${plugins.map(plugin => {
                    const service = services.find(s => s.id === plugin.service_id);
                    const route = routes.find(r => r.id === plugin.route_id);
                    return `
                        <tr>
                            <td>${plugin.name}</td>
                            <td>${service ? service.name : '-'}</td>
                            <td>${route ? route.name : '-'}</td>
                            <td>${plugin.enabled ? 'Enabled' : 'Disabled'}</td>
                            <td>
                                <button class="btn blue" onclick="editApiPlugin('${plugin.id}')">Edit</button>
                                <button class="btn red" onclick="deleteApiPlugin('${plugin.id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>`;
    container.innerHTML += table;
    // Optionally, render pagination controls at the bottom
    // container.innerHTML += renderPluginPaginationControls();
}

function editApiPlugin(pluginId) {
    // Always reload plugins first to ensure we have latest data
    loadApiPlugins(() => {
        const plugins = window.AppState.plugins || [];
        const plugin = plugins.find(p => p.id === pluginId);
        if (plugin) {
            fillPluginEditForm(plugin);
        } else {
            alert('Plugin not found. Please refresh the page and try again.');
        }
    });
}

function fillPluginEditForm(plugin) {
    // Load available plugins first
    if (typeof loadAvailablePlugins === 'function') {
        loadAvailablePlugins(() => {
            fillPluginEditFormWithData(plugin);
        });
    } else {
        fillPluginEditFormWithData(plugin);
    }
}

function fillPluginEditFormWithData(plugin) {
    // Ensure services and routes are loaded before showing modal
    Promise.all([
        fetch(`${API_BASE_URL}/api/v1/services`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE_URL}/api/v1/routes`).then(r => r.json()).catch(() => [])
    ]).then(([servicesData, routesData]) => {
        window.AppState.services = Array.isArray(servicesData) ? servicesData : servicesData.items || [];
        window.AppState.routes = Array.isArray(routesData) ? routesData : routesData.items || [];
        
        // Fill plugin type dropdown with available plugins
        const nameEl = document.getElementById('pluginName');
        if (nameEl) {
            nameEl.innerHTML = '<option value="">Select a plugin</option>';
            const availablePlugins = window.AppState.availablePlugins || [];
            availablePlugins.forEach(availablePlugin => {
                const selected = availablePlugin.name === plugin.name ? 'selected' : '';
                nameEl.innerHTML += `<option value="${availablePlugin.name}" ${selected}>${availablePlugin.name}</option>`;
            });
        }
        
        const serviceEl = document.getElementById('pluginService');
        if (serviceEl) {
            // Repopulate service options with current data
            serviceEl.innerHTML = '<option value="">Global plugin</option>';
            window.AppState.services.forEach(service => {
                const selected = service.id === plugin.service_id ? 'selected' : '';
                serviceEl.innerHTML += `<option value="${service.id}" ${selected}>${service.name}</option>`;
            });
        }
        
        const routeEl = document.getElementById('pluginRoute');
        if (routeEl) {
            // Repopulate route options with current data
            routeEl.innerHTML = '<option value="">Any route</option>';
            window.AppState.routes.forEach(route => {
                const selected = route.id === plugin.route_id ? 'selected' : '';
                routeEl.innerHTML += `<option value="${route.id}" ${selected}>${route.name}</option>`;
            });
        }
        
        const configEl = document.getElementById('pluginConfig');
        if (configEl) configEl.value = plugin.config ? JSON.stringify(plugin.config, null, 2) : '';
        
        const enabledEl = document.getElementById('pluginEnabled');
        if (enabledEl) enabledEl.checked = !!plugin.enabled;
        
        // Change form action to update
        const form = document.getElementById('createPluginForm');
        if (form) form.setAttribute('data-plugin-id', plugin.id);
        
        // Update modal title and button
        const modalTitle = document.querySelector('#createPluginModal h2');
        if (modalTitle) modalTitle.textContent = 'Edit Plugin';
        
        const submitButton = document.querySelector('#createPluginForm button[type="submit"]');
        if (submitButton) submitButton.textContent = 'Update Plugin';
        
        // Show modal
        const modalEl = document.getElementById('createPluginModal');
        if (modalEl) modalEl.style.display = 'block';
        
        // Show config section if plugin has config
        const configSectionEl = document.getElementById('pluginConfigSection');
        if (configSectionEl) {
            if (plugin.config && Object.keys(plugin.config).length > 0) {
                configSectionEl.style.display = '';
            } else {
                configSectionEl.style.display = 'none';
            }
        }
        
        // If using raw JSON mode, ensure the checkbox and section are in sync
        const useRawJson = document.getElementById('useRawJson');
        const rawJsonSection = document.getElementById('rawJsonSection');
        if (useRawJson && rawJsonSection) {
            if (useRawJson.checked) {
                rawJsonSection.style.display = '';
            } else {
                rawJsonSection.style.display = 'none';
            }
        }
        
        // Optionally, trigger schema reload if needed
        if (typeof loadPluginSchema === 'function') {
            loadPluginSchema();
        }
    }).catch(error => {
        console.error('Failed to load services/routes for plugin edit:', error);
        alert('Failed to load required data. Please try again.');
    });
}

function deleteApiPlugin(pluginId) {
    if (!confirm('Are you sure you want to delete this plugin? This action cannot be undone.')) return;
    fetch(`${API_BASE_URL}/api/v1/plugins/${pluginId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    })
    .then(response => {
        if (response.ok) {
            loadApiPlugins();
        } else {
            alert('Failed to delete plugin');
        }
    })
    .catch(error => {
        alert('Failed to delete plugin: ' + error.message);
    });
}

function showCreateWorkspaceModal() {
    // Reset the form for new workspace creation
    const form = document.getElementById('createWorkspaceForm');
    form.removeAttribute('data-workspace-id');
    form.reset();
    // Set modal title and button for create
    document.getElementById('workspaceModalTitle').textContent = 'Create Workspace';
    document.getElementById('workspaceModalSaveBtn').textContent = 'Create Workspace';
    document.getElementById('createWorkspaceModal').style.display = 'block';
}

// Patch: After workspace form submit, reload API workspaces if API section is visible
const workspaceForm = document.getElementById('createWorkspaceForm');
if (workspaceForm) {
    workspaceForm.addEventListener('submit', function(e) {
        setTimeout(() => {
            if (document.getElementById('api').style.display !== 'none') {
                loadApiWorkspaces();
            }
        }, 500);
    });
}

// Patch: After route or plugin form submit, reload API tab if visible
const routeForm = document.getElementById('createRouteForm');
if (routeForm) {
    routeForm.addEventListener('submit', function(e) {
        setTimeout(() => {
            if (document.getElementById('api').style.display !== 'none') {
                loadApiRoutes();
            }
        }, 500);
    });
}
const pluginForm = document.getElementById('createPluginForm');
if (pluginForm) {
    pluginForm.addEventListener('submit', function(e) {
        setTimeout(() => {
            if (document.getElementById('api').style.display !== 'none') {
                loadApiPlugins();
            }
        }, 500);
    });
}

// Call this to populate the workspace dropdown in the service creation modal
function populateServiceWorkspaceDropdown() {
    const dropdown = document.getElementById('serviceWorkspace');
    if (!dropdown) return; // Guard against missing element
    dropdown.innerHTML = '<option value="">Select a workspace...</option>';
    const workspaces = window.AppState.workspaces || [];
    workspaces.forEach(ws => {
        const option = document.createElement('option');
        option.value = ws.id;
        option.textContent = ws.name;
        dropdown.appendChild(option);
    });
}

// Call this to populate the provider dropdown in the service creation modal
function populateServiceProviderDropdown() {
    const dropdown = document.getElementById('serviceProvider');
    if (!dropdown) return; // Guard against missing element
    dropdown.innerHTML = '<option value="">Select a provider or configure manually...</option>';
    const providers = window.AppState.providers || [];
    providers.forEach(provider => {
        const option = document.createElement('option');
        option.value = provider.id;
        option.textContent = provider.name;
        dropdown.appendChild(option);
    });
}

// Optionally, add more CRUD logic for each entity as needed

function showWorkspaceServices(workspaceId, workspaceName) {
    window.AppState.serviceWorkspaceFilter = workspaceId;
    showApiTab('services');
    // Wait for tab to show, then call displayApiServices directly to ensure correct rendering
    setTimeout(() => {
        displayApiServices();
        const el = document.getElementById('api-services-content');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

function clearServiceWorkspaceFilter() {
    window.AppState.serviceWorkspaceFilter = null;
    showApiTab('services');
    setTimeout(() => {
        displayApiServices();
    }, 100);
}

function filterServicesByWorkspace(workspaceId, workspaceName) {
    window.AppState.serviceWorkspaceFilter = workspaceId;
    window.ServicePagination.offset = 0; // Reset to first page
    showApiTab('services');
    // Optionally, scroll to the services table
    setTimeout(() => {
        const el = document.getElementById('api-services-content');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 100);
}

// Add enableDebugApiService function to send debug enable request for a service to the controlplane from the API section.
function enableDebugApiService(serviceId) {
    // Send request to controlplane to enable debug for this service
    fetch(`${API_BASE_URL}/api/v1/services/${serviceId}/debug`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enable: true })
    })
    .then(response => {
        if (response.ok) {
            alert('Debug enabled for 10 minutes.');
        } else {
            alert('Failed to enable debug.');
        }
    })
    .catch(error => {
        alert('Error enabling debug: ' + error.message);
    });
}

// API-specific service functions that delegate to main service functions
function editApiService(serviceId) {
    // Use the main editService function from services.js
    if (window.editService) {
        window.editService(serviceId);
    } else {
        alert('Edit service function not available');
    }
}

function deleteApiService(serviceId) {
    // Use the main deleteService function from services.js
    if (window.deleteService) {
        window.deleteService(serviceId);
    } else {
        alert('Delete service function not available');
    }
}
