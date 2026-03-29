import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faCheckCircle,
  faClock,
  faCalendarCheck,
  faBan,
  faExclamationTriangle,
  faCalendarDays,
  faCalendarPlus,
  faSignOutAlt,
  faHistory,
  faMoneyBill,
  faCalendarAlt,
  faStethoscope,
  faHospital,
  faMapMarkerAlt,
  faFileMedical,
  faPhone,
  faEnvelope,
  faBell,
  faTriangleExclamation,
  faStar,
  faPlusCircle,
  faCheck,
  faSpinner,
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import reviewService from '../../services/reviewService';

// Helper function to calculate age from date of birth
const calculateAge = (dob) => {
  if (!dob) return 'N/A';
  const birthDate = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

const normalizeStatus = (value) => String(value || 'pending').toLowerCase();
const formatStatusLabel = (value) => {
  const status = normalizeStatus(value);
  return status.charAt(0).toUpperCase() + status.slice(1);
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading, logout } = useAuth();
  
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [bills, setBills] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [showBlockInfo, setShowBlockInfo] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ doctorRating: 5, hospitalRating: 5, comment: '' });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Load patient data from API
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser || currentUser.role !== 'patient') {
      navigate('/login', { replace: true });
      return;
    }

    const loadPatientData = async () => {
      try {
        setLoading(true);
        const results = await Promise.allSettled([
          patientService.getMyProfile(),
          patientService.getMyAppointments(),
          patientService.getBillingHistory()
        ]);

        const patientData = results[0]?.status === 'fulfilled' ? results[0].value : null;
        const appointmentsData = results[1]?.status === 'fulfilled' ? results[1].value : [];
        const billsData = results[2]?.status === 'fulfilled' ? results[2].value : [];

        // Normalize patient data
        const normalizedPatient = patientData ? {
          ...patientData,
          name: patientData.full_name || patientData.name || 'Patient',
          status: patientData.status || 'active'
        } : {
          ...currentUser,
          name: currentUser.full_name || currentUser.name || 'Patient',
          status: currentUser.status || 'active'
        };

        setPatient(normalizedPatient);
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
        setBills(Array.isArray(billsData) ? billsData : []);

        // Load reviews for current patient
        try {
          const reviews = await reviewService.getPublicReviews({ patientId: normalizedPatient.id });
          setUserReviews(Array.isArray(reviews) ? reviews : []);
        } catch (err) {
          console.error('Error loading reviews:', err);
          setUserReviews([]);
        }
      } catch (error) {
        console.error('Error loading patient data:', error);
        // Fallback to currentUser data
        setPatient({
          ...currentUser,
          name: currentUser.full_name || currentUser.name || 'Patient',
          status: currentUser.status || 'active'
        });
        setAppointments([]);
        setBills([]);
      } finally {
        setLoading(false);
      }
    };

    loadPatientData();
  }, [authLoading, currentUser, navigate]);

  // Filter appointments for current patient
  const patientAppointments = useMemo(() => {
    return (appointments || []).filter(
      (apt) =>
        String(apt.patient_id || '') === String(patient?.id || '') ||
        String(apt.patientEmail || '').toLowerCase() === String(patient?.email || '').toLowerCase()
    );
  }, [appointments, patient]);

  // Completed appointments awaiting review
  const completedAwaitingReview = useMemo(() => {
    const reviewedIds = new Set((userReviews || []).map(r => String(r.appointmentId || '')));
    return patientAppointments.filter(
      (apt) => {
        const status = String(apt.status || '').toLowerCase();
        const isCompleted = ['completed', 'visited', 'done', 'closed'].includes(status);
        const notReviewed = !reviewedIds.has(String(apt.id || ''));
        return isCompleted && notReviewed;
      }
    ).sort((a, b) => new Date(b.appointmentDate || b.date) - new Date(a.appointmentDate || a.date));
  }, [patientAppointments, userReviews]);

  // Patient's bills
  const patientBills = useMemo(() => {
    return (bills || []).filter(
      (bill) =>
        String(bill.patientId || '') === String(patient?.id || '') ||
        String(bill.patientEmail || '').toLowerCase() === String(patient?.email || '').toLowerCase()
    );
  }, [bills, patient]);

  // Calculate pending bills
  const pendingBills = useMemo(() => {
    return patientBills.filter(
      (bill) => String(bill.status || '').toLowerCase() === 'pending'
    );
  }, [patientBills]);

  const totalPendingAmount = useMemo(() => {
    return pendingBills.reduce((sum, bill) => sum + (Number(bill.amount) || 0), 0);
  }, [pendingBills]);

  // Split appointments into upcoming and past
  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    if (!patientAppointments.length) {
      return { upcomingAppointments: [], pastAppointments: [] };
    }

    const now = new Date();
    const upcoming = patientAppointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointmentDate || apt.date);
        return !Number.isNaN(aptDate.getTime()) && aptDate >= now;
      })
      .sort((a, b) => new Date(a.appointmentDate || a.date) - new Date(b.appointmentDate || b.date));

    const past = patientAppointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointmentDate || apt.date);
        return Number.isNaN(aptDate.getTime()) || aptDate < now;
      })
      .sort((a, b) => new Date(b.appointmentDate || b.date) - new Date(a.appointmentDate || a.date));

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [patientAppointments]);

  // Verify patient is authenticated
  useEffect(() => {
    if (!authLoading && (!currentUser || String(currentUser?.role || '').toLowerCase() !== 'patient')) {
      navigate('/login', { replace: true });
    }
  }, [currentUser, authLoading, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'confirmed': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'completed': return '#3b82f6';
      case 'cancelled': return '#6b7280';
      case 'missed': return '#ef4444';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'confirmed': return faCheckCircle;
      case 'pending': return faClock;
      case 'completed': return faCalendarCheck;
      case 'cancelled': return faBan;
      case 'missed': return faExclamationTriangle;
      default: return faCalendarDays;
    }
  };

  const getBlockStatus = () => {
    if (!patient) return { blockLevel: 0, fines: 0, warnings: [], status: 'active', isBlocked: false };
    
    const blockLevel = patient.blockLevel || 0;
    const fines = patient.fines || 0;
    const warnings = patient.warnings || [];
    const status = patient.status || 'active';

    return {
      blockLevel,
      fines,
      warnings,
      status,
      isBlocked: status === 'blocked'
    };
  };

  const handleBookAppointment = () => {
    const blockStatus = getBlockStatus();
    
    if (blockStatus.isBlocked) {
      alert('You are currently blocked from booking appointments. Please contact your doctor.');
      return;
    }
    
    if (blockStatus.blockLevel === 2) {
      if (!window.confirm(`You have ₹${blockStatus.fines} in pending fines. You must pay before booking a new appointment. Proceed to payment?`)) {
        return;
      }
    }
    
    navigate('/patient/book-appointment');
  };

  const openReviewModal = (appointment) => {
    const existing = userReviews.find(
      (item) =>
        item.appointmentId === appointment.id &&
        item.patientId === patient?.id
    );

    setReviewTarget(appointment);
    setReviewForm({
      doctorRating: Number(existing?.doctorRating || existing?.rating || 5),
      hospitalRating: Number(existing?.hospitalRating || existing?.rating || 5),
      comment: String(existing?.comment || ''),
    });
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!currentUser || !reviewTarget || !patient) return;

    const comment = String(reviewForm.comment || '').trim();
    if (comment.length < 5) {
      alert('Please add a review comment with at least 5 characters.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const newReview = {
        appointmentId: reviewTarget.id,
        patientId: patient.id,
        patient: currentUser.name || reviewTarget.patientName || 'Patient',
        doctorId: reviewTarget.doctorId || '',
        doctor: reviewTarget.doctorName || 'Doctor',
        hospitalId: reviewTarget.hospitalId || '',
        hospital: reviewTarget.hospitalName || 'Hospital',
        doctorRating: Number(reviewForm.doctorRating || 5),
        hospitalRating: Number(reviewForm.hospitalRating || 5),
        rating: Number(((Number(reviewForm.doctorRating || 5) + Number(reviewForm.hospitalRating || 5)) / 2).toFixed(1)),
        comment,
        date: new Date().toISOString(),
        status: 'published',
        visibility: 'public',
      };

      await reviewService.upsertReview(newReview);
      const nextReviews = await reviewService.getPublicReviews({ patientId: String(patient.id || '') });
      setUserReviews(nextReviews);
      
      setShowReviewModal(false);
      setReviewTarget(null);
      setReviewForm({ doctorRating: 5, hospitalRating: 5, comment: '' });
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(error?.message || 'Unable to submit review right now.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewTarget(null);
    setReviewForm({ doctorRating: 5, hospitalRating: 5, comment: '' });
  };

  // handleLogout moved to main component logic at top

  const viewAppointmentDetails = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const cancelAppointment = async (appointmentId) => {
    if (window.confirm('Are you sure you want to cancel this appointment?')) {
      try {
        // Update appointment status to cancelled in API
        await apiDbService.upsert('appointments', appointmentId, { 
          ...appointments.find(a => a.id === appointmentId),
          status: 'cancelled'
        });
        alert('Appointment cancelled successfully.');
      } catch (error) {
        console.error('Error cancelling appointment:', error);
        alert('Failed to cancel appointment.');
      }
    }
  };

  if (loading || authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your dashboard...</p>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading patient profile...</p>
      </div>
    );
  }

  const blockStatus = getBlockStatus();
  const currentAppointments = activeTab === 'upcoming' ? upcomingAppointments : pastAppointments;

  return (
    <div className="patient-portal">
      <header className="patient-header">
        <div className="patient-header-left">
          <div className="patient-greeting">
            <h1>
              <FontAwesomeIcon icon={faUser} />
              Welcome, {patient.name || 'Patient'}
            </h1>
            <p className="patient-id">Patient ID: {patient.id || 'N/A'}</p>
          </div>
        </div>
        <div className="patient-header-right">
          <button 
            className="patient-btn patient-btn-primary"
            onClick={handleBookAppointment}
            disabled={blockStatus.isBlocked}
          >
            <FontAwesomeIcon icon={faCalendarPlus} />
            Book Appointment
          </button>
          <button 
            className="patient-btn patient-btn-secondary"
            onClick={handleLogout}
          >
            <FontAwesomeIcon icon={faSignOutAlt} />
            Logout
          </button>
        </div>
      </header>

      <div className="patient-stats-grid">
        <div className="patient-stat-card green">
          <FontAwesomeIcon icon={faCalendarCheck} className="stat-icon" />
          <div className="stat-value">{upcomingAppointments.length}</div>
          <div className="stat-label">Upcoming</div>
        </div>
        
        <div className="patient-stat-card blue">
          <FontAwesomeIcon icon={faHistory} className="stat-icon" />
          <div className="stat-value">{pastAppointments.length}</div>
          <div className="stat-label">Past Visits</div>
        </div>

        <div className="patient-stat-card purple">
          <FontAwesomeIcon icon={faStar} className="stat-icon" />
          <div className="stat-value">{completedAwaitingReview.length}</div>
          <div className="stat-label">Pending Reviews</div>
        </div>

        <div className="patient-stat-card orange">
          <FontAwesomeIcon icon={faTriangleExclamation} className="stat-icon" />
          <div className="stat-value">{blockStatus.blockLevel}/3</div>
          <div className="stat-label">Block Level</div>
        </div>
        
        <div className="patient-stat-card red">
          <FontAwesomeIcon icon={faMoneyBill} className="stat-icon" />
          <div className="stat-value">₹{blockStatus.fines}</div>
          <div className="stat-label">Pending Fines</div>
        </div>

        <div className="patient-stat-card teal">
          <FontAwesomeIcon icon={faMoneyBill} className="stat-icon" />
          <div className="stat-value">₹{totalPendingAmount}</div>
          <div className="stat-label">Pending Bills</div>
        </div>
      </div>

      <div className="patient-main-content">
        <div className="patient-left-column">
          <div className="patient-card">
            <div className="patient-card-header">
              <h3>
                <FontAwesomeIcon icon={faCalendarAlt} />
                My Appointments
              </h3>
              <div className="tabs">
                <button 
                  className={`tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                  onClick={() => setActiveTab('upcoming')}
                >
                  Upcoming ({upcomingAppointments.length})
                </button>
                <button 
                  className={`tab ${activeTab === 'history' ? 'active' : ''}`}
                  onClick={() => setActiveTab('history')}
                >
                  History ({pastAppointments.length})
                </button>
              </div>
            </div>

            {currentAppointments.length === 0 ? (
              <div className="empty-appointments">
                <FontAwesomeIcon icon={faCalendarDays} size="3x" />
                <p>No {activeTab === 'upcoming' ? 'upcoming' : 'past'} appointments</p>
                {activeTab === 'upcoming' && !blockStatus.isBlocked && (
                  <button 
                    className="patient-btn patient-btn-primary"
                    onClick={handleBookAppointment}
                  >
                    Book Your First Appointment
                  </button>
                )}
              </div>
            ) : (
              <div className="appointments-list">
                {currentAppointments.map(appointment => (
                  <div key={appointment.id} className="appointment-item">
                    <div className="appointment-item-left">
                      <div className="appointment-date">
                        <div className="date-day">{new Date(appointment.date || appointment.appointmentDate || Date.now()).getDate()}</div>
                        <div className="date-month">{new Date(appointment.date || appointment.appointmentDate || Date.now()).toLocaleString('default', { month: 'short' })}</div>
                      </div>
                      <div className="appointment-info">
                        <div className="appointment-header">
                          <h4 className="doctor-name">{appointment.doctorName}</h4>
                          <span 
                            className="appointment-status"
                            style={{ color: getStatusColor(normalizeStatus(appointment.status)) }}
                          >
                            <FontAwesomeIcon icon={getStatusIcon(normalizeStatus(appointment.status))} />
                            {formatStatusLabel(appointment.status)}
                          </span>
                        </div>
                        <p className="doctor-specialty">
                          <FontAwesomeIcon icon={faStethoscope} /> {appointment.doctorSpecialty || appointment.doctorSpecialization || 'General Consultation'}
                        </p>
                        <div className="appointment-details">
                          <span className="appointment-time">
                            <FontAwesomeIcon icon={faClock} /> {appointment.time || appointment.appointmentTime || 'Time not set'}
                          </span>
                          <span className="appointment-hospital">
                            <FontAwesomeIcon icon={faHospital} /> {appointment.hospital || appointment.hospitalName || 'Hospital not set'}
                          </span>
                          <span className="appointment-location">
                            <FontAwesomeIcon icon={faMapMarkerAlt} /> {appointment.location || appointment.roomNumber || 'Location not set'}
                          </span>
                        </div>
                        <p className="appointment-reason">
                          <strong>Reason:</strong> {appointment.reason || appointment.diseaseName || appointment.specialization || 'Not specified'}
                        </p>
                      </div>
                    </div>
                    <div className="appointment-item-right">
                      <div className="appointment-actions">
                        <button 
                          onClick={() => viewAppointmentDetails(appointment)}
                          className="view-appointment-btn"
                          title="View Details"
                        >
                          <FontAwesomeIcon icon={faFileMedical} />
                        </button>
                        {activeTab === 'upcoming' && appointment.status === 'confirmed' && (
                          <button 
                            onClick={() => cancelAppointment(appointment.id)}
                            className="cancel-appointment-btn"
                            title="Cancel Appointment"
                          >
                            <FontAwesomeIcon icon={faBan} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Completed Treatments - Pending Reviews */}
          {completedAwaitingReview.length > 0 && (
            <div className="patient-card">
              <div className="patient-card-header">
                <h3>
                  <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981' }} />
                  Treatments Completed - Pending Reviews ({completedAwaitingReview.length})
                </h3>
              </div>
              <div className="appointments-list">
                {completedAwaitingReview.map(appointment => (
                  <div key={appointment.id} className="appointment-item" style={{ borderLeft: '4px solid #10b981' }}>
                    <div className="appointment-item-left">
                      <div className="appointment-date">
                        <div className="date-day">{new Date(appointment.date || appointment.appointmentDate || Date.now()).getDate()}</div>
                        <div className="date-month">{new Date(appointment.date || appointment.appointmentDate || Date.now()).toLocaleString('default', { month: 'short' })}</div>
                      </div>
                      <div className="appointment-info">
                        <div className="appointment-header">
                          <h4 className="doctor-name">{appointment.doctorName}</h4>
                          <span style={{ color: '#10b981', fontWeight: 'bold' }}>
                            <FontAwesomeIcon icon={faCheck} /> Completed
                          </span>
                        </div>
                        <p className="doctor-specialty">
                          <FontAwesomeIcon icon={faStethoscope} /> {appointment.doctorSpecialty || appointment.doctorSpecialization || 'General Consultation'}
                        </p>
                        <div className="appointment-details">
                          <span className="appointment-hospital">
                            <FontAwesomeIcon icon={faHospital} /> {appointment.hospital || appointment.hospitalName || 'Hospital not set'}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="appointment-item-right">
                      <button 
                        onClick={() => openReviewModal(appointment)}
                        className="patient-btn patient-btn-primary"
                        style={{ whiteSpace: 'nowrap' }}
                      >
                        <FontAwesomeIcon icon={faStar} /> Submit Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Your Bills Summary */}
          {patientBills.length > 0 && (
            <div className="patient-card">
              <div className="patient-card-header">
                <h3>
                  <FontAwesomeIcon icon={faMoneyBill} />
                  Your Bills
                </h3>
              </div>
              <div style={{ padding: '15px' }}>
                <div style={{ marginBottom: '15px', padding: '15px', backgroundColor: '#fef3c7', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    <strong>Pending Bills:</strong> {pendingBills.length}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '14px' }}>
                    <strong>Total Amount:</strong> ₹{totalPendingAmount}
                  </p>
                </div>
                
                {pendingBills.length > 0 && (
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>Recent Pending Bills:</h4>
                    {pendingBills.slice(0, 3).map(bill => (
                      <div key={bill.id} style={{ padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px', marginBottom: '8px', border: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <p style={{ margin: '2px 0', fontSize: '13px', fontWeight: 'bold' }}>
                              {bill.description || 'Bill #' + (bill.id || '').slice(0, 6)}
                            </p>
                            <p style={{ margin: '2px 0', fontSize: '12px', color: '#666' }}>
                              {new Date(bill.date || bill.createdAt || Date.now()).toLocaleDateString()}
                            </p>
                          </div>
                          <p style={{ margin: '0', fontSize: '14px', fontWeight: 'bold', color: '#ea580c' }}>
                            ₹{Number(bill.amount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <button 
                      onClick={() => navigate('/patient/billing')}
                      className="patient-btn patient-btn-secondary"
                      style={{ width: '100%', marginTop: '10px' }}
                    >
                      View All Bills
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="patient-right-column">
        <div className="patient-card">
            <div className="patient-card-header">
              <h3>
                <FontAwesomeIcon icon={faUser} />
                Patient Profile
              </h3>
            </div>
            <div className="patient-profile-info">
              <div className="profile-section">
                <h4>Personal Information</h4>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Name</span>
                    <span className="info-value">{patient.name || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Age</span>
                    <span className="info-value">{patient.age || 'N/A'}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Gender</span>
                    <span className="info-value">{patient.gender || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <div className="profile-section">
                <h4>Contact Information</h4>
                <div className="contact-info">
                  <p>
                    <FontAwesomeIcon icon={faPhone} /> 
                    <strong>Phone:</strong> {patient.phone || 'Not provided'}
                  </p>
                  <p>
                    <FontAwesomeIcon icon={faEnvelope} /> 
                    <strong>Email:</strong> {patient.email}
                  </p>
                </div>
              </div>

              <div className="profile-section">
                <h4>Account Status</h4>
                <div className={`status-indicator ${normalizeStatus(blockStatus.status)}`}>
                  <FontAwesomeIcon icon={getStatusIcon(normalizeStatus(blockStatus.status))} />
                  <span>
                    Status: <strong>{normalizeStatus(blockStatus.status).toUpperCase()}</strong>
                  </span>
                </div>
                <div className="block-info">
                  <p>Block Level: <strong>{blockStatus.blockLevel}/3</strong></p>
                  <p>Pending Fines: <strong>₹{blockStatus.fines}</strong></p>
                  {blockStatus.warnings.length > 0 && (
                    <button 
                      className="view-warnings-btn"
                      onClick={() => setShowBlockInfo(!showBlockInfo)}
                    >
                      {showBlockInfo ? 'Hide Warnings' : 'View Warnings'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {blockStatus.warnings.length > 0 && showBlockInfo && (
            <div className="patient-card">
              <h3>
                <FontAwesomeIcon icon={faTriangleExclamation} />
                Warnings & Notices
              </h3>
              <div className="warnings-list">
                {blockStatus.warnings.map((warning, index) => (
                  <div key={index} className="warning-item">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span>{warning}</span>
                  </div>
                ))}
              </div>
              {blockStatus.fines > 0 && (
                <div className="payment-notice">
                  <FontAwesomeIcon icon={faMoneyBill} />
                  <p>Please pay ₹{blockStatus.fines} to continue booking appointments.</p>
                  <button className="patient-btn patient-btn-primary">
                    Pay Now
                  </button>
                </div>
              )}
            </div>
          )}

          <div className="patient-card">
            <h3>
              <FontAwesomeIcon icon={faBell} />
              Blocking System Rules
            </h3>
            <div className="rules-list">
              <div className="rule-item">
                <div className="rule-number">1</div>
                <div className="rule-content">
                  <h4>1st Missed Appointment</h4>
                  <p>You will receive a warning</p>
                </div>
              </div>
              <div className="rule-item">
                <div className="rule-number">2</div>
                <div className="rule-content">
                  <h4>2nd Missed Appointment</h4>
                  <p>You will be fined ₹200</p>
                </div>
              </div>
              <div className="rule-item">
                <div className="rule-number">3</div>
                <div className="rule-content">
                  <h4>3rd Missed Appointment</h4>
                  <p>You will be blocked from booking</p>
                </div>
              </div>
              <div className="rule-note">
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>Contact your doctor to unblock your account</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedAppointment && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>
                <FontAwesomeIcon icon={faFileMedical} />
                Appointment Details
              </h3>
              <button onClick={() => setSelectedAppointment(null)} className="modal-close">
                ×
              </button>
            </div>
            <div className="modal-body">
              <div className="appointment-details-modal">
                <div className="detail-section">
                  <h4>Doctor Information</h4>
                  <p><strong>Name:</strong> {selectedAppointment.doctorName}</p>
                  <p><strong>Specialty:</strong> {selectedAppointment.doctorSpecialty}</p>
                  <p><strong>Hospital:</strong> {selectedAppointment.hospital}</p>
                  <p><strong>Location:</strong> {selectedAppointment.location}</p>
                </div>
                
                <div className="detail-section">
                  <h4>Appointment Details</h4>
                  <p><strong>Date:</strong> {selectedAppointment.date}</p>
                  <p><strong>Time:</strong> {selectedAppointment.time}</p>
                  <p><strong>Status:</strong> 
                    <span style={{ color: getStatusColor(normalizeStatus(selectedAppointment.status)) }}>
                      {normalizeStatus(selectedAppointment.status).toUpperCase()}
                    </span>
                  </p>
                  <p><strong>Reason:</strong> {selectedAppointment.reason}</p>
                </div>
                
                {selectedAppointment.notes && (
                  <div className="detail-section">
                    <h4>Notes</h4>
                    <p>{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button 
                  onClick={() => setSelectedAppointment(null)}
                  className="patient-btn patient-btn-secondary"
                >
                  Close
                </button>
                {activeTab === 'upcoming' && selectedAppointment.status === 'confirmed' && (
                  <button 
                    onClick={() => {
                      cancelAppointment(selectedAppointment.id);
                      setSelectedAppointment(null);
                    }}
                    className="patient-btn patient-btn-danger"
                  >
                    Cancel Appointment
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && reviewTarget && (
        <div className="modal-overlay" onClick={closeReviewModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                <FontAwesomeIcon icon={faStar} />
                Submit Review for {reviewTarget.doctorName}
              </h3>
              <button onClick={closeReviewModal} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div style={{ padding: '15px' }}>
                <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f0f9ff', borderRadius: '8px', border: '1px solid #bfdbfe' }}>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}>
                    <strong>Hospital:</strong> {reviewTarget.hospitalName || 'N/A'}
                  </p>
                  <p style={{ margin: '5px 0', fontSize: '13px' }}>
                    <strong>Appointment Date:</strong> {new Date(reviewTarget.appointmentDate || reviewTarget.date || Date.now()).toLocaleDateString()}
                  </p>
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                    Doctor Rating: {reviewForm.doctorRating} / 5 
                    <FontAwesomeIcon icon={faStar} style={{ color: '#fbbf24', marginLeft: '5px' }} />
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={reviewForm.doctorRating}
                    onChange={(e) => setReviewForm({ ...reviewForm, doctorRating: Number(e.target.value) })}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                    Hospital Rating: {reviewForm.hospitalRating} / 5
                    <FontAwesomeIcon icon={faStar} style={{ color: '#fbbf24', marginLeft: '5px' }} />
                  </label>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={reviewForm.hospitalRating}
                    onChange={(e) => setReviewForm({ ...reviewForm, hospitalRating: Number(e.target.value) })}
                    style={{ width: '100%', cursor: 'pointer' }}
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '14px' }}>
                    Your Review (min. 5 characters):
                  </label>
                  <textarea 
                    placeholder="Share your experience with the treatment, doctor, and hospital..."
                    value={reviewForm.comment}
                    onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })}
                    style={{
                      width: '100%',
                      minHeight: '120px',
                      padding: '10px',
                      borderRadius: '6px',
                      border: '1px solid #d1d5db',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      resize: 'vertical'
                    }}
                  />
                  <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                    {reviewForm.comment.length} characters
                  </p>
                </div>
              </div>
              <div className="modal-actions">
                <button 
                  onClick={closeReviewModal}
                  className="patient-btn patient-btn-secondary"
                  disabled={reviewSubmitting}
                >
                  Cancel
                </button>
                <button 
                  onClick={submitReview}
                  className="patient-btn patient-btn-primary"
                  disabled={reviewSubmitting || reviewForm.comment.length < 5}
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  {reviewSubmitting ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin /> Submitting...
                    </>
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheckCircle} /> Submit Review
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientDashboard;