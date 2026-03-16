// pages/hm/management/PendingApproval.jsx - OPTIMIZED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faClock,
  faShieldAlt,
  faEnvelope,
  faPhone,
  faBuilding,
  faUserTie,
  faCheckCircle,
  faTimesCircle,
  faHourglassHalf,
  faArrowLeft,
  faSync,
  faInfoCircle
} from '@fortawesome/free-solid-svg-icons';

const PendingApproval = () => {
  const navigate = useNavigate();
  const [hospitalData, setHospitalData] = useState(null);
  const [timeElapsed, setTimeElapsed] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // CSS as JavaScript object for internal styling
  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '1rem'
    },
    card: {
      background: 'white',
      borderRadius: '16px',
      padding: '2rem',
      width: '100%',
      maxWidth: '500px',
      boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
      animation: 'fadeIn 0.5s ease-out'
    },
    statusIcon: {
      marginBottom: '1.5rem',
      animation: 'pulse 2s infinite'
    },
    title: {
      margin: '0 0 0.5rem',
      color: '#1e293b',
      fontSize: '1.875rem',
      fontWeight: '700'
    },
    subtitle: {
      color: '#64748b',
      marginBottom: '2rem',
      fontSize: '1rem'
    },
    section: {
      background: '#f8fafc',
      padding: '1.5rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      border: '1px solid #e2e8f0'
    },
    sectionTitle: {
      margin: '0 0 1rem',
      color: '#334155',
      fontSize: '1.125rem',
      fontWeight: '600'
    },
    detailItem: {
      display: 'flex',
      justifyContent: 'space-between',
      padding: '0.5rem 0',
      borderBottom: '1px solid #f1f5f9'
    },
    detailLabel: {
      color: '#64748b',
      fontWeight: '500'
    },
    detailValue: {
      color: '#1e293b',
      fontWeight: '600'
    },
    infoBox: {
      background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
      padding: '1.25rem',
      borderRadius: '12px',
      marginBottom: '1.5rem',
      border: '2px solid #fbbf24'
    },
    infoTitle: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      color: '#92400e',
      margin: '0 0 0.75rem',
      fontWeight: '600'
    },
    list: {
      margin: '0.5rem 0 0 1.5rem',
      color: '#92400e',
      lineHeight: '1.6'
    },
    listItem: {
      marginBottom: '0.5rem',
      paddingLeft: '0.25rem'
    },
    timeBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.375rem',
      background: '#e0f2fe',
      color: '#0369a1',
      padding: '0.375rem 0.75rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '500',
      marginTop: '0.5rem'
    },
    buttonGroup: {
      display: 'flex',
      gap: '1rem',
      marginTop: '1.5rem'
    },
    button: {
      flex: 1,
      padding: '0.875rem 1.5rem',
      border: 'none',
      borderRadius: '12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem',
      fontWeight: '600',
      fontSize: '0.9375rem',
      transition: 'all 0.3s ease',
      '&:hover': {
        transform: 'translateY(-2px)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      },
      '&:active': {
        transform: 'translateY(0)'
      }
    },
    buttonSecondary: {
      background: '#f1f5f9',
      color: '#475569'
    },
    buttonPrimary: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: 'white'
    },
    loading: {
      textAlign: 'center',
      padding: '3rem'
    },
    shimmer: {
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }
  };

  // Global styles as string for style tag
  const globalStyles = `
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
    @keyframes shimmer {
      0% { background-position: -200% 0; }
      100% { background-position: 200% 0; }
    }
    * {
      box-sizing: border-box;
    }
  `;

  useEffect(() => {
    // Simulate API call
    const fetchData = async () => {
      setRefreshing(true);
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const data = {
        HID: 'NOQ-PRI-12345',
        hospitalName: 'City General Hospital',
        category: 'Private',
        hmName: 'Dr. Sarah Johnson',
        email: 'sarah@hospital.com',
        phone: '9876543210',
        status: 'PENDING_APPROVAL',
        submissionDate: '2024-01-15T10:30:00Z',
        expectedTime: '24-48 hours',
        lastUpdated: new Date().toISOString()
      };
      
      setHospitalData(data);
      setRefreshing(false);
      
      // Calculate time elapsed
      const submissionDate = new Date(data.submissionDate);
      const now = new Date();
      const diffHours = Math.floor((now - submissionDate) / (1000 * 60 * 60));
      const diffMinutes = Math.floor((now - submissionDate) / (1000 * 60)) % 60;
      
      if (diffHours > 0) {
        setTimeElapsed(`${diffHours}h ${diffMinutes}m ago`);
      } else {
        setTimeElapsed(`${diffMinutes} minutes ago`);
      }
    };
    
    fetchData();
  }, []);

  const getStatusConfig = (status) => ({
    PENDING_APPROVAL: { icon: faHourglassHalf, color: '#f59e0b', text: 'Under Review' },
    APPROVED: { icon: faCheckCircle, color: '#10b981', text: 'Approved' },
    REJECTED: { icon: faTimesCircle, color: '#ef4444', text: 'Rejected' }
  }[status] || { icon: faClock, color: '#64748b', text: 'Unknown' });

  const handleLogout = () => {
    navigate('/login');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    window.location.reload();
  };

  if (!hospitalData) {
    return (
      <>
        <style>{globalStyles}</style>
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.loading}>
              <FontAwesomeIcon 
                icon={faSync} 
                spin 
                size="2x" 
                style={{ color: '#3b82f6', marginBottom: '1rem' }}
              />
              <p style={{ color: '#64748b' }}>Loading approval status...</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const statusConfig = getStatusConfig(hospitalData.status);

  return (
    <>
      <style>{globalStyles}</style>
      <div style={styles.container}>
        <div style={styles.card}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <FontAwesomeIcon 
              icon={statusConfig.icon} 
              size="3x"
              style={{ 
                ...styles.statusIcon, 
                color: statusConfig.color 
              }}
            />
            <h1 style={styles.title}>Awaiting Admin Approval</h1>
            <p style={styles.subtitle}>
              Your hospital registration is currently under review
              <br />
              <span style={styles.timeBadge}>
                <FontAwesomeIcon icon={faClock} size="xs" />
                Submitted {timeElapsed}
              </span>
            </p>
          </div>

          {/* Hospital Details */}
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FontAwesomeIcon icon={faBuilding} style={{ marginRight: '0.5rem' }} />
              Hospital Details
            </h3>
            <div>
              {[
                { label: 'Hospital ID', value: hospitalData.HID },
                { label: 'Hospital Name', value: hospitalData.hospitalName },
                { label: 'Category', value: hospitalData.category },
                { label: 'Manager', value: hospitalData.hmName },
                { label: 'Email', value: hospitalData.email },
                { label: 'Phone', value: hospitalData.phone }
              ].map((item, index) => (
                <div key={index} style={styles.detailItem}>
                  <span style={styles.detailLabel}>{item.label}</span>
                  <span style={styles.detailValue}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Information Box */}
          <div style={styles.infoBox}>
            <h4 style={styles.infoTitle}>
              <FontAwesomeIcon icon={faInfoCircle} />
              What happens next?
            </h4>
            <ul style={styles.list}>
              <li style={styles.listItem}>
                System administrator will review your registration details
              </li>
              <li style={styles.listItem}>
                You'll receive email notification upon approval or rejection
              </li>
              <li style={styles.listItem}>
                Typical processing time: {hospitalData.expectedTime}
              </li>
              <li style={styles.listItem}>
                You can refresh this page to check for updates
              </li>
            </ul>
          </div>

          {/* Action Buttons */}
          <div style={styles.buttonGroup}>
            <button
              onClick={handleLogout}
              style={{
                ...styles.button,
                ...styles.buttonSecondary
              }}
              disabled={refreshing}
            >
              <FontAwesomeIcon icon={faArrowLeft} />
              Back to Login
            </button>
            
            <button
              onClick={handleRefresh}
              style={{
                ...styles.button,
                ...styles.buttonPrimary,
                opacity: refreshing ? 0.7 : 1
              }}
              disabled={refreshing}
            >
              <FontAwesomeIcon icon={faSync} spin={refreshing} />
              {refreshing ? 'Refreshing...' : 'Refresh Status'}
            </button>
          </div>

          {/* Footer Note */}
          <p style={{
            textAlign: 'center',
            fontSize: '0.75rem',
            color: '#94a3b8',
            marginTop: '1.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid #e2e8f0'
          }}>
            <FontAwesomeIcon icon={faShieldAlt} style={{ marginRight: '0.25rem' }} />
            Your data is securely encrypted and protected
          </p>
        </div>
      </div>
    </>
  );
};

export default PendingApproval;