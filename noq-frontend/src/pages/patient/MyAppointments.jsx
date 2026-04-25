// pages/patient/MyAppointments.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import {
  faPrint, faCopy, faTimes, faTicketAlt,
  faUserMd, faDoorOpen, faClock, faCalendarAlt, faChevronLeft,
  faCheckCircle, faStar
} from '@fortawesome/free-solid-svg-icons';
import reviewService from '../../services/reviewService';

const MyAppointments = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();

  // Helper to determine doctor live status display
  const getDoctorLiveStatus = (appointment) => {
    const isLive = appointment?.doctor_live || appointment?.isLive || false;
    if (isLive) {
      return { text: 'Online', color: '#065f46', bg: '#d1fae5' };
    }
    return { text: 'Away', color: '#991b1b', bg: '#fee2e2' };
  };

  const [appointments, setAppointments] = useState([]);
  const [userReviews, setUserReviews] = useState([]);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewForm, setReviewForm] = useState({ doctorRating: 5, hospitalRating: 5, comment: '' });
  const [loading, setLoading] = useState(true);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Load appointments and reviews from API
  useEffect(() => {
    if (authLoading) return;

    if (!currentUser || currentUser.role !== 'patient') {
      navigate('/login', { replace: true });
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [appointmentsData, reviewsData] = await Promise.all([
          patientService.getMyAppointments(),
          patientService.getMyReviews()
        ]);

        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
        setUserReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (error) {
        console.error('Error loading appointments:', error);
        setAppointments([]);
        setUserReviews([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authLoading, currentUser, navigate]);

  // Filter completed appointments awaiting review
  const completedAwaitingReview = useMemo(() => {
    const reviewedIds = new Set((userReviews || []).map(r => String(r.appointment_id || '')));
    return appointments.filter((apt) => {
      const status = String(apt.status || '').toLowerCase();
      const isCompleted = ['completed', 'visited', 'done', 'closed'].includes(status);
      const notReviewed = !reviewedIds.has(String(apt.id || ''));
      return isCompleted && notReviewed;
    }).sort((a, b) => new Date(b.appointment_date || b.appointmentDate || b.date) - new Date(a.appointment_date || a.appointmentDate || a.date));
  }, [appointments, userReviews]);

  // Split appointments into upcoming and past
  const { upcomingAppointments, pastAppointments } = useMemo(() => {
    if (!appointments.length) {
      return { upcomingAppointments: [], pastAppointments: [] };
    }

    const now = new Date();
    const upcoming = appointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointment_date || apt.appointmentDate || apt.date);
        return !Number.isNaN(aptDate.getTime()) && aptDate >= now;
      })
      .sort((a, b) => new Date(a.appointment_date || a.appointmentDate || a.date) - new Date(b.appointment_date || b.appointmentDate || b.date));

    const past = appointments
      .filter((apt) => {
        const aptDate = new Date(apt.appointment_date || apt.appointmentDate || apt.date);
        return Number.isNaN(aptDate.getTime()) || aptDate < now;
      })
      .sort((a, b) => new Date(b.appointment_date || b.appointmentDate || b.date) - new Date(a.appointment_date || a.appointmentDate || a.date));

    return { upcomingAppointments: upcoming, pastAppointments: past };
  }, [appointments]);

  const openReviewModal = (appointment) => {
    const existing = userReviews.find(
      (item) =>
        item.appointment_id === appointment.id &&
        item.patient_id === currentUser?.id
    );

    setReviewTarget(appointment);
    setReviewForm({
      doctorRating: Number(existing?.doctor_rating || existing?.rating || 5),
      hospitalRating: Number(existing?.hospital_rating || existing?.rating || 5),
      comment: String(existing?.comment || ''),
    });
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!currentUser || !reviewTarget) return;

    const comment = String(reviewForm.comment || '').trim();
    if (comment.length < 5) {
      alert('Please add a review comment with at least 5 characters.');
      return;
    }

    setReviewSubmitting(true);
    try {
      const reviewData = {
        appointment_id: reviewTarget.id,
        doctor_rating: Number(reviewForm.doctorRating || 5),
        hospital_rating: Number(reviewForm.hospitalRating || 5),
        comment: comment
      };

      await patientService.submitReview(reviewData);

      // Reload reviews
      const updatedReviews = await patientService.getMyReviews();
      setUserReviews(Array.isArray(updatedReviews) ? updatedReviews : []);

      setShowReviewModal(false);
      setReviewTarget(null);
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setReviewSubmitting(false);
    }
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
        .filter((item) => String(item.patient_id || item.patientId || '') === String(currentUser?.id || ''))
        .map((item) => String(item.appointment_id || item.appointmentId || ''))
    );
  }, [userReviews, currentUser?.id]);

  const copyTokenToClipboard = (tokenNumber) => {
    navigator.clipboard.writeText(tokenNumber);
    alert('Token copied to clipboard!');
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
                  <strong>Hospital:</strong> {app.hospital_name || app.hospitalName || 'N/A'}
                </p>
                <p style={styles.cardText}>
                  <strong>Doctor:</strong> {app.doctor_name || app.doctorName || 'N/A'}
                </p>
                <p style={styles.cardText}>
                  <strong>Date:</strong> {app.appointment_date || app.appointmentDate || app.token?.date || 'N/A'}
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
              <p style={styles.cardText}><strong>Doctor:</strong> {reviewTarget.doctor_name || reviewTarget.doctorName || 'N/A'}</p>
              <p style={styles.cardText}><strong>Hospital:</strong> {reviewTarget.hospital_name || reviewTarget.hospitalName || 'N/A'}</p>

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