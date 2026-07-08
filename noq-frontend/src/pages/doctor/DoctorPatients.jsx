import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import doctorService from '../../services/doctorService';
import {
  faArrowLeft, faUserInjured, faSearch, faFilter,
  faBan, faCheckCircle, faExclamationTriangle, faClock,
  faPhone, faEnvelope, faHistory, faUserClock, faMoneyBill,
  faEdit, faTrash, faEye, faUnlock, faBell, faUserShield,
  faCalendar, faFileMedical, faStethoscope, faWarning,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';
import './doctor.css';

const DoctorPatients = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'doctor')) {
      navigate('/login', { replace: true });
      return;
    }
  }, [authLoading, currentUser, navigate]);

  // Load doctor patients
  useEffect(() => {
    if (authLoading || !currentUser) return;

    const loadPatients = async () => {
      try {
        setLoading(true);
        const data = await doctorService.getDoctorPatients(currentUser.id);
        setPatients(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading patients:', error);
        setPatients([]);
      } finally {
        setLoading(false);
      }
    };

    loadPatients();
  }, [authLoading, currentUser]);

  const updatePatientLocal = (patientId, updater) => {
    const existing = patients.find((p) => String(p.id) === String(patientId));
    if (!existing) return null;
    const updatedPatient = updater(existing);
    setPatients((prev) => prev.map((p) => (String(p.id) === String(patientId) ? updatedPatient : p)));
    return updatedPatient;
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = (patient.full_name || patient.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (patient.phone || '').includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || patient.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const handleWarnPatient = (patient) => {
    updatePatientLocal(patient.id, (p) => ({
      ...p,
      status: 'warned',
      blockLevel: 1,
      missedAppointments: (p.missedAppointments || 0) + 1,
      warnings: [...(p.warnings || []), `${new Date().toLocaleDateString()}: Warned for 1st miss`]
    }));
    alert(`Warning sent to ${patient.name} for missed appointment`);
  };

  const handleFinePatient = async (patient) => {
    if (patient.status === 'warned') {
      updatePatientLocal(patient.id, (p) => ({
        ...p,
        status: 'fined',
        blockLevel: 2,
        fines: (p.fines || 0) + 200,
        warnings: [...(p.warnings || []), `${new Date().toLocaleDateString()}: Fined ₹200 for 2nd miss`]
      }));
      alert(`Fined ${patient.name} ₹200 for 2nd missed appointment`);
    }
  };

  const handleBlockPatient = (patient) => {
    updatePatientLocal(patient.id, (p) => ({
      ...p,
      status: 'blocked',
      blockLevel: 3,
      missedAppointments: (p.missedAppointments || 0) + 1,
      warnings: [...(p.warnings || []), `${new Date().toLocaleDateString()}: Blocked for 3rd miss`]
    }));
    alert(`${patient.name} has been blocked from booking appointments`);
  };

  const handleUnblockPatient = async (patient) => {
    updatePatientLocal(patient.id, (p) => ({
      ...p,
      status: 'active',
      blockLevel: 0,
      warnings: []
    }));
    alert(`Unblocked ${patient.name}. They can now book appointments.`);
  };

  const viewPatientDetails = (patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#10b981';
      case 'warned': return '#f59e0b';
      case 'fined': return '#ef4444';
      case 'blocked': return '#6b7280';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return faCheckCircle;
      case 'warned': return faExclamationTriangle;
      case 'fined': return faMoneyBill;
      case 'blocked': return faBan;
      default: return faUserInjured;
    }
  };

  const getBlockLevelText = (level) => {
    switch (level) {
      case 0: return 'No issues';
      case 1: return '1st miss - Warned';
      case 2: return '2nd miss - Fined';
      case 3: return '3rd miss - Blocked';
      default: return 'Unknown';
    }
  };

  if (loading || authLoading || !currentUser) {
    return (
      <div className="doctor-loading">
        <div className="loading-spinner"></div>
        <p>Loading patient management...</p>
      </div>
    );
  }

  return (
    <div className="doctor-portal">
      {/* Header */}
      <header className="doctor-header">
        <div className="doctor-header-left">
          <button
            className="doctor-btn doctor-btn-secondary"
            onClick={() => navigate('/doctor/dashboard')}
          >
            <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
          </button>
          <div className="doctor-greeting">
            <h1>Patient Management</h1>
            <p className="doctor-specialization">
              <FontAwesomeIcon icon={faUserShield} /> Manage patients & blocking system
            </p>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="doctor-stats-grid">
        <div className="stat-card blue">
          <FontAwesomeIcon icon={faUserInjured} className="stat-icon" />
          <div className="stat-value">{patients.length}</div>
          <div className="stat-label">Total Patients</div>
        </div>

        <div className="stat-card green">
          <FontAwesomeIcon icon={faCheckCircle} className="stat-icon" />
          <div className="stat-value">{patients.filter(p => p.status === 'active').length}</div>
          <div className="stat-label">Active</div>
        </div>

        <div className="stat-card orange">
          <FontAwesomeIcon icon={faWarning} className="stat-icon" />
          <div className="stat-value">{patients.filter(p => p.status === 'warned' || p.status === 'fined').length}</div>
          <div className="stat-label">Warned/Fined</div>
        </div>

        <div className="stat-card red">
          <FontAwesomeIcon icon={faBan} className="stat-icon" />
          <div className="stat-value">{patients.filter(p => p.status === 'blocked').length}</div>
          <div className="stat-label">Blocked</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="doctor-main-content">
        {/* Left Column - Patient List */}
        <div className="doctor-left-column">
          {/* Search & Filter */}
          <div className="doctor-card">
            <div className="queue-header">
              <h3>
                <FontAwesomeIcon icon={faUserInjured} />
                Patients ({filteredPatients.length})
              </h3>
              <div className="queue-controls">
                <div className="search-box">
                  <FontAwesomeIcon icon={faSearch} />
                  <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="warned">Warned</option>
                  <option value="fined">Fined</option>
                  <option value="blocked">Blocked</option>
                </select>
              </div>
            </div>
          </div>

          {/* Patients List */}
          <div className="doctor-card">
            {filteredPatients.length === 0 ? (
              <div className="empty-queue">
                <FontAwesomeIcon icon={faUserInjured} size="2x" />
                <p>No patients found</p>
              </div>
            ) : (
              <div className="patients-list">
                {filteredPatients.map(patient => (
                  <div
                    key={patient.id}
                    className={`patient-item ${patient.status}`}
                  >
                    <div className="patient-item-left">
                      <div className="patient-avatar">
                        <FontAwesomeIcon icon={faUserInjured} />
                      </div>
                      <div className="patient-info">
                        <div className="patient-header">
                          <h4 className="patient-name">{patient.name}</h4>
                          <span
                            className="patient-status"
                            style={{ color: getStatusColor(patient.status) }}
                          >
                            <FontAwesomeIcon icon={getStatusIcon(patient.status)} />
                            {patient.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="patient-details">
                          <span className="patient-age-gender">
                            {patient.age} yrs • {patient.gender}
                          </span>
                          <span className="patient-phone">
                            <FontAwesomeIcon icon={faPhone} /> {patient.phone}
                          </span>
                          <span className="patient-visits">
                            <FontAwesomeIcon icon={faHistory} /> {patient.totalVisits} visits
                          </span>
                        </div>
                        <div className="patient-block-info">
                          <span className="block-level">
                            Level {patient.blockLevel}: {getBlockLevelText(patient.blockLevel)}
                          </span>
                          {patient.fines > 0 && (
                            <span className="patient-fine">
                              <FontAwesomeIcon icon={faMoneyBill} /> Fined: ₹{patient.fines}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="patient-item-right">
                      <div className="patient-actions">
                        <button
                          onClick={() => viewPatientDetails(patient)}
                          className="view-btn"
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>

                        {patient.status === 'active' && (
                          <button
                            onClick={() => handleWarnPatient(patient)}
                            className="warn-btn"
                            title="Warn for Miss"
                          >
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                          </button>
                        )}

                        {patient.status === 'warned' && (
                          <button
                            onClick={() => handleFinePatient(patient)}
                            className="fine-btn"
                            title="Fine for 2nd Miss"
                          >
                            <FontAwesomeIcon icon={faMoneyBill} />
                          </button>
                        )}

                        {patient.status === 'fined' && (
                          <button
                            onClick={() => handleBlockPatient(patient)}
                            className="block-btn"
                            title="Block for 3rd Miss"
                          >
                            <FontAwesomeIcon icon={faBan} />
                          </button>
                        )}

                        {patient.status === 'blocked' && (
                          <button
                            onClick={() => handleUnblockPatient(patient)}
                            className="unblock-btn"
                            title="Unblock Patient"
                          >
                            <FontAwesomeIcon icon={faUnlock} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Details & Actions */}
        <div className="doctor-right-column">
          {/* Selected Patient Details */}
          {showPatientDetails && selectedPatient ? (
            <div className="doctor-card">
              <div className="doctor-card-header">
                <h3>
                  <FontAwesomeIcon icon={faUserInjured} />
                  Patient Details
                </h3>
                <button
                  onClick={() => setShowPatientDetails(false)}
                  className="close-btn"
                >
                  ×
                </button>
              </div>

              <div className="patient-details-view">
                <div className="patient-profile">
                  <div className="patient-avatar-large">
                    <FontAwesomeIcon icon={faUserInjured} />
                  </div>
                  <div className="patient-profile-info">
                    <h3>{selectedPatient.name}</h3>
                    <p className="patient-meta">
                      {selectedPatient.age} years • {selectedPatient.gender}
                    </p>
                    <div className="status-badge-large" style={{
                      background: getStatusColor(selectedPatient.status) + '20',
                      color: getStatusColor(selectedPatient.status)
                    }}>
                      <FontAwesomeIcon icon={getStatusIcon(selectedPatient.status)} />
                      {selectedPatient.status.toUpperCase()}
                    </div>
                  </div>
                </div>

                <div className="patient-contact-info">
                  <h4>Contact Information</h4>
                  <div className="contact-details">
                    <p>
                      <FontAwesomeIcon icon={faPhone} />
                      <strong>Phone:</strong> {selectedPatient.phone}
                    </p>
                    <p>
                      <FontAwesomeIcon icon={faEnvelope} />
                      <strong>Email:</strong> {selectedPatient.email}
                    </p>
                  </div>
                </div>

                <div className="patient-stats">
                  <h4>Patient Statistics</h4>
                  <div className="stats-grid">
                    <div className="stat-item">
                      <span className="stat-label">Total Visits</span>
                      <span className="stat-value">{selectedPatient.totalVisits}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Missed Appointments</span>
                      <span className="stat-value">{selectedPatient.missedAppointments}</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Block Level</span>
                      <span className="stat-value">{selectedPatient.blockLevel}/3</span>
                    </div>
                    <div className="stat-item">
                      <span className="stat-label">Total Fines</span>
                      <span className="stat-value">₹{selectedPatient.fines || 0}</span>
                    </div>
                  </div>
                </div>

                {selectedPatient.warnings.length > 0 && (
                  <div className="patient-warnings">
                    <h4>
                      <FontAwesomeIcon icon={faWarning} />
                      Warnings & History
                    </h4>
                    <div className="warnings-list">
                      {selectedPatient.warnings.map((warning, index) => (
                        <div key={index} className="warning-item">
                          <FontAwesomeIcon icon={faClock} />
                          <span>{warning}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="patient-notes">
                  <h4>
                    <FontAwesomeIcon icon={faFileMedical} />
                    Notes
                  </h4>
                  <p>{selectedPatient.notes}</p>
                </div>

                <div className="patient-action-buttons">
                  {selectedPatient.status !== 'blocked' ? (
                    <button
                      onClick={() => {
                        setActionPatient(selectedPatient);
                        selectedPatient.blockLevel === 0
                          ? setShowWarnModal(true)
                          : selectedPatient.blockLevel === 1
                            ? handleFinePatient(selectedPatient)
                            : setShowBlockModal(true);
                      }}
                      className="doctor-btn doctor-btn-danger"
                    >
                      {selectedPatient.blockLevel === 0 ? 'Warn Patient' :
                        selectedPatient.blockLevel === 1 ? 'Fine Patient' : 'Block Patient'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUnblockPatient(selectedPatient)}
                      className="doctor-btn doctor-btn-success"
                    >
                      Unblock Patient
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="doctor-card">
              <div className="empty-details">
                <FontAwesomeIcon icon={faUserInjured} size="3x" />
                <h3>No Patient Selected</h3>
                <p>Select a patient from the list to view details and manage</p>
              </div>
            </div>
          )}

          {/* Blocking System Guide */}
          <div className="doctor-card">
            <h3>
              <FontAwesomeIcon icon={faShieldAlt} />
              Blocking System Guide
            </h3>
            <div className="blocking-guide">
              <div className="guide-step">
                <div className="step-number">1</div>
                <div className="step-content">
                  <h4>1st Missed Appointment</h4>
                  <p>Send warning message to patient</p>
                </div>
              </div>
              <div className="guide-step">
                <div className="step-number">2</div>
                <div className="step-content">
                  <h4>2nd Missed Appointment</h4>
                  <p>Apply fine of ₹200</p>
                </div>
              </div>
              <div className="guide-step">
                <div className="step-number">3</div>
                <div className="step-content">
                  <h4>3rd Missed Appointment</h4>
                  <p>Block from booking new appointments</p>
                </div>
              </div>
              <div className="guide-note">
                <FontAwesomeIcon icon={faBell} />
                <span>Doctor can unblock patients at any time</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Warn Modal */}
      {showWarnModal && actionPatient && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                <FontAwesomeIcon icon={faExclamationTriangle} />
                Warn Patient
              </h3>
              <button onClick={() => setShowWarnModal(false)} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Send warning to <strong>{actionPatient.name}</strong> for 1st missed appointment?</p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowWarnModal(false)}
                  className="doctor-btn doctor-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmWarnPatient}
                  className="doctor-btn doctor-btn-danger"
                >
                  Send Warning
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block Modal */}
      {showBlockModal && actionPatient && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                <FontAwesomeIcon icon={faBan} />
                Block Patient
              </h3>
              <button onClick={() => setShowBlockModal(false)} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Block <strong>{actionPatient.name}</strong> from booking appointments?</p>
              <p className="warning-text">
                This is the 3rd missed appointment. Patient will not be able to book new appointments.
              </p>
              <div className="modal-actions">
                <button
                  onClick={() => setShowBlockModal(false)}
                  className="doctor-btn doctor-btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmBlockPatient}
                  className="doctor-btn doctor-btn-danger"
                >
                  Confirm Block
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorPatients;