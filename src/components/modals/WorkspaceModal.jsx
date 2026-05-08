import React, { useState, useEffect } from 'react';

/**
 * WorkspaceModal Component
 * 
 * Modal for creating and editing workspaces
 * Replicates the original workspace creation form functionality
 */
const WorkspaceModal = ({ workspace, onSave, onCancel, loading }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    enabled: true
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (workspace) {
      setFormData({
        name: workspace.name || '',
        description: workspace.description || '',
        enabled: workspace.enabled !== false
      });
    } else {
      setFormData({
        name: '',
        description: '',
        enabled: true
      });
    }
    setErrors({});
  }, [workspace]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Workspace name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Workspace name must be at least 2 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSave({
      name: formData.name.trim(),
      description: formData.description.trim() || null,
      enabled: formData.enabled
    });
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return (
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal modal-blur fade show" style={{display:'block'}} onClick={handleOverlayClick}>
        <div className="modal-dialog modal-dialog-centered">
          <div className="modal-content">
            <form onSubmit={handleSubmit}>
              <div className="modal-header">
                <h5 className="modal-title">{workspace ? 'Update Workspace' : 'Create Workspace'}</h5>
                <button type="button" className="btn-close" onClick={onCancel} disabled={loading} />
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label required">Workspace Name</label>
                  <input type="text" name="name" className={`form-control${errors.name ? ' is-invalid' : ''}`} value={formData.name} onChange={handleChange} placeholder="Enter workspace name" disabled={loading} required />
                  {errors.name && <div className="invalid-feedback">{errors.name}</div>}
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea name="description" className="form-control" value={formData.description} onChange={handleChange} placeholder="Enter workspace description (optional)" rows="3" disabled={loading} />
                </div>
                <div className="mb-3">
                  <label className="form-check">
                    <input type="checkbox" name="enabled" className="form-check-input" checked={formData.enabled} onChange={handleChange} disabled={loading} />
                    <span className="form-check-label">Enabled</span>
                  </label>
                  <small className="form-hint">Enable this workspace to make it available for services</small>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn me-auto" onClick={onCancel} disabled={loading}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <><span className="spinner-border spinner-border-sm me-1" />{workspace ? 'Updating...' : 'Creating...'}</> : (workspace ? 'Save Changes' : 'Create Workspace')}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
};

export default WorkspaceModal;
