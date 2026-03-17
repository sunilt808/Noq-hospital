import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faHospital, faStar, faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import patientService from '../../services/patientService';
import { useAuth } from '../../context/AuthContext';

const COMPLETED_STATUSES = ['completed', 'visited', 'done', 'closed'];

const Reviews = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [form, setForm] = useState({ doctorRating: 5, hospitalRating: 5, comment: '' });
  const [isLoading, setIsLoading] = useState(false);

  // Load appointments and reviews from API
  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser || currentUser.role !== 'patient') {
      navigate('/login', { replace: true });
      return;
    }

    const loadData = async () => {
      try {
        setIsLoading(true);
        const [appointmentsData, reviewsData] = await Promise.all([
          patientService.getMyAppointments(),
          patientService.getMyReviews()
        ]);
        
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (error) {
        console.error('Error loading data:', error);
        setAppointments([]);
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [authLoading, currentUser, navigate]);

  // Get eligible hospitals from completed appointments
  const eligibleHospitals = useMemo(() => {
    const reviewedIds = new Set((reviews || []).map(r => String(r.appointment_id || '')));
    const completed = appointments.filter((item) => {
      const status = String(item?.status || '').toLowerCase();
      const isCompleted = COMPLETED_STATUSES.includes(status);
      const notReviewed = !reviewedIds.has(String(item?.id || ''));
      return isCompleted && notReviewed;
    });

    const map = new Map();
    completed.forEach((item) => {
      const appointmentId = String(item?.id || '');
      if (!appointmentId) return;
      
      const hospitalId = String(item?.hospital_id || item?.HID || '');
      if (!hospitalId) return;

      const previous = map.get(hospitalId);
      const currentTime = new Date(item?.appointment_date || item?.createdAt || 0).getTime();
      const previousTime = new Date(previous?.lastVisitAt || 0).getTime();

      if (!previous || currentTime >= previousTime) {
        map.set(hospitalId, {
          appointmentId,
          hospitalId,
          hospitalName: item?.hospital_name || item?.hospitalName || 'Hospital',
          doctorName: item?.doctor_name || item?.doctorName || 'Doctor',
          departmentName: item?.department_name || item?.department || '',
          lastVisitAt: item?.appointment_date || item?.createdAt || new Date().toISOString(),
          visits: (previous?.visits || 0) + 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.lastVisitAt) - new Date(a.lastVisitAt));
  }, [appointments, reviews]);

  const selectedHospital = eligibleHospitals.find((item) => item.hospitalId === selectedHospitalId) || null;

  const handleSubmitReview = async () => {
    if (!selectedHospitalId) {
      alert('Please select a hospital');
      return;
    }

    const selected = eligibleHospitals.find(h => h.hospitalId === selectedHospitalId);
    if (!selected) {
      alert('Hospital not found');
      return;
    }

    const comment = String(form.comment || '').trim();
    if (comment.length < 5) {
      alert('Please add a comment with at least 5 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const reviewData = {
        appointment_id: selected.appointmentId,
        doctor_rating: Number(form.doctorRating || 5),
        hospital_rating: Number(form.hospitalRating || 5),
        comment: comment
      };

      await patientService.submitReview(reviewData);
      
      // Reload reviews
      const updatedReviews = await patientService.getMyReviews();
      setReviews(Array.isArray(updatedReviews) ? updatedReviews : []);
      
      setSelectedHospitalId('');
      setForm({ doctorRating: 5, hospitalRating: 5, comment: '' });
      alert('Review submitted successfully!');
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const styles = {
    container: { maxWidth: 980, margin: '0 auto', padding: '20px' },
    header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
    backBtn: { border: 'none', background: '#e2e8f0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },
    title: { margin: 0, color: '#0f172a' },
    subtitle: { margin: '4px 0 0', color: '#64748b' },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 14 },
    label: { fontSize: 13, color: '#64748b', marginBottom: 6 },
    input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' },
    submit: { border: 'none', borderRadius: 10, padding: '11px 16px', cursor: 'pointer', background: '#1d4ed8', color: '#fff', fontWeight: 600 },
    reviewItem: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginTop: 10 },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/patient/dashboard')}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div>
          <h2 style={styles.title}>Hospital Reviews</h2>
          <p style={styles.subtitle}>You can review only hospitals where your visit is completed.</p>
        </div>
      </div>

      <div style={styles.card}>
        {eligibleHospitals.length === 0 ? (
          <div style={{ color: '#64748b' }}>
            No eligible hospital found for review yet. Complete at least one appointment/visit first.
          </div>
        ) : (
          <>
            <div style={styles.label}>Select Visited Hospital</div>
            <select
              style={styles.input}
              value={selectedHospitalId}
              onChange={(e) => setSelectedHospitalId(e.target.value)}
            >
              {eligibleHospitals.map((item) => (
                <option key={item.hospitalId} value={item.hospitalId}>
                  {item.hospitalName} (Visits: {item.visits})
                </option>
              ))}
            </select>

            <div style={{ marginTop: 10, color: '#334155', fontSize: 14 }}>
              <FontAwesomeIcon icon={faHospital} /> Last visited: {selectedHospital?.lastVisitAt || '-'}
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={styles.label}>Doctor Rating</div>
              <input
                type="number"
                min={1}
                max={5}
                style={styles.input}
                value={form.doctorRating}
                onChange={(e) => setForm((prev) => ({ ...prev, doctorRating: Number(e.target.value || 5) }))}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={styles.label}>Hospital Rating</div>
              <input
                type="number"
                min={1}
                max={5}
                style={styles.input}
                value={form.hospitalRating}
                onChange={(e) => setForm((prev) => ({ ...prev, hospitalRating: Number(e.target.value || 5) }))}
              />
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={styles.label}>Comment</div>
              <textarea
                style={{ ...styles.input, minHeight: 90, resize: 'vertical' }}
                value={form.comment}
                onChange={(e) => setForm((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="Write your review"
              />
            </div>

            <button style={{ ...styles.submit, marginTop: 12 }} type="button" onClick={submitReview}>
              <FontAwesomeIcon icon={faStar} /> Submit Review
            </button>
          </>
        )}
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>My Reviews</div>
        {isLoading && <div style={{ marginTop: 8, color: '#64748b' }}>Loading reviews...</div>}
        {myReviews.length === 0 ? (
          <div style={{ marginTop: 8, color: '#64748b' }}>No reviews submitted yet.</div>
        ) : (
          myReviews.map((item) => (
            <div key={item.id} style={styles.reviewItem}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.hospital || 'Hospital'}</div>
              <div style={{ marginTop: 4, color: '#475569', fontSize: 13 }}>
                Doctor {item.doctorRating || 0}/5 • Hospital {item.hospitalRating || 0}/5 • Avg {item.rating || 0}/5
              </div>
              <div style={{ marginTop: 6, color: '#334155' }}>{item.comment}</div>
            </div>
          ))
        )}
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 600, color: '#0f172a' }}>Public Reviews (All Patients)</div>
        {publicReviews.length === 0 ? (
          <div style={{ marginTop: 8, color: '#64748b' }}>No public reviews available.</div>
        ) : (
          publicReviews.slice(0, 30).map((item) => (
            <div key={`public-${item.id}`} style={styles.reviewItem}>
              <div style={{ fontWeight: 600, color: '#0f172a' }}>{item.hospital || 'Hospital'}</div>
              <div style={{ marginTop: 4, color: '#475569', fontSize: 13 }}>
                {item.patient || 'Patient'} • Doctor {item.doctorRating || 0}/5 • Hospital {item.hospitalRating || 0}/5 • Avg {item.rating || 0}/5
              </div>
              <div style={{ marginTop: 6, color: '#334155' }}>{item.comment}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Reviews;
