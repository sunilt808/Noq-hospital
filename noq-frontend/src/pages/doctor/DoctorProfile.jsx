import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import doctorService from '../../services/doctorService';
import {
  faArrowLeft, faUserMd, faStethoscope, faBuilding,
  faDoorOpen, faIdCard, faClock, faRupeeSign,
  faPhone, faEnvelope, faCalendar, faAward,
  faShieldAlt, faHistory, faChartLine, faStar,
  faEdit, faQrcode, faUserTie, faCertificate
} from '@fortawesome/free-solid-svg-icons';
import './doctor.css';

const DoctorProfile = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [stats, setStats] = useState({
    totalPatients: 0,
    avgRating: 0,
    completedAppointments: 0
  });

  // Fetch doctor data
  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser || currentUser.role !== 'doctor') {
      navigate('/login', { replace: true });
      return;
    }

    const loadDoctorProfile = async () => {
      try {
        setLoading(true);
        const [doctorData, appointmentsData, reviewsData] = await Promise.all([
          doctorService.getCurrentDoctor(),
          doctorService.getDoctorAppointments(currentUser.id),
          doctorService.getDoctorRevenue() // Use revenue as reviews for now
        ]);

        // Normalize API snake_case fields → component-expected names
        const normalized = doctorData || {};
        normalized.name = normalized.full_name || normalized.name || currentUser?.full_name || currentUser?.name || 'Doctor';
        normalized.roomNumber = normalized.room_no || normalized.roomNumber || null;
        normalized.specialization = normalized.specialization || normalized.department_name || 'General Physician';

        console.log('Doctor data loaded:', normalized);

        setDoctor(Object.keys(normalized).length > 0 ? normalized : currentUser);
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
        setReviews(Array.isArray(reviewsData) ? reviewsData : []);
      } catch (error) {
        console.error('Error loading doctor profile:', error);
        setDoctor(currentUser);
      } finally {
        setLoading(false);
      }
    };

    loadDoctorProfile();
  }, [authLoading, currentUser, navigate]);

  // Calculate doctor stats
  useEffect(() => {
    if (!doctor) return;

    const completedAppointments = appointments.filter(a => a.status === 'completed').length;
    const uniquePatientIds = new Set(appointments.map(a => a.patient_id || a.patientId));
    
    const doctorReviews = Array.isArray(reviews) ? reviews : [];
    const avgRating = doctorReviews.length > 0
      ? (doctorReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / doctorReviews.length).toFixed(1)
      : 0;

    setStats({
      totalPatients: uniquePatientIds.size,
      avgRating: parseFloat(avgRating),
      completedAppointments
    });
  }, [doctor, appointments, reviews]);

  if (!doctor) {
    return (
      <div className="doctor-loading">
        <div className="loading-spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="doctor-portal">
      <header className="doctor-header">
        <div className="doctor-header-left">
          <button 
            className="doctor-btn doctor-btn-secondary"
            onClick={() => navigate('/doctor/dashboard')}
          >
            <FontAwesomeIcon icon={faArrowLeft} /> Back
          </button>
          <div className="doctor-greeting">
            <h1>My Profile</h1>
            <p className="doctor-specialization">
              <FontAwesomeIcon icon={faUserMd} /> Professional Information
            </p>
          </div>
        </div>
      </header>

      <div className="doctor-stats-grid">
        <div className="stat-card blue">
          <FontAwesomeIcon icon={faUserTie} className="stat-icon" />
          <div className="stat-value">{stats.totalPatients}</div>
          <div className="stat-label">Total Patients</div>
        </div>
        
        <div className="stat-card green">
          <FontAwesomeIcon icon={faStar} className="stat-icon" />
          <div className="stat-value">{stats.avgRating}</div>
          <div className="stat-label">Avg Rating</div>
        </div>
        
        <div className="stat-card orange">
          <FontAwesomeIcon icon={faHistory} className="stat-icon" />
          <div className="stat-value">{stats.completedAppointments}</div>
          <div className="stat-label">Completed</div>
        </div>
      </div>

      <div className="doctor-main-content">
        <div className="doctor-left-column">
          <div className="doctor-card">
            <div className="profile-header">
              <div className="doctor-avatar-large">
                <FontAwesomeIcon icon={faUserMd} />
              </div>
              <div className="profile-info">
                <h2>{doctor.name}</h2>
                <p className="specialization">
                  <FontAwesomeIcon icon={faStethoscope} /> {doctor.specialization}
                </p>
                <div className="doctor-id">
                  <FontAwesomeIcon icon={faIdCard} /> ID: {doctor.doctorId || doctor.id || 'Not assigned'}
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3><FontAwesomeIcon icon={faBuilding} /> Department & Schedule</h3>
              <div className="info-grid">
                <div className="info-item">
                  <label>Department:</label>
                  <span>{doctor.department_name || doctor.specialization || 'Not assigned'}</span>
                </div>
                <div className="info-item">
                  <label>Room:</label>
                  <span>{doctor.room_no ? `Room ${doctor.room_no}${doctor.floor ? ` Floor ${doctor.floor}` : ''}` : 'Not assigned'}</span>
                </div>
                <div className="info-item">
                  <label>Shift:</label>
                  <span>{doctor.shift || 'Not assigned'}</span>
                </div>
                <div className="info-item">
                  <label>Consultation Fee:</label>
                  <span>{doctor.fee > 0 ? `₹${doctor.fee}` : 'Not set'}</span>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h3><FontAwesomeIcon icon={faCertificate} /> Qualifications</h3>
              <div className="qualifications">
                <p>{doctor.qualifications || 'Not added'}</p>
                <div className="license">
                  <FontAwesomeIcon icon={faShieldAlt} />
                  <span>License: {doctor.license || 'Not added'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="doctor-right-column">
          <div className="doctor-card">
            <h3><FontAwesomeIcon icon={faChartLine} /> Performance</h3>
            <div className="performance-stats">
              <div className="stat-item">
                <div className="stat-label">Patient Satisfaction</div>
                <div className="stat-bar">
                  <div className="stat-fill" style={{width: '92%'}}></div>
                </div>
                <span className="stat-value">92%</span>
              </div>
              <div className="stat-item">
                <div className="stat-label">On-Time Consultation</div>
                <div className="stat-bar">
                  <div className="stat-fill" style={{width: '88%'}}></div>
                </div>
                <span className="stat-value">88%</span>
              </div>
              <div className="stat-item">
                <div className="stat-label">Follow-up Rate</div>
                <div className="stat-bar">
                  <div className="stat-fill" style={{width: '76%'}}></div>
                </div>
                <span className="stat-value">76%</span>
              </div>
            </div>
          </div>

          <div className="doctor-card">
            <h3><FontAwesomeIcon icon={faClock} /> Schedule</h3>
            <div className="schedule-info">
              <div className="schedule-item">
                <FontAwesomeIcon icon={faCalendar} />
                <div>
                  <strong>Working Hours</strong>
                  <p>{doctor.shift === 'morning' ? '9:00 AM - 2:00 PM' : 
                     doctor.shift === 'evening' ? '4:00 PM - 9:00 PM' : 
                     '9:00 AM - 9:00 PM'}</p>
                </div>
              </div>
              <div className="schedule-item">
                <FontAwesomeIcon icon={faBuilding} />
                <div>
                  <strong>Hospital</strong>
                  <p>{doctor.hospital_name || 'Not assigned'}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="doctor-card">
            <h3><FontAwesomeIcon icon={faAward} /> Achievements</h3>
            <div className="achievements">
              <div className="achievement">
                <FontAwesomeIcon icon={faStar} />
                <span>{stats.completedAppointments > 0 ? `${stats.completedAppointments} completed consultations` : 'No completed consultations yet'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;