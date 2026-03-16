import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faHospital, faStar } from '@fortawesome/free-solid-svg-icons';
import { recordHistory } from '../../services/historyService';
import reviewService from '../../services/reviewService';
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';

const COMPLETED_STATUSES = ['completed', 'visited', 'done', 'closed'];

const Reviews = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { appointments: allAppointments } = useFirebaseData();
  const [appointments, setAppointments] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [form, setForm] = useState({ doctorRating: 5, hospitalRating: 5, comment: '' });
  const [isLoading, setIsLoading] = useState(false);

  const loadData = async () => {
    if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'patient') {
      navigate('/login', { replace: true });
      return;
    }

    const mine = allAppointments.filter((item) => String(item?.patientId || '') === String(currentUser.id || ''));
    setAppointments(mine);

    setIsLoading(true);
    try {
      const reviews = await reviewService.getPublicReviews();
      setAllReviews(reviews);
    } catch (_) {
      setAllReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      loadData();
    }
  }, [navigate, currentUser, allAppointments, authLoading]);

  const eligibleHospitals = useMemo(() => {
    const completed = appointments.filter((item) =>
      COMPLETED_STATUSES.includes(String(item?.status || '').toLowerCase())
    );

    const map = new Map();
    completed.forEach((item) => {
      const hospitalId = String(item?.hospitalId || item?.HID || '');
      if (!hospitalId) return;
      const previous = map.get(hospitalId);
      const currentTime = new Date(item?.appointmentDate || item?.createdAt || 0).getTime();
      const previousTime = new Date(previous?.lastVisitAt || 0).getTime();

      if (!previous || currentTime >= previousTime) {
        map.set(hospitalId, {
          hospitalId,
          hospitalName: item?.hospitalName || item?.hospital || 'Hospital',
          doctorName: item?.doctorName || 'Doctor',
          lastVisitAt: item?.appointmentDate || item?.createdAt || new Date().toISOString(),
          visits: (previous?.visits || 0) + 1,
        });
      } else {
        map.set(hospitalId, {
          ...previous,
          visits: (previous?.visits || 0) + 1,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(b.lastVisitAt) - new Date(a.lastVisitAt));
  }, [appointments]);

  useEffect(() => {
    if (!eligibleHospitals.length) {
      setSelectedHospitalId('');
      return;
    }
    if (!selectedHospitalId || !eligibleHospitals.some((item) => item.hospitalId === selectedHospitalId)) {
      setSelectedHospitalId(eligibleHospitals[0].hospitalId);
    }
  }, [eligibleHospitals, selectedHospitalId]);

  const selectedHospital = eligibleHospitals.find((item) => item.hospitalId === selectedHospitalId) || null;

  const myReviews = useMemo(() => {
    return allReviews
      .filter((item) => String(item?.patientId || '') === String(currentUser?.id || ''))
      .sort((a, b) => new Date(b?.date || b?.createdAt || 0) - new Date(a?.date || a?.createdAt || 0));
  }, [allReviews, currentUser]);

  const publicReviews = useMemo(() => {
    return allReviews
      .filter((item) => String(item?.visibility || 'public').toLowerCase() === 'public')
      .sort((a, b) => new Date(b?.date || b?.createdAt || 0) - new Date(a?.date || a?.createdAt || 0));
  }, [allReviews]);

  useEffect(() => {
    if (!selectedHospital || !currentUser) return;
    const existing = myReviews.find((item) => String(item?.hospitalId || '') === String(selectedHospital.hospitalId));
    setForm({
      doctorRating: Number(existing?.doctorRating || existing?.rating || 5),
      hospitalRating: Number(existing?.hospitalRating || existing?.rating || 5),
      comment: String(existing?.comment || ''),
    });
  }, [selectedHospitalId, selectedHospital, myReviews, currentUser]);

  const submitReview = async () => {
    if (!currentUser) return;
    if (!selectedHospital) {
      alert('You can review only after visiting a hospital.');
      return;
    }

    const comment = String(form.comment || '').trim();
    if (comment.length < 5) {
      alert('Please add at least 5 characters in review comment.');
      return;
    }

    const review = {
      patientId: String(currentUser.id || ''),
      patient: currentUser.name || 'Patient',
      hospitalId: selectedHospital.hospitalId,
      hospital: selectedHospital.hospitalName,
      doctor: selectedHospital.doctorName || 'Doctor',
      doctorRating: Number(form.doctorRating || 5),
      hospitalRating: Number(form.hospitalRating || 5),
      rating: Number(((Number(form.doctorRating || 5) + Number(form.hospitalRating || 5)) / 2).toFixed(1)),
      comment,
      date: new Date().toISOString(),
      status: 'published',
      visibility: 'public',
    };

    let saved;
    try {
      saved = await reviewService.upsertReview(review);
      const next = await reviewService.getPublicReviews();
      setAllReviews(next);
    } catch (error) {
      alert(error?.message || 'Unable to submit review right now.');
      return;
    }

    recordHistory({
      module: 'reviews',
      action: 'review-submitted',
      message: `Hospital review submitted for ${saved.hospital}`,
      patientId: String(saved.patientId || ''),
      hospitalId: String(saved.hospitalId || ''),
      meta: { doctorRating: saved.doctorRating, hospitalRating: saved.hospitalRating },
    });

    alert('Review submitted successfully.');
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
