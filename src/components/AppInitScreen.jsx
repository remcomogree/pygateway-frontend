import React from 'react';
import { useAppState } from '../context/AppState';

const AppInitScreen = () => {
  const { state, actions } = useAppState();
  const { isInitializing, dataLoaded, initError, initStartTime } = state;

  if (!isInitializing && dataLoaded) return null;

  const elapsed = initStartTime ? (Date.now() - initStartTime) / 1000 : 0;
  const items = [
    { label: 'Workspaces', done: !!state.workspaces?.length },
    { label: 'Services', done: !!state.services?.length },
    { label: 'Routes', done: !!state.routes?.length },
    { label: 'Plugins', done: !!state.plugins?.length },
  ];

  return (
    <div className="page page-center" style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(var(--tblr-body-bg-rgb, 248,249,250), 0.95)' }}>
      <div className="container container-tight py-4 text-center">
        <div className="card card-md">
          <div className="card-body">
            {initError ? (
              <>
                <div className="text-danger mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg" width="48" height="48" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none"><path d="M12 9v4m0 4h.01M5.313 20h13.374a2 2 0 001.752-2.968l-6.687-11.952a2 2 0 00-3.504 0L3.561 17.032A2 2 0 005.313 20z" /></svg>
                </div>
                <h3 className="mb-2">Initialization Error</h3>
                <p className="text-muted mb-3">{initError}</p>
                <button className="btn btn-primary" onClick={() => actions.retryInit?.()}>Retry</button>
              </>
            ) : (
              <>
                <div className="mb-3">
                  <div className="spinner-border text-primary" role="status" />
                </div>
                <h3 className="mb-3">Loading PyGateway...</h3>
                <div className="list-group list-group-flush text-start">
                  {items.map((item) => (
                    <div className="list-group-item d-flex align-items-center" key={item.label}>
                      {item.done ? (
                        <span className="badge bg-success me-2">✓</span>
                      ) : (
                        <span className="spinner-border spinner-border-sm me-2 text-primary" />
                      )}
                      {item.label}
                    </div>
                  ))}
                </div>
                {elapsed > 2.5 && (
                  <div className="alert alert-warning mt-3 mb-0">
                    Loading is taking longer than expected. Please check your backend connection.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppInitScreen;
