import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';
import firebaseDbService from '../../services/firebaseDbService';
import {
  faArrowLeft,
  faPrescriptionBottle,
  faUser,
  faNotesMedical,
  faSave,
  faClock,
  faUserMd,
} from '@fortawesome/free-solid-svg-icons';
import './doctor.css';

const DoctorPrescriptions = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { doctors, patients: allPatients, appointments, prescriptions: allPrescriptions, loading } = useFirebaseData();
  const [form, setForm] = useState({
    patientId: '',
    medicine: '',
    notes: '',
    status: 'active',
  });

  useEffect(() => {
    if (!authLoading && (!currentUser || String(currentUser.role || '').toLowerCase() !== 'doctor')) {
      navigate('/login', { replace: true });
    }
  }, [authLoading, currentUser, navigate]);

  const doctor = useMemo(() => {
    if (!currentUser) return null;
    return (
      doctors.find((item) => String(item.id) === String(currentUser.id)) ||
      doctors.find((item) => item.email?.toLowerCase() === currentUser.email?.toLowerCase()) || {
        id: currentUser.id,
        name: currentUser.name || 'Doctor',
        email: currentUser.email,
        specialization: currentUser.specialization || 'General Physician',
      }
    );
  }, [doctors, currentUser]);

  const patients = useMemo(() => {
    if (!doctor?.id) return [];
    const doctorAppointments = appointments.filter(
      (item) => String(item.doctorId || '') === String(doctor.id || '')
    );
    const mappedPatients = new Map();

    allPatients.forEach((item) => {
      const id = String(item.id || '');
      const email = String(item.email || '').toLowerCase();
      if (id) {
        mappedPatients.set(`id:${id}`, {
          id,
          name: item.name || item.fullName || 'Patient',
          email: item.email || '',
        });
      }
      if (email) {
        mappedPatients.set(`email:${email}`, {
          id: id || email,
          name: item.name || item.fullName || 'Patient',
          email: item.email || '',
        });
      }
    });

    doctorAppointments.forEach((item) => {
      const patientId = String(item.patientId || '');
      const patientEmail = String(item.patientEmail || '').toLowerCase();
      const patientName = item.patientName || 'Patient';

      if (patientId && !mappedPatients.has(`id:${patientId}`)) {
        mappedPatients.set(`id:${patientId}`, {
          id: patientId,
          name: patientName,
          email: item.patientEmail || '',
        });
      }

      if (patientEmail && !mappedPatients.has(`email:${patientEmail}`)) {
        mappedPatients.set(`email:${patientEmail}`, {
          id: patientId || patientEmail,
          name: patientName,
          email: item.patientEmail || '',
        });
      }
    });

    const uniquePatients = new Map();
    Array.from(mappedPatients.values()).forEach((item) => {
      const key = String(item.id || item.email || '').toLowerCase();
      if (!key || uniquePatients.has(key)) return;
      uniquePatients.set(key, item);
    });

    return Array.from(uniquePatients.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [doctor?.id, appointments, allPatients]);

  const savedPrescriptions = useMemo(() => {
    if (!doctor?.id) return [];
    return allPrescriptions
      .filter((item) => String(item.doctorId || '') === String(doctor.id || ''))
      .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
  }, [allPrescriptions, doctor?.id]);

  const selectedPatient = useMemo(
    () => patients.find((item) => String(item.id) === String(form.patientId)) || null,
    [patients, form.patientId]
  );

  const savePrescription = async () => {
    if (!doctor) return;
    if (!form.patientId) {
      alert('Please select a patient.');
      return;
    }

    const notes = String(form.notes || '').trim();
    if (notes.length < 5) {
      alert('Please enter valid prescription notes.');
      return;
    }

    const medicine = String(form.medicine || '').trim() || 'General Prescription';

    const prescriptionId = `rx_${Date.now()}`;
    const payload = {
      id: prescriptionId,
      patientId: String(form.patientId),
      patientName: selectedPatient?.name || 'Patient',
      patientEmail: selectedPatient?.email || '',
      doctorId: String(doctor.id || ''),
      doctorName: doctor.name || 'Doctor',
      hospitalId: doctor.hospitalId || doctor.hospital_id || doctor.HID || null,
      hospitalName: doctor.hospitalName || '',
      medicine,
      prescription: notes,
      status: form.status,
      specialization: doctor.specialization || doctor.departmentName || 'General Physician',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    try {
      await firebaseDbService.upsert('prescriptions', prescriptionId, payload);
      setForm((prev) => ({ ...prev, medicine: '', notes: '' }));
      alert('Prescription saved successfully.');
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Failed to save prescription.');
    }
  };

  if (loading || authLoading || !doctor) {
    return (
      <div className="doctor-loading">
        <div className="loading-spinner" />
        <p>Loading prescriptions...</p>
      </div>
    );
  }

  return (
    <div className="doctor-portal" style={{ padding: '1.25rem' }}>
      <div style={styles.headerRow}>
        <button className="doctor-btn doctor-btn-secondary" onClick={() => navigate('/doctor/dashboard')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h2 style={styles.title}>
          <FontAwesomeIcon icon={faPrescriptionBottle} /> Doctor Prescriptions
        </h2>
      </div>

      <div style={styles.grid}>
        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Write Prescription</h3>

          <label style={styles.label}>Patient</label>
          <select
            style={styles.input}
            value={form.patientId}
            onChange={(e) => setForm((prev) => ({ ...prev, patientId: e.target.value }))}
          >
            <option value="">Select patient</option>
            {patients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} {item.email ? `(${item.email})` : ''}
              </option>
            ))}
          </select>

          <label style={styles.label}>Medicine</label>
          <input
            style={styles.input}
            value={form.medicine}
            onChange={(e) => setForm((prev) => ({ ...prev, medicine: e.target.value }))}
            placeholder="e.g., Amoxicillin 500mg"
          />

          <label style={styles.label}>Prescription Notes</label>
          <textarea
            style={{ ...styles.input, minHeight: 140, resize: 'vertical' }}
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
            placeholder="Write diagnosis, dosage, timings, and duration..."
          />

          <div style={styles.actionRow}>
            <button className="doctor-btn doctor-btn-primary" onClick={savePrescription}>
              <FontAwesomeIcon icon={faSave} /> Save Prescription
            </button>
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Recent Prescriptions</h3>
          {savedPrescriptions.length === 0 ? (
            <p style={styles.emptyText}>No prescriptions written yet.</p>
          ) : (
            <div style={styles.listWrap}>
              {savedPrescriptions.slice(0, 15).map((item) => (
                <div key={item.id} style={styles.itemCard}>
                  <div style={styles.itemTop}>
                    <strong><FontAwesomeIcon icon={faUser} /> {item.patientName || 'Patient'}</strong>
                    <span style={styles.badge}>{item.status || 'active'}</span>
                  </div>
                  <p style={styles.itemMeta}>
                    <FontAwesomeIcon icon={faNotesMedical} /> {item.medicine || 'General Prescription'}
                  </p>
                  <p style={styles.itemNotes}>{item.prescription || ''}</p>
                  <p style={styles.itemTime}>
                    <FontAwesomeIcon icon={faClock} /> {new Date(item.date || item.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const styles = {
  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.8rem',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    color: '#1e293b',
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem',
  },
  card: {
    background: 'white',
    borderRadius: '12px',
    padding: '1rem',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    marginTop: 0,
    color: '#0f172a',
  },
  label: {
    display: 'block',
    marginTop: '0.65rem',
    marginBottom: '0.35rem',
    fontWeight: 600,
    color: '#334155',
  },
  input: {
    width: '100%',
    border: '1px solid #cbd5e1',
    borderRadius: '8px',
    padding: '0.65rem 0.75rem',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    boxSizing: 'border-box',
  },
  actionRow: {
    marginTop: '1rem',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  emptyText: {
    color: '#64748b',
  },
  listWrap: {
    display: 'grid',
    gap: '0.65rem',
    maxHeight: '70vh',
    overflow: 'auto',
  },
  itemCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.75rem',
    background: '#f8fafc',
  },
  itemTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
  },
  badge: {
    borderRadius: '999px',
    padding: '0.2rem 0.6rem',
    background: '#dcfce7',
    color: '#166534',
    fontSize: '0.75rem',
    textTransform: 'capitalize',
    fontWeight: 600,
  },
  itemMeta: {
    margin: '0.5rem 0 0.3rem',
    color: '#334155',
  },
  itemNotes: {
    margin: 0,
    color: '#1e293b',
    whiteSpace: 'pre-wrap',
  },
  itemTime: {
    margin: '0.45rem 0 0',
    color: '#64748b',
    fontSize: '0.85rem',
  },
};

export default DoctorPrescriptions;
