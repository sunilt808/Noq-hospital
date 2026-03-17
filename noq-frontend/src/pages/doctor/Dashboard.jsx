import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserMd, faCalendar, faUsers, faClock, faBell,
  faStethoscope, faChartLine, faQrcode, faSignOutAlt,
  faUserInjured, faArrowRight, faPause, faPlay,
  faExclamationTriangle, faCheckCircle, faHistory,
  faUserSlash, faBan, faUserCircle, faCalendarPlus,
  faCalendarCheck, faCalendarTimes, faBellSlash,
  faNotesMedical, faPrescriptionBottle, faFileMedical,
  faBolt, faUserPlus, faPlus
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import doctorService from '../../services/doctorService';
import './doctor.css';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading, logout } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [queue, setQueue] = useState([]);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: '', type: 'regular', priority: 'normal' });
  const [showPrescriptionModal, setShowPrescriptionModal] = useState(false);
  const [prescription, setPrescription] = useState('');
  const [stats, setStats] = useState({
    todayAppointments: 0,
    completed: 0,
    waiting: 0,
    absent: 0,
    blocked: 0,
    avgTime: '0 min'
  });
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    billsCount: 0,
    avgEarning: 0
  });
  const [loading, setLoading] = useState(true);

  // Load doctor data
  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser || currentUser.role !== 'doctor') {
      navigate('/login');
      return;
    }

    let active = true;

    const loadDoctorDashboard = async () => {
      try {
        setLoading(true);
        
        // Get doctor data
        const doctorData = await doctorService.getCurrentDoctor();
        if (!active) return;
        
        const finalDoctor = doctorData || {
          id: currentUser.id,
          name: currentUser.full_name || currentUser.name || 'Doctor',
          email: currentUser.email,
          specialization: currentUser.specialization || 'General Physician',
          status: 'active',
        };

        // Normalize API snake_case fields to component-expected names
        finalDoctor.name = finalDoctor.full_name || finalDoctor.name || 'Doctor';
        finalDoctor.roomNumber = finalDoctor.room_no || finalDoctor.roomNumber || null;
        finalDoctor.specialization = finalDoctor.specialization || finalDoctor.department_name || 'General Physician';

        const nameParts = String(finalDoctor.name).split(' ');
        finalDoctor.initials = nameParts.map(n => n[0]).join('').toUpperCase();
        setDoctor(finalDoctor);

        // Load appointments and revenue data
        const [appointmentsData, revenueData] = await Promise.all([
          doctorService.getDoctorAppointments(currentUser.id),
          doctorService.getRevenueData()
        ]);

        if (!active) return;

        const appointments = Array.isArray(appointmentsData) ? appointmentsData : [];
        setStats({
          todayAppointments: appointments.length,
          completed: appointments.filter(a => a.status === 'completed').length,
          waiting: appointments.filter(a => ['waiting', 'pending', 'confirmed'].includes(a.status)).length,
          absent: 0,
          blocked: 0,
          avgTime: '15 min'
        });

        // Set earnings
        if (revenueData) {
          setEarnings({
            totalEarnings: revenueData.total_revenue || 0,
            billsCount: revenueData.bills_count || 0,
            avgEarning: revenueData.avg_revenue || 0
          });
        }

        // Load queue
        const queueData = appointments
          .filter(a => ['waiting', 'pending', 'confirmed'].includes(a.status))
          .map(a => ({
            id: a.id,
            token: a.token || `T${String(Math.random()).slice(-3)}`,
            patient: a.patient_name || 'Patient',
            patientId: a.patient_id || a.id,
            time: a.time || new Date().toLocaleTimeString(),
            status: a.status,
            type: a.type || 'regular',
            priority: a.priority || 'normal',
            absentCount: 0,
            isBlocked: false,
            history: [],
            reason: a.notes || a.reason || ''
          }));
        
        setQueue(queueData);
        if (queueData.length > 0) {
          setCurrentPatient(queueData[0]);
        }
      } catch (error) {
        console.error('Error loading doctor dashboard:', error);
        // Still set doctor from currentUser to allow page to render
        const nameParts = String(currentUser.name || 'Doctor').split(' ');
        const dr = {
          id: currentUser.id,
          name: currentUser.name || 'Doctor',
          email: currentUser.email,
          specialization: currentUser.specialization || 'General Physician',
          status: 'active',
          initials: nameParts.map(n => n[0]).join('').toUpperCase()
        };
        setDoctor(dr);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadDoctorDashboard();
    
    return () => {
      active = false;
    };
  }, [authLoading, currentUser, navigate]);

  const handleStartConsultation = () => {
    if (queue.length === 0) return;
    const nextPatient = queue[0];
    setCurrentPatient(nextPatient);
    setQueue(prev => prev.slice(1));
    alert(`Starting consultation with ${nextPatient.patient} (Token: ${nextPatient.token})`);
  };

  const handleCompleteConsultation = async () => {
    if (!currentPatient) return;
    
    try {
      await doctorService.updateAppointmentStatus(currentPatient.id, 'completed');
      alert(`✅ Completed consultation with ${currentPatient.patient}`);
      setStats(prev => ({
        ...prev,
        completed: prev.completed + 1,
        waiting: Math.max(0, prev.waiting - 1)
      }));
      setCurrentPatient(null);
      
      if (queue.length > 0) {
        setCurrentPatient(queue[0]);
        setQueue(prev => prev.slice(1));
      }
    } catch (error) {
      console.error('Error completing consultation:', error);
      alert('Failed to complete consultation');
    }
  };

  const handleMarkAbsent = async () => {
    if (!currentPatient) return;
    
    try {
      await doctorService.updateAppointmentStatus(currentPatient.id, 'cancelled');
      alert(`⚠️ Marked ${currentPatient.patient} as absent`);
      setStats(prev => ({
        ...prev,
        absent: prev.absent + 1,
        waiting: Math.max(0, prev.waiting - 1)
      }));
      
      if (queue.length > 0) {
        setCurrentPatient(queue[0]);
        setQueue(prev => prev.slice(1));
      } else {
        setCurrentPatient(null);
      }
    } catch (error) {
      console.error('Error marking absent:', error);
    }
  };

  const handleAddPrescription = () => {
    if (!currentPatient) {
      alert('No current patient');
      return;
    }
    setPrescription('');
    setShowPrescriptionModal(true);
  };

  const handleSavePrescription = async () => {
    const cleanedPrescription = String(prescription || '').trim();

    if (!currentPatient) {
      alert('No current patient selected.');
      return;
    }

    if (!cleanedPrescription) {
      alert('Please write prescription details before saving.');
      return;
    }

    try {
      await doctorService.createPrescription({
        patient_id: currentPatient.patientId,
        patient_name: currentPatient.patient,
        doctor_id: currentUser.id,
        doctor_name: currentUser.name,
        prescription: cleanedPrescription,
        date: new Date().toISOString()
      });

      alert('Prescription saved successfully!');
      setPrescription('');
      setShowPrescriptionModal(false);
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Failed to save prescription');
    }
  };

  const handleReschedule = () => {
    if (!currentPatient) {
      alert('No current patient');
      return;
    }
    
    const newTime = prompt(`Reschedule ${currentPatient.patient} for (HH:MM):`, '14:30');
    if (newTime) {
      alert(`${currentPatient.patient} rescheduled to ${newTime}`);
    }
  };

  const toggleBreak = () => {
    setIsOnBreak(!isOnBreak);
    alert(isOnBreak ? 'Break ended. You are now active.' : 'You are now on break.');
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getNextToken = () => {
    if (queue.length === 0) return 'T01';
    const lastTokenRaw = queue[queue.length - 1]?.token;
    const lastToken = typeof lastTokenRaw === 'string' ? lastTokenRaw : String(lastTokenRaw || 'T00');
    const numericMatch = lastToken.match(/(\d+)/);
    const lastNumber = Number(numericMatch?.[1] || 0);
    return `T${(lastNumber + 1).toString().padStart(2, '0')}`;
  };

  if (loading || !doctor) {
    return (
      <div className="doctor-loading">
        <div className="loading-spinner"></div>
        <p>Loading doctor dashboard...</p>
      </div>
    );
  }

  return (
    <div className="doctor-portal">
      {/* Header */}
      <header className="doctor-header">
        <div className="doctor-header-left">
          <div className="doctor-avatar-container">
            <div className="doctor-avatar-circle">
              {doctor.initials || 'DR'}
            </div>
            <div className="doctor-greeting">
              <h1>Welcome, Dr. {(doctor.name || 'Doctor').split(' ')[0]}</h1>
              <p className="doctor-specialization">
                <FontAwesomeIcon icon={faStethoscope} /> {doctor.specialization}
              </p>
            </div>
          </div>
          <div className="doctor-info">
            <span className="doctor-room">
              <FontAwesomeIcon icon={faQrcode} /> Room {doctor.roomNumber || '101'}
            </span>
            <span className="doctor-shift">
              <FontAwesomeIcon icon={faClock} /> {doctor.shift || 'Morning'} Shift
            </span>
            <span className="doctor-status">
              {isOnBreak ? '⏸️ On Break' : '🟢 Active'}
            </span>
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
          <button className="logout-btn" onClick={handleLogout}>
            <FontAwesomeIcon icon={faSignOutAlt} /> Logout
          </button>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="doctor-stats-grid">
        <div className="stat-card blue">
          <FontAwesomeIcon icon={faCalendar} className="stat-icon" />
          <div className="stat-value">{stats.todayAppointments}</div>
          <div className="stat-label">Today's Appointments</div>
        </div>
        
        <div className="stat-card green">
          <FontAwesomeIcon icon={faCheckCircle} className="stat-icon" />
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">Completed</div>
        </div>
        
        <div className="stat-card orange">
          <FontAwesomeIcon icon={faUsers} className="stat-icon" />
          <div className="stat-value">{stats.waiting}</div>
          <div className="stat-label">Waiting</div>
        </div>
        
        <div className="stat-card red">
          <FontAwesomeIcon icon={faUserSlash} className="stat-icon" />
          <div className="stat-value">{stats.absent}</div>
          <div className="stat-label">Absent Today</div>
        </div>
        
        <div className="stat-card purple">
          <FontAwesomeIcon icon={faBan} className="stat-icon" />
          <div className="stat-value">{stats.blocked}</div>
          <div className="stat-label">Blocked Patients</div>
        </div>

        <div className="stat-card gold">
          <FontAwesomeIcon icon={faChartLine} className="stat-icon" />
          <div className="stat-value">₹{earnings.totalEarnings?.toLocaleString() || '0'}</div>
          <div className="stat-label">Total Earnings</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="doctor-main-content">
        {/* Left Column - Current Patient */}
        <div className="doctor-left-column">
          <div className="current-patient-card">
            <div className="card-header">
              <h3>
                <FontAwesomeIcon icon={faUserInjured} />
                Current Patient
              </h3>
              {currentPatient && (
                <div className="patient-badges">
                  <span className={`type-badge ${currentPatient.type}`}>
                    {currentPatient.type === 'emergency' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                    {currentPatient.type}
                  </span>
                  {currentPatient.absentCount > 0 && (
                    <span className="absent-badge">
                      <FontAwesomeIcon icon={faUserSlash} /> {currentPatient.absentCount} absences
                    </span>
                  )}
                  {currentPatient.isBlocked && (
                    <span className="blocked-badge">
                      <FontAwesomeIcon icon={faBan} /> Blocked
                    </span>
                  )}
                </div>
              )}
            </div>
            
            {currentPatient ? (
              <div className="current-patient-details">
                <div className="patient-avatar-section">
                  <div className="patient-avatar">
                    {currentPatient.patient.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="patient-info">
                    <div className="patient-token">
                      <span className="token-badge">Token: {currentPatient.token}</span>
                      {currentPatient.priority === 'urgent' && (
                        <span className="priority-badge urgent">URGENT</span>
                      )}
                      {currentPatient.priority === 'high' && (
                        <span className="priority-badge high">HIGH</span>
                      )}
                    </div>
                    <h4 className="patient-name">{currentPatient.patient}</h4>
                    <p className="patient-time">
                      <FontAwesomeIcon icon={faClock} /> Scheduled: {currentPatient.time}
                    </p>
                    <p className="patient-type">
                      <FontAwesomeIcon icon={faHistory} /> Type: {currentPatient.type}
                    </p>
                    {currentPatient.reason && (
                      <p className="patient-reason">
                        <FontAwesomeIcon icon={faNotesMedical} /> Reason: {currentPatient.reason}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="consultation-actions">
                  <button 
                    className="complete-btn"
                    onClick={handleCompleteConsultation}
                  >
                    <FontAwesomeIcon icon={faCheckCircle} /> Complete
                  </button>
                  <button 
                    className="absent-btn"
                    onClick={handleMarkAbsent}
                  >
                    <FontAwesomeIcon icon={faUserSlash} /> Mark Absent
                  </button>
                  <button 
                    className="prescription-btn"
                    onClick={() => navigate('/doctor/prescriptions')}
                  >
                    <FontAwesomeIcon icon={faPrescriptionBottle} /> Prescription
                  </button>
                </div>
              </div>
            ) : (
              <div className="no-patient">
                <div className="no-patient-icon">
                  <FontAwesomeIcon icon={faUserCircle} />
                </div>
                <p>No current patient</p>
                <button 
                  className="start-btn"
                  onClick={handleStartConsultation}
                  disabled={queue.length === 0 || isOnBreak}
                >
                  <FontAwesomeIcon icon={faArrowRight} /> Start Next Consultation
                </button>
              </div>
            )}
          </div>

          {/* Queue Preview */}
          <div className="queue-preview-card">
            <div className="card-header">
              <h3>
                <FontAwesomeIcon icon={faUsers} />
                Waiting Queue ({queue.length})
              </h3>
              <div className="queue-header-actions">
                <span className="queue-status">
                  {isOnBreak ? '⏸️ On Break' : '🟢 Active'}
                </span>
                <button 
                  className="next-patient-btn"
                  onClick={handleStartConsultation}
                  disabled={queue.length === 0 || isOnBreak}
                >
                  <FontAwesomeIcon icon={faArrowRight} /> Call Next
                </button>
              </div>
            </div>
            
            {queue.length === 0 ? (
              <div className="empty-queue">
                <p>No patients waiting</p>
              </div>
            ) : (
              <div className="queue-list">
                {queue.slice(0, 5).map((patient, index) => (
                  <div key={patient.id} className={`queue-item ${index === 0 ? 'next-patient' : ''}`}>
                    <div className="queue-item-left">
                      <div className="queue-avatar">
                        {patient.patient.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div className="queue-info">
                        <div className="queue-item-header">
                          <span className="queue-token">{patient.token}</span>
                          <span className="queue-patient">{patient.patient}</span>
                          {patient.priority === 'urgent' && (
                            <span className="priority-dot urgent"></span>
                          )}
                        </div>
                        <span className="queue-reason">{patient.reason}</span>
                      </div>
                    </div>
                    <div className="queue-item-right">
                      <span className="queue-time">{patient.time}</span>
                      <span className={`queue-type ${patient.type}`}>
                        {patient.type === 'emergency' && <FontAwesomeIcon icon={faExclamationTriangle} />}
                        {patient.type}
                      </span>
                      {index === 0 && <span className="next-indicator">NEXT</span>}
                    </div>
                  </div>
                ))}
                
                {queue.length > 5 && (
                  <div className="queue-more">
                    <p>+ {queue.length - 5} more patients waiting...</p>
                  </div>
                )}
              </div>
            )}
            
            <div className="queue-actions">
              <p className="queue-info-text">Next Token: {getNextToken()} | Est. Wait Time: ~{Math.round(queue.length * 15)} min</p>
            </div>
          </div>
        </div>

        {/* Right Column - Summary */}
        <div className="doctor-right-column">
          <div className="summary-card">
            <h3>
              <FontAwesomeIcon icon={faChartLine} />
              Today's Summary
            </h3>
            <div className="summary-stats">
              <div className="summary-item">
                <span className="summary-label">Total Appointments:</span>
                <span className="summary-value">{stats.todayAppointments}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Completed:</span>
                <span className="summary-value">{stats.completed}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Waiting:</span>
                <span className="summary-value">{stats.waiting}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Absent Today:</span>
                <span className="summary-value">{stats.absent}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Blocked Patients:</span>
                <span className="summary-value">{stats.blocked}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Prescription Modal */}
      {showPrescriptionModal && (
        <div className="modal-overlay" onClick={() => setShowPrescriptionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3><FontAwesomeIcon icon={faPrescriptionBottle} /> Add Prescription</h3>
              <button className="modal-close" onClick={() => setShowPrescriptionModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p>Patient: <strong>{currentPatient?.patient}</strong></p>
              <textarea
                value={prescription}
                onChange={(e) => setPrescription(e.target.value)}
                placeholder="Enter prescription details..."
                rows="6"
                className="prescription-textarea"
                autoFocus
              />
              <div className="modal-actions">
                <button onClick={handleSavePrescription} className="save-btn">Save Prescription</button>
                <button onClick={() => setShowPrescriptionModal(false)} className="cancel-btn">Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorDashboard;
