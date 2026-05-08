// Analytics module for PyGateway Admin UI

async function loadAnalytics() {
    console.log('Loading analytics...');
    const content = document.getElementById('analytics-content');
    content.innerHTML = '<div class="loading">Loading analytics...</div>';
    fetch(`${API_BASE_URL}/api/v1/usage/report`)
        .then(response => {
            if (!response.ok) {
                throw new Error(`Analytics API error: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Analytics data:', data);
            // Debug: log buckets
            console.log('Request buckets:', data.counters.buckets);
            const totalRequests = data.counters.total_requests;
            const recentRequests = data.counters.buckets[data.counters.buckets.length - 1];
            const hasData = Array.isArray(data.counters.buckets) && data.counters.buckets.some(b => b.request_count > 0);
            content.innerHTML = `
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                    <div class="card">
                        <h3>Total Requests</h3>
                        <p style="font-size: 2rem; font-weight: bold; color: #3498db;">${totalRequests.toLocaleString()}</p>
                    </div>
                    <div class="card">
                        <h3>Services</h3>
                        <p style="font-size: 2rem; font-weight: bold; color: #27ae60;">${data.services_count}</p>
                    </div>
                    <div class="card">
                        <h3>Routes</h3>
                        <p style="font-size: 2rem; font-weight: bold; color: #e74c3c;">${data.routes_count}</p>
                    </div>
                    <div class="card">
                        <h3>Connected Dataplanes</h3>
                        <p style="font-size: 2rem; font-weight: bold; color: #f39c12;">${data.deployment_info.connected_dp_count}</p>
                    </div>
                </div>
                <div class="card">
                    <h3>Request Trends</h3>
                    <div style="height: 400px; margin: 1rem 0;">
                        <canvas id="requestTrendsChart"></canvas>
                    </div>
                    <div style="margin-top: 1rem;">
                        ${hasData ? data.counters.buckets.map(bucket => `
                            <div style="display: flex; justify-content: space-between; padding: 0.5rem; border-bottom: 1px solid #eee;">
                                <span>${bucket.bucket}</span>
                                <span style="font-weight: bold;">${bucket.request_count.toLocaleString()}</span>
                            </div>
                        `).join('') : '<div>No request data available.</div>'}
                    </div>
                </div>
                <div class="card" style="margin-top: 1rem;">
                    <h3>System Information</h3>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;">
                        <div>
                            <h4>Deployment</h4>
                            <p><strong>Type:</strong> ${data.deployment_info.type}</p>
                            <p><strong>Version:</strong> ${data.version}</p>
                            <p><strong>Database:</strong> ${data.db_version}</p>
                        </div>
                        <div>
                            <h4>System</h4>
                            <p><strong>Hostname:</strong> ${data.system_info.hostname}</p>
                            <p><strong>OS:</strong> ${data.system_info.uname}</p>
                            <p><strong>CPU Cores:</strong> ${data.system_info.cores}</p>
                        </div>
                    </div>
                </div>
            `;
            setTimeout(() => {
                // Safely destroy existing chart if it exists and has destroy method
                if (window.requestTrendsChart && typeof window.requestTrendsChart.destroy === 'function') {
                    window.requestTrendsChart.destroy();
                }
                const ctx = document.getElementById('requestTrendsChart');
                if (ctx) {
                    // Ensure we have data and buckets array exists
                    const buckets = data.counters && data.counters.buckets ? data.counters.buckets : [];
                    if (buckets.length === 0) {
                        // Show placeholder when no data is available
                        ctx.getContext('2d').fillText('No request data available', 50, 50);
                        return;
                    }
                    
                    window.requestTrendsChart = new Chart(ctx, {
                        type: 'line',
                        data: {
                            labels: buckets.map(bucket => bucket.bucket),
                            datasets: [{
                                label: 'Requests',
                                data: buckets.map(bucket => bucket.request_count),
                                borderColor: '#3498db',
                                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                                borderWidth: 3,
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: { legend: { display: false } },
                            scales: { y: { beginAtZero: true, ticks: { callback: value => value.toLocaleString() } } },
                            elements: { point: { radius: 6, hoverRadius: 8 } }
                        }
                    });
                }
            }, 100);
        })
        .catch(error => {
            console.error('Error loading analytics:', error);
            content.innerHTML = `<div class="error">Failed to load analytics: ${error.message}</div>`;
        });
}

window.loadAnalytics = loadAnalytics;
