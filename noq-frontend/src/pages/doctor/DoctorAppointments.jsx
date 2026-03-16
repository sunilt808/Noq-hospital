import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';
import firebaseDbService from '../../services/firebaseDbService';
import { recordHistory } from '../../services/historyService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faCalendar, faClock, faUserInjured,
  faPhone, faEnvelope, faStethoscope, faFileMedical,
  faCheckCircle, faTimesCircle, faHourglassHalf,
  faSearch, faFilter, faPlus, faEdit, faTrash,
  faCalendarPlus, faCalendarCheck, faCalendarTimes,
  faUserMd, faBuilding, faDoorOpen, faBell
} from '@fortawesome/free-solid-svg-icons';
import './doctor.css';

const DoctorAppointments = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { appointments, doctors, loading, filterByCurrentUser } = useFirebaseData();
  
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [newAppointment, setNewAppointment] = useState({
    patientName: '',
    phone: '',
    time: '09:00',
    duration: '15',
    type: 'consultation',
    notes: ''
  });

  // Get current doctor from Firebase data
  const doctor = doctors.find((d) => String(d.id).toLowerCase() === String(currentUser?.id).toLowerCase());
  
  // Get appointments for current doctor
  const doctorAppointments = appointments.filter(
    (apt) => String(apt.doctorId || '') === String(doctor?.id || '') ||
             String(apt.doctorId) === String(currentUser?.id)
  );

  useEffect(() => {
    if (!authLoading && (!currentUser || String(currentUser.role || '').toLowerCase() !== 'doctor')) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, currentUser, navigate]);

  // Time slots (9 AM to 9 PM, 15 min intervals)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  // Filter appointments
  const filteredAppointments = doctorAppointments.filter(app => {
    const matchesDate = app.date === selectedDate;
    const matchesStatus = selectedStatus === 'all' || app.status === selectedStatus;
    const matchesSearch = app.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         app.phone.includes(searchTerm) ||
                         app.token.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesDate && matchesStatus && matchesSearch;
  });

  // Group appointments by time
  const timeGroups = filteredAppointments.reduce((groups, app) => {
    const time = app.time;
    if (!groups[time]) {
      groups[time] = [];
    }
    groups[time].push(app);
    return groups;
  }, {});

  // Get status color and icon
  const getStatusInfo = (status) => {
    switch(status) {
      case 'confirmed':
        return { color: '#10b981', icon: faCheckCircle, label: 'Confirmed' };
      case 'pending':
        return { color: '#f59e0b', icon: faHourglassHalf, label: 'Pending' };
      case 'cancelled':
        return { color: '#ef4444', icon: faTimesCircle, label: 'Cancelled' };
      default:
        return { color: '#64748b', icon: faClock, label: 'Scheduled' };
    }
  };

  // Get type color
  const getTypeColor = (type) => {
    switch(type) {
      case 'consultation': return '#3b82f6';
      case 'follow-up': return '#8b5cf6';
      case 'emergency': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getAppointmentById = (appointmentId) =>
    doctorAppointments.find((app) => String(app.id) === String(appointmentId));

  // Handle appointment actions
  const handleConfirmAppointment = async (appointmentId) => {
    const app = getAppointmentById(appointmentId);
    if (!app) return;
    await firebaseDbService.upsert('appointments', appointmentId, { ...app, status: 'confirmed' });
    recordHistory({
      action: 'appointment_confirmed',
      module: 'appointments',
      message: `Confirmed appointment for ${app?.patientName || 'patient'} at ${app?.time || ''}`,
      doctorId: String(doctor?.id || ''),
      hospitalId: String(doctor?.hospitalId || ''),
      appointmentId: String(appointmentId),
      meta: { patientName: app?.patientName, time: app?.time, date: app?.date },
    });
    alert('Appointment confirmed successfully');
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      const app = getAppointmentById(appointmentId);
      if (!app) return;
      await firebaseDbService.upsert('appointments', appointmentId, { ...app, status: 'cancelled' });
      recordHistory({
        action: 'appointment_cancelled',
        module: 'appointments',
        message: `Cancelled appointment for ${app?.patientName || 'patient'} at ${app?.time || ''}`,
        doctorId: String(doctor?.id || ''),
        hospitalId: String(doctor?.hospitalId || ''),
        appointmentId: String(appointmentId),
        meta: { patientName: app?.patientName, time: app?.time, date: app?.date },
      });
      alert('Appointment cancelled');
    }
  };

  const handleEditAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setNewAppointment({
      patientName: appointment.patientName,
      phone: appointment.phone,
      time: appointment.time,
      duration: appointment.duration.toString(),
      type: appointment.type,
      notes: appointment.notes
    });
    setShowEditModal(true);
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (window.confirm('Delete this appointment permanently?')) {
      const app = getAppointmentById(appointmentId);
      if (!app) return;
      await firebaseDbService.remove('appointments', appointmentId);
      recordHistory({
        action: 'appointment_deleted',
        module: 'appointments',
        message: `Deleted appointment for ${app?.patientName || 'patient'} on ${app?.date || ''}`,
        doctorId: String(doctor?.id || ''),
        hospitalId: String(doctor?.hospitalId || ''),
        appointmentId: String(appointmentId),
        meta: { patientName: app?.patientName, date: app?.date },
      });
      alert('Appointment deleted');
    }
  };

  const handleAddAppointment = async () => {
    if (!newAppointment.patientName.trim() || !newAppointment.phone.trim()) {
      alert('Please enter patient name and phone number');
      return;
    }

    const newAppId = `apt_${Date.now()}`;
    const newApp = {
      id: newAppId,
      patientName: newAppointment.patientName,
      patientId: `P${String(Date.now()).slice(-6)}`,
      phone: newAppointment.phone,
      email: '',
      date: selectedDate,
      time: newAppointment.time,
      duration: parseInt(newAppointment.duration),
      status: 'confirmed',
      type: newAppointment.type,
      notes: newAppointment.notes,
      createdAt: new Date().toISOString().split('T')[0],
      token: `T${String(Date.now()).slice(-3)}`
    };
    await firebaseDbService.upsert('appointments', newAppId, { ...newApp, doctorId: doctor?.id || currentUser?.id });
    setNewAppointment({
      patientName: '',
      phone: '',
      time: '09:00',
      duration: '15',
      type: 'consultation',
      notes: ''
    });
    setShowAddModal(false);

    recordHistory({
      action: 'appointment_added',
      module: 'appointments',
      message: `Added appointment for ${newApp.patientName} at ${newApp.time} on ${selectedDate}`,
      doctorId: String(doctor?.id || ''),
      hospitalId: String(doctor?.hospitalId || ''),
      appointmentId: String(newApp.id),
      meta: { patientName: newApp.patientName, time: newApp.time, date: selectedDate, type: newApp.type },
    });
    alert(`Appointment added for ${newAppointment.patientName} at ${newAppointment.time}`);
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;

    await firebaseDbService.upsert('appointments', selectedAppointment.id, {
      ...selectedAppointment,
      ...newAppointment,
      duration: parseInt(newAppointment.duration),
    });
    setShowEditModal(false);
    setSelectedAppointment(null);
    setNewAppointment({
      patientName: '',
      phone: '',
      time: '09:00',
      duration: '15',
      type: 'consultation',
      notes: ''
    });

    recordHistory({
      action: 'appointment_updated',
      module: 'appointments',
      message: `Updated appointment for ${newAppointment.patientName} at ${newAppointment.time}`,
      doctorId: String(doctor?.id || ''),
      hospitalId: String(doctor?.hospitalId || ''),
      appointmentId: String(selectedAppointment?.id || ''),
      meta: { patientName: newAppointment.patientName, time: newAppointment.time },
    });
    alert('Appointment updated successfully');
  };

  // Calculate available time slots
  const getAvailableSlots = () => {
    const bookedSlots = doctorAppointments
      .filter(app => app.date === selectedDate && app.status !== 'cancelled')
      .map(app => app.time);

    return timeSlots.filter(slot => !bookedSlots.includes(slot));
  };

  // Get today's date for display
  const getTodayDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  // Calculate appointment statistics
  const appointmentStats = {
    total: doctorAppointments.filter(app => app.date === selectedDate).length,
    confirmed: doctorAppointments.filter(app => app.date === selectedDate && app.status === 'confirmed').length,
    pending: doctorAppointments.filter(app => app.date === selectedDate && app.status === 'pending').length,
    cancelled: doctorAppointments.filter(app => app.date === selectedDate && app.status === 'cancelled').length
  };

  if (loading || authLoading || !doctor) {
    return (
      <div className="doctor-loading">
        <div className="loading-spinner"></div>
        <p>Loading appointments...</p>
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
            <h1>Appointment Schedule</h1>
            <p className="doctor-specialization">
              <FontAwesomeIcon icon={faCalendar} /> Manage your appointments
            </p>
          </div>
        </div>
        
        <div className="doctor-header-right">
          <button 
            className="doctor-btn doctor-btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            <FontAwesomeIcon icon={faCalendarPlus} /> Add Appointment
          </button>
        </div>
      </header>

      {/* Stats */}
      <div className="doctor-stats-grid">
        <div className="stat-card blue">
          <FontAwesomeIcon icon={faCalendar} className="stat-icon" />
          <div className="stat-value">{appointmentStats.total}</div>
          <div className="stat-label">Total Today</div>
        </div>
        
        <div className="stat-card green">
          <FontAwesomeIcon icon={faCalendarCheck} className="stat-icon" />
          <div className="stat-value">{appointmentStats.confirmed}</div>
          <div className="stat-label">Confirmed</div>
        </div>
        
        <div className="stat-card orange">
          <FontAwesomeIcon icon={faHourglassHalf} className="stat-icon" />
          <div className="stat-value">{appointmentStats.pending}</div>
          <div className="stat-label">Pending</div>
        </div>
        
        <div className="stat-card red">
          <FontAwesomeIcon icon={faCalendarTimes} className="stat-icon" />
          <div className="stat-value">{appointmentStats.cancelled}</div>
          <div className="stat-label">Cancelled</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="doctor-main-content">
        {/* Left Column - Controls & Filters */}
        <div className="doctor-left-column">
          {/* Date Selection */}
          <div className="doctor-card">
            <h3>
              <FontAwesomeIcon icon={faCalendar} />
              Select Date
            </h3>
            <div className="date-selector">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="date-input"
              />
              <div className="current-date">
                <FontAwesomeIcon icon={faClock} />
                {getTodayDate()}
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="doctor-card">
            <h3>
              <FontAwesomeIcon icon={faFilter} />
              Filter Appointments
            </h3>
            <div className="filters-container">
              <div className="search-box">
                <FontAwesomeIcon icon={faSearch} />
                <input
                  type="text"
                  placeholder="Search by patient name, phone, token..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input"
                />
              </div>
              
              <div className="status-filter">
                <label>Status:</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">All Status</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="pending">Pending</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div className="available-slots">
                <h4>
                  <FontAwesomeIcon icon={faClock} />
                  Available Time Slots
                </h4>
                <div className="slots-grid">
                  {getAvailableSlots().slice(0, 8).map(slot => (
                    <span key={slot} className="slot-badge">
                      {slot}
                    </span>
                  ))}
                  {getAvailableSlots().length > 8 && (
                    <span className="slot-more">
                      +{getAvailableSlots().length - 8} more
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="doctor-card">
            <h3>
              <FontAwesomeIcon icon={faBell} />
              Quick Actions
            </h3>
            <div className="doctor-action-buttons">
              <button 
                onClick={() => navigate('/doctor/queue')}
                className="doctor-action-btn"
              >
                <FontAwesomeIcon icon={faUserInjured} /> Go to Queue
              </button>
              <button 
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="doctor-action-btn"
              >
                <FontAwesomeIcon icon={faCalendar} /> Today's Schedule
              </button>
              <button 
                onClick={() => window.print()}
                className="doctor-action-btn"
              >
                <FontAwesomeIcon icon={faFileMedical} /> Print Schedule
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Appointments List */}
        <div className="doctor-right-column">
          {/* Appointments Header */}
          <div className="doctor-card">
            <div className="appointments-header">
              <h3>
                <FontAwesomeIcon icon={faCalendarCheck} />
                Appointments for {new Date(selectedDate).toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'short',
                  day: 'numeric'
                })}
              </h3>
              <div className="appointment-count">
                {filteredAppointments.length} appointments
              </div>
            </div>
          </div>

          {/* Appointments Timeline */}
          <div className="doctor-card">
            {filteredAppointments.length === 0 ? (
              <div className="empty-appointments">
                <FontAwesomeIcon icon={faCalendar} size="3x" />
                <h3>No Appointments</h3>
                <p>No appointments scheduled for this date</p>
                <button 
                  onClick={() => setShowAddModal(true)}
                  className="doctor-btn doctor-btn-primary"
                >
                  <FontAwesomeIcon icon={faCalendarPlus} /> Add First Appointment
                </button>
              </div>
            ) : (
              <div className="appointments-timeline">
                {Object.keys(timeGroups).sort().map(time => (
                  <div key={time} className="time-slot-group">
                    <div className="time-slot-header">
                      <div className="time-slot-time">
                        <FontAwesomeIcon icon={faClock} />
                        {time}
                      </div>
                      <div className="time-slot-count">
                        {timeGroups[time].length} appointment{timeGroups[time].length !== 1 ? 's' : ''}
                      </div>
                    </div>
                    
                    <div className="time-slot-appointments">
                      {timeGroups[time].map(appointment => {
                        const statusInfo = getStatusInfo(appointment.status);
                        
                        return (
                          <div key={appointment.id} className="appointment-card">
                            <div className="appointment-header">
                              <div className="appointment-patient">
                                <div className="patient-name">
                                  <FontAwesomeIcon icon={faUserInjured} />
                                  {appointment.patientName}
                                </div>
                                <div className="patient-contact">
                                  <FontAwesomeIcon icon={faPhone} /> {appointment.phone}
                                </div>
                              </div>
                              <div className="appointment-meta">
                                <span className="appointment-token">
                                  Token: {appointment.token}
                                </span>
                                <span 
                                  className="appointment-status"
                                  style={{ color: statusInfo.color }}
                                >
                                  <FontAwesomeIcon icon={statusInfo.icon} />
                                  {statusInfo.label}
                                </span>
                              </div>
                            </div>
                            
                            <div className="appointment-details">
                              <div className="appointment-type">
                                <span 
                                  className="type-badge"
                                  style={{ background: getTypeColor(appointment.type) }}
                                >
                                  {appointment.type}
                                </span>
                                <span className="duration">
                                  {appointment.duration} mins
                                </span>
                              </div>
                              
                              {appointment.notes && (
                                <div className="appointment-notes">
                                  <FontAwesomeIcon icon={faFileMedical} />
                                  {appointment.notes}
                                </div>
                              )}
                            </div>
                            
                            <div className="appointment-actions">
                              {appointment.status === 'pending' && (
                                <button
                                  onClick={() => handleConfirmAppointment(appointment.id)}
                                  className="action-btn confirm-btn"
                                >
                                  <FontAwesomeIcon icon={faCheckCircle} /> Confirm
                                </button>
                              )}
                              
                              {appointment.status !== 'cancelled' && (
                                <>
                                  <button
                                    onClick={() => handleEditAppointment(appointment)}
                                    className="action-btn edit-btn"
                                  >
                                    <FontAwesomeIcon icon={faEdit} /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleCancelAppointment(appointment.id)}
                                    className="action-btn cancel-btn"
                                  >
                                    <FontAwesomeIcon icon={faTimesCircle} /> Cancel
                                  </button>
                                </>
                              )}
                              
                              <button
                                onClick={() => handleDeleteAppointment(appointment.id)}
                                className="action-btn delete-btn"
                              >
                                <FontAwesomeIcon icon={faTrash} /> Delete
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Appointment Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                <FontAwesomeIcon icon={faCalendarPlus} />
                Add New Appointment
              </h3>
              <button onClick={() => setShowAddModal(false)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Patient Name *</label>
                <input
                  type="text"
                  value={newAppointment.patientName}
                  onChange={(e) => setNewAppointment({...newAppointment, patientName: e.target.value})}
                  placeholder="Enter patient full name"
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={newAppointment.phone}
                  onChange={(e) => setNewAppointment({...newAppointment, phone: e.target.value})}
                  placeholder="Enter contact phone"
                  className="form-input"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Time *</label>
                  <select
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                    className="form-input"
                  >
                    {getAvailableSlots().map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Duration (mins) *</label>
                  <select
                    value={newAppointment.duration}
                    onChange={(e) => setNewAppointment({...newAppointment, duration: e.target.value})}
                    className="form-input"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Appointment Type</label>
                <select
                  value={newAppointment.type}
                  onChange={(e) => setNewAppointment({...newAppointment, type: e.target.value})}
                  className="form-input"
                >
                  <option value="consultation">Consultation</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="emergency">Emergency</option>
                  <option value="checkup">Checkup</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Notes (Optional)</label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                  placeholder="Additional notes..."
                  className="form-textarea"
                  rows="3"
                />
              </div>
              
              <div className="appointment-summary">
                <h4>Appointment Summary</h4>
                <div className="summary-details">
                  <p><strong>Date:</strong> {new Date(selectedDate).toLocaleDateString()}</p>
                  <p><strong>Time:</strong> {newAppointment.time}</p>
                  <p><strong>Duration:</strong> {newAppointment.duration} minutes</p>
                  <p><strong>Type:</strong> {newAppointment.type}</p>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="doctor-btn doctor-btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleAddAppointment}
                  className="doctor-btn doctor-btn-primary"
                >
                  <FontAwesomeIcon icon={faCalendarPlus} /> Add Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Appointment Modal */}
      {showEditModal && selectedAppointment && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                <FontAwesomeIcon icon={faEdit} />
                Edit Appointment
              </h3>
              <button onClick={() => setShowEditModal(false)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Patient Name</label>
                <input
                  type="text"
                  value={newAppointment.patientName}
                  onChange={(e) => setNewAppointment({...newAppointment, patientName: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={newAppointment.phone}
                  onChange={(e) => setNewAppointment({...newAppointment, phone: e.target.value})}
                  className="form-input"
                />
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Time</label>
                  <select
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({...newAppointment, time: e.target.value})}
                    className="form-input"
                  >
                    {timeSlots.map(slot => (
                      <option key={slot} value={slot}>{slot}</option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Duration (mins)</label>
                  <select
                    value={newAppointment.duration}
                    onChange={(e) => setNewAppointment({...newAppointment, duration: e.target.value})}
                    className="form-input"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">60 minutes</option>
                  </select>
                </div>
              </div>
              
              <div className="form-group">
                <label>Appointment Type</label>
                <select
                  value={newAppointment.type}
                  onChange={(e) => setNewAppointment({...newAppointment, type: e.target.value})}
                  className="form-input"
                >
                  <option value="consultation">Consultation</option>
                  <option value="follow-up">Follow-up</option>
                  <option value="emergency">Emergency</option>
                  <option value="checkup">Checkup</option>
                </select>
              </div>
              
              <div className="form-group">
                <label>Notes</label>
                <textarea
                  value={newAppointment.notes}
                  onChange={(e) => setNewAppointment({...newAppointment, notes: e.target.value})}
                  className="form-textarea"
                  rows="3"
                />
              </div>
              
              <div className="modal-actions">
                <button 
                  onClick={() => setShowEditModal(false)}
                  className="doctor-btn doctor-btn-secondary"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleUpdateAppointment}
                  className="doctor-btn doctor-btn-primary"
                >
                  <FontAwesomeIcon icon={faCheckCircle} /> Update Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;