import React, { useState, useEffect, useCallback } from 'react';
import { useAppState } from '../../context/AppState';
import DynamicPluginConfig from './DynamicPluginConfig';
import { createPortal } from 'react-dom';

/**
 * PluginModal Component
 * 
 * This component provides a modal interface for creating and editing plugins.
 * Plugins can be attached to services, routes, or be global.
 */
const PluginModal = ({ isOpen, onClose, plugin = null, onPluginCreated, onPluginUpdated }) => {
  const { state, api, rawApi } = useAppState();
  const [formData, setFormData] = useState({
    name: '',
    service_id: '',
    route_id: '',
    consumer_id: '',
    enabled: true,
    config: {},
    tags: []
  });
  
  const [selectedPluginType, setSelectedPluginType] = useState('');
  const [configFields, setConfigFields] = useState({});
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [pluginSchema, setPluginSchema] = useState(null);
  // Full lists for dropdowns (independent of paginated state)
  const [allServices, setAllServices] = useState([]);
  const [allRoutes, setAllRoutes] = useState([]);
  const [allConsumers, setAllConsumers] = useState([]);

  // Load all services, routes, consumers for dropdowns
  const loadDropdownData = useCallback(async () => {
    try {
      const [servicesData, routesData, consumersData] = await Promise.all([
        rawApi.request('/api/v1/services?limit=1000').catch(() => ({ items: [] })),
        rawApi.request('/api/v1/routes?limit=1000').catch(() => ({ items: [] })),
        rawApi.request('/api/v1/consumers?limit=1000').catch(() => ({ items: [] }))
      ]);
      setAllServices(servicesData?.items || []);
      setAllRoutes(routesData?.items || []);
      setAllConsumers(consumersData?.items || []);
    } catch (error) {
      console.error('Failed to load dropdown data:', error);
    }
  }, [rawApi]);

  useEffect(() => {
    if (isOpen) {
      // Load all services/routes/consumers for dropdowns
      loadDropdownData();
      
      // Load available plugins if not already loaded
      if (!state.pluginSchemas?.available) {
        api.loadAvailablePlugins();
      }
      
      if (plugin) {
        // Edit mode - populate form with existing plugin data
        setFormData({
          name: plugin.name || '',
          service_id: plugin.service_id || '',
          route_id: plugin.route_id || '',
          consumer_id: plugin.consumer_id || '',
          enabled: plugin.enabled !== undefined ? plugin.enabled : true,
          config: plugin.config || {},
          tags: plugin.tags || []
        });
        setSelectedPluginType(plugin.name || '');
        setConfigFields(plugin.config || {});
        
        // Load schema for the plugin type
        if (plugin.name) {
          loadPluginSchema(plugin.name);
        }
      } else {
        // Create mode - reset form
        setFormData({
          name: '',
          service_id: '',
          route_id: '',
          consumer_id: '',
          enabled: true,
          config: {},
          tags: []
        });
        setSelectedPluginType('');
        setConfigFields({});
        setPluginSchema(null);
      }
      setErrors({});
    }
  }, [isOpen, plugin]);

  const loadPluginSchema = async (pluginName) => {
    try {
      const schema = await api.loadPluginSchema(pluginName);
      setPluginSchema(schema);
    } catch (error) {
      console.error('Failed to load plugin schema:', error);
      setPluginSchema(null);
    }
  };

  const handlePluginTypeChange = async (e) => {
    const pluginType = e.target.value;
    setSelectedPluginType(pluginType);
    setFormData(prev => ({ ...prev, name: pluginType }));
    setConfigFields({});
    
    if (pluginType) {
      await loadPluginSchema(pluginType);
    } else {
      setPluginSchema(null);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    const finalValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleConfigChange = (newConfig) => {
    console.log('🔍 PluginModal - Config change:', newConfig);
    setConfigFields(newConfig);
    setFormData(prev => ({ ...prev, config: newConfig }));
  };

  const renderDynamicConfigFields = () => {
    if (!pluginSchema) {
      return (
        <div className="plugin-config-loading">
          <p>Loading plugin configuration schema...</p>
        </div>
      );
    }

    return (
      <DynamicPluginConfig
        schema={pluginSchema}
        config={configFields}
        onChange={handleConfigChange}
        errors={errors}
      />
    );
  };

  const validateForm = () => {
    console.log('🔍 PluginModal - Validating form:', formData);
    const newErrors = {};
    
    if (!selectedPluginType) {
      newErrors.name = 'Plugin type is required';
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
      const pluginData = {
        ...formData,
        name: selectedPluginType
      };

      // Remove empty associations
      if (!pluginData.service_id) delete pluginData.service_id;
      if (!pluginData.route_id) delete pluginData.route_id;
      if (!pluginData.consumer_id) delete pluginData.consumer_id;
      
      let result;
      if (plugin) {
        result = await api.updatePlugin(plugin.id, pluginData);
        onPluginUpdated && onPluginUpdated(result);
      } else {
        result = await api.createPlugin(pluginData);
        onPluginCreated && onPluginCreated(result);
      }
      
      onClose();
    } catch (err) {
      setErrors({ submit: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const availablePlugins = state.pluginSchemas?.available || [];

  return createPortal(
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal modal-blur fade show" style={{display:'block'}} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{plugin ? 'Edit Plugin' : 'Create New Plugin'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}
              <div className="mb-3">
                <label className="form-label required">Plugin Type</label>
                <select className={`form-select${errors.name?' is-invalid':''}`} value={selectedPluginType} onChange={handlePluginTypeChange}>
                  <option value="">Select Plugin Type</option>
                  {availablePlugins.map(p => { const n = typeof p === 'string' ? p : p.name; const d = typeof p === 'object' ? p.description : ''; return <option key={n} value={n}>{n}{d ? ` - ${d}` : ''}</option>; })}
                </select>
                {errors.name && <div className="invalid-feedback">{errors.name}</div>}
              </div>
              <h3 className="mb-3">Plugin Scope</h3>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Service (Optional)</label>
                  <select className="form-select" value={formData.service_id} onChange={(e) => setFormData(prev => ({ ...prev, service_id: e.target.value }))}>
                    <option value="">Global (All Services)</option>
                    {allServices.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Route (Optional)</label>
                  <select className="form-select" value={formData.route_id} onChange={(e) => setFormData(prev => ({ ...prev, route_id: e.target.value }))}>
                    <option value="">All Routes</option>
                    {allRoutes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="mb-3">
                <label className="form-label">Consumer (Optional)</label>
                <select className="form-select" value={formData.consumer_id} onChange={(e) => setFormData(prev => ({ ...prev, consumer_id: e.target.value }))}>
                  <option value="">All Consumers</option>
                  {allConsumers.map(c => <option key={c.id} value={c.id}>{c.username || c.custom_id || c.id}</option>)}
                </select>
              </div>
              {pluginSchema && selectedPluginType && (
                <>
                  <h3 className="mb-3 mt-4">Plugin Configuration</h3>
                  <div className="card card-body bg-light mb-3">{renderDynamicConfigFields()}</div>
                </>
              )}
              <div className="mb-3">
                <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.enabled} onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))} /><span className="form-check-label">Plugin Enabled</span></label>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn me-auto" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : (plugin ? 'Update Plugin' : 'Create Plugin')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default PluginModal;
