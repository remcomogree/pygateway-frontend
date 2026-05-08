import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import {
  IconPencil, IconShield, IconTrash, IconBug, IconEye,
} from '@tabler/icons-react';
import { useAppState } from '../../context/AppState';
import { useToast } from '../../context/ToastContext';
import DataTable from '../shared/DataTable';
import FilterStatusBar from '../shared/FilterStatusBar';
import StatusBadge from '../shared/StatusBadge';
import ServiceModal from '../modals/ServiceModal';
import ABACPolicyModal from '../modals/ABACPolicyModal';
import ServiceVisualizeModal from '../modals/ServiceVisualizeModal';

const ServicesTab = () => {
  const { state, api } = useAppState();
  const toast = useToast();
  const location = useLocation();
  const [workspaceFilter, setWorkspaceFilter] = useState('');
  const [workspaceName, setWorkspaceName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingService, setEditingService] = useState(null);
  const [showAbacPolicyModal, setShowAbacPolicyModal] = useState(false);
  const [selectedServiceForAbac, setSelectedServiceForAbac] = useState(null);
  const [visualizeService, setVisualizeService] = useState(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // Sync workspace filter from global state or URL params
  useEffect(() => {
    if (state.selectedWorkspaceId) {
      setWorkspaceFilter(state.selectedWorkspaceId);
      const ws = state.workspaces?.find(w => w.id === state.selectedWorkspaceId);
      setWorkspaceName(ws?.name || 'Selected Workspace');
    } else {
      const params = new URLSearchParams(location.search);
      const wsId = params.get('workspace');
      const wsName = params.get('workspaceName');
      if (wsId) {
        setWorkspaceFilter(wsId);
        setWorkspaceName(wsName || 'Selected Workspace');
      } else {
        setWorkspaceFilter('');
        setWorkspaceName('');
      }
    }
  }, [state.selectedWorkspaceId, location.search, state.workspaces]);

  // Filter services by workspace + search
  const filteredServices = useMemo(() => {
    if (!state.services) return [];
    let services = state.services;
    if (workspaceFilter) {
      services = services.filter(s => s.workspace_id === workspaceFilter);
    }
    if (!searchQuery.trim()) return services;
    const q = searchQuery.toLowerCase();
    return services.filter(s => {
      if (s.name.toLowerCase().includes(q)) return true;
      if (s.path && s.path.toLowerCase().includes(q)) return true;
      // Resolve host/port/protocol from provider when service fields are null
      const provider = s.provider_id ? state.providers?.find(p => p.id === s.provider_id) : null;
      const host = s.host || provider?.host || '';
      const port = s.port || provider?.port || '';
      const protocol = provider?.protocol || s.protocol || 'http';
      if (host && host.toLowerCase().includes(q)) return true;
      if (port && String(port).includes(q)) return true;
      if (protocol && protocol.toLowerCase().includes(q)) return true;
      // Match against full computed endpoint (protocol://host:port)
      const endpoint = `${protocol}://${host}${port ? ':' + port : ''}`.toLowerCase();
      if (endpoint.includes(q)) return true;
      // Match against provider name
      if (provider?.name && provider.name.toLowerCase().includes(q)) return true;
      return false;
    });
  }, [state.services, state.providers, searchQuery, workspaceFilter]);

  // Handlers
  const handleSelectService = (service) => {
    if (state.selectedServiceId === service.id) {
      api.setSelectedServiceId(null);
    } else {
      api.setSelectedServiceId(service.id);
    }
  };

  const clearFilter = () => {
    setCurrentPage(0);
    if (state.selectedWorkspaceId) {
      api.setSelectedWorkspaceId(null);
    } else {
      setWorkspaceFilter('');
      setWorkspaceName('');
      window.history.replaceState({}, '', window.location.pathname);
    }
  };

  const handleCreateService = () => { setEditingService(null); setShowCreateModal(true); };
  const handleEditService = (service) => { setEditingService(service); setShowCreateModal(true); };
  const handleCloseModal = () => { 
    setShowCreateModal(false); 
    setEditingService(null); 
    setShowAbacPolicyModal(false); 
    setSelectedServiceForAbac(null); 
    setVisualizeService(null);
  };
  const handleManagePolicy = (service) => { 
    setSelectedServiceForAbac(service); 
    setShowAbacPolicyModal(true); 
  };

  const handleDelete = async (service) => {
    if (!confirm(`Delete service '${service.name}'? This cannot be undone.`)) return;
    setLoading(true);
    try { await api.deleteService(service.id); }
    catch (error) { toast.error(`Failed to delete service: ${error.message}`); }
    finally { setLoading(false); }
  };

  const SS_KEY = 'pygateway_debug_services';

  const readDebugStorage = () => {
    try {
      const raw = sessionStorage.getItem(SS_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      // Purge expired entries
      const now = Date.now();
      const valid = Object.fromEntries(Object.entries(parsed).filter(([, exp]) => exp > now));
      return valid;
    } catch { return {}; }
  };

  const writeDebugStorage = (map) => {
    try { sessionStorage.setItem(SS_KEY, JSON.stringify(map)); } catch { /* ignore */ }
  };

  const [debugServices, setDebugServices] = useState(() => readDebugStorage());

  // Restore any remaining timers on mount (e.g. when navigating back to the page)
  useEffect(() => {
    const restored = readDebugStorage();
    if (Object.keys(restored).length === 0) return;
    setDebugServices(restored);
    const now = Date.now();
    Object.entries(restored).forEach(([id, expiry]) => {
      const remaining = expiry - now;
      if (remaining > 0) {
        setTimeout(() => {
          setDebugServices(prev => {
            const next = { ...prev };
            delete next[id];
            writeDebugStorage(next);
            return next;
          });
        }, remaining);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isDebugging = (serviceId) => {
    const expiry = debugServices[serviceId];
    return expiry != null && Date.now() < expiry;
  };

  const enableDebug = async (service) => {
    try {
      await api.enableDebug(service.id);
      const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes
      setDebugServices(prev => {
        const next = { ...prev, [service.id]: expiry };
        writeDebugStorage(next);
        return next;
      });
      toast.success('Debug enabled for 10 minutes.');
      setTimeout(() => {
        setDebugServices(prev => {
          const next = { ...prev };
          delete next[service.id];
          writeDebugStorage(next);
          return next;
        });
      }, 10 * 60 * 1000);
    } catch (error) { toast.error(`Failed to enable debug: ${error.message}`); }
  };

  // Helpers
  const getProviderDisplay = (service) => {
    if (!service.provider_id) return 'Manual';
    const provider = state.providers?.find(p => p.id === service.provider_id);
    return provider ? provider.name : 'Unknown';
  };

  const getEndpoint = (service) => {
    const provider = service.provider_id ? state.providers?.find(p => p.id === service.provider_id) : null;
    const protocol = provider?.protocol || service.protocol || 'http';
    const host = service.host || provider?.host || '-';
    const port = service.port || provider?.port || '';
    return `${protocol}://${host}${port ? ':' + port : ''}`;
  };

  // Column definitions — reduced from 9 to 6 columns
  const columns = useMemo(() => [
    { header: 'Name', accessor: 'name' },
    { header: 'Provider', accessor: 'provider_id', render: (_, row) => getProviderDisplay(row) },
    { header: 'Endpoint', accessor: 'host', render: (_, row) => getEndpoint(row) },
    { header: 'Path', accessor: 'path', render: (val) => val || '/' },
    { header: 'Status', accessor: 'enabled', render: (val) => <StatusBadge enabled={val} /> },
  ], [state.providers]);

  // Action icons — icon-only buttons with tooltips
  const actions = [
    {
      icon: IconPencil,
      title: 'Edit service',
      variant: 'ghost-primary',
      onClick: (row) => handleEditService(row),
      disabled: loading,
    },
    {
      icon: IconShield,
      title: 'Manage ABAC policy',
      variant: 'ghost-secondary',
      onClick: (row) => handleManagePolicy(row),
      disabled: loading,
    },
    {
      icon: IconEye,
      title: 'Visualize service pipeline',
      variant: 'ghost-cyan',
      onClick: (row) => setVisualizeService(row),
      disabled: loading,
    },
    {
      key: (row) => `debug-${row.id}`,
      icon: IconBug,
      title: (row) => isDebugging(row.id) ? 'Debug active — ~10 min remaining' : 'Enable debug for 10 minutes',
      variant: (row) => isDebugging(row.id) ? 'success' : 'ghost-azure',
      disabled: (row) => loading || isDebugging(row.id),
      onClick: (row) => enableDebug(row),
    },
    {
      icon: IconTrash,
      title: 'Delete service',
      variant: 'ghost-danger',
      onClick: (row) => handleDelete(row),
      disabled: loading,
    },
  ];

  // Filter bar
  const selectedWsName = state.selectedWorkspaceId
    ? state.workspaces?.find(w => w.id === state.selectedWorkspaceId)?.name
    : null;
  const selectedSvcName = state.selectedServiceId
    ? state.services?.find(s => s.id === state.selectedServiceId)?.name
    : null;

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3 className="mb-0">Services</h3>
        <button className="btn btn-success" onClick={handleCreateService} disabled={loading}>
          Add Service
        </button>
      </div>

      <FilterStatusBar filters={[
        { icon: '📂', label: 'Workspace', name: selectedWsName, onDeselect: () => api.setSelectedWorkspaceId(null) },
        { icon: '🎯', label: 'Service', name: selectedSvcName, onDeselect: () => api.setSelectedServiceId(null) },
      ]} />

      {/* Manual workspace filter (URL-based) */}
      {!state.selectedWorkspaceId && workspaceName && (
        <div style={{ backgroundColor: '#e1f5fe', padding: '10px 16px', marginBottom: '1rem', borderLeft: '4px solid #03a9f4', borderRadius: '0 4px 4px 0' }}>
          <strong>Showing services for workspace: {workspaceName}</strong>
          <button className="btn btn-secondary btn-sm" onClick={clearFilter} style={{ marginLeft: '1rem' }}>
            Show All
          </button>
        </div>
      )}

      {/* Workspace dropdown filter */}
      <div className="mb-3">
        <div className="d-flex gap-2 align-items-center">
          <label htmlFor="workspaceFilter" className="form-label mb-0">Filter by Workspace:</label>
          <select
            id="workspaceFilter"
            className="form-select"
            style={{maxWidth:'300px'}}
            value={workspaceFilter}
            onChange={(e) => {
              if (e.target.value === '') { clearFilter(); }
              else {
                setWorkspaceFilter(e.target.value);
                const ws = state.workspaces?.find(w => w.id === e.target.value);
                setWorkspaceName(ws?.name || 'Selected Workspace');
              }
            }}
            disabled={!!state.selectedWorkspaceId}
            title={state.selectedWorkspaceId ? 'Deselect workspace first to change.' : ''}
          >
            <option value="">All Workspaces</option>
            {state.workspaces?.map(ws => (
              <option key={ws.id} value={ws.id}>{ws.name}</option>
            ))}
          </select>
          {workspaceFilter && !state.selectedWorkspaceId && (
            <button className="btn btn-secondary btn-sm" onClick={clearFilter}>Clear</button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="position-relative mb-3">
        <input
          type="text"
          placeholder="Search services by name, host, endpoint, or path..."
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
        data={filteredServices}
        actions={actions}
        selectedId={state.selectedServiceId}
        onSelect={handleSelectService}
        nameAccessor="name"
        pagination={{ currentPage, pageSize }}
        onPageChange={(offset) => setCurrentPage(offset / pageSize)}
        onPageSizeChange={(_, newSize) => { setPageSize(newSize); setCurrentPage(0); }}
        emptyMessage={workspaceFilter
          ? 'No services found for selected workspace.'
          : 'No services found. Create your first service to get started.'
        }
      />

      <ServiceModal
        isOpen={showCreateModal}
        service={editingService}
        onClose={handleCloseModal}
        onServiceCreated={() => setShowCreateModal(false)}
        onServiceUpdated={() => setShowCreateModal(false)}
      />
      <ABACPolicyModal
        isOpen={showAbacPolicyModal}
        policy={selectedServiceForAbac ? { service_id: selectedServiceForAbac.id } : null}
        onClose={handleCloseModal}
        onPolicySaved={async () => {
          // Reload ABAC policies after saving
          await api.loadAbacPolicies(0, 100);
          handleCloseModal();
        }}
      />
      <ServiceVisualizeModal
        isOpen={!!visualizeService}
        service={visualizeService}
        onClose={() => setVisualizeService(null)}
      />
    </div>
  );
};

export default ServicesTab;
