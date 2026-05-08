// Dashboard module for PyGateway Admin UI

function loadDashboard() {
    console.log('Loading dashboard...');
    
    // Simple test first
    document.getElementById('dashboard-stats').innerHTML = '<div>JavaScript is working...</div>';
    
    // Load both config and dataplanes data
    Promise.all([
        authenticatedFetch(`${API_BASE_URL}/api/v1/config/sync`).then(response => {
            console.log('Config response:', response);
            if (!response.ok) {
                throw new Error(`Config API error: ${response.status}`);
            }
            return response.json();
        }),
        authenticatedFetch(`${API_BASE_URL}/api/v1/dataplanes/`).then(response => {
            console.log('Dataplanes response:', response);
            if (!response.ok) {
                throw new Error(`Dataplanes API error: ${response.status}`);
            }
            return response.json();
        })
    ])
    .then(([configData, dataplanesData]) => {
        console.log('Config data:', configData);
        console.log('Dataplanes data:', dataplanesData);
        const onlineDataplanes = dataplanesData.filter(dp => dp.status === 'online').length;
        const totalDataplanes = dataplanesData.length;
        
        // Create dashboard stats container
        const dashboardContainer = document.createElement('div');
        dashboardContainer.style.cssText = 'display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;';
        
        // Create workspace card
        const workspaceCard = document.createElement('div');
        workspaceCard.className = 'card dashboard-card';
        workspaceCard.style.cursor = 'pointer';
        workspaceCard.innerHTML = `
            <h3>Workspaces</h3>
            <p style="font-size: 2rem; font-weight: bold; color: #9b59b6;">${configData.workspaces.length}</p>
        `;
        workspaceCard.addEventListener('click', () => showSection('workspaces'));
        
        // Create services card
        const servicesCard = document.createElement('div');
        servicesCard.className = 'card dashboard-card';
        servicesCard.style.cursor = 'pointer';
        servicesCard.innerHTML = `
            <h3>Services</h3>
            <p style="font-size: 2rem; font-weight: bold; color: #3498db;">${configData.services.length}</p>
        `;
        servicesCard.addEventListener('click', () => {
            showSection('api');
            // Switch to services tab after a short delay to ensure API section is loaded
            setTimeout(() => {
                if (window.showApiTab) window.showApiTab('services');
            }, 100);
        });
        
        // Create routes card
        const routesCard = document.createElement('div');
        routesCard.className = 'card dashboard-card';
        routesCard.style.cursor = 'pointer';
        routesCard.innerHTML = `
            <h3>Routes</h3>
            <p style="font-size: 2rem; font-weight: bold, color: #27ae60;">${configData.routes.length}</p>
        `;
        routesCard.addEventListener('click', () => {
            showSection('api');
            // Switch to routes tab after a short delay to ensure API section is loaded
            setTimeout(() => {
                if (window.showApiTab) window.showApiTab('routes');
            }, 100);
        });
        
        // Create plugins card
        const pluginsCard = document.createElement('div');
        pluginsCard.className = 'card dashboard-card';
        pluginsCard.style.cursor = 'pointer';
        pluginsCard.innerHTML = `
            <h3>Plugins</h3>
            <p style="font-size: 2rem; font-weight: bold; color: #e74c3c;">${configData.plugins.length}</p>
        `;
        pluginsCard.addEventListener('click', () => {
            showSection('api');
            // Switch to plugins tab after a short delay to ensure API section is loaded
            setTimeout(() => {
                if (window.showApiTab) window.showApiTab('plugins');
            }, 100);
        });
        
        // Create dataplanes card
        const dataplanesCard = document.createElement('div');
        dataplanesCard.className = 'card dashboard-card';
        dataplanesCard.style.cursor = 'pointer';
        dataplanesCard.innerHTML = `
            <h3>Dataplanes</h3>
            <p style="font-size: 2rem; font-weight: bold; color: #f39c12;">
                <span class="status-indicator ${onlineDataplanes > 0 ? 'status-online' : 'status-offline'}"></span>
                ${onlineDataplanes}/${totalDataplanes}
            </p>
            <p style="font-size: 0.9rem; color: #666; margin-top: 0.5rem;">
                ${onlineDataplanes === totalDataplanes ? 'All Online' : 
                  onlineDataplanes === 0 ? 'All Offline' : 
                  `${totalDataplanes - onlineDataplanes} Offline`}
            </p>
        `;
        dataplanesCard.addEventListener('click', () => showSection('dataplanes'));
        
        // Create config version card
        const configCard = document.createElement('div');
        configCard.className = 'card';
        configCard.innerHTML = `
            <h3>Config Version</h3>
            <p style="font-size: 1.2rem; font-weight: bold; color: #8e44ad;">${configData.version}</p>
        `;
        
        // Append all cards to container
        dashboardContainer.appendChild(workspaceCard);
        dashboardContainer.appendChild(servicesCard);
        dashboardContainer.appendChild(routesCard);
        dashboardContainer.appendChild(pluginsCard);
        dashboardContainer.appendChild(dataplanesCard);
        dashboardContainer.appendChild(configCard);
        
        // Clear and set the dashboard stats
        const dashboardStats = document.getElementById('dashboard-stats');
        dashboardStats.innerHTML = '';
        dashboardStats.appendChild(dashboardContainer);
        
        // Add dataplane status details if there are any dataplanes
        if (dataplanesData.length > 0) {
            const dataplaneDetails = document.createElement('div');
            dataplaneDetails.className = 'card';
            dataplaneDetails.style.marginTop = '1rem';
            dataplaneDetails.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h2>Dataplane Status</h2>
                    <button class="btn btn-success" onclick="showSection('dataplanes')" style="background: #3498db; background: -moz-linear-gradient(top,  #3498db 0%, #2980b9 100%); background: -webkit-gradient(linear, left top, left bottom, color-stop(0%,#3498db), color-stop(100%,#2980b9)); background: -webkit-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: -o-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: -ms-linear-gradient(top,  #3498db 0%,#2980b9 100%); background: linear-gradient(top,  #3498db 0%,#2980b9 100%); border: 1px solid #2980b9; color: white;">View All</button>
                </div>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem; margin-top: 1rem;">
                    ${dataplanesData.map(dp => `
                        <div class="dashboard-dataplane-card ${dp.status === 'offline' ? 'offline' : ''}">
                            <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                                <span class="status-indicator ${dp.status === 'online' ? 'status-online' : 'status-offline'}"></span>
                                <strong style="margin-left: 0.5rem;">${dp.name}</strong>
                                <span style="margin-left: auto; font-size: 0.8em; color: #666; text-transform: capitalize;">${dp.status}</span>
                            </div>
                            <div style="font-size: 0.9rem; color: #666;">
                                <div>ID: <code style="font-size: 0.8em;">${dp.id.substring(0, 8)}...</code></div>
                                <div>Last seen: ${formatLastSeen(dp.last_seen)}</div>
                                <div>Uptime: ${formatUptime(dp.created_at)}</div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
            document.getElementById('dashboard-stats').appendChild(dataplaneDetails);
        }
        
        // Fetch keyvault expiry info from controlplane
        authenticatedFetch(`${API_BASE_URL}/api/v1/config/system`).then(response => {
            if (!response.ok) return;
            return response.json();
        }).then(systemInfo => {
            if (!systemInfo || !systemInfo.keyvault_expire_secret) return;
            const days = systemInfo.keyvault_expire_secret_days_remaining;
            const isExpiringSoon = days !== null && days <= 30;
            const expiryHtml = `<div class="card" style="margin-top:1rem;"><strong>Key Vault Secret Expiry:</strong> <span style="color:${isExpiringSoon ? 'red' : 'inherit'}; font-weight:${isExpiringSoon ? 'bold' : 'normal'};">${systemInfo.keyvault_expire_secret}</span> ${days !== null ? `(${days} days left)` : ''}</div>`;
            document.getElementById('dashboard-stats').insertAdjacentHTML('beforeend', expiryHtml);
        });
    })
    .catch(error => {
        console.error('Error loading dashboard:', error);
        document.getElementById('dashboard-stats').innerHTML = `
            <div class="error">Failed to load dashboard: ${error.message}</div>
        `;
    });
}

// Helper functions for dashboard
function formatLastSeen(lastSeen) {
    if (!lastSeen) return 'Never';
    const date = new Date(lastSeen);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

function formatUptime(createdAt) {
    if (!createdAt) return 'Unknown';
    const date = new Date(createdAt);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ${diffMins % 60}m`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ${diffHours % 24}h`;
}

// Make functions globally accessible
window.loadDashboard = loadDashboard;
