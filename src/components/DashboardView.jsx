import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppState } from '../context/AppState';
import {
  IconBuildingStore,
  IconServer,
  IconRoute,
  IconPuzzle,
  IconUsers,
  IconCloud,
  IconSettings,
} from '@tabler/icons-react';

const STAT_CARDS = [
  { key: 'workspaces', label: 'Workspaces', icon: IconBuildingStore, color: 'purple', nav: '/workspaces' },
  { key: 'services', label: 'Services', icon: IconServer, color: 'blue', nav: '/api/services' },
  { key: 'routes', label: 'Routes', icon: IconRoute, color: 'green', nav: '/api/routes' },
  { key: 'plugins', label: 'Plugins', icon: IconPuzzle, color: 'red', nav: '/api/plugins' },
  { key: 'consumers', label: 'Consumers', icon: IconUsers, color: 'cyan', nav: '/consumers' },
];

const DashboardView = () => {
  const { state, api, rawApi } = useAppState();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dataplanes, setDataplanes] = useState([]);
  const [configVersion, setConfigVersion] = useState('Unknown');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        await Promise.all([
          api.loadWorkspaces(0, 1000),
          api.loadServices(0, 1000),
          api.loadAllRoutes(),
          api.loadPlugins(0, 1000),
          api.loadConsumers(0, 1000),
          api.loadProviders(0, 1000),
        ]);
        try { setDataplanes(await rawApi.getDataplanes() || []); } catch {}
        try { const v = await rawApi.getVersion(); setConfigVersion(v?.version || 'Unknown'); } catch {}
      } catch (err) {
        setError(`Failed to load dashboard: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const getCount = (key) =>
    state.pagination?.[key]?.total ?? state[key]?.length ?? 0;

  const onlineCount = Array.isArray(dataplanes) ? dataplanes.filter((d) => d.status === 'online').length : 0;
  const totalDp = Array.isArray(dataplanes) ? dataplanes.length : 0;

  const formatLastSeen = (ts) => {
    if (!ts) return 'Never';
    const diff = Math.floor((Date.now() - new Date(ts)) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  if (loading) {
    return (
      <div className="page-header">
        <div className="container-fluid">
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted">Loading dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid">
        <div className="alert alert-danger">{error}</div>
      </div>
    );
  }

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col-auto">
            <h2 className="page-title">Dashboard</h2>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="row row-deck row-cards mt-3">
        {STAT_CARDS.map((c) => (
          <div className="col-sm-6 col-lg-3" key={c.key}>
            <div className="card card-sm cursor-pointer" onClick={() => navigate(c.nav)}>
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-auto">
                    <span className={`bg-${c.color}-lt avatar`}>
                      <c.icon size={24} />
                    </span>
                  </div>
                  <div className="col">
                    <div className="font-weight-medium">{c.label}</div>
                    <div className="text-muted">{getCount(c.key)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Dataplanes */}
        <div className="col-sm-6 col-lg-3">
          <div className="card card-sm cursor-pointer" onClick={() => navigate('/dataplanes')}>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-auto">
                  <span className={`bg-yellow-lt avatar`}>
                    <IconCloud size={24} />
                  </span>
                </div>
                <div className="col">
                  <div className="font-weight-medium">Dataplanes</div>
                  <div className="text-muted">
                    <span className={`status-dot status-dot-animated ${onlineCount > 0 ? 'bg-success' : 'bg-danger'} me-1`} style={{width:8,height:8,borderRadius:'50%',display:'inline-block'}} />
                    {onlineCount}/{totalDp}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Config Version */}
        <div className="col-sm-6 col-lg-3">
          <div className="card card-sm">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-auto">
                  <span className="bg-purple-lt avatar">
                    <IconSettings size={24} />
                  </span>
                </div>
                <div className="col">
                  <div className="font-weight-medium">Config Version</div>
                  <div className="text-muted">{configVersion}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dataplane Details */}
      {totalDp > 0 && (
        <div className="card mt-3">
          <div className="card-header">
            <h3 className="card-title">Dataplane Status</h3>
            <div className="card-actions">
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/dataplanes')}>
                View All
              </button>
            </div>
          </div>
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Name</th>
                  <th>ID</th>
                  <th>Last Seen</th>
                </tr>
              </thead>
              <tbody>
                {dataplanes.map((dp) => (
                  <tr key={dp.id}>
                    <td>
                      <span className={`badge ${dp.status === 'online' ? 'bg-success' : 'bg-danger'}`}>
                        {dp.status}
                      </span>
                    </td>
                    <td>{dp.hostname || dp.name || dp.id}</td>
                    <td><code>{dp.id?.substring(0, 12)}...</code></td>
                    <td>{formatLastSeen(dp.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default DashboardView;
