import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import doctorService from '../../services/doctorService';
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
  const [form, setForm] = useState({
    patientId: '',
    medicine: '',
    notes: '',
    status: 'active',
  });
  const [patients, setPatients] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser || currentUser.role !== 'doctor') {
      navigate('/login', { replace: true });
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [patientsData, prescriptionsData] = await Promise.all([
          doctorService.getDoctorPatients(currentUser.id),
          doctorService.getDoctorPrescriptions()
        ]);

        setPatients(Array.isArray(patientsData) ? patientsData : []);
        setPrescriptions(Array.isArray(prescriptionsData) ? prescriptionsData : []);
      } catch (error) {
        console.error('Error loading prescriptions:', error);
        setPatients([]);
        setPrescriptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [authLoading, currentUser, navigate]);

  const selectedPatient = patients.find((p) => String(p.id) === String(form.patientId)) || null;

  const savePrescription = async () => {
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

    try {
      const payload = {
        patient_id: form.patientId,
        patient_name: selectedPatient?.name || 'Patient',
        doctor_id: currentUser.id,
        doctor_name: currentUser.name || 'Doctor',
        medicine,
        prescription: notes,
        status: form.status,
        date: new Date().toISOString()
      };

      await doctorService.createPrescription(payload);
      setForm({ patientId: '', medicine: '', notes: '', status: 'active' });
      
      const updatedPrescriptions = await doctorService.getDoctorPrescriptions();
      setPrescriptions(Array.isArray(updatedPrescriptions) ? updatedPrescriptions : []);
      
      alert('Prescription saved successfully.');
    } catch (error) {
      console.error('Error saving prescription:', error);
      alert('Failed to save prescription.');
    }
  };

  if (loading || authLoading) {
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
            onChange={(e) => setForm((prev) => ({ ...prev, patientId:  e.target.value }))}
          >
            <option value="">Select patient</option>
            {patients.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>

          <label style={styles.label}>Medicine</label>
          <input
            style={styles.input}
            type="text"
            placeholder="e.g., Paracetamol 500mg"
            value={form.medicine}
            onChange={(e) => setForm((prev) => ({ ...prev, medicine: e.target.value }))}
          />

          <label style={styles.label}>Prescription Notes</label>
          <textarea
            style={{ ...styles.input, minHeight: '120px' }}
            placeholder="Enter detailed prescription..."
            value={form.notes}
            onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
          />

          <button style={styles.submitBtn} onClick={savePrescription}>
            <FontAwesomeIcon icon={faSave} /> Save Prescription
          </button>
        </div>

        <div style={styles.card}>
          <h3 style={styles.sectionTitle}>Recent Prescriptions</h3>
          {prescriptions.length === 0 ? (
            <p style={styles.emptyMessage}>No prescriptions found</p>
          ) : (
            <div style={styles.prescriptionList}>
              {prescriptions.slice(0, 10).map((rx) => (
                <div key={rx.id} style={styles.prescriptionItem}>
                  <div style={styles.prescriptionHeader}>
                    <strong>{rx.patient_name}</strong>
              <span style={styles.statusBadge}>{rx.status}</span>
                  </div>
                  <p style={styles.prescriptionDetail}>
                    <strong>Medicine:</strong> {rx.medicine}
                  </p>
                  <p style={styles.prescriptionDetail}>
                    <FontAwesomeIcon icon={faClock} /> {new Date(rx.date).toLocaleDateString()}
                  </p>
                  <p style={styles.prescriptionText}>{rx.prescription.substring(0, 100)}...</p>
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
    gap: '1rem',
    marginBottom: '2rem'
  },
  title: {
    margin: 0,
    color: '#333'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
    gap: '2rem'
  },
  card: {
    background: '#fff',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '1.5rem'
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '1rem',
    color: '#333',
    fontSize: '1.2rem'
  },
  label: {
    display: 'block',
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: '#555'
  },
  input: {
    width: '100%',
    padding: '0.75rem',
    marginBottom: '1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '0.95rem',
    fontFamily: 'inherit'
  },
  submitBtn: {
    width: '100%',
    padding: '0.75rem',
    background: '#4CAF50',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '1rem',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'background 0.3s'
  },
  emptyMessage: {
    textAlign: 'center',
    color: '#999',
    margin: '2rem 0'
  },
  prescriptionList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  prescriptionItem: {
    border: '1px solid #eee',
    borderRadius: '4px',
    padding: '1rem',
    background: '#f9f9f9'
  },
  prescriptionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  statusBadge: {
    background: '#4CAF50',
    color: '#fff',
    padding: '0.25rem 0.75rem',
    borderRadius: '20px',
    fontSize: '0.85rem'
  },
  prescriptionDetail: {
    margin: '0.5rem 0',
    color: '#666',
    fontSize: '0.9rem'
  },
  prescriptionText: {
    margin: '0.5rem 0',
    color: '#555',
    fontSize: '0.9rem',
    fontStyle: 'italic'
  }
};

export default DoctorPrescriptions;
