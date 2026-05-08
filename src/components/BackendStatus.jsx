import React, { useState, useEffect, createContext, useContext } from 'react';

const BackendStatusContext = createContext({
  isConnected: false,
  isChecking: true,
  isDisconnected: false,
  retry: () => {},
});

export const useBackendStatus = () => useContext(BackendStatusContext);

const BackendStatus = ({ children }) => {
  const [backendStatus, setBackendStatus] = useState('checking');
  const [retryCount, setRetryCount] = useState(0);

  const checkBackend = async () => {
    try {
      const response = await fetch('/api/health');
      if (response.ok) {
        setBackendStatus('connected');
      } else {
        setBackendStatus('disconnected');
      }
    } catch {
      setBackendStatus('disconnected');
    }
  };

  useEffect(() => {
    checkBackend();
  }, []);

  useEffect(() => {
    if (backendStatus === 'disconnected') {
      const interval = setInterval(checkBackend, 10000);
      return () => clearInterval(interval);
    }
  }, [backendStatus]);

  const retry = () => {
    setRetryCount((c) => c + 1);
    setBackendStatus('checking');
    checkBackend();
  };

  const contextValue = {
    isConnected: backendStatus === 'connected',
    isChecking: backendStatus === 'checking',
    isDisconnected: backendStatus === 'disconnected',
    retry,
  };

  if (backendStatus === 'checking') {
    return (
      <BackendStatusContext.Provider value={contextValue}>
        <div className="page page-center">
          <div className="container container-tight py-4 text-center">
            <div className="card card-md">
              <div className="card-body">
                <div className="mb-3"><div className="spinner-border text-primary" role="status" /></div>
                <h3>Connecting to PyGateway...</h3>
                <p className="text-muted">Checking backend status</p>
              </div>
            </div>
          </div>
        </div>
      </BackendStatusContext.Provider>
    );
  }

  if (backendStatus === 'disconnected') {
    return (
      <BackendStatusContext.Provider value={contextValue}>
        <div className="page page-center">
          <div className="container container-tight py-4 text-center">
            <div className="card card-md">
              <div className="card-body">
                <div className="text-danger mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="icon icon-lg" width="48" height="48" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" fill="none"><path d="M3 12a9 9 0 1018 0 9 9 0 00-18 0m9-4v4m0 4h.01" /></svg>
                </div>
                <h3>Backend Disconnected</h3>
                <p className="text-muted mb-3">
                  Cannot connect to PyGateway backend. Make sure the backend is running on port 8001.
                </p>
                <button className="btn btn-primary" onClick={retry}>
                  Retry Connection
                </button>
                <p className="text-muted mt-2 small">Retries: {retryCount} · Auto-retrying every 10s</p>
              </div>
            </div>
          </div>
        </div>
      </BackendStatusContext.Provider>
    );
  }

  return (
    <BackendStatusContext.Provider value={contextValue}>
      {children}
    </BackendStatusContext.Provider>
  );
};

export default BackendStatus;
