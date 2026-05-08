import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';

/**
 * ServicePolicyModal Component
 * 
 * Modal for managing service policies - create, update, and delete
 */
const ServicePolicyModal = ({ isOpen, serviceId, serviceName, onClose }) => {
  const { state, api } = useAppState();
  const toast = useToast();
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [formData, setFormData] = useState({
    required_roles: [],
    enabled: true
  });
  const [roleInput, setRoleInput] = useState('');
  const [roleFocused, setRoleFocused] = useState(false);

  // Load service policy when modal opens
  useEffect(() => {
    if (isOpen && serviceId) {
      loadServicePolicy();
    }
  }, [isOpen, serviceId]);

  const loadServicePolicy = async () => {
    setLoading(true);
    try {
      const policyData = await api.loadServicePolicy(serviceId);
      setPolicy(policyData);
      
      if (policyData) {
        setFormData({
          required_roles: policyData.required_roles || [],
          enabled: policyData.enabled ?? true
        });
      } else {
        setFormData({
          required_roles: [],
          enabled: true
        });
      }
    } catch (error) {
      console.error('Failed to load service policy:', error);
      setPolicy(null);
      setFormData({
        required_roles: [],
        enabled: true
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = (role) => {
    setFormData(prev => ({
      ...prev,
      required_roles: prev.required_roles.includes(role)
        ? prev.required_roles.filter(r => r !== role)
        : [...prev.required_roles, role]
    }));
  };

  const handleSave = async () => {
    if (formData.required_roles.length === 0) {
      toast.warning('Please select at least one required role.');
      return;
    }

    setSaving(true);
    try {
      if (policy) {
        // Update existing policy
        await api.updateServicePolicy(serviceId, policy.id, formData);
      } else {
        // Create new policy
        await api.createServicePolicy(serviceId, formData);
      }
      
      // Reload the policy to get the updated data
      await loadServicePolicy();
      toast.success(`Service policy ${policy ? 'updated' : 'created'} successfully!`);

      // Refresh services list and return to service screen
      try {
        const pagination = state.pagination?.services;
        await api.loadServices(pagination?.offset || 0, pagination?.limit || 20);
      } catch (e) {
        console.error('Failed to reload services after saving policy:', e);
      }

      // Close modal to go back to service list view
      if (typeof onClose === 'function') onClose();
    } catch (error) {
      console.error('Failed to save service policy:', error);
      toast.error(`Failed to ${policy ? 'update' : 'create'} service policy: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!policy) return;
    
    setSaving(true);
    try {
      await api.deleteServicePolicy(serviceId, policy.id);
      setPolicy(null);
      setFormData({
        required_roles: [],
        enabled: true
      });
      setShowDeleteConfirm(false);
      toast.success('Service policy deleted successfully!');

      // Refresh services list and return to service screen
      try {
        const pagination = state.pagination?.services;
        await api.loadServices(pagination?.offset || 0, pagination?.limit || 20);
      } catch (e) {
        console.error('Failed to reload services after deleting policy:', e);
      }

      if (typeof onClose === 'function') onClose();
    } catch (error) {
      console.error('Failed to delete service policy:', error);
      toast.error(`Failed to delete service policy: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const availableRoles = ['admin', 'moderator', 'user', 'viewer', 'guest', 'developer', 'analyst'];

  const addRole = (role) => {
    if (!role || !role.trim()) return;
    const r = role.trim();
    setFormData(prev => ({
      ...prev,
      required_roles: prev.required_roles.includes(r) ? prev.required_roles : [...prev.required_roles, r]
    }));
    setRoleInput('');
  };

  const removeRole = (role) => {
    setFormData(prev => ({ ...prev, required_roles: prev.required_roles.filter(r => r !== role) }));
  };

  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal modal-blur fade show" style={{display:'block'}} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Service Policy Management</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              <div className="card card-body bg-light mb-3">
                <h4 className="mb-1">Service: {serviceName}</h4>
                <p className="text-muted mb-0 small">
                  {policy
                    ? 'This service has an access policy configured. Users must have one of the required roles to access this service.'
                    : 'This service currently has no access policy. All authenticated users can access it.'}
                </p>
              </div>

              {loading ? (
                <div className="text-center py-4"><div className="spinner-border text-primary" /><div className="text-muted mt-2">Loading service policy...</div></div>
              ) : (
                <>
                  <div className="mb-3">
                    <label className="form-check">
                      <input type="checkbox" className="form-check-input" checked={formData.enabled} onChange={(e) => setFormData(prev => ({ ...prev, enabled: e.target.checked }))} disabled={saving} />
                      <span className="form-check-label">Policy Enabled</span>
                    </label>
                    <small className="form-hint">When disabled, the policy exists but is not enforced</small>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Required Roles</label>
                    <div className="d-flex flex-wrap gap-1 mb-2">
                      {formData.required_roles.map(r => (
                        <span key={r} className="badge bg-primary">
                          {r}
                          <button type="button" className="btn-close btn-close-white ms-1" style={{fontSize:'0.5em'}} onClick={() => removeRole(r)} disabled={saving} />
                        </span>
                      ))}
                    </div>
                    <div className="d-flex flex-wrap gap-2 mb-2">
                      {availableRoles.map(role => (
                        <label key={role} className="form-check form-check-inline">
                          <input type="checkbox" className="form-check-input" checked={formData.required_roles.includes(role)} onChange={() => handleRoleChange(role)} disabled={saving} />
                          <span className="form-check-label text-capitalize">{role}</span>
                        </label>
                      ))}
                    </div>
                    <div className="input-group" style={{position:'relative'}}>
                      <input list="service-available-roles" className="form-control" value={roleInput} onChange={(e) => setRoleInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRole(roleInput); } }} onFocus={() => setRoleFocused(true)} onBlur={() => setTimeout(() => setRoleFocused(false), 150)} placeholder="Type or select a role and press Enter" disabled={saving} />
                      <button className="btn btn-primary" type="button" onClick={() => addRole(roleInput)} disabled={saving || !roleInput.trim()}>Add</button>
                      <datalist id="service-available-roles">{availableRoles.map(r => <option key={r} value={r} />)}</datalist>
                    </div>
                    {roleFocused && (
                      <div className="card" style={{position:'absolute',zIndex:10,maxHeight:'200px',overflow:'auto',marginTop:'2px'}}>
                        {availableRoles.filter(r => r.toLowerCase().includes((roleInput || '').toLowerCase())).map(r => (
                          <div key={r} className="px-3 py-2" style={{cursor:'pointer'}} onMouseDown={(e) => { e.preventDefault(); setRoleInput(r); addRole(r); }}>{r}</div>
                        ))}
                      </div>
                    )}
                    <small className="form-hint">Users must have at least one of these roles to access the service.</small>
                  </div>

                  {policy && (
                    <div className="card card-body bg-light mt-3">
                      <h5 className="mb-2 small fw-bold">Policy Information</h5>
                      <div className="d-flex flex-column gap-1 small">
                        <div className="d-flex justify-content-between"><span className="text-muted">Created:</span><span>{new Date(policy.created_at).toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between"><span className="text-muted">Updated:</span><span>{new Date(policy.updated_at).toLocaleString()}</span></div>
                        <div className="d-flex justify-content-between"><span className="text-muted">Policy ID:</span><code>{policy.id}</code></div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn me-auto" onClick={onClose} disabled={saving}>Cancel</button>
              {policy && <button type="button" className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)} disabled={saving}>Delete Policy</button>}
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving || loading || formData.required_roles.length === 0}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1" />Saving...</> : (policy ? 'Update Policy' : 'Create Policy')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {showDeleteConfirm && (
        <>
          <div className="modal-backdrop fade show" style={{zIndex:10001}} />
          <div className="modal fade show" style={{display:'block',zIndex:10002}} onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-dialog modal-sm modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header"><h5 className="modal-title">Confirm Delete</h5><button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)} /></div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this service policy?</p>
                  <p className="text-danger fw-bold">After deletion, all authenticated users will be able to access this service.</p>
                </div>
                <div className="modal-footer">
                  <button className="btn me-auto" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete Policy'}</button>
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

export default ServicePolicyModal;
