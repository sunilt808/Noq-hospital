import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronLeft, 
  faExclamationCircle, 
  faCheckCircle, 
  faTrashAlt, 
  faUserSlash, 
  faWarning,
  faEdit
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const ManageComplaints = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState(null);
  const [actionForm, setActionForm] = useState({ action: 'warn', comment: '' });

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const hospitalId = currentUser?.hospitalId || currentUser?.hospital_id;
      if (!hospitalId) return;
      
      const res = await api.get(`/complaints?hospital_id=${hospitalId}`);
      setComplaints(res?.data?.complaints || []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && currentUser?.role === 'hm') {
      loadComplaints();
    }
  }, [currentUser, authLoading]);

  const handleTakeAction = async (complaintId) => {
    if (!actionForm.comment || actionForm.comment.length < 5) {
      alert('Please add a valid explanation for this action.');
      return;
    }

    try {
      await api.patch(`/complaints/${complaintId}/action`, actionForm);
      alert(`Action '${actionForm.action}' submitted successfully.`);
      setActioningId(null);
      setActionForm({ action: 'warn', comment: '' });
      loadComplaints();
    } catch (err) {
      console.error('Action failed:', err);
      alert('Failed to record action. Please try again.');
    }
  };

  const styles = {
    container: { maxWidth: 1000, margin: '0 auto', padding: '20px' },
    header: { display: 'flex', alignItems: 'center', gap: 15, marginBottom: 24 },
    backBtn: { border: 'none', background: '#f1f5f9', padding: '10px 14px', borderRadius: 10, cursor: 'pointer' },
    title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 20 },
    complaintRow: { padding: '16px 0', borderBottom: '1px solid #f1f5f9' },
    badge: (status) => ({
      padding: '4px 10px',
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 600,
      background: status === 'pending' ? '#fee2e2' : '#f0fdf4',
      color: status === 'pending' ? '#991b1b' : '#166534',
    }),
    btn: (color) => ({
      padding: '8px 14px',
      border: 'none',
      borderRadius: 8,
      fontSize: 13,
      fontWeight: 600,
      cursor: 'pointer',
      background: color,
      color: '#fff',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 6
    }),
    input: { width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #cbd5e1', marginBottom: 10 },
  };

  if (loading && complaints.length === 0) return <div style={styles.container}>Loading hospital complaints...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate(-1)}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <h1 style={styles.title}>Incident Management</h1>
      </div>

      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <FontAwesomeIcon icon={faExclamationCircle} style={{ color: '#ef4444' }} />
          <h3 style={{ margin: 0 }}>Active Public Grievances</h3>
        </div>
        
        {complaints.length === 0 ? (
          <p style={{ color: '#64748b' }}>No complaints filed for this hospital.</p>
        ) : (
          complaints.map(complaint => (
            <div key={complaint.id} style={styles.complaintRow}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 16 }}>
                    User: {complaint.patient_name} <span style={{ fontWeight: 400, fontSize: 13, color: '#94a3b8' }}>({complaint.token_number})</span>
                  </div>
                  <div style={{ marginTop: 4, color: '#4b5563', fontSize: 14 }}>
                    Against: <strong>{complaint.doctor_name}</strong> • Category: {complaint.issue_type}
                  </div>
                </div>
                <span style={styles.badge(complaint.status)}>{complaint.status.toUpperCase()}</span>
              </div>
              
              <div style={{ background: '#f8fafc', padding: 12, borderRadius: 10, marginTop: 12, fontSize: 14 }}>
                "{complaint.problem}"
              </div>

              {complaint.status === 'pending' ? (
                <div style={{ marginTop: 15 }}>
                  {actioningId === complaint.id ? (
                    <div style={{ border: '1px solid #e2e8f0', padding: 12, borderRadius: 8, background: '#fefce8' }}>
                      <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700 }}>Choose Correction Action:</label>
                      <select 
                        style={styles.input} 
                        value={actionForm.action}
                        onChange={(e) => setActionForm({...actionForm, action: e.target.value})}
                      >
                        <option value="warn">Formal Warning to Doctor</option>
                        <option value="notice">Issue Cause-Notice</option>
                        <option value="suspend">Suspend Doctor Permanently</option>
                        <option value="dismiss">Dismiss Complaint (Insufficient Evidence)</option>
                      </select>
                      <textarea 
                        style={{ ...styles.input, minHeight: 80 }} 
                        placeholder="Official comments for this action..." 
                        value={actionForm.comment}
                        onChange={(e) => setActionForm({...actionForm, comment: e.target.value})}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button style={styles.btn('#10b981')} onClick={() => handleTakeAction(complaint.id)}>
                          <FontAwesomeIcon icon={faCheckCircle} /> Record Action
                        </button>
                        <button style={styles.btn('#94a3b8')} onClick={() => setActioningId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <button style={styles.btn('#2563eb')} onClick={() => setActioningId(complaint.id)}>
                      <FontAwesomeIcon icon={faEdit} /> Address Issue
                    </button>
                  )}
                </div>
              ) : (
                <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 10, color: '#16a34a', fontSize: 14, fontWeight: 600 }}>
                  <FontAwesomeIcon icon={faCheckCircle} />
                  Action Taken: "{complaint.action_taken}" • {complaint.action_comment}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ManageComplaints;
