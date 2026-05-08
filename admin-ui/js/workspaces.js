// Workspaces module for PyGateway Admin UI

// Use shared state - local helper functions
const getWorkspacesFromState = () => window.AppState.workspaces;
const setWorkspacesInState = (data) => { window.AppState.workspaces = data; };
const getServicesForWorkspaces = () => window.AppState.services;

// Workspaces functions
function loadWorkspaces() {
    authenticatedFetch(`${API_BASE_URL}/api/v1/workspaces`)
        .then(response => response.json())
        .then(data => {
            setWorkspacesInState(data);
            displayWorkspaces();
            updateWorkspaceSelects();
        })
        .catch(error => {
            document.getElementById('workspaces-content').innerHTML = `
                <div class="error">Failed to load workspaces: ${error.message}</div>
            `;
        });
}

function displayWorkspaces() {
    const content = document.getElementById('workspaces-content');
    const workspaces = getWorkspacesFromState();
    const services = getServicesForWorkspaces();
    
    if (workspaces.length === 0) {
        content.innerHTML = '<p>No workspaces found. Create your first workspace to get started.</p>';
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Description</th>
                    <th>Services</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${workspaces.map(workspace => {
                    const workspaceServices = services.filter(s => s.workspace_id === workspace.id);
                    const serviceCount = workspaceServices.length;
                    
                    return `
                        <tr>
                            <td>
                                <strong>
                                    <a href="#" onclick="showWorkspaceServices('${workspace.id}', '${workspace.name}')" 
                                       style="color: #2c3e50; text-decoration: none; cursor: pointer;">
                                        ${workspace.name}
                                    </a>
                                </strong>
                            </td>
                            <td>${workspace.description || 'No description'}</td>
                            <td>
                                <div class="service-count">${serviceCount} service${serviceCount !== 1 ? 's' : ''}</div>
                            </td>
                            <td>
                                <span class="status-badge ${workspace.enabled ? 'status-enabled' : 'status-disabled'}">
                                    ${workspace.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </td>
                            <td>${new Date(workspace.created_at).toLocaleDateString()}</td>
                            <td>
                                <button class="btn" onclick="editWorkspace('${workspace.id}')">Edit</button>
                                <button class="btn btn-danger" onclick="deleteWorkspace('${workspace.id}', '${workspace.name}')">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML = table;
}

function showWorkspaceServices(workspaceId, workspaceName) {
    // Store current workspace context
    window.AppState.currentWorkspace = { id: workspaceId, name: workspaceName };
    
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show services section
    document.getElementById('services').style.display = 'block';
    
    // Update the services section header
    const servicesSection = document.getElementById('services');
    const cardHeader = servicesSection.querySelector('.card > div:first-child');
    cardHeader.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 1rem;">
            <button class="btn" onclick="showSection('workspaces')" style="margin-right: 1rem;">← Back to Workspaces</button>
            <h2 style="margin: 0; margin-right: 2rem;">Services in "${workspaceName}" workspace</h2>
            <button class="btn btn-success" onclick="showCreateServiceModalForWorkspace('${workspaceId}', '${workspaceName}')" 
                    style="margin-left: auto;">Add Service</button>
        </div>
    `;
    
    // Filter and display services for this workspace
    const services = getServicesForWorkspaces();
    const workspaceServices = services.filter(s => s.workspace_id === workspaceId);
    
    const content = document.getElementById('services-content');
    content.innerHTML = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Protocol</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th>Path</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${workspaceServices.map(service => `
                    <tr>
                        <td>
                            <a href="#" onclick="showServiceRoutes('${service.id}', '${service.name}')" 
                               style="color: #007bff; text-decoration: none; font-weight: 500;">
                                ${service.name}
                            </a>
                        </td>
                        <td>${service.protocol}</td>
                        <td>${service.host}</td>
                        <td>${service.port}</td>
                        <td>${service.path || '/'}</td>
                        <td>
                            <span class="status-badge ${service.enabled ? 'status-enabled' : 'status-disabled'}">
                                ${service.enabled ? 'Enabled' : 'Disabled'}
                            </span>
                        </td>
                        <td>
                            <button class="btn btn-danger" onclick="deleteService('${service.id}')">Delete</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function deleteWorkspace(workspaceId) {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone.')) {
        return;
    }

    fetch(`${API_BASE_URL}/api/v1/workspaces/${workspaceId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
        }
    })
    .then(response => {
        if (response.ok) {
            loadWorkspaces();
            loadDashboard();
        } else {
            alert('Failed to delete workspace');
        }
    })
    .catch(error => {
        alert('Failed to delete workspace: ' + error.message);
    });
}

function editWorkspace(workspaceId) {
    const workspaces = getWorkspacesFromState();
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) return;

    // Fill form with current values
    document.getElementById('workspaceName').value = workspace.name;
    document.getElementById('workspaceDescription').value = workspace.description || '';

    // Change form action to update
    const form = document.getElementById('createWorkspaceForm');
    form.setAttribute('data-workspace-id', workspaceId);
    
    // Show modal
    document.getElementById('createWorkspaceModal').style.display = 'block';
}

function updateWorkspaceSelects() {
    const workspaces = getWorkspacesFromState();
    const selects = document.querySelectorAll('select[name="workspace_id"], #serviceWorkspace');
    selects.forEach(select => {
        const currentValue = select.value;
        select.innerHTML = workspaces.map(workspace => 
            `<option value="${workspace.id}">${workspace.name}</option>`
        ).join('');
        if (currentValue) {
            select.value = currentValue;
        }
    });
}

function showCreateWorkspaceModal() {
    // Reset the form for new workspace creation
    const form = document.getElementById('createWorkspaceForm');
    form.removeAttribute('data-workspace-id');
    form.reset();
    
    document.getElementById('createWorkspaceModal').style.display = 'block';
}

// Make functions globally accessible immediately
console.log('Workspaces module: Exporting functions to window object');
window.loadWorkspaces = loadWorkspaces;
window.displayWorkspaces = displayWorkspaces;
window.showWorkspaceServices = showWorkspaceServices;
window.deleteWorkspace = deleteWorkspace;
window.editWorkspace = editWorkspace;
window.updateWorkspaceSelects = updateWorkspaceSelects;
window.showCreateWorkspaceModal = showCreateWorkspaceModal;

// Also register with module system for consistency
(function() {
    const workspaceFunctions = {
        loadWorkspaces: loadWorkspaces,
        displayWorkspaces: displayWorkspaces,
        showWorkspaceServices: showWorkspaceServices,
        deleteWorkspace: deleteWorkspace,
        editWorkspace: editWorkspace,
        updateWorkspaceSelects: updateWorkspaceSelects,
        showCreateWorkspaceModal: showCreateWorkspaceModal
    };
    
    // Register with module system
    if (window.ModuleRegistry) {
        window.ModuleRegistry.register('workspaces', workspaceFunctions);
    }
})();

console.log('Workspaces module: Functions exported. loadWorkspaces available:', typeof window.loadWorkspaces);
