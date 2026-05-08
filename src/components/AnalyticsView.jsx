import React, { useEffect, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useAppState } from '../context/AppState';
import { IconRefresh, IconServer, IconRoute, IconCloud, IconActivity } from '@tabler/icons-react';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const AnalyticsView = () => {
  const { rawApi } = useAppState();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true); setError(null);
    try { setAnalytics(await rawApi.request('/api/v1/usage/report')); }
    catch (err) { setError(`Failed to load analytics: ${err.message}`); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-5"><div className="spinner-border text-primary" /><p className="text-muted mt-2">Loading analytics...</p></div>;
  if (error) return <div className="alert alert-danger">{error}</div>;
  if (!analytics) return <div className="alert alert-warning">No analytics data available</div>;

  const totalRequests = analytics.counters?.total_requests || 0;
  const buckets = analytics.counters?.buckets || [];
  const hasData = buckets.some((b) => b.request_count > 0);

  const chartData = {
    labels: buckets.map((b) => b.bucket),
    datasets: [{ label: 'Requests', data: buckets.map((b) => b.request_count), borderColor: 'rgb(32, 107, 196)', backgroundColor: 'rgba(32, 107, 196, 0.1)', tension: 0.3, fill: true }],
  };
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }, title: { display: false } }, scales: { y: { beginAtZero: true } } };

  const stats = [
    { label: 'Total Requests', value: totalRequests.toLocaleString(), icon: IconActivity, color: 'blue' },
    { label: 'Services', value: analytics.services_count || 0, icon: IconServer, color: 'green' },
    { label: 'Routes', value: analytics.routes_count || 0, icon: IconRoute, color: 'red' },
    { label: 'Dataplanes', value: analytics.deployment_info?.connected_dp_count || 0, icon: IconCloud, color: 'yellow' },
  ];

  return (
    <>
      <div className="page-header d-print-none">
        <div className="row align-items-center">
          <div className="col"><h2 className="page-title">Analytics</h2></div>
          <div className="col-auto"><button className="btn btn-primary" onClick={load}><IconRefresh size={16} className="me-1" /> Refresh</button></div>
        </div>
      </div>

      <div className="row row-deck row-cards mt-3">
        {stats.map((s) => (
          <div className="col-sm-6 col-lg-3" key={s.label}>
            <div className="card card-sm">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-auto"><span className={`bg-${s.color}-lt avatar`}><s.icon size={24} /></span></div>
                  <div className="col">
                    <div className="font-weight-medium">{s.label}</div>
                    <div className="text-muted">{s.value}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="card mt-3">
        <div className="card-header"><h3 className="card-title">Request Trends</h3></div>
        <div className="card-body">
          {hasData ? (
            <div style={{ height: 350 }}><Line data={chartData} options={chartOptions} /></div>
          ) : (
            <div className="text-center text-muted py-4">No request data available for charting</div>
          )}
        </div>
        {hasData && (
          <div className="table-responsive">
            <table className="table table-vcenter card-table">
              <thead><tr><th>Time Period</th><th>Request Count</th></tr></thead>
              <tbody>{buckets.map((b, i) => <tr key={i}><td>{b.bucket}</td><td className="fw-bold">{b.request_count.toLocaleString()}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>

      {/* System info */}
      <div className="card mt-3">
        <div className="card-header"><h3 className="card-title">System Information</h3></div>
        <div className="card-body">
          <div className="datagrid">
            <div className="datagrid-item"><div className="datagrid-title">Deployment Type</div><div className="datagrid-content">{analytics.deployment_info?.type || 'Unknown'}</div></div>
            <div className="datagrid-item"><div className="datagrid-title">Version</div><div className="datagrid-content">{analytics.version || 'Unknown'}</div></div>
            <div className="datagrid-item"><div className="datagrid-title">Database</div><div className="datagrid-content">{analytics.db_version || 'Unknown'}</div></div>
            <div className="datagrid-item"><div className="datagrid-title">Hostname</div><div className="datagrid-content">{analytics.system_info?.hostname || 'Unknown'}</div></div>
            <div className="datagrid-item"><div className="datagrid-title">OS</div><div className="datagrid-content">{analytics.system_info?.uname || 'Unknown'}</div></div>
            <div className="datagrid-item"><div className="datagrid-title">CPU Cores</div><div className="datagrid-content">{analytics.system_info?.cores || 'Unknown'}</div></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AnalyticsView;
