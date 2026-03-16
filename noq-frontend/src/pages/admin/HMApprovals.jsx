// pages/admin/HMApprovals.jsx
import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import * as Icons from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';

const HMApprovals = () => {
  const [hmRequests, setHmRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [currentHm, setCurrentHm] = useState(null);
  const [adminMessage, setAdminMessage] = useState('');
  const [actionType, setActionType] = useState('');

  const normalizeStatus = (status) => {
    const value = String(status || '').toLowerCase();
    if (value.includes('approve') || value === 'active') return 'approved';
    if (value.includes('warn')) return 'warned';
    if (value.includes('reject') || value.includes('block')) return 'rejected';
    if (value.includes('suspend')) return 'suspended';
    return 'pending';
  };

  const fetchHmApprovals = async () => {
    setLoading(true);
    setError('');

    try {
      const [hospitalsRes, hmUsersRes] = await Promise.all([
        api.get('/hospitals'),
        api.get('/users?role=hm'),
      ]);

      const hospitals = hospitalsRes?.data?.hospitals || [];
      const hmUsers = hmUsersRes?.data?.users || [];

      const merged = hospitals.map((hospital) => {
        const hospitalId = String(hospital?.id || hospital?.HID || '');
        const hmUser = hmUsers.find(
          (u) => String(u?.hospital_id || u?.hospitalId || '') === hospitalId
            || String(u?.email || '').toLowerCase() === String(hospital?.email || '').toLowerCase()
        );

        return {
          id: hospitalId,
          name: hmUser?.name || hospital?.hm_name || hospital?.hmName || 'N/A',
          email: hospital?.email || hmUser?.email || '',
          phone: hospital?.phone || hmUser?.phone || '',
          hospital: hospital?.hospital_name || hospital?.hospitalName || 'N/A',
          status: normalizeStatus(hospital?.status || hmUser?.status),
          date: String(hospital?.created_at || hmUser?.created_at || new Date().toISOString()).slice(0, 10),
          adminMessage: hospital?.admin_message || hospital?.adminMessage || '',
        };
      });

      setHmRequests(merged);
    } catch (err) {
      setHmRequests([]);
      setError(err?.message || 'Unable to load HM approvals.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHmApprovals();

    const refresh = () => fetchHmApprovals();
    window.addEventListener('focus', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
    };
  }, []);

  const handleAction = async (id, action) => {
    if (action === 'deleted') {
      alert('Delete is not enabled in backend for HM approvals. Use reject or suspend.');
      return;
    }

    if (action === 'rejected' || action === 'suspended' || action === 'warned') {
      setCurrentHm(hmRequests.find(hm => hm.id === id));
      setActionType(action);
      setShowMessageModal(true);
      return;
    }

    try {
      const status = action === 'approved' ? 'APPROVED' : action === 'rejected' ? 'REJECTED' : 'SUSPENDED';
      await api.patch(`/hospitals/${id}/status`, { status, message: '' });
      await fetchHmApprovals();
    } catch (err) {
      alert(err?.message || 'Unable to update HM status.');
    }
  };

  const handleMessageSubmit = async () => {
    if (!adminMessage.trim() || !currentHm?.id) return;

    try {
      if (actionType === 'warned') {
        await api.post('/hospitals/notifications/send', {
          title: 'Admin Warning',
          message: adminMessage.trim(),
          hospital_id: currentHm.id,
          target_role: 'hm',
          type: 'warning',
        });
      } else {
        const status = actionType === 'rejected' ? 'REJECTED' : 'SUSPENDED';
        await api.patch(`/hospitals/${currentHm.id}/status`, {
          status,
          message: adminMessage.trim(),
        });
      }

      await fetchHmApprovals();
      setShowMessageModal(false);
      setAdminMessage('');
      setCurrentHm(null);
      setActionType('');
    } catch (err) {
      alert(err?.message || 'Unable to submit admin action.');
    }
  };

  const filteredRequests = hmRequests.filter(hm => 
    filter === 'all' || hm.status === filter
  );

  const getStatusColor = (status) => {
    switch(status) {
      case 'approved': return '#10b981';
      case 'warned': return '#f97316';
      case 'rejected': return '#ef4444';
      case 'suspended': return '#f59e0b';
      default: return '#64748b';
    }
  };

  const getStatusText = (status) => {
    switch(status) {
      case 'approved': return 'Approved';
      case 'warned': return 'Warned';
      case 'rejected': return 'Blocked/Rejected';
      case 'suspended': return 'Suspended';
      default: return 'Pending';
    }
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
    filterTabs: {
      display: 'flex',
      gap: '10px',
      marginBottom: '20px'
    },
    filterTab: {
      padding: '8px 16px',
      borderRadius: '8px',
      background: '#f1f5f9',
      border: 'none',
      cursor: 'pointer',
      fontSize: '14px',
      color: '#64748b',
      transition: 'all 0.3s ease'
    },
    filterTabActive: {
      background: '#4f46e5',
      color: 'white'
    },
    table: {
      width: '100%',
      background: 'white',
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
    },
    tableHeader: {
      background: '#f8fafc',
      padding: '15px 20px',
      display: 'grid',
      gridTemplateColumns: '2fr 2fr 1fr 2fr 1.5fr 2fr',
      gap: '15px',
      fontWeight: '600',
      color: '#64748b',
      fontSize: '14px'
    },
    tableRow: {
      padding: '15px 20px',
      display: 'grid',
      gridTemplateColumns: '2fr 2fr 1fr 2fr 1.5fr 2fr',
      gap: '15px',
      alignItems: 'center',
      borderBottom: '1px solid #e2e8f0',
      transition: 'all 0.3s ease'
    },
    tableRowHover: {
      background: '#f8fafc'
    },
    statusBadge: {
      padding: '4px 12px',
      borderRadius: '20px',
      fontSize: '12px',
      fontWeight: '600',
      textTransform: 'capitalize'
    },
    actionButtons: {
      display: 'flex',
      gap: '8px'
    },
    actionButton: {
      padding: '6px 12px',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    approveBtn: {
      background: '#10b981',
      color: 'white'
    },
    rejectBtn: {
      background: '#ef4444',
      color: 'white'
    },
    suspendBtn: {
      background: '#f59e0b',
      color: 'white'
    },
    warnBtn: {
      background: '#f97316',
      color: 'white'
    },
    deleteBtn: {
      background: '#991b1b',
      color: 'white'
    },
    messageContainer: {
      marginTop: '8px',
      padding: '8px 12px',
      background: '#fee2e2',
      borderRadius: '6px',
      fontSize: '12px',
      color: '#b91c1c',
      borderLeft: '3px solid #dc2626'
    },
    messageLabel: {
      fontWeight: '600',
      marginBottom: '2px'
    },
    messageContent: {
      fontStyle: 'italic'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    },
    modalContent: {
      background: 'white',
      borderRadius: '12px',
      padding: '24px',
      width: '400px',
      maxWidth: '90%'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#0f172a',
      marginBottom: '16px'
    },
    modalText: {
      color: '#64748b',
      marginBottom: '16px',
      fontSize: '14px'
    },
    textarea: {
      width: '100%',
      padding: '12px',
      borderRadius: '8px',
      border: '1px solid #e2e8f0',
      fontSize: '14px',
      marginBottom: '16px',
      minHeight: '100px',
      resize: 'vertical'
    },
    modalButtons: {
      display: 'flex',
      justifyContent: 'flex-end',
      gap: '12px'
    },
    cancelBtn: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: '1px solid #e2e8f0',
      background: 'white',
      color: '#64748b',
      cursor: 'pointer',
      fontSize: '14px'
    },
    submitBtn: {
      padding: '8px 16px',
      borderRadius: '6px',
      border: 'none',
      background: '#4f46e5',
      color: 'white',
      cursor: 'pointer',
      fontSize: '14px'
    }
  };

  const [hoveredRow, setHoveredRow] = useState(null);

  return (
    <div>
      <div style={styles.header}>
        <h1 style={styles.title}>Hospital Manager Approvals</h1>
      </div>

      <div style={styles.filterTabs}>
        {['all', 'pending', 'approved', 'warned', 'rejected', 'suspended'].map(tab => (
          <button
            key={tab}
            style={{
              ...styles.filterTab,
              ...(filter === tab ? styles.filterTabActive : {})
            }}
            onClick={() => setFilter(tab)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {loading && <div style={{ marginBottom: 12, color: '#64748b' }}>Loading HM approvals...</div>}
      {error && <div style={{ marginBottom: 12, color: '#dc2626' }}>{error}</div>}

      <div style={styles.table}>
        <div style={styles.tableHeader}>
          <div>Name</div>
          <div>Email</div>
          <div>Phone</div>
          <div>Hospital</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {filteredRequests.map(hm => (
          <div
            key={hm.id}
            style={{
              ...styles.tableRow,
              ...(hoveredRow === hm.id ? styles.tableRowHover : {})
            }}
            onMouseEnter={() => setHoveredRow(hm.id)}
            onMouseLeave={() => setHoveredRow(null)}
          >
            <div style={{ fontWeight: '600', color: '#0f172a' }}>{hm.name}</div>
            <div>{hm.email}</div>
            <div>{hm.phone}</div>
            <div>{hm.hospital}</div>
            <div>
              <div>
                <span style={{
                  ...styles.statusBadge,
                  background: `${getStatusColor(hm.status)}20`,
                  color: getStatusColor(hm.status)
                }}>
                  {getStatusText(hm.status)}
                </span>
              </div>
              {hm.adminMessage && (
                <div style={styles.messageContainer}>
                  <div style={styles.messageLabel}>Admin Message:</div>
                  <div style={styles.messageContent}>{hm.adminMessage}</div>
                </div>
              )}
            </div>
            <div style={styles.actionButtons}>
              {hm.status === 'pending' && (
                <>
                  <button
                    style={{ ...styles.actionButton, ...styles.approveBtn }}
                    onClick={() => handleAction(hm.id, 'approved')}
                  >
                    <FontAwesomeIcon icon={Icons.faCheck} /> Approve
                  </button>
                  <button
                    style={{ ...styles.actionButton, ...styles.rejectBtn }}
                    onClick={() => handleAction(hm.id, 'rejected')}
                  >
                    <FontAwesomeIcon icon={Icons.faTimes} /> Reject
                  </button>
                  <button
                    style={{ ...styles.actionButton, ...styles.suspendBtn }}
                    onClick={() => handleAction(hm.id, 'suspended')}
                  >
                    <FontAwesomeIcon icon={Icons.faPause} /> Suspend
                  </button>
                  <button
                    style={{ ...styles.actionButton, ...styles.warnBtn }}
                    onClick={() => handleAction(hm.id, 'warned')}
                  >
                    <FontAwesomeIcon icon={Icons.faBell} /> Warn
                  </button>
                  <button
                    style={{ ...styles.actionButton, ...styles.deleteBtn }}
                    onClick={() => handleAction(hm.id, 'deleted')}
                  >
                    <FontAwesomeIcon icon={Icons.faTrash} /> Delete
                  </button>
                </>
              )}
              {(hm.status === 'rejected' || hm.status === 'suspended' || hm.status === 'warned' || hm.status === 'approved') && (
                <>
                  {hm.status !== 'approved' && (
                    <button
                      style={{ ...styles.actionButton, ...styles.approveBtn }}
                      onClick={() => handleAction(hm.id, 'approved')}
                    >
                      <FontAwesomeIcon icon={Icons.faCheck} /> Re-approve
                    </button>
                  )}
                  <button
                    style={{ ...styles.actionButton, ...styles.warnBtn }}
                    onClick={() => handleAction(hm.id, 'warned')}
                  >
                    <FontAwesomeIcon icon={Icons.faBell} /> Warn
                  </button>
                  <button
                    style={{ ...styles.actionButton, ...styles.deleteBtn }}
                    onClick={() => handleAction(hm.id, 'deleted')}
                  >
                    <FontAwesomeIcon icon={Icons.faTrash} /> Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}

        {filteredRequests.length === 0 && (
          <div style={{ padding: '20px', color: '#64748b' }}>
            No HM registrations found for this filter.
          </div>
        )}
      </div>

      {/* Message Modal */}
      {showMessageModal && currentHm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalContent}>
            <h3 style={styles.modalTitle}>
              {actionType === 'rejected'
                ? 'Reject Hospital Manager'
                : actionType === 'suspended'
                  ? 'Suspend Hospital Manager'
                  : 'Warn Hospital Manager'}
            </h3>
            <p style={styles.modalText}>
              You are about to {actionType} {currentHm.name} from {currentHm.hospital}.
              Please provide a reason that will be shown to the Hospital Manager:
            </p>
            <textarea
              style={styles.textarea}
              placeholder={`Enter reason for ${actionType}...`}
              value={adminMessage}
              onChange={(e) => setAdminMessage(e.target.value)}
            />
            <div style={styles.modalButtons}>
              <button
                style={styles.cancelBtn}
                onClick={() => {
                  setShowMessageModal(false);
                  setAdminMessage('');
                  setCurrentHm(null);
                  setActionType('');
                }}
              >
                Cancel
              </button>
              <button
                style={styles.submitBtn}
                onClick={handleMessageSubmit}
                disabled={!adminMessage.trim()}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HMApprovals;