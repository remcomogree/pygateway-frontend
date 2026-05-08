import React, { useState, useEffect, useMemo } from 'react';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';
import DataTable from '../shared/DataTable';
import FilterStatusBar from '../shared/FilterStatusBar';
import StatusBadge from '../shared/StatusBadge';
import PluginModal from '../modals/PluginModal';

const PluginsTab = () => {
  const { state, api } = useAppState();
  const toast = useToast();
  const [serviceFilter, setServiceFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(30);

  // Sync service filter from global selection
  useEffect(() => {
    if (state.selectedServiceId) {
      setServiceFilter(state.selectedServiceId);
    }
  }, [state.selectedServiceId]);

  // Hierarchical filtering: route > service > workspace
  const filteredPlugins = useMemo(() => {
    if (!state.plugins) return [];
    let plugins = state.plugins;
    const effectiveServiceFilter = state.selectedServiceId || serviceFilter;

    if (state.selectedRouteId) {
      // Route-level: show only plugins for this route
      plugins = plugins.filter(p => p.route_id === state.selectedRouteId);
    } else if (effectiveServiceFilter) {
      // Service-level: show plugins for this service + its routes
      const routeIds = new Set(
        (state.routes?.filter(r => r.service_id === effectiveServiceFilter) || []).map(r => r.id)
      );
      plugins = plugins.filter(p =>
        p.service_id === effectiveServiceFilter ||
        (p.route_id && routeIds.has(p.route_id))
      );
    } else if (state.selectedWorkspaceId) {
      // Workspace-level: show plugins for all services/routes in this workspace
      const serviceIds = new Set(
        (state.services?.filter(s => s.workspace_id === state.selectedWorkspaceId) || []).map(s => s.id)
      );
      const routeIds = new Set(
        (state.routes?.filter(r => serviceIds.has(r.service_id)) || []).map(r => r.id)
      );
      plugins = plugins.filter(p =>
        p.workspace_id === state.selectedWorkspaceId ||
        (p.service_id && serviceIds.has(p.service_id)) ||
        (p.route_id && routeIds.has(p.route_id))
      );
    }

    return plugins;
  }, [state.plugins, state.services, state.routes, state.selectedWorkspaceId, state.selectedServiceId, state.selectedRouteId, serviceFilter]);

  // Helpers
  const getServiceName = (serviceId) => {
    if (!serviceId) return '-';
    const svc = state.services?.find(s => s.id === serviceId);
    return svc ? svc.name : serviceId.substring(0, 8) + '...';
  };

  const getRouteName = (routeId) => {
    if (!routeId) return '-';
    const route = state.routes?.find(r => r.id === routeId);
    return route ? route.name : routeId.substring(0, 8) + '...';
  };

  const getScope = (plugin) => {
    if (plugin.route_id) return 'Route';
    if (plugin.service_id) return 'Service';
    if (plugin.workspace_id) return 'Workspace';
    return 'Global';
  };

  // Handlers
  const handleEdit = (plugin) => { setEditingPlugin(plugin); setShowCreateModal(true); };
  const handleCreatePlugin = () => { setEditingPlugin(null); setShowCreateModal(true); };
  const handleCloseModal = () => { setShowCreateModal(false); setEditingPlugin(null); };

  const handleDelete = async (plugin) => {
    if (!confirm(`Delete plugin '${plugin.name}'? This cannot be undone.`)) return;
    setLoading(true);
    try { await api.deletePlugin(plugin.id); }
    catch (error) { toast.error(`Failed to delete plugin: ${error.message}`); }
    finally { setLoading(false); }
  };

  // Column definitions
  const columns = useMemo(() => [
    { header: 'Name', accessor: 'name' },
    {
      header: 'Scope', accessor: 'route_id',
      render: (_, row) => {
        const scope = getScope(row);
        return <span className={`badge ${scope === 'Global' ? 'bg-secondary-lt' : 'bg-primary-lt'}`}>{scope}</span>;
      },
    },
    { header: 'Service', accessor: 'service_id', render: (val) => getServiceName(val) },
    { header: 'Route', accessor: 'route_id', render: (val) => getRouteName(val) },
    { header: 'Status', accessor: 'enabled', render: (val) => <StatusBadge enabled={val} /> },
  ], [state.services, state.routes]);

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
  const selectedRouteName = state.selectedRouteId
    ? state.routes?.find(r => r.id === state.selectedRouteId)?.name : null;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Plugins</h3>
        <button className="btn btn-success" onClick={handleCreatePlugin} disabled={loading}>
          Add Plugin
        </button>
      </div>

      <FilterStatusBar filters={[
        { icon: '📂', label: 'Workspace', name: selectedWsName, onDeselect: () => api.setSelectedWorkspaceId(null) },
        { icon: '🎯', label: 'Service', name: selectedSvcName, onDeselect: () => api.setSelectedServiceId(null) },
        { icon: '🛣️', label: 'Route', name: selectedRouteName, onDeselect: () => api.setSelectedRouteId(null) },
      ]} />

      {/* Service dropdown filter */}
      <div className="mb-3">
        <div className="d-flex gap-2 align-items-center">
          <label htmlFor="pluginServiceFilter" className="form-label mb-0">Filter by Service:</label>
          <select
            id="pluginServiceFilter"
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
        data={filteredPlugins}
        actions={actions}
        pagination={{ currentPage, pageSize }}
        onPageChange={(offset) => setCurrentPage(offset / pageSize)}
        onPageSizeChange={(_, newSize) => { setPageSize(newSize); setCurrentPage(0); }}
        emptyMessage={state.selectedWorkspaceId
          ? 'No plugins configured for this workspace.'
          : 'No plugins configured.'
        }
      />

      <PluginModal
        isOpen={showCreateModal}
        plugin={editingPlugin}
        onClose={handleCloseModal}
        onPluginCreated={() => setShowCreateModal(false)}
        onPluginUpdated={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export default PluginsTab;
