// Monetization module for PyGateway Admin UI
// Handles CRUD and display for Plans, Subscriptions, Usage Events, and Usage Aggregations

// Register module for dynamic loading
// Ensure ModuleRegistry and modules property exist
if (!window.ModuleRegistry) window.ModuleRegistry = {};
if (!window.ModuleRegistry.modules) window.ModuleRegistry.modules = {};
window.ModuleRegistry.modules['monetization'] = true;

// API endpoints (use API_BASE_URL)
const MONETIZATION_API = {
    plans: `${API_BASE_URL}/api/v1/monetization/plans`,
    subscriptions: `${API_BASE_URL}/api/v1/monetization/subscriptions`,
    usageEvents: `${API_BASE_URL}/api/v1/monetization/usage-events`,
    usageAggregations: `${API_BASE_URL}/api/v1/monetization/usage-aggregations`
};

// Use shared state - local helper functions
const getPlansFromState = () => window.AppState.plans || [];
const setPlansInState = (data) => { window.AppState.plans = data; };
const getSubscriptionsFromState = () => window.AppState.subscriptions || [];
const setSubscriptionsInState = (data) => { window.AppState.subscriptions = data; };
const getUsageEventsFromState = () => window.AppState.usageEvents || [];
const setUsageEventsInState = (data) => { window.AppState.usageEvents = data; };
const getUsageAggregationsFromState = () => window.AppState.usageAggregations || [];
const setUsageAggregationsInState = (data) => { window.AppState.usageAggregations = data; };

// Load and render all monetization tables
async function loadMonetization() {
    // Ensure consumers are loaded before subscriptions
    if (!window.AppState.consumers || window.AppState.consumers.length === 0) {
        if (window.loadConsumers) await window.loadConsumers();
    }
    await Promise.all([
        loadPlans(),
        loadSubscriptions(),
        loadUsageEvents(),
        loadUsageAggregations()
    ]);
}

// Load and render Plans
async function loadPlans() {
    const container = document.getElementById('monetization-plans-content');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading plans...</div>';
    try {
        const res = await fetch(MONETIZATION_API.plans);
        const plans = await res.json();
        window._lastPlans = plans;
        setPlansInState(plans); // Update shared state
        container.innerHTML = renderPlansTable(plans);
    } catch (e) {
        container.innerHTML = '<div class="error">Failed to load plans</div>';
    }
}

function renderPlansTable(plans) {
    let html = `<button class="btn btn-success" onclick="showMonetizationModal('plan')">Add Plan</button>`;
    html += `<table class="data-table"><thead><tr><th>Name</th><th>Description</th><th>Price/Unit</th><th>Quota</th><th>Period</th><th>Enabled</th><th>Actions</th></tr></thead><tbody>`;
    for (const plan of plans) {
        const planId = plan.id;
        html += `<tr><td>${plan.name}</td><td>${plan.description||''}</td><td>${plan.price_per_unit}</td><td>${plan.quota||''}</td><td>${plan.period}</td><td>${plan.enabled?'Yes':'No'}</td><td>
            <button class="btn" data-plan-id="${planId}" onclick="window.editPlan('${planId}')">Edit</button>
            <button class="btn btn-success" onclick="deleteMonetizationItem('plan', '${planId}')" style="background: #e74c3c; background: -moz-linear-gradient(top,  #e74c3c 0%, #c0392b 100%); background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#e74c3c), color-stop(100%,#c0392b)); background: -webkit-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: -o-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: -ms-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: linear-gradient(top,  #e74c3c 0%,#c0392b 100%); border: 1px solid #c0392b; color: white;">Delete</button>
        </td></tr>`;
    }
    html += '</tbody></table>';
    return html;
}

window.editPlan = function(planId) {
    const plan = (window._lastPlans || []).find(p => p.id === planId);
    if (plan) showMonetizationModal('plan', plan);
};

// Load and render Subscriptions
async function loadSubscriptions() {
    const container = document.getElementById('monetization-subscriptions-content');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading subscriptions...</div>';
    try {
        const res = await fetch(MONETIZATION_API.subscriptions);
        const subs = await res.json();
        setSubscriptionsInState(subs); // Update shared state
        container.innerHTML = renderSubscriptionsTable(subs);
    } catch (e) {
        console.error('Failed to load subscriptions:', e);
        container.innerHTML = '<div class="error">Failed to load subscriptions</div>';
    }
}

function renderSubscriptionsTable(subs) {
    const consumers = Array.isArray(window.AppState.consumers) ? window.AppState.consumers : [];
    const services = Array.isArray(window.AppState.services) ? window.AppState.services : [];
    const plans = Array.isArray(window._lastPlans) ? window._lastPlans : [];
    let html = `<button class="btn btn-success" onclick="showMonetizationModal('subscription')">Add Subscription</button>`;
    html += `<table class="data-table"><thead><tr><th>Consumer</th><th>Service</th><th>Plan</th><th>Status</th><th>Start</th><th>End</th><th>Actions</th></tr></thead><tbody>`;
    for (const sub of subs) {
        const consumer = consumers.find(c => c.id === sub.consumer_id);
        const service = services.find(s => s.id === sub.service_id);
        const plan = plans.find(p => p.id === sub.plan_id);
        const consumerName = consumer ? consumer.username : sub.consumer_id;
        const serviceName = service ? service.name : sub.service_id;
        const planName = plan ? plan.name : sub.plan_id;
        const safeSub = JSON.stringify(sub).replace(/'/g, "&#39;").replace(/"/g, '&quot;');
        html += `<tr><td>${consumerName}</td><td>${serviceName}</td><td>${planName}</td><td>${sub.status}</td><td>${sub.start_date||''}</td><td>${sub.end_date||''}</td><td>
            <button class="btn btn-success" onclick='showMonetizationModal("subscription", ${safeSub})' style="background: #3498db; background: -moz-linear-gradient(top,  #3498db 0%, #2980b9 100%); background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#3498db), color-stop(100%,#2980b9)); background: -webkit-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: -o-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: -ms-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: linear-gradient(top,  #3498db 0%,#2980b9 100%); border: 1px solid #2980b9; color: white;">Edit</button>
            <button class="btn btn-success" onclick="deleteMonetizationItem('subscription', '${sub.id}')" style="background: #e74c3c; background: -moz-linear-gradient(top,  #e74c3c 0%, #c0392b 100%); background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#e74c3c), color-stop(100%,#c0392b)); background: -webkit-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: -o-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: -ms-linear-gradient(top,  #e74c3c 0%,#c0392b 100%); background: linear-gradient(top,  #e74c3c 0%,#c0392b 100%); border: 1px solid #c0392b; color: white;">Delete</button>
        </td></tr>`;
    }
    html += '</tbody></table>';
    return html;
}

// Load and render Usage Events
async function loadUsageEvents() {
    const container = document.getElementById('monetization-usage-events-content');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading usage events...</div>';
    try {
        const res = await fetch(MONETIZATION_API.usageEvents);
        const events = await res.json();
        setUsageEventsInState(events); // Update shared state
        container.innerHTML = renderUsageEventsTable(events);
    } catch (e) {
        console.error('Failed to load usage events:', e);
        container.innerHTML = '<div class="error">Failed to load usage events</div>';
    }
}

function renderUsageEventsTable(events) {
    const consumers = Array.isArray(window.AppState.consumers) ? window.AppState.consumers : [];
    const services = Array.isArray(window.AppState.services) ? window.AppState.services : [];
    const routes = Array.isArray(window.AppState.routes) ? window.AppState.routes : [];
    let html = `<button class="btn btn-success" onclick="showMonetizationModal('usageEvent')">Add Usage Event</button>`;
    html += `<table class="data-table"><thead><tr><th>Consumer</th><th>Service</th><th>Route</th><th>Resource</th><th>Status</th><th>Timestamp</th><th>Actions</th></tr></thead><tbody>`;
    for (const ev of events) {
        const consumer = consumers.find(c => c.id === ev.consumer_id);
        const service = services.find(s => s.id === ev.service_id);
        const route = routes.find(r => r.id === ev.route_id);
        const consumerName = consumer ? consumer.username : ev.consumer_id;
        const serviceName = service ? service.name : ev.service_id;
        const routeName = route ? route.name : ev.route_id;
        html += `<tr><td>${consumerName}</td><td>${serviceName}</td><td>${routeName}</td><td>${ev.resource||''}</td><td>${ev.status}</td><td>${ev.timestamp}</td><td>
            <button class="btn" onclick="showMonetizationModal('usageEvent', ${JSON.stringify(ev)})">Edit</button>
            <button class="btn btn-danger" onclick="deleteMonetizationItem('usageEvent', '${ev.id}')">Delete</button>
        </td></tr>`;
    }
    html += '</tbody></table>';
    return html;
}

// Load and render Usage Aggregations
async function loadUsageAggregations() {
    const container = document.getElementById('monetization-usage-aggregations-content');
    if (!container) return;
    container.innerHTML = '<div class="loading">Loading usage aggregations...</div>';
    try {
        // Ensure services and plans data are loaded
        if (!window.AppState.services || window.AppState.services.length === 0) {
            if (window.loadServices) await window.loadServices();
        }
        if (!window._lastPlans || window._lastPlans.length === 0) {
            await loadPlans();
        }
        
        const res = await fetch(MONETIZATION_API.usageAggregations);
        const aggs = await res.json();
        setUsageAggregationsInState(aggs);
        container.innerHTML = renderUsageAggregationsTable(aggs);
    } catch (e) {
        console.error('Failed to load usage aggregations:', e);
        container.innerHTML = '<div class="error">Failed to load usage aggregations</div>';
    }
}

function renderUsageAggregationsTable(aggs) {
    const consumers = Array.isArray(window.AppState.consumers) ? window.AppState.consumers : [];
    const services = Array.isArray(window.AppState.services) ? window.AppState.services : [];
    const plans = Array.isArray(window._lastPlans) ? window._lastPlans : [];
    // Remove Add Aggregation button and Actions column
    let html = `<table class="data-table"><thead><tr><th>Consumer</th><th>Service</th><th>Plan</th><th>Period</th><th>Usage</th><th>Total Cost</th></tr></thead><tbody>`;
    for (const agg of aggs) {
        const consumer = consumers.find(c => c.id === agg.consumer_id);
        const service = services.find(s => s.id === agg.service_id);
        const plan = plans.find(p => p.id === agg.plan_id);
        const consumerName = consumer ? consumer.username : agg.consumer_id;
        const serviceName = service ? service.name : agg.service_id;
        const planName = plan ? plan.name : agg.plan_id;
        html += `<tr><td>${consumerName}</td><td>${serviceName}</td><td>${planName}</td><td>${agg.period}</td><td>${agg.usage_count}</td><td>${agg.total_cost}</td></tr>`;
    }
    html += '</tbody></table>';
    return html;
}

// Monetization tab switching and loading
function showMonetizationTab(tab) {
    const tabs = ['plans', 'subscriptions', 'usage-events', 'usage-aggregations'];
    for (const t of tabs) {
        document.getElementById(`monetization-${t}-content`).style.display = (t === tab) ? '' : 'none';
    }
    // Load data for the selected tab
    switch(tab) {
        case 'plans': loadPlans(); break;
        case 'subscriptions': loadSubscriptions(); break;
        case 'usage-events': loadUsageEvents(); break;
        case 'usage-aggregations': loadUsageAggregations(); break;
    }
}

// Ensure Monetization loads when section is shown
const origShowSection = window.showSection;
window.showSection = function(section) {
    origShowSection(section);
    if (section === 'monetization') {
        window.loadMonetization();
        showMonetizationTab('plans');
    }
};

// --- Monetization CRUD helpers ---
// Generic modal for create/edit
function showMonetizationModal(type, data = null) {
    // type: 'plan', 'subscription', 'usageEvent', 'usageAggregation'
    // data: object for edit, null for create
    const modalId = `monetization-${type}-modal`;
    let modal = document.getElementById(modalId);
    if (!modal) {
        modal = document.createElement('div');
        modal.id = modalId;
        modal.className = 'modal';
        modal.innerHTML = `<div class="modal-content">
            <span class="close" onclick="closeModal('${modalId}')">&times;</span>
            <h2>${data ? 'Edit' : 'Create'} ${type.charAt(0).toUpperCase() + type.slice(1)}</h2>
            <form id="${modalId}-form"></form>
        </div>`;
        document.body.appendChild(modal);
    }
    // Render form fields
    const form = modal.querySelector('form');
    form.innerHTML = renderMonetizationForm(type, data);
    form.onsubmit = function(e) {
        e.preventDefault();
        submitMonetizationForm(type, data ? data.id : null, new FormData(form));
    };
    modal.style.display = 'block';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    // toISOString returns YYYY-MM-DDTHH:MM:SS.sssZ, slice to YYYY-MM-DDTHH:MM
    return d.toISOString().slice(0,16);
}

function renderMonetizationForm(type, data) {
    // Returns HTML for form fields for each model
    // For brevity, only key fields shown; expand as needed
    if (type === 'plan') {
        return `
            <div class="form-group">
                <label for="planName">Name</label>
                <input type="text" id="planName" name="name" value="${data?.name||''}" required>
            </div>
            <div class="form-group">
                <label for="planDescription">Description</label>
                <textarea id="planDescription" name="description" rows="2">${data?.description||''}</textarea>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="planPrice">Price/Unit</label>
                    <input type="number" id="planPrice" name="price_per_unit" value="${data?.price_per_unit||0}" required>
                </div>
                <div class="form-group">
                    <label for="planQuota">Quota</label>
                    <input type="number" id="planQuota" name="quota" value="${data?.quota||''}">
                </div>
                <div class="form-group">
                    <label for="planPeriod">Period</label>
                    <input type="text" id="planPeriod" name="period" value="${data?.period||'month'}" required>
                </div>
            </div>
            <div class="form-group">
                <label for="planEnabled">
                    <input type="checkbox" id="planEnabled" name="enabled" ${data?.enabled ? 'checked' : ''}>
                    Enabled
                </label>
            </div>
            <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                <button type="submit" class="btn btn-success">${data ? 'Update' : 'Create'} Plan</button>
                <button type="button" class="btn" onclick="closeModal('monetization-plan-modal')">Cancel</button>
            </div>
        `;
    }
    if (type === 'subscription') {
        // Get all services, plans, and consumers from global state
        const services = Array.isArray(window.AppState?.services) ? window.AppState.services : [];
        const plans = Array.isArray(window._lastPlans) ? window._lastPlans : [];
        const consumers = Array.isArray(window.AppState?.consumers) ? window.AppState.consumers : [];
        return `
            <div class="form-group">
                <label for="subConsumer">Consumer</label>
                <select id="subConsumer" name="consumer_id" required>
                    <option value="">Select a consumer...</option>
                    ${consumers.map(c => `<option value="${c.id}" ${data?.consumer_id===c.id?'selected':''}>${c.username}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="subService">Service</label>
                <select id="subService" name="service_id" required>
                    <option value="">Select a service...</option>
                    ${services.map(s => `<option value="${s.id}" ${data?.service_id===s.id?'selected':''}>${s.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label for="subPlan">Plan</label>
                <select id="subPlan" name="plan_id" required>
                    <option value="">Select a plan...</option>
                    ${plans.map(p => `<option value="${p.id}" ${data?.plan_id===p.id?'selected':''}>${p.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label for="subStatus">Status</label>
                    <input type="text" id="subStatus" name="status" value="${data?.status||'active'}" required>
                </div>
                <div class="form-group">
                    <label for="subStart">Start Date</label>
                    <input type="datetime-local" id="subStart" name="start_date" value="${formatDateForInput(data?.start_date)}">
                </div>
                <div class="form-group">
                    <label for="subEnd">End Date</label>
                    <input type="datetime-local" id="subEnd" name="end_date" value="${formatDateForInput(data?.end_date)}">
                </div>
            </div>
            <div style="margin-top: 1.5rem; display: flex; gap: 1rem;">
                <button type="submit" class="btn btn-success">${data ? 'Update' : 'Create'} Subscription</button>
                <button type="button" class="btn" onclick="closeModal('monetization-subscription-modal')">Cancel</button>
            </div>
        `;
    }
    switch(type) {
        case 'usageEvent':
            return `
                <label>Subscription ID</label><input name="subscription_id" value="${data?.subscription_id||''}"><br>
                <label>Consumer ID</label><input name="consumer_id" value="${data?.consumer_id||''}"><br>
                <label>Service ID</label><input name="service_id" value="${data?.service_id||''}" required><br>
                <label>Route ID</label><input name="route_id" value="${data?.route_id||''}"><br>
                <label>Resource</label><input name="resource" value="${data?.resource||''}"><br>
                <label>Status</label><input name="status" value="${data?.status||'success'}" required><br>
                <label>Timestamp</label><input name="timestamp" type="datetime-local" value="${data?.timestamp||''}"><br>
                <label>Event Metadata (JSON)</label><textarea name="event_metadata">${data?.event_metadata ? JSON.stringify(data.event_metadata) : ''}</textarea><br>
                <button type="submit" class="btn btn-success">${data ? 'Update' : 'Create'}</button>
            `;
        case 'usageAggregation':
            return `
                <label>Consumer ID</label><input name="consumer_id" value="${data?.consumer_id||''}"><br>
                <label>Service ID</label><input name="service_id" value="${data?.service_id||''}" required><br>
                <label>Plan ID</label><input name="plan_id" value="${data?.plan_id||''}"><br>
                <label>Period</label><input name="period" value="${data?.period||''}" required><br>
                <label>Usage Count</label><input name="usage_count" type="number" value="${data?.usage_count||0}" required><br>
                <label>Total Cost</label><input name="total_cost" type="number" value="${data?.total_cost||0}" required><br>
                <button type="submit" class="btn btn-success">${data ? 'Update' : 'Create'}</button>
            `;
        default:
            return '';
    }
}

// Update submitMonetizationForm for subscriptions to match plans
function submitMonetizationForm(type, id, formData) {
    const data = {};
    for (const [key, value] of formData.entries()) {
        if (key === 'enabled') {
            data.enabled = true;
        } else if (key.endsWith('_count') || key === 'price_per_unit' || key === 'quota' || key === 'total_cost') {
            data[key] = Number(value);
        } else if (key === 'event_metadata') {
            try { data.event_metadata = JSON.parse(value); } catch { data.event_metadata = {}; }
        } else {
            data[key] = value;
        }
    }
    // For subscriptions, only convert date fields if present
    if (type === 'subscription') {
        if (data.start_date) data.start_date = data.start_date ? new Date(data.start_date).toISOString() : null;
        if (data.end_date) data.end_date = data.end_date ? new Date(data.end_date).toISOString() : null;
        // Remove empty strings for required fields
        ['consumer_id', 'service_id', 'plan_id', 'status'].forEach(key => {
            if (data[key] === '') delete data[key];
        });
    }
    // Log the payload for debugging
    console.log('Submitting', type, 'ID:', id, 'Payload:', data);
    // API endpoint
    const endpoint = `${API_BASE_URL}/api/v1/monetization/${type === 'usageEvent' ? 'usage-events' : type === 'usageAggregation' ? 'usage-aggregations' : type === 'subscription' ? 'subscriptions' : type + 's'}${id ? '/' + id : ''}`;
    const method = id ? 'PUT' : 'POST';
    fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    })
    .then(r => r.json())
    .then(() => {
        closeModal(`monetization-${type}-modal`);
        window.loadMonetization();
    })
    .catch(e => {
        alert('Failed to save. Please check your input and try again.');
        console.error('API error:', e);
    });
}
