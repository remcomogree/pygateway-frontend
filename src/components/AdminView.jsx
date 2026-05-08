import React, { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useAppState } from '../context/AppState';
import AuditLogsTab from './admin/AuditLogsTab';
import CertificatesTab from './admin/CertificatesTab';
import { IconFileAnalytics, IconCertificate } from '@tabler/icons-react';

const TABS = [
  { key: 'audit-logs', label: 'Audit Logs', icon: IconFileAnalytics },
  { key: 'certificates', label: 'Certificates', icon: IconCertificate },
];

const AdminView = () => {
  const { state } = useAppState();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('audit-logs');

  useEffect(() => {
    const path = location.pathname.split('/')[2];
    if (path && TABS.some((t) => t.key === path)) setActiveTab(path);
    else setActiveTab('audit-logs');
  }, [location.pathname]);

  const handleTabChange = (key) => {
    setActiveTab(key);
    navigate(`/admin/${key}`);
  };

  const currentUser = state.currentUser || {};

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col">
            <h2 className="page-title">Admin Panel</h2>
            <div className="text-muted mt-1">
              Role: <span className="badge bg-purple-lt">{currentUser.role || 'admin'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            {TABS.map((t) => (
              <li className="nav-item" key={t.key}>
                <a href="#" className={`nav-link${activeTab === t.key ? ' active' : ''}`} onClick={(e) => { e.preventDefault(); handleTabChange(t.key); }}>
                  <t.icon size={16} className="me-1" />{t.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          <Routes>
            <Route index element={<AuditLogsTab />} />
            <Route path="audit-logs" element={<AuditLogsTab />} />
            <Route path="certificates" element={<CertificatesTab />} />
          </Routes>
        </div>
      </div>
    </>
  );
};

export default AdminView;
