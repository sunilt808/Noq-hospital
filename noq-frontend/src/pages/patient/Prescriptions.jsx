import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';
import {
  faPrescriptionBottle,
  faMagnifyingGlass,
  faCalendarDays,
  faUserDoctor,
  faNotesMedical,
  faEye,
  faCircleCheck,
  faClock,
} from '@fortawesome/free-solid-svg-icons';

const Prescriptions = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const { patients, prescriptions: rawPrescriptions, loading } = useFirebaseData();
  const [allPrescriptions, setAllPrescriptions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPrescription, setSelectedPrescription] = useState(null);

  const patient = useMemo(() => {
    const matchedPatient =
      patients.find((item) => String(item.id) === String(currentUser?.id)) ||
      patients.find((item) => item.email?.toLowerCase() === currentUser?.email?.toLowerCase());

    if (matchedPatient) {
      return matchedPatient;
    }

    if (currentUser && String(currentUser.role || '').toLowerCase() === 'patient') {
      return currentUser;
    }

    return null;
  }, [patients, currentUser]);

  useEffect(() => {
    if (!authLoading && (!currentUser || String(currentUser.role || '').toLowerCase() !== 'patient')) {
      navigate('/login', { replace: true });
      return;
    }
  }, [authLoading, currentUser, navigate]);

  useEffect(() => {
    if (!patient) return;

    const normalized = rawPrescriptions
      .filter(
        (item) =>
          String(item.patientId || '') === String(patient.id || '') ||
          item.patientEmail?.toLowerCase() === patient.email?.toLowerCase()
      )
      .map((item) => {
        const createdAt = item.date || item.createdAt || new Date().toISOString();
        const text = String(item.prescription || item.instructions || item.notes || '').trim();

        return {
          id: item.id || `RX-${Math.random().toString(36).slice(2, 10)}`,
          doctorName: item.doctorName || item.doctor || 'Doctor',
          hospitalName: item.hospitalName || item.hospital || '',
          createdAt,
          prescriptionText: text || 'Prescription details not provided.',
          medicineName: item.medicine || item.drug || 'General Prescription',
          status: String(item.status || 'active').toLowerCase(),
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    setAllPrescriptions(normalized);
  }, [patient, rawPrescriptions]);

  const filteredPrescriptions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return allPrescriptions;

    return allPrescriptions.filter((item) =>
      [item.doctorName, item.hospitalName, item.medicineName, item.prescriptionText]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [allPrescriptions, searchQuery]);

  const activeCount = useMemo(
    () => allPrescriptions.filter((item) => item.status === 'active').length,
    [allPrescriptions]
  );

  const formatDate = (value) => {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return 'Unknown date';
    return parsed.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading || authLoading || !patient) {
    return (
      <div style={styles.loadingWrap}>
        <div style={styles.spinner} />
        <p>Loading prescriptions...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>
            <FontAwesomeIcon icon={faPrescriptionBottle} /> Prescriptions
          </h2>
          <p style={styles.subtitle}>Prescriptions written by your doctors</p>
        </div>
        <div style={styles.statPill}>
          <FontAwesomeIcon icon={faCircleCheck} /> {activeCount} active
        </div>
      </div>

      <div style={styles.searchBar}>
        <FontAwesomeIcon icon={faMagnifyingGlass} />
        <input
          style={styles.searchInput}
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search doctor, medicine, or notes..."
        />
      </div>

      {filteredPrescriptions.length === 0 ? (
        <div style={styles.emptyState}>
          <FontAwesomeIcon icon={faPrescriptionBottle} size="2x" />
          <h3>No prescriptions found</h3>
          <p>Your doctor-written prescriptions will appear here.</p>
        </div>
      ) : (
        <div style={styles.list}>
          {filteredPrescriptions.map((item) => (
            <div key={item.id} style={styles.card}>
              <div style={styles.cardTop}>
                <div>
                  <h4 style={styles.cardTitle}>{item.medicineName}</h4>
                  <p style={styles.cardMeta}>
                    <FontAwesomeIcon icon={faUserDoctor} /> {item.doctorName}
                    {item.hospitalName ? ` • ${item.hospitalName}` : ''}
                  </p>
                </div>
                <span
                  style={{
                    ...styles.status,
                    ...(item.status === 'active' ? styles.statusActive : styles.statusOther),
                  }}
                >
                  <FontAwesomeIcon icon={item.status === 'active' ? faCircleCheck : faClock} />
                  {item.status}
                </span>
              </div>

              <p style={styles.cardDate}>
                <FontAwesomeIcon icon={faCalendarDays} /> {formatDate(item.createdAt)}
              </p>

              <p style={styles.cardText}>{item.prescriptionText}</p>

              <div style={styles.cardActions}>
                <button style={styles.viewBtn} onClick={() => setSelectedPrescription(item)}>
                  <FontAwesomeIcon icon={faEye} /> View
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedPrescription && (
        <div style={styles.modalOverlay} onClick={() => setSelectedPrescription(null)}>
          <div style={styles.modal} onClick={(event) => event.stopPropagation()}>
            <h3 style={styles.modalTitle}>
              <FontAwesomeIcon icon={faNotesMedical} /> Prescription Details
            </h3>
            <p style={styles.modalMeta}>
              {selectedPrescription.doctorName} • {formatDate(selectedPrescription.createdAt)}
            </p>
            <div style={styles.modalBody}>{selectedPrescription.prescriptionText}</div>
            <button style={styles.closeBtn} onClick={() => setSelectedPrescription(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '1.5rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '0.75rem',
    marginBottom: '1rem',
  },
  title: {
    margin: 0,
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#0f172a',
  },
  subtitle: {
    margin: '0.35rem 0 0',
    color: '#64748b',
  },
  statPill: {
    background: '#dcfce7',
    color: '#166534',
    borderRadius: '999px',
    padding: '0.4rem 0.9rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
  },
  searchBar: {
    border: '1px solid #e2e8f0',
    background: 'white',
    borderRadius: '10px',
    padding: '0.65rem 0.85rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    marginBottom: '1rem',
  },
  searchInput: {
    border: 'none',
    outline: 'none',
    width: '100%',
    fontSize: '0.95rem',
  },
  list: {
    display: 'grid',
    gap: '0.85rem',
  },
  card: {
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    background: 'white',
    padding: '1rem',
  },
  cardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    gap: '0.75rem',
    flexWrap: 'wrap',
  },
  cardTitle: {
    margin: 0,
    color: '#111827',
  },
  cardMeta: {
    margin: '0.25rem 0 0',
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: '0.4rem',
    flexWrap: 'wrap',
  },
  status: {
    borderRadius: '999px',
    padding: '0.25rem 0.65rem',
    fontSize: '0.8rem',
    fontWeight: 600,
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.35rem',
    textTransform: 'capitalize',
  },
  statusActive: {
    background: '#dcfce7',
    color: '#166534',
  },
  statusOther: {
    background: '#e2e8f0',
    color: '#334155',
  },
  cardDate: {
    margin: '0.55rem 0',
    color: '#475569',
    fontSize: '0.9rem',
    display: 'flex',
    gap: '0.4rem',
    alignItems: 'center',
  },
  cardText: {
    margin: 0,
    color: '#1f2937',
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
  },
  cardActions: {
    marginTop: '0.8rem',
    display: 'flex',
    justifyContent: 'flex-end',
  },
  viewBtn: {
    border: '1px solid #dbeafe',
    color: '#1d4ed8',
    background: '#eff6ff',
    borderRadius: '8px',
    padding: '0.45rem 0.8rem',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.45rem',
    fontWeight: 600,
  },
  emptyState: {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '2rem',
    textAlign: 'center',
    color: '#64748b',
  },
  loadingWrap: {
    minHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '0.8rem',
    color: '#64748b',
  },
  spinner: {
    width: '34px',
    height: '34px',
    borderRadius: '999px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    animation: 'spin 1s linear infinite',
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3000,
    padding: '1rem',
  },
  modal: {
    background: 'white',
    borderRadius: '12px',
    width: 'min(700px, 100%)',
    maxHeight: '80vh',
    overflow: 'auto',
    padding: '1rem',
  },
  modalTitle: {
    margin: 0,
    display: 'flex',
    gap: '0.45rem',
    alignItems: 'center',
    color: '#0f172a',
  },
  modalMeta: {
    color: '#64748b',
    margin: '0.45rem 0 0.8rem',
  },
  modalBody: {
    whiteSpace: 'pre-wrap',
    lineHeight: 1.55,
    color: '#1f2937',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '0.85rem',
  },
  closeBtn: {
    marginTop: '0.9rem',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#0f172a',
    borderRadius: '8px',
    padding: '0.45rem 0.9rem',
    cursor: 'pointer',
    fontWeight: 600,
  },
};

export default Prescriptions;
