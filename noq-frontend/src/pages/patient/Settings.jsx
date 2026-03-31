// pages/Settings.js - Patient Settings with API backend
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCog,
  faBell,
  faPalette,
  faLanguage,
  faEye,
  faEyeSlash,
  faSave,
  faSync,
  faLock,
  faVolumeUp,
  faDesktop,
  faMobile,
  faShieldAlt,
  faDatabase,
  faTrash,
  faDownload,
  faMoon,
  faSun,
  faCheckCircle,
  faUserCog,
  faGlobe,
  faClock,
  faCalendarAlt,
  faEnvelope,
  faPhone,
  faExclamationTriangle,
  faKey
} from '@fortawesome/free-solid-svg-icons';

const defaultSettings = {
  language: 'english',
  timezone: 'Asia/Kolkata',
  dateFormat: 'DD/MM/YYYY',
  emailNotifications: true,
  smsNotifications: true,
  appointmentReminders: true,
  prescriptionAlerts: true,
  billingAlerts: true,
  profileVisibility: 'private',
  shareMedicalData: false,
  dataRetention: '1year',
  theme: 'light',
  fontSize: 'medium',
  reduceAnimations: false,
  twoFactorAuth: false,
  sessionTimeout: '30',
  loginAlerts: true
};

const Settings = () => {
  const { currentUser, loading: authLoading, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState(defaultSettings);
  const [showPassword, setShowPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(true);
  const [patient, setPatient] = useState(null);
  const [message, setMessage] = useState({ type: '', text: '' });

  const getSettingsKey = (user) => {
    const identity = user?.id || user?.email || 'guest';
    return `patientSettings:${identity}`;
  };

  const getNotificationStateKey = (user) => {
    const identity = user?.id || user?.email || 'guest';
    return `patientNotificationState:${identity}`;
  };

  // Load settings and profile
  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      setLoading(false);
      return;
    }
    // Derive patient directly from currentUser — no need to match against allPatients
    setPatient({ ...currentUser, name: currentUser.full_name || currentUser.name || 'Patient' });
    const saved = sessionStorage.getItem(getSettingsKey(currentUser));
    setSettings(saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings);
    setLoading(false);
  }, [currentUser, authLoading]);

  // Save settings whenever they change
  const handleSaveSettings = () => {
    if (!currentUser) return;
    sessionStorage.setItem(getSettingsKey(currentUser), JSON.stringify(settings));
    setMessage({ type: 'success', text: 'Settings saved successfully.' });
  };

  const handleResetSettings = () => {
    if (window.confirm('Reset all settings to default?')) {
      if (!currentUser) return;
      setSettings(defaultSettings);
      sessionStorage.setItem(getSettingsKey(currentUser), JSON.stringify(defaultSettings));
      setMessage({ type: 'success', text: 'Settings reset to default.' });
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    try {
      await patientService.updateProfile({
        current_password: passwordForm.currentPassword,
        new_password: passwordForm.newPassword,
      });
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setMessage({ type: 'success', text: 'Password changed successfully.' });
    } catch (error) {
      setMessage({ type: 'error', text: error?.message || 'Unable to update password right now.' });
    }
  };

  const handleExportData = () => {
    if (patient) {
      const bundle = {
        profile: patient,
        settings,
        exportedAt: new Date().toISOString(),
      };
      const dataStr = JSON.stringify(bundle, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `patient-data-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      setMessage({ type: 'error', text: 'No patient data found.' });
    }
  };

  const handleClearData = () => {
    if (window.confirm('Clear all local data (settings, notifications)? This cannot be undone.')) {
      if (!currentUser) return;
      sessionStorage.removeItem(getSettingsKey(currentUser));
      sessionStorage.removeItem(getNotificationStateKey(currentUser));
      setSettings(defaultSettings);
      setMessage({ type: 'success', text: 'Local settings and notification state cleared.' });
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading settings...</p>
        <style>{`
          .loading-container {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 300px;
            padding: 2rem;
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #f3f3f3;
            border-top: 4px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-bottom: 1rem;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          .loading-container p {
            color: #666;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Internal CSS */}
      <style>{`
        .page-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem 1.5rem;
          background: #f8fafc;
          min-height: calc(100vh - 60px);
        }
        .page-header {
          margin-bottom: 2rem;
        }
        .page-header h1 {
          font-size: 2rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 0.5rem;
        }
        .header-icon {
          color: #3b82f6;
          font-size: 1.8rem;
        }
        .page-subtitle {
          color: #64748b;
          font-size: 1rem;
          margin-left: 2.8rem;
        }

        /* Settings container – uses same card style as profile */
        .settings-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          overflow: hidden;
          display: flex;
          flex-direction: row;
          flex-wrap: wrap;
        }

        /* Sidebar navigation */
        .settings-sidebar {
          width: 260px;
          background: #f8fafc;
          border-right: 1px solid #e2e8f0;
          padding: 1.5rem 0;
        }
        .settings-nav {
          display: flex;
          flex-direction: column;
        }
        .settings-nav-item {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          text-align: left;
          font-size: 0.95rem;
          color: #64748b;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          transition: all 0.2s;
        }
        .settings-nav-item svg {
          width: 18px;
          color: #94a3b8;
        }
        .settings-nav-item:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
        .settings-nav-item.active {
          background: #dbeafe;
          color: #3b82f6;
          font-weight: 500;
          border-left: 3px solid #3b82f6;
        }
        .settings-nav-item.active svg {
          color: #3b82f6;
        }

        /* Sidebar action buttons */
        .settings-actions {
          padding: 1.5rem;
          border-top: 1px solid #e2e8f0;
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .settings-action-btn {
          padding: 0.6rem 1rem;
          border-radius: 8px;
          border: none;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .settings-action-btn.primary {
          background: #3b82f6;
          color: white;
        }
        .settings-action-btn.primary:hover {
          background: #2563eb;
        }
        .settings-action-btn.secondary {
          background: #f1f5f9;
          color: #1e293b;
          border: 1px solid #e2e8f0;
        }
        .settings-action-btn.secondary:hover {
          background: #e2e8f0;
        }

        /* Main content area */
        .settings-content {
          flex: 1;
          padding: 2rem;
          min-width: 300px;
        }

        /* Settings section – matches profile-section style */
        .settings-section {
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }
        .section-header {
          padding: 1rem 1.5rem;
          background: white;
          border-bottom: 1px solid #e2e8f0;
        }
        .section-header h3 {
          font-size: 1.1rem;
          font-weight: 600;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .section-header h3 svg {
          color: #3b82f6;
        }
        .section-content {
          padding: 1.5rem;
        }

        /* Form elements */
        .form-group {
          margin-bottom: 1.25rem;
        }
        .form-group label {
          display: block;
          font-size: 0.85rem;
          font-weight: 500;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.3rem;
        }
        .form-select, .form-input {
          width: 100%;
          padding: 0.6rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.95rem;
          background: white;
          transition: border-color 0.2s;
        }
        .form-select:focus, .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }

        /* Toggle switches */
        .toggle-group {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .toggle-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .toggle-item label {
          font-size: 0.95rem;
          color: #1e293b;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .switch {
          position: relative;
          display: inline-block;
          width: 48px;
          height: 24px;
        }
        .switch input {
          opacity: 0;
          width: 0;
          height: 0;
        }
        .slider {
          position: absolute;
          cursor: pointer;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background-color: #cbd5e1;
          transition: 0.2s;
          border-radius: 24px;
        }
        .slider:before {
          position: absolute;
          content: "";
          height: 18px;
          width: 18px;
          left: 3px;
          bottom: 3px;
          background-color: white;
          transition: 0.2s;
          border-radius: 50%;
        }
        input:checked + .slider {
          background-color: #3b82f6;
        }
        input:checked + .slider:before {
          transform: translateX(24px);
        }

        /* Theme selector */
        .theme-selector {
          margin-bottom: 1.5rem;
        }
        .theme-options {
          display: flex;
          gap: 1rem;
          margin-top: 0.5rem;
        }
        .theme-option {
          flex: 1;
          padding: 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #1e293b;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .theme-option.active {
          border-color: #3b82f6;
          background: #dbeafe;
          color: #3b82f6;
        }

        /* Password form */
        .password-form {
          margin-top: 2rem;
          border-top: 1px solid #e2e8f0;
          padding-top: 1.5rem;
        }
        .password-form h4 {
          margin-bottom: 1rem;
          color: #1e293b;
        }
        .password-input {
          position: relative;
        }
        .password-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
        }

        /* Data management cards */
        .data-management {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .data-card {
          background: white;
          border-radius: 10px;
          padding: 1.5rem;
          text-align: center;
          border: 1px solid #e2e8f0;
        }
        .data-card.warning {
          border-color: #f97316;
        }
        .data-card svg {
          font-size: 2rem;
          color: #3b82f6;
          margin-bottom: 0.75rem;
        }
        .data-card.warning svg {
          color: #f97316;
        }
        .data-card h4 {
          margin-bottom: 0.5rem;
        }
        .data-card p {
          color: #64748b;
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        .data-btn {
          padding: 0.5rem 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          color: #1e293b;
          cursor: pointer;
          transition: all 0.2s;
        }
        .data-btn:hover {
          background: #f1f5f9;
        }
        .data-btn.danger {
          border-color: #ef4444;
          color: #ef4444;
        }
        .data-btn.danger:hover {
          background: #fee2e2;
        }
        .data-info {
          background: #f0f9ff;
          border-radius: 8px;
          padding: 1rem;
        }
        .data-info ul {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0 0;
        }
        .data-info li {
          margin: 0.25rem 0;
          color: #0369a1;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .data-info li svg {
          color: #10b981;
        }

        .helper-text {
          font-size: 0.8rem;
          color: #94a3b8;
          margin-top: 0.25rem;
        }

        /* Action button (used in change password) */
        .action-btn.primary {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: background 0.2s;
        }
        .action-btn.primary:hover {
          background: #2563eb;
        }
        .page-message {
          margin-bottom: 1rem;
          padding: 0.85rem 1rem;
          border-radius: 10px;
          font-size: 0.95rem;
          font-weight: 500;
        }
        .page-message.success {
          background: #dcfce7;
          color: #166534;
        }
        .page-message.error {
          background: #fee2e2;
          color: #b91c1c;
        }

        @media (max-width: 768px) {
          .settings-container {
            flex-direction: column;
          }
          .settings-sidebar {
            width: 100%;
            border-right: none;
            border-bottom: 1px solid #e2e8f0;
          }
          .page-header h1 {
            font-size: 1.6rem;
          }
          .page-subtitle {
            margin-left: 0;
          }
        }
      `}</style>

      <div className="page-header">
        <h1>
          <FontAwesomeIcon icon={faCog} className="header-icon" />
          Settings
        </h1>
        <p className="page-subtitle">
          Customize your experience and manage preferences
        </p>
      </div>

      {message.text && <div className={`page-message ${message.type}`}>{message.text}</div>}

      <div className="settings-container">
        {/* Sidebar Navigation */}
        <div className="settings-sidebar">
          <div className="settings-nav">
            <button
              className={`settings-nav-item ${activeTab === 'general' ? 'active' : ''}`}
              onClick={() => setActiveTab('general')}
            >
              <FontAwesomeIcon icon={faUserCog} />
              General
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'notifications' ? 'active' : ''}`}
              onClick={() => setActiveTab('notifications')}
            >
              <FontAwesomeIcon icon={faBell} />
              Notifications
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'display' ? 'active' : ''}`}
              onClick={() => setActiveTab('display')}
            >
              <FontAwesomeIcon icon={faPalette} />
              Display
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'privacy' ? 'active' : ''}`}
              onClick={() => setActiveTab('privacy')}
            >
              <FontAwesomeIcon icon={faShieldAlt} />
              Privacy
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'security' ? 'active' : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <FontAwesomeIcon icon={faLock} />
              Security
            </button>
            <button
              className={`settings-nav-item ${activeTab === 'data' ? 'active' : ''}`}
              onClick={() => setActiveTab('data')}
            >
              <FontAwesomeIcon icon={faDatabase} />
              Data
            </button>
          </div>
          <div className="settings-actions">
            <button className="settings-action-btn primary" onClick={handleSaveSettings}>
              <FontAwesomeIcon icon={faSave} /> Save Changes
            </button>
            <button className="settings-action-btn secondary" onClick={handleResetSettings}>
              <FontAwesomeIcon icon={faSync} /> Reset to Default
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="settings-content">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="settings-section">
              <div className="section-header">
                <h3><FontAwesomeIcon icon={faGlobe} /> General Settings</h3>
              </div>
              <div className="section-content">
                <div className="form-group">
                  <label><FontAwesomeIcon icon={faLanguage} /> Language</label>
                  <select
                    className="form-select"
                    value={settings.language}
                    onChange={(e) => setSettings({...settings, language: e.target.value})}
                  >
                    <option value="english">English</option>
                    <option value="hindi">Hindi</option>
                    <option value="spanish">Spanish</option>
                    <option value="french">French</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><FontAwesomeIcon icon={faClock} /> Time Zone</label>
                  <select
                    className="form-select"
                    value={settings.timezone}
                    onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                  >
                    <option value="Asia/Kolkata">India (IST)</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="Europe/London">London (GMT)</option>
                    <option value="Asia/Singapore">Singapore (SGT)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label><FontAwesomeIcon icon={faCalendarAlt} /> Date Format</label>
                  <select
                    className="form-select"
                    value={settings.dateFormat}
                    onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="settings-section">
              <div className="section-header">
                <h3><FontAwesomeIcon icon={faBell} /> Notification Settings</h3>
              </div>
              <div className="section-content">
                <div className="toggle-group">
                  <div className="toggle-item">
                    <label><FontAwesomeIcon icon={faEnvelope} /> Email Notifications</label>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.emailNotifications}
                        onChange={(e) => setSettings({...settings, emailNotifications: e.target.checked})}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <label><FontAwesomeIcon icon={faPhone} /> SMS Notifications</label>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.smsNotifications}
                        onChange={(e) => setSettings({...settings, smsNotifications: e.target.checked})}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <label>Appointment Reminders</label>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.appointmentReminders}
                        onChange={(e) => setSettings({...settings, appointmentReminders: e.target.checked})}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <label>Prescription Alerts</label>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.prescriptionAlerts}
                        onChange={(e) => setSettings({...settings, prescriptionAlerts: e.target.checked})}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  <div className="toggle-item">
                    <label><FontAwesomeIcon icon={faVolumeUp} /> Billing Alerts</label>
                    <label className="switch">
                      <input
                        type="checkbox"
                        checked={settings.billingAlerts}
                        onChange={(e) => setSettings({...settings, billingAlerts: e.target.checked})}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <div className="settings-section">
              <div className="section-header">
                <h3><FontAwesomeIcon icon={faDesktop} /> Display Settings</h3>
              </div>
              <div className="section-content">
                <div className="theme-selector">
                  <label>Theme</label>
                  <div className="theme-options">
                    <button
                      className={`theme-option ${settings.theme === 'light' ? 'active' : ''}`}
                      onClick={() => setSettings({...settings, theme: 'light'})}
                    >
                      <FontAwesomeIcon icon={faSun} /> Light
                    </button>
                    <button
                      className={`theme-option ${settings.theme === 'dark' ? 'active' : ''}`}
                      onClick={() => setSettings({...settings, theme: 'dark'})}
                    >
                      <FontAwesomeIcon icon={faMoon} /> Dark
                    </button>
                  </div>
                </div>
                <div className="form-group">
                  <label>Font Size</label>
                  <select
                    className="form-select"
                    value={settings.fontSize}
                    onChange={(e) => setSettings({...settings, fontSize: e.target.value})}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </select>
                </div>
                <div className="toggle-item">
                  <label>Reduce Animations</label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.reduceAnimations}
                      onChange={(e) => setSettings({...settings, reduceAnimations: e.target.checked})}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Privacy Tab */}
          {activeTab === 'privacy' && (
            <div className="settings-section">
              <div className="section-header">
                <h3><FontAwesomeIcon icon={faShieldAlt} /> Privacy Settings</h3>
              </div>
              <div className="section-content">
                <div className="form-group">
                  <label>Profile Visibility</label>
                  <select
                    className="form-select"
                    value={settings.profileVisibility}
                    onChange={(e) => setSettings({...settings, profileVisibility: e.target.value})}
                  >
                    <option value="private">Private (Only you)</option>
                    <option value="doctors">Doctors Only</option>
                    <option value="hospital">Hospital Staff</option>
                  </select>
                </div>
                <div className="toggle-item">
                  <label>Share Medical Data for Research</label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.shareMedicalData}
                      onChange={(e) => setSettings({...settings, shareMedicalData: e.target.checked})}
                    />
                    <span className="slider"></span>
                  </label>
                  <p className="helper-text">Anonymous data may be used for medical research</p>
                </div>
                <div className="form-group">
                  <label>Data Retention Period</label>
                  <select
                    className="form-select"
                    value={settings.dataRetention}
                    onChange={(e) => setSettings({...settings, dataRetention: e.target.value})}
                  >
                    <option value="1year">1 Year</option>
                    <option value="3years">3 Years</option>
                    <option value="5years">5 Years</option>
                    <option value="forever">Indefinitely</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="settings-section">
              <div className="section-header">
                <h3><FontAwesomeIcon icon={faLock} /> Security Settings</h3>
              </div>
              <div className="section-content">
                <div className="toggle-item">
                  <label><FontAwesomeIcon icon={faKey} /> Two-Factor Authentication</label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.twoFactorAuth}
                      onChange={(e) => setSettings({...settings, twoFactorAuth: e.target.checked})}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
                <div className="form-group">
                  <label>Session Timeout (minutes)</label>
                  <select
                    className="form-select"
                    value={settings.sessionTimeout}
                    onChange={(e) => setSettings({...settings, sessionTimeout: e.target.value})}
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="60">1 hour</option>
                    <option value="240">4 hours</option>
                  </select>
                </div>
                <div className="toggle-item">
                  <label><FontAwesomeIcon icon={faBell} /> Login Alerts</label>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={settings.loginAlerts}
                      onChange={(e) => setSettings({...settings, loginAlerts: e.target.checked})}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                {/* Change Password Form */}
                <div className="password-form">
                  <h4>Change Password</h4>
                  <form onSubmit={handleChangePassword}>
                    <div className="form-group">
                      <label>Current Password</label>
                      <div className="password-input">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className="form-input"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                          required
                        />
                        <button
                          type="button"
                          className="password-toggle"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                        </button>
                      </div>
                    </div>
                    <div className="form-group">
                      <label>New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label>Confirm New Password</label>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        className="form-input"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                        required
                      />
                    </div>
                    <button type="submit" className="action-btn primary">
                      <FontAwesomeIcon icon={faLock} /> Change Password
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* Data Management Tab */}
          {activeTab === 'data' && (
            <div className="settings-section">
              <div className="section-header">
                <h3><FontAwesomeIcon icon={faDatabase} /> Data Management</h3>
              </div>
              <div className="section-content">
                <div className="data-management">
                  <div className="data-card">
                    <FontAwesomeIcon icon={faDownload} />
                    <h4>Export Your Data</h4>
                    <p>Download all your medical records and personal data as JSON</p>
                    <button className="data-btn" onClick={handleExportData}>
                      Export Data
                    </button>
                  </div>
                  <div className="data-card warning">
                    <FontAwesomeIcon icon={faTrash} />
                    <h4>Clear Local Data</h4>
                    <p>Remove all locally stored settings and notifications</p>
                    <button className="data-btn danger" onClick={handleClearData}>
                      Clear Data
                    </button>
                  </div>
                  <div className="data-info">
                    <h4>Your Data Rights</h4>
                    <ul>
                      <li><FontAwesomeIcon icon={faCheckCircle} /> Access your medical data</li>
                      <li><FontAwesomeIcon icon={faCheckCircle} /> Request data correction</li>
                      <li><FontAwesomeIcon icon={faCheckCircle} /> Export your data</li>
                      <li><FontAwesomeIcon icon={faCheckCircle} /> Request data deletion</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Settings;