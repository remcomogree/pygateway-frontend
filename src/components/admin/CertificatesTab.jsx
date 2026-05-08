import React, { useEffect, useState } from 'react';
import { useAppState } from '../../context/AppState';

const CertificatesTab = () => {
  const { state, rawApi } = useAppState();
  const userRole = state.currentUser?.role || 'readonly';
  const isReadOnly = userRole === 'readonly';

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCert, setEditingCert] = useState(null);
  const [formData, setFormData] = useState({ name: '', cert: '', key: '', sni: '', enabled: true });

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await rawApi.request('/api/v1/certificates');
      setCertificates(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(`Failed to load certificates: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteCertificate = async (certId) => {
    if (!confirm('Are you sure you want to delete this certificate? This action cannot be undone.')) return;
    try {
      await rawApi.request(`/api/v1/certificates/${certId}`, { method: 'DELETE' });
      await loadCertificates();
    } catch (err) {
      setError(`Failed to delete certificate: ${err.message}`);
    }
  };

  const editCertificate = (cert) => {
    setEditingCert(cert);
    setFormData({
      name: cert.name || '',
      cert: cert.data || '',
      key: cert.key || '',
      sni: cert.sni || '',
      enabled: cert.enabled !== false
    });
    setShowModal(true);
  };

  const openCreateModal = () => {
    setEditingCert(null);
    setFormData({ name: '', cert: '', key: '', sni: '', enabled: true });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = { name: formData.name, data: formData.cert, enabled: formData.enabled };
      if (formData.key) submitData.key = formData.key;
      if (formData.sni) submitData.sni = formData.sni;

      if (editingCert) {
        await rawApi.request(`/api/v1/certificates/${editingCert.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      } else {
        await rawApi.request('/api/v1/certificates/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(submitData)
        });
      }
      setShowModal(false);
      await loadCertificates();
    } catch (err) {
      setError(`Failed to save certificate: ${err.message}`);
    }
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Certificates</h3>
        {!isReadOnly && (
          <button className="btn btn-success" onClick={openCreateModal}>Add Certificate</button>
        )}
      </div>

      {error && <div className="alert alert-danger mb-3">{error}</div>}

      {loading ? (
        <div className="text-center py-4"><div className="spinner-border text-primary" /><div className="text-muted mt-2">Loading certificates...</div></div>
      ) : certificates.length === 0 ? (
        <div className="card card-body text-center py-4 text-muted">
          No certificates found. Add your first certificate to get started.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-vcenter">
            <thead>
              <tr>
                <th>Name</th>
                <th>Status</th>
                <th>SNI</th>
                <th>Valid To</th>
                {!isReadOnly && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {certificates.map(cert => (
                <tr key={cert.id}>
                  <td>{cert.name || '-'}</td>
                  <td>
                    <span className={`badge ${cert.enabled !== false ? 'bg-success-lt' : 'bg-secondary-lt'}`}>
                      {cert.enabled !== false ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="small">{cert.sni || '-'}</td>
                  <td>{cert.date ? new Date(cert.date).toLocaleDateString() : '-'}</td>
                  {!isReadOnly && (
                    <td>
                      <div className="d-flex gap-1">
                        <button className="btn btn-primary btn-sm" onClick={() => editCertificate(cert)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => deleteCertificate(cert.id)}>Delete</button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal fade show" style={{display:'block'}} onClick={() => setShowModal(false)}>
            <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{editingCert ? 'Edit Certificate' : 'Add New Certificate'}</h5>
                  <button type="button" className="btn-close" onClick={() => setShowModal(false)} />
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label">Name</label>
                      <input type="text" className="form-control" value={formData.name} required
                        onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Certificate (PEM format)</label>
                      <textarea className="form-control font-monospace" value={formData.cert} rows="6" required
                        onChange={(e) => setFormData(f => ({ ...f, cert: e.target.value }))} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Private Key (PEM format)</label>
                      <textarea className="form-control font-monospace" value={formData.key} rows="6"
                        onChange={(e) => setFormData(f => ({ ...f, key: e.target.value }))}
                        placeholder={editingCert ? 'Leave empty to keep existing key' : ''} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">SNI (comma-separated hostnames)</label>
                      <input type="text" className="form-control" value={formData.sni}
                        onChange={(e) => setFormData(f => ({ ...f, sni: e.target.value }))}
                        placeholder="example.com, *.example.com" />
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn me-auto" onClick={() => setShowModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-success">{editingCert ? 'Update' : 'Create'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default CertificatesTab;
