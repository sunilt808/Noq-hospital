import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';
import firebaseDbService from '../../services/firebaseDbService';
import {
  faUserInjured, faBan, faUserSlash, faCheckCircle,
  faExclamationTriangle, faSearch, faFilter, faEdit,
  faTrash, faEnvelope, faPhone, faCalendar, faClock,
  faHistory, faFileMedical, faWarning, faMoneyBillWave,
  faUserCheck, faArrowLeft, faPrint, faDownload, faEye,
  faChartBar, faCalendarTimes, faCalendarCheck, faTimes,
  faBed, faStethoscope, faUserCircle, faBolt, faUsers,
  faHome, faArrowRight, faPlus, faUserPlus, faPrescriptionBottle
} from '@fortawesome/free-solid-svg-icons';
import './doctor.css';

const PatientsManagement = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { doctors, patients: firebasePatients, loading } = useFirebaseData();
  const [doctor, setDoctor] = useState(null);
  const [patients, setPatients] = useState([]);
  const [blockedPatients, setBlockedPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  const [activeTab, setActiveTab] = useState('active');
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [showWarnModal, setShowWarnModal] = useState(false);
  const [showFineModal, setShowFineModal] = useState(false);
  const [showUnblockModal, setShowUnblockModal] = useState(false);
  const [currentActionPatient, setCurrentActionPatient] = useState(null);
  const [fineAmount, setFineAmount] = useState(500);
  
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    warned: 0,
    fined: 0,
    blocked: 0
  });

  // Enhanced header with doctor info
  useEffect(() => {
    if (!authLoading && (!currentUser || String(currentUser.role || '').toLowerCase() !== 'doctor')) {
      navigate('/login', { replace: true });
      return;
    }
  }, [authLoading, currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;

    const doctorData =
      doctors.find((d) => String(d.id || '') === String(currentUser.id || '')) ||
      doctors.find((d) => d.email?.toLowerCase() === currentUser.email?.toLowerCase()) ||
      currentUser;
    if (doctorData) {
      setDoctor(doctorData);
    }
  }, [currentUser, doctors]);

  useEffect(() => {
    updatePatientsData(Array.isArray(firebasePatients) ? firebasePatients : []);
  }, [firebasePatients]);

  const loadPatientsData = () => updatePatientsData(Array.isArray(firebasePatients) ? firebasePatients : []);

  const persistPatientUpdate = async (patientId, updater) => {
    const existing = (Array.isArray(firebasePatients) ? firebasePatients : []).find(
      (p) => String(p.id || '') === String(patientId)
    );
    if (!existing) return;
    const updatedPatient = updater(existing);
    await firebaseDbService.upsert('patients', String(patientId), updatedPatient);
    updatePatientsData(
      (Array.isArray(firebasePatients) ? firebasePatients : []).map((p) =>
        String(p.id || '') === String(patientId) ? updatedPatient : p
      )
    );
  };

  const updatePatientsData = (patientsData) => {
    const active = patientsData.filter(p => !p.isBlocked);
    const blocked = patientsData.filter(p => p.isBlocked);
    
    setPatients(active);
    setBlockedPatients(blocked);
    
    const activeCount = active.filter(p => p.status === 'active').length;
    const warnedCount = active.filter(p => p.status === 'warned').length;
    const finedCount = active.filter(p => p.status === 'fined').length;
    
    setStats({
      total: patientsData.length,
      active: activeCount,
      warned: warnedCount,
      fined: finedCount,
      blocked: blocked.length
    });
  };

  const handleViewPatient = (patient) => {
    setSelectedPatient(patient);
    setShowPatientDetails(true);
  };

  const handleBlockPatient = (patient) => {
    setCurrentActionPatient(patient);
    setShowBlockModal(true);
  };

  const handleUnblockPatient = (patient) => {
    setCurrentActionPatient(patient);
    setShowUnblockModal(true);
  };

  const handleWarnPatient = (patient) => {
    setCurrentActionPatient(patient);
    setShowWarnModal(true);
  };

  const handleFinePatient = (patient) => {
    setCurrentActionPatient(patient);
    setShowFineModal(true);
  };

  const confirmBlockPatient = async () => {
    if (!currentActionPatient) return;

    await persistPatientUpdate(currentActionPatient.id, (p) => {
      return {
          ...p, 
          isBlocked: true, 
          status: 'blocked', 
          blockedDate: new Date().toISOString(),
          blockedReason: '3 consecutive absences'
      };
    });

    alert(`Patient ${currentActionPatient.name} has been blocked`);
    setShowBlockModal(false);
    setCurrentActionPatient(null);
  };

  const confirmUnblockPatient = async () => {
    if (!currentActionPatient) return;

    await persistPatientUpdate(currentActionPatient.id, (p) => {
      return {
          ...p, 
          isBlocked: false, 
          status: 'active', 
          absentCount: 0,
          warnings: 0,
          fines: 0
      };
    });

    alert(`Patient ${currentActionPatient.name} has been unblocked`);
    setShowUnblockModal(false);
    setCurrentActionPatient(null);
  };

  const confirmWarnPatient = async () => {
    if (!currentActionPatient) return;

    await persistPatientUpdate(currentActionPatient.id, (p) => {
      return {
          ...p, 
          warnings: (p.warnings || 0) + 1,
          status: 'warned' 
      };
    });

    alert(`Warning sent to ${currentActionPatient.name}`);
    setShowWarnModal(false);
    setCurrentActionPatient(null);
  };

  const confirmFinePatient = async () => {
    if (!currentActionPatient) return;

    await persistPatientUpdate(currentActionPatient.id, (p) => {
      return {
          ...p, 
          fines: (p.fines || 0) + fineAmount,
          status: 'fined' 
      };
    });

    alert(`Fine of ₹${fineAmount} applied to ${currentActionPatient.name}`);
    setShowFineModal(false);
    setCurrentActionPatient(null);
  };

  const getStatusBadge = (patient) => {
    if (patient.isBlocked) {
      return <span className="status-badge blocked"><FontAwesomeIcon icon={faBan} /> Blocked</span>;
    }
    switch(patient.status) {
      case 'active': return <span className="status-badge active">Active</span>;
      case 'warned': return <span className="status-badge warned"><FontAwesomeIcon icon={faWarning} /> Warned</span>;
      case 'fined': return <span className="status-badge fined"><FontAwesomeIcon icon={faMoneyBillWave} /> Fined</span>;
      default: return <span className="status-badge active">Active</span>;
    }
  };

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.phone.includes(searchTerm) ||
                         String(patient.contact || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || patient.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading || authLoading) {
    return (
      <div className="doctor-loading">
        <div className="loading-spinner"></div>
        <p>Loading patients management...</p>
      </div>
    );
  }

  return (
    <div className="doctor-portal patients-management">
      {/* Enhanced Header */}
      <header className="doctor-header">
        <div className="doctor-header-left">
          <div className="doctor-avatar-container">
            <div className="doctor-avatar-circle">
              {doctor?.initials || <FontAwesomeIcon icon={faUserCircle} />}
            </div>
            <div className="doctor-greeting">
              <button className="back-btn" onClick={() => navigate('/doctor/dashboard')}>
                <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
              </button>
              <h1>Patients Management</h1>
              <p className="doctor-specialization">
                <FontAwesomeIcon icon={faUserInjured} /> Manage Active & Blocked Patients
              </p>
            </div>
          </div>
          <div className="doctor-info">
            <span className="doctor-room">
              <FontAwesomeIcon icon={faBed} /> Room {doctor?.roomNumber || '101'}
            </span>
            <span className="doctor-shift">
              <FontAwesomeIcon icon={faClock} /> {doctor?.shift || 'Morning'} Shift
            </span>
            <span className="doctor-status">
              <FontAwesomeIcon icon={faUserCheck} /> Active
            </span>
          </div>
        </div>
      </header>

      {/* Enhanced Stats Cards */}
      <div className="doctor-stats-grid">
        <div className="stat-card blue">
          <FontAwesomeIcon icon={faUsers} className="stat-icon" />
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">Total Patients</div>
        </div>
        <div className="stat-card green">
          <FontAwesomeIcon icon={faUserCheck} className="stat-icon" />
          <div className="stat-value">{stats.active}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card orange">
          <FontAwesomeIcon icon={faWarning} className="stat-icon" />
          <div className="stat-value">{stats.warned}</div>
          <div className="stat-label">Warned</div>
        </div>
        <div className="stat-card red">
          <FontAwesomeIcon icon={faMoneyBillWave} className="stat-icon" />
          <div className="stat-value">{stats.fined}</div>
          <div className="stat-label">Fined</div>
        </div>
        <div className="stat-card purple">
          <FontAwesomeIcon icon={faBan} className="stat-icon" />
          <div className="stat-value">{stats.blocked}</div>
          <div className="stat-label">Blocked</div>
        </div>
      </div>

      {/* Enhanced Main Content */}
      <div className="doctor-main-content patients-content">
        {/* Enhanced Tabs */}
        <div className="patients-tabs enhanced">
          <button 
            className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
            onClick={() => setActiveTab('active')}
          >
            <div className="tab-icon">
              <FontAwesomeIcon icon={faUserCheck} />
            </div>
            <div className="tab-content">
              <span className="tab-title">Active Patients</span>
              <span className="tab-count">{patients.length}</span>
            </div>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'blocked' ? 'active' : ''}`}
            onClick={() => setActiveTab('blocked')}
          >
            <div className="tab-icon">
              <FontAwesomeIcon icon={faBan} />
            </div>
            <div className="tab-content">
              <span className="tab-title">Blocked Patients</span>
              <span className="tab-count">{blockedPatients.length}</span>
            </div>
          </button>
        </div>

        <div className="patients-container">
          {activeTab === 'active' ? (
            <>
              {/* Enhanced Header with Search */}
              <div className="patients-header enhanced">
                <div className="header-title">
                  <h3><FontAwesomeIcon icon={faUserCheck} /> Active Patients</h3>
                  <p>Manage and monitor patient activities</p>
                </div>
                <div className="patient-controls">
                  <div className="search-box enhanced">
                    <FontAwesomeIcon icon={faSearch} />
                    <input
                      type="text"
                      placeholder="Search by name, phone or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="search-input"
                    />
                    {searchTerm && (
                      <button 
                        className="clear-search"
                        onClick={() => setSearchTerm('')}
                      >
                        <FontAwesomeIcon icon={faTimes} />
                      </button>
                    )}
                  </div>
                  <div className="filter-group">
                    <FontAwesomeIcon icon={faFilter} />
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="filter-select"
                    >
                      <option value="all">All Status</option>
                      <option value="active">Active</option>
                      <option value="warned">Warned</option>
                      <option value="fined">Fined</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Enhanced Patients List */}
              {filteredPatients.length === 0 ? (
                <div className="empty-list enhanced">
                  <div className="empty-icon">
                    <FontAwesomeIcon icon={faUserCircle} />
                  </div>
                  <h4>No patients found</h4>
                  <p>{searchTerm ? 'Try a different search term' : 'Add new patients to get started'}</p>
                </div>
              ) : (
                <div className="patients-list enhanced">
                  {filteredPatients.map(patient => (
                    <div key={patient.id} className={`patient-item ${patient.status}`}>
                      <div className="patient-item-left">
                        <div className="patient-avatar">
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="patient-info">
                          <div className="patient-header">
                            <h4 className="patient-name">{patient.name}</h4>
                            <div className="patient-status-container">
                              {getStatusBadge(patient)}
                              {patient.absentCount > 0 && (
                                <span className="absent-indicator">
                                  <FontAwesomeIcon icon={faUserSlash} /> {patient.absentCount} absences
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="patient-details">
                            <span className="detail-item">
                              <FontAwesomeIcon icon={faUserCircle} /> {patient.age} yrs • {patient.gender}
                            </span>
                            <span className="detail-item">
                              <FontAwesomeIcon icon={faPhone} /> {patient.phone}
                            </span>
                            <span className="detail-item">
                              <FontAwesomeIcon icon={faTint} /> {patient.bloodGroup}
                            </span>
                          </div>
                          <div className="patient-stats">
                            <span className="stat">
                              <FontAwesomeIcon icon={faHistory} /> {patient.totalVisits} visits
                            </span>
                            <span className="stat">
                              <FontAwesomeIcon icon={faCalendar} /> Last: {new Date(patient.lastVisit).toLocaleDateString()}
                            </span>
                            {patient.fines > 0 && (
                              <span className="fine-stat">
                                <FontAwesomeIcon icon={faMoneyBillWave} /> ₹{patient.fines}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="patient-item-right">
                        <div className="patient-actions">
                          <button 
                            className="action-btn view-btn"
                            onClick={() => handleViewPatient(patient)}
                            title="View Details"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          {patient.absentCount > 0 && (
                            <button 
                              className="action-btn warn-btn"
                              onClick={() => handleWarnPatient(patient)}
                              title="Send Warning"
                            >
                              <FontAwesomeIcon icon={faWarning} />
                            </button>
                          )}
                          {patient.warnings > 0 && (
                            <button 
                              className="action-btn fine-btn"
                              onClick={() => handleFinePatient(patient)}
                              title="Apply Fine"
                            >
                              <FontAwesomeIcon icon={faMoneyBillWave} />
                            </button>
                          )}
                          {patient.absentCount >= 2 && (
                            <button 
                              className="action-btn block-btn"
                              onClick={() => handleBlockPatient(patient)}
                              title="Block Patient"
                            >
                              <FontAwesomeIcon icon={faBan} />
                            </button>
                          )}
                        </div>
                        <button 
                          className="quick-view-btn"
                          onClick={() => handleViewPatient(patient)}
                        >
                          <FontAwesomeIcon icon={faArrowRight} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="blocked-patients-section">
              {/* Enhanced Blocked Patients Header */}
              <div className="blocked-header enhanced">
                <div className="header-title">
                  <h3><FontAwesomeIcon icon={faBan} /> Blocked Patients</h3>
                  <p>Patients blocked due to multiple absences or violations</p>
                </div>
                <div className="blocked-stats">
                  <span className="stat-badge">
                    <FontAwesomeIcon icon={faExclamationTriangle} /> {blockedPatients.length} Blocked
                  </span>
                </div>
              </div>

              {/* Enhanced Blocked Patients List */}
              {blockedPatients.length === 0 ? (
                <div className="empty-list enhanced">
                  <div className="empty-icon">
                    <FontAwesomeIcon icon={faBan} />
                  </div>
                  <h4>No blocked patients</h4>
                  <p>Great! All patients are currently active and compliant</p>
                </div>
              ) : (
                <div className="blocked-patients-list enhanced">
                  {blockedPatients.map(patient => (
                    <div key={patient.id} className="blocked-patient-item">
                      <div className="blocked-patient-left">
                        <div className="patient-avatar blocked">
                          {patient.name.split(' ').map(n => n[0]).join('')}
                        </div>
                        <div className="patient-info">
                          <div className="patient-header">
                            <h4 className="patient-name">{patient.name}</h4>
                            <span className="blocked-status">
                              <FontAwesomeIcon icon={faBan} /> Blocked
                            </span>
                          </div>
                          <div className="patient-details">
                            <span className="detail-item">
                              <FontAwesomeIcon icon={faUserCircle} /> {patient.age} yrs • {patient.gender}
                            </span>
                            <span className="detail-item">
                              <FontAwesomeIcon icon={faPhone} /> {patient.phone}
                            </span>
                          </div>
                          <div className="blocked-info">
                            <span className="blocked-reason">
                              <FontAwesomeIcon icon={faExclamationTriangle} /> {patient.blockedReason}
                            </span>
                            <span className="blocked-date">
                              <FontAwesomeIcon icon={faCalendarTimes} /> 
                              Blocked: {new Date(patient.blockedDate).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="blocked-patient-right">
                        <button 
                          className="unblock-btn"
                          onClick={() => handleUnblockPatient(patient)}
                        >
                          <FontAwesomeIcon icon={faUserCheck} /> Unblock
                        </button>
                        <button 
                          className="view-btn"
                          onClick={() => handleViewPatient(patient)}
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faEye} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Enhanced Patient Details Modal */}
      {showPatientDetails && selectedPatient && (
        <div className="modal-overlay">
          <div className="modal patient-details-modal">
            <div className="modal-header">
              <h3><FontAwesomeIcon icon={faUserInjured} /> Patient Details</h3>
              <button 
                className="modal-close" 
                onClick={() => setShowPatientDetails(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="modal-body">
              <div className="patient-details-view enhanced">
                <div className="patient-profile-section">
                  <div className="patient-avatar-large">
                    {selectedPatient.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="patient-profile-info">
                    <h3>{selectedPatient.name}</h3>
                    <p className="patient-meta">
                      {selectedPatient.age} years • {selectedPatient.gender} • {selectedPatient.bloodGroup}
                    </p>
                    <div className="patient-status-section">
                      {getStatusBadge(selectedPatient)}
                      {selectedPatient.absentCount > 0 && (
                        <span className="absent-warning">
                          <FontAwesomeIcon icon={faUserSlash} /> {selectedPatient.absentCount} absences
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="patient-info-grid">
                  <div className="info-section">
                    <h4><FontAwesomeIcon icon={faEnvelope} /> Contact Information</h4>
                    <div className="info-items">
                      <div className="info-item">
                        <span className="info-label">Email:</span>
                        <span className="info-value">{selectedPatient.contact}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Phone:</span>
                        <span className="info-value">{selectedPatient.phone}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Address:</span>
                        <span className="info-value">{selectedPatient.address || 'Not specified'}</span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">Allergies:</span>
                        <span className="info-value">{selectedPatient.allergies || 'None'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="info-section">
                    <h4><FontAwesomeIcon icon={faChartBar} /> Statistics</h4>
                    <div className="stats-grid">
                      <div className="stat-card-small">
                        <span className="stat-label-small">Total Visits</span>
                        <span className="stat-value-small">{selectedPatient.totalVisits}</span>
                      </div>
                      <div className="stat-card-small">
                        <span className="stat-label-small">Absences</span>
                        <span className="stat-value-small">{selectedPatient.absentCount}</span>
                      </div>
                      <div className="stat-card-small">
                        <span className="stat-label-small">Warnings</span>
                        <span className="stat-value-small">{selectedPatient.warnings}</span>
                      </div>
                      <div className="stat-card-small">
                        <span className="stat-label-small">Fines</span>
                        <span className="stat-value-small">₹{selectedPatient.fines}</span>
                      </div>
                    </div>
                  </div>

                  {selectedPatient.isBlocked && (
                    <div className="info-section warning">
                      <h4><FontAwesomeIcon icon={faBan} /> Block Information</h4>
                      <div className="info-items">
                        <div className="info-item">
                          <span className="info-label">Reason:</span>
                          <span className="info-value">{selectedPatient.blockedReason}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Blocked On:</span>
                          <span className="info-value">{new Date(selectedPatient.blockedDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="info-section">
                    <h4><FontAwesomeIcon icon={faCalendarCheck} /> Appointment Info</h4>
                    <div className="info-items">
                      <div className="info-item">
                        <span className="info-label">Last Visit:</span>
                        <span className="info-value">{new Date(selectedPatient.lastVisit).toLocaleDateString()}</span>
                      </div>
                      {selectedPatient.nextAppointment && (
                        <div className="info-item">
                          <span className="info-label">Next Appointment:</span>
                          <span className="info-value">{new Date(selectedPatient.nextAppointment).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="modal-actions">
                  <button className="action-btn print-btn">
                    <FontAwesomeIcon icon={faPrint} /> Print Details
                  </button>
                  <button className="action-btn export-btn">
                    <FontAwesomeIcon icon={faDownload} /> Export
                  </button>
                  <button 
                    className="action-btn close-btn"
                    onClick={() => setShowPatientDetails(false)}
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modals for Actions */}
      {showBlockModal && currentActionPatient && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header warning">
              <h3><FontAwesomeIcon icon={faBan} /> Block Patient</h3>
              <button className="modal-close" onClick={() => setShowBlockModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to block <strong>{currentActionPatient.name}</strong>?</p>
              <p className="warning-text">This patient has {currentActionPatient.absentCount} absences.</p>
              <div className="modal-actions">
                <button onClick={confirmBlockPatient} className="danger-btn">Yes, Block Patient</button>
                <button onClick={() => setShowBlockModal(false)} className="cancel-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showUnblockModal && currentActionPatient && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header success">
              <h3><FontAwesomeIcon icon={faUserCheck} /> Unblock Patient</h3>
              <button className="modal-close" onClick={() => setShowUnblockModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to unblock <strong>{currentActionPatient.name}</strong>?</p>
              <div className="modal-actions">
                <button onClick={confirmUnblockPatient} className="success-btn">Yes, Unblock Patient</button>
                <button onClick={() => setShowUnblockModal(false)} className="cancel-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWarnModal && currentActionPatient && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header warning">
              <h3><FontAwesomeIcon icon={faWarning} /> Send Warning</h3>
              <button className="modal-close" onClick={() => setShowWarnModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Send warning to <strong>{currentActionPatient.name}</strong>?</p>
              <p>Current absences: {currentActionPatient.absentCount}</p>
              <div className="modal-actions">
                <button onClick={confirmWarnPatient} className="warning-btn">Send Warning</button>
                <button onClick={() => setShowWarnModal(false)} className="cancel-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFineModal && currentActionPatient && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3><FontAwesomeIcon icon={faMoneyBillWave} /> Apply Fine</h3>
              <button className="modal-close" onClick={() => setShowFineModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Apply fine to <strong>{currentActionPatient.name}</strong></p>
              <div className="fine-input">
                <label>Amount (₹):</label>
                <input
                  type="number"
                  value={fineAmount}
                  onChange={(e) => setFineAmount(parseInt(e.target.value) || 0)}
                  min="100"
                  max="5000"
                  step="100"
                />
              </div>
              <div className="modal-actions">
                <button onClick={confirmFinePatient} className="danger-btn">Apply Fine</button>
                <button onClick={() => setShowFineModal(false)} className="cancel-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientsManagement;