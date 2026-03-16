import api from './api';

const normalizeReview = (review = {}) => ({
  id: review.id || `RV-${Date.now()}`,
  appointmentId: String(review.appointmentId || review.appointment_id || ''),
  patientId: String(review.patientId || review.patient_id || ''),
  patient: review.patient || review.patientName || 'Patient',
  doctorId: String(review.doctorId || review.doctor_id || ''),
  doctor: review.doctor || review.doctorName || 'Doctor',
  hospitalId: String(review.hospitalId || review.hospital_id || ''),
  hospital: review.hospital || review.hospitalName || 'Hospital',
  doctorRating: Number(review.doctorRating || review.doctor_rating || review.rating || 0),
  hospitalRating: Number(review.hospitalRating || review.hospital_rating || review.rating || 0),
  rating: Number(review.rating || 0),
  comment: String(review.comment || ''),
  status: review.status || 'published',
  visibility: review.visibility || 'public',
  date: review.date || review.updatedAt || review.updated_at || review.createdAt || review.created_at || new Date().toISOString(),
  createdAt: review.createdAt || review.created_at || review.date || new Date().toISOString(),
  updatedAt: review.updatedAt || review.updated_at || review.date || new Date().toISOString(),
});


const toApiPayload = (review = {}) => ({
  appointment_id: review.appointmentId || review.appointment_id || null,
  patient_id: String(review.patientId || review.patient_id || ''),
  patient: review.patient || review.patientName || 'Patient',
  doctor_id: String(review.doctorId || review.doctor_id || ''),
  doctor: review.doctor || review.doctorName || 'Doctor',
  hospital_id: String(review.hospitalId || review.hospital_id || ''),
  hospital: review.hospital || review.hospitalName || 'Hospital',
  doctor_rating: Number(review.doctorRating || review.doctor_rating || 5),
  hospital_rating: Number(review.hospitalRating || review.hospital_rating || 5),
  comment: String(review.comment || ''),
  status: review.status || 'published',
  visibility: review.visibility || 'public',
});

export const reviewService = {
  getPublicReviews: async (params = {}) => {
    const query = new URLSearchParams();
    if (params.hospitalId) query.set('hospital_id', String(params.hospitalId));
    if (params.patientId) query.set('patient_id', String(params.patientId));
    if (params.doctorId) query.set('doctor_id', String(params.doctorId));

    const suffix = query.toString() ? `?${query.toString()}` : '';
    const res = await api.get(`/reviews${suffix}`);
    return (res?.data?.reviews || []).map(normalizeReview);
  },

  upsertReview: async (review) => {
    const normalized = normalizeReview(review);

    const res = await api.post('/reviews/upsert', toApiPayload(normalized));
    return normalizeReview(res?.data?.review || normalized);
  },
};

export default reviewService;
