import React, { useState } from 'react';
import PyGatewayLogo from './PyGatewayLogo';

const LoginView = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({ ...prev, [name]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const csrfResponse = await fetch('/api/csrf-token', { credentials: 'include' });
      let csrfToken = null;
      if (csrfResponse.ok) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrf_token;
      }

      const loginHeaders = { 'Content-Type': 'application/json' };
      if (csrfToken) loginHeaders['X-CSRF-Token'] = csrfToken;

      let response = await fetch('/api/superadmin/login', {
        method: 'POST',
        headers: loginHeaders,
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (response.status === 404) {
        response = await fetch('/api/v1/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(credentials),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || errorData.error || `Login failed: ${response.status}`);
      }

      const data = await response.json();
      const user = data.user || { username: credentials.username, role: 'admin' };
      if (!user.role && user.roles?.length) user.role = user.roles[0];
      onLogin(data.token || data.access_token, user);
    } catch (err) {
      if (err.message.includes('fetch')) {
        setError('Cannot connect to backend. Ensure PyGateway backend is running.');
      } else {
        setError(err.message || 'Login failed. Check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = () => {
    setIsLoading(true);
    setTimeout(() => {
      onLogin('demo-token-12345', { username: 'demo', email: 'demo@pygateway.com', role: 'admin' });
      setIsLoading(false);
    }, 800);
  };

  return (
    <div className="page page-center">
      <div className="container container-tight py-4">
        <div className="text-center mb-4">
          <PyGatewayLogo size="medium" showText={false} />
          <h2 className="mt-3">PyGateway Admin</h2>
        </div>
        <div className="card card-md">
          <div className="card-body">
            <h2 className="h2 text-center mb-4">Sign in</h2>

            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} autoComplete="off">
              <div className="mb-3">
                <label className="form-label">Username</label>
                <input
                  type="text"
                  name="username"
                  className="form-control"
                  placeholder="Enter username"
                  value={credentials.username}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  name="password"
                  className="form-control"
                  placeholder="Enter password"
                  value={credentials.password}
                  onChange={handleInputChange}
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="form-footer">
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isLoading || !credentials.username || !credentials.password}
                >
                  {isLoading && <span className="spinner-border spinner-border-sm me-2" />}
                  Sign in
                </button>
              </div>
            </form>
          </div>
        </div>
        <div className="text-center text-muted mt-3">
          <button
            type="button"
            className="btn btn-ghost-secondary"
            onClick={handleDemoLogin}
            disabled={isLoading}
          >
            Demo Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
