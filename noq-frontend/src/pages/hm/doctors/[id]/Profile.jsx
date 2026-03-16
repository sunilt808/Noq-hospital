// pages/hm/doctors/[id]/Profile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUserMd, faStethoscope, faBuilding, faDoorOpen,
  faClock, faRupeeSign, faGraduationCap, faIdCard,
  faEdit, faSave, faArrowLeft, faSpinner,
  faToggleOn, faToggleOff, faExclamationTriangle,
  faCalendarAlt, faHistory
} from '@fortawesome/free-solid-svg-icons';
import firebaseDbService from '../../../../services/firebaseDbService.js';
import api from '../../../../services/api.js';

const DoctorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Doctor data
  const [doctor, setDoctor] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Edit mode
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  
  // Appointment history
  const [appointments, setAppointments] = useState([]);
  
  // Load doctor data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [doctorRes, depts, rms, allTokens] = await Promise.all([
          api.get(`/users/${id}`).catch(() => null),
          firebaseDbService.getCollection('departments'),
          firebaseDbService.getCollection('rooms'),
          firebaseDbService.getCollection('tokens'),
        ]);

        const docData = doctorRes?.data || null;

        if (!docData) {
          navigate('/hm/management/doctors');
          return;
        }

        setDoctor(docData);
        setFormData({
          departmentId: docData.departmentId || '',
          roomId: docData.roomId || '',
          shift: docData.shift || 'morning',
          advancedBookingCategory: docData.advancedBookingCategory || docData.advanced_booking_category || 'general',
          fee: docData.fee || 0,
          status: docData.status || 'active',
        });

        setDepartments(depts);
        setRooms(rms);

        const docAppointments = (allTokens || [])
          .filter((token) =>
            String(token.doctorId || token.doctor_id) === String(docData.id) ||
            (token.doctorName || token.doctor_name) === docData.name
          )
          .map((token, idx) => ({
            id: token.id || `APT-${idx}`,
            date: token.createdAt || token.created_at
              ? new Date(token.createdAt || token.created_at).toISOString().split('T')[0]
              : '-',
            patient: token.patientName || token.patient_name || 'Patient',
            token: token.tokenCode || token.token_code || token.tokenNumber || '-',
            status: token.status || 'waiting',
          }))
          .slice(0, 20);
        setAppointments(docAppointments);
      } catch (err) {
        console.error('Failed to load doctor profile:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [id, navigate]);
  
  // Get available rooms for selected department
  const getAvailableRooms = () => {
    if (!formData.departmentId) return [];
    return rooms.filter(room =>
      String(room.deptId || room.departmentId || '') === String(formData.departmentId) &&
      (room.status === 'available' || String(room.id) === String(doctor?.roomId))
    );
  };
  
  // Get department name
  const getDepartmentName = (deptId) => {
    const dept = departments.find(d => String(d.id) === String(deptId));
    return dept ? dept.name : 'Unknown';
  };
  
  // Get room number
  const getRoomNumber = (roomId) => {
    const room = rooms.find(r => String(r.id) === String(roomId));
    return room ? room.number : 'Unknown';
  };
  
  // Check if doctor has active queue
  const hasActiveQueue = () => false;
  
  // Handle save
  const handleSave = async () => {
    if (!formData.departmentId || !formData.roomId || !formData.shift || !formData.fee) {
      alert('All fields are required');
      return;
    }
    if (hasActiveQueue()) {
      alert('Cannot modify assignment during active queue');
      return;
    }
    setSaving(true);
    try {
      const department = departments.find(dept => String(dept.id) === String(formData.departmentId));
      const room = rooms.find(r => String(r.id) === String(formData.roomId));

      const updatedDoctor = {
        ...doctor,
        departmentId: String(formData.departmentId),
        department_id: String(formData.departmentId),
        roomId: String(formData.roomId),
        room_id: String(formData.roomId),
        roomNo: room ? String(room.number || '') : (doctor.roomNo || ''),
        room_no: room ? String(room.number || '') : (doctor.room_no || ''),
        shift: formData.shift,
        advancedBookingCategory: formData.advancedBookingCategory || 'general',
        advanced_booking_category: formData.advancedBookingCategory || 'general',
        fee: parseFloat(formData.fee),
        status: formData.status,
        departmentName: department ? department.name : (doctor.departmentName || ''),
        department_name: department ? department.name : (doctor.department_name || ''),
        roomNumber: room ? room.number : (doctor.roomNumber || ''),
        updatedAt: new Date().toISOString(),
      };

      await api.patch(`/users/${doctor.id}`, {
        department_id: updatedDoctor.departmentId,
        department_name: updatedDoctor.departmentName,
        room_id: updatedDoctor.roomId,
        room_no: updatedDoctor.roomNo,
        floor: room ? String(room.floor || '1') : String(doctor.floor || '1'),
        advanced_booking_category: updatedDoctor.advancedBookingCategory,
        fee: updatedDoctor.fee,
        status: updatedDoctor.status,
      });

      // Free old room
      if (doctor.roomId && String(doctor.roomId) !== String(formData.roomId)) {
        await firebaseDbService.upsert('rooms', doctor.roomId, { status: 'available', updatedAt: new Date().toISOString() });
        setRooms(prev => prev.map(r => String(r.id) === String(doctor.roomId) ? { ...r, status: 'available' } : r));
      }
      // Occupy new room
      if (formData.roomId) {
        await firebaseDbService.upsert('rooms', formData.roomId, { status: 'occupied', updatedAt: new Date().toISOString() });
        setRooms(prev => prev.map(r => String(r.id) === String(formData.roomId) ? { ...r, status: 'occupied' } : r));
      }

      setDoctor(updatedDoctor);
      setEditMode(false);
      alert('Doctor profile updated successfully');
    } catch (err) {
      alert('Error saving: ' + (err?.message || 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };
  
  // Toggle doctor status
  const toggleStatus = async () => {
    if (hasActiveQueue()) {
      alert('Cannot change status during active queue');
      return;
    }
    const newStatus = doctor.status === 'active' ? 'disabled' : 'active';
    if (!window.confirm(`Are you sure you want to ${newStatus === 'active' ? 'enable' : 'disable'} ${doctor.name}?`)) return;

    try {
      await api.patch(`/users/${doctor.id}`, { status: newStatus });
      setDoctor({ ...doctor, status: newStatus });
    } catch (err) {
      alert('Error updating status: ' + (err?.message || 'Unknown error'));
    }
  };
  
  if (loading) {
    return (
      <div className="loading-container">
        <FontAwesomeIcon icon={faSpinner} spin />
        <p>Loading doctor profile...</p>
      </div>
    );
  }
  
  return (
    <div className="doctor-profile-container">
      {/* Header */}
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate('/hm/management/doctors')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Doctors
        </button>
        <div>
          <h1>Doctor Profile</h1>
          <p className="subtitle">Manage doctor details and assignments</p>
        </div>
        <div className="doctor-status">
          <span className={`status-badge ${doctor.status}`}>
            {doctor.status === 'active' ? 'Active' : 'Disabled'}
          </span>
          <button onClick={toggleStatus} className="toggle-status-btn">
            <FontAwesomeIcon icon={doctor.status === 'active' ? faToggleOff : faToggleOn} />
            {doctor.status === 'active' ? 'Disable' : 'Enable'}
          </button>
        </div>
      </div>
      
      <div className="doctor-profile-content">
        {/* Left Column - Doctor Info */}
        <div className="profile-column">
          <div className="profile-card">
            <div className="profile-header">
              <div className="doctor-avatar">
                <FontAwesomeIcon icon={faUserMd} />
              </div>
              <div>
                <h2>{doctor.name}</h2>
                <p className="specialization">{doctor.specialization}</p>
                <p className="license-id">
                  <FontAwesomeIcon icon={faIdCard} />
                  License: {doctor.license}
                </p>
              </div>
            </div>
            
            <div className="profile-section">
              <h3>Qualifications</h3>
              <div className="qualifications">
                {doctor.qualifications || 'MBBS, MD (General Medicine)'}
              </div>
            </div>
            
            <div className="profile-section">
              <h3>Contact Information</h3>
              <div className="contact-info">
                <div className="info-item">
                  <label>Email:</label>
                  <span>{doctor.email || '-'}</span>
                </div>
                <div className="info-item">
                  <label>Phone:</label>
                  <span>{doctor.phone || '-'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Appointment History */}
          <div className="profile-card">
            <h3>Recent Appointments</h3>
            <div className="appointments-list">
              {appointments.length === 0 ? (
                <div className="appointment-item">No appointments found.</div>
              ) : appointments.map(apt => (
                <div key={apt.id} className="appointment-item">
                  <div className="apt-date">
                    <FontAwesomeIcon icon={faCalendarAlt} />
                    {apt.date}
                  </div>
                  <div className="apt-patient">{apt.patient}</div>
                  <div className="apt-token">{apt.token}</div>
                  <div className={`apt-status ${apt.status}`}>
                    {apt.status}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Right Column - Assignment & Stats */}
        <div className="assignment-column">
          <div className="assignment-card">
            <div className="card-header">
              <h3>Current Assignment</h3>
              {!editMode ? (
                <button className="edit-btn" onClick={() => setEditMode(true)}>
                  <FontAwesomeIcon icon={faEdit} /> Edit Assignment
                </button>
              ) : (
                <div className="edit-actions">
                  <button className="cancel-btn" onClick={() => setEditMode(false)}>
                    Cancel
                  </button>
                  <button className="save-btn" onClick={handleSave} disabled={saving}>
                    {saving ? (
                      <>
                        <FontAwesomeIcon icon={faSpinner} spin />
                        Saving...
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faSave} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {editMode ? (
              <div className="edit-form">
                <div className="form-group">
                  <label>Department</label>
                  <select
                    value={formData.departmentId}
                    onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                    disabled={hasActiveQueue()}
                  >
                    <option value="">Select Department</option>
                    {departments
                      .filter(d => d.status === 'active')
                      .map(dept => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Room</label>
                  <select
                    value={formData.roomId}
                    onChange={(e) => setFormData({ ...formData, roomId: e.target.value })}
                    disabled={hasActiveQueue() || !formData.departmentId}
                  >
                    <option value="">Select Room</option>
                    {getAvailableRooms().map(room => (
                      <option key={room.id} value={room.id}>
                        Room {room.number}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Shift Time</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                    disabled={hasActiveQueue()}
                  >
                    <option value="morning">Morning (9 AM - 2 PM)</option>
                    <option value="afternoon">Afternoon (2 PM - 6 PM)</option>
                    <option value="evening">Evening (6 PM - 9 PM)</option>
                    <option value="full">Full Day (9 AM - 6 PM)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Advanced Booking Category</label>
                  <select
                    value={formData.advancedBookingCategory || 'general'}
                    onChange={(e) => setFormData({ ...formData, advancedBookingCategory: e.target.value })}
                    disabled={hasActiveQueue()}
                  >
                    <option value="general">General / Any</option>
                    <option value="pregnancy">Pregnancy Priority</option>
                    <option value="baby">Baby Priority (0-8)</option>
                    <option value="elder">Elder Priority (70+)</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Consultation Fee (₹)</label>
                  <input
                    type="number"
                    value={formData.fee}
                    onChange={(e) => setFormData({ ...formData, fee: e.target.value })}
                    min="0"
                    disabled={hasActiveQueue()}
                  />
                </div>
                
                <div className="form-group">
                  <label>Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    disabled={hasActiveQueue()}
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                
                {hasActiveQueue() && (
                  <div className="queue-warning">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <span>Cannot modify assignment during active queue</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="assignment-details">
                <div className="detail-item">
                  <FontAwesomeIcon icon={faBuilding} />
                  <div>
                    <label>Department</label>
                    <span>{doctor.departmentName}</span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <FontAwesomeIcon icon={faDoorOpen} />
                  <div>
                    <label>Room</label>
                    <span>Room {doctor.roomNumber}</span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <FontAwesomeIcon icon={faClock} />
                  <div>
                    <label>Shift</label>
                    <span>{doctor.shift}</span>
                  </div>
                </div>

                <div className="detail-item">
                  <FontAwesomeIcon icon={faStethoscope} />
                  <div>
                    <label>Advanced Booking</label>
                    <span>{doctor.advancedBookingCategory || doctor.advanced_booking_category || 'general'}</span>
                  </div>
                </div>
                
                <div className="detail-item">
                  <FontAwesomeIcon icon={faRupeeSign} />
                  <div>
                    <label>Consultation Fee</label>
                    <span>₹{doctor.fee}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Statistics */}
          <div className="stats-card">
            <h3>Performance Statistics</h3>
            <div className="stats-grid">
              <div className="stat-item">
                <div className="stat-value">25</div>
                <div className="stat-label">Patients Today</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">98%</div>
                <div className="stat-label">Satisfaction Rate</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">15m</div>
                <div className="stat-label">Avg. Wait Time</div>
              </div>
              <div className="stat-item">
                <div className="stat-value">₹12,500</div>
                <div className="stat-label">Today's Revenue</div>
              </div>
            </div>
          </div>
          
          {/* Activity Log */}
          <div className="activity-card">
            <h3>Recent Activity</h3>
            <div className="activity-list">
              <div className="activity-item">
                <FontAwesomeIcon icon={faHistory} />
                <div>
                  <div className="activity-text">Profile updated</div>
                  <div className="activity-time">2 hours ago</div>
                </div>
              </div>
              <div className="activity-item">
                <FontAwesomeIcon icon={faHistory} />
                <div>
                  <div className="activity-text">Room assignment changed</div>
                  <div className="activity-time">1 day ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DoctorProfile;