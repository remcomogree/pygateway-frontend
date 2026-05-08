import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppState';
import WorkspacesTab from './api/WorkspacesTab';
import ServicesTab from './api/ServicesTab';
import RoutesTab from './api/RoutesTab';
import PluginsTab from './api/PluginsTab';
import ABACPoliciesTab from './api/ABACPoliciesTab';
import {
  IconBuildingStore,
  IconServer,
  IconRoute,
  IconPuzzle,
  IconShieldLock,
} from '@tabler/icons-react';

const TABS = [
  { key: 'workspaces', label: 'Workspaces', icon: IconBuildingStore },
  { key: 'services', label: 'Services', icon: IconServer },
  { key: 'routes', label: 'Routes', icon: IconRoute },
  { key: 'plugins', label: 'Plugins', icon: IconPuzzle },
  { key: 'abac-policies', label: 'ABAC Policies', icon: IconShieldLock },
];

const APIView = () => {
  const { state, api } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('workspaces');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const path = location.pathname.split('/')[2];
    if (path && TABS.some((t) => t.key === path)) setActiveTab(path);
    else setActiveTab('workspaces');
  }, [location.pathname]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        await Promise.all([
          api.loadWorkspaces(0, 1000),
          api.loadServices(0, 1000),
          api.loadAllRoutes(),
          api.loadPlugins(0, 1000),
          api.loadProviders(0, 1000),
          api.loadAbacPolicies(0, 100),
          api.loadAbacEngineStatus(),
        ]);
      } catch (err) {
        console.error('Failed to load API data:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleTabChange = (key) => {
    setActiveTab(key);
    navigate(`/api/${key}`);
  };

  const getCount = (key) => {
    if (key === 'abac-policies') return state.abacPolicies?.total || 0;
    return state.pagination?.[key]?.total ?? state[key]?.length ?? 0;
  };

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col">
            <h2 className="page-title">API Management</h2>
            <div className="text-muted mt-1">
              {TABS.map((t, i) => (
                <span key={t.key}>
                  {i > 0 && <span className="mx-2">·</span>}
                  <strong>{getCount(t.key)}</strong> {t.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map((tab) => (
              <li className="nav-item" key={tab.key}>
                <a
                  href="#"
                  className={`nav-link${activeTab === tab.key ? ' active' : ''}`}
                  onClick={(e) => { e.preventDefault(); handleTabChange(tab.key); }}
                >
                  <tab.icon size={16} className="me-1" />
                  {tab.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-4">
              <div className="spinner-border text-primary" role="status" />
              <p className="text-muted mt-2">Loading API data...</p>
            </div>
          ) : (
            <Routes>
              <Route index element={<WorkspacesTab />} />
              <Route path="workspaces" element={<WorkspacesTab />} />
              <Route path="services" element={<ServicesTab />} />
              <Route path="routes" element={<RoutesTab />} />
              <Route path="plugins" element={<PluginsTab />} />
              <Route path="abac-policies" element={<ABACPoliciesTab />} />
            </Routes>
          )}
        </div>
      </div>
    </>
  );
};

export default APIView;
