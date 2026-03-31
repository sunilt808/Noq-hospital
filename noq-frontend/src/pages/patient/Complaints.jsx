import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faChevronLeft, 
  faExclamationTriangle, 
  faShieldAlt, 
  faNotesMedical, 
  faUserMd, 
  faHospital, 
  faHistory,
  faFlag
} from '@fortawesome/free-solid-svg-icons';
import api from '../../services/api';
import apiDbService from '../../services/apiDbService';
import { useAuth } from '../../context/AuthContext';
import useApiData from '../../hooks/useApiData';

const ISSUE_TYPES = [
  { id: 'irregular', label: 'Irregular' },
  { id: 'behaviour', label: 'Worst Behaviour' },
  { id: 'clinical', label: 'Clinical Error' },
  { id: 'delay', label: 'Long Delay' },
  { id: 'other', label: 'Other' },
];

const Complaints = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { hospitals: allHospitals } = useApiData();
  const [complaints, setComplaints] = useState([]);
  const [myComplaints, setMyComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    hospitalId: '',
    tokenNumber: '',
    doctorName: '',
    issueType: 'irregular',
    problem: '',
  });

  const loadComplaints = async () => {
    try {
      setLoading(true);
      const [allRes, myRes] = await Promise.all([
        api.get('/complaints'),
        currentUser ? api.get('/complaints/my') : Promise.resolve([])
      ]);
      setComplaints(allRes?.data?.complaints || []);
      setMyComplaints(myRes?.data?.complaints || []);
    } catch (err) {
      console.error('Failed to load complaints:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.hospitalId || !form.problem || !form.tokenNumber) {
      alert('Please fill all required fields');
      return;
    }

    const selectedHosp = allHospitals.find(h => String(h.id || h.HID) === String(form.hospitalId));

    try {
      setSubmitting(true);
      const payload = {
        hospital_id: String(form.hospitalId),
        hospital_name: selectedHosp?.hospitalName || selectedHosp?.name || 'Hospital',
        token_number: form.tokenNumber,
        doctor_name: form.doctorName || 'Unknown',
        issue_type: form.issueType,
        problem: form.problem,
      };

      await api.post('/complaints', payload);
      alert('Complaint submitted successfully. Admin and Hospital Management will review this.');
      setShowForm(false);
      setForm({ hospitalId: '', tokenNumber: '', doctorName: '', issueType: 'irregular', problem: '' });
      loadComplaints();
    } catch (err) {
      console.error('Submission failed:', err);
      alert('Failed to submit complaint. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const styles = {
    container: { maxWidth: 980, margin: '0 auto', padding: '20px' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
    backBtn: { border: 'none', background: '#f1f5f9', padding: '10px 14px', borderRadius: 10, cursor: 'pointer' },
    title: { margin: 0, fontSize: 24, fontWeight: 700, color: '#1e293b' },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, marginBottom: 20 },
    formGroup: { marginBottom: 15 },
    label: { display: 'block', fontSize: 13, color: '#64748b', marginBottom: 6, fontWeight: 600 },
    input: { width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #cbd5e1', outline: 'none' },
    submitBtn: { background: '#ef4444', color: '#fff', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 600, cursor: 'pointer' },
    complaintItem: { borderBottom: '1px solid #f1f5f9', padding: '16px 0', '&:last-child': { border: 'none' } },
    badge: (status) => ({
      padding: '4px 10px',
      borderRadius: 99,
      fontSize: 12,
      fontWeight: 600,
      background: status === 'pending' ? '#fef3c7' : '#dcfce7',
      color: status === 'pending' ? '#92400e' : '#166534',
    }),
    actionBadge: {
       padding: '3px 8px',
       background: '#fee2e2',
       color: '#991b1b',
       borderRadius: 6,
       fontSize: 12,
       fontWeight: 600,
       marginTop: 8,
       display: 'inline-block'
    }
  };

  if (loading && complaints.length === 0) return <div style={styles.container}>Loading complaints...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
          <button style={styles.backBtn} onClick={() => navigate(-1)}>
            <FontAwesomeIcon icon={faChevronLeft} />
          </button>
          <h1 style={styles.title}>Complaint Box</h1>
        </div>
        {currentUser?.role === 'patient' && (
          <button 
            style={{ ...styles.submitBtn, background: showForm ? '#475569' : '#ef4444' }} 
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? 'Cancel' : <><FontAwesomeIcon icon={faFlag} /> File a Complaint</>}
          </button>
        )}
      </div>

      {showForm && (
        <div style={styles.card}>
          <h3 style={{ marginTop: 0, marginBottom: 20, color: '#b91c1c' }}>
            <FontAwesomeIcon icon={faExclamationTriangle} /> New Misconduct Report
          </h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 15 }}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Hospital Visited *</label>
                <select 
                  style={styles.input} 
                  value={form.hospitalId} 
                  onChange={(e) => setForm({...form, hospitalId: e.target.value})}
                  required
                >
                  <option value="">Select Hospital</option>
                  {allHospitals.map(h => (
                    <option key={h.id || h.HID} value={h.id || h.HID}>{h.hospitalName || h.name}</option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Token ID / Proof Number *</label>
                <input 
                  style={styles.input} 
                  placeholder="e.g. TK-8829" 
                  value={form.tokenNumber}
                  onChange={(e) => setForm({...form, tokenNumber: e.target.value})}
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Doctor Name</label>
                <input 
                  style={styles.input} 
                  placeholder="Name of the doctor involved" 
                  value={form.doctorName}
                  onChange={(e) => setForm({...form, doctorName: e.target.value})}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Issue Category *</label>
                <select 
                  style={styles.input} 
                  value={form.issueType}
                  onChange={(e) => setForm({...form, issueType: e.target.value})}
                >
                  {ISSUE_TYPES.map(it => (
                    <option key={it.id} value={it.id}>{it.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>Detailed Problem *</label>
              <textarea 
                style={{ ...styles.input, minHeight: 120, resize: 'vertical' }} 
                placeholder="Explain the issue clearly..." 
                value={form.problem}
                onChange={(e) => setForm({...form, problem: e.target.value})}
                required
              />
            </div>

            <div style={{ textAlign: 'right' }}>
              <button 
                type="submit" 
                style={styles.submitBtn} 
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Confirm Submission'}
              </button>
            </div>
          </form>
        </div>
      )}

      {currentUser?.role === 'patient' && myComplaints.length > 0 && (
        <div style={styles.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
            <FontAwesomeIcon icon={faHistory} style={{ color: '#2563eb' }} />
            <h3 style={{ margin: 0 }}>My Filed Complaints</h3>
          </div>
          {myComplaints.map(complaint => (
            <div key={complaint.id} style={styles.complaintItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontWeight: 600 }}>{complaint.hospital_name}</span>
                <span style={styles.badge(complaint.status)}>{complaint.status}</span>
              </div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>
                Doctor: {complaint.doctor_name} • Issue: {complaint.issue_type}
              </div>
              <p style={{ marginTop: 8, fontSize: 14 }}>{complaint.problem}</p>
              {complaint.action_taken && (
                <div style={styles.actionBadge}>
                  Action: {complaint.action_taken.toUpperCase()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div style={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 15 }}>
          <FontAwesomeIcon icon={faShieldAlt} style={{ color: '#b91c1c' }} />
          <h3 style={{ margin: 0 }}>Community Feedback & Public Reports</h3>
        </div>
        {complaints.length === 0 ? (
          <p style={{ color: '#64748b' }}>No public complaints reported yet.</p>
        ) : (
          complaints.map(complaint => (
            <div key={`all-${complaint.id}`} style={styles.complaintItem}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 600, color: '#1e293b' }}>
                  {complaint.patient_name} reported misconduct at {complaint.hospital_name}
                </div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>
                  {new Date(complaint.created_at).toLocaleDateString()}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
                <span style={{ fontSize: 12, background: '#f1f5f9', padding: '2px 8px', borderRadius: 4 }}>
                  Doctor: {complaint.doctor_name}
                </span>
                <span style={{ fontSize: 12, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 4 }}>
                  Case: {complaint.issue_type}
                </span>
              </div>
              <p style={{ marginTop: 10, background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 14, color: '#334155' }}>
                "{complaint.problem}"
              </p>
              {complaint.status === 'action_taken' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, color: '#16a34a', fontSize: 12, fontWeight: 600 }}>
                  <FontAwesomeIcon icon={faNotesMedical} /> HM Action Taken: "{complaint.action_taken}"
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Complaints;
