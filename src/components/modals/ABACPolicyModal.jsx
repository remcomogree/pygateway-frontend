import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';

/**
 * ABAC Policy Modal Component
 * 
 * Modal for creating and editing ABAC policies with DSL rules and OIDC configuration
 */
const ABACPolicyModal = ({ isOpen, policy, onClose, onPolicySaved }) => {
  const { state, api } = useAppState();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const loadedServiceIdRef = useRef(null);  // Track which service_id we've already loaded

  // Debug: log what policy object we received
  useEffect(() => {
    if (isOpen && policy) {
      const keys = Object.keys(policy);
      console.log('📋 ABACPolicyModal received policy:');
      console.log('   - ID:', policy.id);
      console.log('   - Name:', policy.name);
      console.log('   - Keys:', keys);
      if (keys.length === 1) {
        console.log('   - Only key:', keys[0]);
        console.log('   - Value of that key:', policy[keys[0]]);
        // If there's only one key, maybe the policy is nested?
        if (typeof policy[keys[0]] === 'object') {
          console.log('   - Nested object keys:', Object.keys(policy[keys[0]]));
          console.log('   - Nested ID:', policy[keys[0]].id);
          console.log('   - Nested Name:', policy[keys[0]].name);
        }
      }
    }
  }, [isOpen, policy]);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    service_id: '',
    enabled: true,
    version: '1.0.0',
    oidc_config: {
      issuer: '',
      audience: '',
      jwks_uri: '',
      role_claim: 'roles',
      groups_claim: 'groups',
      algorithms: ['RS256'],
      verify_ssl: true
    },
    dsl: {
      version: 1,
      name: '',
      description: '',
      combining: 'deny_overrides',
      rules: [
        {
          id: 'allow_admins',
          effect: 'allow',
          condition: '"admin" IN subject.roles'
        }
      ]
    }
  });

  // Load policy data if editing or if service_id provided
  useEffect(() => {
    if (!isOpen) {
      loadedServiceIdRef.current = null;  // Reset when modal closes
      return;
    }

    const loadPolicyData = async () => {
      setLoading(true);
      try {
        let policyToLoad = null;

        // If policy has full data (editing), use it directly
        if (policy && policy.id) {
          policyToLoad = policy;
        } 
        // If policy has service_id only (creating for service), search for existing policy
        // BUT only if we haven't already loaded this service_id
        else if (policy && policy.service_id && loadedServiceIdRef.current !== policy.service_id) {
          loadedServiceIdRef.current = policy.service_id;  // Mark this service_id as loaded
          try {
            // Load policies for this service - get response directly from returned data
            const response = await api.loadAbacPolicies(0, 100, { service_id: policy.service_id });
            // Use the response data directly
            if (response && response.items && response.items.length > 0) {
              policyToLoad = response.items[0];
            }
          } catch (e) {
            console.log('No existing policy found for service, will create new:', e);
          }
        }

        if (policyToLoad && policyToLoad.id) {
          // Normalize the loaded policy so the form fields always have valid values
          const normalized = {
            ...policyToLoad,
            version: policyToLoad.version || '1.0.0',
            oidc_config: {
              issuer: '',
              audience: '',
              jwks_uri: '',
              role_claim: 'roles',
              groups_claim: 'groups',
              algorithms: ['RS256'],
              verify_ssl: true,
              ...(policyToLoad.oidc_config || {}),
            },
            dsl: {
              version: 1,
              name: policyToLoad.name || '',
              description: '',
              combining: 'deny_overrides',
              rules: [],
              ...(policyToLoad.dsl || {}),
              rules: ((policyToLoad.dsl?.rules) || []).map(rule => ({
                id: rule.id || rule.name || '',
                effect: rule.effect || 'allow',
                condition: rule.condition || '',
              })),
            },
          };
          setFormData(normalized);
        } else {
          // Create new policy form
          const defaultFormData = {
            name: '',
            description: '',
            service_id: policy?.service_id || '',
            enabled: true,
            version: '1.0.0',
            oidc_config: {
              issuer: '',
              audience: '',
              jwks_uri: '',
              algorithms: ['RS256'],
              verify_ssl: true
            },
            dsl: {
              version: 1,
              name: '',
              description: '',
              combining: 'deny_overrides',
              rules: [
                {
                  id: 'allow_admins',
                  effect: 'allow',
                  condition: '"admin" IN subject.roles'
                }
              ]
            }
          };
          setFormData(defaultFormData);
        }
        setValidationErrors([]);
      } finally {
        setLoading(false);
      }
    };

    loadPolicyData();
  }, [isOpen, policy?.id, policy?.service_id]);

  const validateDsl = async () => {
    try {
      const result = await api.validateAbacDsl(formData.dsl);
      if (!result.valid) {
        setValidationErrors(result.errors || []);
        return false;
      }
      setValidationErrors([]);
      return true;
    } catch (error) {
      setValidationErrors([error.message]);
      return false;
    }
  };

  const handleSave = async () => {
    // Basic validation
    if (!formData.name.trim()) {
      toast.warning('Policy name is required');
      return;
    }

    if (!formData.service_id) {
      toast.warning('Service is required');
      return;
    }

    if (!formData.oidc_config.issuer.trim()) {
      toast.warning('OIDC issuer is required');
      return;
    }

    if (!formData.oidc_config.audience.trim()) {
      toast.warning('OIDC audience is required');
      return;
    }

    if (formData.dsl.rules.length === 0) {
      toast.warning('At least one rule is required');
      return;
    }

    // Ensure DSL name matches policy name BEFORE validation
    const updatedFormData = {
      ...formData,
      dsl: {
        ...formData.dsl,
        name: formData.name
      }
    };

    // Validate DSL with correct name
    try {
      const result = await api.validateAbacDsl(updatedFormData.dsl);
      if (!result.valid) {
        setValidationErrors(result.errors || []);
        toast.warning('Please fix DSL validation errors');
        return;
      }
      setValidationErrors([]);
    } catch (error) {
      setValidationErrors([error.message]);
      toast.error('DSL validation failed: ' + error.message);
      return;
    }

    setSaving(true);
    try {
      const policyId = policy?.id;
      const policyName = policy?.name;
      console.log('💾 handleSave - Checking if update or create:', { 
        hasPolicy: !!policy, 
        policyId, 
        policyName,
        policyKeys: policy ? Object.keys(policy) : 'no policy'
      });
      if (policy && policy.id) {
        // Update existing - exclude service_id since it's immutable, format oidc_config correctly
        const updatePayload = {
          name: updatedFormData.name,
          description: updatedFormData.description,
          enabled: updatedFormData.enabled,
          version: updatedFormData.version,
          dsl: updatedFormData.dsl,
          oidc_config: {
            issuer: updatedFormData.oidc_config.issuer,
            audience: updatedFormData.oidc_config.audience,
            algorithm: updatedFormData.oidc_config.algorithms?.[0] || 'RS256',
            verify_ssl: updatedFormData.oidc_config.verify_ssl
          }
        };
        console.log('🔄 Updating policy:', { policyId: policy.id, policyName: policy.name, payload: updatePayload });
        await api.updateAbacPolicy(policy.id, updatePayload);
        toast.success('ABAC policy updated successfully');
      } else {
        // Create new - format payload to match API spec (POST)
        const createPayload = {
          name: updatedFormData.name,
          description: updatedFormData.description,
          service_id: updatedFormData.service_id,
          enabled: updatedFormData.enabled,
          version: updatedFormData.version,
          dsl: updatedFormData.dsl,
          oidc_config: {
            issuer: updatedFormData.oidc_config.issuer,
            audience: updatedFormData.oidc_config.audience,
            jwks_uri: updatedFormData.oidc_config.jwks_uri,
            algorithms: updatedFormData.oidc_config.algorithms || ['RS256'],
            verify_ssl: updatedFormData.oidc_config.verify_ssl
          }
        };
        console.log('✨ Creating new policy (POST):', { 
          payload: createPayload,
          reason: `policy=${!!policy}, has_id=${policy?.id ? 'yes' : 'no'}`
        });
        await api.createAbacPolicy(createPayload);
        toast.success('ABAC policy created successfully');
      }

      onPolicySaved();
      onClose();
    } catch (error) {
      console.error('Failed to save policy:', error);
      const errorMessage = error.message || (error.detail ? error.detail : 'Unknown error');
      toast.error(`Failed to save policy: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!policy || !policy.id) return;

    setSaving(true);
    try {
      await api.deleteAbacPolicy(policy.id);
      toast.success('ABAC policy deleted successfully');
      setShowDeleteConfirm(false);
      onPolicySaved();
      onClose();
    } catch (error) {
      console.error('Failed to delete policy:', error);
      toast.error(`Failed to delete policy: ${error.message}`);
    } finally {
      setSaving(false);
    }
  };

  const addRule = () => {
    const newRule = {
      id: `rule_${Date.now()}`,
      effect: 'allow',
      condition: '',
    };
    setFormData(prev => ({
      ...prev,
      dsl: {
        ...prev.dsl,
        rules: [...prev.dsl.rules, newRule]
      }
    }));
  };

  const removeRule = (index) => {
    setFormData(prev => ({
      ...prev,
      dsl: {
        ...prev.dsl,
        rules: prev.dsl.rules.filter((_, i) => i !== index)
      }
    }));
  };

  const updateRule = (index, field, value) => {
    const newRules = [...formData.dsl.rules];
    newRules[index] = { ...newRules[index], [field]: value };
    setFormData(prev => ({
      ...prev,
      dsl: { ...prev.dsl, rules: newRules }
    }));
  };



  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="modal-backdrop fade show" />
      <div className="modal modal-blur fade show" style={{display:'block'}} onClick={onClose}>
        <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{policy && policy.id ? 'Edit ABAC Policy' : 'Create New ABAC Policy'}</h5>
              <button type="button" className="btn-close" onClick={onClose} />
            </div>
            <div className="modal-body">
              {loading ? (
                <div className="text-center py-4"><div className="spinner-border text-primary" /><div className="text-muted mt-2">Loading policy...</div></div>
              ) : (
              <>
                {/* Basic Information */}
                <h3 className="mb-3">Basic Information</h3>
                <div className="mb-3">
                  <label className="form-label required">Policy Name</label>
                  <input type="text" className="form-control" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., my-api-policy" disabled={saving} />
                  <small className="form-hint">Must start with a letter, alphanumeric with dashes/underscores, max 128 chars</small>
                </div>
                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Optional policy description" rows="3" disabled={saving} />
                </div>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label required">Service</label>
                    <select className="form-select" value={formData.service_id} onChange={e => setFormData({ ...formData, service_id: e.target.value })} disabled={saving || !!policy}>
                      <option value="">Select a service</option>
                      {state.services?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Version</label>
                    <input type="text" className="form-control" value={formData.version} onChange={e => setFormData({ ...formData, version: e.target.value })} placeholder="e.g., 1.0.0" disabled={saving} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={formData.enabled ? 'enabled' : 'disabled'} onChange={e => setFormData({ ...formData, enabled: e.target.value === 'enabled' })} disabled={saving}>
                      <option value="enabled">Enabled</option>
                      <option value="disabled">Disabled</option>
                    </select>
                  </div>
                </div>

                <hr />
                {/* OIDC Configuration */}
                <h3 className="mb-3">OIDC Configuration</h3>
                <div className="mb-3">
                  <label className="form-label required">Issuer URL</label>
                  <input type="url" className="form-control" value={formData.oidc_config.issuer} onChange={e => setFormData({...formData, oidc_config: { ...formData.oidc_config, issuer: e.target.value }})} placeholder="e.g., https://login.microsoftonline.com/tenant/v2.0" disabled={saving} />
                </div>
                <div className="mb-3">
                  <label className="form-label required">Audience</label>
                  <input type="text" className="form-control" value={formData.oidc_config.audience} onChange={e => setFormData({...formData, oidc_config: { ...formData.oidc_config, audience: e.target.value }})} placeholder="e.g., api://my-api" disabled={saving} />
                </div>
                <div className="mb-3">
                  <label className="form-label">JWKS URI (optional)</label>
                  <input type="url" className="form-control" value={formData.oidc_config.jwks_uri} onChange={e => setFormData({...formData, oidc_config: { ...formData.oidc_config, jwks_uri: e.target.value }})} placeholder="Leave empty to auto-detect from issuer" disabled={saving} />
                </div>
                <div className="row">
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Role Claim</label>
                    <input type="text" className="form-control" value={formData.oidc_config.role_claim} onChange={e => setFormData({...formData, oidc_config: { ...formData.oidc_config, role_claim: e.target.value }})} disabled={saving} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Groups Claim</label>
                    <input type="text" className="form-control" value={formData.oidc_config.groups_claim} onChange={e => setFormData({...formData, oidc_config: { ...formData.oidc_config, groups_claim: e.target.value }})} disabled={saving} />
                  </div>
                  <div className="col-md-4 mb-3">
                    <label className="form-label">Verify SSL</label>
                    <select className="form-select" value={formData.oidc_config.verify_ssl ? 'true' : 'false'} onChange={e => setFormData({...formData, oidc_config: { ...formData.oidc_config, verify_ssl: e.target.value === 'true' }})} disabled={saving}>
                      <option value="true">Yes</option>
                      <option value="false">No</option>
                    </select>
                  </div>
                </div>

                <hr />
                {/* DSL Rules */}
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h3 className="mb-0">Access Control Rules (DSL)</h3>
                  <select className="form-select" style={{maxWidth:'200px'}} value={formData.dsl.combining} onChange={e => setFormData({...formData, dsl: { ...formData.dsl, combining: e.target.value }})} disabled={saving}>
                    <option value="deny_overrides">Deny Overrides</option>
                    <option value="allow_overrides">Allow Overrides</option>
                    <option value="first_applicable">First Applicable</option>
                  </select>
                </div>

                {validationErrors.length > 0 && (
                  <div className="alert alert-danger">
                    <strong>Validation Errors:</strong>
                    <ul className="mb-0 mt-1">{validationErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
                  </div>
                )}

                {formData.dsl.rules.map((rule, ruleIdx) => (
                  <div key={ruleIdx} className="card mb-2">
                    <div className="card-header d-flex gap-2 align-items-center py-2">
                      <input type="text" className="form-control form-control-sm" style={{flex:1}} value={rule.id || ''} onChange={e => updateRule(ruleIdx, 'id', e.target.value)} placeholder="Rule ID (e.g. allow-admins)" disabled={saving} />
                      <select className={`form-select form-select-sm ${rule.effect === 'allow' ? 'text-success' : 'text-danger'}`} style={{width:'100px'}} value={rule.effect} onChange={e => updateRule(ruleIdx, 'effect', e.target.value)} disabled={saving}>
                        <option value="allow">Allow</option>
                        <option value="deny">Deny</option>
                      </select>
                      {formData.dsl.rules.length > 1 && <button className="btn btn-sm btn-outline-danger" onClick={() => removeRule(ruleIdx)} disabled={saving}>Remove</button>}
                    </div>
                    <div className="card-body py-2">
                      <label className="form-label small text-muted mb-1">Condition:</label>
                      <textarea
                        className="form-control form-control-sm font-monospace"
                        rows={2}
                        value={rule.condition || ''}
                        onChange={e => updateRule(ruleIdx, 'condition', e.target.value)}
                        placeholder={'e.g.  "admin" IN subject.roles\n      action.method == "GET" AND environment.time_hour >= 9'}
                        disabled={saving}
                        spellCheck={false}
                        style={{resize:'vertical', fontSize:'0.8rem'}}
                      />
                    </div>
                  </div>
                ))}

                <button className="btn btn-outline-secondary btn-sm mb-3" onClick={addRule} disabled={saving}>+ Add Rule</button>

                <div className="card card-body bg-muted-lt small">
                  <strong>Condition Expression Examples:</strong>
                  <ul className="mb-0 mt-1 font-monospace" style={{fontSize:'0.78rem'}}>
                    <li><code>"admin" IN subject.roles</code></li>
                    <li><code>action.method == "GET" AND "reader" IN subject.roles</code></li>
                    <li><code>environment.time_hour &gt;= 9 AND environment.time_hour &lt;= 18</code></li>
                    <li><code>action.path GLOB "/api/*/admin"</code></li>
                    <li><code>environment.ip IN_CIDR ["10.0.0.0/8"]</code></li>
                    <li><code>true</code> &nbsp;(catch-all)</li>
                  </ul>
                </div>
              </>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn me-auto" onClick={onClose} disabled={saving}>Cancel</button>
              {policy && policy.id && <button type="button" className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)} disabled={saving}>Delete</button>}
              <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? <><span className="spinner-border spinner-border-sm me-1" />{policy ? 'Updating...' : 'Creating...'}</> : (policy ? 'Update Policy' : 'Create Policy')}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <>
          <div className="modal-backdrop fade show" style={{zIndex:10001}} />
          <div className="modal fade show" style={{display:'block',zIndex:10002}} onClick={() => setShowDeleteConfirm(false)}>
            <div className="modal-dialog modal-sm modal-dialog-centered" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header"><h5 className="modal-title">Delete ABAC Policy</h5><button type="button" className="btn-close" onClick={() => setShowDeleteConfirm(false)} /></div>
                <div className="modal-body">
                  <p>Are you sure you want to delete this policy?</p>
                  <p><strong>{formData.name}</strong></p>
                </div>
                <div className="modal-footer">
                  <button className="btn me-auto" onClick={() => setShowDeleteConfirm(false)} disabled={saving}>Cancel</button>
                  <button className="btn btn-danger" onClick={handleDelete} disabled={saving}>{saving ? 'Deleting...' : 'Delete'}</button>
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

export default ABACPolicyModal;
