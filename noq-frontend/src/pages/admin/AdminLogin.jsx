// pages/admin/AdminLogin.jsx - FIXED WITH BLUE COLORS FROM App.css
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import authService from '../../services/authService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { 
  faShieldAlt,
  faEnvelope,
  faLock,
  faSpinner,
  faSignInAlt,
  faArrowLeft,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

const AdminLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login: contextLogin } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await authService.login({ role: 'admin', email, password });
      const ok = await contextLogin(result?.user, result?.token);
      if (!ok) throw new Error('Session initialization failed. Please try again.');
      navigate('/admin/dashboard', { replace: true });
    } catch (error) {
      setError(error?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <FontAwesomeIcon icon={faShieldAlt} />
            </div>
            <div className="auth-logo-text">NOQ Admin</div>
          </div>
          <p className="auth-tagline">System Administrator Access Portal</p>
        </div>

        {/* Back to Main Site Link */}
        <div className="back-link" onClick={() => navigate('/')}>
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Main Site</span>
        </div>

        <form onSubmit={handleLogin}>
          {/* Error Message */}
          {error && (
            <div className="auth-message error">
              <FontAwesomeIcon icon={faInfoCircle} style={{ marginRight: '8px' }} />
              {error}
            </div>
          )}

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              <FontAwesomeIcon icon={faEnvelope} />
              Admin Email
            </label>
            <div className="input-container">
              <FontAwesomeIcon icon={faEnvelope} className="input-icon" />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@sunigmail.com"
                required
                className={`form-control ${error ? 'error' : ''}`}
              />
            </div>
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              <FontAwesomeIcon icon={faLock} />
              Admin Password
            </label>
            <div className="input-container">
              <FontAwesomeIcon icon={faLock} className="input-icon" />
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="AdminSuni@484#"
                required
                className={`form-control ${error ? 'error' : ''}`}
              />
            </div>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Signing in...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faSignInAlt} />
                Sign In to Admin Portal
              </>
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="credentials">
          <div>Demo Credentials:</div>
          <div>Email: admin@sunigmail.com</div>
          <div>Password: AdminSuni@484#</div>
        </div>

        {/* Security Note */}
        <div className="info-note">
          <FontAwesomeIcon icon={faInfoCircle} />
          This is a secure admin portal. Access is restricted to authorized personnel only.
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;