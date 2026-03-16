// pages/admin/Profile.jsx
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';

const Profile = () => {
  const [profile, setProfile] = useState({
    name: 'Admin User',
    email: 'admin@noqhospital.com',
    role: 'System Administrator',
    phone: '+1 (555) 123-4567',
    joinedDate: '2023-01-15'
  });

  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');

  const handleProfileUpdate = (e) => {
    e.preventDefault();
    setMessage('Profile updated successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    const newErrors = {};
    
    if (!password.current) newErrors.current = 'Current password is required';
    if (!password.new) newErrors.new = 'New password is required';
    if (password.new.length < 8) newErrors.new = 'Password must be at least 8 characters';
    if (password.new !== password.confirm) newErrors.confirm = 'Passwords do not match';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setErrors({});
    setMessage('Password changed successfully!');
    setPassword({ current: '', new: '', confirm: '' });
    setTimeout(() => setMessage(''), 3000);
  };

  const styles = {
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '30px'
    },
    title: {
      fontSize: '28px',
      fontWeight: '700',
      color: '#0f172a'
    },
    profileGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '30px'
    },
    profileCard: {
      background: 'white',
      borderRadius: '12px',
      padding: '25px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#0f172a',
      marginBottom: '20px',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '20px',
      marginBottom: '30px'
    },
    avatar: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '32px',
      fontWeight: 'bold'
    },
    profileInfo: {
      flex: 1
    },
    profileName: {
      fontSize: '24px',
      fontWeight: '700',
      color: '#0f172a',
      marginBottom: '5px'
    },
    profileRole: {
      color: '#4f46e5',
      fontWeight: '600',
      marginBottom: '5px'
    },
    profileEmail: {
      color: '#64748b',
      fontSize: '14px'
    },
    formGroup: {
      marginBottom: '20px'
    },
    label: {
      display: 'block',
      marginBottom: '8px',
      fontWeight: '600',
      color: '#475569',
      fontSize: '14px'
    },
    input: {
      width: '100%',
      padding: '12px 15px',
      border: '2px solid #e2e8f0',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#0f172a',
      transition: 'all 0.3s ease'
    },
    inputError: {
      borderColor: '#ef4444'
    },
    errorText: {
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '5px'
    },
    submitBtn: {
      padding: '12px 24px',
      background: '#4f46e5',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '600',
      fontSize: '14px',
      transition: 'all 0.3s ease'
    },
    submitBtnHover: {
      background: '#4338ca',
      transform: 'translateY(-2px)'
    },
    message: {
      padding: '12px 20px',
      borderRadius: '8px',
      marginBottom: '20px',
      fontSize: '14px',
      fontWeight: '500'
    },
    successMessage: {
      background: '#d1fae5',
      color: '#065f46',
      border: '1px solid #a7f3d0'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '12px 0',
      borderBottom: '1px solid #e2e8f0'
    },
    infoLabel: {
      color: '#64748b',
      fontSize: '14px'
    },
    infoValue: {
      fontWeight: '600',
      color: '#0f172a',
      fontSize: '14px'
    }
  };

  const [hoveredBtn, setHoveredBtn] = useState('');

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Profile Settings</h1>
      </div>

      {message && (
        <div style={{ ...styles.message, ...styles.successMessage }}>
          {message}
        </div>
      )}

      <div style={styles.profileGrid}>
        <div style={styles.profileCard}>
          <div style={styles.cardTitle}>
            <FontAwesomeIcon icon={Icons.faUser} />
            Personal Information
          </div>
          
          <div style={styles.profileHeader}>
            <div style={styles.avatar}>
              {profile.name.charAt(0)}
            </div>
            <div style={styles.profileInfo}>
              <div style={styles.profileName}>{profile.name}</div>
              <div style={styles.profileRole}>{profile.role}</div>
              <div style={styles.profileEmail}>{profile.email}</div>
            </div>
          </div>

          <form onSubmit={handleProfileUpdate}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Full Name</label>
              <input
                type="text"
                style={styles.input}
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Email Address</label>
              <input
                type="email"
                style={styles.input}
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Phone Number</label>
              <input
                type="tel"
                style={styles.input}
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...(hoveredBtn === 'profile' ? styles.submitBtnHover : {})
              }}
              onMouseEnter={() => setHoveredBtn('profile')}
              onMouseLeave={() => setHoveredBtn('')}
            >
              Update Profile
            </button>
          </form>
        </div>

        <div style={styles.profileCard}>
          <div style={styles.cardTitle}>
            <FontAwesomeIcon icon={Icons.faLock} />
            Change Password
          </div>

          <form onSubmit={handlePasswordChange}>
            <div style={styles.formGroup}>
              <label style={styles.label}>Current Password</label>
              <input
                type="password"
                style={{
                  ...styles.input,
                  ...(errors.current ? styles.inputError : {})
                }}
                value={password.current}
                onChange={(e) => setPassword({ ...password, current: e.target.value })}
              />
              {errors.current && <div style={styles.errorText}>{errors.current}</div>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>New Password</label>
              <input
                type="password"
                style={{
                  ...styles.input,
                  ...(errors.new ? styles.inputError : {})
                }}
                value={password.new}
                onChange={(e) => setPassword({ ...password, new: e.target.value })}
              />
              {errors.new && <div style={styles.errorText}>{errors.new}</div>}
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Confirm New Password</label>
              <input
                type="password"
                style={{
                  ...styles.input,
                  ...(errors.confirm ? styles.inputError : {})
                }}
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
              />
              {errors.confirm && <div style={styles.errorText}>{errors.confirm}</div>}
            </div>

            <button
              type="submit"
              style={{
                ...styles.submitBtn,
                ...(hoveredBtn === 'password' ? styles.submitBtnHover : {})
              }}
              onMouseEnter={() => setHoveredBtn('password')}
              onMouseLeave={() => setHoveredBtn('')}
            >
              Change Password
            </button>
          </form>

          <div style={{ marginTop: '30px' }}>
            <div style={styles.cardTitle}>
              <FontAwesomeIcon icon={Icons.faInfoCircle} />
              Account Information
            </div>
            
            <div style={styles.infoRow}>
              <div style={styles.infoLabel}>User Role</div>
              <div style={styles.infoValue}>{profile.role}</div>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoLabel}>Account Created</div>
              <div style={styles.infoValue}>{profile.joinedDate}</div>
            </div>
            <div style={styles.infoRow}>
              <div style={styles.infoLabel}>Last Login</div>
              <div style={styles.infoValue}>Today, 10:30 AM</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};export default Profile;