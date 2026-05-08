import React, { useState, useEffect } from 'react';
import { useAppState } from '../../context/AppState';
import { createPortal } from 'react-dom';

/**
 * RouteModal Component
 * 
 * This component provides a modal interface for creating and editing routes.
 * Routes are associated with services and define path matching and methods.
 */
const RouteModal = ({ isOpen, onClose, route = null, onRouteCreated, onRouteUpdated }) => {
  const { api, rawApi } = useAppState();
  const [formData, setFormData] = useState({
    name: '',
    service_id: '',
    paths: ['/'],
    hosts: '',
    protocols: ['http', 'https'],
    methods: ['GET'],
    resources: '',
    strip_path: true,
    preserve_host: false,
    regex_priority: 0,
    path_handling: 'v1',
    request_buffering: true,
    response_buffering: true,
    enabled: true,
    // gRPC fields
    grpc_service: '',
    grpc_method: '',
    protobuf_definition: ''
  });
  
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen) {
      loadServices();
      
      if (route) {
        // Edit mode - populate form with existing route data
        setFormData({
          name: route.name || '',
          service_id: route.service_id || route.service?.id || '',
          paths: route.paths || ['/'],
          hosts: Array.isArray(route.hosts) ? route.hosts.join(', ') : route.hosts || '',
          protocols: route.protocols || ['http', 'https'],
          methods: route.methods || ['GET'],
          resources: Array.isArray(route.resources) ? route.resources.join(', ') : route.resources || '',
          strip_path: route.strip_path !== undefined ? route.strip_path : true,
          preserve_host: route.preserve_host || false,
          regex_priority: route.regex_priority || 0,
          path_handling: route.path_handling || 'v1',
          request_buffering: route.request_buffering !== undefined ? route.request_buffering : true,
          response_buffering: route.response_buffering !== undefined ? route.response_buffering : true,
          enabled: route.enabled !== undefined ? route.enabled : true,
          grpc_service: route.grpc_service || '',
          grpc_method: route.grpc_method || '',
          protobuf_definition: route.protobuf_definition || ''
        });
      } else {
        // Create mode - reset form
        setFormData({
          name: '',
          service_id: '',
          paths: ['/'],
          hosts: '',
          protocols: ['http', 'https'],
          methods: ['GET'],
          resources: '',
          strip_path: true,
          preserve_host: false,
          regex_priority: 0,
          path_handling: 'v1',
          request_buffering: true,
          response_buffering: true,
          enabled: true,
          grpc_service: '',
          grpc_method: '',
          protobuf_definition: ''
        });
      }
      setErrors({});
    }
  }, [isOpen, route]);

  const loadServices = async () => {
    try {
      const data = await rawApi.request('/api/v1/services/');
      setServices(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error('Failed to load services:', err);
    }
  };

  const handleMethodToggle = (method) => {
    setFormData(prev => ({
      ...prev,
      methods: prev.methods.includes(method)
        ? prev.methods.filter(m => m !== method)
        : [...prev.methods, method]
    }));
  };

  const handleProtocolToggle = (protocol) => {
    setFormData(prev => ({
      ...prev,
      protocols: prev.protocols.includes(protocol)
        ? prev.protocols.filter(p => p !== protocol)
        : [...prev.protocols, protocol]
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name?.trim()) {
      newErrors.name = 'Route name is required';
    }
    
    if (!formData.service_id) {
      newErrors.service_id = 'Service is required';
    }
    
    if (!formData.paths.length || formData.paths.some(path => !path.trim())) {
      newErrors.paths = 'At least one valid path is required';
    }
    
    if (!formData.methods.length) {
      newErrors.methods = 'At least one HTTP method is required';
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
      const url = route 
        ? `/api/v1/routes/${route.id}`
        : '/api/v1/routes';
      
      const method = route ? 'PUT' : 'POST';
      
      // Prepare data for submission
      const submitData = {
        ...formData,
        regex_priority: parseInt(formData.regex_priority),
        // Convert comma-separated strings to arrays
        hosts: formData.hosts ? formData.hosts.split(',').map(h => h.trim()).filter(h => h) : undefined,
        resources: formData.resources ? formData.resources.split(',').map(r => r.trim()).filter(r => r) : undefined,
      };
      
      // Remove empty gRPC fields if not needed
      if (!submitData.grpc_service && !submitData.grpc_method && !submitData.protobuf_definition) {
        delete submitData.grpc_service;
        delete submitData.grpc_method;
        delete submitData.protobuf_definition;
      }
      
      const savedRoute = await rawApi.request(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });
      
      if (route) {
        onRouteUpdated?.(savedRoute);
      } else {
        onRouteCreated?.(savedRoute);
      }
      
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

  return createPortal(
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal modal-blur fade show" style={{display:'block'}} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{route ? 'Edit Route' : 'Add Route'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}

              <h3 className="mb-3">Basic Configuration</h3>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label required">Name</label>
                  <input type="text" className={`form-control${errors.name?' is-invalid':''}`} value={formData.name} onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="my-api-route" />
                  <small className="form-hint">A descriptive name for this route</small>
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label required">Service</label>
                  <select className={`form-select${errors.service_id?' is-invalid':''}`} value={formData.service_id} onChange={(e) => setFormData(prev => ({ ...prev, service_id: e.target.value }))}>
                    <option value="">Select a service</option>
                    {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                  {errors.service_id && <div className="invalid-feedback">{errors.service_id}</div>}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.enabled} onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))} /><span className="form-check-label">Enabled</span></label>
              </div>

              <h3 className="mb-3 mt-4">Request Matching</h3>
              <div className="mb-3">
                <label className="form-label">Paths (comma-separated)</label>
                <input type="text" className={`form-control${errors.paths?' is-invalid':''}`} value={formData.paths.join(', ')} onChange={(e) => setFormData(prev => ({ ...prev, paths: e.target.value.split(',').map(p => p.trim()).filter(p => p) }))} placeholder="/api/v1/*, /users, /health" />
                {errors.paths && <div className="invalid-feedback">{errors.paths}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label">Hosts (comma-separated)</label>
                <input type="text" className="form-control" value={formData.hosts} onChange={(e) => setFormData(prev => ({ ...prev, hosts: e.target.value }))} placeholder="api.example.com" />
              </div>
              <div className="mb-3">
                <label className="form-label">Protocols</label>
                <div className="d-flex gap-3">
                  {['http', 'https'].map(proto => (
                    <label key={proto} className="form-check"><input type="checkbox" className="form-check-input" checked={formData.protocols.includes(proto)} onChange={() => handleProtocolToggle(proto)} /><span className="form-check-label">{proto.toUpperCase()}</span></label>
                  ))}
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label required">HTTP Methods</label>
                <div className="d-flex flex-wrap gap-2">
                  {httpMethods.map(method => (
                    <label key={method} className="form-check form-check-inline"><input type="checkbox" className="form-check-input" checked={formData.methods.includes(method)} onChange={() => handleMethodToggle(method)} /><span className="form-check-label">{method}</span></label>
                  ))}
                </div>
                {errors.methods && <div className="text-danger small mt-1">{errors.methods}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label">Resources (comma-separated)</label>
                <input type="text" className="form-control" value={formData.resources} onChange={(e) => setFormData(prev => ({ ...prev, resources: e.target.value }))} placeholder="resource1, resource2" />
              </div>

              <h3 className="mb-3 mt-4">Advanced Options</h3>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.strip_path} onChange={(e) => setFormData(prev => ({ ...prev, strip_path: e.target.checked }))} /><span className="form-check-label">Strip Path</span></label>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.preserve_host} onChange={(e) => setFormData(prev => ({ ...prev, preserve_host: e.target.checked }))} /><span className="form-check-label">Preserve Host</span></label>
                </div>
              </div>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Regex Priority</label>
                  <input type="number" className="form-control" value={formData.regex_priority} onChange={(e) => setFormData(prev => ({ ...prev, regex_priority: parseInt(e.target.value) || 0 }))} min="0" max="100" />
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Path Handling</label>
                  <select className="form-select" value={formData.path_handling} onChange={(e) => setFormData(prev => ({ ...prev, path_handling: e.target.value }))}><option value="v0">v0 (Legacy)</option><option value="v1">v1 (Current)</option></select>
                </div>
              </div>
              <div className="d-flex gap-3 mb-3">
                <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.request_buffering} onChange={(e) => setFormData(prev => ({ ...prev, request_buffering: e.target.checked }))} /><span className="form-check-label">Request Buffering</span></label>
                <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.response_buffering} onChange={(e) => setFormData(prev => ({ ...prev, response_buffering: e.target.checked }))} /><span className="form-check-label">Response Buffering</span></label>
              </div>

              {(formData.grpc_service || formData.grpc_method || formData.protobuf_definition || services.find(s => s.id === formData.service_id)?.protocol === 'grpc') && (
                <>
                  <h3 className="mb-3 mt-4">gRPC Configuration</h3>
                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label">gRPC Service Name</label>
                      <input type="text" className="form-control" value={formData.grpc_service} onChange={(e) => setFormData(prev => ({ ...prev, grpc_service: e.target.value }))} placeholder="MyService" />
                    </div>
                    <div className="col-md-6 mb-3">
                      <label className="form-label">gRPC Method Name</label>
                      <input type="text" className="form-control" value={formData.grpc_method} onChange={(e) => setFormData(prev => ({ ...prev, grpc_method: e.target.value }))} placeholder="MyMethod" />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Protobuf Definition</label>
                    <textarea className="form-control" value={formData.protobuf_definition} onChange={(e) => setFormData(prev => ({ ...prev, protobuf_definition: e.target.value }))} rows="5" placeholder="syntax = 'proto3'; ..." />
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn me-auto" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : (route ? 'Update Route' : 'Create Route')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default RouteModal;
