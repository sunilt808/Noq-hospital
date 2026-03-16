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
  faBolt, faUserPlus, faPlus // Added for enhanced quick actions
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import notificationService from '../../services/notificationService';
import revenueService from '../../services/revenueService';
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
  const [patientsData, setPatientsData] = useState([]);
  const [appointmentsData, setAppointmentsData] = useState([]);
  const [billsData, setBillsData] = useState([]);

  // Load doctor data
  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser || currentUser.role !== 'doctor') {
      navigate('/login');
      return;
    }

    let active = true;

    const loadDoctorDashboard = async () => {
      const [doctors, patients, appointments, bills] = await Promise.all([
        firebaseDbService.getCollection('doctors'),
        firebaseDbService.getCollection('patients'),
        firebaseDbService.getCollection('appointments'),
        firebaseDbService.getCollection('bills'),
      ]);

      if (!active) return;

      const doctorData =
        doctors.find(
          (d) =>
            String(d.id) === String(currentUser.id) ||
            d.DID === currentUser.id ||
            d.email?.toLowerCase() === currentUser.email?.toLowerCase()
        ) || {
          id: currentUser.id,
          name: currentUser.name || 'Doctor',
          email: currentUser.email,
          specialization: currentUser.specialization || 'General Physician',
          status: 'active',
        };

      const nameParts = String(doctorData.name || 'Doctor').split(' ');
      doctorData.initials = nameParts.map(n => n[0]).join('').toUpperCase();
      setDoctor(doctorData);
      setPatientsData(Array.isArray(patients) ? patients : []);
      setAppointmentsData(Array.isArray(appointments) ? appointments : []);
      setBillsData(Array.isArray(bills) ? bills : []);
      
      // Calculate doctor earnings
      const doctorEarnings = revenueService.calculateDoctorEarnings(
        Array.isArray(bills) ? bills : [],
        doctorData.id
      );
      setEarnings(doctorEarnings);
      
      loadQueueData(doctorData.id, patients, appointments);
      loadTodayStats(doctorData.id, patients, appointments);
    };

    loadDoctorDashboard();
    window.addEventListener('focus', loadDoctorDashboard);
    return () => {
      active = false;
      window.removeEventListener('focus', loadDoctorDashboard);
    };
  }, [authLoading, currentUser, navigate]);

  // Load queue data with absent tracking
  const loadQueueData = (doctorId, patientsList = patientsData, appointmentsList = appointmentsData) => {
    const resolveTokenText = (appointment) => {
      const tokenValue = appointment?.token ?? appointment?.queueToken ?? '';

      if (typeof tokenValue === 'string') {
        return tokenValue;
      }

      if (typeof tokenValue === 'number') {
        return `T${String(tokenValue).padStart(2, '0')}`;
      }

      if (tokenValue && typeof tokenValue === 'object') {
        return (
          tokenValue.tokenCode ||
          tokenValue.tokenNumber ||
          tokenValue.token ||
          tokenValue.id ||
          ''
        );
      }

      return '';
    };

    const activeQueue = (appointmentsList || [])
      .filter((appointment) => String(appointment.doctorId || '') === String(doctorId) && ['waiting', 'confirmed', 'pending'].includes(String(appointment.status || '').toLowerCase()))
      .map((appointment) => {
        const patient = (patientsList || []).find((item) => String(item.id) === String(appointment.patientId));
        return {
          id: appointment.id,
          token: resolveTokenText(appointment),
          patient: appointment.patientName || patient?.name || 'Patient',
          patientId: appointment.patientId,
          time: appointment.time || '',
          status: String(appointment.status || '').toLowerCase(),
          type: appointment.type || 'regular',
          priority: appointment.priority || 'normal',
          absentCount: patient?.absentCount || 0,
          isBlocked: patient?.isBlocked || false,
          history: patient?.lastVisits || [],
          reason: appointment.reason || appointment.notes || ''
        };
      })
      .filter((patient) => !patient.isBlocked);

    const uniqueQueue = [];
    const seen = new Set();
    activeQueue.forEach((item) => {
      const dedupeKey = `${item.id || ''}-${item.patientId || ''}-${item.token || ''}`;
      if (!seen.has(dedupeKey)) {
        seen.add(dedupeKey);
        uniqueQueue.push(item);
      }
    });

    setQueue(uniqueQueue);
    
    // Set first patient as current
    if (uniqueQueue.length > 0) {
      setCurrentPatient(uniqueQueue[0]);
    }
  };

  // Update absent count for patient
  const updateAbsentCount = async (patientId, increment = true) => {
    const patients = [...patientsData];
    const patientIndex = patients.findIndex(p => p.id === patientId);
    
    if (patientIndex !== -1) {
      if (increment) {
        patients[patientIndex].absentCount += 1;
        
        // Check if absent count reaches 3 (continuous absences)
        if (patients[patientIndex].absentCount >= 3) {
          patients[patientIndex].isBlocked = true;
          patients[patientIndex].blockedDate = new Date().toISOString();
          patients[patientIndex].blockedReason = '3 consecutive absences';
          
          // Remove from all queues
          removePatientFromAllQueues(patientId);
          
          alert(`⚠️ Patient ${patients[patientIndex].name} has been BLOCKED due to 3 consecutive absences. They cannot book appointments until unblocked.`);
          
          // Send notification
          await sendBlockNotification(patients[patientIndex]);
        }
      } else {
        // Reset absent count if patient shows up
        patients[patientIndex].absentCount = 0;
        patients[patientIndex].isBlocked = false;
        delete patients[patientIndex].blockedDate;
        delete patients[patientIndex].blockedReason;
      }

      setPatientsData(patients);
      await firebaseDbService.upsert('patients', patients[patientIndex].id, patients[patientIndex]);
      return patients[patientIndex];
    }
    return null;
  };

  const removePatientFromAllQueues = (patientId) => {
    // Remove patient from current doctor's queue
    setQueue(prev => prev.filter(p => p.patientId !== patientId));
    
    // In a real app, you would also remove from other doctors' queues
    console.log(`Patient ${patientId} removed from all queues`);
  };

  const sendBlockNotification = async (patient) => {
    await notificationService.publish({
      id: `NOTIF-${Date.now()}`,
      type: 'block',
      targetRole: 'patient',
      targetUserId: patient.id,
      patientId: patient.id,
      patientName: patient.name,
      message: `Patient ${patient.name} has been blocked due to 3 consecutive absences`,
      createdAt: new Date().toISOString(),
    });
  };

  const loadTodayStats = (doctorId, patientsList = patientsData, appointmentsList = appointmentsData) => {
    const appointments = (appointmentsList || []).filter(
      (appointment) => String(appointment.doctorId || '') === String(doctorId)
    );
    const absentCount = (patientsList || []).filter(p => p.absentCount > 0).length;
    const blockedCount = (patientsList || []).filter(p => p.isBlocked).length;
    
    setStats({
      todayAppointments: appointments.length,
      completed: appointments.filter((item) => String(item.status || '').toLowerCase() === 'completed').length,
      waiting: appointments.filter((item) => ['waiting', 'pending', 'confirmed'].includes(String(item.status || '').toLowerCase())).length,
      absent: absentCount,
      blocked: blockedCount,
      avgTime: appointments.length ? '15 min' : '0 min'
    });
  };

  // Add new patient to queue
  const handleAddPatient = async () => {
    if (!newPatient.name.trim()) {
      alert('Please enter patient name');
      return;
    }

    const newPatientId = Date.now();
    const newQueuePatient = {
      id: newPatientId,
      token: `T${Math.floor(Math.random() * 100)}`,
      patient: newPatient.name,
      patientId: newPatientId,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'waiting',
      type: newPatient.type,
      priority: newPatient.priority,
      absentCount: 0,
      isBlocked: false,
      history: [],
      reason: 'Walk-in'
    };

    // Add to patients list
    const patientRecord = {
      id: newPatientId,
      name: newPatient.name,
      absentCount: 0,
      isBlocked: false,
      contact: '',
      lastVisits: []
    };
    await firebaseDbService.upsert('patients', patientRecord.id, patientRecord);
    setPatientsData((prev) => [...prev, patientRecord]);

    await firebaseDbService.upsert('appointments', newQueuePatient.id, {
      id: newQueuePatient.id,
      patientId: newQueuePatient.patientId,
      patientName: newQueuePatient.patient,
      doctorId: doctor.id,
      doctorName: doctor.name,
      time: newQueuePatient.time,
      status: 'waiting',
      type: newQueuePatient.type,
      priority: newQueuePatient.priority,
      reason: newQueuePatient.reason,
      createdAt: new Date().toISOString(),
    });
    setAppointmentsData((prev) => [...prev, {
      id: newQueuePatient.id,
      patientId: newQueuePatient.patientId,
      patientName: newQueuePatient.patient,
      doctorId: doctor.id,
      doctorName: doctor.name,
      time: newQueuePatient.time,
      status: 'waiting',
      type: newQueuePatient.type,
      priority: newQueuePatient.priority,
      reason: newQueuePatient.reason,
    }]);

    // Add to queue
    setQueue(prev => [...prev, newQueuePatient]);
    setNewPatient({ name: '', type: 'regular', priority: 'normal' });
    setShowAddPatient(false);
    
    alert(`Patient ${newPatient.name} added to queue`);
  };

  // Handle actions
  const handleStartConsultation = () => {
    if (queue.length === 0) return;
    
    const nextPatient = queue[0];
    setCurrentPatient(nextPatient);
    setQueue(prev => prev.slice(1));
    
    alert(`Starting consultation with ${nextPatient.patient} (Token: ${nextPatient.token})`);
  };

  const handleCompleteConsultation = async () => {
    if (!currentPatient) return;
    
    // Update patient's absent count (reset if they showed up)
    if (currentPatient.absentCount > 0) {
      await updateAbsentCount(currentPatient.patientId, false);
    }
    
    // Add to patient's visit history
    const patients = [...patientsData];
    const patientIndex = patients.findIndex(p => p.id === currentPatient.patientId);
    if (patientIndex !== -1) {
      patients[patientIndex].lastVisits = patients[patientIndex].lastVisits || [];
      patients[patientIndex].lastVisits.unshift({
        date: new Date().toISOString(),
        doctor: doctor.name,
        type: currentPatient.type,
        notes: ''
      });
      setPatientsData(patients);
      await firebaseDbService.upsert('patients', patients[patientIndex].id, patients[patientIndex]);
    }
    
    alert(`✅ Completed consultation with ${currentPatient.patient}`);
    setCurrentPatient(null);
    
    // Update stats
    setStats(prev => ({
      ...prev,
      completed: prev.completed + 1,
      waiting: Math.max(0, prev.waiting - 1)
    }));
    
    // If queue has more patients, set next one
    if (queue.length > 0) {
      setCurrentPatient(queue[0]);
      setQueue(prev => prev.slice(1));
    }
  };

  const handleMarkAbsent = async () => {
    if (!currentPatient) return;
    
    // Update absent count
    const updatedPatient = await updateAbsentCount(currentPatient.patientId);
    
    if (updatedPatient) {
      const warningMsg = updatedPatient.isBlocked 
        ? `🚫 Patient ${currentPatient.patient} has been BLOCKED due to 3 consecutive absences!`
        : `⚠️ Marked ${currentPatient.patient} as absent. Total absences: ${updatedPatient.absentCount}`;
      
      alert(warningMsg);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        absent: prev.absent + 1,
        blocked: updatedPatient.isBlocked ? prev.blocked + 1 : prev.blocked,
        waiting: Math.max(0, prev.waiting - 1)
      }));
      
      // Move to next patient
      if (queue.length > 0) {
        setCurrentPatient(queue[0]);
        setQueue(prev => prev.slice(1));
      } else {
        setCurrentPatient(null);
      }
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

    const prescriptionRecord = {
      id: Date.now(),
      patientId: currentPatient.patientId,
      patientName: currentPatient.patient,
      doctorId: doctor.id,
      doctorName: doctor.name,
      prescription: cleanedPrescription,
      date: new Date().toISOString()
    };
    await firebaseDbService.upsert('prescriptions', prescriptionRecord.id, prescriptionRecord);

    alert('Prescription saved successfully!');
    setPrescription('');
    setShowPrescriptionModal(false);
  };

  const handleReschedule = () => {
    if (!currentPatient) {
      alert('No current patient');
      return;
    }
    
    const newTime = prompt(`Reschedule ${currentPatient.patient} for (HH:MM):`, '14:30');
    if (newTime) {
      alert(`${currentPatient.patient} rescheduled to ${newTime}`);
      // In real app, update the appointment time
    }
  };

  const handleViewHistory = () => {
    if (!currentPatient) {
      alert('No current patient');
      return;
    }
    navigate('/doctor/patient-history', { state: { patientId: currentPatient.patientId } });
  };

  const toggleBreak = () => {
    setIsOnBreak(!isOnBreak);
    alert(isOnBreak ? 'Break ended. You are now active.' : 'You are now on break.');
  };

  const handleLogout = async () => {
    if (doctor?.id) {
      await firebaseDbService.remove('doctorPresence', doctor.id);
    }
    await logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!doctor?.id) return;

    firebaseDbService.upsert('doctorPresence', doctor.id, {
      doctorId: String(doctor.id),
      doctorName: doctor.name || 'Doctor',
      status: isOnBreak ? 'on_break' : currentPatient ? 'in_consultation' : 'available',
      currentPatientId: currentPatient?.patientId || null,
      currentPatientName: currentPatient?.patient || null,
      updatedAt: new Date().toISOString(),
    });
  }, [doctor, currentPatient, isOnBreak]);

  // Calculate next token
  const getNextToken = () => {
    if (queue.length === 0) return 'T01';
    const lastTokenRaw = queue[queue.length - 1]?.token;
    const lastToken = typeof lastTokenRaw === 'string' ? lastTokenRaw : String(lastTokenRaw || 'T00');
    const numericMatch = lastToken.match(/(\d+)/);
    const lastNumber = Number(numericMatch?.[1] || 0);
    return `T${(lastNumber + 1).toString().padStart(2, '0')}`;
  };

  if (!doctor) {
    return (
      <div className="doctor-loading">
        <div className="loading-spinner"></div>
        <p>Loading doctor profile...</p>
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
              <h1>Welcome, Dr. {doctor.name.split(' ')[0]}</h1>
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
                
                <div className="patient-extra-actions">
                  <button className="extra-btn" onClick={handleReschedule}>
                    <FontAwesomeIcon icon={faCalendarTimes} /> Reschedule
                  </button>
                  <button className="extra-btn" onClick={handleViewHistory}>
                    <FontAwesomeIcon icon={faFileMedical} /> View History
                  </button>
                </div>
                
                {/* Absent Warning */}
                {currentPatient.absentCount >= 2 && !currentPatient.isBlocked && (
                  <div className="absent-warning">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span>⚠️ WARNING: Patient has {currentPatient.absentCount} consecutive absences. Next absence will BLOCK them!</span>
                  </div>
                )}
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

          {/* Quick Actions - Enhanced Version */}
          <div className="quick-actions-card enhanced">
            <div className="card-header">
              <h3>
                <FontAwesomeIcon icon={faBolt} />
                Quick Actions
              </h3>
              <span className="action-badge">4 Actions</span>
            </div>
            
            <div className="enhanced-action-grid">
              <button 
                onClick={() => navigate('/doctor/queue')} 
                className="action-card primary"
              >
                <div className="action-icon">
                  <FontAwesomeIcon icon={faUsers} />
                </div>
                <div className="action-content">
                  <span className="action-title">View Full Queue</span>
                  <span className="action-subtitle">{queue.length} patients waiting</span>
                </div>
                <div className="action-arrow">
                  <FontAwesomeIcon icon={faArrowRight} />
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/doctor/patients')} 
                className="action-card success"
              >
                <div className="action-icon">
                  <FontAwesomeIcon icon={faUserInjured} />
                </div>
                <div className="action-content">
                  <span className="action-title">Manage Patients</span>
                  <span className="action-subtitle">{stats.absent} absent today</span>
                </div>
                <div className="action-arrow">
                  <FontAwesomeIcon icon={faArrowRight} />
                </div>
              </button>
              
              <button 
                onClick={() => setShowAddPatient(true)} 
                className="action-card warning"
              >
                <div className="action-icon">
                  <FontAwesomeIcon icon={faUserPlus} />
                </div>
                <div className="action-content">
                  <span className="action-title">Add Walk-in</span>
                  <span className="action-subtitle">New patient registration</span>
                </div>
                <div className="action-arrow">
                  <FontAwesomeIcon icon={faPlus} />
                </div>
              </button>
              
              <button 
                onClick={() => navigate('/doctor/patients')} 
                className="action-card danger"
              >
                <div className="action-icon">
                  <FontAwesomeIcon icon={faBan} />
                </div>
                <div className="action-content">
                  <span className="action-title">Blocked Patients</span>
                  <span className="action-subtitle">{stats.blocked} blocked</span>
                </div>
                <div className="action-arrow">
                  <FontAwesomeIcon icon={faArrowRight} />
                </div>
              </button>
            </div>
            
            {/* Additional Quick Stats */}
            <div className="quick-stats-footer">
              <div className="quick-stat-item">
                <span className="quick-stat-label">Current Token</span>
                <span className="quick-stat-value">{currentPatient?.token || getNextToken()}</span>
              </div>
              <div className="quick-stat-item">
                <span className="quick-stat-label">Est. Wait Time</span>
                <span className="quick-stat-value">{Math.round(queue.length * 12)} min</span>
              </div>
              <div className="quick-stat-item">
                <span className="quick-stat-label">Break Status</span>
                <span className={`quick-stat-value ${isOnBreak ? 'on-break' : 'active'}`}>
                  {isOnBreak ? '⏸️ On Break' : '🟢 Active'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Queue Preview */}
        <div className="doctor-right-column">
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
            
            {showAddPatient && (
              <div className="add-patient-form">
                <h4>Add Walk-in Patient</h4>
                <input
                  type="text"
                  placeholder="Patient Name"
                  value={newPatient.name}
                  onChange={(e) => setNewPatient({...newPatient, name: e.target.value})}
                  className="form-input"
                />
                <select
                  value={newPatient.type}
                  onChange={(e) => setNewPatient({...newPatient, type: e.target.value})}
                  className="form-select"
                >
                  <option value="regular">Regular</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="new">New Patient</option>
                  <option value="emergency">Emergency</option>
                </select>
                <select
                  value={newPatient.priority}
                  onChange={(e) => setNewPatient({...newPatient, priority: e.target.value})}
                  className="form-select"
                >
                  <option value="normal">Normal Priority</option>
                  <option value="high">High Priority</option>
                  <option value="urgent">Urgent</option>
                </select>
                <div className="form-actions">
                  <button onClick={handleAddPatient} className="add-btn">Add to Queue</button>
                  <button onClick={() => setShowAddPatient(false)} className="cancel-btn">Cancel</button>
                </div>
              </div>
            )}
            
            {queue.length === 0 ? (
              <div className="empty-queue">
                <p>No patients waiting</p>
                <button 
                  onClick={() => setShowAddPatient(true)}
                  className="add-patient-btn"
                >
                  <FontAwesomeIcon icon={faCalendarPlus} /> Add Walk-in Patient
                </button>
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
                          {patient.priority === 'high' && (
                            <span className="priority-dot high"></span>
                          )}
                        </div>
                        {patient.absentCount > 0 && (
                          <span className="queue-absent-count">
                            <FontAwesomeIcon icon={faUserSlash} /> {patient.absentCount} absences
                          </span>
                        )}
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

          {/* Today's Summary */}
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
            <div className="summary-note">
              <FontAwesomeIcon icon={faBellSlash} />
              <span>Patients with 3 consecutive absences are automatically blocked</span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Mobile */}
      <button 
        className="floating-add-btn"
        onClick={() => setShowAddPatient(true)}
        title="Add Walk-in Patient"
      >
        <FontAwesomeIcon icon={faPlus} />
      </button>

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