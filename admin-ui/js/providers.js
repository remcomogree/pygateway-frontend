// Providers module for PyGateway Admin UI

// --- Pagination state for providers ---
window.ProviderPagination = {
    offset: 0,
    limit: 100,
    total: 0,
    isLastPage: true
};

// Use shared state - local helper functions
const getProvidersFromState = () => window.AppState.providers || [];
const setProvidersInState = (data) => { window.AppState.providers = data; };
const getWorkspacesForProviders = () => window.AppState.workspaces;

// Providers functions
function loadProviders(pageOffset) {
    if (typeof pageOffset === 'number') window.ProviderPagination.offset = pageOffset;
    const offset = window.ProviderPagination.offset || 0;
    const limit = window.ProviderPagination.limit || 100;
    
    fetch(`${API_BASE_URL}/api/v1/providers?offset=${offset}&limit=${limit}`)
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                setProvidersInState(data);
                window.ProviderPagination.total = data.length;
                window.ProviderPagination.isLastPage = data.length < limit;
            } else {
                setProvidersInState(data.items || data.providers || []);
                window.ProviderPagination.total = data.total || 0;
                window.ProviderPagination.isLastPage = (offset + limit) >= (data.total || 0);
            }
            displayProviders();
        })
        .catch(error => {
            document.getElementById('providers-content').innerHTML = `
                <div class="error">Failed to load providers: ${error.message}</div>
            `;
        });
}

function renderProviderPaginationControls() {
    const offset = window.ProviderPagination.offset || 0;
    const limit = window.ProviderPagination.limit || 100;
    const total = window.ProviderPagination.total || 0;
    const isFirst = offset === 0;
    const isLast = window.ProviderPagination.isLastPage;
    const showingFrom = total === 0 ? 0 : offset + 1;
    const showingTo = Math.min(offset + (window.AppState.providers ? window.AppState.providers.length : 0), total);
    return `
        <div style='margin-bottom:1rem; margin-top:1.5rem; display:flex; gap:1rem;'>
            <button class='btn blue' onclick='loadProviders(${Math.max(0, offset - limit)})' ${isFirst ? 'disabled' : ''}>Previous</button>
            <button class='btn blue' onclick='loadProviders(${offset + limit})' ${isLast ? 'disabled' : ''}>Next</button>
            <span>Showing ${showingFrom} - ${showingTo} of ${total}</span>
        </div>
    `;
}

function displayProviders() {
    const content = document.getElementById('providers-content');
    const providers = getProvidersFromState();
    
    // Normal providers view - update header for general providers
    const providersSection = document.getElementById('providers');
    const cardHeader = providersSection.querySelector('.card > div:first-child');
    cardHeader.innerHTML = `
        <h2>Providers</h2>
        <button class="btn btn-success" onclick="showCreateProviderModal()">Add Provider</button>
    `;
    
    // Render pagination controls at the top
    content.innerHTML = renderProviderPaginationControls();
    
    if (providers.length === 0) {
        content.innerHTML += '<p>No providers found. Create your first provider to get started.</p>';
        return;
    }

    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Protocol</th>
                    <th>Host</th>
                    <th>Port</th>
                    <th>Path Prefix</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${providers.map(provider => {
                    return `
                        <tr>
                            <td>${provider.name}</td>
                            <td>${provider.protocol}</td>
                            <td>${provider.host}</td>
                            <td>${provider.port}</td>
                            <td>${provider.path || '/'}</td>
                            <td>
                                <span class="status-badge ${provider.enabled ? 'status-enabled' : 'status-disabled'}">
                                    ${provider.enabled ? 'Enabled' : 'Disabled'}
                                </span>
                            </td>
                            <td>
                                <button class="btn btn-success" onclick="editProvider('${provider.id}')" style="background: #3498db; background: -moz-linear-gradient(top,  #3498db 0%, #2980b9 100%); background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#3498db), color-stop(100%,#2980b9)); background: -webkit-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: -o-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: -ms-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: linear-gradient(top,  #3498db 0%,#2980b9 100%); border: 1px solid #2980b9; color: white;">Edit</button>
                                <button class="btn btn-success" onclick="deleteProvider('${provider.id}')" style="background: #e74c3c; background: -moz-linear-gradient(top,  #e74c3c 0%, #c0392b 100%); background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#e74c3c), color-stop(100%,#c0392b)); background: -webkit-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: -o-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: -ms-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: linear-gradient(top,  #e74c3c 0%,#c0392b 100%); border: 1px solid #c0392b; color: white;">Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML += table;
}

function deleteProvider(providerId) {
    if (!confirm('Are you sure you want to delete this provider? This action cannot be undone.')) {
        return;
    }

    fetch(`${API_BASE_URL}/api/v1/providers/${providerId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(() => {
        loadProviders(); // Reload providers list
    })
    .catch(error => {
        console.error('Error deleting provider:', error);
        alert('Failed to delete provider: ' + error.message);
    });
}

function editProvider(providerId) {
    const providers = getProvidersFromState();
    const provider = providers.find(p => p.id === providerId);
    
    if (!provider) {
        alert('Provider not found');
        return;
    }
    
    // Pre-fill the form with provider data
    const form = document.getElementById('createProviderForm');
    if (form) {
        form.setAttribute('data-provider-id', providerId);
        document.getElementById('providerName').value = provider.name;
        document.getElementById('providerHost').value = provider.host;
        document.getElementById('providerPort').value = provider.port;
        document.getElementById('providerProtocol').value = provider.protocol;
        document.getElementById('providerPath').value = provider.path || '';
    }
    
    // Update modal title and button
    const modalTitle = document.querySelector('#createProviderModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Edit Provider';
    }
    
    const submitButton = document.querySelector('#createProviderForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Update Provider';
    }
    
    // Show the modal
    const modal = document.getElementById('createProviderModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Handle provider form submission
function handleProviderFormSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    // Convert port to number
    data.port = parseInt(data.port);
    
    const providerId = form.getAttribute('data-provider-id');
    const isUpdate = !!providerId;
    
    const url = isUpdate 
        ? `${API_BASE_URL}/api/v1/providers/${providerId}`
        : `${API_BASE_URL}/api/v1/providers/`;
    
    const method = isUpdate ? 'PUT' : 'POST';
    
    fetch(url, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => Promise.reject(err));
        }
        return response.json();
    })
    .then(() => {
        const modal = document.getElementById('createProviderModal');
        if (modal) {
            modal.style.display = 'none';
        }
        loadProviders(); // Reload providers list
    })
    .catch(error => {
        console.error('Error creating/updating provider:', error);
        alert(`Failed to ${isUpdate ? 'update' : 'create'} provider: ${error.detail || error.message || 'Unknown error'}`);
    });
}

function showCreateProviderModal() {
    // Reset the form and modal state
    const form = document.getElementById('createProviderForm');
    if (form) {
        form.reset();
        form.removeAttribute('data-provider-id');
    }
    
    // Reset modal title and button text
    const modalTitle = document.querySelector('#createProviderModal h2');
    if (modalTitle) {
        modalTitle.textContent = 'Create Provider';
    }
    
    const submitButton = document.querySelector('#createProviderForm button[type="submit"]');
    if (submitButton) {
        submitButton.textContent = 'Create Provider';
    }
    
    // Show the modal
    const modal = document.getElementById('createProviderModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

// Initialize form handler when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('createProviderForm');
    if (form) {
        form.addEventListener('submit', handleProviderFormSubmit);
    }
});

// Export functions to global scope
window.loadProviders = loadProviders;
window.displayProviders = displayProviders;
window.deleteProvider = deleteProvider;
window.editProvider = editProvider;
window.showCreateProviderModal = showCreateProviderModal;

// Debug log
console.log('Providers module loaded. showCreateProviderModal available:', typeof window.showCreateProviderModal);

// Register with module registry if available
if (window.ModuleRegistry) {
    window.ModuleRegistry.register('providers', {
        loadProviders: loadProviders,
        displayProviders: displayProviders,
        deleteProvider: deleteProvider,
        editProvider: editProvider,
        showCreateProviderModal: showCreateProviderModal
    });
}
