import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppState';
import { IconPlus, IconEdit, IconTrash } from '@tabler/icons-react';

const WorkspacesView = () => {
  const { state, api } = useAppState();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      await Promise.all([api.loadWorkspaces(0, 1000), api.loadServices(0, 1000)]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);
  useEffect(() => { setWorkspaces(state.workspaces || []); }, [state.workspaces]);
  useEffect(() => { setServices(state.services || []); }, [state.services]);

  const getServiceCount = (wsId) => services.filter((s) => s.workspace_id === wsId).length;

  const handleDelete = async (ws) => {
    if (!window.confirm(`Delete workspace "${ws.name}"?`)) return;
    try { await api.deleteWorkspace(ws.id); loadData(); } catch (err) { setError(err.message); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const form = e.target;
    const data = {
      name: form.name.value.trim(),
      description: form.description.value.trim(),
      enabled: form.enabled.checked,
    };
    if (!data.name) return;
    try {
      if (editingWorkspace) {
        await api.updateWorkspace(editingWorkspace.id, data);
      } else {
        await api.createWorkspace(data);
      }
      setShowCreateModal(false);
      setEditingWorkspace(null);
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status" />
        <p className="mt-2 text-muted">Loading workspaces...</p>
      </div>
    );
  }

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col">
            <h2 className="page-title">Workspaces</h2>
          </div>
          <div className="col-auto">
            <button className="btn btn-primary" onClick={() => { setEditingWorkspace(null); setShowCreateModal(true); }}>
              <IconPlus size={16} className="me-1" /> Create Workspace
            </button>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger mt-3">{error}</div>}

      <div className="card mt-3">
        <div className="table-responsive">
          <table className="table table-vcenter card-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Services</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.length === 0 ? (
                <tr><td colSpan="6" className="text-center text-muted py-4">No workspaces found</td></tr>
              ) : workspaces.map((ws) => (
                <tr key={ws.id}>
                  <td>
                    <button
                      className="btn btn-link p-0"
                      onClick={() => navigate(`/api/services?workspace=${ws.id}`)}
                    >
                      {ws.name}
                    </button>
                  </td>
                  <td className="text-muted">{ws.description || '—'}</td>
                  <td><span className="badge bg-blue-lt">{getServiceCount(ws.id)}</span></td>
                  <td>
                    <span className={`badge ${ws.enabled !== false ? 'bg-success' : 'bg-secondary'}`}>
                      {ws.enabled !== false ? 'Enabled' : 'Disabled'}
                    </span>
                  </td>
                  <td className="text-muted">{ws.created_at ? new Date(ws.created_at).toLocaleDateString() : '—'}</td>
                  <td>
                    <div className="btn-list">
                      <button className="btn btn-sm" onClick={() => { setEditingWorkspace(ws); setShowCreateModal(true); }}>
                        <IconEdit size={16} />
                      </button>
                      <button className="btn btn-sm btn-ghost-danger" onClick={() => handleDelete(ws)}>
                        <IconTrash size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <>
          <div className="modal-backdrop fade show" />
          <div className="modal modal-blur fade show" style={{ display: 'block' }} role="dialog" aria-modal="true"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowCreateModal(false); setEditingWorkspace(null); } }}>
            <div className="modal-dialog modal-dialog-centered" role="document">
              <div className="modal-content">
                <form onSubmit={handleSave}>
                  <div className="modal-header">
                    <h5 className="modal-title">{editingWorkspace ? 'Edit Workspace' : 'Create Workspace'}</h5>
                    <button type="button" className="btn-close" onClick={() => { setShowCreateModal(false); setEditingWorkspace(null); }} />
                  </div>
                  <div className="modal-body">
                    <div className="mb-3">
                      <label className="form-label required">Name</label>
                      <input type="text" name="name" className="form-control" defaultValue={editingWorkspace?.name || ''} required />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Description</label>
                      <textarea name="description" className="form-control" rows="3" defaultValue={editingWorkspace?.description || ''} />
                    </div>
                    <div className="mb-3">
                      <label className="form-check">
                        <input type="checkbox" name="enabled" className="form-check-input" defaultChecked={editingWorkspace?.enabled !== false} />
                        <span className="form-check-label">Enabled</span>
                      </label>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn me-auto" onClick={() => { setShowCreateModal(false); setEditingWorkspace(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary">{editingWorkspace ? 'Update' : 'Create'}</button>
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

export default WorkspacesView;
