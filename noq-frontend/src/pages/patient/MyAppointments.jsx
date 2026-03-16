// pages/patient/MyAppointments.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';
import firebaseDbService from '../../services/firebaseDbService';
import { 
  faPrint, faCopy, faTimes, faTicketAlt, 
  faUserMd, faDoorOpen, faClock, faCalendarAlt, faChevronLeft
} from '@fortawesome/free-solid-svg-icons';
import { recordHistory } from '../../services/historyService';
import reviewService from '../../services/reviewService';

const MyAppointments = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { patients, appointments, reviews: allReviews, loading } = useFirebaseData();
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ doctorRating: 5, hospitalRating: 5, comment: '' });
  const [userReviews, setUserReviews] = useState([]);

  // Get current patient from auth context (don't rely on patients collection lookup)
  const patient = useMemo(() => {
    console.log('🔍 Setting patient from currentUser:', { currentUser, role: currentUser?.role });
    if (!currentUser || String(currentUser?.role || '').toLowerCase() !== 'patient') {
      console.log('❌ CurrentUser not set or not patient');
      return null;
    }
    // Use currentUser directly (already authenticated)
    return currentUser;
  }, [currentUser]);

  // Filter appointments for current patient
  const patientAppointments = useMemo(() => {
    if (!patient?.id) {
      console.log('🔍 MyAppointments: No patient ID available');
      return [];
    }
    const filtered = appointments.filter(app =>
      String(app.patientId) === String(patient.id) || 
      String(app.patientEmail)?.toLowerCase() === String(patient.email)?.toLowerCase()
    );
    console.log('🔍 MyAppointments Filter Debug:', {
      patientId: patient?.id,
      patientEmail: patient?.email,
      totalAppointments: appointments.length,
      filtered: filtered.length,
      sample: appointments.slice(0, 1).map(a => ({ id: a.id, patientId: a.patientId }))
    });
    return filtered;
  }, [appointments, patient]);

  // Load patient reviews
  useEffect(() => {
    const loadReviews = async () => {
      try {
        const publicReviews = await reviewService.getPublicReviews({ 
          patientId: String(patient?.id || '') 
        });
        setUserReviews(publicReviews || []);
      } catch (error) {
        console.error('Error loading reviews:', error);
        setUserReviews([]);
      }
    };

    if (patient?.id) {
      loadReviews();
    }
  }, [patient?.id]);

  // Verify patient is authenticated
  useEffect(() => {
    console.log('🔐 Auth check:', { authLoading, currentUser: !!currentUser, role: currentUser?.role });
    if (!authLoading && (!currentUser || String(currentUser?.role || '').toLowerCase() !== 'patient')) {
      console.log('🚫 Not authenticated, redirecting to login');
      navigate('/login', { replace: true });
    }
  }, [currentUser, authLoading, navigate]);

  const getDoctorLiveStatus = (appointment) => {
    // Doctor presence is loaded via useFirebaseData
    // For now, return default status - can be enhanced with realtime presence
    return { text: 'Available', bg: '#dcfce7', color: '#166534' };
  };

  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);

  const handleViewToken = (appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  const canReviewAppointment = (appointment) => {
    const status = String(appointment?.status || '').toLowerCase();
    return ['completed', 'visited', 'done', 'closed'].includes(status);
  };

  const reviewedAppointmentIds = useMemo(() => {
    return new Set(
      userReviews
        .filter((item) => item.patientId === patient?.id)
        .map((item) => String(item.appointmentId || ''))
    );
  }, [userReviews, patient?.id]);

  const copyTokenToClipboard = (tokenNumber) => {
    navigator.clipboard.writeText(tokenNumber);
    alert('Token copied to clipboard!');
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

    if (!canReviewAppointment(reviewTarget)) {
      alert('Review is allowed only after the visit is completed.');
      return;
    }

    const comment = String(reviewForm.comment || '').trim();
    if (comment.length < 5) {
      alert('Please add a review comment with at least 5 characters.');
      return;
    }

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

    try {
      const saved = await reviewService.upsertReview(newReview);
      const nextReviews = await reviewService.getPublicReviews({ patientId: String(patient.id || '') });
      setUserReviews(nextReviews);
      
      recordHistory({
        module: 'reviews',
        action: 'review-submitted',
        message: `Review submitted for ${saved.doctor} at ${saved.hospital}`,
        patientId: String(saved.patientId || ''),
        doctorId: String(saved.doctorId || ''),
        hospitalId: String(saved.hospitalId || ''),
        appointmentId: String(saved.appointmentId || ''),
        meta: {
          doctorRating: saved.doctorRating,
          hospitalRating: saved.hospitalRating,
        },
      });
      setShowReviewModal(false);
      setReviewTarget(null);
      setReviewForm({ doctorRating: 5, hospitalRating: 5, comment: '' });
      alert('Review submitted successfully.');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert(error?.message || 'Unable to submit review right now.');
    }
  };

  const closeReviewModal = () => {
    setShowReviewModal(false);
    setReviewTarget(null);
    setReviewForm({ doctorRating: 5, hospitalRating: 5, comment: '' });
  };

  const TokenView = ({ appointment }) => {
    if (!appointment || !appointment.token) {
      return <p style={{ textAlign: 'center', color: '#666' }}>Token details not available.</p>;
    }
    const token = appointment.token;
    return (
      <div style={styles.tokenView}>
        <h3 style={styles.tokenViewTitle}>Appointment Token</h3>
        <div style={styles.tokenDetails}>
          <div style={styles.tokenRow}>
            <span style={styles.tokenLabel}>Token Number</span>
            <span style={styles.tokenValue}>{token.tokenNumber || 'N/A'}</span>
          </div>
          <div style={styles.tokenRow}>
            <span style={styles.tokenLabel}>Patient</span>
            <span style={styles.tokenValue}>{appointment.patientName || 'N/A'}</span>
          </div>
          <div style={styles.tokenRow}>
            <span style={styles.tokenLabel}>Hospital</span>
            <span style={styles.tokenValue}>{appointment.hospitalName || 'N/A'}</span>
          </div>
          <div style={styles.tokenRow}>
            <span style={styles.tokenLabel}>Doctor</span>
            <span style={styles.tokenValue}>{appointment.doctorName || 'N/A'}</span>
          </div>
          <div style={styles.tokenRow}>
            <span style={styles.tokenLabel}>Room</span>
            <span style={styles.tokenValue}>{appointment.roomNumber || 'N/A'}</span>
          </div>
          <div style={styles.tokenRow}>
            <span style={styles.tokenLabel}>Date</span>
            <span style={styles.tokenValue}>{token.date || appointment.appointmentDate || 'N/A'}</span>
          </div>
          <div style={styles.tokenRow}>
            <span style={styles.tokenLabel}>Time</span>
            <span style={styles.tokenValue}>{token.time || appointment.appointmentTime || 'N/A'}</span>
          </div>
          <div style={styles.tokenRow}>
            <span style={styles.tokenLabel}>Priority</span>
            <span style={styles.tokenValue}>{token.priority || 'Normal'}</span>
          </div>
        </div>
        <div style={styles.tokenActions}>
          <button 
            style={{ ...styles.btn, ...styles.btnSecondary }} 
            onClick={() => copyTokenToClipboard(token.tokenNumber)}
          >
            <FontAwesomeIcon icon={faCopy} /> Copy Token
          </button>
          <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={() => window.print()}>
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/patient/dashboard')}>
          <FontAwesomeIcon icon={faChevronLeft} /> Back
        </button>
        <h2 style={styles.title}>My Appointments</h2>
      </header>

      {/* Appointments List */}
      <div style={styles.list}>
        {appointments.length === 0 ? (
          <p style={styles.emptyMessage}>No appointments found.</p>
        ) : (
          appointments.map(app => (
            <div key={app.id} style={styles.card}>
              <div style={styles.cardInfo}>
                <p style={styles.cardText}>
                  <strong>Token:</strong> {app.token?.tokenNumber || 'N/A'}
                </p>
                <p style={styles.cardText}>
                  <strong>Hospital:</strong> {app.hospitalName || 'N/A'}
                </p>
                <p style={styles.cardText}>
                  <strong>Doctor:</strong> {app.doctorName || 'N/A'}
                </p>
                <p style={styles.cardText}>
                  <strong>Date:</strong> {app.appointmentDate || app.token?.date || 'N/A'}
                </p>
                <p style={styles.cardText}>
                  <strong>Status:</strong>{' '}
                  <span style={{
                    ...styles.statusBadge,
                    backgroundColor: app.status === 'confirmed' ? '#d1fae5' : '#fee2e2',
                    color: app.status === 'confirmed' ? '#065f46' : '#991b1b',
                  }}>
                    {app.status || 'Unknown'}
                  </span>
                </p>
                <p style={styles.cardText}>
                  <strong>Doctor Live:</strong>{' '}
                  <span
                    style={{
                      ...styles.statusBadge,
                      backgroundColor: getDoctorLiveStatus(app).bg,
                      color: getDoctorLiveStatus(app).color,
                    }}
                  >
                    {getDoctorLiveStatus(app).text}
                  </span>
                </p>
              </div>
              <button style={styles.viewBtn} onClick={() => handleViewToken(app)}>
                View Token
              </button>
              {canReviewAppointment(app) && (
                <button style={styles.reviewBtn} onClick={() => openReviewModal(app)}>
                  {reviewedAppointmentIds.has(String(app.id || '')) ? 'Edit Review' : 'Add Review'}
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Token Modal */}
      {showModal && selectedAppointment && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h4 style={styles.modalTitle}>Appointment Token</h4>
              <button style={styles.closeBtn} onClick={closeModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <TokenView appointment={selectedAppointment} />
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && reviewTarget && (
        <div style={styles.modalOverlay} onClick={closeReviewModal}>
          <div style={styles.modal} onClick={e => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h4 style={styles.modalTitle}>Rate Appointment</h4>
              <button style={styles.closeBtn} onClick={closeReviewModal}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div style={styles.modalBody}>
              <p style={styles.cardText}><strong>Doctor:</strong> {reviewTarget.doctorName || 'N/A'}</p>
              <p style={styles.cardText}><strong>Hospital:</strong> {reviewTarget.hospitalName || 'N/A'}</p>

              <div style={{ marginTop: 12 }}>
                <label style={styles.tokenLabel}>Doctor Rating</label>
                <select
                  value={reviewForm.doctorRating}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, doctorRating: Number(e.target.value) }))}
                  style={styles.reviewInput}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} Star</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={styles.tokenLabel}>Hospital Rating</label>
                <select
                  value={reviewForm.hospitalRating}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, hospitalRating: Number(e.target.value) }))}
                  style={styles.reviewInput}
                >
                  {[5, 4, 3, 2, 1].map((value) => (
                    <option key={value} value={value}>{value} Star</option>
                  ))}
                </select>
              </div>

              <div style={{ marginTop: 12 }}>
                <label style={styles.tokenLabel}>Comment</label>
                <textarea
                  value={reviewForm.comment}
                  onChange={(e) => setReviewForm((prev) => ({ ...prev, comment: e.target.value }))}
                  style={{ ...styles.reviewInput, minHeight: 110, resize: 'vertical' }}
                  placeholder="Write your review..."
                />
              </div>
            </div>
            <div style={styles.modalFooter}>
              <button style={{ ...styles.btn, ...styles.btnSecondary }} onClick={closeReviewModal}>
                Cancel
              </button>
              <button style={{ ...styles.btn, ...styles.btnPrimary }} onClick={submitReview}>
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Internal CSS (JavaScript object styles)
const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '20px',
    fontFamily: 'Segoe UI, Roboto, sans-serif',
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    marginBottom: '24px',
    backgroundColor: 'white',
    padding: '12px 20px',
    borderRadius: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: '16px',
    color: '#4b5563',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 12px',
    borderRadius: '8px',
    transition: 'background 0.2s',
  },
  title: {
    margin: 0,
    flex: 1,
    textAlign: 'center',
    fontSize: '24px',
    color: '#1f2937',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: '16px',
    padding: '40px 0',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '16px',
    padding: '20px',
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '16px',
    transition: 'transform 0.2s, box-shadow 0.2s',
    border: '1px solid #e5e7eb',
  },
  cardInfo: {
    flex: 1,
  },
  cardText: {
    margin: '6px 0',
    color: '#374151',
    fontSize: '15px',
  },
  statusBadge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    display: 'inline-block',
  },
  viewBtn: {
    backgroundColor: '#2563eb',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
    whiteSpace: 'nowrap',
  },
  reviewBtn: {
    backgroundColor: '#0ea5e9',
    color: 'white',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'background 0.2s',
    boxShadow: '0 2px 4px rgba(14,165,233,0.25)',
    whiteSpace: 'nowrap',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '16px',
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '24px',
    maxWidth: '500px',
    width: '100%',
    maxHeight: '90vh',
    overflow: 'auto',
    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
  },
  modalTitle: {
    margin: 0,
    fontSize: '20px',
    color: '#1f2937',
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    color: '#9ca3af',
    padding: '4px 8px',
    borderRadius: '8px',
  },
  modalBody: {
    padding: '24px',
  },
  modalFooter: {
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  tokenView: {
    padding: '8px 0',
  },
  tokenViewTitle: {
    marginTop: 0,
    marginBottom: '20px',
    fontSize: '18px',
    color: '#1f2937',
    textAlign: 'center',
  },
  tokenDetails: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  tokenRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  tokenLabel: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: '0.3px',
  },
  tokenValue: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#1f2937',
    wordBreak: 'break-word',
  },
  tokenActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  reviewInput: {
    width: '100%',
    padding: '10px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    marginTop: '6px',
  },
  btn: {
    padding: '10px 20px',
    borderRadius: '30px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    border: 'none',
    transition: 'all 0.2s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
  },
  btnPrimary: {
    backgroundColor: '#2563eb',
    color: 'white',
    boxShadow: '0 2px 4px rgba(37,99,235,0.2)',
  },
  btnSecondary: {
    backgroundColor: 'white',
    color: '#4b5563',
    border: '1px solid #d1d5db',
  },
};

export default MyAppointments;