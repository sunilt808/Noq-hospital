// pages/hm/management/Rooms.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faDoorOpen, faSearch, faPlus, faEdit,
  faTrash, faArrowLeft, faUserMd, faCheckCircle,
  faWrench, faBroom, faBed, faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

const Rooms = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const currentHospitalId = String(currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID || '');
  
  const [rooms, setRooms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ number: '', deptId: '', status: 'available' });

  // CSS Styles
  const styles = {
    container: {
      padding: '1.5rem',
      maxWidth: '1400px',
      margin: '0 auto',
      fontFamily: "'Segoe UI', 'Roboto', sans-serif"
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '2rem',
      flexWrap: 'wrap',
      gap: '1rem'
    },
    backBtn: {
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'all 0.2s'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 0.25rem 0'
    },
    subtitle: {
      color: '#64748b',
      fontSize: '0.95rem',
      margin: '0'
    },
    createBtn: {
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: '600',
      transition: 'background 0.2s'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    statCard: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1.5rem',
      textAlign: 'center',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      transition: 'transform 0.2s'
    },
    statValue: {
      fontSize: '2.5rem',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0.5rem 0'
    },
    statLabel: {
      color: '#64748b',
      fontSize: '0.95rem'
    },
    filtersBar: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1rem',
      marginBottom: '1.5rem',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '1rem',
      alignItems: 'center'
    },
    searchBox: {
      flex: '1',
      minWidth: '300px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem',
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px'
    },
    searchInput: {
      border: 'none',
      background: 'transparent',
      width: '100%',
      fontSize: '0.95rem',
      outline: 'none'
    },
    filterGroup: {
      display: 'flex',
      gap: '0.75rem',
      flexWrap: 'wrap'
    },
    select: {
      padding: '0.75rem',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      background: 'white',
      minWidth: '150px',
      fontSize: '0.95rem',
      cursor: 'pointer'
    },
    listContainer: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1.5rem'
    },
    emptyState: {
      padding: '3rem',
      textAlign: 'center',
      color: '#64748b'
    },
    actionBtn: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      margin: '1rem auto',
      padding: '0.75rem 1.5rem',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontWeight: '500'
    },
    cardsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
      gap: '1.5rem'
    },
    roomCard: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'all 0.2s'
    },
    cardHeader: {
      padding: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      borderBottom: '1px solid #f1f5f9'
    },
    roomIcon: {
      width: '48px',
      height: '48px',
      borderRadius: '10px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '1.25rem',
      flexShrink: '0'
    },
    roomInfo: {
      flex: '1',
      minWidth: '0'
    },
    roomNumber: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 0.25rem 0'
    },
    deptName: {
      color: '#64748b',
      fontSize: '0.875rem',
      margin: '0 0 0.25rem 0'
    },
    roomStatus: {
      fontSize: '0.75rem',
      fontWeight: '600',
      display: 'inline-block',
      padding: '0.25rem 0.75rem',
      borderRadius: '20px'
    },
    roomDetails: {
      padding: '1.25rem',
      borderBottom: '1px solid #f1f5f9'
    },
    doctorAssigned: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem',
      background: '#f0f9ff',
      padding: '1rem',
      borderRadius: '8px'
    },
    doctorName: {
      fontWeight: '600',
      color: '#1e293b',
      fontSize: '0.95rem'
    },
    doctorSpecialty: {
      color: '#64748b',
      fontSize: '0.875rem'
    },
    unassignBtn: {
      marginLeft: 'auto',
      padding: '0.5rem 1rem',
      background: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '0.875rem'
    },
    roomAvailable: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      color: '#10b981'
    },
    statusActions: {
      padding: '1rem',
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      borderBottom: '1px solid #f1f5f9'
    },
    statusBtn: {
      flex: '1',
      minWidth: '120px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.5rem',
      border: '1px solid',
      borderRadius: '6px',
      background: 'white',
      cursor: 'pointer',
      fontSize: '0.875rem',
      transition: 'all 0.2s'
    },
    activeStatus: {
      background: 'rgba(59, 130, 246, 0.1)'
    },
    cardActions: {
      padding: '1rem',
      display: 'flex',
      gap: '0.5rem'
    },
    editBtn: {
      flex: '1',
      padding: '0.75rem',
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    deleteBtn: {
      flex: '1',
      padding: '0.75rem',
      background: '#fee2e2',
      color: '#dc2626',
      border: '1px solid #fecaca',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '0.5rem'
    },
    modalOverlay: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem'
    },
    modal: {
      background: 'white',
      borderRadius: '12px',
      width: '100%',
      maxWidth: '500px',
      maxHeight: '90vh',
      overflow: 'auto'
    },
    modalHeader: {
      padding: '1.5rem',
      borderBottom: '1px solid #e2e8f0',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalTitle: {
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0'
    },
    modalClose: {
      fontSize: '1.5rem',
      background: 'none',
      border: 'none',
      cursor: 'pointer',
      color: '#64748b',
      width: '32px',
      height: '32px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    formGroup: {
      padding: '1.5rem',
      borderBottom: '1px solid #e2e8f0'
    },
    formLabel: {
      display: 'block',
      marginBottom: '0.5rem',
      fontWeight: '500',
      color: '#374151'
    },
    formInput: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '1rem',
      boxSizing: 'border-box'
    },
    statusOptions: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      marginTop: '0.5rem'
    },
    statusOption: {
      flex: '1',
      minWidth: '120px',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      padding: '0.75rem',
      border: '1px solid',
      borderRadius: '8px',
      background: 'white',
      cursor: 'pointer',
      fontSize: '0.875rem'
    },
    activeOption: {
      background: 'rgba(59, 130, 246, 0.1)'
    },
    formActions: {
      padding: '1.5rem',
      display: 'flex',
      gap: '1rem'
    },
    cancelBtn: {
      flex: '1',
      padding: '0.75rem',
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem'
    },
    submitBtn: {
      flex: '1',
      padding: '0.75rem',
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '1rem'
    }
  };

  const statusOptions = [
    { value: 'available', label: 'Available', icon: faCheckCircle, color: '#10b981' },
    { value: 'occupied', label: 'Occupied', icon: faUserMd, color: '#f59e0b' },
    { value: 'maintenance', label: 'Maintenance', icon: faWrench, color: '#ef4444' },
    { value: 'cleaning', label: 'Cleaning', icon: faBroom, color: '#6366f1' }
  ];

  useEffect(() => {
    let active = true;

    const loadRoomData = async () => {
      const [roomRes, departmentRes, backendDoctorRes] = await Promise.all([
        api.get('/rooms').catch(() => ({ data: { rooms: [] } })),
        api.get(`/departments${currentHospitalId ? `?hospital_id=${encodeURIComponent(currentHospitalId)}` : ''}`).catch(() => ({ data: { departments: [] } })),
        api.get(`/users?role=doctor${currentHospitalId ? `&hospital_id=${encodeURIComponent(currentHospitalId)}` : ''}`).catch(() => ({ data: { data: { users: [] } } })),
      ]);

      const roomRows = Array.isArray(roomRes?.data?.rooms) ? roomRes.data.rooms : [];

      if (!active) return;

      const backendDoctors = Array.isArray(backendDoctorRes?.data?.data?.users)
        ? backendDoctorRes.data.data.users
        : Array.isArray(backendDoctorRes?.data?.users)
          ? backendDoctorRes.data.users
          : [];
      const mergedById = new Map();
      [...backendDoctors].forEach((doctor) => {
        const doctorId = String(doctor?.id || doctor?.DID || '').trim();
        if (!doctorId) return;
        const existing = mergedById.get(doctorId) || {};
        mergedById.set(doctorId, { ...existing, ...doctor });
      });

      const normalizedDoctors = Array.from(mergedById.values())
        .map((doctor) => ({
          ...doctor,
          hospitalId: doctor.hospitalId || doctor.hospital_id || doctor.HID || '',
          departmentId: String(doctor.departmentId || doctor.department_id || doctor.deptId || ''),
          departmentName: doctor.departmentName || doctor.department_name || '',
          roomId: doctor.roomId || doctor.room_id || null,
          roomNo: String(doctor.roomNo || doctor.room_no || doctor.roomNumber || ''),
          roomNumber: String(doctor.roomNumber || doctor.room_no || doctor.roomNo || ''),
        }))
        .filter((doctor) => {
          const doctorHospitalId = String(doctor.hospitalId || '');
          return !currentHospitalId || !doctorHospitalId || doctorHospitalId === currentHospitalId;
        });

      setRooms(
        (Array.isArray(roomRows) ? roomRows : []).filter((room) => {
          const roomHospitalId = String(room.hospitalId || room.hospital_id || room.HID || '');
          return !currentHospitalId || !roomHospitalId || roomHospitalId === currentHospitalId;
        })
      );
      const departmentRows = Array.isArray(departmentRes?.data?.departments) ? departmentRes.data.departments : [];
      setDepartments(Array.isArray(departmentRows) ? departmentRows : []);
      setDoctors(normalizedDoctors);
    };

    loadRoomData();
    window.addEventListener('focus', loadRoomData);
    return () => {
      active = false;
      window.removeEventListener('focus', loadRoomData);
    };
  }, [currentHospitalId]);

  const getRoomDoctor = (roomId) => {
    const room = rooms.find((item) => item.id === roomId);
    if (!room) return null;

    const assignedId = room.assignedDoctorId || room.assigned_doctor_id;
    const assignedName = room.assignedDoctorName || room.assigned_doctor_name;

    if (assignedId || assignedName) {
      const matched = assignedId
        ? doctors.find((doctor) => String(doctor.id || '') === String(assignedId))
        : null;
      if (matched) return matched;
      return {
        id: assignedId || `assigned-${room.id}`,
        name: assignedName || 'Assigned Doctor',
        specialization: room.deptName || room.departmentName || room.department_name || 'Doctor',
      };
    }

    const roomNum = String(room.number || room.room_number || '');
    const roomHospId = String(room.hospitalId || room.hospital_id || '');
    return (
      doctors.find((doctor) => String(doctor.roomId || doctor.room_id || '') === String(roomId)) ||
      doctors.find(
        (doctor) =>
          String(doctor.roomNo || doctor.roomNumber || '') === roomNum &&
          String(doctor.hospitalId || doctor.hospital_id || '') === roomHospId
      ) ||
      doctors.find(
        (doctor) => String(doctor.roomNo || doctor.roomNumber || '') === roomNum && roomNum !== ''
      ) ||
      null
    );
  };

  const filteredRooms = rooms.filter(room => {
    const roomNumber = String(room?.number || room?.roomNumber || '').toLowerCase();
    const roomDept = String(room?.deptName || room?.departmentName || '').toLowerCase();
    const searchLower = String(search || '').toLowerCase();
    const matchesSearch = roomNumber.includes(searchLower) || roomDept.includes(searchLower);
    const matchesFilter = filter === 'all' || room.status === filter;
    const matchesDept = deptFilter === 'all' || String(room.deptId || room.departmentId || '') === String(deptFilter);
    return matchesSearch && matchesFilter && matchesDept;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.number.trim()) return alert('Room number is required');
    if (!formData.deptId) return alert('Please select a department');
    
    if (rooms.some(r => r.number === formData.number.trim() && r.id !== editing?.id)) {
      return alert('Room number already exists');
    }
    
    const department = departments.find(d => String(d.id) === String(formData.deptId));
    if (!department) return;
    
    if (editing) {
      const updated = rooms.map(room =>
        room.id === editing.id ? { 
          ...room, 
          number: formData.number.trim(),
          deptId: String(formData.deptId),
          deptName: department.name,
          status: formData.status,
          hospitalId: currentHospitalId,
        } : room
      );
      setRooms(updated);
      const updatedRoom = updated.find((room) => room.id === editing.id);
      if (updatedRoom) {
        await api.put(`/rooms/${updatedRoom.id}`, {
          room_number: updatedRoom.number || updatedRoom.room_number,
          floor: updatedRoom.floor,
          department_id: String(updatedRoom.deptId || updatedRoom.departmentId || updatedRoom.department_id || ''),
          department_name: updatedRoom.deptName || updatedRoom.departmentName || updatedRoom.department_name,
          status: updatedRoom.status,
          hospital_id: updatedRoom.hospitalId || updatedRoom.hospital_id,
          assigned_doctor_id: updatedRoom.assignedDoctorId || updatedRoom.assigned_doctor_id || null,
          assigned_doctor_name: updatedRoom.assignedDoctorName || updatedRoom.assigned_doctor_name || null,
          type: updatedRoom.type,
        }).catch(() => {});
      }
      
      const doctor = getRoomDoctor(editing.id);
      if (doctor) {
        const updatedDoctors = doctors.map(doc =>
          doc.id === doctor.id ? { 
            ...doc, 
            roomId: editing.id,
            roomNo: formData.number,
            roomNumber: formData.number,
            departmentName: department.name
          } : doc
        );
        setDoctors(updatedDoctors);
        const updatedDoctor = updatedDoctors.find((doc) => doc.id === doctor.id);
        if (updatedDoctor) {
          await api.patch(`/users/${updatedDoctor.id}`, {
            name: updatedDoctor.name || null,
            room_id: editing.id,
            room_no: formData.number,
            floor: String(formData.floor || '1'),
            department_name: department.name,
            department_id: String(formData.deptId),
          }).catch(() => {});
        }
      }
    } else {
      const newRoom = {
        id: Date.now(),
        number: formData.number.trim(),
        deptId: String(formData.deptId),
        deptName: department.name,
        status: formData.status,
        hospitalId: currentHospitalId,
        createdAt: new Date().toISOString()
      };
      const updated = [...rooms, newRoom];
      setRooms(updated);
      await api.post('/rooms', {
        room_number: newRoom.number,
        floor: newRoom.floor || '1',
        department_id: String(newRoom.deptId || ''),
        department_name: newRoom.deptName,
        status: newRoom.status,
        hospital_id: newRoom.hospitalId || currentHospitalId,
        type: newRoom.type || 'general',
      }).catch(() => {});
    }
    
    resetForm();
  };

  const deleteRoom = async (id) => {
    const room = rooms.find(r => r.id === id);
    if (!room) {
      alert('Room not found');
      return;
    }
    
    const doctor = getRoomDoctor(id);
    if (doctor) return alert(`Cannot delete room with assigned doctor: ${doctor.name}`);
    
    if (!window.confirm(`Delete room ${room.number}?`)) return;
    
    try {
      await api.delete(`/rooms/${id}`);
      
      // Remove from local state after successful API call
      const updated = rooms.filter(r => r.id !== id);
      setRooms(updated);
      
      alert(`Room ${room.number} deleted successfully`);
    } catch (error) {
      alert(`Failed to delete room: ${error?.message || 'Unknown error'}`);
    }
  };

  const changeStatus = async (id, newStatus) => {
    const room = rooms.find(r => r.id === id);
    if (!room) return;
    
    const doctor = getRoomDoctor(id);
    if (doctor && newStatus !== 'occupied') {
      return alert(`Room is occupied by ${doctor.name}. Unassign doctor first.`);
    }
    
    const updated = rooms.map(r => r.id === id ? { ...r, status: newStatus } : r);
    setRooms(updated);
    const updatedRoom = updated.find((roomItem) => roomItem.id === id);
    if (updatedRoom) {
      await api.put(`/rooms/${updatedRoom.id}`, {
        room_number: updatedRoom.number || updatedRoom.room_number,
        floor: updatedRoom.floor,
        department_id: String(updatedRoom.deptId || updatedRoom.departmentId || updatedRoom.department_id || ''),
        department_name: updatedRoom.deptName || updatedRoom.departmentName || updatedRoom.department_name,
        status: updatedRoom.status,
        hospital_id: updatedRoom.hospitalId || updatedRoom.hospital_id,
        assigned_doctor_id: updatedRoom.assignedDoctorId || updatedRoom.assigned_doctor_id || null,
        assigned_doctor_name: updatedRoom.assignedDoctorName || updatedRoom.assigned_doctor_name || null,
        type: updatedRoom.type,
      }).catch(() => {});
    }
  };

  const editRoom = (room) => {
    setFormData({
      number: room.number,
      deptId: String(room.deptId || room.departmentId || ''),
      status: room.status
    });
    setEditing(room);
    setShowForm(true);
  };

  const unassignDoctor = async (roomId) => {
    const doctor = getRoomDoctor(roomId);
    if (!doctor) return;
    
    if (!window.confirm(`Unassign ${doctor.name} from this room?`)) return;
    
    const updatedDoctors = doctors.map(doc =>
      doc.id === doctor.id ? { ...doc, roomId: null, roomNo: '', roomNumber: '', roomInfo: 'Room not assigned' } : doc
    );
    setDoctors(updatedDoctors);
    const updatedDoctor = updatedDoctors.find((doc) => doc.id === doctor.id);
    if (updatedDoctor) {
      await api.patch(`/users/${updatedDoctor.id}`, {
        name: updatedDoctor.name || null,
        room_id: null,
        room_no: '',
        floor: '',
      }).catch(() => {});
    }

    const clearedRooms = rooms.map((room) =>
      String(room.id) === String(roomId)
        ? { ...room, status: 'available', assignedDoctorId: null, assigned_doctor_id: null, assignedDoctorName: null, assigned_doctor_name: null }
        : room
    );
    setRooms(clearedRooms);
    const targetRoom = clearedRooms.find((room) => String(room.id) === String(roomId));
    if (targetRoom) {
      await api.put(`/rooms/${targetRoom.id}`, {
        room_number: targetRoom.number || targetRoom.room_number,
        floor: targetRoom.floor,
        department_id: String(targetRoom.deptId || targetRoom.departmentId || targetRoom.department_id || ''),
        department_name: targetRoom.deptName || targetRoom.departmentName || targetRoom.department_name,
        status: 'available',
        hospital_id: targetRoom.hospitalId || targetRoom.hospital_id,
        assigned_doctor_id: null,
        assigned_doctor_name: null,
        type: targetRoom.type,
      }).catch(() => {});
    }
  };

  const resetForm = () => {
    setFormData({ number: '', deptId: '', status: 'available' });
    setEditing(null);
    setShowForm(false);
  };

  const stats = {
    total: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/hm/management')}
          onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
          <FontAwesomeIcon icon={faArrowLeft} /> Dashboard
        </button>
        <div>
          <h1 style={styles.title}>Room Management</h1>
          <p style={styles.subtitle}>Manage hospital rooms and assignments</p>
        </div>
        <button style={styles.createBtn} onClick={() => setShowForm(true)}
          onMouseOver={e => e.currentTarget.style.background = '#2563eb'}>
          <FontAwesomeIcon icon={faPlus} /> Add Room
        </button>
      </div>

      <div style={styles.statsGrid}>
        {[
          { icon: faDoorOpen, value: stats.total, label: 'Total Rooms', color: '#3b82f6' },
          { icon: faCheckCircle, value: stats.available, label: 'Available Rooms', color: '#10b981' },
          { icon: faUserMd, value: stats.occupied, label: 'Occupied Rooms', color: '#f59e0b' }
        ].map((stat, idx) => (
          <div key={idx} style={styles.statCard}
            onMouseOver={e => e.currentTarget.style.transform = 'translateY(-2px)'}
            onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
            <FontAwesomeIcon icon={stat.icon} style={{ fontSize: '1.8rem', color: stat.color }} />
            <div style={styles.statValue}>{stat.value}</div>
            <div style={styles.statLabel}>{stat.label}</div>
          </div>
        ))}
      </div>

      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} style={{ color: '#64748b' }} />
          <input type="text" placeholder="Search by room number or department..." 
            style={styles.searchInput} value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        
        <div style={styles.filterGroup}>
          <select style={styles.select} value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">All Status</option>
            {statusOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
          </select>
          
          <select style={styles.select} value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
            <option value="all">All Departments</option>
            {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.listContainer}>
        {filteredRooms.length === 0 ? (
          <div style={styles.emptyState}>
            <FontAwesomeIcon icon={faDoorOpen} style={{ fontSize: '3rem', opacity: 0.3 }} />
            <p>No rooms found</p>
            <button style={styles.actionBtn} onClick={() => setShowForm(true)}>
              <FontAwesomeIcon icon={faPlus} /> Add First Room
            </button>
          </div>
        ) : (
          <div style={styles.cardsGrid}>
            {filteredRooms.map(room => {
              const doctor = getRoomDoctor(room.id);
              const status = statusOptions.find(s => s.value === room.status);
              
              return (
                <div key={room.id} style={styles.roomCard}
                  onMouseOver={e => e.currentTarget.style.transform = 'translateY(-4px)'}
                  onMouseOut={e => e.currentTarget.style.transform = 'translateY(0)'}>
                  <div style={styles.cardHeader}>
                    <div style={{...styles.roomIcon, background: status?.color}}>
                      <FontAwesomeIcon icon={status?.icon} />
                    </div>
                    <div style={styles.roomInfo}>
                      <h3 style={styles.roomNumber}>Room {room.number}</h3>
                      <div style={styles.deptName}>{room.deptName}</div>
                      <span style={{...styles.roomStatus, background: `${status?.color}15`, color: status?.color}}>
                        {status?.label}
                      </span>
                    </div>
                  </div>
                  
                  <div style={styles.roomDetails}>
                    {doctor ? (
                      <div style={styles.doctorAssigned}>
                        <FontAwesomeIcon icon={faUserMd} style={{ color: '#3b82f6' }} />
                        <div>
                          <div style={styles.doctorName}>{doctor.name}</div>
                          <div style={styles.doctorSpecialty}>{doctor.specialization}</div>
                        </div>
                        <button style={styles.unassignBtn} onClick={() => unassignDoctor(room.id)}>
                          Unassign
                        </button>
                      </div>
                    ) : room.status === 'available' ? (
                      <div style={styles.roomAvailable}>
                        <FontAwesomeIcon icon={faCheckCircle} />
                        <span>Available for assignment</span>
                      </div>
                    ) : room.status === 'occupied' ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#f59e0b' }}>
                        <FontAwesomeIcon icon={faUserMd} />
                        <span>Occupied — no doctor linked</span>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: status?.color }}>
                        <FontAwesomeIcon icon={status?.icon} />
                        <span>{room.status === 'maintenance' ? 'Under maintenance' : 'Being cleaned'}</span>
                      </div>
                    )}
                  </div>
                  
                  <div style={styles.statusActions}>
                    {statusOptions.map(opt => (
                      <button key={opt.value} style={{
                        ...styles.statusBtn,
                        ...(room.status === opt.value && styles.activeStatus)
                      }} onClick={() => changeStatus(room.id, opt.value)}
                      disabled={room.status === opt.value || (doctor && opt.value !== 'occupied')}
                      onMouseOver={e => e.currentTarget.style.background = `${opt.color}15`}
                      onMouseOut={e => e.currentTarget.style.background = room.status === opt.value ? `${opt.color}15` : 'white'}>
                        <FontAwesomeIcon icon={opt.icon} style={{ color: opt.color }} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  
                  <div style={styles.cardActions}>
                    <button style={styles.editBtn} onClick={() => editRoom(room)}
                      onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
                      onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
                      <FontAwesomeIcon icon={faEdit} /> Edit
                    </button>
                    <button style={{...styles.deleteBtn, opacity: doctor ? 0.5 : 1, cursor: doctor ? 'not-allowed' : 'pointer'}} 
                      onClick={() => !doctor && deleteRoom(room.id)}
                      disabled={!!doctor}
                      onMouseOver={e => !doctor && (e.currentTarget.style.background = '#fecaca')}
                      onMouseOut={e => !doctor && (e.currentTarget.style.background = '#fee2e2')}>
                      <FontAwesomeIcon icon={faTrash} /> Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editing ? 'Edit Room' : 'Add New Room'}</h3>
              <button style={styles.modalClose} onClick={resetForm}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Room Number *</label>
                <input type="text" placeholder="e.g., 101, ICU-1, OPD-2" required
                  style={styles.formInput} value={formData.number}
                  onChange={(e) => setFormData({ ...formData, number: e.target.value })} />
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Department *</label>
                <select required style={styles.formInput} value={formData.deptId}
                  onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}>
                  <option value="">Select Department</option>
                  {departments.filter(d => d.status === 'active').map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Initial Status</label>
                <div style={styles.statusOptions}>
                  {statusOptions.map(opt => (
                    <button type="button" key={opt.value} style={{
                      ...styles.statusOption,
                      ...(formData.status === opt.value && styles.activeOption)
                    }} onClick={() => setFormData({ ...formData, status: opt.value })}
                    onMouseOver={e => e.currentTarget.style.background = `${opt.color}15`}
                    onMouseOut={e => e.currentTarget.style.background = formData.status === opt.value ? `${opt.color}15` : 'white'}>
                      <FontAwesomeIcon icon={opt.icon} style={{ color: opt.color }} />
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              
              <div style={styles.formActions}>
                <button type="button" style={styles.cancelBtn} onClick={resetForm}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>
                  {editing ? 'Update Room' : 'Create Room'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Rooms;