import React from 'react';
import { useAppState } from '../context/AppState';

/**
 * DebugInfo Component
 * 
 * Shows debugging information about the current state
 */
const DebugInfo = () => {
  const { state } = useAppState();
  
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      zIndex: '9999',
      maxWidth: '300px'
    }}>
      <h4>Debug Info</h4>
      <div>
        <strong>Data Counts:</strong><br/>
        Workspaces: {state.workspaces?.length || 0}<br/>
        Services: {state.services?.length || 0}<br/>
        Routes: {state.routes?.length || 0}<br/>
        Plugins: {state.plugins?.length || 0}<br/>
        Consumers: {state.consumers?.length || 0}<br/>
      </div>
      <div style={{ marginTop: '10px' }}>
        <strong>Loading States:</strong><br/>
        Services: {state.loading?.services ? 'Loading' : 'Loaded'}<br/>
        Routes: {state.loading?.routes ? 'Loading' : 'Loaded'}<br/>
        Plugins: {state.loading?.plugins ? 'Loading' : 'Loaded'}<br/>
        Consumers: {state.loading?.consumers ? 'Loading' : 'Loaded'}<br/>
      </div>
      {state.errors && Object.keys(state.errors).length > 0 && (
        <div style={{ marginTop: '10px', color: '#ff6b6b' }}>
          <strong>Errors:</strong><br/>
          {Object.entries(state.errors).map(([key, error]) => (
            <div key={key}>{key}: {error?.message || error}</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DebugInfo;
