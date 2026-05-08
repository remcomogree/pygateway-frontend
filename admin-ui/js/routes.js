// Routes module for PyGateway Admin UI

// Use shared state - local helper functions  
const getRoutesFromState = () => window.AppState.routes;
const setRoutesInState = (data) => { window.AppState.routes = data; };
const getServicesForRoutes = () => Array.isArray(window.AppState.services) ? window.AppState.services : [];

// Routes functions
function loadRoutes() {
    fetch(`${API_BASE_URL}/api/v1/routes`)
        .then(response => response.json())
        .then(data => {
            setRoutesInState(data);
            displayRoutes();
        })
        .catch(error => {
            document.getElementById('routes-content').innerHTML = `
                <div class="error">Failed to load routes: ${error.message}</div>
            `;
        });
}

function displayRoutes() {
    const content = document.getElementById('routes-content');
    const routes = getRoutesFromState();
    const services = Array.isArray(getServicesForRoutes()) ? getServicesForRoutes() : [];
    
    // Check if we're in service context
    if (window.AppState.currentService) {
        // This is handled by services.js showServiceRoutes function
        return;
    }
    
    // Normal routes view - update header for general routes
    const routesSection = document.getElementById('routes');
    const cardHeader = routesSection.querySelector('.card > div:first-child');
    cardHeader.innerHTML = `
        <h2>Routes</h2>
        <button class="btn btn-success" onclick="showCreateRouteModal()">Add Route</button>
    `;
    
    if (routes.length === 0) {
        content.innerHTML = '<p>No routes found. Create your first route to get started.</p>';
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
                    const service = Array.isArray(services) ? services.find(s => s.id === route.service_id) : undefined;
                    return `
                        <tr>
                            <td>${route.name}</td>
                            <td>${service ? service.name : 'Unknown'}</td>
                            <td>${Array.isArray(route.paths) ? route.paths.join(', ') : route.paths}</td>
                            <td>${Array.isArray(route.resources) ? route.resources.join(', ') : (route.resources || '')}</td>
                            <td>${Array.isArray(route.hosts) && route.hosts.length > 0 ? route.hosts.join(', ') : ''}</td>
                            <td>
                                <span class="status-badge ${route.enabled ? 'status-enabled' : 'status-disabled'}">
                                    ${route.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-primary" onclick="editRoute('${route.id}')">Edit</button>
                                <button class="btn btn-danger" onclick="deleteRoute('${route.id}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = table;
}

function deleteRoute(routeId) {
    if (!confirm('Are you sure you want to delete this route? This action cannot be undone.')) {
        return;
    }

    fetch(`${API_BASE_URL}/api/v1/routes/${routeId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            loadRoutes();
            loadDashboard();
        } else {
            alert('Failed to delete route');
        }
    })
    .catch(error => {
        alert('Failed to delete route: ' + error.message);
    });
}

function showCreateRouteModal() {
    // Populate service options
    const services = getServicesForRoutes();
    const serviceSelect = document.getElementById('routeService');
    serviceSelect.innerHTML = '<option value="">Select a service</option>';
    services.forEach(service => {
        serviceSelect.innerHTML += `<option value="${service.id}">${service.name}</option>`;
    });
    
    // Reset the form for new route creation
    const form = document.getElementById('createRouteForm');
    form.removeAttribute('data-route-id');
    form.reset();
    
    // Reset checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // Set enabled and strip_path checkboxes to checked by default
    document.getElementById('routeEnabled').checked = true;
    document.getElementById('routeStripPath').checked = true;

    // Reset modal title and button
    const modalTitle = document.querySelector('#createRouteModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Create Route';
    }
    
    const submitButton = document.querySelector('#createRouteForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Route';
    }
    
    // Show/hide gRPC fields based on selected service protocol
    const grpcFields = document.getElementById('grpcFields');
    function updateGrpcFieldsVisibility() {
        const selectedServiceId = serviceSelect.value;
        const selectedService = services.find(s => s.id === selectedServiceId);
        if (selectedService && selectedService.protocol && selectedService.protocol.toLowerCase() === 'grpc') {
            grpcFields.style.display = '';
        } else {
            grpcFields.style.display = 'none';
            // Optionally clear fields
            document.getElementById('grpcService').value = '';
            document.getElementById('grpcMethod').value = '';
            document.getElementById('protobufDefinition').value = '';
        }
    }
    serviceSelect.addEventListener('change', updateGrpcFieldsVisibility);
    updateGrpcFieldsVisibility();
    
    document.getElementById('createRouteModal').style.display = 'block';
}

function showCreateRouteModalForService(serviceId, serviceName) {
    // Populate service options first
    const services = getServicesForRoutes();
    const serviceSelect = document.getElementById('routeService');
    serviceSelect.innerHTML = '<option value="">Select a service</option>';
    services.forEach(service => {
        serviceSelect.innerHTML += `<option value="${service.id}">${service.name}</option>`;
    });
    
    // Pre-fill the service in the form
    serviceSelect.value = serviceId;
    
    // Reset the form for new route creation
    const form = document.getElementById('createRouteForm');
    form.removeAttribute('data-route-id');
    
    // Reset checkboxes
    form.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    
    // Set enabled and strip_path checkboxes to checked by default
    document.getElementById('routeEnabled').checked = true;
    document.getElementById('routeStripPath').checked = true;
    
    // Reset modal title and button
    const modalTitle = document.querySelector('#createRouteModal h2');
    if (modalTitle) {
        modalTitle.textContent = `Add Route to "${serviceName}" service`;
    }
    
    const submitButton = document.querySelector('#createRouteForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Route';
    }
    
    // Show/hide gRPC fields based on selected service protocol
    const grpcFields = document.getElementById('grpcFields');
    function updateGrpcFieldsVisibility() {
        const selectedServiceId = serviceSelect.value;
        const selectedService = services.find(s => s.id === selectedServiceId);
        if (selectedService && selectedService.protocol && selectedService.protocol.toLowerCase() === 'grpc') {
            grpcFields.style.display = '';
        } else {
            grpcFields.style.display = 'none';
            // Optionally clear fields
            document.getElementById('grpcService').value = '';
            document.getElementById('grpcMethod').value = '';
            document.getElementById('protobufDefinition').value = '';
        }
    }
    serviceSelect.addEventListener('change', updateGrpcFieldsVisibility);
    updateGrpcFieldsVisibility();
    
    // Show the modal
    document.getElementById('createRouteModal').style.display = 'block';
}

function editRoute(routeId) {
    const routes = getRoutesFromState();
    const services = getServicesForRoutes();
    const route = routes.find(r => r.id === routeId);
    if (!route) return;

    // Show modal first to ensure all fields are available
    document.getElementById('createRouteModal').style.display = 'block';

    // Populate service options
    const serviceSelect = document.getElementById('routeService');
    serviceSelect.innerHTML = '<option value="">Select a service</option>';
    services.forEach(service => {
        serviceSelect.innerHTML += `<option value="${service.id}">${service.name}</option>`;
    });

    // Fill form with current values
    document.getElementById('routeName').value = route.name;
    document.getElementById('routeService').value = route.service_id;
    document.getElementById('routePaths').value = Array.isArray(route.paths) ? route.paths.join(', ') : route.paths;
    document.getElementById('routeHosts').value = Array.isArray(route.hosts) ? route.hosts.join(', ') : route.hosts || '';
    document.getElementById('routeRegexPriority').value = route.regex_priority || 0;
    document.getElementById('routeResources').value = Array.isArray(route.resources) ? route.resources.join(', ') : (route.resources || '');
    document.getElementById('routeStripPath').checked = route.strip_path;
    document.getElementById('routePreserveHost').checked = route.preserve_host;
    document.getElementById('routeEnabled').checked = route.enabled;

    // Handle protocols checkboxes
    const protocolCheckboxes = document.querySelectorAll('input[name="protocols"]');
    protocolCheckboxes.forEach(cb => {
        cb.checked = Array.isArray(route.protocols) ? route.protocols.includes(cb.value) : route.protocols === cb.value;
    });

    // Handle methods checkboxes: uncheck all first, then check those present in route.methods
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
        if (selected && selected.protocol && selected.protocol.toLowerCase() === 'grpc') {
            grpcFields.style.display = '';
        } else {
            grpcFields.style.display = 'none';
            if (document.getElementById('grpcService')) document.getElementById('grpcService').value = '';
            if (document.getElementById('grpcMethod')) document.getElementById('grpcMethod').value = '';
            if (document.getElementById('protobufDefinition')) document.getElementById('protobufDefinition').value = '';
        }
    }
    serviceSelect.addEventListener('change', updateGrpcFieldsVisibility);
    // Set gRPC field values if present, with null checks
    const selectedService = services.find(s => s.id === route.service_id);
    if (selectedService && selectedService.protocol && selectedService.protocol.toLowerCase() === 'grpc') {
        if (document.getElementById('grpcService')) document.getElementById('grpcService').value = route.grpc_service || '';
        if (document.getElementById('grpcMethod')) document.getElementById('grpcMethod').value = route.grpc_method || '';
        if (document.getElementById('protobufDefinition')) document.getElementById('protobufDefinition').value = route.protobuf_definition || '';
    } else {
        if (document.getElementById('grpcService')) document.getElementById('grpcService').value = '';
        if (document.getElementById('grpcMethod')) document.getElementById('grpcMethod').value = '';
        if (document.getElementById('protobufDefinition')) document.getElementById('protobufDefinition').value = '';
    }
    // Always update visibility after setting service
    updateGrpcFieldsVisibility();

    // Change form action to update
    const form = document.getElementById('createRouteForm');
    form.setAttribute('data-route-id', routeId);

    // Update modal title
    const modalTitle = document.querySelector('#createRouteModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Route';
    }

    // Update submit button text
    const submitButton = document.querySelector('#createRouteForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Update Route';
    }
}

// Add validation: at least one method must be selected and resources are parsed
const createRouteForm = document.getElementById('createRouteForm');
if (createRouteForm) {
    createRouteForm.addEventListener('submit', function(e) {
        // Validate at least one method
        const methodCheckboxes = createRouteForm.querySelectorAll('input[name="methods"]');
        const anyChecked = Array.from(methodCheckboxes).some(cb => cb.checked);
        if (!anyChecked) {
            e.stopPropagation();
            e.preventDefault();
            alert('Please select at least one HTTP method for the route.');
            return false;
        }
        // Parse resources field (comma-separated to array)
        const resourcesInput = document.getElementById('routeResources');
        if (resourcesInput) {
            let resources = resourcesInput.value.split(',').map(r => r.trim()).filter(r => r);
            resourcesInput.value = resources.join(', '); // normalize
        }
    }, true);
}

// Make functions globally accessible immediately
console.log('Routes module: Exporting functions to window object');
window.loadRoutes = loadRoutes;
window.displayRoutes = displayRoutes;
window.deleteRoute = deleteRoute;
window.showCreateRouteModal = showCreateRouteModal;
window.showCreateRouteModalForService = showCreateRouteModalForService;
window.editRoute = editRoute;

// Also register with module system for consistency
(function() {
    const routeFunctions = {
        loadRoutes: loadRoutes,
        displayRoutes: displayRoutes,
        deleteRoute: deleteRoute,
        showCreateRouteModal: showCreateRouteModal,
        showCreateRouteModalForService: showCreateRouteModalForService,
        editRoute: editRoute
    };
    
    // Register with module system
    if (window.ModuleRegistry) {
        window.ModuleRegistry.register('routes', routeFunctions);
    }
})();

console.log('Routes module: Functions exported. loadRoutes available:', typeof window.loadRoutes);
