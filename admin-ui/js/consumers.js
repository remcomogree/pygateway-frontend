// Consumers module for PyGateway Admin UI

// --- Pagination state for consumers ---
window.ConsumerPagination = {
    offset: 0,
    limit: 100,
    total: 0,
    isLastPage: true
};

// Use shared state - local helper functions
const getConsumersFromState = () => window.AppState.consumers || [];
const setConsumersInState = (data) => { window.AppState.consumers = data; };

// Consumers functions
function loadConsumers(pageOffset) {
    if (typeof pageOffset === 'number') window.ConsumerPagination.offset = pageOffset;
    const offset = window.ConsumerPagination.offset || 0;
    const limit = window.ConsumerPagination.limit || 100;
    
    fetch(`${API_BASE_URL}/api/v1/consumers?offset=${offset}&limit=${limit}`)
        .then(response => response.json())
        .then(data => {
            if (Array.isArray(data)) {
                setConsumersInState(data);
                window.ConsumerPagination.total = data.length;
                window.ConsumerPagination.isLastPage = data.length < limit;
            } else {
                setConsumersInState(data.items || data.consumers || []);
                window.ConsumerPagination.total = data.total || 0;
                window.ConsumerPagination.isLastPage = (offset + limit) >= (data.total || 0);
            }
            displayConsumers();
        })
        .catch(error => {
            document.getElementById('consumers-content').innerHTML = `
                <div class="error">Failed to load consumers: ${error.message}</div>
            `;
        });
}

function renderConsumerPaginationControls() {
    const offset = window.ConsumerPagination.offset || 0;
    const limit = window.ConsumerPagination.limit || 100;
    const total = window.ConsumerPagination.total || 0;
    const isFirst = offset === 0;
    const isLast = window.ConsumerPagination.isLastPage;
    const showingFrom = total === 0 ? 0 : offset + 1;
    const showingTo = Math.min(offset + (window.AppState.consumers ? window.AppState.consumers.length : 0), total);
    return `
        <div style='margin-bottom:1rem; margin-top:1.5rem; display:flex; gap:1rem;'>
            <button class='btn blue' onclick='loadConsumers(${Math.max(0, offset - limit)})' ${isFirst ? 'disabled' : ''}>Previous</button>
            <button class='btn blue' onclick='loadConsumers(${offset + limit})' ${isLast ? 'disabled' : ''}>Next</button>
            <span>Showing ${showingFrom} - ${showingTo} of ${total}</span>
        </div>
    `;
}

function displayConsumers() {
    const content = document.getElementById('consumers-content');
    const consumers = getConsumersFromState();
    
    // Render pagination controls at the top
    content.innerHTML = renderConsumerPaginationControls();
    
    if (consumers.length === 0) {
        content.innerHTML += '<p>No consumers found. Create your first consumer to get started.</p>';
        return;
    }
    const table = `
        <table class="table">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Custom ID</th>
                    <th>Tags</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${consumers.map(consumer => `
                    <tr>
                        <td>${consumer.username}</td>
                        <td>${consumer.custom_id || ''}</td>
                        <td>${(consumer.tags || []).join(', ')}</td>
                        <td>
                            <button class="btn blue" onclick="editConsumer('${consumer.id}')">Edit</button>
                            <button class="btn red" onclick="deleteConsumer('${consumer.id}')">Delete</button>
                            <button class="btn blue" onclick="manageConsumerKeys('${consumer.id}')">Manage Keys</button>
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
    content.innerHTML += table;
}

function showCreateConsumerModal() {
    const modal = document.getElementById('createConsumerModal');
    if (modal) {
        modal.style.display = 'block';
        const form = document.getElementById('createConsumerForm');
        form.reset();
        form.onsubmit = function(e) {
            e.preventDefault();
            submitConsumerForm(null, new FormData(form));
        };
    }
}

function editConsumer(consumerId) {
    const consumer = getConsumersFromState().find(c => c.id === consumerId);
    const modal = document.getElementById('editConsumerModal');
    if (modal && consumer) {
        modal.style.display = 'block';
        const form = document.getElementById('editConsumerForm');
        form.reset();
        form.elements['editConsumerId'].value = consumer.id;
        form.elements['editConsumerUsername'].value = consumer.username || '';
        form.elements['editConsumerCustomId'].value = consumer.custom_id || '';
        form.elements['editConsumerTags'].value = (consumer.tags || []).join(', ');
        form.onsubmit = function(e) {
            e.preventDefault();
            submitConsumerForm(consumer.id, new FormData(form));
        };
    }
}

function submitConsumerForm(id, formData) {
    const data = {};
    for (const [key, value] of formData.entries()) {
        if (key === 'tags') {
            data.tags = value.split(',').map(t => t.trim()).filter(Boolean);
        } else if (key === 'id') {
            // skip hidden id field
        } else {
            data[key.replace(/^editConsumer/, '').toLowerCase()] = value;
        }
    }
    const endpoint = `${API_BASE_URL}/api/v1/consumers${id ? '/' + id : ''}`;
    const method = id ? 'PUT' : 'POST';
    fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(() => {
        closeModal(id ? 'editConsumerModal' : 'createConsumerModal');
        loadConsumers();
    })
    .catch(e => {
        alert('Failed to save. Please check your input and try again.');
    });
}

function deleteConsumer(id) {
    if (!confirm('Are you sure you want to delete this consumer?')) return;
    fetch(`${API_BASE_URL}/api/v1/consumers/${id}`, { method: 'DELETE' })
        .then(() => loadConsumers());
}

function manageConsumerKeys(consumerId) {
    // Show the key management screen/modal for the consumer
    // You can implement this as a modal or a separate pane
    showConsumerKeysScreen(consumerId);
}

function showConsumerKeysScreen(consumerId) {
    let modal = document.getElementById('consumerKeysModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'consumerKeysModal';
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <span class="close" onclick="closeModal('consumerKeysModal')">&times;</span>
                <h2>Manage Keys for Consumer</h2>
                <div id="consumerKeysContent">Loading keys...</div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    modal.style.display = 'block';
    loadConsumerKeys(consumerId);
}

function loadConsumerKeys(consumerId) {
    const content = document.getElementById('consumerKeysContent');
    content.innerHTML = '<div class="loading">Fetching keys from Azure Key Vault...</div>';
    fetch(`${API_BASE_URL}/api/v1/consumers/${consumerId}/keys`)
        .then(response => response.json())
        .then(data => {
            const secrets = data.secrets || [];
            if (secrets.length === 0) {
                content.innerHTML = '<p>No keys found for this consumer.</p>' +
                    `<div style='margin-top:1rem;'><button class='btn blue' onclick='createConsumerKey("${consumerId}")'>Create Key</button></div>`;
                return;
            }
            Promise.all(secrets.map(secret =>
                fetch(`${API_BASE_URL}/api/v1/consumers/${consumerId}/keys/${secret.name}`)
                    .then(resp => resp.json())
                    .then(valData => ({...secret, value: valData.value}))
            )).then(secretsWithValues => {
                content.innerHTML = `<ul>${secretsWithValues.map(secret => `
                    <li style='margin-bottom:2rem;'>
                        <div>
                            <span class="masked-key" onclick="toggleKeyVisibility(this, '${secret.value}')">${'•'.repeat(8)}</span>
                            <button class="copy-btn" onclick="copyToClipboard('${secret.value}', event)" title="Copy to clipboard" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; font-size: 12px; background: #007bff; color: white; border: none; border-radius: 3px; cursor: pointer;">📋</button>
                            <span style='color:#888'>(ID: ${secret.id})</span>
                        </div>
                        <div style='margin-top:0.5rem; display:flex; gap:1rem;'>
                            <button class="btn blue" onclick="createConsumerKey('${consumerId}')">Generate New Key</button>
                            <button class="btn red" onclick="deleteConsumerKey('${consumerId}', '${secret.name}')">Delete Key</button>
                        </div>
                    </li>
                `).join('')}</ul>`;
            });
        })
        .catch(error => {
            content.innerHTML = `<div class="error">Failed to fetch keys: ${error.message}</div>`;
        });
}

function copyToClipboard(text, event) {
    navigator.clipboard.writeText(text).then(() => {
        // Create temporary feedback element
        const feedback = document.createElement('span');
        feedback.textContent = ' Copied!';
        feedback.style.color = 'green';
        feedback.style.fontSize = '12px';
        feedback.style.marginLeft = '0.5rem';
        
        // Find the copy button that was clicked
        const copyBtn = event ? event.target : null;
        if (copyBtn && copyBtn.parentNode) {
            copyBtn.parentNode.appendChild(feedback);
            
            // Remove feedback after 2 seconds
            setTimeout(() => {
                if (feedback.parentNode) {
                    feedback.parentNode.removeChild(feedback);
                }
            }, 2000);
        } else {
            // Fallback if no button reference
            alert('Copied to clipboard!');
        }
    }).catch(err => {
        console.error('Failed to copy: ', err);
        alert('Failed to copy to clipboard');
    });
}

function toggleKeyVisibility(element, actualValue) {
    if (element.textContent === '••••••••') {
        element.textContent = actualValue;
        element.style.fontFamily = 'monospace';
    } else {
        element.textContent = '••••••••';
        element.style.fontFamily = 'inherit';
    }
}

function createConsumerKey(consumerId) {
    const content = document.getElementById('consumerKeysContent');
    content.innerHTML = '<div class="loading">Creating key...</div>';
    fetch(`${API_BASE_URL}/api/v1/consumers/${consumerId}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
    })
        .then(response => response.json())
        .then(data => {
            content.innerHTML = `<p>Key created: <b>${data.name}</b> <span style='color:#888'>(ID: ${data.id})</span></p>`;
            loadConsumerKeys(consumerId); // Refresh key list
        })
        .catch(error => {
            content.innerHTML = `<div class="error">Failed to create key: ${error.message}</div>`;
        });
}

function deleteConsumerKey(consumerId, keyName) {
    if (!confirm('Are you sure you want to delete and purge this key? This cannot be undone.')) return;
    const content = document.getElementById('consumerKeysContent');
    content.innerHTML = '<div class="loading">Deleting key...</div>';
    fetch(`${API_BASE_URL}/api/v1/consumers/${consumerId}/keys/${keyName}`, {
        method: 'DELETE'
    })
    .then(response => response.json())
    .then(data => {
        content.innerHTML = `<p>Key deleted and purged.</p>`;
        loadConsumerKeys(consumerId);
    })
    .catch(error => {
        content.innerHTML = `<div class="error">Failed to delete key: ${error.message}</div>`;
    });
}

// Register module for dynamic loading
if (!window.ModuleRegistry) window.ModuleRegistry = {};
if (!window.ModuleRegistry.modules) window.ModuleRegistry.modules = {};
window.ModuleRegistry.modules['consumers'] = true;

// Expose functions for dynamic use
window.loadConsumers = loadConsumers;
window.displayConsumers = displayConsumers;
window.showCreateConsumerModal = showCreateConsumerModal;
window.editConsumer = editConsumer;
window.deleteConsumer = deleteConsumer;
