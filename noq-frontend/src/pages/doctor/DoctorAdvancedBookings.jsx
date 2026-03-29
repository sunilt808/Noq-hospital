import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCheckCircle, faClock, faHospital, faNotesMedical, faUser, faUserMd } from '@fortawesome/free-solid-svg-icons';
import { recordHistory } from '../../services/historyService';
import { advancedBookingService } from '../../services/advancedBookingService';
import { useAuth } from '../../context/AuthContext';
import useApiData from '../../hooks/useApiData';

const DoctorAdvancedBookings = () => {
  const { currentUser } = useAuth();
  const { doctors } = useApiData();
  const [doctorId, setDoctorId] = useState('');
  const [bookings, setBookings] = useState([]);

  const load = (resolvedDoctorId) => {
    if (!resolvedDoctorId) return;

    const role = String(currentUser?.role || '').toLowerCase();
    if (role !== 'doctor') return;

    const id = String(resolvedDoctorId);
    setDoctorId(id);

    advancedBookingService
      .getMine((item) => String(item.doctorId || '') === id)
      .then((mine) => {
        const scoped = mine
          .filter((item) => ['allocated', 'in_consultation', 'completed'].includes(String(item.status || '').toLowerCase()))
          .sort((a, b) => new Date(a.appointmentDate || 0) - new Date(b.appointmentDate || 0));
        setBookings(scoped);
      });
  };

  useEffect(() => {
    if (!currentUser || String(currentUser.role || '').toLowerCase() !== 'doctor') return;

    const me =
      doctors.find((item) => String(item.id || '') === String(currentUser.id || '')) ||
      doctors.find((item) => item.email?.toLowerCase() === currentUser.email?.toLowerCase()) ||
      currentUser;

    const id = String(me.id || me.DID || currentUser.id || '');
    load(id);
  }, [currentUser, doctors]);

  const updateStatus = (bookingId, status) => {
    advancedBookingService.updateStatus(bookingId, status).then((updatedItem) => {
      if (!updatedItem) return;
      recordHistory({
        module: 'advanced-booking',
        action: 'doctor-status-updated',
        message: `Advanced booking moved to ${status}`,
        patientId: String(updatedItem.patientId || ''),
        doctorId: String(updatedItem.doctorId || doctorId || ''),
        hospitalId: String(updatedItem.hospitalId || ''),
        appointmentId: String(updatedItem.id || ''),
        meta: { status },
      });
      load(String(updatedItem.doctorId || doctorId || ''));
    });
  };

  const stats = useMemo(() => {
    const allocated = bookings.filter((item) => String(item.status).toLowerCase() === 'allocated').length;
    const inConsultation = bookings.filter((item) => String(item.status).toLowerCase() === 'in_consultation').length;
    const completed = bookings.filter((item) => String(item.status).toLowerCase() === 'completed').length;
    return { total: bookings.length, allocated, inConsultation, completed };
  }, [bookings]);

  const styles = {
    container: { padding: '1.25rem' },
    title: { margin: 0, color: '#0f172a' },
    subtitle: { margin: '4px 0 16px', color: '#64748b' },
    stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 10, marginBottom: 14 },
    statCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
    listCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10 },
    status: { padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: '#e2e8f0', color: '#334155' },
    btn: { border: 'none', borderRadius: 8, padding: '8px 10px', cursor: 'pointer', color: '#fff' },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}><FontAwesomeIcon icon={faUserMd} /> Advanced Bookings</h2>
      <p style={styles.subtitle}>Visible only for bookings allocated to your doctor account.</p>

      <div style={styles.stats}>
        <div style={styles.statCard}><strong>{stats.total}</strong><div>Total</div></div>
        <div style={styles.statCard}><strong>{stats.allocated}</strong><div>Allocated</div></div>
        <div style={styles.statCard}><strong>{stats.inConsultation}</strong><div>In Consultation</div></div>
        <div style={styles.statCard}><strong>{stats.completed}</strong><div>Completed</div></div>
      </div>

      {bookings.length === 0 ? (
        <div style={{ color: '#64748b' }}>No advanced bookings allocated to this doctor.</div>
      ) : (
        bookings.map((item) => (
          <div key={item.id} style={styles.listCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <strong>{item.caseLabel}</strong>
              <span style={styles.status}>{item.status}</span>
            </div>
            <div style={{ marginTop: 8, color: '#334155' }}>
              <FontAwesomeIcon icon={faUser} /> {item.patientName} ({item.patientAge})
            </div>
            <div style={{ marginTop: 4, color: '#334155' }}>
              <FontAwesomeIcon icon={faHospital} /> {item.hospitalName} • {item.room}
            </div>
            <div style={{ marginTop: 4, color: '#475569', fontSize: 13 }}>
              Allocation: {item.allocationMethod || 'manual/default'} • Room Source: {item.roomType || 'default'}
              {item.roomId ? ` • Room ID: ${item.roomId}` : ''}
            </div>
            <div style={{ marginTop: 4, color: '#64748b', fontSize: 13 }}>
              <FontAwesomeIcon icon={faClock} /> {item.appointmentDate}
            </div>
            <div style={{ marginTop: 4, color: '#475569' }}>
              <FontAwesomeIcon icon={faNotesMedical} /> {item.reason || 'No notes'}
            </div>

            {String(item.status).toLowerCase() !== 'completed' && (
              <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button style={{ ...styles.btn, background: '#0ea5e9' }} onClick={() => updateStatus(item.id, 'in_consultation')}>
                  Start Consultation
                </button>
                <button style={{ ...styles.btn, background: '#16a34a' }} onClick={() => updateStatus(item.id, 'completed')}>
                  <FontAwesomeIcon icon={faCheckCircle} /> Mark Completed
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default DoctorAdvancedBookings;
