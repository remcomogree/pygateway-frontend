import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/AppState';
import { IconUsers, IconKey, IconShieldLock, IconTrash } from '@tabler/icons-react';

const TABS = [
  { key: 'consumers', label: 'Consumers', icon: IconUsers },
  { key: 'api-keys', label: 'API Keys', icon: IconKey },
  { key: 'plugins', label: 'Security Plugins', icon: IconShieldLock },
];

const SecurityView = () => {
  const { api } = useAppState();
  const [activeTab, setActiveTab] = useState('consumers');
  const [consumers, setConsumers] = useState([]);
  const [apiKeys, setApiKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const [c, k] = await Promise.all([api.loadConsumers(0, 100), api.loadApiKeys?.() || []]);
        setConsumers(c?.data || c || []);
        setApiKeys(k?.data || k || []);
      } catch (err) { setError(err.message); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleDeleteConsumer = async (c) => {
    if (!window.confirm(`Delete consumer "${c.username}"?`)) return;
    try { await api.deleteConsumer(c.id); setConsumers((prev) => prev.filter((x) => x.id !== c.id)); } catch (err) { setError(err.message); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2">Loading security data...</p></div>;

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center"><div className="col"><h2 className="page-title">Security</h2></div></div>
      </div>
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      <div className="card mt-3">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map((t) => (
              <li className="nav-item" key={t.key}>
                <a href="#" className={`nav-link${activeTab === t.key ? ' active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab(t.key); }}>
                  <t.icon size={16} className="me-1" />{t.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          {activeTab === 'consumers' && (
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead><tr><th>Username</th><th>Custom ID</th><th>Status</th><th>Created</th><th>Actions</th></tr></thead>
                <tbody>
                  {(Array.isArray(consumers) ? consumers : []).map((c) => (
                    <tr key={c.id}>
                      <td className="fw-bold">{c.username}</td>
                      <td className="text-muted">{c.custom_id || '—'}</td>
                      <td><span className={`badge ${c.enabled !== false ? 'bg-success' : 'bg-secondary'}`}>{c.enabled !== false ? 'Active' : 'Inactive'}</span></td>
                      <td>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</td>
                      <td><button className="btn btn-sm btn-ghost-danger" onClick={() => handleDeleteConsumer(c)}><IconTrash size={14} /></button></td>
                    </tr>
                  ))}
                  {(!Array.isArray(consumers) || consumers.length === 0) && <tr><td colSpan="5" className="text-center text-muted py-4">No consumers</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'api-keys' && (
            <div className="table-responsive">
              <table className="table table-vcenter">
                <thead><tr><th>Key Name</th><th>Key Preview</th><th>Consumer</th><th>Status</th><th>Actions</th></tr></thead>
                <tbody>
                  {(Array.isArray(apiKeys) ? apiKeys : []).map((k) => (
                    <tr key={k.id}>
                      <td className="fw-bold">{k.name || '—'}</td>
                      <td><code>{k.key ? `${k.key.substring(0, 8)}...` : '—'}</code></td>
                      <td>{k.consumer_id || '—'}</td>
                      <td><span className={`badge ${k.enabled !== false ? 'bg-success' : 'bg-secondary'}`}>{k.enabled !== false ? 'Active' : 'Inactive'}</span></td>
                      <td><button className="btn btn-sm btn-ghost-danger"><IconTrash size={14} /></button></td>
                    </tr>
                  ))}
                  {(!Array.isArray(apiKeys) || apiKeys.length === 0) && <tr><td colSpan="5" className="text-center text-muted py-4">No API keys</td></tr>}
                </tbody>
              </table>
            </div>
          )}
          {activeTab === 'plugins' && (
            <div className="row row-cards">
              {['key-auth', 'basic-auth', 'jwt', 'oauth2', 'rate-limiting', 'ip-restriction', 'cors', 'bot-detection'].map((p) => (
                <div className="col-sm-6 col-lg-3" key={p}>
                  <div className="card">
                    <div className="card-body text-center">
                      <IconShieldLock size={32} className="text-muted mb-2" />
                      <h4 className="mb-1">{p}</h4>
                      <button className="btn btn-sm btn-outline-primary mt-2">Configure</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SecurityView;
