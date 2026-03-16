// pages/admin/Settings.jsx - IMPROVED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_SETTINGS = {
  theme: 'light',
  notifications: {
    email: true,
    push: true,
    sms: false,
    reports: true,
  },
  twoFactor: false,
  language: 'en',
  autoSave: true,
  dateFormat: 'DD/MM/YYYY',
  timeFormat: '12h',
};

const DEFAULT_SECURITY = {
  sessionTimeout: 30,
  ipWhitelist: ['192.168.1.1', '10.0.0.1'],
  newIPAlert: true,
  passwordExpiry: 90,
  loginAttempts: 5,
};

const Settings = () => {
  const navigate = useNavigate();
  const { currentUser, logout } = useAuth();
  const settingsDocId = String(currentUser?.id || 'admin-settings');
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [security, setSecurity] = useState(DEFAULT_SECURITY);
  const [profile, setProfile] = useState({
    name: currentUser?.name || 'Admin User',
    email: currentUser?.email || 'admin@mail.com',
    phone: currentUser?.phone || '+1 234 567 8900',
    avatar: '',
    department: 'System Administration',
    bio: 'System administrator with full access to all modules',
  });
  const [initialSnapshot, setInitialSnapshot] = useState(null);

  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [unsavedChanges, setUnsavedChanges] = useState(false);
  const [newIP, setNewIP] = useState('');

  useEffect(() => {
    let active = true;

    const loadAdminSettings = async () => {
      const doc = await firebaseDbService.getDocument('admin_settings', settingsDocId);
      if (!active) return;

      const loadedSettings = doc?.settings || DEFAULT_SETTINGS;
      const loadedSecurity = doc?.security || DEFAULT_SECURITY;
      const loadedProfile = {
        name: doc?.profile?.name || currentUser?.name || 'Admin User',
        email: doc?.profile?.email || currentUser?.email || 'admin@mail.com',
        phone: doc?.profile?.phone || currentUser?.phone || '+1 234 567 8900',
        avatar: doc?.profile?.avatar || '',
        department: doc?.profile?.department || 'System Administration',
        bio: doc?.profile?.bio || 'System administrator with full access to all modules',
      };

      setSettings(loadedSettings);
      setSecurity(loadedSecurity);
      setProfile(loadedProfile);
      setInitialSnapshot(JSON.stringify({ settings: loadedSettings, security: loadedSecurity, profile: loadedProfile }));
    };

    loadAdminSettings();
    return () => {
      active = false;
    };
  }, [currentUser, settingsDocId]);

  useEffect(() => {
    if (!initialSnapshot) return;
    setUnsavedChanges(
      JSON.stringify({ settings, security, profile }) !== initialSnapshot
    );
  }, [settings, security, profile]);

  const persistSettings = async (message) => {
    await firebaseDbService.upsert('admin_settings', settingsDocId, {
      settings,
      security,
      profile,
      updatedBy: currentUser?.id || 'admin',
      updatedAt: new Date().toISOString(),
    });
    setInitialSnapshot(JSON.stringify({ settings, security, profile }));
    setUnsavedChanges(false);
    setSaveMessage(message);
  };

  const handleSaveSettings = () => {
    setSaving(true);
    setSaveMessage('Saving settings...');
    
    setTimeout(async () => {
      await persistSettings('Settings saved successfully!');
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }, 800);
  };

  const handleSaveSecurity = () => {
    setSaving(true);
    setSaveMessage('Saving security settings...');
    
    setTimeout(async () => {
      await persistSettings('Security settings saved!');
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }, 800);
  };

  const handleSaveProfile = () => {
    setSaving(true);
    setSaveMessage('Saving profile...');
    
    setTimeout(async () => {
      await persistSettings('Profile updated successfully!');
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }, 800);
  };

  const handleResetSettings = () => {
    if (window.confirm('Are you sure you want to reset all settings to default?')) {
      const defaultSettings = {
        ...DEFAULT_SETTINGS,
      };
      setSettings(defaultSettings);
      setSaveMessage('Settings reset to default');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleExportSettings = () => {
    const dataStr = JSON.stringify({ settings, security, profile }, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'admin_settings_backup.json';
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    setSaveMessage('Settings exported successfully');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleImportSettings = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target.result);
        if (imported.settings) setSettings(imported.settings);
        if (imported.security) setSecurity(imported.security);
        if (imported.profile) setProfile(imported.profile);
        setSaveMessage('Settings imported successfully');
        setTimeout(() => setSaveMessage(''), 3000);
      } catch (error) {
        setSaveMessage('Error importing settings');
        setTimeout(() => setSaveMessage(''), 3000);
      }
    };
    reader.readAsText(file);
  };

  const handleAddIP = () => {
    if (newIP && /^(\d{1,3}\.){3}\d{1,3}$/.test(newIP)) {
      setSecurity(prev => ({
        ...prev,
        ipWhitelist: [...prev.ipWhitelist, newIP]
      }));
      setNewIP('');
    } else {
      setSaveMessage('Please enter a valid IP address');
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const ToggleSwitch = ({ checked, onChange, id, disabled = false }) => (
    <label className="toggle-switch" htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="toggle-slider"></span>
    </label>
  );

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>System Settings</h1>
          <p style={styles.subtitle}>Manage your system preferences and security</p>
        </div>
        <div style={styles.headerActions}>
          {saveMessage && (
            <div style={{
              ...styles.saveMessage,
              ...(saveMessage.includes('success') ? styles.successMessage : styles.errorMessage)
            }}>
              {saveMessage}
            </div>
          )}
          {unsavedChanges && !saveMessage && (
            <div style={styles.unsavedMessage}>⚠️ You have unsaved changes</div>
          )}
        </div>
      </div>

      {/* Main Settings Grid */}
      <div style={styles.grid}>
        {/* Profile Settings */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <FontAwesomeIcon icon={Icons.faUser} />
              <span>Profile Settings</span>
            </div>
            <button 
              style={styles.saveBtn}
              onClick={handleSaveProfile}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Full Name</label>
            <input
              type="text"
              style={styles.input}
              value={profile.name}
              onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Email Address</label>
            <input
              type="email"
              style={styles.input}
              value={profile.email}
              onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Phone Number</label>
            <input
              type="tel"
              style={styles.input}
              value={profile.phone}
              onChange={(e) => setProfile(prev => ({ ...prev, phone: e.target.value }))}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Department</label>
            <select
              style={styles.select}
              value={profile.department}
              onChange={(e) => setProfile(prev => ({ ...prev, department: e.target.value }))}
            >
              <option value="System Administration">System Administration</option>
              <option value="IT Support">IT Support</option>
              <option value="Hospital Management">Hospital Management</option>
              <option value="Finance">Finance</option>
              <option value="Operations">Operations</option>
            </select>
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>Bio</label>
            <textarea
              style={styles.textarea}
              value={profile.bio}
              onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
              rows="3"
            />
          </div>
        </div>

        {/* General Settings */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <FontAwesomeIcon icon={Icons.faCog} />
              <span>General Settings</span>
            </div>
            <button 
              style={styles.saveBtn}
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
          
          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>Theme</div>
              <div style={styles.settingDesc}>Choose interface theme</div>
            </div>
            <select
              style={styles.select}
              value={settings.theme}
              onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
            >
              <option value="light">Light Theme</option>
              <option value="dark">Dark Theme</option>
              <option value="auto">Auto (System)</option>
            </select>
          </div>
          
          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>Language</div>
              <div style={styles.settingDesc}>Interface language</div>
            </div>
            <select
              style={styles.select}
              value={settings.language}
              onChange={(e) => setSettings(prev => ({ ...prev, language: e.target.value }))}
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
          
          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>Date Format</div>
              <div style={styles.settingDesc}>Display format for dates</div>
            </div>
            <select
              style={styles.select}
              value={settings.dateFormat}
              onChange={(e) => setSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          
          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>Time Format</div>
              <div style={styles.settingDesc}>Display format for time</div>
            </div>
            <select
              style={styles.select}
              value={settings.timeFormat}
              onChange={(e) => setSettings(prev => ({ ...prev, timeFormat: e.target.value }))}
            >
              <option value="12h">12-hour (AM/PM)</option>
              <option value="24h">24-hour</option>
            </select>
          </div>
          
          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>Auto Save</div>
              <div style={styles.settingDesc}>Automatically save changes</div>
            </div>
            <ToggleSwitch
              id="autoSave"
              checked={settings.autoSave}
              onChange={() => setSettings(prev => ({ ...prev, autoSave: !prev.autoSave }))}
            />
          </div>
        </div>

        {/* Notifications */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <FontAwesomeIcon icon={Icons.faBell} />
              <span>Notifications</span>
            </div>
            <button 
              style={styles.saveBtn}
              onClick={handleSaveSettings}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
          
          {Object.entries(settings.notifications).map(([key, value]) => (
            <div key={key} style={styles.settingRow}>
              <div>
                <div style={styles.settingLabel}>
                  {key.charAt(0).toUpperCase() + key.slice(1)} Notifications
                </div>
                <div style={styles.settingDesc}>Receive {key} alerts</div>
              </div>
              <ToggleSwitch
                id={`notif-${key}`}
                checked={value}
                onChange={() => setSettings(prev => ({
                  ...prev,
                  notifications: { ...prev.notifications, [key]: !prev.notifications[key] }
                }))}
              />
            </div>
          ))}
        </div>

        {/* Security Settings */}
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>
              <FontAwesomeIcon icon={Icons.faShieldAlt} />
              <span>Security Settings</span>
            </div>
            <button 
              style={styles.saveBtn}
              onClick={handleSaveSecurity}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Security'}
            </button>
          </div>
          
          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>Two-Factor Authentication</div>
              <div style={styles.settingDesc}>Extra security layer</div>
            </div>
            <ToggleSwitch
              id="twoFactor"
              checked={settings.twoFactor}
              onChange={() => setSettings(prev => ({ ...prev, twoFactor: !prev.twoFactor }))}
            />
          </div>
          
          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>Session Timeout</div>
              <div style={styles.settingDesc}>Auto logout after inactivity</div>
            </div>
            <select
              style={styles.select}
              value={security.sessionTimeout}
              onChange={(e) => setSecurity(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) }))}
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
            </select>
          </div>
          
          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>Password Expiry</div>
              <div style={styles.settingDesc}>Days before password expires</div>
            </div>
            <select
              style={styles.select}
              value={security.passwordExpiry}
              onChange={(e) => setSecurity(prev => ({ ...prev, passwordExpiry: parseInt(e.target.value) }))}
            >
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
              <option value={180}>180 days</option>
            </select>
          </div>
          
          <div style={styles.settingRow}>
            <div>
              <div style={styles.settingLabel}>New IP Alert</div>
              <div style={styles.settingDesc}>Alert on new IP login</div>
            </div>
            <ToggleSwitch
              id="newIPAlert"
              checked={security.newIPAlert}
              onChange={() => setSecurity(prev => ({ ...prev, newIPAlert: !prev.newIPAlert }))}
            />
          </div>
          
          <div style={styles.formGroup}>
            <label style={styles.label}>IP Whitelist</label>
            <div style={styles.ipInputGroup}>
              <input
                type="text"
                style={styles.input}
                placeholder="Enter IP address (e.g., 192.168.1.1)"
                value={newIP}
                onChange={(e) => setNewIP(e.target.value)}
              />
              <button 
                style={styles.addBtn}
                onClick={handleAddIP}
              >
                Add IP
              </button>
            </div>
            <div style={styles.ipList}>
              {security.ipWhitelist.map((ip, index) => (
                <div key={index} style={styles.ipItem}>
                  <span>{ip}</span>
                  <button
                    style={styles.removeBtn}
                    onClick={() => setSecurity(prev => ({
                      ...prev,
                      ipWhitelist: prev.ipWhitelist.filter((_, i) => i !== index)
                    }))}
                  >
                    <FontAwesomeIcon icon={Icons.faTimes} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.actionSection}>
        <div style={styles.actionButtons}>
          <button 
            style={styles.secondaryBtn}
            onClick={handleResetSettings}
          >
            <FontAwesomeIcon icon={Icons.faUndo} /> Reset to Default
          </button>
          <button 
            style={styles.secondaryBtn}
            onClick={handleExportSettings}
          >
            <FontAwesomeIcon icon={Icons.faDownload} /> Export Settings
          </button>
          <label style={styles.secondaryBtn}>
            <FontAwesomeIcon icon={Icons.faUpload} /> Import Settings
            <input
              type="file"
              accept=".json"
              onChange={handleImportSettings}
              style={{ display: 'none' }}
            />
          </label>
        </div>
        
        <button
          style={styles.logoutBtn}
          onClick={async () => {
            if (window.confirm('Are you sure you want to logout?')) {
              await logout();
              navigate('/admin/login');
            }
          }}
        >
          <FontAwesomeIcon icon={Icons.faSignOutAlt} /> Logout
        </button>
      </div>
    </div>
  );
};

// Styles
const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '30px',
    flexWrap: 'wrap',
    gap: '20px'
  },
  title: {
    fontSize: '28px',
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: '8px'
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b'
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px'
  },
  saveMessage: {
    padding: '10px 15px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  successMessage: {
    background: '#d1fae5',
    color: '#065f46',
    border: '1px solid #a7f3d0'
  },
  errorMessage: {
    background: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca'
  },
  unsavedMessage: {
    fontSize: '14px',
    color: '#f59e0b',
    fontWeight: '500'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '24px',
    marginBottom: '40px'
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px'
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#0f172a',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  },
  saveBtn: {
    padding: '8px 16px',
    background: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  },
  formGroup: {
    marginBottom: '20px'
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569',
    marginBottom: '8px'
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.3s',
    outline: 'none',
    boxSizing: 'border-box'
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.3s',
    outline: 'none',
    boxSizing: 'border-box',
    resize: 'vertical',
    minHeight: '80px'
  },
  select: {
    padding: '8px 12px',
    border: '2px solid #e2e8f0',
    borderRadius: '6px',
    fontSize: '14px',
    color: '#0f172a',
    background: 'white',
    cursor: 'pointer',
    minWidth: '140px'
  },
  settingRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: '1px solid #e2e8f0'
  },
  settingLabel: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#475569'
  },
  settingDesc: {
    fontSize: '12px',
    color: '#94a3b8',
    marginTop: '4px'
  },
  ipInputGroup: {
    display: 'flex',
    gap: '10px',
    marginBottom: '10px'
  },
  addBtn: {
    padding: '10px 16px',
    background: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    fontWeight: '600',
    fontSize: '14px',
    cursor: 'pointer',
    whiteSpace: 'nowrap'
  },
  ipList: {
    marginTop: '10px'
  },
  ipItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 12px',
    background: '#f8fafc',
    borderRadius: '6px',
    marginBottom: '8px'
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#ef4444',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '5px',
    borderRadius: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  actionSection: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '40px',
    paddingTop: '30px',
    borderTop: '1px solid #e2e8f0',
    flexWrap: 'wrap',
    gap: '20px'
  },
  actionButtons: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap'
  },
  secondaryBtn: {
    padding: '10px 20px',
    background: '#f1f5f9',
    color: '#475569',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  },
  logoutBtn: {
    padding: '12px 24px',
    background: '#dc2626',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.3s ease'
  }
};

// Add CSS for toggle switch
const toggleStyles = `
  .toggle-switch {
    position: relative;
    display: inline-block;
    width: 50px;
    height: 24px;
    cursor: pointer;
  }
  
  .toggle-switch input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .toggle-slider {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #e2e8f0;
    transition: .4s;
    border-radius: 34px;
  }
  
  .toggle-slider:before {
    position: absolute;
    content: "";
    height: 16px;
    width: 16px;
    left: 4px;
    bottom: 4px;
    background-color: white;
    transition: .4s;
    border-radius: 50%;
  }
  
  input:checked + .toggle-slider {
    background-color: #3b82f6;
  }
  
  input:checked + .toggle-slider:before {
    transform: translateX(26px);
  }
  
  input:disabled + .toggle-slider {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .secondary-btn:hover {
    background: #e2e8f0;
    border-color: #cbd5e1;
  }
  
  .save-btn:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }
  
  .logout-btn:hover {
    background: #b91c1c;
    transform: translateY(-1px);
  }
  
  input:focus, select:focus, textarea:focus {
    border-color: #3b82f6 !important;
    outline: none;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
`;

// Add styles to document
const styleSheet = document.createElement("style");
styleSheet.innerText = toggleStyles;
document.head.appendChild(styleSheet);

export default Settings;