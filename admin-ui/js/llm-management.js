/**
 * LLM Management Panel for PyGateway Admin UI
 * 
 * Provides comprehensive LLM management interface including:
 * - Provider configuration and management
 * - Template creation and editing
 * - Tool registry and security
 * - Analytics and cost monitoring
 * - Security and access control
 */

// Ensure API_BASE_URL is available
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:8001';

class LLMManagementPanel {
    constructor() {
        this.currentView = 'providers';
        this.providers = [];
        this.templates = [];
        this.tools = [];
        this.analytics = {};
        
        // Check if LLM is enabled
        this.llmEnabled = window.LLM_ENABLED || false;
        
        this.init();
    }

    init() {
        this.render();
        this.bindEvents();
        
        if (this.llmEnabled) {
            this.loadInitialData();
        }
    }

    render() {
        const container = document.getElementById('llm-container');
        if (!container) return;

        if (!this.llmEnabled) {
            container.innerHTML = `
                <div class="llm-disabled-notice">
                    <div class="alert alert-info">
                        <h4><i class="fas fa-info-circle"></i> LLM Features Disabled</h4>
                        <p>LLM functionality is currently disabled. To enable LLM features, set <code>LLM_ENABLED=true</code> in your environment configuration.</p>
                    </div>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="llm-management-panel">
                <!-- Navigation -->
                <div class="llm-nav">
                    <button class="nav-btn ${this.currentView === 'providers' ? 'active' : ''}" 
                            data-view="providers">
                        <i class="fas fa-server"></i> Providers
                    </button>
                    <button class="nav-btn ${this.currentView === 'templates' ? 'active' : ''}" 
                            data-view="templates">
                        <i class="fas fa-file-code"></i> Templates
                    </button>
                    <button class="nav-btn ${this.currentView === 'tools' ? 'active' : ''}" 
                            data-view="tools">
                        <i class="fas fa-tools"></i> Tools
                    </button>
                    <button class="nav-btn ${this.currentView === 'analytics' ? 'active' : ''}" 
                            data-view="analytics">
                        <i class="fas fa-chart-line"></i> Analytics
                    </button>
                    <button class="nav-btn ${this.currentView === 'security' ? 'active' : ''}" 
                            data-view="security">
                        <i class="fas fa-shield-alt"></i> Security
                    </button>
                    <button class="nav-btn ${this.currentView === 'billing' ? 'active' : ''}" 
                            data-view="billing">
                        <i class="fas fa-coins"></i> Billing
                    </button>
                </div>

                <!-- Content Area -->
                <div class="llm-content">
                    ${this.renderContent()}
                </div>
            </div>
        `;
    }

    renderContent() {
        switch (this.currentView) {
            case 'providers':
                return this.renderProvidersView();
            case 'templates':
                return this.renderTemplatesView();
            case 'tools':
                return this.renderToolsView();
            case 'analytics':
                return this.renderAnalyticsView();
            case 'security':
                return this.renderSecurityView();
            case 'billing':
                return this.renderBillingView();
            default:
                return '<div>Unknown view</div>';
        }
    }

    renderProvidersView() {
        return `
            <div class="providers-view">
                <div class="view-header">
                    <h2><i class="fas fa-server llm-icon"></i> LLM Providers</h2>
                    <button class="btn btn-primary" onclick="llmPanel.showAddProviderModal()">
                        <i class="fas fa-plus"></i> Add Provider
                    </button>
                </div>

                <div class="providers-grid">
                    ${this.providers.map(provider => `
                        <div class="provider-card ${provider.enabled ? 'enabled' : 'disabled'}">
                            <div class="provider-header">
                                <div class="provider-info">
                                    <h3>${provider.name}</h3>
                                    <span class="provider-type">${provider.provider_type}</span>
                                </div>
                                <div class="provider-status">
                                    <span class="status-indicator ${provider.enabled ? 'active' : 'inactive'}">
                                        ${provider.enabled ? 'Active' : 'Inactive'}
                                    </span>
                                </div>
                            </div>
                            <div class="provider-details">
                                <p><strong>Model:</strong> ${provider.default_model || 'N/A'}</p>
                                <p><strong>Rate Limit:</strong> ${provider.requests_per_minute || 'Unlimited'}/min</p>
                                <p><strong>Cost:</strong> ${provider.cost_per_input_token || '0'}/1K input tokens</p>
                            </div>
                            <div class="provider-actions">
                                <button class="btn btn-sm btn-secondary" 
                                        onclick="llmPanel.testProvider('${provider.id}')">
                                    <i class="fas fa-vial"></i> Test
                                </button>
                                <button class="btn btn-sm btn-primary" 
                                        onclick="llmPanel.editProvider('${provider.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-danger" 
                                        onclick="llmPanel.deleteProvider('${provider.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <!-- Add Provider Modal -->
                <div id="addProviderModal" class="modal" style="display: none;">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h3>Add LLM Provider</h3>
                            <span class="close" onclick="llmPanel.closeModal('addProviderModal')">&times;</span>
                        </div>
                        <div class="modal-body">
                            <form id="addProviderForm">
                                <div class="form-group">
                                    <label>Provider Name</label>
                                    <input type="text" name="name" required>
                                </div>
                                <div class="form-group">
                                    <label>Provider Type</label>
                                    <select name="provider_type" required>
                                        <option value="openai">OpenAI</option>
                                        <option value="anthropic">Anthropic</option>
                                        <option value="azure_openai">Azure OpenAI</option>
                                        <option value="ollama">Ollama</option>
                                        <option value="custom">Custom</option>
                                    </select>
                                </div>
                                <div class="form-group">
                                    <label>Description</label>
                                    <input type="text" name="description" placeholder="Brief description of provider">
                                </div>
                                <div class="form-group">
                                    <label>API Key</label>
                                    <input type="password" name="api_key" required>
                                </div>
                                <div class="form-group">
                                    <label>Base URL</label>
                                    <input type="url" name="base_url" placeholder="https://api.openai.com/v1">
                                </div>
                                <div class="form-group">
                                    <label>API Version</label>
                                    <input type="text" name="api_version" placeholder="v1">
                                </div>
                                <div class="form-group">
                                    <label>Organization ID</label>
                                    <input type="text" name="organization_id" placeholder="Optional organization ID">
                                </div>
                                <div class="form-group">
                                    <label>Default Model</label>
                                    <input type="text" name="default_model" placeholder="gpt-3.5-turbo">
                                </div>
                                
                                <!-- Rate Limiting Section -->
                                <h4 style="margin-top: 1.5rem; color: #495057;">Rate Limiting</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Requests per Minute</label>
                                        <input type="number" name="requests_per_minute" placeholder="60">
                                    </div>
                                    <div class="form-group">
                                        <label>Tokens per Minute</label>
                                        <input type="number" name="tokens_per_minute" placeholder="150000">
                                    </div>
                                </div>
                                
                                <!-- Cost Management Section -->
                                <h4 style="margin-top: 1.5rem; color: #495057;">Cost Management</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>Cost per Input Token</label>
                                        <input type="number" name="cost_per_input_token" step="0.000001" placeholder="0.0015">
                                    </div>
                                    <div class="form-group">
                                        <label>Cost per Output Token</label>
                                        <input type="number" name="cost_per_output_token" step="0.000001" placeholder="0.002">
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>Cost per Request</label>
                                    <input type="number" name="cost_per_request" step="0.01" placeholder="0.0">
                                </div>
                                
                                <!-- Security Settings Section -->
                                <h4 style="margin-top: 1.5rem; color: #495057;">Security Settings</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="content_filtering_enabled" checked>
                                            Content Filtering
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="pii_detection_enabled" checked>
                                            PII Detection
                                        </label>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="prompt_injection_protection" checked>
                                        Prompt Injection Protection
                                    </label>
                                </div>
                                
                                <!-- Monitoring Settings Section -->
                                <h4 style="margin-top: 1.5rem; color: #495057;">Monitoring</h4>
                                <div class="form-row">
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="detailed_logging" checked>
                                            Detailed Logging
                                        </label>
                                    </div>
                                    <div class="form-group">
                                        <label>
                                            <input type="checkbox" name="performance_tracking" checked>
                                            Performance Tracking
                                        </label>
                                    </div>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="token_usage_tracking" checked>
                                        Token Usage Tracking
                                    </label>
                                </div>
                                
                                <!-- Status -->
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="enabled" checked>
                                        Enabled
                                    </label>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button class="btn btn-secondary" onclick="llmPanel.closeModal('addProviderModal')">Cancel</button>
                            <button class="btn btn-primary" onclick="llmPanel.saveProvider()">Save Provider</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderTemplatesView() {
        return `
            <div class="templates-view">
                <div class="view-header">
                    <h2><i class="fas fa-file-code llm-icon"></i> Prompt Templates</h2>
                    <button class="btn btn-primary" onclick="llmPanel.showAddTemplateModal()">
                        <i class="fas fa-plus"></i> Create Template
                    </button>
                </div>

                <div class="templates-list">
                    ${this.templates.map(template => `
                        <div class="template-card">
                            <div class="template-header">
                                <h3>${template.name} <span class="version">v${template.version}</span></h3>
                                <span class="category">${template.category}</span>
                            </div>
                            <div class="template-content">
                                <p class="description">${template.description}</p>
                                <div class="template-meta">
                                    <span><i class="fas fa-cube"></i> ${template.provider_name || 'Any Provider'}</span>
                                    <span><i class="fas fa-brain"></i> ${template.model_name || 'Default Model'}</span>
                                    <span><i class="fas fa-tags"></i> ${(template.tags || []).join(', ')}</span>
                                </div>
                            </div>
                            <div class="template-actions">
                                <button class="btn btn-sm btn-success" onclick="llmPanel.testTemplate('${template.id}')">
                                    <i class="fas fa-play"></i> Test
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="llmPanel.editTemplate('${template.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-info" onclick="llmPanel.cloneTemplate('${template.id}')">
                                    <i class="fas fa-copy"></i> Clone
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="llmPanel.deleteTemplate('${template.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    renderAnalyticsView() {
        return `
            <div class="analytics-view">
                <div class="view-header">
                    <h2><i class="fas fa-chart-line llm-icon"></i> LLM Analytics</h2>
                    <div class="analytics-controls">
                        <select id="analyticsTimeRange">
                            <option value="24h">Last 24 Hours</option>
                            <option value="7d">Last 7 Days</option>
                            <option value="30d">Last 30 Days</option>
                            <option value="custom">Custom Range</option>
                        </select>
                        <button class="btn btn-primary" onclick="llmPanel.refreshAnalytics()">
                            <i class="fas fa-sync"></i> Refresh
                        </button>
                    </div>
                </div>

                <!-- Key Metrics -->
                <div class="metrics-grid">
                    <div class="metric-card">
                        <div class="metric-icon">
                            <i class="fas fa-chart-bar"></i>
                        </div>
                        <div class="metric-content">
                            <h3>Total Requests</h3>
                            <p class="metric-value">${this.analytics.totalRequests || 0}</p>
                            <span class="metric-change">+12% from last period</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">
                            <i class="fas fa-layer-group"></i>
                        </div>
                        <div class="metric-content">
                            <h3>Total Tokens</h3>
                            <p class="metric-value">${this.analytics.totalTokens || 0}</p>
                            <span class="metric-change">Tokens processed</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">
                            <i class="fas fa-coins"></i>
                        </div>
                        <div class="metric-content">
                            <h3>Total Cost</h3>
                            <p class="metric-value">$${(this.analytics.totalCost || this.analytics.billing?.current_spend || 0).toFixed(2)}</p>
                            <span class="metric-change">+8% from last period</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">
                            <i class="fas fa-tachometer-alt"></i>
                        </div>
                        <div class="metric-content">
                            <h3>Avg Latency</h3>
                            <p class="metric-value">${this.analytics.avgLatency || 0}ms</p>
                            <span class="metric-change">-5% from last period</span>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <div class="metric-content">
                            <h3>Success Rate</h3>
                            <p class="metric-value">${this.analytics.successRate || 0}%</p>
                            <span class="metric-change">+2% from last period</span>
                        </div>
                    </div>
                </div>

                <!-- Charts -->
                <div class="charts-container">
                    <div class="chart-card">
                        <h3>Usage Over Time</h3>
                        <canvas id="usageChart" width="400" height="200"></canvas>
                    </div>
                    <div class="chart-card">
                        <h3>Cost by Provider</h3>
                        <canvas id="costChart" width="400" height="200"></canvas>
                    </div>
                </div>
            </div>
        `;
    }

    renderBillingView() {
        const billingData = this.analytics.billing || {
            monthly_budget: 1000,
            current_spend: 0,
            providers: [],
            usage_over_time: [],
            cost_by_provider: []
        };

        const currentSpend = billingData.current_spend || 0;
        const monthlyBudget = billingData.monthly_budget || 1000;
        const usedPercentage = monthlyBudget > 0 ? (currentSpend / monthlyBudget * 100) : 0;
        const remaining = monthlyBudget - currentSpend;

        // Update charts
        this.updateChart('usageChart', billingData.usage_over_time);
        this.updateChart('costChart', billingData.cost_by_provider);

        return `
            <div class="billing-view">
                <div class="view-header">
                    <h2><i class="fas fa-coins llm-icon"></i> LLM Billing & Costs</h2>
                    <button class="btn btn-primary" onclick="llmPanel.generateInvoice()">
                        <i class="fas fa-file-invoice"></i> Generate Invoice
                    </button>
                </div>

                <!-- Budget Status -->
                <div class="budget-status">
                    <div class="budget-card">
                        <h3>Monthly Budget Status</h3>
                        <div class="budget-progress">
                            <div class="progress-bar">
                                <div class="progress-fill" style="width: ${Math.min(usedPercentage, 100)}%"></div>
                            </div>
                            <div class="budget-info">
                                <span>$${currentSpend.toFixed(2)} / $${monthlyBudget.toFixed(2)} used</span>
                                <span class="budget-remaining">$${remaining.toFixed(2)} remaining</span>
                            </div>
                        </div>
                        ${usedPercentage > 80 ? `
                        <div class="budget-alert alert-warning">
                            <i class="fas fa-exclamation-triangle"></i>
                            ${usedPercentage > 100 ? 'Budget exceeded!' : 'Approaching budget limit'}
                        </div>
                        ` : ''}
                    </div>
                </div>

                <!-- Cost Breakdown -->
                <div class="cost-breakdown">
                    <h3>Cost Breakdown by Provider</h3>
                    <table class="billing-table">
                        <thead>
                            <tr>
                                <th>Provider</th>
                                <th>Requests</th>
                                <th>Tokens</th>
                                <th>Cost</th>
                                <th>Avg Cost/Request</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${billingData.providers.length > 0 ? 
                                billingData.providers.map(provider => `
                                    <tr>
                                        <td>${provider.name}</td>
                                        <td>${provider.requests?.toLocaleString() || '0'}</td>
                                        <td>${provider.tokens?.toLocaleString() || '0'}</td>
                                        <td>${provider.cost?.toFixed(2) || '0.00'}</td>
                                        <td>${provider.avg_cost_per_request?.toFixed(3) || '0.000'}</td>
                                    </tr>
                                `).join('') :
                                `<tr><td colspan="5" class="no-data">No billing data available</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderSecurityView() {
        const securityData = this.analytics.security || {
            content_filtering: { active: true, filtered_today: 0 },
            pii_protection: { active: true, instances_masked: 0 },
            rate_limiting: { active: true, users_approaching_limits: 0 },
            prompt_injection: { active: true, attempts_detected: 0 },
            events: []
        };

        return `
            <div class="security-view">
                <div class="view-header">
                    <h2><i class="fas fa-shield-alt llm-icon"></i> LLM Security</h2>
                    <button class="btn btn-primary" onclick="llmPanel.runSecurityScan()">
                        <i class="fas fa-search"></i> Run Security Scan
                    </button>
                </div>

                <!-- Security Status -->
                <div class="security-status">
                    ${Object.entries(securityData).map(([key, value]) => {
                        if (key !== 'events') {
                            return `
                                <div class="status-card ${value.active ? 'success' : 'warning'}">
                                    <i class="fas fa-${key.replace('_', '-')}"></i>
                                    <h3>${key.replace('_', ' ').toUpperCase()}</h3>
                                    <p>${value.active ? 'Active' : 'Inactive'} - ${value.filtered_today || value.instances_masked || value.users_approaching_limits || value.attempts_detected || 0} events</p>
                                </div>
                            `;
                        }
                    }).join('')}
                </div>

                <!-- Security Logs -->
                <div class="security-logs">
                    <h3>Recent Security Events</h3>
                    <table class="security-table">
                        <thead>
                            <tr>
                                <th>Timestamp</th>
                                <th>Event Type</th>
                                <th>User</th>
                                <th>Severity</th>
                                <th>Action Taken</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${securityData.events.length > 0 ? 
                                securityData.events.map(event => `
                                    <tr>
                                        <td>${new Date(event.timestamp).toLocaleString()}</td>
                                        <td>${event.event_type}</td>
                                        <td>${event.user}</td>
                                        <td class="severity-${event.severity.toLowerCase()}">${event.severity}</td>
                                        <td>${event.action_taken}</td>
                                    </tr>
                                `).join('') :
                                `<tr><td colspan="5" class="no-data">No security events recorded</td></tr>`
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    renderToolsView() {
        return `
            <div class="tools-view">
                <div class="view-header">
                    <h2><i class="fas fa-tools llm-icon"></i> LLM Tools Registry</h2>
                    <button class="btn btn-primary" onclick="llmPanel.showAddToolModal()">
                        <i class="fas fa-plus"></i> Register Tool
                    </button>
                </div>

                <div class="tools-grid">
                    ${this.tools.map(tool => `
                        <div class="tool-card ${tool.enabled ? 'enabled' : 'disabled'}">
                            <div class="tool-header">
                                <h3>${tool.name}</h3>
                                <span class="risk-level risk-${tool.execution_risk}">${tool.execution_risk}</span>
                            </div>
                            <div class="tool-content">
                                <p>${tool.description}</p>
                                <div class="tool-meta">
                                    <span><i class="fas fa-layer-group"></i> ${tool.category}</span>
                                    <span><i class="fas fa-clock"></i> ${tool.timeout_seconds}s timeout</span>
                                    <span><i class="fas fa-users"></i> ${(tool.allowed_roles || []).join(', ')}</span>
                                </div>
                            </div>
                            <div class="tool-actions">
                                <button class="btn btn-sm btn-success" onclick="llmPanel.testTool('${tool.id}')">
                                    <i class="fas fa-play"></i> Test
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="llmPanel.editTool('${tool.id}')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="llmPanel.deleteTool('${tool.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    bindEvents() {
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('.nav-btn')) {
                this.switchView(e.target.dataset.view);
            }
        });

        // Form submissions
        document.addEventListener('submit', (e) => {
            if (e.target.id === 'addProviderForm') {
                e.preventDefault();
                this.saveProvider();
            }
        });
    }

    switchView(view) {
        this.currentView = view;
        this.render();
        
        // Load data for the new view
        this.loadViewData(view);
    }

    async loadViewData(view) {
        switch(view) {
            case 'providers':
                await this.loadProviders();
                break;
            case 'templates':
                await this.loadTemplates();
                break;
            case 'tools':
                await this.loadTools();
                break;
            case 'analytics':
                await this.loadAnalytics();
                break;
            case 'security':
                // Load security data if needed
                break;
        }
    }

    async loadInitialData() {
        try {
            await Promise.all([
                this.loadProviders(),
                this.loadTemplates(),
                this.loadTools(),
                this.loadAnalytics()
            ]);
        } catch (error) {
            console.error('Failed to load LLM data:', error);
            this.showError('Failed to load LLM data');
        }
    }

    async loadProviders() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/providers`);
            this.providers = await response.json();
            if (this.currentView === 'providers') {
                this.render();
            }
        } catch (error) {
            console.error('Failed to load providers:', error);
        }
    }

    async loadTemplates() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/templates`);
            this.templates = await response.json();
            if (this.currentView === 'templates') {
                this.render();
            }
        } catch (error) {
            console.error('Failed to load templates:', error);
        }
    }

    async loadTools() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/tools`);
            this.tools = await response.json();
            if (this.currentView === 'tools') {
                this.render();
            }
        } catch (error) {
            console.error('Failed to load tools:', error);
        }
    }

    async loadAnalytics() {
        try {
            const endDate = new Date();
            const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
            
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/analytics/usage?start_date=${startDate.toISOString()}&end_date=${endDate.toISOString()}`);
            this.analytics = await response.json();
            
            if (this.currentView === 'analytics') {
                this.render();
                this.renderCharts();
            }
        } catch (error) {
            console.error('Failed to load analytics:', error);
        }
    }

    showAddProviderModal() {
        document.getElementById('addProviderModal').style.display = 'block';
    }

    closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }

    async saveProvider() {
        const form = document.getElementById('addProviderForm');
        const formData = new FormData(form);
        const providerData = Object.fromEntries(formData.entries());

        // Convert checkbox values to booleans
        const checkboxFields = [
            'content_filtering_enabled', 'pii_detection_enabled', 'prompt_injection_protection',
            'detailed_logging', 'performance_tracking', 'token_usage_tracking', 'enabled'
        ];
        
        checkboxFields.forEach(field => {
            providerData[field] = formData.has(field);
        });
        
        // Convert numeric fields and handle empty strings
        ['requests_per_minute', 'tokens_per_minute'].forEach(field => {
            if (providerData[field] && providerData[field].trim() !== '') {
                providerData[field] = parseInt(providerData[field]);
            } else {
                delete providerData[field];  // Remove empty strings to avoid 422 errors
            }
        });
        
        ['cost_per_input_token', 'cost_per_output_token', 'cost_per_request'].forEach(field => {
            if (providerData[field] && providerData[field].trim() !== '') {
                providerData[field] = parseFloat(providerData[field]);
            } else {
                delete providerData[field];  // Remove empty strings to avoid 422 errors
            }
        });

        // Remove empty string fields that should be null
        ['description', 'api_key', 'api_version', 'organization_id', 'default_model'].forEach(field => {
            if (providerData[field] === '') {
                delete providerData[field];  // Don't send empty strings
            }
        });

        console.log('Sending provider creation data:', providerData);  // Debug log

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/providers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(providerData)
            });

            if (response.ok) {
                this.closeModal('addProviderModal');
                this.loadProviders();
                this.showSuccess('Provider created successfully');
            } else {
                const error = await response.json();
                console.error('Provider creation error:', error);
                this.showError('Failed to create provider: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to save provider:', error);
            this.showError('Failed to save provider: ' + error.message);
        }
    }

    async testProvider(providerId) {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/providers/${providerId}/health`);
            const result = await response.json();
            
            if (result.status === 'healthy') {
                this.showSuccess('Provider test successful');
            } else {
                this.showError(`Provider test failed: ${result.message}`);
            }
        } catch (error) {
            console.error('Provider test failed:', error);
            this.showError('Provider test failed');
        }
    }

    async editProvider(providerId) {
        try {
            // Get provider data
            const provider = this.providers.find(p => p.id === providerId);
            if (!provider) {
                this.showError('Provider not found');
                return;
            }

            // Show edit modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Edit LLM Provider</h3>
                        <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                    </div>
                    <div class="modal-body">
                        <form id="editProviderForm">
                            <input type="hidden" name="id" value="${provider.id}">
                            <div class="form-group">
                                <label>Provider Name</label>
                                <input type="text" name="name" value="${provider.name}" required>
                            </div>
                            <div class="form-group">
                                <label>Provider Type</label>
                                <select name="provider_type" required>
                                    <option value="openai" ${provider.provider_type === 'openai' ? 'selected' : ''}>OpenAI</option>
                                    <option value="anthropic" ${provider.provider_type === 'anthropic' ? 'selected' : ''}>Anthropic</option>
                                    <option value="azure_openai" ${provider.provider_type === 'azure_openai' ? 'selected' : ''}>Azure OpenAI</option>
                                    <option value="ollama" ${provider.provider_type === 'ollama' ? 'selected' : ''}>Ollama</option>
                                    <option value="custom" ${provider.provider_type === 'custom' ? 'selected' : ''}>Custom</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Description</label>
                                <input type="text" name="description" value="${provider.description || ''}" placeholder="Brief description of provider">
                            </div>
                            <div class="form-group">
                                <label>API Key</label>
                                <input type="password" name="api_key" value="${provider.api_key || ''}" placeholder="Leave blank to keep current">
                            </div>
                            <div class="form-group">
                                <label>Base URL</label>
                                <input type="url" name="base_url" value="${provider.base_url || ''}" placeholder="https://api.openai.com/v1">
                            </div>
                            <div class="form-group">
                                <label>API Version</label>
                                <input type="text" name="api_version" value="${provider.api_version || ''}" placeholder="v1">
                            </div>
                            <div class="form-group">
                                <label>Organization ID</label>
                                <input type="text" name="organization_id" value="${provider.organization_id || ''}" placeholder="Optional organization ID">
                            </div>
                            <div class="form-group">
                                <label>Default Model</label>
                                <input type="text" name="default_model" value="${provider.default_model || ''}" placeholder="gpt-3.5-turbo">
                            </div>
                            
                            <!-- Rate Limiting Section -->
                            <h4 style="margin-top: 1.5rem; color: #495057;">Rate Limiting</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Requests per Minute</label>
                                    <input type="number" name="requests_per_minute" value="${provider.requests_per_minute || ''}" placeholder="60">
                                </div>
                                <div class="form-group">
                                    <label>Tokens per Minute</label>
                                    <input type="number" name="tokens_per_minute" value="${provider.tokens_per_minute || ''}" placeholder="150000">
                                </div>
                            </div>
                            
                            <!-- Cost Management Section -->
                            <h4 style="margin-top: 1.5rem; color: #495057;">Cost Management</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Cost per Input Token</label>
                                    <input type="number" name="cost_per_input_token" step="0.000001" value="${provider.cost_per_input_token || ''}" placeholder="0.0015">
                                </div>
                                <div class="form-group">
                                    <label>Cost per Output Token</label>
                                    <input type="number" name="cost_per_output_token" step="0.000001" value="${provider.cost_per_output_token || ''}" placeholder="0.002">
                                </div>
                            </div>
                            <div class="form-group">
                                <label>Cost per Request</label>
                                <input type="number" name="cost_per_request" step="0.01" value="${provider.cost_per_request || ''}" placeholder="0.0">
                            </div>
                            
                            <!-- Security Settings Section -->
                            <h4 style="margin-top: 1.5rem; color: #495057;">Security Settings</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="content_filtering_enabled" ${provider.content_filtering_enabled ? 'checked' : ''}>
                                        Content Filtering
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="pii_detection_enabled" ${provider.pii_detection_enabled ? 'checked' : ''}>
                                        PII Detection
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="prompt_injection_protection" ${provider.prompt_injection_protection ? 'checked' : ''}>
                                    Prompt Injection Protection
                                </label>
                            </div>
                            
                            <!-- Monitoring Settings Section -->
                            <h4 style="margin-top: 1.5rem; color: #495057;">Monitoring</h4>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="detailed_logging" ${provider.detailed_logging ? 'checked' : ''}>
                                        Detailed Logging
                                    </label>
                                </div>
                                <div class="form-group">
                                    <label>
                                        <input type="checkbox" name="performance_tracking" ${provider.performance_tracking ? 'checked' : ''}>
                                        Performance Tracking
                                    </label>
                                </div>
                            </div>
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="token_usage_tracking" ${provider.token_usage_tracking ? 'checked' : ''}>
                                    Token Usage Tracking
                                </label>
                            </div>
                            
                            <!-- Status -->
                            <div class="form-group">
                                <label>
                                    <input type="checkbox" name="enabled" ${provider.enabled ? 'checked' : ''}>
                                    Enabled
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                        <button class="btn btn-primary" onclick="llmPanel.updateProvider()">Update Provider</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.style.display = 'block';
        } catch (error) {
            console.error('Failed to edit provider:', error);
            this.showError('Failed to edit provider');
        }
    }

    async deleteProvider(providerId) {
        if (!confirm('Are you sure you want to delete this provider? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/providers/${providerId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showSuccess('Provider deleted successfully');
                this.loadProviders();
            } else {
                const error = await response.json();
                this.showError(error.detail || 'Failed to delete provider');
            }
        } catch (error) {
            console.error('Failed to delete provider:', error);
            this.showError('Failed to delete provider');
        }
    }

    async updateProvider() {
        try {
            const form = document.getElementById('editProviderForm');
            const formData = new FormData(form);
            const providerData = Object.fromEntries(formData.entries());
            
            // Convert checkbox values to booleans
            const checkboxFields = [
                'content_filtering_enabled', 'pii_detection_enabled', 'prompt_injection_protection',
                'detailed_logging', 'performance_tracking', 'token_usage_tracking', 'enabled'
            ];
            
            checkboxFields.forEach(field => {
                providerData[field] = formData.has(field);
            });
            
            // Convert numeric fields and handle empty strings
            ['requests_per_minute', 'tokens_per_minute'].forEach(field => {
                if (providerData[field] && providerData[field].trim() !== '') {
                    providerData[field] = parseInt(providerData[field]);
                } else {
                    delete providerData[field];  // Remove empty strings to avoid 422 errors
                }
            });
            
            ['cost_per_input_token', 'cost_per_output_token', 'cost_per_request'].forEach(field => {
                if (providerData[field] && providerData[field].trim() !== '') {
                    providerData[field] = parseFloat(providerData[field]);
                } else {
                    delete providerData[field];  // Remove empty strings to avoid 422 errors
                }
            });

            // Remove empty string fields that should be null
            ['description', 'api_key', 'api_version', 'organization_id', 'default_model'].forEach(field => {
                if (providerData[field] === '') {
                    delete providerData[field];  // Let backend keep existing value
                }
            });

            const providerId = providerData.id;
            delete providerData.id;

            console.log('Sending provider update data:', providerData);  // Debug log

            const response = await fetch(`${API_BASE_URL}/api/v1/llm/providers/${providerId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(providerData)
            });

            if (response.ok) {
                this.showSuccess('Provider updated successfully');
                document.querySelector('.modal').remove();
                this.loadProviders();
            } else {
                const error = await response.json();
                console.error('Provider update error:', error);
                this.showError('Failed to update provider: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Failed to update provider:', error);
            this.showError('Failed to update provider: ' + error.message);
        }
    }

    async runSecurityScan() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/security/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showSuccess(`Security scan completed. Issues found: ${result.issues_found}`);
                // Refresh the security view if we're on it
                if (this.currentView === 'security') {
                    this.render();
                }
            } else {
                this.showError(`Security scan failed: ${result.detail || result.message}`);
            }
        } catch (error) {
            console.error('Security scan failed:', error);
            this.showError('Security scan failed');
        }
    }

    async generateInvoice() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/analytics/generate-invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });
            
            const result = await response.json();
            
            if (response.ok) {
                this.showSuccess('Invoice generated successfully');
                // If there's a download URL, open it
                if (result.download_url) {
                    window.open(result.download_url, '_blank');
                }
            } else {
                this.showError(`Invoice generation failed: ${result.detail || result.message}`);
            }
        } catch (error) {
            console.error('Invoice generation failed:', error);
            this.showError('Invoice generation failed');
        }
    }

    showSuccess(message) {
        // Implement success notification
        console.log('Success:', message);
    }

    showError(message) {
        // Implement error notification
        console.error('Error:', message);
    }

    showAddTemplateModal() {
        // Show modal for adding new template
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add LLM Template</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="addTemplateForm">
                        <div class="form-group">
                            <label for="templateName">Template Name:</label>
                            <input type="text" id="templateName" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="templateCategory">Category:</label>
                            <select id="templateCategory" name="category">
                                <option value="general">General</option>
                                <option value="code">Code Generation</option>
                                <option value="analysis">Analysis</option>
                                <option value="translation">Translation</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="templateContent">Template Content:</label>
                            <textarea id="templateContent" name="template" rows="10" required 
                                placeholder="Enter your template with variables like {{variable_name}}"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="templateDescription">Description:</label>
                            <textarea id="templateDescription" name="description" rows="3"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="llmPanel.saveTemplate()">Save Template</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    showAddToolModal() {
        // Show modal for adding new tool
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Add LLM Tool</h2>
                    <span class="close" onclick="this.closest('.modal').remove()">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="addToolForm">
                        <div class="form-group">
                            <label for="toolName">Tool Name:</label>
                            <input type="text" id="toolName" name="name" required>
                        </div>
                        <div class="form-group">
                            <label for="toolCategory">Category:</label>
                            <select id="toolCategory" name="category">
                                <option value="utility">Utility</option>
                                <option value="data">Data Processing</option>
                                <option value="api">API Integration</option>
                                <option value="analysis">Analysis</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="toolEndpoint">Endpoint URL:</label>
                            <input type="url" id="toolEndpoint" name="endpoint" required>
                        </div>
                        <div class="form-group">
                            <label for="toolMethod">HTTP Method:</label>
                            <select id="toolMethod" name="method">
                                <option value="GET">GET</option>
                                <option value="POST">POST</option>
                                <option value="PUT">PUT</option>
                                <option value="DELETE">DELETE</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="toolDescription">Description:</label>
                            <textarea id="toolDescription" name="description" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="toolSchema">Input Schema (JSON):</label>
                            <textarea id="toolSchema" name="input_schema" rows="5" 
                                placeholder='{"type": "object", "properties": {...}}'></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="this.closest('.modal').remove()">Cancel</button>
                    <button class="btn btn-primary" onclick="llmPanel.saveTool()">Save Tool</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.style.display = 'block';
    }

    async saveTemplate() {
        try {
            const form = document.getElementById('addTemplateForm');
            const formData = new FormData(form);
            const templateData = Object.fromEntries(formData.entries());

            const response = await fetch(`${API_BASE_URL}/api/v1/llm/templates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(templateData)
            });

            if (response.ok) {
                this.showSuccess('Template saved successfully');
                document.querySelector('.modal').remove();
                this.loadTemplates();
            } else {
                const error = await response.json();
                this.showError('Failed to save template: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving template:', error);
            this.showError('Failed to save template: ' + error.message);
        }
    }

    async saveTool() {
        try {
            const form = document.getElementById('addToolForm');
            const formData = new FormData(form);
            const toolData = Object.fromEntries(formData.entries());

            // Parse JSON schema if provided
            if (toolData.input_schema) {
                try {
                    toolData.input_schema = JSON.parse(toolData.input_schema);
                } catch (e) {
                    this.showError('Invalid JSON schema format');
                    return;
                }
            }

            const response = await fetch(`${API_BASE_URL}/api/v1/llm/tools`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(toolData)
            });

            if (response.ok) {
                this.showSuccess('Tool saved successfully');
                document.querySelector('.modal').remove();
                this.loadTools();
            } else {
                const error = await response.json();
                this.showError('Failed to save tool: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving tool:', error);
            this.showError('Failed to save tool: ' + error.message);
        }
    }

    refreshAnalytics() {
        // Refresh analytics data
        this.loadAnalytics();
        this.showSuccess('Analytics refreshed');
    }

    renderCharts() {
        // Implement chart rendering using Chart.js or similar
        // This would render the usage and cost charts
    }

    // Template Management Functions
    async editTemplate(templateId) {
        try {
            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                this.showError('Template not found');
                return;
            }

            // Show edit modal with template data
            this.showTemplateModal(template);
        } catch (error) {
            console.error('Error editing template:', error);
            this.showError('Failed to edit template: ' + error.message);
        }
    }

    async cloneTemplate(templateId) {
        try {
            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                this.showError('Template not found');
                return;
            }

            // Create a copy with modified name
            const clonedTemplate = { 
                ...template, 
                id: undefined,
                name: template.name + ' (Copy)',
                created_at: undefined,
                updated_at: undefined
            };

            const response = await fetch(`${API_BASE_URL}/api/v1/llm/templates`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(clonedTemplate)
            });

            if (response.ok) {
                this.showSuccess('Template cloned successfully');
                this.loadTemplates();
            } else {
                const error = await response.json();
                this.showError('Failed to clone template: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error cloning template:', error);
            this.showError('Failed to clone template: ' + error.message);
        }
    }

    async deleteTemplate(templateId) {
        if (!confirm('Are you sure you want to delete this template?')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/templates/${templateId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showSuccess('Template deleted successfully');
                this.loadTemplates();
            } else {
                const error = await response.json();
                this.showError('Failed to delete template: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error deleting template:', error);
            this.showError('Failed to delete template: ' + error.message);
        }
    }

    async testTemplate(templateId) {
        try {
            const template = this.templates.find(t => t.id === templateId);
            if (!template) {
                this.showError('Template not found');
                return;
            }

            // Show test modal
            const modal = document.createElement('div');
            modal.className = 'modal template-test-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Test Template: ${template.name}</h2>
                        <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="test-form">
                            <div class="form-group">
                                <label>Test Input:</label>
                                <textarea id="testInput" class="form-control" rows="4" 
                                    placeholder="Enter test input for the template..."></textarea>
                            </div>
                            <div class="form-group">
                                <button class="btn btn-primary" onclick="llmPanel.runTemplateTest('${templateId}')">
                                    <i class="fas fa-play"></i> Run Test
                                </button>
                            </div>
                        </div>
                        <div id="testResults" class="test-results" style="display: none;">
                            <h3>Test Results:</h3>
                            <div class="results-content"></div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        } catch (error) {
            console.error('Error testing template:', error);
            this.showError('Failed to test template: ' + error.message);
        }
    }

    async runTemplateTest(templateId) {
        const testInput = document.getElementById('testInput').value;
        if (!testInput.trim()) {
            this.showError('Please enter test input');
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/templates/${templateId}/test`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ input: testInput })
            });

            const resultsDiv = document.getElementById('testResults');
            const resultsContent = resultsDiv.querySelector('.results-content');
            
            if (response.ok) {
                const result = await response.json();
                resultsContent.innerHTML = `
                    <div class="test-success">
                        <h4>Response:</h4>
                        <pre>${JSON.stringify(result, null, 2)}</pre>
                    </div>
                `;
                resultsDiv.style.display = 'block';
            } else {
                const error = await response.json();
                resultsContent.innerHTML = `
                    <div class="test-error">
                        <h4>Error:</h4>
                        <pre>${JSON.stringify(error, null, 2)}</pre>
                    </div>
                `;
                resultsDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Error running template test:', error);
            this.showError('Failed to run template test: ' + error.message);
        }
    }

    // Billing Functions
    async generateInvoice() {
        try {
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/billing/invoice`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `llm-invoice-${new Date().toISOString().split('T')[0]}.pdf`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(url);
                this.showSuccess('Invoice generated and downloaded');
            } else {
                const error = await response.json();
                this.showError('Failed to generate invoice: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error generating invoice:', error);
            this.showError('Failed to generate invoice: ' + error.message);
        }
    }

    // Security Functions
    async runSecurityScan() {
        try {
            this.showSuccess('Running security scan...');
            
            const response = await fetch(`${API_BASE_URL}/api/v1/llm/security/scan`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const result = await response.json();
                this.showSuccess('Security scan completed');
                
                // Show scan results modal
                const modal = document.createElement('div');
                modal.className = 'modal security-scan-modal';
                modal.innerHTML = `
                    <div class="modal-content">
                        <div class="modal-header">
                            <h2>Security Scan Results</h2>
                            <button class="close-btn" onclick="this.closest('.modal').remove()">&times;</button>
                        </div>
                        <div class="modal-body">
                            <div class="scan-results">
                                <div class="scan-summary">
                                    <h3>Scan Summary</h3>
                                    <p>Scanned ${result.providers_scanned || 0} providers</p>
                                    <p>Found ${result.issues_found || 0} security issues</p>
                                </div>
                                <div class="scan-details">
                                    <h3>Details</h3>
                                    <pre>${JSON.stringify(result, null, 2)}</pre>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
                document.body.appendChild(modal);
                
                // Refresh analytics to show updated security data
                this.loadAnalytics();
            } else {
                const error = await response.json();
                this.showError('Failed to run security scan: ' + (error.detail || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error running security scan:', error);
            this.showError('Failed to run security scan: ' + error.message);
        }
    }

    updateChart(chartId, data) {
        const ctx = document.getElementById(chartId)?.getContext('2d');
        if (!ctx) return;

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.map(item => item.label || 'Unknown'),
                datasets: [{
                    label: chartId === 'usageChart' ? 'Usage Over Time' : 'Cost by Provider',
                    data: data.map(item => item.value || 0),
                    backgroundColor: 'rgba(75, 192, 192, 0.2)',
                    borderColor: 'rgba(75, 192, 192, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        });
    }
}

// Initialize LLM Management Panel
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('llm-container')) {
        window.llmPanel = new LLMManagementPanel();
    }
});
