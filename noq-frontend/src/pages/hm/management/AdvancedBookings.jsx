import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendarCheck, faHospital, faUserMd, faUsers } from '@fortawesome/free-solid-svg-icons';
import { advancedBookingService } from '../../../services/advancedBookingService';
import { useAuth } from '../../../context/FirebaseAuthContext';
import firebaseDbService from '../../../services/firebaseDbService';

const AdvancedBookings = () => {
  const { currentUser } = useAuth();
  const [hospitalId, setHospitalId] = useState('');
  const [hospitalName, setHospitalName] = useState('');
  const [bookings, setBookings] = useState([]);

  const load = async () => {
    const [hospitals, doctors] = await Promise.all([
      firebaseDbService.getCollection('hospitals'),
      firebaseDbService.getCollection('users'),
    ]);

    const matchedHospital =
      hospitals.find((item) => String(item.HID || item.id || '') === String(currentUser?.hospitalId || currentUser?.HID || currentUser?.id || '')) ||
      hospitals.find((item) => item.email?.toLowerCase() === currentUser?.email?.toLowerCase()) ||
      null;

    const hid = String(matchedHospital?.HID || matchedHospital?.id || currentUser?.hospitalId || currentUser?.HID || '');
    const hname = matchedHospital?.hospitalName || matchedHospital?.name || currentUser?.hospitalName || 'Hospital';

    setHospitalId(hid);
    setHospitalName(hname);

    const doctorMap = new Map(
      doctors
        .filter((item) => String(item.role || '').toLowerCase() === 'doctor')
        .map((item) => [String(item.id || item.DID || ''), item.name || 'Doctor'])
    );

    advancedBookingService
      .getMine((item) => String(item.hospitalId || '') === hid || String(item.hospitalName || '').toLowerCase() === hname.toLowerCase())
      .then((bookingsList) => {
        const scoped = (bookingsList || [])
          .filter((item) => String(item.hospitalId || '') === hid || String(item.hospitalName || '').toLowerCase() === hname.toLowerCase())
          .filter((item) => String(item.doctorId || '').trim() !== '')
          .map((item) => ({
            ...item,
            doctorName: item.doctorName || doctorMap.get(String(item.doctorId || '')) || 'Doctor',
          }))
          .sort((a, b) => new Date(a.appointmentDate || 0) - new Date(b.appointmentDate || 0));

        setBookings(scoped);
      });
  };

  useEffect(() => {
    load();
    window.addEventListener('focus', load);
    return () => {
      window.removeEventListener('focus', load);
    };
  }, [currentUser]);

  const stats = useMemo(() => {
    const total = bookings.length;
    const completed = bookings.filter((item) => String(item.status || '').toLowerCase() === 'completed').length;
    const active = bookings.filter((item) => ['allocated', 'in_consultation'].includes(String(item.status || '').toLowerCase())).length;
    return { total, completed, active };
  }, [bookings]);

  const styles = {
    container: { padding: '1.25rem' },
    title: { margin: 0, color: '#0f172a' },
    subtitle: { margin: '4px 0 14px', color: '#64748b' },
    stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: 10, marginBottom: 14 },
    statCard: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12 },
    item: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginBottom: 10 },
    status: { padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 600, background: '#dbeafe', color: '#1d4ed8' },
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}><FontAwesomeIcon icon={faCalendarCheck} /> Advanced Bookings</h2>
      <p style={styles.subtitle}>Hospital view (allocated-doctor records only): {hospitalName || hospitalId}</p>

      <div style={styles.stats}>
        <div style={styles.statCard}><strong>{stats.total}</strong><div>Total</div></div>
        <div style={styles.statCard}><strong>{stats.active}</strong><div>Active</div></div>
        <div style={styles.statCard}><strong>{stats.completed}</strong><div>Completed</div></div>
      </div>

      {bookings.length === 0 ? (
        <div style={{ color: '#64748b' }}>No allocated advanced bookings for this hospital.</div>
      ) : (
        bookings.map((item) => (
          <div key={item.id} style={styles.item}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <strong>{item.caseLabel}</strong>
              <span style={styles.status}>{item.status}</span>
            </div>
            <div style={{ marginTop: 6, color: '#334155' }}><FontAwesomeIcon icon={faUsers} /> {item.patientName}</div>
            <div style={{ marginTop: 4, color: '#334155' }}><FontAwesomeIcon icon={faUserMd} /> {item.doctorName}</div>
            <div style={{ marginTop: 4, color: '#334155' }}><FontAwesomeIcon icon={faHospital} /> {item.room} • {item.appointmentDate}</div>
            <div style={{ marginTop: 4, color: '#475569', fontSize: 13 }}>
              Allocation: {item.allocationMethod || 'manual/default'} • Room Source: {item.roomType || 'default'}
              {item.roomId ? ` • Room ID: ${item.roomId}` : ''}
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default AdvancedBookings;
