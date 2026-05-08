import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppState';
import { createPortal } from 'react-dom';

/**
 * ServiceModal Component
 * 
 * This component provides a modal interface for creating and editing services.
 * It includes all the required fields according to gui-fixed.md:
 * - connect_timeout (Connect Timeout in milliseconds)
 * - streaming (Streaming API boolean)
 * - max_request_size (Max Request Size in bytes)
 * - max_response_size (Max Response Size in bytes)
 * - provider_id (Provider selection with proper integration)
 * - workspace (Required field)
 */
const ServiceModal = ({ isOpen, onClose, service = null, onServiceCreated, onServiceUpdated }) => {
  const { api, rawApi, validatedApi } = useAppState();
  const [formData, setFormData] = useState({
    name: '',
    host: '',
    port: 80,
    path: '',
    protocol: 'http',
    workspace_id: '',
    provider_id: '',
    connect_timeout: 60000,
    streaming: false,
    websocket_enabled: false,
    request_buffer_size: null,
    max_request_size: 1048576, // 1MB default
    max_response_size: 1048576, // 1MB default
    enabled: true
  });
  
  const [workspaces, setWorkspaces] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadWorkspaces();
      loadProviders();
      
      if (service) {
        // Edit mode - populate form with existing service data
        setFormData({
          name: service.name || '',
          host: service.host || '',
          port: service.port || 80,
          path: service.path || '',
          protocol: service.protocol || 'http',
          workspace_id: service.workspace_id || service.workspace?.id || '',
          provider_id: service.provider_id || service.provider?.id || '',
          connect_timeout: service.connect_timeout || 60000,
          streaming: service.streaming || false,
          websocket_enabled: service.websocket_enabled || false,
          request_buffer_size: service.request_buffer_size || null,
          max_request_size: service.max_request_size || 1048576,
          max_response_size: service.max_response_size || 1048576,
          enabled: service.enabled !== undefined ? service.enabled : true
        });
      } else {
        // Create mode - reset form
        setFormData({
          name: '',
          host: '',
          port: 80,
          path: '',
          protocol: 'http',
          workspace_id: '',
          provider_id: '',
          connect_timeout: 60000,
          streaming: false,
          websocket_enabled: false,
          request_buffer_size: null,
          max_request_size: 1048576,
          max_response_size: 1048576,
          enabled: true
        });
      }
      setErrors({});
    }
  }, [isOpen, service]);

  const loadWorkspaces = async () => {
    try {
      const data = await validatedApi.getWorkspaces();
      setWorkspaces(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error('Failed to load workspaces:', err);
    }
  };

  const loadProviders = async () => {
    try {
      const data = await validatedApi.getProviders();
      setProviders(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error('Failed to load providers:', err);
    }
  };

  const handleProviderChange = (providerId) => {
    setFormData(prev => ({ ...prev, provider_id: providerId }));
    
    // Auto-populate host/port from provider if available
    const provider = providers.find(p => p.id === providerId);
    if (provider) {
      setFormData(prev => ({
        ...prev,
        host: provider.host || prev.host,
        port: provider.port || prev.port,
        protocol: provider.protocol || prev.protocol
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Service name is required';
    }
    
    if (!formData.host?.trim()) {
      newErrors.host = 'Host is required';
    }
    
    if (!formData.port || formData.port <= 0 || formData.port > 65535) {
      newErrors.port = 'Port must be between 1 and 65535';
    }
    
    if (!formData.workspace_id) {
      newErrors.workspace_id = 'Workspace is required';
    }
    
    if (formData.connect_timeout <= 0) {
      newErrors.connect_timeout = 'Connect timeout must be greater than 0';
    }
    
    if (formData.max_request_size <= 0) {
      newErrors.max_request_size = 'Max request size must be greater than 0';
    }
    
    if (formData.max_response_size <= 0) {
      newErrors.max_response_size = 'Max response size must be greater than 0';
    }

    if (formData.request_buffer_size !== null && formData.request_buffer_size !== undefined && formData.request_buffer_size !== '') {
      if (formData.request_buffer_size <= 0) {
        newErrors.request_buffer_size = 'Request buffer size must be greater than 0 or empty';
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const serviceData = {
        ...formData,
        port: parseInt(formData.port) || null,
        connect_timeout: parseInt(formData.connect_timeout) || null,
        max_request_size: parseInt(formData.max_request_size) || null,
        max_response_size: parseInt(formData.max_response_size) || null,
        request_buffer_size: formData.request_buffer_size ? parseInt(formData.request_buffer_size) : null,
        // Ensure empty strings become null for nullable fields
        provider_id: formData.provider_id || null,
        host: formData.host || null
      };
      
      let savedService;
      if (service) {
        // Use validated API for updates
        savedService = await validatedApi.updateService(service.id, serviceData);
      } else {
        // Use validated API for creation
        savedService = await validatedApi.createService(serviceData);
      }
      
      if (service) {
        onServiceUpdated?.(savedService);
      } else {
        onServiceCreated?.(savedService);
      }
      
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal modal-blur fade show" style={{display:'block'}} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{service ? 'Edit Service' : 'Add Service'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label required">Service Name</label>
                  <input type="text" className={`form-control${errors.name?' is-invalid':''}`} value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="Enter service name" />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label required">Workspace</label>
                  <select className={`form-select${errors.workspace_id?' is-invalid':''}`} value={formData.workspace_id} onChange={(e) => setFormData(prev => ({ ...prev, workspace_id: e.target.value }))}>
                    <option value="">Select Workspace</option>
                    {workspaces.map(ws => <option key={ws.id} value={ws.id}>{ws.name}</option>)}
                  </select>
                  {errors.workspace_id && <div className="invalid-feedback">{errors.workspace_id}</div>}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Provider</label>
                <select className="form-select" value={formData.provider_id} onChange={(e) => handleProviderChange(e.target.value)}>
                  <option value="">Select Provider (Optional)</option>
                  {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <small className="form-hint">Provider integration will auto-populate host/port</small>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label required">Host</label>
                  <input type="text" className={`form-control${errors.host?' is-invalid':''}`} value={formData.host} onChange={(e) => setFormData(prev => ({ ...prev, host: e.target.value }))} placeholder="localhost" />
                  {errors.host && <div className="invalid-feedback">{errors.host}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label required">Port</label>
                  <input type="text" className={`form-control${errors.port?' is-invalid':''}`} value={formData.port} onChange={(e) => setFormData(prev => ({ ...prev, port: parseInt(e.target.value) || 0 }))} placeholder="80" />
                  {errors.port && <div className="invalid-feedback">{errors.port}</div>}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Path</label>
                <input type="text" className="form-control" value={formData.path} onChange={(e) => setFormData(prev => ({ ...prev, path: e.target.value }))} placeholder="/api/v1" />
                <small className="form-hint">Optional path prefix for the service</small>
              </div>
              <div className="mb-3">
                <label className="form-label">Protocol</label>
                <select className="form-select" value={formData.protocol} onChange={(e) => setFormData(prev => ({ ...prev, protocol: e.target.value }))}>
                  <option value="http">HTTP</option><option value="https">HTTPS</option><option value="grpc">gRPC</option><option value="grpcs">gRPCs</option>
                </select>
              </div>
              <h3 className="mb-3 mt-4">Advanced Configuration</h3>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label required">Connect Timeout (ms)</label>
                  <input type="number" className={`form-control${errors.connect_timeout?' is-invalid':''}`} value={formData.connect_timeout} onChange={(e) => setFormData(prev => ({ ...prev, connect_timeout: parseInt(e.target.value) || 0 }))} min="1" />
                  {errors.connect_timeout && <div className="invalid-feedback">{errors.connect_timeout}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Streaming</label>
                  <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.streaming} onChange={(e) => setFormData(prev => ({ ...prev, streaming: e.target.checked }))} /><span className="form-check-label">Enable streaming responses</span></label>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">WebSocket Support</label>
                  <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.websocket_enabled} onChange={(e) => setFormData(prev => ({ ...prev, websocket_enabled: e.target.checked }))} /><span className="form-check-label">Enable WebSocket proxying</span></label>
                  <small className="form-hint">Allow bidirectional WebSocket connections</small>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Request Buffer Size (bytes)</label>
                  <input type="number" className={`form-control${errors.request_buffer_size?' is-invalid':''}`} value={formData.request_buffer_size || ''} onChange={(e) => setFormData(prev => ({ ...prev, request_buffer_size: e.target.value ? parseInt(e.target.value) : null }))} min="1" placeholder="e.g., 1048576 (1 MB)" />
                  {errors.request_buffer_size && <div className="invalid-feedback">{errors.request_buffer_size}</div>}
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label required">Max Request Size (bytes)</label>
                  <input type="number" className={`form-control${errors.max_request_size?' is-invalid':''}`} value={formData.max_request_size} onChange={(e) => setFormData(prev => ({ ...prev, max_request_size: parseInt(e.target.value) || 0 }))} min="1" />
                  {errors.max_request_size && <div className="invalid-feedback">{errors.max_request_size}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label required">Max Response Size (bytes)</label>
                  <input type="number" className={`form-control${errors.max_response_size?' is-invalid':''}`} value={formData.max_response_size} onChange={(e) => setFormData(prev => ({ ...prev, max_response_size: parseInt(e.target.value) || 0 }))} min="1" />
                  {errors.max_response_size && <div className="invalid-feedback">{errors.max_response_size}</div>}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.enabled} onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))} /><span className="form-check-label">Service enabled</span></label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn me-auto" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : (service ? 'Update Service' : 'Create Service')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ServiceModal;
