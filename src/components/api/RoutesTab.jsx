import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';
import DataTable from '../shared/DataTable';
import FilterStatusBar from '../shared/FilterStatusBar';
import StatusBadge from '../shared/StatusBadge';
import RouteModal from '../modals/RouteModal';

const RoutesTab = () => {
  const { state, api } = useAppState();
  const toast = useToast();
  const location = useLocation();
  const [serviceFilter, setServiceFilter] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRoute, setEditingRoute] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Sync service filter from URL params or global state
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const svcId = params.get('service');
    const svcName = params.get('serviceName');
    if (svcId) {
      setServiceFilter(svcId);
      setServiceName(svcName || 'Selected Service');
    } else if (state.selectedServiceId) {
      setServiceFilter(state.selectedServiceId);
      const svc = state.services?.find(s => s.id === state.selectedServiceId);
      setServiceName(svc?.name || 'Selected Service');
    } else {
      setServiceFilter('');
      setServiceName('');
    }
  }, [state.selectedServiceId, state.services, location.search]);

  // Filter routes by workspace → service chain
  const filteredRoutes = useMemo(() => {
    if (!state.routes) return [];
    let routes = state.routes;

    // Workspace filter: show only routes belonging to services in selected workspace
    if (state.selectedWorkspaceId) {
      const wsServiceIds = new Set(
        (state.services?.filter(s => s.workspace_id === state.selectedWorkspaceId) || []).map(s => s.id)
      );
      routes = routes.filter(r => wsServiceIds.has(r.service_id));
    }

    // Service filter (global selection takes priority over URL/dropdown)
    const effectiveServiceFilter = state.selectedServiceId || serviceFilter;
    if (effectiveServiceFilter) {
      routes = routes.filter(r => r.service_id === effectiveServiceFilter);
    }

    return routes;
  }, [state.routes, state.services, state.selectedWorkspaceId, state.selectedServiceId, serviceFilter]);

  // Helpers
  const getServiceName = (serviceId) => {
    if (!serviceId) return '-';
    const svc = state.services?.find(s => s.id === serviceId);
    return svc ? svc.name : serviceId.substring(0, 8) + '...';
  };

  // Handlers
  const handleSelectRoute = (route) => {
    if (state.selectedRouteId === route.id) {
      api.setSelectedRouteId(null);
    } else {
      api.setSelectedRouteId(route.id);
    }
  };

  const handleEdit = (route) => { setEditingRoute(route); setShowCreateModal(true); };
  const handleCreateRoute = () => { setEditingRoute(null); setShowCreateModal(true); };
  const handleCloseModal = () => { setShowCreateModal(false); setEditingRoute(null); };

  const handleDelete = async (route) => {
    if (!confirm(`Delete route '${route.name}'? This cannot be undone.`)) return;
    setLoading(true);
    try { await api.deleteRoute(route.id); }
    catch (error) { toast.error(`Failed to delete route: ${error.message}`); }
    finally { setLoading(false); }
  };

  // Column definitions
  const columns = useMemo(() => [
    { header: 'Name', accessor: 'name' },
    { header: 'Service', accessor: 'service_id', render: (val) => getServiceName(val) },
    { header: 'Paths', accessor: 'paths', render: (val) => Array.isArray(val) ? val.join(', ') : (val || '-') },
    { header: 'Hosts', accessor: 'hosts', render: (val) => Array.isArray(val) ? val.join(', ') : (val || '-') },
    { header: 'Status', accessor: 'enabled', render: (val) => <StatusBadge enabled={val} /> },
  ], [state.services]);

  // Action buttons
  const actions = [
    { label: 'Edit', variant: 'primary', onClick: (row) => handleEdit(row), disabled: loading },
    { label: 'Delete', variant: 'danger', onClick: (row) => handleDelete(row), disabled: loading },
  ];

  // Filter bar
  const selectedWsName = state.selectedWorkspaceId
    ? state.workspaces?.find(w => w.id === state.selectedWorkspaceId)?.name : null;
  const selectedSvcName = state.selectedServiceId
    ? state.services?.find(s => s.id === state.selectedServiceId)?.name : null;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Routes</h3>
        <button className="btn btn-success" onClick={handleCreateRoute} disabled={loading}>
          Add Route
        </button>
      </div>

      <FilterStatusBar filters={[
        { icon: '📂', label: 'Workspace', name: selectedWsName, onDeselect: () => api.setSelectedWorkspaceId(null) },
        { icon: '🎯', label: 'Service', name: selectedSvcName, onDeselect: () => api.setSelectedServiceId(null) },
      ]} />

      {/* Manual service filter (URL-based, only when no global selection) */}
      {serviceFilter && !state.selectedWorkspaceId && !state.selectedServiceId && (
        <div style={{ backgroundColor: '#e8f5e8', padding: '10px 16px', marginBottom: '1rem', borderLeft: '4px solid #4caf50', borderRadius: '0 4px 4px 0' }}>
          <strong>Filtered by service: {serviceName}</strong>
          <button className="btn btn-secondary btn-sm" onClick={() => { setServiceFilter(''); setServiceName(''); window.history.replaceState({}, '', '/api/routes'); }} style={{ marginLeft: '1rem' }}>
            Show All
          </button>
        </div>
      )}

      {/* Service dropdown filter */}
      <div className="mb-3">
        <div className="d-flex gap-2 align-items-center">
          <label htmlFor="routeServiceFilter" className="form-label mb-0">Filter by Service:</label>
          <select
            id="routeServiceFilter"
            className="form-select"
            style={{maxWidth:'300px'}}
            value={serviceFilter}
            onChange={(e) => {
              setServiceFilter(e.target.value);
              if (e.target.value) { api.setSelectedServiceId(e.target.value); }
              else if (state.selectedServiceId) { api.setSelectedServiceId(null); }
            }}
          >
            <option value="">All Services</option>
            {state.services?.map(svc => (
              <option key={svc.id} value={svc.id}>{svc.name}</option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredRoutes}
        actions={actions}
        selectedId={state.selectedRouteId}
        onSelect={handleSelectRoute}
        nameAccessor="name"
        pagination={{ currentPage, pageSize }}
        onPageChange={(offset) => setCurrentPage(offset / pageSize)}
        onPageSizeChange={(_, newSize) => { setPageSize(newSize); setCurrentPage(0); }}
        emptyMessage="No routes found. Create your first route to get started."
      />

      <RouteModal
        isOpen={showCreateModal}
        route={editingRoute}
        onClose={handleCloseModal}
        onRouteCreated={() => setShowCreateModal(false)}
        onRouteUpdated={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default RoutesTab;
