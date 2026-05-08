import React, { useState, useEffect } from 'react';
import { useAppState } from '../context/AppState';
import { IconPlus, IconEdit, IconTrash, IconCoin } from '@tabler/icons-react';

const TABS = [
  { key: 'plans', label: 'Plans' },
  { key: 'subscriptions', label: 'Subscriptions' },
  { key: 'usage-events', label: 'Usage Events' },
  { key: 'usage-aggregations', label: 'Aggregations' },
];

const MonetizationView = () => {
  const { rawApi } = useAppState();
  const [activeTab, setActiveTab] = useState('plans');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [usageEvents, setUsageEvents] = useState([]);
  const [usageAggregations, setUsageAggregations] = useState([]);
  const [consumers, setConsumers] = useState([]);
  const [services, setServices] = useState([]);
  const [routes, setRoutes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [modalType, setModalType] = useState('');
  const [planForm, setPlanForm] = useState({ name: '', description: '', price_per_unit: 0, quota: '', period: 'monthly', enabled: true });
  const [subscriptionForm, setSubscriptionForm] = useState({ consumer_id: '', service_id: '', plan_id: '', status: 'active', start_date: '', end_date: '' });
  const [usageEventForm, setUsageEventForm] = useState({ consumer_id: '', service_id: '', route_id: '', resource: '', status: 'success', timestamp: new Date().toISOString() });

  useEffect(() => {
    const init = async () => {
      try {
        const [c, s, r] = await Promise.all([
          rawApi.request('/api/v1/consumers/').catch(() => []),
          rawApi.request('/api/v1/services/').catch(() => []),
          rawApi.request('/api/v1/routes/').catch(() => []),
        ]);
        setConsumers(c?.items || c || []);
        setServices(s?.items || s || []);
        setRoutes(r?.items || r || []);
      } catch {}
      loadTabData();
    };
    init();
  }, []);

  useEffect(() => { loadTabData(); }, [activeTab]);

  const loadTabData = async () => {
    setLoading(true); setError(null);
    try {
      if (activeTab === 'plans') setPlans(await rawApi.request('/api/v1/monetization/plans'));
      else if (activeTab === 'subscriptions') setSubscriptions(await rawApi.request('/api/v1/monetization/subscriptions'));
      else if (activeTab === 'usage-events') setUsageEvents(await rawApi.request('/api/v1/monetization/usage-events'));
      else if (activeTab === 'usage-aggregations') setUsageAggregations(await rawApi.request('/api/v1/monetization/usage-aggregations'));
    } catch (err) { setError(`Failed to load ${activeTab}: ${err.message}`); }
    finally { setLoading(false); }
  };

  const deleteItem = async (type, id) => {
    if (!window.confirm(`Delete this ${type.slice(0, -1)}?`)) return;
    try { await rawApi.request(`/api/v1/monetization/${type}/${id}`, { method: 'DELETE' }); loadTabData(); }
    catch (err) { setError(`Failed to delete: ${err.message}`); }
  };

  const openCreate = (type) => { setModalType(type); setEditingItem(null); resetForm(type); setShowModal(true); };
  const openEdit = (type, item) => { setModalType(type); setEditingItem(item); populateForm(type, item); setShowModal(true); };

  const resetForm = (type) => {
    if (type === 'plan') setPlanForm({ name: '', description: '', price_per_unit: 0, quota: '', period: 'monthly', enabled: true });
    else if (type === 'subscription') setSubscriptionForm({ consumer_id: '', service_id: '', plan_id: '', status: 'active', start_date: '', end_date: '' });
    else if (type === 'usageEvent') setUsageEventForm({ consumer_id: '', service_id: '', route_id: '', resource: '', status: 'success', timestamp: new Date().toISOString() });
  };

  const populateForm = (type, item) => {
    if (type === 'plan') setPlanForm({ name: item.name||'', description: item.description||'', price_per_unit: item.price_per_unit||0, quota: item.quota||'', period: item.period||'monthly', enabled: item.enabled!==false });
    else if (type === 'subscription') setSubscriptionForm({ consumer_id: item.consumer_id||'', service_id: item.service_id||'', plan_id: item.plan_id||'', status: item.status||'active', start_date: item.start_date||'', end_date: item.end_date||'' });
    else if (type === 'usageEvent') setUsageEventForm({ consumer_id: item.consumer_id||'', service_id: item.service_id||'', route_id: item.route_id||'', resource: item.resource||'', status: item.status||'success', timestamp: item.timestamp||new Date().toISOString() });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let url, data;
      const method = editingItem ? 'PUT' : 'POST';
      if (modalType === 'plan') { url = editingItem ? `/api/v1/monetization/plans/${editingItem.id}` : '/api/v1/monetization/plans'; data = { ...planForm, price_per_unit: parseFloat(planForm.price_per_unit) }; }
      else if (modalType === 'subscription') { url = editingItem ? `/api/v1/monetization/subscriptions/${editingItem.id}` : '/api/v1/monetization/subscriptions'; data = subscriptionForm; }
      else if (modalType === 'usageEvent') { url = editingItem ? `/api/v1/monetization/usage-events/${editingItem.id}` : '/api/v1/monetization/usage-events'; data = usageEventForm; }
      await rawApi.request(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      setShowModal(false); loadTabData();
    } catch (err) { setError(`Failed to save: ${err.message}`); }
  };

  const getName = (list, id) => { const item = (Array.isArray(list) ? list : []).find((x) => x.id === id); return item?.name || item?.username || id?.substring(0, 12) || '—'; };

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col"><h2 className="page-title"><IconCoin size={24} className="me-2" />Monetization</h2></div>
        </div>
      </div>
      {error && <div className="alert alert-danger mt-3">{error}</div>}

      <div className="card mt-3">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map((t) => (
              <li className="nav-item" key={t.key}>
                <a href="#" className={`nav-link${activeTab === t.key ? ' active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab(t.key); }}>{t.label}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4"><div className="spinner-border text-primary" /></div>
          ) : (
            <>
              {/* Plans */}
              {activeTab === 'plans' && (
                <>
                  <div className="d-flex justify-content-between mb-3"><h3 className="mb-0">Billing Plans</h3><button className="btn btn-primary btn-sm" onClick={() => openCreate('plan')}><IconPlus size={14} className="me-1" />Add Plan</button></div>
                  <div className="table-responsive">
                    <table className="table table-vcenter">
                      <thead><tr><th>Name</th><th>Description</th><th>Price/Unit</th><th>Quota</th><th>Period</th><th>Status</th><th>Actions</th></tr></thead>
                      <tbody>
                        {plans.length === 0 ? <tr><td colSpan="7" className="text-center text-muted py-4">No plans</td></tr> : plans.map((p) => (
                          <tr key={p.id}>
                            <td className="fw-bold">{p.name}</td><td className="text-muted">{p.description||'—'}</td><td>${p.price_per_unit}</td><td>{p.quota||'—'}</td><td>{p.period}</td>
                            <td><span className={`badge ${p.enabled?'bg-success':'bg-secondary'}`}>{p.enabled?'Active':'Inactive'}</span></td>
                            <td><div className="btn-list"><button className="btn btn-sm" onClick={() => openEdit('plan', p)}><IconEdit size={14} /></button><button className="btn btn-sm btn-ghost-danger" onClick={() => deleteItem('plans', p.id)}><IconTrash size={14} /></button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Subscriptions */}
              {activeTab === 'subscriptions' && (
                <>
                  <div className="d-flex justify-content-between mb-3"><h3 className="mb-0">Subscriptions</h3><button className="btn btn-primary btn-sm" onClick={() => openCreate('subscription')}><IconPlus size={14} className="me-1" />Add</button></div>
                  <div className="table-responsive">
                    <table className="table table-vcenter">
                      <thead><tr><th>Consumer</th><th>Service</th><th>Plan</th><th>Status</th><th>Start</th><th>End</th><th>Actions</th></tr></thead>
                      <tbody>
                        {subscriptions.length === 0 ? <tr><td colSpan="7" className="text-center text-muted py-4">No subscriptions</td></tr> : subscriptions.map((s) => (
                          <tr key={s.id}>
                            <td>{getName(consumers, s.consumer_id)}</td><td>{getName(services, s.service_id)}</td><td>{getName(plans, s.plan_id)}</td>
                            <td><span className={`badge ${s.status==='active'?'bg-success':'bg-secondary'}`}>{s.status}</span></td>
                            <td>{s.start_date||'—'}</td><td>{s.end_date||'—'}</td>
                            <td><div className="btn-list"><button className="btn btn-sm" onClick={() => openEdit('subscription', s)}><IconEdit size={14} /></button><button className="btn btn-sm btn-ghost-danger" onClick={() => deleteItem('subscriptions', s.id)}><IconTrash size={14} /></button></div></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Usage Events */}
              {activeTab === 'usage-events' && (
                <>
                  <div className="d-flex justify-content-between mb-3"><h3 className="mb-0">Usage Events</h3><button className="btn btn-primary btn-sm" onClick={() => openCreate('usageEvent')}><IconPlus size={14} className="me-1" />Add</button></div>
                  <div className="table-responsive">
                    <table className="table table-vcenter">
                      <thead><tr><th>Consumer</th><th>Service</th><th>Route</th><th>Resource</th><th>Status</th><th>Timestamp</th><th>Actions</th></tr></thead>
                      <tbody>
                        {usageEvents.length === 0 ? <tr><td colSpan="7" className="text-center text-muted py-4">No events</td></tr> : usageEvents.map((u) => (
                          <tr key={u.id}>
                            <td>{getName(consumers, u.consumer_id)}</td><td>{getName(services, u.service_id)}</td><td>{getName(routes, u.route_id)}</td>
                            <td>{u.resource||'—'}</td><td><span className={`badge ${u.status==='success'?'bg-success':'bg-danger'}`}>{u.status}</span></td>
                            <td>{u.timestamp ? new Date(u.timestamp).toLocaleString() : '—'}</td>
                            <td><button className="btn btn-sm btn-ghost-danger" onClick={() => deleteItem('usage-events', u.id)}><IconTrash size={14} /></button></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}

              {/* Usage Aggregations */}
              {activeTab === 'usage-aggregations' && (
                <>
                  <h3>Usage Aggregations</h3>
                  <div className="table-responsive">
                    <table className="table table-vcenter">
                      <thead><tr><th>Consumer</th><th>Service</th><th>Plan</th><th>Period</th><th>Usage</th><th>Total Cost</th></tr></thead>
                      <tbody>
                        {usageAggregations.length === 0 ? <tr><td colSpan="6" className="text-center text-muted py-4">No aggregations</td></tr> : usageAggregations.map((a, i) => (
                          <tr key={i}>
                            <td>{getName(consumers, a.consumer_id)}</td><td>{getName(services, a.service_id)}</td><td>{getName(plans, a.plan_id)}</td>
                            <td>{a.period||'—'}</td><td className="fw-bold">{a.usage_count||0}</td><td className="fw-bold">${a.total_cost||0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal modal-blur fade show" style={{display:'block'}} onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={handleSubmit}>
                  <div className="modal-header">
                    <h5 className="modal-title">{editingItem ? 'Edit' : 'Create'} {modalType === 'usageEvent' ? 'Usage Event' : modalType.charAt(0).toUpperCase() + modalType.slice(1)}</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                  </div>
                  <div className="modal-body">
                    {modalType === 'plan' && (
                      <>
                        <div className="row">
                          <div className="col-md-6 mb-3"><label className="form-label required">Name</label><input className="form-control" value={planForm.name} onChange={(e) => setPlanForm({...planForm, name: e.target.value})} required /></div>
                          <div className="col-md-6 mb-3"><label className="form-label">Price per Unit</label><input type="number" step="0.01" className="form-control" value={planForm.price_per_unit} onChange={(e) => setPlanForm({...planForm, price_per_unit: e.target.value})} /></div>
                        </div>
                        <div className="mb-3"><label className="form-label">Description</label><textarea className="form-control" value={planForm.description} onChange={(e) => setPlanForm({...planForm, description: e.target.value})} /></div>
                        <div className="row">
                          <div className="col-md-4 mb-3"><label className="form-label">Quota</label><input className="form-control" value={planForm.quota} onChange={(e) => setPlanForm({...planForm, quota: e.target.value})} /></div>
                          <div className="col-md-4 mb-3"><label className="form-label">Period</label><select className="form-select" value={planForm.period} onChange={(e) => setPlanForm({...planForm, period: e.target.value})}><option>monthly</option><option>yearly</option><option>daily</option></select></div>
                          <div className="col-md-4 mb-3"><label className="form-check mt-4"><input type="checkbox" className="form-check-input" checked={planForm.enabled} onChange={(e) => setPlanForm({...planForm, enabled: e.target.checked})} /><span className="form-check-label">Enabled</span></label></div>
                        </div>
                      </>
                    )}
                    {modalType === 'subscription' && (
                      <>
                        <div className="row">
                          <div className="col-md-6 mb-3"><label className="form-label">Consumer</label><select className="form-select" value={subscriptionForm.consumer_id} onChange={(e) => setSubscriptionForm({...subscriptionForm, consumer_id: e.target.value})}><option value="">Select...</option>{(Array.isArray(consumers)?consumers:[]).map((c) => <option key={c.id} value={c.id}>{c.username||c.id}</option>)}</select></div>
                          <div className="col-md-6 mb-3"><label className="form-label">Service</label><select className="form-select" value={subscriptionForm.service_id} onChange={(e) => setSubscriptionForm({...subscriptionForm, service_id: e.target.value})}><option value="">Select...</option>{(Array.isArray(services)?services:[]).map((s) => <option key={s.id} value={s.id}>{s.name||s.id}</option>)}</select></div>
                        </div>
                        <div className="row">
                          <div className="col-md-4 mb-3"><label className="form-label">Plan</label><select className="form-select" value={subscriptionForm.plan_id} onChange={(e) => setSubscriptionForm({...subscriptionForm, plan_id: e.target.value})}><option value="">Select...</option>{plans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
                          <div className="col-md-4 mb-3"><label className="form-label">Start Date</label><input type="date" className="form-control" value={subscriptionForm.start_date} onChange={(e) => setSubscriptionForm({...subscriptionForm, start_date: e.target.value})} /></div>
                          <div className="col-md-4 mb-3"><label className="form-label">End Date</label><input type="date" className="form-control" value={subscriptionForm.end_date} onChange={(e) => setSubscriptionForm({...subscriptionForm, end_date: e.target.value})} /></div>
                        </div>
                      </>
                    )}
                    {modalType === 'usageEvent' && (
                      <>
                        <div className="row">
                          <div className="col-md-6 mb-3"><label className="form-label">Consumer</label><select className="form-select" value={usageEventForm.consumer_id} onChange={(e) => setUsageEventForm({...usageEventForm, consumer_id: e.target.value})}><option value="">Select...</option>{(Array.isArray(consumers)?consumers:[]).map((c) => <option key={c.id} value={c.id}>{c.username||c.id}</option>)}</select></div>
                          <div className="col-md-6 mb-3"><label className="form-label">Service</label><select className="form-select" value={usageEventForm.service_id} onChange={(e) => setUsageEventForm({...usageEventForm, service_id: e.target.value})}><option value="">Select...</option>{(Array.isArray(services)?services:[]).map((s) => <option key={s.id} value={s.id}>{s.name||s.id}</option>)}</select></div>
                        </div>
                        <div className="row">
                          <div className="col-md-4 mb-3"><label className="form-label">Route</label><select className="form-select" value={usageEventForm.route_id} onChange={(e) => setUsageEventForm({...usageEventForm, route_id: e.target.value})}><option value="">Select...</option>{(Array.isArray(routes)?routes:[]).map((r) => <option key={r.id} value={r.id}>{r.name||r.id}</option>)}</select></div>
                          <div className="col-md-4 mb-3"><label className="form-label">Resource</label><input className="form-control" value={usageEventForm.resource} onChange={(e) => setUsageEventForm({...usageEventForm, resource: e.target.value})} /></div>
                          <div className="col-md-4 mb-3"><label className="form-label">Status</label><select className="form-select" value={usageEventForm.status} onChange={(e) => setUsageEventForm({...usageEventForm, status: e.target.value})}><option>success</option><option>failure</option></select></div>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn me-auto" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{editingItem ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default MonetizationView;
