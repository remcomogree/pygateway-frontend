import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/AppState';
import Pagination from './Pagination';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';

const defaultForm = { name: '', host: '', port: 80, protocol: 'http', path: '/', retries: 5, connect_timeout: 60000, write_timeout: 60000, read_timeout: 60000 };

const ProvidersView = () => {
  const { state, api, rawApi } = useAppState();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState(null);
  const [formData, setFormData] = useState(defaultForm);

  const loadData = async (offset = 0, limit = 15) => {
    setLoading(true);
    setError(null);
    try { await api.loadProviders(offset, limit); } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const openCreate = () => { setEditingProvider(null); setFormData(defaultForm); setShowModal(true); };
  const openEdit = (p) => {
    setEditingProvider(p);
    setFormData({ name: p.name||'', host: p.host||'', port: p.port||80, protocol: p.protocol||'http', path: p.path||'/', retries: p.retries??5, connect_timeout: p.connect_timeout??60000, write_timeout: p.write_timeout??60000, read_timeout: p.read_timeout??60000 });
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const body = { ...formData, port: Number(formData.port), retries: Number(formData.retries), connect_timeout: Number(formData.connect_timeout), write_timeout: Number(formData.write_timeout), read_timeout: Number(formData.read_timeout) };
      if (editingProvider) {
        await rawApi.request(`/api/v1/providers/${editingProvider.id}`, { method: 'PUT', body });
      } else {
        await rawApi.request('/api/v1/providers', { method: 'POST', body });
      }
      setShowModal(false);
      loadData();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (p) => {
    if (!window.confirm(`Delete provider "${p.name}"?`)) return;
    try { await rawApi.request(`/api/v1/providers/${p.id}`, { method: 'DELETE' }); loadData(); }
    catch (err) { setError(err.message); }
  };

  const providers = state.providers || [];
  const pagination = state.pagination?.providers;

  if (loading && !providers.length) {
    return <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2">Loading providers...</p></div>;
  }

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col"><h2 className="page-title">Providers</h2></div>
          <div className="col-auto"><button className="btn btn-primary" onClick={openCreate}><IconPlus size={16} className="me-1" /> Create Provider</button></div>
        </div>
      </div>
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      <div className="card mt-3">
        <div className="table-responsive">
          <table className="table table-vcenter card-table">
            <thead><tr><th>Name</th><th>Host</th><th>Port</th><th>Protocol</th><th>Path</th><th>Actions</th></tr></thead>
            <tbody>
              {providers.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted py-4">No providers found</td></tr>
              ) : providers.map((p) => (
                <tr key={p.id}>
                  <td className="fw-bold">{p.name}</td>
                  <td>{p.host}</td>
                  <td>{p.port}</td>
                  <td><span className="badge bg-azure-lt">{p.protocol || 'http'}</span></td>
                  <td><code>{p.path || '/'}</code></td>
                  <td>
                    <div className="btn-list">
                      <button className="btn btn-sm" onClick={() => openEdit(p)}><IconEdit size={16} /></button>
                      <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(p)}><IconTrash size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {pagination && <div className="card-footer"><Pagination pagination={pagination} onPageChange={(o,l) => loadData(o,l)} onPageSizeChange={(o,l) => loadData(o,l)} /></div>}
      </div>

      {showModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal modal-blur fade show" style={{display:'block'}} role="dialog" aria-modal="true"
            onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={handleSave}>
                  <div className="modal-header">
                    <h5 className="modal-title">{editingProvider ? 'Edit Provider' : 'Create Provider'}</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                  </div>
                  <div className="modal-body">
                    <div className="row">
                      <div className="col-md-6 mb-3"><label className="form-label required">Name</label><input className="form-control" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} required /></div>
                      <div className="col-md-6 mb-3"><label className="form-label required">Host</label><input className="form-control" value={formData.host} onChange={(e)=>setFormData({...formData,host:e.target.value})} required /></div>
                    </div>
                    <div className="row">
                      <div className="col-md-4 mb-3"><label className="form-label">Port</label><input type="number" className="form-control" value={formData.port} onChange={(e)=>setFormData({...formData,port:e.target.value})} /></div>
                      <div className="col-md-4 mb-3"><label className="form-label">Protocol</label><select className="form-select" value={formData.protocol} onChange={(e)=>setFormData({...formData,protocol:e.target.value})}><option>http</option><option>https</option><option>grpc</option><option>grpcs</option></select></div>
                      <div className="col-md-4 mb-3"><label className="form-label">Path</label><input className="form-control" value={formData.path} onChange={(e)=>setFormData({...formData,path:e.target.value})} /></div>
                    </div>
                    <hr/>
                    <div className="row">
                      <div className="col-md-3 mb-3"><label className="form-label">Retries</label><input type="number" className="form-control" value={formData.retries} onChange={(e)=>setFormData({...formData,retries:e.target.value})} /></div>
                      <div className="col-md-3 mb-3"><label className="form-label">Connect Timeout</label><input type="number" className="form-control" value={formData.connect_timeout} onChange={(e)=>setFormData({...formData,connect_timeout:e.target.value})} /></div>
                      <div className="col-md-3 mb-3"><label className="form-label">Write Timeout</label><input type="number" className="form-control" value={formData.write_timeout} onChange={(e)=>setFormData({...formData,write_timeout:e.target.value})} /></div>
                      <div className="col-md-3 mb-3"><label className="form-label">Read Timeout</label><input type="number" className="form-control" value={formData.read_timeout} onChange={(e)=>setFormData({...formData,read_timeout:e.target.value})} /></div>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn me-auto" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{editingProvider ? 'Update' : 'Create'}</button>
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

export default ProvidersView;
