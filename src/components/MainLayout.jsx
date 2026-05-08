import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { useAppState } from '../context/AppState';
import { useBackendStatus } from './BackendStatus';
import PyGatewayLogo from './PyGatewayLogo';
import DashboardView from './DashboardView';
import WorkspacesView from './WorkspacesView';
import AdminView from './AdminView';
import ProvidersView from './ProvidersView';
import APIView from './APIView';
import DebugView from './DebugView';
import ConsumersView from './ConsumersView';
import MonetizationView from './MonetizationView';
import AnalyticsView from './AnalyticsView';
import ConfigView from './ConfigView';
import DataplanesView from './DataplanesView';
import {
  IconDashboard,
  IconServer,
  IconSettings,
  IconApi,
  IconBug,
  IconUsers,
  IconCoin,
  IconChartBar,
  IconAdjustments,
  IconCloud,
  IconBuildingStore,
  IconShieldLock,
} from '@tabler/icons-react';

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: IconDashboard, exact: true },
  { to: '/workspaces', label: 'Workspaces', icon: IconBuildingStore },
  { to: '/admin', label: 'Admin', icon: IconShieldLock },
  { to: '/providers', label: 'Providers', icon: IconServer },
  { to: '/api', label: 'API', icon: IconApi },
  { to: '/debug', label: 'Debug', icon: IconBug },
  { to: '/consumers', label: 'Consumers', icon: IconUsers },
  { to: '/monetization', label: 'Monetization', icon: IconCoin },
  { to: '/analytics', label: 'Analytics', icon: IconChartBar },
  { to: '/config', label: 'Configuration', icon: IconAdjustments },
  { to: '/dataplanes', label: 'Dataplanes', icon: IconCloud },
];

const MainLayout = ({ onLogout }) => {
  const location = useLocation();
  const { state, api, actions } = useAppState();
  const [dataLoaded, setDataLoaded] = useState(false);

  const currentUser = state.currentUser || {
    name: 'Administrator',
    email: 'admin@pygateway.com',
    role: 'superadmin',
  };

  useEffect(() => {
    if (!dataLoaded) {
      const loadData = async () => {
        try {
          await Promise.all([
            api.loadWorkspaces(0, 1000),
            api.loadServices(0, 1000),
            api.loadAllRoutes(),
            api.loadPlugins(0, 1000),
            api.loadProviders(0, 1000),
          ]);
        } catch (error) {
          console.error('Failed to load initial data:', error);
        }
        setDataLoaded(true);
      };
      loadData();
    }
  }, [dataLoaded]);

  const handleLogout = () => {
    if (onLogout) onLogout();
    else actions.logout();
  };

  const isActive = (item) => {
    if (item.exact) return location.pathname === item.to;
    return location.pathname.startsWith(item.to);
  };

  return (
    <div className="page">
      {/* Vertical Sidebar */}
      <aside className="navbar navbar-vertical navbar-expand-lg" data-bs-theme="dark">
        <div className="container-fluid">
          {/* Mobile toggle */}
          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#sidebar-menu"
            aria-controls="sidebar-menu"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>

          {/* Brand */}
          <h1 className="navbar-brand navbar-brand-autodark">
            <Link to="/" className="d-flex align-items-center text-decoration-none">
              <PyGatewayLogo size="small" showText={false} />
              <span className="ms-2">PyGateway</span>
            </Link>
          </h1>

          {/* Sidebar nav */}
          <div className="collapse navbar-collapse" id="sidebar-menu">
            <ul className="navbar-nav pt-lg-3">
              {NAV_ITEMS.map((item) => (
                <li className="nav-item" key={item.to}>
                  <Link
                    className={`nav-link${isActive(item) ? ' active' : ''}`}
                    to={item.to}
                  >
                    <span className="nav-link-icon d-md-none d-lg-inline-block">
                      <item.icon size={20} stroke={1.5} />
                    </span>
                    <span className="nav-link-title">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </aside>

      {/* Page wrapper */}
      <div className="page-wrapper">
        {/* Top header bar */}
        <header className="navbar navbar-expand-md d-none d-lg-flex d-print-none">
          <div className="container-fluid">
            <div className="navbar-nav flex-row order-md-last">
              <div className="nav-item dropdown">
                <a
                  href="#"
                  className="nav-link d-flex lh-1 text-reset p-0"
                  data-bs-toggle="dropdown"
                  aria-label="Open user menu"
                  onClick={(e) => e.preventDefault()}
                >
                  <span className="avatar avatar-sm bg-primary-lt">
                    {currentUser.name?.charAt(0)?.toUpperCase() || 'A'}
                  </span>
                  <div className="d-none d-xl-block ps-2">
                    <div>{currentUser.name}</div>
                    <div className="mt-1 small text-muted">{currentUser.role}</div>
                  </div>
                </a>
                <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
                  <span className="dropdown-header">{currentUser.email}</span>
                  <div className="dropdown-divider" />
                  <button className="dropdown-item" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="page-body">
          <div className="container-fluid">
            <Routes>
              <Route index element={<DashboardView />} />
              <Route path="workspaces" element={<WorkspacesView />} />
              <Route path="admin/*" element={<AdminView />} />
              <Route path="providers" element={<ProvidersView />} />
              <Route path="api/*" element={<APIView />} />
              <Route path="debug" element={<DebugView />} />
              <Route path="consumers" element={<ConsumersView />} />
              <Route path="monetization" element={<MonetizationView />} />
              <Route path="analytics" element={<AnalyticsView />} />
              <Route path="config" element={<ConfigView />} />
              <Route path="dataplanes" element={<DataplanesView />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MainLayout;
