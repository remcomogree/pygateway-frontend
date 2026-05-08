import React, { useState, useMemo } from 'react';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';
import DataTable from '../shared/DataTable';
import FilterStatusBar from '../shared/FilterStatusBar';
import StatusBadge from '../shared/StatusBadge';
import WorkspaceModal from '../modals/WorkspaceModal';

const WorkspacesTab = () => {
  const { state, api } = useAppState();
  const toast = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Compute service counts from pre-loaded data
  const serviceCountsByWorkspace = useMemo(() => {
    if (!state.services) return {};
    const counts = {};
    for (const ws of state.workspaces || []) {
      counts[ws.id] = state.services.filter(s => s.workspace_id === ws.id).length;
    }
    return counts;
  }, [state.workspaces, state.services]);

  // Filter workspaces by search query
  const filteredWorkspaces = useMemo(() => {
    if (!state.workspaces) return [];
    if (!searchQuery.trim()) return state.workspaces;
    const q = searchQuery.toLowerCase();
    return state.workspaces.filter(ws =>
      ws.name.toLowerCase().includes(q) ||
      (ws.description && ws.description.toLowerCase().includes(q))
    );
  }, [state.workspaces, searchQuery]);

  // Handlers
  const handleSelectWorkspace = (workspace) => {
    if (state.selectedWorkspaceId === workspace.id) {
      api.setSelectedWorkspaceId(null);
    } else {
      api.setSelectedWorkspaceId(workspace.id);
    }
  };

  const handleCreate = () => { setEditingWorkspace(null); setShowModal(true); };
  const handleEdit = (workspace) => { setEditingWorkspace(workspace); setShowModal(true); };

  const handleDelete = async (workspace) => {
    const count = state.services?.filter(s => s.workspace_id === workspace.id).length || 0;
    if (count > 0) {
      toast.warning(`Cannot delete '${workspace.name}' — it has ${count} service(s). Remove them first.`);
      return;
    }
    if (!confirm(`Delete workspace '${workspace.name}'? This cannot be undone.`)) return;
    setLoading(true);
    try {
      await api.deleteWorkspace(workspace.id);
    } catch (error) {
      toast.error(`Failed to delete workspace: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleModalSave = async (workspaceData) => {
    setLoading(true);
    try {
      if (editingWorkspace) {
        await api.updateWorkspace(editingWorkspace.id, workspaceData);
      } else {
        await api.createWorkspace(workspaceData);
      }
      setShowModal(false);
    } catch (error) {
      toast.error(`Failed to ${editingWorkspace ? 'update' : 'create'} workspace: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Column definitions
  const columns = useMemo(() => [
    { header: 'Name', accessor: 'name' },
    { header: 'Description', accessor: 'description', render: (val) => val || '-' },
    { header: 'Status', accessor: 'enabled', render: (val) => <StatusBadge enabled={val} /> },
    { header: 'Services', accessor: 'id', render: (_, row) => serviceCountsByWorkspace[row.id] ?? '...' },
  ], [serviceCountsByWorkspace]);

  // Action buttons
  const actions = [
    { label: 'Edit', variant: 'primary', onClick: (row) => handleEdit(row), disabled: loading },
    { label: 'Delete', variant: 'danger', onClick: (row) => handleDelete(row), disabled: loading },
  ];

  // Filter bar
  const selectedWsName = state.selectedWorkspaceId
    ? state.workspaces?.find(w => w.id === state.selectedWorkspaceId)?.name
    : null;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Workspaces</h3>
        <button className="btn btn-success" onClick={handleCreate} disabled={loading}>
          Add Workspace
        </button>
      </div>

      <FilterStatusBar filters={[
        { icon: '📂', label: 'Workspace', name: selectedWsName, onDeselect: () => api.setSelectedWorkspaceId(null) },
      ]} />

      <div className="position-relative mb-3">
        <input
          type="text"
          placeholder="Search workspaces by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="form-control"
        />
        {searchQuery && (
          <button className="btn btn-ghost-secondary btn-sm" style={{position:'absolute',right:'4px',top:'50%',transform:'translateY(-50%)'}} onClick={() => setSearchQuery('')} title="Clear search">&times;</button>
        )}
      </div>

      <DataTable
        columns={columns}
        data={filteredWorkspaces}
        actions={actions}
        selectedId={state.selectedWorkspaceId}
        onSelect={handleSelectWorkspace}
        nameAccessor="name"
        pagination={{ currentPage, pageSize }}
        onPageChange={(offset) => setCurrentPage(offset / pageSize)}
        onPageSizeChange={(_, newSize) => { setPageSize(newSize); setCurrentPage(0); }}
        emptyMessage={searchQuery
          ? `No workspaces match "${searchQuery}".`
          : 'No workspaces found. Create your first workspace to get started.'
        }
      />

      {showModal && (
        <WorkspaceModal
          workspace={editingWorkspace}
          onSave={handleModalSave}
          onCancel={() => setShowModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

export default WorkspacesTab;
