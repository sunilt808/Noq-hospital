import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import useApiData from '../../hooks/useApiData';
import {
  faChevronLeft,
  faPersonPregnant,
  faBaby,
  faPersonCane,
  faShieldHeart,
  faUserMd,
  faHospital,
  faDoorOpen,
  faCheckCircle,
  faInfoCircle,
} from '@fortawesome/free-solid-svg-icons';
import { recordHistory } from '../../services/historyService';
import { advancedBookingService } from '../../services/advancedBookingService';

const CASE_TYPES = [
  { id: 'pregnancy', label: 'Pregnancy Ladies', icon: faPersonPregnant },
  { id: 'baby', label: 'Babies (0-8 years)', icon: faBaby },
  { id: 'elder', label: 'Olders (70+ years)', icon: faPersonCane },
];

const ROOM_BY_CASE = {
  pregnancy: 'Maternity Priority Room',
  baby: 'Pediatric Priority Room',
  elder: 'Senior Care Priority Room',
};

const DEPARTMENT_BY_CASE = {
  pregnancy: ['gynecology', 'obstetrics', 'maternity', 'women'],
  baby: ['pediatrics', 'pediatric', 'child', 'neonatal'],
  elder: ['geriatrics', 'general', 'internal medicine', 'senior care'],
};

const doctorMatchesCase = (doctor, caseType) => {
  const category = String(doctor?.advancedBookingCategory || doctor?.advanced_booking_category || 'general').toLowerCase();
  if (category === caseType) return true;
  if (category !== 'general' && category !== 'any') return false;

  const text = String(doctor?.specialization || doctor?.department || '').toLowerCase();
  if (caseType === 'pregnancy') return /(gyn|obst|women|maternity)/.test(text);
  if (caseType === 'baby') return /(pedia|child|neonatal)/.test(text);
  if (caseType === 'elder') return /(geriat|general|internal|medicine|senior)/.test(text);
  return false;
};

const isDoctorAvailable = (doctor) => {
  const status = String(doctor?.status || 'active').toLowerCase();
  return !['inactive', 'disabled', 'blocked', 'suspended'].includes(status);
};

const allocateDoctor = (doctorPool, allBookings) => {
  if (!doctorPool.length) return null;

  const loadByDoctor = doctorPool.map((doctor) => {
    const did = String(doctor.id || doctor.DID || '');
    const activeCount = allBookings.filter((item) => {
      const sameDoctor = String(item.doctorId || '') === did;
      const active = ['allocated', 'in_consultation'].includes(String(item.status || '').toLowerCase());
      return sameDoctor && active;
    }).length;
    return { doctor, activeCount };
  });

  loadByDoctor.sort((a, b) => {
    if (a.activeCount !== b.activeCount) return a.activeCount - b.activeCount;
    return String(a.doctor.name || '').localeCompare(String(b.doctor.name || ''));
  });

  return loadByDoctor[0]?.doctor || null;
};

const allocateRoom = (caseType, selectedHospital, selectedDoctor, rooms = []) => {
  const hospitalId = String(selectedHospital?.HID || selectedHospital?.id || '');
  const keywords = DEPARTMENT_BY_CASE[caseType] || [];

  const hospitalRooms = rooms.filter((room) => {
    const roomHospital = String(room.hospitalId || room.HID || '');
    return !hospitalId || !roomHospital || roomHospital === hospitalId;
  });

  const matchingPriorityRoom = hospitalRooms.find((room) => {
    const text = `${room.type || ''} ${room.deptName || ''} ${room.department || ''}`.toLowerCase();
    const isAvailable = String(room.status || 'available').toLowerCase() !== 'occupied';
    return isAvailable && keywords.some((key) => text.includes(key));
  });

  if (matchingPriorityRoom) {
    return {
      roomLabel: `Room ${matchingPriorityRoom.number || matchingPriorityRoom.id}`,
      roomId: String(matchingPriorityRoom.id || ''),
      roomType: 'hospital-room',
    };
  }

  if (selectedDoctor?.roomNo) {
    return {
      roomLabel: `Room ${selectedDoctor.roomNo}${selectedDoctor.floor ? ` - Floor ${selectedDoctor.floor}` : ''}`,
      roomId: String(selectedDoctor.roomId || ''),
      roomType: 'doctor-room',
    };
  }

  return {
    roomLabel: ROOM_BY_CASE[caseType],
    roomId: '',
    roomType: 'priority-fallback',
  };
};

const AdvancedBooking = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const {
    patients,
    hospitals: allHospitals,
    doctors: allDoctors,
    rooms,
    advancedBookings,
    loading,
  } = useApiData();
  const [myBookings, setMyBookings] = useState([]);

  const [form, setForm] = useState({
    caseType: 'pregnancy',
    hospitalId: '',
    appointmentDate: '',
    reason: '',
    acceptTerms: false,
  });

  const patient = useMemo(() => {
    if (!currentUser) return null;
    return (
      patients.find((item) => String(item.id) === String(currentUser.id)) ||
      patients.find((item) => item.email?.toLowerCase() === currentUser.email?.toLowerCase()) ||
      currentUser
    );
  }, [currentUser, patients]);

  const hospitals = useMemo(() => {
    return (allHospitals || []).filter((hospital) => {
      const status = String(hospital.status || '').toLowerCase();
      const isOpenStatus = status.includes('approve') || status === 'active' || status === '';
      const advancedAccess = hospital?.accessConfig?.allowAdvancedBooking !== false;
      return isOpenStatus && advancedAccess;
    });
  }, [allHospitals]);

  const doctors = useMemo(() => Array.isArray(allDoctors) ? allDoctors : [], [allDoctors]);

  useEffect(() => {
    if (!authLoading && (!currentUser || String(currentUser.role || '').toLowerCase() !== 'patient')) {
      navigate('/login', { replace: true });
      return;
    }
  }, [authLoading, currentUser, navigate]);

  useEffect(() => {
    if (!hospitals.length) return;
    setForm((prev) => {
      const currentExists = hospitals.some(
        (hospital) => String(hospital.HID || hospital.id || '') === String(prev.hospitalId || '')
      );
      if (prev.hospitalId && currentExists) return prev;
      return {
        ...prev,
        hospitalId: String(hospitals[0].HID || hospitals[0].id || ''),
      };
    });
  }, [hospitals]);

  useEffect(() => {
    if (!patient?.id && !currentUser?.id) return;

    advancedBookingService
      .getMine((item) => String(item.patientId || '') === String(patient?.id || currentUser?.id || ''))
      .then((mine) => {
        const sorted = [...mine].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        setMyBookings(sorted);
      });
  }, [patient?.id, currentUser?.id]);

  const eligibleDoctors = useMemo(() => {
    const selectedHospital = String(form.hospitalId || '');
    return doctors
      .filter((doctor) => {
        const doctorHospital = String(doctor.hospitalId || doctor.HID || doctor.hospital || '');
        if (doctorHospital && selectedHospital && doctorHospital !== selectedHospital) return false;
        if (!isDoctorAvailable(doctor)) return false;
        return doctorMatchesCase(doctor, form.caseType);
      })
      .sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
  }, [doctors, form.hospitalId, form.caseType]);

  const submitAdvancedBooking = () => {
    if (!patient) return;

    if (!form.acceptTerms) {
      alert('Please accept Terms & Conditions.');
      return;
    }

    if (!form.appointmentDate) {
      alert('Please choose appointment date.');
      return;
    }

    const age = Number(patient.age || 0);
    const gender = String(patient.gender || '').toLowerCase();

    if (form.caseType === 'pregnancy' && gender && !gender.includes('female')) {
      alert('Pregnancy advance booking is available for female patients only.');
      return;
    }
    if (form.caseType === 'baby' && age > 8) {
      alert('Baby case applies only to age 0 to 8 years.');
      return;
    }
    if (form.caseType === 'elder' && age < 70) {
      alert('Elder case applies only to age 70+ years.');
      return;
    }

    const selectedHospital = hospitals.find(
      (hospital) => String(hospital.HID || hospital.id || '') === String(form.hospitalId)
    );

    if (!form.hospitalId) {
      alert('Please select hospital.');
      return;
    }

    const existingBookings = advancedBookings || [];

    const selectedDoctor = allocateDoctor(eligibleDoctors, existingBookings);
    if (!selectedDoctor) {
      alert('No eligible advanced-booking doctor found in this hospital for the selected case.');
      return;
    }

    const roomAllocation = allocateRoom(form.caseType, selectedHospital, selectedDoctor, rooms || []);

    const now = new Date();
    const booking = {
      id: `AB-${Date.now()}`,
      type: 'advanced',
      caseType: form.caseType,
      caseLabel: CASE_TYPES.find((item) => item.id === form.caseType)?.label || form.caseType,
      patientId: patient.id,
      patientName: patient.name || 'Patient',
      patientAge: Number(patient.age || 0),
      patientGender: patient.gender || '',
      hospitalId: String(selectedHospital?.HID || selectedHospital?.id || form.hospitalId),
      hospitalName: selectedHospital?.hospitalName || selectedHospital?.name || 'Hospital',
      doctorId: String(selectedDoctor.id || selectedDoctor.DID || ''),
      doctorName: selectedDoctor.name || 'Doctor',
      doctorSpecialization: selectedDoctor.specialization || selectedDoctor.department || '',
      room: roomAllocation.roomLabel,
      roomId: roomAllocation.roomId,
      roomType: roomAllocation.roomType,
      reason: String(form.reason || '').trim(),
      appointmentDate: form.appointmentDate,
      priority: 'high',
      status: 'allocated',
      allocationMethod: 'auto-doctor-load-balanced',
      allocatedAt: now.toISOString(),
      createdAt: now.toISOString(),
      termsAcceptedAt: now.toISOString(),
      source: 'advanced-booking',
    };

    advancedBookingService.create(booking).then((created) => {
      setMyBookings((prev) => [created, ...prev]);
    });

    recordHistory({
      module: 'advanced-booking',
      action: 'booking-created',
      message: `Advanced booking created for ${booking.caseLabel}`,
      patientId: String(booking.patientId || ''),
      doctorId: String(booking.doctorId || ''),
      hospitalId: String(booking.hospitalId || ''),
      appointmentId: String(booking.id || ''),
      meta: {
        caseType: booking.caseType,
        room: booking.room,
      },
    });

    setForm((prev) => ({ ...prev, reason: '', acceptTerms: false }));
    alert(`Advanced booking allocated to ${booking.doctorName} in ${booking.room}.`);
  };

  const styles = {
    container: { maxWidth: 980, margin: '0 auto', padding: '20px' },
    header: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 },
    backBtn: { border: 'none', background: '#e2e8f0', borderRadius: 8, padding: '8px 12px', cursor: 'pointer' },
    title: { margin: 0, color: '#0f172a' },
    subtitle: { margin: '4px 0 0', color: '#64748b' },
    card: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, marginBottom: 14 },
    row: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 },
    label: { fontSize: 13, color: '#64748b', marginBottom: 6 },
    input: { width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #cbd5e1' },
    caseGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 },
    caseBtn: { border: '1px solid #cbd5e1', borderRadius: 10, padding: 12, cursor: 'pointer', background: '#fff', textAlign: 'left' },
    caseBtnActive: { border: '1px solid #2563eb', background: '#eff6ff' },
    submit: { border: 'none', borderRadius: 10, padding: '11px 16px', cursor: 'pointer', background: '#1d4ed8', color: '#fff', fontWeight: 600 },
    tnc: { fontSize: 13, color: '#475569', lineHeight: 1.6, marginTop: 10 },
    badge: { display: 'inline-block', background: '#dcfce7', color: '#166534', borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 600 },
    bookingCard: { border: '1px solid #e2e8f0', borderRadius: 10, padding: 12, marginTop: 10 },
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/patient/dashboard')}>
          <FontAwesomeIcon icon={faChevronLeft} />
        </button>
        <div>
          <h2 style={styles.title}>Advanced Booking</h2>
          <p style={styles.subtitle}>Priority booking for pregnancy, babies (0-8), and elders (70+).</p>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ marginBottom: 10, fontWeight: 600, color: '#0f172a' }}>
          <FontAwesomeIcon icon={faShieldHeart} /> Choose Case Type
        </div>
        <div style={styles.caseGrid}>
          {CASE_TYPES.map((item) => (
            <button
              key={item.id}
              type="button"
              style={{ ...styles.caseBtn, ...(form.caseType === item.id ? styles.caseBtnActive : {}) }}
              onClick={() => setForm((prev) => ({ ...prev, caseType: item.id }))}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>
                <FontAwesomeIcon icon={item.icon} /> {item.label}
              </div>
              <div style={{ color: '#64748b', fontSize: 13 }}>
                Dedicated doctor + separate room allocation
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={styles.card}>
        <div style={styles.row}>
          <div>
            <div style={styles.label}>Hospital</div>
            <select
              style={styles.input}
              value={form.hospitalId}
              onChange={(e) => setForm((prev) => ({ ...prev, hospitalId: e.target.value }))}
            >
              {hospitals.map((hospital) => {
                const hospitalId = String(hospital.HID || hospital.id || '');
                return (
                  <option key={hospitalId} value={hospitalId}>
                    {hospital.hospitalName || hospital.name || 'Hospital'}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <div style={styles.label}>Appointment Date</div>
            <input
              type="date"
              style={styles.input}
              value={form.appointmentDate}
              min={new Date().toISOString().split('T')[0]}
              onChange={(e) => setForm((prev) => ({ ...prev, appointmentDate: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div style={styles.label}>Reason / Notes</div>
          <textarea
            style={{ ...styles.input, minHeight: 90, resize: 'vertical' }}
            value={form.reason}
            onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))}
            placeholder="Describe the condition briefly"
          />
        </div>

        <div style={{ marginTop: 12, color: '#0f172a', fontSize: 14 }}>
          <FontAwesomeIcon icon={faUserMd} /> Eligible doctors found: <strong>{eligibleDoctors.length}</strong>
        </div>

        {eligibleDoctors[0] && (
          <div style={{ marginTop: 8, fontSize: 14, color: '#334155' }}>
            Allocated doctor preview: <strong>{eligibleDoctors[0].name}</strong> ({eligibleDoctors[0].specialization || 'Specialist'})
          </div>
        )}

        <div style={{ marginTop: 8, fontSize: 14, color: '#334155' }}>
          <FontAwesomeIcon icon={faDoorOpen} /> Separate room: <strong>{ROOM_BY_CASE[form.caseType]}</strong>
        </div>

        <div style={styles.tnc}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => setForm((prev) => ({ ...prev, acceptTerms: e.target.checked }))}
            />
            <span>
              I accept the terms: valid age/gender verification may be requested, false emergency details may lead to restriction,
              hospital may reschedule based on specialist availability, and this booking is for priority care only.
            </span>
          </label>
        </div>

        <div style={{ marginTop: 14 }}>
          <button type="button" style={styles.submit} onClick={submitAdvancedBooking}>
            <FontAwesomeIcon icon={faCheckCircle} /> Confirm Advanced Booking
          </button>
        </div>
      </div>

      <div style={styles.card}>
        <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 8 }}>
          <FontAwesomeIcon icon={faInfoCircle} /> My Advanced Bookings
        </div>
        {myBookings.length === 0 ? (
          <div style={{ color: '#64748b' }}>No advanced bookings yet.</div>
        ) : (
          myBookings.slice(0, 10).map((booking) => (
            <div key={booking.id} style={styles.bookingCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <strong>{booking.caseLabel}</strong>
                <span style={styles.badge}>{booking.status}</span>
              </div>
              <div style={{ marginTop: 6, fontSize: 14, color: '#334155' }}>
                <FontAwesomeIcon icon={faHospital} /> {booking.hospitalName} • <FontAwesomeIcon icon={faUserMd} /> {booking.doctorName}
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: '#64748b' }}>
                {booking.appointmentDate} • {booking.room}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default AdvancedBooking;
