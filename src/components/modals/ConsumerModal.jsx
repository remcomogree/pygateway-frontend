import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';

/**
 * ConsumerModal Component
 * 
 * Comprehensive consumer management including API key generation and management
 * Based on Kong/PyGateway consumer authentication patterns
 */
const ConsumerModal = ({ isOpen, onClose, consumer = null, onConsumerCreated, onConsumerUpdated }) => {
  const { api, rawApi } = useAppState();
  const toast = useToast();
  const [formData, setFormData] = useState({
    username: '',
    custom_id: '',
    tags: []
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [tagInput, setTagInput] = useState('');
  
  // Key management state
  const [consumerKeys, setConsumerKeys] = useState([]);
  const [keyLoading, setKeyLoading] = useState(false);
  const [showKeyForm, setShowKeyForm] = useState(false);
  const [newKeyData, setNewKeyData] = useState({
    key: '',
    ttl: null
  });
  
  // Basic Auth credentials state
  const [basicAuthCredentials, setBasicAuthCredentials] = useState([]);
  const [showBasicAuthForm, setShowBasicAuthForm] = useState(false);
  const [newBasicAuthData, setNewBasicAuthData] = useState({
    username: '',
    password: ''
  });

  useEffect(() => {
    if (isOpen) {
      if (consumer) {
        // Edit mode - populate form with existing consumer data
        setFormData({
          username: consumer.username || '',
          custom_id: consumer.custom_id || '',
          tags: consumer.tags || []
        });
        // Load consumer credentials
        loadConsumerCredentials(consumer.id);
      } else {
        // Create mode - reset form
        setFormData({
          username: '',
          custom_id: '',
          tags: []
        });
        setConsumerKeys([]);
        setBasicAuthCredentials([]);
      }
      setErrors({});
      setTagInput('');
      setShowKeyForm(false);
      setShowBasicAuthForm(false);
    }
  }, [isOpen, consumer]);

  // Load consumer credentials (API keys and basic auth) - exact implementation from admin-ui
  const loadConsumerCredentials = async (consumerId) => {
    if (!consumerId) return;
    
    setKeyLoading(true);
    try {
      console.log('🔑 Loading consumer keys for:', consumerId);
      
      // First, get the list of keys - exact same API call as admin-ui
      const keysResponse = await rawApi.request(`/api/v1/consumers/${consumerId}/keys`);
      console.log('🔑 Keys response:', keysResponse);
      
      const secrets = keysResponse.secrets || [];
      if (secrets.length === 0) {
        setConsumerKeys([]);
      } else {
        // For each key, fetch the actual value - exact same as admin-ui
        const secretsWithValues = await Promise.all(
          secrets.map(async (secret) => {
            try {
              const valueResponse = await rawApi.request(`/api/v1/consumers/${consumerId}/keys/${secret.name}`);
              return {
                ...secret,
                value: valueResponse.value,
                masked: true // Initially show masked
              };
            } catch (error) {
              console.error('Failed to fetch key value for:', secret.name, error);
              return {
                ...secret,
                value: 'Error loading key',
                masked: true
              };
            }
          })
        );
        
        console.log('🔑 Secrets with values:', secretsWithValues);
        setConsumerKeys(secretsWithValues);
      }
      
      // Also try to load basic auth credentials
      try {
        const basicAuthResponse = await rawApi.request(`/api/v1/consumers/${consumerId}/basic-auth`);
        setBasicAuthCredentials(Array.isArray(basicAuthResponse) ? basicAuthResponse : (basicAuthResponse.data || []));
      } catch (error) {
        console.log('No basic auth found for consumer');
        setBasicAuthCredentials([]);
      }
      
    } catch (error) {
      console.error('Error loading consumer credentials:', error);
      setErrors({ keyLoading: `Failed to load credentials: ${error.message}` });
    } finally {
      setKeyLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear field error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({ 
        ...prev, 
        tags: [...prev.tags, tagInput.trim()] 
      }));
      setTagInput('');
    }
  };

  const removeTag = (index) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index)
    }));
  };

  // API Key Management
  const generateApiKey = () => {
    // Generate a random API key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewKeyData(prev => ({ ...prev, key: result }));
  };

  const createApiKey = async () => {
    if (!consumer || !consumer.id) return;
    
    setKeyLoading(true);
    try {
      // Exact same API call as admin-ui createConsumerKey function
      const response = await rawApi.request(`/api/v1/consumers/${consumer.id}/keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('🔑 Create key response:', response);
      
      // Reload credentials to show the new key
      await loadConsumerCredentials(consumer.id);
      setShowKeyForm(false);
      setNewKeyData({ key: '', ttl: null });
    } catch (error) {
      setErrors({ keyCreation: `Failed to create API key: ${error.message}` });
    } finally {
      setKeyLoading(false);
    }
  };

  const deleteApiKey = async (keyName) => {
    if (!window.confirm('Are you sure you want to delete and purge this key? This cannot be undone.')) {
      return;
    }
    
    setKeyLoading(true);
    try {
      // Exact same API call as admin-ui deleteConsumerKey function
      await rawApi.request(`/api/v1/consumers/${consumer.id}/keys/${keyName}`, {
        method: 'DELETE'
      });
      
      console.log('🔑 Key deleted:', keyName);
      
      // Reload credentials
      await loadConsumerCredentials(consumer.id);
    } catch (error) {
      setErrors({ keyDeletion: `Failed to delete API key: ${error.message}` });
    } finally {
      setKeyLoading(false);
    }
  };

  // Key visibility toggle - exact same as admin-ui
  const toggleKeyVisibility = (keyIndex) => {
    console.log('🔄 Toggling key visibility for index:', keyIndex);
    setConsumerKeys(prevKeys => {
      const newKeys = prevKeys.map((key, index) => 
        index === keyIndex 
          ? { ...key, masked: !key.masked }
          : key
      );
      console.log('🔄 Updated keys:', newKeys);
      return newKeys;
    });
  };

  // Copy to clipboard - exact same as admin-ui
  const copyToClipboard = async (text, event) => {
    console.log('📋 Copying to clipboard:', text);
    try {
      await navigator.clipboard.writeText(text);
      
      // Create temporary feedback
      const copyBtn = event.target;
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓';
      copyBtn.style.backgroundColor = '#28a745';
      
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.backgroundColor = '';
      }, 2000);
      
    } catch (err) {
      console.error('Failed to copy: ', err);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Basic Auth Management
  const createBasicAuth = async () => {
    if (!consumer || !consumer.id) return;
    
    setKeyLoading(true);
    try {
      const authData = {
        username: newBasicAuthData.username,
        password: newBasicAuthData.password
      };
      
      await rawApi.request(`/api/v1/consumers/${consumer.id}/basic-auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(authData)
      });
      
      // Reload credentials
      await loadConsumerCredentials(consumer.id);
      setShowBasicAuthForm(false);
      setNewBasicAuthData({ username: '', password: '' });
    } catch (error) {
      setErrors({ basicAuthCreation: `Failed to create basic auth: ${error.message}` });
    } finally {
      setKeyLoading(false);
    }
  };

  const deleteBasicAuth = async (authId) => {
    if (!window.confirm('Are you sure you want to delete these basic auth credentials? This action cannot be undone.')) {
      return;
    }
    
    setKeyLoading(true);
    try {
      await rawApi.request(`/api/v1/consumers/${consumer.id}/basic-auth/${authId}`, {
        method: 'DELETE'
      });
      
      // Reload credentials
      await loadConsumerCredentials(consumer.id);
    } catch (error) {
      setErrors({ basicAuthDeletion: `Failed to delete basic auth: ${error.message}` });
    } finally {
      setKeyLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.username && !formData.custom_id) {
      newErrors.username = 'Either username or custom_id is required';
      newErrors.custom_id = 'Either username or custom_id is required';
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
      const consumerData = {
        username: formData.username || undefined,
        custom_id: formData.custom_id || undefined,
        tags: formData.tags.length > 0 ? formData.tags : undefined
      };

      // Remove undefined fields
      Object.keys(consumerData).forEach(key => {
        if (consumerData[key] === undefined) {
          delete consumerData[key];
        }
      });

      let result;
      if (consumer) {
        result = await api.updateConsumer(consumer.id, consumerData);
        onConsumerUpdated && onConsumerUpdated(result);
      } else {
        result = await api.createConsumer(consumerData);
        onConsumerCreated && onConsumerCreated(result);
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
              <h5 className="modal-title">{consumer ? 'Edit Consumer' : 'Add Consumer'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {errors.submit && <div className="alert alert-danger">{errors.submit}</div>}

              <h3 className="mb-3">Consumer Information</h3>
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input type="text" name="username" className={`form-control${errors.username?' is-invalid':''}`} value={formData.username} onChange={handleInputChange} placeholder="Enter username (optional if custom_id provided)" />
                {errors.username && <div className="invalid-feedback">{errors.username}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label">Custom ID</label>
                <input type="text" name="custom_id" className={`form-control${errors.custom_id?' is-invalid':''}`} value={formData.custom_id} onChange={handleInputChange} placeholder="Enter custom ID (optional if username provided)" />
                {errors.custom_id && <div className="invalid-feedback">{errors.custom_id}</div>}
              </div>
              <div className="mb-3">
                <label className="form-label">Tags</label>
                <div className="input-group">
                  <input type="text" className="form-control" value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Enter tag and press Enter" onKeyPress={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }} />
                  <button type="button" className="btn btn-outline-secondary" onClick={addTag}>Add Tag</button>
                </div>
                {formData.tags.length > 0 && (
                  <div className="d-flex flex-wrap gap-1 mt-2">
                    {formData.tags.map((tag, index) => (
                      <span key={index} className="badge bg-blue-lt">
                        {tag}
                        <button type="button" className="btn-close btn-close-sm ms-1" style={{fontSize:'0.5em'}} onClick={() => removeTag(index)} />
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {consumer && consumer.id && (
                <>
                  <hr />
                  <h3 className="mb-3">Authentication Credentials</h3>

                  {/* API Keys */}
                  <div className="card mb-3">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h4 className="card-title mb-0">API Keys</h4>
                      <button type="button" className={`btn btn-sm ${showKeyForm?'btn-ghost-secondary':'btn-success'}`} onClick={() => setShowKeyForm(!showKeyForm)}>{showKeyForm ? 'Cancel' : 'Add API Key'}</button>
                    </div>
                    <div className="card-body">
                      {showKeyForm && (
                        <div className="card card-body bg-light mb-3">
                          <div className="mb-2">
                            <label className="form-label">API Key (leave empty to auto-generate)</label>
                            <div className="input-group">
                              <input type="text" className="form-control" value={newKeyData.key} onChange={(e) => setNewKeyData(prev => ({ ...prev, key: e.target.value }))} placeholder="Enter custom key or leave empty" />
                              <button type="button" className="btn btn-outline-secondary" onClick={generateApiKey}>Generate</button>
                            </div>
                          </div>
                          <div className="mb-2">
                            <label className="form-label">TTL (seconds, optional)</label>
                            <input type="number" className="form-control" value={newKeyData.ttl || ''} onChange={(e) => setNewKeyData(prev => ({ ...prev, ttl: e.target.value ? parseInt(e.target.value) : null }))} placeholder="Time to live in seconds" />
                          </div>
                          <button type="button" className="btn btn-primary" onClick={createApiKey} disabled={keyLoading}>{keyLoading ? 'Creating...' : 'Create API Key'}</button>
                          {errors.keyCreation && <div className="alert alert-danger mt-2">{errors.keyCreation}</div>}
                        </div>
                      )}
                      {keyLoading ? (
                        <div className="text-muted text-center py-3">Loading credentials...</div>
                      ) : consumerKeys.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-vcenter">
                            <thead><tr><th>Key</th><th>Created</th><th>Actions</th></tr></thead>
                            <tbody>
                              {consumerKeys.map((key, idx) => (
                                <tr key={key.id || key.name}>
                                  <td>
                                    <code style={{cursor:'pointer'}} title={key.masked ? 'Click to show' : 'Click to hide'} onClick={() => toggleKeyVisibility(idx)}>{key.masked ? '••••••••••••••••' : key.value}</code>
                                    <button className="btn btn-sm btn-ghost-secondary ms-1" onClick={e => copyToClipboard(key.value, e)} title="Copy">📋</button>
                                    <span className="text-muted ms-1" style={{fontSize:'12px'}}>(ID: {key.id || key.name})</span>
                                  </td>
                                  <td>{new Date(key.created_at).toLocaleDateString()}</td>
                                  <td><button className="btn btn-sm btn-danger" onClick={() => deleteApiKey(key.name)} disabled={keyLoading}>Delete</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-muted text-center py-3">No API keys configured</div>
                      )}
                    </div>
                  </div>

                  {/* Basic Auth */}
                  <div className="card mb-3">
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <h4 className="card-title mb-0">Basic Authentication</h4>
                      <button type="button" className={`btn btn-sm ${showBasicAuthForm?'btn-ghost-secondary':'btn-success'}`} onClick={() => setShowBasicAuthForm(!showBasicAuthForm)}>{showBasicAuthForm ? 'Cancel' : 'Add Basic Auth'}</button>
                    </div>
                    <div className="card-body">
                      {showBasicAuthForm && (
                        <div className="card card-body bg-light mb-3">
                          <div className="mb-2">
                            <label className="form-label">Username</label>
                            <input type="text" className="form-control" value={newBasicAuthData.username} onChange={(e) => setNewBasicAuthData(prev => ({ ...prev, username: e.target.value }))} placeholder="Basic auth username" />
                          </div>
                          <div className="mb-2">
                            <label className="form-label">Password</label>
                            <input type="password" className="form-control" value={newBasicAuthData.password} onChange={(e) => setNewBasicAuthData(prev => ({ ...prev, password: e.target.value }))} placeholder="Basic auth password" />
                          </div>
                          <button type="button" className="btn btn-primary" onClick={createBasicAuth} disabled={keyLoading || !newBasicAuthData.username || !newBasicAuthData.password}>{keyLoading ? 'Creating...' : 'Create Basic Auth'}</button>
                          {errors.basicAuthCreation && <div className="alert alert-danger mt-2">{errors.basicAuthCreation}</div>}
                        </div>
                      )}
                      {basicAuthCredentials.length > 0 ? (
                        <div className="table-responsive">
                          <table className="table table-vcenter">
                            <thead><tr><th>Username</th><th>Created</th><th>Actions</th></tr></thead>
                            <tbody>
                              {basicAuthCredentials.map(auth => (
                                <tr key={auth.id}>
                                  <td><code>{auth.username}</code></td>
                                  <td>{new Date(auth.created_at).toLocaleDateString()}</td>
                                  <td><button className="btn btn-sm btn-danger" onClick={() => deleteBasicAuth(auth.id)} disabled={keyLoading}>Delete</button></td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-muted text-center py-3">No basic auth credentials configured</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn me-auto" onClick={onClose} disabled={loading}>Cancel</button>
              <button type="button" className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : (consumer ? 'Update Consumer' : 'Create Consumer')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
};

export default ConsumerModal;
