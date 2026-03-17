import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordHistory } from '../../services/historyService';
import { useAuth } from '../../context/AuthContext';
import doctorService from '../../services/doctorService';
import {
  faArrowLeft, faUsers, faClock, faUserInjured,
  faCheckCircle, faExclamationTriangle, faPause,
  faPlay, faBell, faPlus, faEdit, faTrash,
  faSearch, faFilter, faArrowRight, faHistory,
  faStethoscope, faQrcode, faPhone, faEnvelope,
  faCalendar, faFileMedical, faUserClock
} from '@fortawesome/free-solid-svg-icons';
import './doctor.css';

const DoctorQueue = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { appointments, patients, doctors, loading } = useFirebaseData();
  
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    token: '',
    type: 'regular',
    priority: 'normal',
    phone: ''
  });

  const getTokenLabel = (tokenValue) => {
    if (!tokenValue) return '';
    if (typeof tokenValue === 'object') {
      return tokenValue.tokenNumber || tokenValue.tokenCode || tokenValue.id || '';
    }
    return String(tokenValue);
  };

  const getAppointmentTime = (appointment) => {
    if (appointment?.appointmentTime) return appointment.appointmentTime;
    if (typeof appointment?.token === 'object') {
      return appointment.token?.time || appointment.token?.appointmentTime || '';
    }
    return appointment?.time || '';
  };

  // Get current doctor from Firebase data
  const doctor = useMemo(() => {
    return doctors.find(d => 
      d.id === currentUser?.id || 
      d.email?.toLowerCase() === currentUser?.email?.toLowerCase()
    ) || {
      id: currentUser?.id,
      name: currentUser?.name || 'Doctor',
      email: currentUser?.email,
      specialization: 'General Physician',
      status: 'active'
    };
  }, [doctors, currentUser]);

  // Verify doctor is authenticated
  useEffect(() => {
    if (!authLoading && (!currentUser || currentUser.role !== 'doctor')) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, authLoading, navigate]);

  // Update doctor presence status in Firebase
  useEffect(() => {
    if (!doctor?.id) return;

    const updatePresence = async () => {
      try {
        const presenceId = 'doc_' + doctor.id;
        await firebaseDbService.upsert('doctorPresence', presenceId, {
          doctorId: String(doctor.id),
          doctorName: doctor.name || 'Doctor',
          status: isOnBreak ? 'on_break' : selectedPatient ? 'in_consultation' : 'available',
          currentPatientId: selectedPatient?.id || null,
          currentPatientName: selectedPatient?.patient || null,
          updatedAt: new Date().toISOString(),
        });
      } catch (error) {
        console.error('Error updating doctor presence:', error);
      }
    };
    
    updatePresence();
  }, [doctor?.id, isOnBreak, selectedPatient]);

  // Calculate queue and completed appointments from Firebase data
  const queue = useMemo(() => {
    const doctorAppts = appointments.filter(apt => 
      apt.doctorId === doctor?.id && ['waiting', 'pending', 'confirmed'].includes(apt.status)
    );
    
    return doctorAppts.map(apt => {
      const patient = patients.find(
        p =>
          String(p.id || '') === String(apt.patientId || '') ||
          p.email?.toLowerCase() === apt.patientEmail?.toLowerCase()
      );
      return {
        id: apt.id,
        appointmentId: apt.id,
        patientId: apt.patientId || patient?.id || null,
        patientEmail: apt.patientEmail || patient?.email || '',
        token: getTokenLabel(apt.token || apt.queueToken || ''),
        patient: apt.patientName || patient?.name || 'Patient',
        phone: apt.phone || apt.patientPhone || patient?.phone || '',
        time: getAppointmentTime(apt),
        type: apt.type || 'regular',
        priority: apt.priority || 'normal',
        status: apt.status,
        notes: apt.notes || apt.diseaseName || apt.reason || '',
        arrivalTime: apt.arrivalTime || getAppointmentTime(apt) || '',
      };
    });
  }, [appointments, doctor?.id, patients]);

  const completed = useMemo(() => {
    const doctorAppts = appointments.filter(apt => 
      apt.doctorId === doctor?.id && apt.status === 'completed'
    );
    
    return doctorAppts.map(apt => ({
      id: apt.id,
      token: getTokenLabel(apt.token || apt.queueToken || ''),
      patient: apt.patientName || 'Patient',
      time: getAppointmentTime(apt),
      type: apt.type || 'regular',
      status: 'completed',
      completionTime: apt.completionTime || ''
    }));
  }, [appointments, doctor?.id]);

  const tokenStats = useMemo(() => {
    const waiting = queue.length;
    const inConsultation = selectedPatient ? 1 : 0;
    const completedCount = completed.length;
    return {
      waiting,
      inConsultation,
      completed: completedCount,
      issuedToday: waiting + inConsultation + completedCount,
    };
  }, [queue.length, selectedPatient, completed.length]);

  const updateAppointmentStatus = async (appointmentId, updates) => {
    try {
      const appointment = appointments.find(a => a.id === appointmentId);
      if (!appointment) return;
      
      await firebaseDbService.upsert('appointments', appointmentId, {
        ...appointment,
        ...updates
      });
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment');
    }
  };

  // Filter queue based on search and filter
  const filteredQueue = queue.filter(patient => {
    const patientName = String(patient.patient || '').toLowerCase();
    const tokenText = String(patient.token || '').toLowerCase();
    const query = String(searchTerm || '').toLowerCase();
    const matchesSearch = patientName.includes(query) || tokenText.includes(query);
    const matchesFilter = filterType === 'all' || patient.type === filterType;
    return matchesSearch && matchesFilter;
  });

  // Calculate wait times
  const calculateWaitTime = (arrivalTime) => {
    // Mock calculation - in real app, use actual time difference
    const minutes = Math.floor(Math.random() * 30) + 5;
    return `${minutes} min`;
  };

  // Queue actions
  const handleStartConsultation = async (patient) => {
    if (!patient || isOnBreak) return;

    try {
      await updateAppointmentStatus(patient.id, {
        status: 'in_consultation',
        consultationStartedAt: new Date().toISOString(),
      });
      
      setSelectedPatient(patient);
      
      recordHistory({
        action: 'consultation_started',
        module: 'queue',
        message: `Started consultation with ${patient.patient} (Token: ${patient.token})`,
        doctorId: String(doctor?.id || ''),
        hospitalId: String(doctor?.hospitalId || ''),
        patientId: String(patient.patientId || ''),
        meta: { token: patient.token, patientName: patient.patient },
      });
      alert(`Starting consultation with ${patient.patient} (Token: ${patient.token})`);
    } catch (error) {
      console.error('Error starting consultation:', error);
      alert('Failed to start consultation');
    }
  };

  const handleCompleteConsultation = async () => {
    if (!selectedPatient) return;
    const completionTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    try {
      await updateAppointmentStatus(selectedPatient.id, {
        status: 'completed',
        completionTime,
        completedAt: new Date().toISOString(),
      });

      setSelectedPatient(null);
      
      recordHistory({
        action: 'consultation_completed',
        module: 'queue',
        message: `Completed consultation with ${selectedPatient.patient} (Token: ${selectedPatient.token})`,
        doctorId: String(doctor?.id || ''),
        hospitalId: String(doctor?.hospitalId || ''),
        patientId: String(selectedPatient.patientId || ''),
        meta: { token: selectedPatient.token, patientName: selectedPatient.patient, completionTime },
      });
      alert(`Completed consultation with ${selectedPatient.patient}`);
    } catch (error) {
      console.error('Error completing consultation:', error);
      alert('Failed to complete consultation');
    }
  };

  const handleSkipPatient = async (patientId) => {
    const patient = queue.find(p => p.id === patientId);
    if (!patient) return;
    
    if (window.confirm(`Skip ${patient.patient} and move to end of queue?`)) {
      try {
        await updateAppointmentStatus(patientId, {
          skipped: true,
          status: 'waiting'
        });
        
        recordHistory({
          action: 'patient_skipped',
          module: 'queue',
          message: `Skipped patient ${patient.patient} (Token: ${patient.token}) to end of queue`,
          doctorId: String(doctor?.id || ''),
          hospitalId: String(doctor?.hospitalId || ''),
          patientId: String(patient.patientId || ''),
          meta: { token: patient.token, patientName: patient.patient },
        });
      } catch (error) {
        console.error('Error skipping patient:', error);
        alert('Failed to skip patient');
      }
    }
  };

  const handleAddToQueue = async () => {
    if (!newPatient.name.trim() || !newPatient.token.trim()) {
      alert('Please enter patient name and token');
      return;
    }

    if (queue.find(p => p.token === newPatient.token)) {
      alert(`Token ${newPatient.token} already exists in queue`);
      return;
    }

    try {
      const newApptId = 'apt_' + Date.now();
      await firebaseDbService.upsert('appointments', newApptId, {
        id: newApptId,
        doctorId: doctor.id,
        patientName: newPatient.name,
        patientPhone: newPatient.phone,
        token: newPatient.token,
        phone: newPatient.phone,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: newPatient.type,
        priority: newPatient.priority,
        status: 'waiting',
        notes: 'Walk-in patient',
        arrivalTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString()
      });
      
      setNewPatient({ name: '', token: '', type: 'regular', priority: 'normal', phone: '' });
      setShowAddPatient(false);
      alert(`Added ${newPatient.name} to queue (Token: ${newPatient.token})`);
    } catch (error) {
      console.error('Error adding patient to queue:', error);
      alert('Failed to add patient to queue');
    }
  };

  const toggleBreak = () => {
    setIsOnBreak(!isOnBreak);
    alert(isOnBreak ? 'Break ended. You are now active.' : 'You are now on break.');
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#10b981';
    }
  };

  const getTypeIcon = (type) => {
    switch(type) {
      case 'emergency': return faExclamationTriangle;
      case 'follow-up': return faHistory;
      case 'new': return faUserClock;
      default: return faUserInjured;
    }
  };

  if (!doctor) {
    return (
      <div className="doctor-loading">
        <div className="loading-spinner"></div>
        <p>Loading queue...</p>
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
            <h1>Patient Queue Management</h1>
            <p className="doctor-specialization">
              <FontAwesomeIcon icon={faUsers} /> Manage your patient queue
            </p>
          </div>
        </div>
        
        <div className="doctor-header-right">
          <button 
            className={`break-btn ${isOnBreak ? 'on-break' : ''}`}
            onClick={toggleBreak}
          >
            <FontAwesomeIcon icon={isOnBreak ? faPlay : faPause} />
            {isOnBreak ? 'End Break' : 'Take Break'}
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="doctor-stats-grid">
        <div className="stat-card blue">
          <FontAwesomeIcon icon={faUsers} className="stat-icon" />
          <div className="stat-value">{tokenStats.waiting}</div>
          <div className="stat-label">Waiting Tokens</div>
        </div>
        
        <div className="stat-card green">
          <FontAwesomeIcon icon={faCheckCircle} className="stat-icon" />
          <div className="stat-value">{tokenStats.completed}</div>
          <div className="stat-label">Completed Tokens</div>
        </div>
        
        <div className="stat-card orange">
          <FontAwesomeIcon icon={faClock} className="stat-icon" />
          <div className="stat-value">{tokenStats.inConsultation}</div>
          <div className="stat-label">In Consultation</div>
        </div>
        
        <div className="stat-card purple">
          <FontAwesomeIcon icon={faUserClock} className="stat-icon" />
          <div className="stat-value">{tokenStats.issuedToday}</div>
          <div className="stat-label">Tokens Issued Today</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="doctor-main-content">
        {/* Left Column - Current Patient & Controls */}
        <div className="doctor-left-column">
          {/* Current Patient Card */}
          <div className="doctor-card">
            <div className="doctor-card-header">
              <h3>
                <FontAwesomeIcon icon={faUserInjured} />
                Current Consultation
              </h3>
              {selectedPatient && (
                <span className="emergency-badge">
                  <FontAwesomeIcon icon={getTypeIcon(selectedPatient.type)} />
                  {selectedPatient.type}
                </span>
              )}
            </div>
            
            {selectedPatient ? (
              <div className="current-patient-details">
                <div className="patient-token">
                  <span className="token-badge">Token: {selectedPatient.token}</span>
                  {selectedPatient.priority === 'high' && (
                    <span className="priority-badge" style={{ background: getPriorityColor(selectedPatient.priority) }}>
                      Priority
                    </span>
                  )}
                </div>
                <h4 className="patient-name">{selectedPatient.patient}</h4>
                
                <div className="patient-contact">
                  {selectedPatient.phone && (
                    <p>
                      <FontAwesomeIcon icon={faPhone} /> {selectedPatient.phone}
                    </p>
                  )}
                </div>
                
                <div className="patient-info">
                  <p>
                    <FontAwesomeIcon icon={faClock} /> 
                    Scheduled: {selectedPatient.time}
                  </p>
                  <p>
                    <FontAwesomeIcon icon={faFileMedical} /> 
                    Notes: {selectedPatient.notes}
                  </p>
                </div>
                
                <div className="consultation-actions">
                  <button 
                    className="complete-btn"
                    onClick={handleCompleteConsultation}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} /> Mark Complete
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-patient">
                <p>No active consultation</p>
                <p className="hint">Select a patient from the queue to start</p>
              </div>
            )}
          </div>

          {/* Queue Controls */}
          <div className="doctor-card">
            <h3>
              <FontAwesomeIcon icon={faBell} />
              Queue Controls
            </h3>
            <div className="doctor-action-buttons">
              <button 
                onClick={() => setShowAddPatient(true)}
                className="doctor-action-btn"
              >
                <FontAwesomeIcon icon={faPlus} /> Add Walk-in Patient
              </button>
              <button 
                onClick={() => {
                  if (filteredQueue.length > 0) {
                    handleStartConsultation(filteredQueue[0]);
                  }
                }}
                disabled={filteredQueue.length === 0 || isOnBreak}
                className="doctor-action-btn"
              >
                <FontAwesomeIcon icon={faArrowRight} /> Start Next in Queue
              </button>
              <button 
                onClick={() => navigate('/doctor/appointments')}
                className="doctor-action-btn"
              >
                <FontAwesomeIcon icon={faCalendar} /> View Today's Schedule
              </button>
            </div>
          </div>

          {/* Add Patient Modal */}
          {showAddPatient && (
            <div className="doctor-card">
              <h3>
                <FontAwesomeIcon icon={faPlus} />
                Add Walk-in Patient
              </h3>
              <div className="add-patient-form">
                <div className="form-group">
                  <label>Patient Name *</label>
                  <input
                    type="text"
                    value={newPatient.name}
                    onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                    placeholder="Enter patient name"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Token Number *</label>
                  <input
                    type="text"
                    value={newPatient.token}
                    onChange={(e) => setNewPatient({...newPatient, token: e.target.value})}
                    placeholder="Enter token number"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Contact Phone</label>
                  <input
                    type="tel"
                    value={newPatient.phone}
                    onChange={(e) => setNewPatient({...newPatient, phone: e.target.value})}
                    placeholder="Phone number (optional)"
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Visit Type</label>
                  <select
                    value={newPatient.type}
                    onChange={(e) => setNewPatient({...newPatient, type: e.target.value})}
                    className="form-input"
                  >
                    <option value="regular">Regular Consultation</option>
                    <option value="follow-up">Follow-up</option>
                    <option value="new">New Patient</option>
                    <option value="emergency">Emergency</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Priority</label>
                  <select
                    value={newPatient.priority}
                    onChange={(e) => setNewPatient({...newPatient, priority: e.target.value})}
                    className="form-input"
                  >
                    <option value="normal">Normal</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="form-actions">
                  <button 
                    onClick={() => setShowAddPatient(false)}
                    className="doctor-btn doctor-btn-secondary"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddToQueue}
                    className="doctor-btn doctor-btn-primary"
                  >
                    Add to Queue
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Queue List */}
        <div className="doctor-right-column">
          {/* Search & Filter */}
          <div className="doctor-card">
            <div className="queue-header">
              <h3>
                <FontAwesomeIcon icon={faUsers} />
                Waiting Queue ({filteredQueue.length})
              </h3>
              <div className="queue-controls">
                <div className="search-box">
                  <FontAwesomeIcon icon={faSearch} />
                  <input
                    type="text"
                    placeholder="Search by name or token..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Types</option>
                  <option value="regular">Regular</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="new">New Patient</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            </div>
          </div>

          {/* Queue List */}
          <div className="doctor-card">
            {filteredQueue.length === 0 ? (
              <div className="empty-queue">
                <FontAwesomeIcon icon={faUsers} size="2x" />
                <p>No patients waiting</p>
              </div>
            ) : (
              <div className="queue-list detailed">
                {filteredQueue.map((patient, index) => (
                  <div 
                    key={patient.id} 
                    className={`queue-item ${patient.priority}`}
                    onClick={() => handleStartConsultation(patient)}
                  >
                    <div className="queue-item-left">
                      <div className="queue-position">
                        <span className="position-badge">{index + 1}</span>
                      </div>
                      <div className="queue-patient-info">
                        <div className="queue-patient-header">
                          <span className="queue-token">{patient.token}</span>
                          <span className="queue-patient-name">{patient.patient}</span>
                        </div>
                        <div className="queue-patient-details">
                          <span className="queue-time">
                            <FontAwesomeIcon icon={faClock} /> {patient.time}
                          </span>
                          <span className="queue-arrival">
                            Arrived: {patient.arrivalTime}
                          </span>
                          {patient.phone && (
                            <span className="queue-phone">
                              <FontAwesomeIcon icon={faPhone} /> {patient.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="queue-item-right">
                      <div className="queue-type-badge">
                        <FontAwesomeIcon icon={getTypeIcon(patient.type)} />
                        <span>{patient.type}</span>
                      </div>
                      <div className="queue-wait-time">
                        <FontAwesomeIcon icon={faClock} />
                        {calculateWaitTime(patient.arrivalTime)}
                      </div>
                      <div className="queue-actions">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartConsultation(patient);
                          }}
                          disabled={isOnBreak}
                          className="start-btn-sm"
                          title="Start Consultation"
                        >
                          <FontAwesomeIcon icon={faArrowRight} />
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSkipPatient(patient.id);
                          }}
                          className="skip-btn"
                          title="Skip to End"
                        >
                          <FontAwesomeIcon icon={faClock} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Patients */}
          <div className="doctor-card">
            <h3>
              <FontAwesomeIcon icon={faCheckCircle} />
              Completed Today ({completed.length})
            </h3>
            {completed.length === 0 ? (
              <p className="no-completed">No consultations completed yet</p>
            ) : (
              <div className="completed-list">
                {completed.slice(0, 5).map(patient => (
                  <div key={patient.id} className="completed-item">
                    <div className="completed-info">
                      <span className="completed-token">{patient.token}</span>
                      <span className="completed-name">{patient.patient}</span>
                    </div>
                    <div className="completed-time">
                      Completed: {patient.completionTime}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorQueue;