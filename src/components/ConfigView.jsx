import React, { useEffect, useState } from 'react';
import { useAppState } from '../context/AppState';
import { IconDownload, IconRefresh } from '@tabler/icons-react';

const SECTIONS = ['Overview', 'Services', 'Routes', 'Plugins', 'Consumers', 'Certificates', 'Providers', 'Workspaces'];

const ConfigView = () => {
  const { rawApi } = useAppState();
  const [config, setConfig] = useState(null);
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedSection, setSelectedSection] = useState('Overview');

  const load = async () => {
    setLoading(true); setError(null);
    try {
      const [cfg, sys] = await Promise.all([
        rawApi.request('/api/v1/config/sync'),
        rawApi.request('/api/v1/config/system').catch(() => null),
      ]);
      setConfig(cfg);
      setSystemInfo(sys);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const downloadConfig = () => {
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'pygateway-config.json'; a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2">Loading configuration...</p></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;

  const getSectionData = (key) => {
    if (!config) return [];
    const k = key.toLowerCase();
    return Array.isArray(config[k]) ? config[k] : [];
  };

  const statItems = [
    { label: 'Services', value: getSectionData('services').length },
    { label: 'Routes', value: getSectionData('routes').length },
    { label: 'Plugins', value: getSectionData('plugins').length },
    { label: 'Consumers', value: getSectionData('consumers').length },
    { label: 'Certificates', value: getSectionData('certificates').length },
    { label: 'Providers', value: getSectionData('providers').length },
    { label: 'Workspaces', value: getSectionData('workspaces').length },
  ];

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col"><h2 className="page-title">Configuration</h2></div>
          <div className="col-auto">
            <div className="btn-list">
              <button className="btn btn-primary" onClick={downloadConfig}><IconDownload size={16} className="me-1" /> Download JSON</button>
              <button className="btn" onClick={load}><IconRefresh size={16} className="me-1" /> Refresh</button>
            </div>
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div className="card mt-3">
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            {SECTIONS.map((s) => (
              <li className="nav-item" key={s}>
                <a href="#" className={`nav-link${selectedSection === s ? ' active' : ''}`} onClick={(e) => { e.preventDefault(); setSelectedSection(s); }}>{s}</a>
              </li>
            ))}
          </ul>
        </div>
        <div className="card-body">
          {selectedSection === 'Overview' ? (
            <>
              <div className="row row-cards mb-3">
                {statItems.map((s) => (
                  <div className="col-sm-6 col-lg-3" key={s.label}>
                    <div className="card card-sm">
                      <div className="card-body">
                        <div className="fw-bold">{s.label}</div>
                        <div className="text-muted">{s.value}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {systemInfo && (
                <div className="card">
                  <div className="card-header"><h3 className="card-title">System Information</h3></div>
                  <div className="card-body">
                    <div className="datagrid">
                      {Object.entries(systemInfo).map(([k, v]) => (
                        <div className="datagrid-item" key={k}>
                          <div className="datagrid-title">{k}</div>
                          <div className="datagrid-content">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <h3 className="mb-3">{selectedSection} ({getSectionData(selectedSection).length})</h3>
              {getSectionData(selectedSection).length === 0 ? (
                <div className="text-muted text-center py-4">No {selectedSection.toLowerCase()} configured</div>
              ) : (
                <div className="row row-cards">
                  {getSectionData(selectedSection).map((item, i) => (
                    <div className="col-sm-6 col-lg-4" key={item.id || i}>
                      <div className="card">
                        <div className="card-body">
                          <h4 className="mb-2">{item.name || item.username || item.id?.substring(0, 12) || `Item ${i + 1}`}</h4>
                          <div className="datagrid">
                            {Object.entries(item).filter(([k]) => !['id', 'name', 'created_at', 'updated_at'].includes(k)).slice(0, 6).map(([k, v]) => (
                              <div className="datagrid-item" key={k}>
                                <div className="datagrid-title">{k}</div>
                                <div className="datagrid-content">{typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
};

export default ConfigView;
