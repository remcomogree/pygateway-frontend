// Services module for PyGateway Admin UI

// Use shared state - local helper functions
const getServicesFromState = () => window.AppState.services;
const setServicesInState = (data) => { window.AppState.services = data; };
const getWorkspacesForServices = () => window.AppState.workspaces;
const getRoutesForServices = () => window.AppState.routes;

// Services functions
function loadServices() {
    fetch(`${API_BASE_URL}/api/v1/services`)
        .then(response => response.json())
        .then(data => {
            // Handle both paginated and direct array responses
            const services = Array.isArray(data) ? data : (data.items || []);
            setServicesInState(services);
            displayServices();
            // Also refresh API section if it's currently showing services
            if (window.displayApiServices && document.getElementById('api-services-content') && 
                document.getElementById('api-services-content').style.display !== 'none') {
                window.displayApiServices();
            }
        })
        .catch(error => {
            document.getElementById('services-content').innerHTML = `
                <div class="error">Failed to load services: ${error.message}</div>
            `;
        });
}

function displayServices() {
    const content = document.getElementById('services-content');
    const services = getServicesFromState();
    const workspaces = getWorkspacesForServices();
    const routes = getRoutesForServices();
    
    // Check if we're in workspace context
    if (window.AppState.currentWorkspace) {
        // This is handled by workspaces.js showWorkspaceServices function
        return;
    }
    
    // Normal services view - update header for general services
    const servicesSection = document.getElementById('services');
    const cardHeader = servicesSection.querySelector('.card > div:first-child');
    cardHeader.innerHTML = `
        <h2>Services</h2>
        <button class="btn btn-success" onclick="showCreateServiceModal()">Add Service</button>
    `;
    
    if (services.length === 0) {
        content.innerHTML = '<p>No services found. Create your first service to get started.</p>';
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
                    
                    // Get provider info from state if available
                    const providers = window.AppState.providers || [];
                    const provider = service.provider_id ? providers.find(p => p.id === service.provider_id) : null;
                    const providerDisplay = provider ? provider.name : (service.provider_id ? 'Unknown Provider' : 'Manual');
                    
                    // Display host/port - use provider values if available, otherwise service values
                    const displayHost = service.host || (provider ? provider.host : '-');
                    const displayPort = service.port || (provider ? provider.port : '-');
                    const displayProtocol = provider ? provider.protocol : service.protocol;
                    
                    return `
                        <tr>
                            <td>
                                <a href="#" onclick="showServiceRoutes('${service.id}', '${service.name}')" 
                                   style="color: #007bff; text-decoration: none; font-weight: 500;">
                                    ${service.name}
                                </a>
                            </td>
                            <td><strong>${workspaceName}</strong></td>
                            <td>${providerDisplay}</td>
                            <td>${displayProtocol}</td>
                            <td>${displayHost}</td>
                            <td>${displayPort}</td>
                            <td>${service.path || '/'}</td>
                            <td>
                                <span class="status-badge ${service.enabled ? 'status-enabled' : 'status-disabled'}">
                                    ${service.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-primary" onclick="editService('${service.id}')">Edit</button>
                                <button class="btn btn-danger" onclick="deleteService('${service.id}')">Delete</button>
                                <button class="btn btn-warning" onclick="enableDebugService('${service.id}')">Enable Debug</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = table;
}

function showServiceRoutes(serviceId, serviceName) {
    // Store current service context
    window.AppState.currentService = { id: serviceId, name: serviceName };
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show routes section
    document.getElementById('routes').style.display = 'block';
    
    // Update the routes section header
    const routesSection = document.getElementById('routes');
    const cardHeader = routesSection.querySelector('.card > div:first-child');
    
    // Determine back button based on context
    let backButton = `<button class="btn" onclick="showSection('services')" style="margin-right: 1rem;">← Back to Services</button>`;
    if (window.AppState.currentWorkspace) {
        backButton = `<button class="btn" onclick="showWorkspaceServices('${window.AppState.currentWorkspace.id}', '${window.AppState.currentWorkspace.name}')" style="margin-right: 1rem;">← Back to Workspace Services</button>`;
    }
    
    cardHeader.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
            ${backButton}
            <h2 style="margin: 0; margin-right: 2rem;">Routes for "${serviceName}" service</h2>
            <button class="btn btn-success" onclick="showCreateRouteModalForService('${serviceId}', '${serviceName}')" 
                    style="margin-left: auto;">Add Route</button>
        </div>
    `;
    
    // Filter and display routes for this service
    const routes = getRoutes();
    const serviceRoutes = routes.filter(r => r.service_id === serviceId);
    
    const content = document.getElementById('routes-content');
    if (serviceRoutes.length === 0) {
        content.innerHTML = '<p>No routes found for this service. Create your first route to get started.</p>';
        return;
    }

    content.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Paths</th>
                    <th>Hosts</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${serviceRoutes.map(route => `
                    <tr>
                        <td>${route.name}</td>
                        <td>${Array.isArray(route.paths) ? route.paths.join(', ') : route.paths}</td>
                        <td>${Array.isArray(route.hosts) && route.hosts.length > 0 ? route.hosts.join(', ') : ''}</td>
                        <td>
                            <span class="status-badge ${route.enabled ? 'status-enabled' : 'status-disabled'}">
                                ${route.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-danger" onclick="deleteRoute('${route.id}')">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function deleteService(serviceId) {
    if (!confirm('Are you sure you want to delete this service? This action cannot be undone.')) {
        return;
    }

    fetch(`${API_BASE_URL}/api/v1/services/${serviceId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            loadServices();
            // Also refresh API section if it exists
            if (window.loadApiServices) {
                window.loadApiServices();
            }
            if (window.loadDashboard) {
                loadDashboard();
            }
        } else {
            alert('Failed to delete service');
        }
    })
    .catch(error => {
        alert('Failed to delete service: ' + error.message);
    });
}

function showCreateServiceModal() {
    // Reset the form for new service creation
    const form = document.getElementById('createServiceForm');
    form.removeAttribute('data-service-id');
    form.reset();
    
    // Reset modal title and button
    const modalTitle = document.querySelector('#createServiceModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Create Service';
    }
    
    const submitButton = document.querySelector('#createServiceForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Service';
    }
    
    // Initialize provider functionality
    initializeServiceModal();
    
    document.getElementById('createServiceModal').style.display = 'block';
}

function showCreateServiceModalForWorkspace(workspaceId, workspaceName) {
    // Pre-fill the workspace in the form using correct field ID
    document.getElementById('serviceWorkspace').value = workspaceId;
    
    // Reset the form for new service creation
    const form = document.getElementById('createServiceForm');
    form.removeAttribute('data-service-id');
    
    // Reset modal title and button
    const modalTitle = document.querySelector('#createServiceModal h2');
    if (modalTitle) {
        modalTitle.textContent = `Add Service to "${workspaceName}" workspace`;
    }
    
    const submitButton = document.querySelector('#createServiceForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Service';
    }
    
    // Initialize provider functionality
    initializeServiceModal();
    
    // Show the modal
    document.getElementById('createServiceModal').style.display = 'block';
}

function editService(serviceId) {
    const services = getServicesFromState() || [];
    if (!Array.isArray(services)) {
        console.error('Services state is not an array:', services);
        // Try to reload services if state is corrupted
        loadServices();
        return;
    }
    
    const service = services.find(s => s.id === serviceId);
    if (!service) {
        console.error('Service not found:', serviceId);
        return;
    }

    // Fill form with current values using correct field IDs
    document.getElementById('serviceName').value = service.name;
    document.getElementById('serviceHost').value = service.host || '';
    document.getElementById('servicePort').value = service.port || '';
    document.getElementById('serviceProtocol').value = service.protocol || 'http';
    document.getElementById('servicePath').value = service.path || '/';
    
    // Set workspace using correct ID
    document.getElementById('serviceWorkspace').value = service.workspace_id;

    // Set new fields
    document.getElementById('serviceConnectTimeout').value = service.connect_timeout || '';
    document.getElementById('serviceStreaming').value = service.streaming ? 'true' : 'false';
    document.getElementById('serviceMaxRequestSize').value = service.max_request_size || '';
    document.getElementById('serviceMaxResponseSize').value = service.max_response_size || '';

    // Set provider if the service has one
    const providerSelect = document.getElementById('serviceProvider');
    if (providerSelect) {
        providerSelect.value = service.provider_id || '';
    }

    // Change form action to update
    const form = document.getElementById('createServiceForm');
    form.setAttribute('data-service-id', serviceId);
    
    // Update modal title
    const modalTitle = document.querySelector('#createServiceModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Service';
    }
    
    // Update submit button text
    const submitButton = document.querySelector('#createServiceForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Update Service';
    }
    
    // Initialize provider functionality and set provider after loading
    initializeServiceModal(service.provider_id || '');
    // Show modal
    document.getElementById('createServiceModal').style.display = 'block';
}

// Provider handling functions for services
function toggleServiceFields() {
    const providerSelect = document.getElementById('serviceProvider');
    const hostField = document.getElementById('serviceHost');
    const portField = document.getElementById('servicePort');
    const protocolField = document.getElementById('serviceProtocol');
    const pathField = document.getElementById('servicePath');
    
    if (providerSelect && hostField && portField && protocolField) {
        const hasProvider = providerSelect.value !== '';
        const selectedOption = providerSelect.options[providerSelect.selectedIndex];
        const isLLMProvider = selectedOption && selectedOption.dataset.type === 'llm';
        
        hostField.disabled = hasProvider;
        portField.disabled = hasProvider;
        protocolField.disabled = hasProvider;
        if (pathField) pathField.disabled = hasProvider;
        
        // Update required attributes
        if (hasProvider) {
            hostField.removeAttribute('required');
            portField.removeAttribute('required');
            
            // Auto-populate fields for LLM providers
            if (isLLMProvider && selectedOption.dataset.baseUrl) {
                try {
                    const url = new URL(selectedOption.dataset.baseUrl);
                    const form = document.getElementById('createServiceForm');
                    const isEditing = form && form.hasAttribute('data-service-id');
                    if (!isEditing) {
                        hostField.value = url.hostname;
                        portField.value = url.port || (url.protocol === 'https:' ? '443' : '80');
                        protocolField.value = url.protocol.replace(':', '');
                        if (pathField) pathField.value = url.pathname || '/v1';
                    }
                } catch (e) {
                    console.warn('Invalid base URL for LLM provider:', selectedOption.dataset.baseUrl);
                }
            } else if (!isLLMProvider) {
                // For regular providers, clear values if creating new
                const form = document.getElementById('createServiceForm');
                const isEditing = form && form.hasAttribute('data-service-id');
                if (!isEditing) {
                    hostField.value = '';
                    portField.value = '';
                    if (pathField) pathField.value = '';
                }
            }
        } else {
            hostField.setAttribute('required', 'required');
            portField.setAttribute('required', 'required');
        }
    }
}

function loadProvidersIntoServiceModal(selectedProviderId) {
    const providerSelect = document.getElementById('serviceProvider');
    if (!providerSelect) return;
    
    // Load both regular providers and LLM providers
    Promise.all([
        fetch(`${API_BASE_URL}/api/v1/providers`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE_URL}/api/v1/llm/providers`).then(r => r.json()).catch(() => [])
    ])
        .then(([regularProviders, llmProviders]) => {
            providerSelect.innerHTML = '<option value="">Select a provider or configure manually...</option>';
            
            // Add regular providers
            if (regularProviders.length > 0) {
                const regularGroup = document.createElement('optgroup');
                regularGroup.label = 'Infrastructure Providers';
                regularProviders.forEach(provider => {
                    const option = document.createElement('option');
                    option.value = provider.id;
                    option.textContent = `${provider.name} (${provider.protocol}://${provider.host}:${provider.port})`;
                    option.dataset.type = 'regular';
                    regularGroup.appendChild(option);
                });
                providerSelect.appendChild(regularGroup);
            }
            
            // Add LLM providers
            if (llmProviders.length > 0) {
                const llmGroup = document.createElement('optgroup');
                llmGroup.label = 'LLM Providers';
                llmProviders.forEach(provider => {
                    const option = document.createElement('option');
                    option.value = provider.id;
                    option.textContent = `${provider.name} (${provider.provider_type}) - LLM`;
                    option.dataset.type = 'llm';
                    option.dataset.baseUrl = provider.base_url || 'https://api.openai.com/v1';
                    llmGroup.appendChild(option);
                });
                providerSelect.appendChild(llmGroup);
            }

            // Set selected value if provided
            if (selectedProviderId) {
                providerSelect.value = selectedProviderId;
            }
            // Toggle fields after setting value
            toggleServiceFields();
        })
        .catch(error => {
            console.error('Failed to load providers:', error);
        });
}

// Initialize provider functionality when service modal is shown
function initializeServiceModal(selectedProviderId) {
    loadProvidersIntoServiceModal(selectedProviderId);
    // toggleServiceFields will be called after providers are loaded
}

function enableDebugService(serviceId) {
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

// Make functions globally accessible immediately
console.log('Services module: Exporting functions to window object');
window.loadServices = loadServices;
window.displayServices = displayServices;
window.showServiceRoutes = showServiceRoutes;
window.deleteService = deleteService;
window.showCreateServiceModal = showCreateServiceModal;
window.showCreateServiceModalForWorkspace = showCreateServiceModalForWorkspace;
window.editService = editService;
window.toggleServiceFields = toggleServiceFields;
window.enableDebugService = enableDebugService;

// Also register with module system for consistency
(function() {
    const serviceFunctions = {
        loadServices: loadServices,
        displayServices: displayServices,
        showServiceRoutes: showServiceRoutes,
        deleteService: deleteService,
        showCreateServiceModal: showCreateServiceModal,
        showCreateServiceModalForWorkspace: showCreateServiceModalForWorkspace,
        editService: editService,
        toggleServiceFields: toggleServiceFields,
        enableDebugService: enableDebugService
    };
    
    // Register with module system
    if (window.ModuleRegistry) {
        window.ModuleRegistry.register('services', serviceFunctions);
    }
})();

console.log('Services module: Functions exported. loadServices available:', typeof window.loadServices);
