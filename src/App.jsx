
import React, { useState, useEffect } from 'react';
import './App.css';
import MainLayout from './components/MainLayout';
import LoginView from './components/LoginView';
import AppInitScreen from './components/AppInitScreen';
import BackendStatus from './components/BackendStatus';
import DebugInfo from './components/DebugInfo';
import { AppStateProvider, useAppState } from './context/AppState';
import { ToastProvider } from './context/ToastContext';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

// Authentication wrapper component
function AuthWrapper({ children }) {
  const { state, actions } = useAppState();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Check for existing token on app start - only run once
    const savedToken = localStorage.getItem('authToken');
    const savedUser = localStorage.getItem('currentUser');
    
    if (savedToken && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        actions.setAuthToken(savedToken);
        actions.setCurrentUser(user);
      } catch (error) {
        console.error('Error parsing saved user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
      }
    }
    
    setAuthChecked(true);
  }, []); // Empty dependency array to run only once

  const handleLogin = (token, user) => {
    // Save to localStorage for persistence
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(user));
    
    // Update state
    actions.setAuthToken(token);
    actions.setCurrentUser(user);
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    
    // Clear state
    actions.logout();
  };

  // Show loading while checking auth
  if (!authChecked) {
    return (
      <div className="backend-status-overlay">
        <div className="backend-status-card">
          <div className="loading-spinner"></div>
          <h2>Loading PyGateway Admin...</h2>
          <p>Checking authentication status</p>
        </div>
      </div>
    );
  }

  // Show login if not authenticated
  if (!state.authToken) {
    return <LoginView onLogin={handleLogin} />;
  }

  // Show app initialization screen while loading core data
  if (state.isInitializing && !state.dataLoaded) {
    return (
      <>
        <AppInitScreen />
        {React.cloneElement(children, { onLogout: handleLogout })}
      </>
    );
  }

  // Clone children and pass logout handler
  return React.cloneElement(children, { onLogout: handleLogout });
}

function App() {
  return (
    <ToastProvider>
    <AppStateProvider>
      <BackendStatus>
        <Router>
          <Routes>
            {/* Main application routes with authentication */}
            <Route path="/*" element={
              <AuthWrapper>
                <MainLayout />
              </AuthWrapper>
            } />
          </Routes>
          <DebugInfo />
        </Router>
      </BackendStatus>
    </AppStateProvider>
    </ToastProvider>
  );
}

export default App;
