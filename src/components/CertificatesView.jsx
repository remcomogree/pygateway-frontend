import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/AppState';
import { IconPlus, IconEdit, IconTrash, IconCertificate } from '@tabler/icons-react';

const CertificatesView = () => {
  const { rawApi } = useAppState();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [formData, setFormData] = useState({ name: '', cert: '', key: '', sni: '', enabled: true });

  const load = async () => {
    setLoading(true); setError(null);
    try { const data = await rawApi.request('/api/v1/certificates'); setCertificates(data.data || data || []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => { setEditingCert(null); setFormData({ name: '', cert: '', key: '', sni: '', enabled: true }); setShowModal(true); };
  const openEdit = (c) => { setEditingCert(c); setFormData({ name: c.name||'', cert: c.cert||'', key: c.key||'', sni: c.sni||'', enabled: c.enabled!==false }); setShowModal(true); };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (editingCert) {
        await rawApi.request(`/api/v1/certificates/${editingCert.id}`, { method: 'PUT', body: formData });
      } else {
        await rawApi.request('/api/v1/certificates', { method: 'POST', body: formData });
      }
      setShowModal(false); load();
    } catch (err) { setError(err.message); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete certificate "${c.name}"?`)) return;
    try { await rawApi.request(`/api/v1/certificates/${c.id}`, { method: 'DELETE' }); load(); }
    catch (err) { setError(err.message); }
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2">Loading certificates...</p></div>;

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col"><h2 className="page-title">Certificates</h2></div>
          <div className="col-auto"><button className="btn btn-primary" onClick={openCreate}><IconPlus size={16} className="me-1" /> Add Certificate</button></div>
        </div>
      </div>
      {error && <div className="alert alert-danger mt-3">{error}</div>}
      <div className="card mt-3">
        <div className="table-responsive">
          <table className="table table-vcenter card-table">
            <thead><tr><th>Name</th><th>SNI</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {certificates.length === 0 ? (
                <tr><td colSpan="4" className="text-center text-muted py-4">No certificates</td></tr>
              ) : certificates.map((c) => (
                <tr key={c.id}>
                  <td className="fw-bold"><IconCertificate size={16} className="me-1 text-muted" />{c.name || c.id?.substring(0,12)}</td>
                  <td><code>{c.sni || '—'}</code></td>
                  <td><span className={`badge ${c.enabled!==false?'bg-success':'bg-secondary'}`}>{c.enabled!==false?'Active':'Inactive'}</span></td>
                  <td>
                    <div className="btn-list">
                      <button className="btn btn-sm" onClick={() => openEdit(c)}><IconEdit size={16} /></button>
                      <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(c)}><IconTrash size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal modal-blur fade show" style={{display:'block'}} onClick={(e)=>{if(e.target===e.currentTarget)setShowModal(false)}}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content">
                <form onSubmit={handleSave}>
                  <div className="modal-header">
                    <h5 className="modal-title">{editingCert ? 'Edit Certificate' : 'Add Certificate'}</h5>
                    <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                  </div>
                  <div className="modal-body">
                    <div className="mb-3"><label className="form-label">Name</label><input className="form-control" value={formData.name} onChange={(e)=>setFormData({...formData,name:e.target.value})} /></div>
                    <div className="mb-3"><label className="form-label">Certificate (PEM)</label><textarea className="form-control" rows="5" value={formData.cert} onChange={(e)=>setFormData({...formData,cert:e.target.value})} placeholder="-----BEGIN CERTIFICATE-----" /></div>
                    <div className="mb-3"><label className="form-label">Private Key (PEM)</label><textarea className="form-control" rows="5" value={formData.key} onChange={(e)=>setFormData({...formData,key:e.target.value})} placeholder="-----BEGIN PRIVATE KEY-----" /></div>
                    <div className="mb-3"><label className="form-label">SNI</label><input className="form-control" value={formData.sni} onChange={(e)=>setFormData({...formData,sni:e.target.value})} /></div>
                    <label className="form-check"><input type="checkbox" className="form-check-input" checked={formData.enabled} onChange={(e)=>setFormData({...formData,enabled:e.target.checked})} /><span className="form-check-label">Enabled</span></label>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn me-auto" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{editingCert ? 'Update' : 'Create'}</button>
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

export default CertificatesView;
