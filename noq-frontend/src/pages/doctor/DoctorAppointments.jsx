import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import doctorService from '../../services/doctorService';
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
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

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

  // Load appointments
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser || currentUser.role !== 'doctor') {
      navigate('/login', { replace: true });
      return;
    }

    const loadAppointments = async () => {
      try {
        setLoading(true);
        const data = await doctorService.getDoctorAppointments(currentUser.id);
        setAppointments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Error loading appointments:', error);
        setAppointments([]);
      } finally {
        setLoading(false);
      }
    };

    loadAppointments();
  }, [authLoading, currentUser, navigate]);

  // Time slots (9 AM to 9 PM, 15 min intervals)
  const timeSlots = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2) + 9;
    const minute = (i % 2) * 30;
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  });

  // Filter appointments
  const filteredAppointments = appointments.filter(app => {
    const appDate = app.appointment_date || app.date || new Date().toISOString().split('T')[0];
    const appStatus = app.status || 'scheduled';
    const patientNameStr = app.patientName || app.patient_name || app.patient_id || '';
    const phoneStr = app.phone || app.patientPhone || '';
    const tokenObj = app.token_number || app.token || '';
    const tokenStr = (typeof tokenObj === 'object' ? tokenObj?.tokenNumber : tokenObj) || '';

    const matchesDate = appDate.startsWith(selectedDate);
    const matchesStatus = selectedStatus === 'all' || appStatus === selectedStatus;
    const matchesSearch = patientNameStr.toLowerCase().includes(searchTerm.toLowerCase()) ||
      phoneStr.includes(searchTerm) ||
      tokenStr.toLowerCase().includes(searchTerm.toLowerCase());
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
    switch (status) {
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
    switch (type) {
      case 'consultation': return '#3b82f6';
      case 'follow-up': return '#8b5cf6';
      case 'emergency': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getAppointmentById = (appointmentId) =>
    appointments.find((app) => String(app.id) === String(appointmentId));

  // Handle appointment actions
  const handleConfirmAppointment = async (appointmentId) => {
    try {
      await doctorService.updateAppointmentStatus(appointmentId, 'confirmed');
      const app = getAppointmentById(appointmentId);
      recordHistory({
        action: 'appointment_confirmed',
        module: 'appointments',
        message: `Confirmed appointment for ${app?.patient_name || 'patient'} at ${app?.time || ''}`,
        doctorId: String(currentUser?.id || ''),
        hospitalId: String(currentUser?.hospital_id || ''),
        appointmentId: String(appointmentId),
        meta: { patientName: app?.patient_name, time: app?.time, date: app?.date },
      });
      // Update local state
      setAppointments(prev => prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'confirmed' } : apt));
      alert('Appointment confirmed successfully');
    } catch (error) {
      console.error('Error confirming appointment:', error);
      alert('Failed to confirm appointment');
    }
  };

  const handleCancelAppointment = async (appointmentId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        await doctorService.updateAppointmentStatus(appointmentId, 'cancelled');
        const app = getAppointmentById(appointmentId);
        recordHistory({
          action: 'appointment_cancelled',
          module: 'appointments',
          message: `Cancelled appointment for ${app?.patient_name || 'patient'} at ${app?.time || ''}`,
          doctorId: String(currentUser?.id || ''),
          hospitalId: String(currentUser?.hospital_id || ''),
          appointmentId: String(appointmentId),
          meta: { patientName: app?.patient_name, time: app?.time, date: app?.date },
        });
        // Update local state
        setAppointments(prev => prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt));
        alert('Appointment cancelled');
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('Failed to cancel appointment');
      }
    }
  };

  const handleCompleteAppointment = async (appointmentId) => {
    try {
      await doctorService.updateAppointmentStatus(appointmentId, 'completed');
      setAppointments(prev => prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'completed' } : apt));
      alert('Appointment marked as completed');
    } catch (error) {
      console.error('Error completing appointment:', error);
      alert('Failed to complete appointment');
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
      try {
        const app = getAppointmentById(appointmentId);
        // Call API to delete if backend is ready
        setAppointments(prev => prev.filter(apt => apt.id !== appointmentId));
        recordHistory({
          action: 'appointment_deleted',
          module: 'appointments',
          message: `Deleted appointment for ${app?.patient_name || 'patient'} on ${app?.date || ''}`,
          doctorId: String(currentUser?.id || ''),
          hospitalId: String(currentUser?.hospital_id || ''),
          appointmentId: String(appointmentId),
          meta: { patientName: app?.patient_name, date: app?.date },
        });
        alert('Appointment deleted');
      } catch (error) {
        console.error('Error deleting appointment:', error);
      }
    }
  };

  const handleAddAppointment = async () => {
    if (!newAppointment.patientName.trim() || !newAppointment.phone.trim()) {
      alert('Please enter patient name and phone number');
      return;
    }

    try {
      const newApp = {
        patient_name: newAppointment.patientName,
        phone: newAppointment.phone,
        date: selectedDate,
        time: newAppointment.time,
        duration: parseInt(newAppointment.duration),
        status: 'confirmed',
        type: newAppointment.type,
        notes: newAppointment.notes,
        doctor_id: currentUser.id
      };

      // Add to local state
      const appointmentWithId = { ...newApp, id: `apt_${Date.now()}` };
      setAppointments(prev => [...prev, appointmentWithId]);

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
        message: `Added appointment for ${newApp.patient_name} at ${newApp.time} on ${selectedDate}`,
        doctorId: String(currentUser?.id || ''),
        hospitalId: String(currentUser?.hospital_id || ''),
        appointmentId: String(appointmentWithId.id),
        meta: { patientName: newApp.patient_name, time: newApp.time, date: selectedDate, type: newApp.type },
      });
      alert(`Appointment added for ${newAppointment.patientName} at ${newAppointment.time}`);
    } catch (error) {
      console.error('Error adding appointment:', error);
      alert('Failed to add appointment');
    }
  };

  const handleUpdateAppointment = async () => {
    if (!selectedAppointment) return;

    try {
      const updated = {
        ...selectedAppointment,
        ...newAppointment,
        duration: parseInt(newAppointment.duration),
      };
      setAppointments(prev => prev.map(apt => apt.id === selectedAppointment.id ? updated : apt));
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
        doctorId: String(currentUser?.id || ''),
        hospitalId: String(currentUser?.hospital_id || ''),
        appointmentId: String(selectedAppointment?.id || ''),
        meta: { patientName: newAppointment.patientName, time: newAppointment.time },
      });
      alert('Appointment updated successfully');
    } catch (error) {
      console.error('Error updating appointment:', error);
      alert('Failed to update appointment');
    }
  };

  // Calculate available time slots
  const getAvailableSlots = () => {
    const bookedSlots = appointments
      .filter(app => app.date === selectedDate && app.status !== 'cancelled')
      .map(app => app.time || app.appointment_time);

    return timeSlots.filter(slot => !bookedSlots.includes(slot));
  };

  // Get today's date for display
  const getTodayDate = () => {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date().toLocaleDateString('en-US', options);
  };

  // Calculate appointment statistics
  const appointmentStats = {
    total: appointments.filter(app => (app.appointment_date || app.date || '').startsWith(selectedDate)).length,
    confirmed: appointments.filter(app => (app.appointment_date || app.date || '').startsWith(selectedDate) && app.status === 'confirmed').length,
    pending: appointments.filter(app => (app.appointment_date || app.date || '').startsWith(selectedDate) && app.status === 'pending').length,
    cancelled: appointments.filter(app => (app.appointment_date || app.date || '').startsWith(selectedDate) && app.status === 'cancelled').length
  };

  if (loading || authLoading || !currentUser) {
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
                      {timeGroups[time].map(app => {
                        const statusInfo = getStatusInfo(app.status);
                        
                        return (
                          <div key={app.id} className="appointment-card">
                            <div className="appointment-header">
                              <div className="appointment-patient">
                                <div className="patient-name">
                                  <FontAwesomeIcon icon={faUserInjured} />
                                  {app.patientName || app.patient_name || 'Patient'}
                                </div>
                                <div className="patient-contact">
                                  <FontAwesomeIcon icon={faPhone} /> {app.phone || 'N/A'}
                                </div>
                              </div>
                              <div className="appointment-meta">
                                <span className="appointment-token">
                                  Token: {(typeof app.token === 'object' ? app.token?.tokenNumber : app.token) || app.token_number || 'N/A'}
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
                                  style={{ background: getTypeColor(app.type) }}
                                >
                                  {app.type}
                                </span>
                                <span className="duration">
                                  {app.duration} mins
                                </span>
                              </div>

                              {app.notes && (
                                <div className="appointment-notes">
                                  <FontAwesomeIcon icon={faFileMedical} />
                                  {app.notes}
                                </div>
                              )}
                            </div>

                            <div className="appointment-actions">
                              {app.status === 'pending' && (
                                <button
                                  onClick={() => handleConfirmAppointment(app.id)}
                                  className="action-btn confirm-btn"
                                >
                                  <FontAwesomeIcon icon={faCheckCircle} /> Confirm
                                </button>
                              )}

                              {app.status !== 'cancelled' && (
                                <>
                                  <button
                                    onClick={() => handleEditAppointment(app)}
                                    className="action-btn edit-btn"
                                  >
                                    <FontAwesomeIcon icon={faEdit} /> Edit
                                  </button>
                                  <button
                                    onClick={() => handleCancelAppointment(app.id)}
                                    className="action-btn cancel-btn"
                                  >
                                    <FontAwesomeIcon icon={faTimesCircle} /> Cancel
                                  </button>
                                  {app.status !== 'completed' && (
                                    <button
                                      onClick={() => handleCompleteAppointment(app.id)}
                                      className="action-btn confirm-btn"
                                    >
                                      <FontAwesomeIcon icon={faCheckCircle} /> Complete
                                    </button>
                                  )}
                                </>
                              )}

                              <button
                                onClick={() => handleDeleteAppointment(app.id)}
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
                  onChange={(e) => setNewAppointment({ ...newAppointment, patientName: e.target.value })}
                  placeholder="Enter patient full name"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Phone Number *</label>
                <input
                  type="tel"
                  value={newAppointment.phone}
                  onChange={(e) => setNewAppointment({ ...newAppointment, phone: e.target.value })}
                  placeholder="Enter contact phone"
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Time *</label>
                  <select
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
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
                    onChange={(e) => setNewAppointment({ ...newAppointment, duration: e.target.value })}
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
                  onChange={(e) => setNewAppointment({ ...newAppointment, type: e.target.value })}
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
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
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
                  onChange={(e) => setNewAppointment({ ...newAppointment, patientName: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Phone Number</label>
                <input
                  type="tel"
                  value={newAppointment.phone}
                  onChange={(e) => setNewAppointment({ ...newAppointment, phone: e.target.value })}
                  className="form-input"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Time</label>
                  <select
                    value={newAppointment.time}
                    onChange={(e) => setNewAppointment({ ...newAppointment, time: e.target.value })}
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
                    onChange={(e) => setNewAppointment({ ...newAppointment, duration: e.target.value })}
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
                  onChange={(e) => setNewAppointment({ ...newAppointment, type: e.target.value })}
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
                  onChange={(e) => setNewAppointment({ ...newAppointment, notes: e.target.value })}
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