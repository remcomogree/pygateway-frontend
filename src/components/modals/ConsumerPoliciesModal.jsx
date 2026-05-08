import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';

/**
 * ConsumerPoliciesModal Component
 * 
 * Modal for managing consumer policies - list, create, update, and delete multiple policies
 */
const ConsumerPoliciesModal = ({ isOpen, consumerId, consumerName, onClose }) => {
  const { state, api } = useAppState();
  const toast = useToast();
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [formData, setFormData] = useState({
    role: '',
    allowed_methods: ['GET'],
    enabled: true
  });
  const [roleFocused, setRoleFocused] = useState(false);

  // Load consumer policies when modal opens
  useEffect(() => {
    if (isOpen && consumerId) {
      loadConsumerPolicies();
    }
  }, [isOpen, consumerId]);

  const loadConsumerPolicies = async () => {
    setLoading(true);
    try {
      const policiesData = await api.loadConsumerPolicies(consumerId);
      setPolicies(Array.isArray(policiesData) ? policiesData : []);
    } catch (error) {
      console.error('Failed to load consumer policies:', error);
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      role: '',
      allowed_methods: ['GET'],
      enabled: true
    });
    setEditingPolicy(null);
    setShowCreateForm(false);
  };

  const handleCreateNew = () => {
    resetForm();
    setShowCreateForm(true);
  };

  const handleEdit = (policy) => {
    setFormData({
      role: policy.role,
      allowed_methods: [...policy.allowed_methods],
      enabled: policy.enabled
    });
    setEditingPolicy(policy);
    setShowCreateForm(true);
  };

  const handleMethodToggle = (method) => {
    setFormData(prev => ({
      ...prev,
      allowed_methods: prev.allowed_methods.includes(method)
        ? prev.allowed_methods.filter(m => m !== method)
        : [...prev.allowed_methods, method]
    }));
  };

  const handleSave = async () => {
    if (!formData.role.trim()) {
      toast.warning('Please enter a role.');
      return;
    }

    if (formData.allowed_methods.length === 0) {
      toast.warning('Please select at least one HTTP method.');
      return;
    }

    setSaving(true);
    try {
      if (editingPolicy) {
        // Update existing policy
        await api.updateConsumerPolicy(consumerId, editingPolicy.id, formData);
      } else {
        // Create new policy
        await api.createConsumerPolicy(consumerId, formData);
      }
      
      // Reload policies
      await loadConsumerPolicies();
      resetForm();
      toast.success(`Consumer policy ${editingPolicy ? 'updated' : 'created'} successfully!`);
    } catch (error) {
      console.error('Failed to save consumer policy:', error);
      toast.error(`Failed to ${editingPolicy ? 'update' : 'create'} consumer policy: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (policy) => {
    setSaving(true);
    try {
      await api.deleteConsumerPolicy(consumerId, policy.id);
      await loadConsumerPolicies();
      setDeleteConfirm(null);
      toast.success('Consumer policy deleted successfully!');
    } catch (error) {
      console.error('Failed to delete consumer policy:', error);
      toast.error(`Failed to delete consumer policy: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const availableRoles = ['admin', 'moderator', 'user', 'viewer', 'guest', 'developer', 'analyst'];
  const availableMethods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal modal-blur fade show" style={{display:'block'}} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Consumer Policies Management</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="card card-body bg-light mb-3">
                <h4 className="mb-1">Consumer: {consumerName || consumerId}</h4>
                <p className="text-muted mb-0 small">Consumer policies define what roles and HTTP methods this consumer is allowed to use.</p>
              </div>

              {loading ? (
                <div className="text-center py-4"><div className="spinner-border text-primary" /><div className="text-muted mt-2">Loading consumer policies...</div></div>
              ) : (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0">Policies ({policies.length})</h5>
                    <button className="btn btn-primary btn-sm" onClick={handleCreateNew} disabled={saving}>Add Policy</button>
                  </div>

                  {policies.length === 0 ? (
                    <div className="text-center py-4 border border-2 border-dashed rounded">
                      <div style={{fontSize:'48px'}}>&#128274;</div>
                      <p className="mb-1">No policies configured</p>
                      <p className="text-muted small mb-3">This consumer has no access policies. Add a policy to grant access permissions.</p>
                      <button className="btn btn-primary" onClick={handleCreateNew} disabled={saving}>Create First Policy</button>
                    </div>
                  ) : (
                    <div className="d-flex flex-column gap-2 mb-3">
                      {policies.map(policy => (
                        <div key={policy.id} className="card" style={{borderLeft: `4px solid ${policy.enabled ? '#2fb344' : '#d63939'}`}}>
                          <div className="card-body py-2">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <div className="d-flex align-items-center gap-2">
                                <span className="badge bg-secondary-lt text-capitalize">{policy.role}</span>
                                <span className={`badge ${policy.enabled ? 'bg-success-lt' : 'bg-danger-lt'}`}>{policy.enabled ? 'Enabled' : 'Disabled'}</span>
                              </div>
                              <div className="btn-list">
                                <button className="btn btn-sm btn-ghost-secondary" onClick={() => handleEdit(policy)} disabled={saving}>Edit</button>
                                <button className="btn btn-sm btn-ghost-danger" onClick={() => setDeleteConfirm(policy)} disabled={saving}>Delete</button>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <span className="text-muted small">Methods:</span>
                              {policy.allowed_methods.map(m => <span key={m} className="badge bg-primary-lt">{m}</span>)}
                            </div>
                            <div className="d-flex gap-3">
                              <small className="text-muted">Created: {new Date(policy.created_at).toLocaleDateString()}</small>
                              <small className="text-muted">Updated: {new Date(policy.updated_at).toLocaleDateString()}</small>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {showCreateForm && (
                    <div className="card mt-3">
                      <div className="card-header d-flex justify-content-between align-items-center">
                        <h5 className="card-title mb-0">{editingPolicy ? 'Edit Policy' : 'Create New Policy'}</h5>
                        <button className="btn btn-sm btn-ghost-secondary" onClick={resetForm} disabled={saving}>Cancel</button>
                      </div>
                      <div className="card-body">
                        <div className="row mb-3">
                          <div className="col-md-8">
                            <label className="form-label">Role</label>
                            <div style={{position:'relative'}}>
                              <input list="available-roles" className="form-control" value={formData.role} onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))} disabled={saving} placeholder="Select or type a role" onFocus={() => setRoleFocused(true)} onBlur={() => setTimeout(() => setRoleFocused(false), 150)} />
                              <datalist id="available-roles">{availableRoles.map(r => <option key={r} value={r} />)}</datalist>
                              {roleFocused && (
                                <div className="card" style={{position:'absolute',zIndex:10,width:'100%',maxHeight:'180px',overflow:'auto',marginTop:'2px'}}>
                                  {availableRoles.filter(r => r.toLowerCase().includes((formData.role||'').toLowerCase())).slice(0,10).map(r => (
                                    <div key={r} className="px-3 py-2" style={{cursor:'pointer'}} onMouseDown={(e) => { e.preventDefault(); setFormData(prev => ({...prev, role: r})); setRoleFocused(false); }}>{r}</div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="col-md-4 d-flex align-items-end">
                            <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.enabled} onChange={(e) => setFormData(prev => ({...prev, enabled: e.target.checked}))} disabled={saving} /><span className="form-check-label">Policy Enabled</span></label>
                          </div>
                        </div>
                        <div className="mb-3">
                          <label className="form-label">Allowed HTTP Methods</label>
                          <div className="d-flex flex-wrap gap-2">
                            {availableMethods.map(method => (
                              <label key={method} className="form-check form-check-inline">
                                <input type="checkbox" className="form-check-input" checked={formData.allowed_methods.includes(method)} onChange={() => handleMethodToggle(method)} disabled={saving} />
                                <span className="form-check-label">{method}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                        <div className="d-flex justify-content-end gap-2">
                          <button className="btn" onClick={resetForm} disabled={saving}>Cancel</button>
                          <button className="btn btn-primary" onClick={handleSave} disabled={saving || !formData.role.trim() || formData.allowed_methods.length === 0}>
                            {saving ? 'Saving...' : (editingPolicy ? 'Update Policy' : 'Create Policy')}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={onClose} disabled={saving}>Close</button>
            </div>
          </div>
        </div>
      </div>

      {deleteConfirm && (
        <>
          <div className="modal-backdrop fade show" style={{zIndex:10001}} />
          <div className="modal fade show" style={{display:'block',zIndex:10002}} onClick={() => setDeleteConfirm(null)}>
            <div className="modal-dialog modal-sm modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header"><h5 className="modal-title">Confirm Delete</h5><button type="button" className="btn-close" onClick={() => setDeleteConfirm(null)} /></div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this policy?</p>
                  <div className="card card-body bg-light small">
                    <strong>Role:</strong> {deleteConfirm.role}<br/>
                    <strong>Methods:</strong> {deleteConfirm.allowed_methods.join(', ')}<br/>
                    <strong>Status:</strong> {deleteConfirm.enabled ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
                <div className="modal-footer">
                  <button className="btn me-auto" onClick={() => setDeleteConfirm(null)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={() => handleDelete(deleteConfirm)} disabled={saving}>{saving ? 'Deleting...' : 'Delete Policy'}</button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>,
    document.body
  );
};

export default ConsumerPoliciesModal;
