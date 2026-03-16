// Profile.js – Internal CSS version (matches Settings UI/UX)
import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "../../context/FirebaseAuthContext";
import useFirebaseData from "../../hooks/useFirebaseData";
import firebaseDbService from "../../services/firebaseDbService";
import {
  faUser,
  faEnvelope,
  faPhone,
  faCalendar,
  faDroplet,
  faEdit,
  faSave,
  faXmark,
  faCamera,
  faShieldHalved,
  faHistory,
  faFileMedical
} from "@fortawesome/free-solid-svg-icons";

const Profile = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { patients, appointments, medicalRecords, loading: dataLoading } = useFirebaseData();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [message, setMessage] = useState({ type: '', text: '' });

  // Get current patient from Firebase
  const patient = useMemo(() => {
    const matchedPatient = patients.find(p =>
      p.id === currentUser?.id || 
      p.email?.toLowerCase() === currentUser?.email?.toLowerCase()
    );

    if (matchedPatient) {
      return matchedPatient;
    }

    if (currentUser && String(currentUser?.role || '').toLowerCase() === 'patient') {
      return currentUser;
    }

    return null;
  }, [patients, currentUser]);

  // Verify patient is authenticated
  useEffect(() => {
    if (!authLoading && (!currentUser || String(currentUser?.role || '').toLowerCase() !== 'patient')) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, authLoading, navigate]);

  // Set initial edit form
  useEffect(() => {
    if (patient) {
      const nextForm = {
        ...patient,
        name: patient.name || patient.fullName || ''
      };

      setEditForm((prev) => {
        const prevKeys = Object.keys(prev || {});
        const nextKeys = Object.keys(nextForm);

        if (
          prevKeys.length === nextKeys.length &&
          nextKeys.every((key) => prev?.[key] === nextForm[key])
        ) {
          return prev;
        }

        return nextForm;
      });
    }
  }, [patient]);

  const handleEditToggle = () => {
    if (isEditing) {
      setEditForm(patient);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!editForm.name?.trim()) {
      setMessage({ type: 'error', text: 'Full name is required.' });
      return;
    }

    if (!editForm.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
      setMessage({ type: 'error', text: 'A valid email address is required.' });
      return;
    }

    if (editForm.phone && !/^[0-9]{10,15}$/.test(String(editForm.phone).replace(/[^0-9]/g, ''))) {
      setMessage({ type: 'error', text: 'Phone number must contain 10 to 15 digits.' });
      return;
    }

    try {
      const normalizedEditForm = {
        ...editForm,
        name: editForm.name || '',
        fullName: editForm.name || '',
        updatedAt: new Date().toISOString(),
      };

      const profileId = patient?.id || currentUser?.id;
      if (!profileId) {
        setMessage({ type: 'error', text: 'Unable to identify profile to update.' });
        return;
      }

      await firebaseDbService.upsert("patients", profileId, normalizedEditForm);

      // Update local state with saved changes
      setEditForm(normalizedEditForm);
      
      setIsEditing(false);
      setMessage({ type: 'success', text: 'Profile updated successfully.' });
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to save profile.' });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: value }));
  };

  const getPatientAvatar = (patientData) => {
    if (!patientData) return '';
    return (
      patientData.profileImage ||
      patientData.avatar ||
      patientData.avatarUrl ||
      patientData.photoUrl ||
      patientData.photoURL ||
      patientData.image ||
      ''
    );
  };

  const patientAvatar = getPatientAvatar(patient);
  const normalizedStatus = String(patient?.status || 'active').toLowerCase();
  const statusLabel = normalizedStatus === 'active' ? 'Active' : normalizedStatus === 'blocked' ? 'Blocked' : normalizedStatus === 'inactive' ? 'Inactive' : normalizedStatus;

  // Calculate stats from Firebase data
  const stats = useMemo(() => {
    const patientMedicalRecords = medicalRecords.filter(
      (record) => record.patientId === patient?.id || record.patientEmail?.toLowerCase() === patient?.email?.toLowerCase()
    );
    const patientAppointments = appointments.filter(
      (appointment) =>
        appointment.patientId === patient?.id ||
        appointment.patientEmail?.toLowerCase() === patient?.email?.toLowerCase()
    );
    return {
      medicalRecords: patientMedicalRecords.length,
      appointments: patientAppointments.length
    };
  }, [patient, medicalRecords, appointments]);

  const calculateAge = (dob) => {
    if (!dob) return "N/A";
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  if (dataLoading || authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
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

  if (!patient) {
    return (
      <div className="empty-state">
        <h3>Patient not found</h3>
        <p>Please login again</p>
        <style>{`
          .empty-state {
            text-align: center;
            padding: 3rem;
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            max-width: 400px;
            margin: 2rem auto;
          }
          .empty-state h3 {
            margin-bottom: 0.5rem;
            color: #333;
          }
          .empty-state p {
            color: #666;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Internal CSS – all styles here */}
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
        .profile-container {
          background: white;
          border-radius: 16px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.05);
          overflow: hidden;
        }
        .profile-header {
          display: flex;
          align-items: center;
          gap: 2rem;
          padding: 2rem;
          background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
          border-bottom: 1px solid #e2e8f0;
          flex-wrap: wrap;
        }
        .profile-avatar {
          position: relative;
        }
        .avatar-circle {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 3rem;
          font-weight: 500;
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
          overflow: hidden;
        }
        .avatar-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .avatar-upload {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: white;
          border: 2px solid #e2e8f0;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }
        .avatar-upload:hover {
          background: #f1f5f9;
          color: #3b82f6;
        }
        .profile-info {
          flex: 1;
        }
        .profile-info h2 {
          font-size: 1.8rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.25rem;
        }
        .patient-id {
          color: #64748b;
          font-size: 0.95rem;
          margin-bottom: 0.5rem;
        }
        .profile-status {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .status-badge {
          display: inline-flex;
          align-items: center;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 500;
        }
        .status-badge.active {
          background: #dcfce7;
          color: #15803d;
        }
        .status-badge.inactive {
          background: #fee2e2;
          color: #991b1b;
        }
        .member-since {
          color: #64748b;
          font-size: 0.9rem;
        }
        .profile-actions {
          display: flex;
          gap: 0.75rem;
        }
        .action-btn {
          padding: 0.6rem 1.2rem;
          border-radius: 8px;
          border: none;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .action-btn.primary {
          background: #3b82f6;
          color: white;
        }
        .action-btn.primary:hover {
          background: #2563eb;
        }
        .action-btn.secondary {
          background: #f1f5f9;
          color: #1e293b;
        }
        .action-btn.secondary:hover {
          background: #e2e8f0;
        }
        .action-btn.success {
          background: #10b981;
          color: white;
        }
        .action-btn.success:hover {
          background: #059669;
        }
        .profile-sections {
          padding: 2rem;
        }
        .profile-section {
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
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1.5rem;
        }
        .info-item {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .info-item label {
          font-size: 0.85rem;
          font-weight: 500;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .info-item span {
          font-size: 1rem;
          color: #1e293b;
          font-weight: 500;
        }
        .form-input {
          width: 100%;
          padding: 0.5rem 0.75rem;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }
        .form-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        textarea.form-input {
          min-height: 80px;
          resize: vertical;
        }
        .health-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
          padding: 1rem;
        }
        .health-stat {
          background: white;
          border-radius: 10px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }
        .health-stat svg {
          font-size: 2rem;
          color: #3b82f6;
          background: #dbeafe;
          padding: 0.5rem;
          border-radius: 50%;
          width: 40px;
          height: 40px;
        }
        .health-stat h4 {
          font-size: 0.9rem;
          color: #64748b;
          margin-bottom: 0.25rem;
        }
        .health-stat p {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1e293b;
        }
        .security-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
          padding: 1.5rem;
        }
        .security-btn {
          padding: 0.6rem 1.2rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #1e293b;
          font-size: 0.95rem;
          font-weight: 500;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          transition: all 0.2s;
        }
        .security-btn:hover {
          background: #f1f5f9;
        }
        .security-btn.danger:hover {
          background: #fee2e2;
          border-color: #ef4444;
          color: #ef4444;
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
          .profile-header {
            flex-direction: column;
            text-align: center;
          }
          .profile-actions {
            width: 100%;
            justify-content: center;
          }
          .info-grid {
            grid-template-columns: 1fr;
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
          <FontAwesomeIcon icon={faUser} className="header-icon" /> My Profile
        </h1>
        <p className="page-subtitle">
          Manage your personal information and health details
        </p>
      </div>

      {message.text && <div className={`page-message ${message.type}`}>{message.text}</div>}

      <div className="profile-container">
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            <div className="avatar-circle">
              {patientAvatar ? (
                <img src={patientAvatar} alt="Profile" className="avatar-image" />
              ) : (
                patient.name ? patient.name.charAt(0).toUpperCase() : "P"
              )}
            </div>
            <button className="avatar-upload">
              <FontAwesomeIcon icon={faCamera} />
            </button>
          </div>
          <div className="profile-info">
            <h2>{patient.name}</h2>
            <p className="patient-id">Patient ID: {patient.id || "N/A"}</p>
            <div className="profile-status">
              <span className={`status-badge ${normalizedStatus === 'active' ? 'active' : 'inactive'}`}>{statusLabel}</span>
              <span className="member-since">
                Member since{" "}
                {(patient.createdAt || patient.updatedAt)
                  ? new Date(patient.createdAt || patient.updatedAt).toLocaleDateString()
                  : "Not available"}
              </span>
            </div>
          </div>
          <div className="profile-actions">
            <button
              className={`action-btn ${isEditing ? "secondary" : "primary"}`}
              onClick={handleEditToggle}
            >
              <FontAwesomeIcon icon={isEditing ? faXmark : faEdit} />
              {isEditing ? "Cancel" : "Edit Profile"}
            </button>
            {isEditing && (
              <button className="action-btn success" onClick={handleSave}>
                <FontAwesomeIcon icon={faSave} /> Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Sections */}
        <div className="profile-sections">
          {/* Personal Information */}
          <div className="profile-section">
            <div className="section-header">
              <h3><FontAwesomeIcon icon={faUser} /> Personal Information</h3>
            </div>
            <div className="section-content">
              <div className="info-grid">
                <div className="info-item">
                  <label>Full Name</label>
                  {isEditing ? (
                    <input type="text" name="name" value={editForm.name || ""} onChange={handleChange} className="form-input" />
                  ) : (
                    <span>{patient.name}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Date of Birth</label>
                  {isEditing ? (
                    <input type="date" name="dob" value={editForm.dob || ""} onChange={handleChange} className="form-input" />
                  ) : (
                    <span>{patient.dob || "N/A"}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Age</label>
                  <span>{calculateAge(patient.dob)} years</span>
                </div>
                <div className="info-item">
                  <label>Gender</label>
                  {isEditing ? (
                    <select name="gender" value={editForm.gender || ""} onChange={handleChange} className="form-input">
                      <option value="">Select Gender</option>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  ) : (
                    <span>{patient.gender || "Not specified"}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Blood Group</label>
                  {isEditing ? (
                    <select name="bloodGroup" value={editForm.bloodGroup || ""} onChange={handleChange} className="form-input">
                      <option value="">Select Blood Group</option>
                      <option>A+</option> <option>A-</option> <option>B+</option> <option>B-</option>
                      <option>O+</option> <option>O-</option> <option>AB+</option> <option>AB-</option>
                    </select>
                  ) : (
                    <span>{patient.bloodGroup || "Not specified"}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="profile-section">
            <div className="section-header">
              <h3><FontAwesomeIcon icon={faPhone} /> Contact Information</h3>
            </div>
            <div className="section-content">
              <div className="info-grid">
                <div className="info-item">
                  <label>Email Address</label>
                  {isEditing ? (
                    <input type="email" name="email" value={editForm.email || ""} onChange={handleChange} className="form-input" />
                  ) : (
                    <span>{patient.email}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Phone</label>
                  {isEditing ? (
                    <input type="tel" name="phone" value={editForm.phone || ""} onChange={handleChange} className="form-input" />
                  ) : (
                    <span>{patient.phone || "Not provided"}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>Address</label>
                  {isEditing ? (
                    <textarea name="address" value={editForm.address || ""} onChange={handleChange} className="form-input" />
                  ) : (
                    <span>{patient.address || "Not provided"}</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Health Summary */}
          <div className="profile-section">
            <div className="section-header">
              <h3><FontAwesomeIcon icon={faFileMedical} /> Health Summary</h3>
            </div>
            <div className="health-summary">
              <div className="health-stat">
                <FontAwesomeIcon icon={faHistory} />
                <div><h4>Medical Records</h4><p>{stats.medicalRecords}</p></div>
              </div>
              <div className="health-stat">
                <FontAwesomeIcon icon={faCalendar} />
                <div><h4>Appointments</h4><p>{stats.appointments}</p></div>
              </div>
              <div className="health-stat">
                <FontAwesomeIcon icon={faDroplet} />
                <div><h4>Blood Group</h4><p>{patient.bloodGroup || "Not specified"}</p></div>
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="profile-section">
            <div className="section-header">
              <h3><FontAwesomeIcon icon={faShieldHalved} /> Account Security</h3>
            </div>
            <div className="security-actions">
              <button className="security-btn" onClick={() => navigate('/patient/settings')}><FontAwesomeIcon icon={faEnvelope} /> Manage Email</button>
              <button className="security-btn" onClick={() => navigate('/patient/settings')}><FontAwesomeIcon icon={faShieldHalved} /> Change Password</button>
              <button className="security-btn" onClick={() => navigate('/patient/settings')}><FontAwesomeIcon icon={faFileMedical} /> Privacy & Security</button>
              <button className="security-btn danger" onClick={() => navigate('/patient/settings')}>Account Controls</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;