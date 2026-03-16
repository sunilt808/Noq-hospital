// ...existing code...
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordHistory } from '../../../services/historyService';
import api from '../../../services/api';
import { useAuth } from '../../../context/FirebaseAuthContext';
import firebaseDbService from '../../../services/firebaseDbService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faUserMd, faSearch, faPlus, faEdit, faTrash, faToggleOn, faToggleOff, faEye, 
  faArrowLeft, faDoorOpen, faBuilding, faTimes, faKey, faCopy, faCheck, faIdCard,
  faStar, faAward, faCalendar, faClock, faRupeeSign, faStethoscope, faUserTie,
  faPhone, faEnvelope, faMapMarker, faBed, faLayerGroup, faTags, faCertificate,
  faLock, faShieldAlt
} from '@fortawesome/free-solid-svg-icons';

const Doctors = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const currentHospitalId = String(currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID || '');
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedDept, setSelectedDept] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [showCredentials, setShowCredentials] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    specialization: '',
    license: '',
    departmentId: '',
    roomNo: '',
    floor: '1',
    shift: 'morning',
    advancedBookingCategory: 'general',
    fee: '',
    phone: '',
    email: '',
    experience: '',
    qualifications: '',
    category: 'general',
    promotionLabel: '',
    status: 'active',
    generateLogin: true,
    customPassword: ''
  });

  // Promotion labels
  const promotionLabels = [
    { id: 'senior', label: 'Senior Consultant', color: '#dc2626', icon: faUserTie },
    { id: 'specialist', label: 'Specialist', color: '#3b82f6', icon: faStethoscope },
    { id: 'head', label: 'Department Head', color: '#7c3aed', icon: faAward },
    { id: 'professor', label: 'Professor', color: '#059669', icon: faCertificate },
    { id: 'visiting', label: 'Visiting Doctor', color: '#f59e0b', icon: faCalendar }
  ];

  // Doctor categories
  const doctorCategories = [
    { id: 'general', label: 'General Physician', color: '#3b82f6' },
    { id: 'specialist', label: 'Specialist', color: '#8b5cf6' },
    { id: 'surgeon', label: 'Surgeon', color: '#ef4444' },
    { id: 'consultant', label: 'Consultant', color: '#10b981' },
    { id: 'senior', label: 'Senior Consultant', color: '#f59e0b' },
    { id: 'resident', label: 'Resident Doctor', color: '#6366f1' },
    { id: 'visiting', label: 'Visiting Doctor', color: '#8b5cf6' }
  ];

  const advancedBookingCategories = [
    { id: 'general', label: 'General / Any' },
    { id: 'pregnancy', label: 'Pregnancy Priority' },
    { id: 'baby', label: 'Baby Priority (0-8)' },
    { id: 'elder', label: 'Elder Priority (70+)' },
  ];

  // Room numbers (1-50)
  const roomNumbers = Array.from({length: 50}, (_, i) => (i + 1).toString());
  const floors = ['Ground', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

  useEffect(() => {
    let active = true;

    const loadDoctorData = async () => {
      const [doctorRows, backendDoctorRes, departmentRows, roomRes, hospitalRows] = await Promise.all([
        firebaseDbService.getCollection('doctors'),
        api.get('/users?role=doctor').catch(() => ({ data: { users: [] } })),
        firebaseDbService.getCollection('departments'),
        api.get('/rooms').catch(() => ({ data: { rooms: [] } })),
        firebaseDbService.getCollection('hospitals'),
      ]);
  const roomRows = Array.isArray(roomRes?.data?.rooms) ? roomRes.data.rooms : [];


      if (!active) return;

      const backendDoctors = Array.isArray(backendDoctorRes?.data?.users) ? backendDoctorRes.data.users : [];
      const mergedById = new Map();
      [...backendDoctors, ...(Array.isArray(doctorRows) ? doctorRows : [])].forEach((doctor) => {
        const doctorId = String(doctor?.id || doctor?.DID || '').trim();
        if (!doctorId) return;
        const existing = mergedById.get(doctorId) || {};
        mergedById.set(doctorId, { ...existing, ...doctor });
      });

      const normalizedDoctors = Array.from(mergedById.values())
        .map((doctor) => ({
          ...doctor,
          hospitalId: doctor.hospitalId || doctor.hospital_id || doctor.HID || '',
          hospitalName: doctor.hospitalName || doctor.hospital_name || '',
          departmentId: String(doctor.departmentId || doctor.department_id || doctor.deptId || ''),
          departmentName: doctor.departmentName || doctor.department_name || '',
          roomNo: String(doctor.roomNo || doctor.room_no || doctor.roomNumber || ''),
          roomNumber: String(doctor.roomNumber || doctor.room_no || doctor.roomNo || ''),
          roomId: doctor.roomId || doctor.room_id || null,
          advancedBookingCategory: doctor.advancedBookingCategory || doctor.advanced_booking_category || 'general',
          promotionLabel: doctor.promotionLabel || doctor.promotion_label || '',
        }))
        .filter((doctor) => {
          const hospitalId = String(doctor.hospitalId || '');
          return !currentHospitalId || !hospitalId || hospitalId === currentHospitalId;
        });

      setDoctors(normalizedDoctors);
      setDepartments((Array.isArray(departmentRows) ? departmentRows : []).filter(d => d.status === 'active'));
      setRooms(
        (Array.isArray(roomRows) ? roomRows : []).filter((room) => {
          const hospitalId = String(room.hospitalId || room.hospital_id || room.HID || '');
          return !currentHospitalId || !hospitalId || hospitalId === currentHospitalId;
        })
      );
      setHospitals(Array.isArray(hospitalRows) ? hospitalRows : []);
    };

    loadDoctorData();
    window.addEventListener('focus', loadDoctorData);
    return () => {
      active = false;
      window.removeEventListener('focus', loadDoctorData);
    };
  }, [currentHospitalId]);

  const filteredDoctors = doctors.filter(doctor => {
    const doctorName = String(doctor?.name || '').toLowerCase();
    const doctorSpecialization = String(doctor?.specialization || '').toLowerCase();
    const doctorLicense = String(doctor?.license || '');
    const doctorPromotion = String(doctor?.promotionLabel || '').toLowerCase();
    const searchLower = String(search || '').toLowerCase();

    const matchesSearch = doctorName.includes(searchLower) ||
                         doctorSpecialization.includes(searchLower) ||
                         doctorLicense.includes(search) ||
                         doctorPromotion.includes(searchLower);
    const matchesStatus = filter === 'all' || doctor.status === filter;
    const matchesDept = selectedDept === 'all' || String(doctor.departmentId || '') === String(selectedDept);
    return matchesSearch && matchesStatus && matchesDept;
  });

  const stats = {
    total: doctors.length,
    active: doctors.filter(d => d.status === 'active').length,
    departments: [...new Set(doctors.map(d => d.departmentId))].length,
    specialists: doctors.filter(d => d.category === 'specialist' || d.category === 'senior').length,
    withPromotion: doctors.filter(d => d.promotionLabel).length
  };

  const getDeptName = (deptId) => {
    const dept = departments.find(d => String(d.id) === String(deptId));
    return dept ? dept.name : 'Unknown';
  };

  const getRoomInfo = (roomId) => {
    const room = rooms.find(r => r.id === roomId);
    return room ? `Room ${room.number} - Floor ${room.floor}` : 'Not assigned';
  };

  const generateDoctorEmail = (name) => {
    const cleanName = name.toLowerCase()
      .replace(/dr\.?\s*/gi, '')
      .replace(/\s+/g, '.')
      .replace(/[^a-z.]/g, '');
    return `${cleanName}@${getHospitalDomain()}`;
  };

  const getHospitalDomain = () => {
    const hospitalName = currentUser?.hospitalName || 'hospital';
    return `${hospitalName.toLowerCase().replace(/\s+/g, '')}.com`;
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }; // Fixed: Added missing closing brace

  const generateDoctorId = (name) => {
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase();
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `DOC-${initials}-${randomNum}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.license || !formData.departmentId || !formData.roomNo) {
      alert('Please fill all required fields');
      return;
    }

    const deptName = getDeptName(formData.departmentId);
    const roomInfo = `Room ${formData.roomNo} - Floor ${formData.floor}`;
    const doctorId = generateDoctorId(formData.name);

    const resolvedHospital =
      hospitals.find((hospital) => String(hospital.HID || hospital.id) === String(currentUser.hospitalId || currentUser.HID || '')) ||
      hospitals.find((hospital) => String(hospital.email || '').toLowerCase() === String(currentUser.email || '').toLowerCase()) ||
      null;

    const resolvedHospitalId = String(
      resolvedHospital?.HID ||
      resolvedHospital?.id ||
      currentUser.hospitalId ||
      currentUser.hospital_id ||
      currentUser.HID ||
      ''
    );

    const resolvedHospitalName =
      resolvedHospital?.hospitalName ||
      resolvedHospital?.hospital_name ||
      resolvedHospital?.name ||
      currentUser.hospitalName ||
      '';

    if (!resolvedHospitalId) {
      alert('Hospital ID could not be resolved for this HM account. Please log in again and retry.');
      return;
    }

    // Check if room is already occupied
    const isRoomOccupied = doctors.some(doc => 
      doc.roomNo === formData.roomNo && doc.floor === formData.floor && doc.id !== editing?.id
    );
    
    if (isRoomOccupied) {
      alert(`Room ${formData.roomNo} on Floor ${formData.floor} is already occupied!`);
      return;
    }

    let credentials = null;
    if (formData.generateLogin && !editing) {
      if (formData.customPassword?.trim() && formData.customPassword.trim().length < 6) {
        alert('Custom password must be at least 6 characters.');
        return;
      }

      credentials = {
        email: formData.email || generateDoctorEmail(formData.name),
        password: formData.customPassword?.trim() || generatePassword(),
        doctorId: doctorId
      };
      setGeneratedCredentials(credentials);
      setShowCredentials(true);
    }

    if (editing) {
      const oldRoomNo = String(editing.roomNo || '');
      const oldFloor = String(editing.floor || '1');
      const newRoomNo = String(formData.roomNo || '');
      const newFloor = String(formData.floor || '1');

      const matchedTargetRoom = rooms.find((room) =>
        String(room.number) === newRoomNo &&
        String(room.floor || '1') === newFloor &&
        (!room.hospitalId || String(room.hospitalId) === resolvedHospitalId)
      );

      const targetRoomId = matchedTargetRoom?.id || editing.roomId || null;

      const updated = doctors.map(d => 
        d.id === editing.id ? { 
          ...d, 
          ...formData,
          departmentName: deptName,
          roomInfo: roomInfo,
          hospitalId: d.hospitalId || resolvedHospitalId,
          hospitalName: d.hospitalName || resolvedHospitalName,
          departmentId: String(formData.departmentId),
          advancedBookingCategory: formData.advancedBookingCategory || 'general',
          roomNo: formData.roomNo,
          floor: formData.floor,
          roomId: targetRoomId,
          fee: parseFloat(formData.fee),
          experience: parseInt(formData.experience) || 0, // Fixed: changed exexperience to experience
          email: formData.email || d.email
        } : d
      );
      setDoctors(updated);
      const updatedDoctor = updated.find((doctor) => doctor.id === editing.id);
      if (updatedDoctor) {
        await firebaseDbService.upsert('doctors', updatedDoctor.id, updatedDoctor);
        await api.patch(`/users/${updatedDoctor.id}`, {
          specialization: updatedDoctor.specialization || null,
          hospital_name: updatedDoctor.hospitalName || null,
          department_id: String(updatedDoctor.departmentId || ''),
          department_name: updatedDoctor.departmentName || null,
          room_id: updatedDoctor.roomId ? String(updatedDoctor.roomId) : null,
          room_no: String(updatedDoctor.roomNo || ''),
          floor: String(updatedDoctor.floor || '1'),
          license: updatedDoctor.license || null,
          advanced_booking_category: updatedDoctor.advancedBookingCategory || 'general',
          fee: Number(updatedDoctor.fee || 0),
          experience: Number(updatedDoctor.experience || 0),
          qualifications: updatedDoctor.qualifications || null,
          category: updatedDoctor.category || null,
          promotion_label: updatedDoctor.promotionLabel || null,
          status: updatedDoctor.status || 'active',
        }).catch(() => {});
      }
      
      // Update room status
      const updatedRooms = rooms.map(room => {
        const roomHospitalMatch = !room.hospitalId || String(room.hospitalId) === resolvedHospitalId;
        const isOldRoom =
          String(room.number) === oldRoomNo &&
          String(room.floor || '1') === oldFloor &&
          roomHospitalMatch;

        if (isOldRoom && !(oldRoomNo === newRoomNo && oldFloor === newFloor)) {
          const occupiedByAnotherDoctor = updated.some(
            (doctor) =>
              doctor.id !== editing.id &&
              String(doctor.roomNo || '') === oldRoomNo &&
              String(doctor.floor || '1') === oldFloor &&
              (!doctor.hospitalId || String(doctor.hospitalId) === resolvedHospitalId)
          );

          if (!occupiedByAnotherDoctor) {
            return { ...room, status: 'available' };
          }
        }

        if (
          String(room.number) === newRoomNo &&
          String(room.floor || '1') === newFloor &&
          roomHospitalMatch
        ) {
          return {
            ...room,
            status: 'occupied',
            deptId: String(formData.departmentId),
            deptName,
            hospitalId: room.hospitalId || resolvedHospitalId,
            assignedDoctorId: String(editing.id || ''),
            assignedDoctorName: formData.name || editing.name || '',
          };
        }
        return room;
      });

      if (!matchedTargetRoom) {
        updatedRooms.push({
          id: Date.now(),
          number: newRoomNo,
          floor: newFloor,
          deptId: String(formData.departmentId),
          deptName,
          hospitalId: resolvedHospitalId,
          status: 'occupied',
          assignedDoctorId: String(editing.id || ''),
          assignedDoctorName: formData.name || editing.name || '',
          type: 'doctor',
          createdAt: new Date().toISOString(),
        });
      }

      setRooms(updatedRooms);
      await Promise.all(
        updatedRooms.map((room) =>
          api.put(`/rooms/${room.id}`, {
            number: room.number,
            floor: room.floor,
            deptId: room.deptId,
            deptName: room.deptName,
            status: room.status,
            hospitalId: room.hospitalId,
            assignedDoctorId: room.assignedDoctorId,
            assignedDoctorName: room.assignedDoctorName,
            type: room.type,
          }).catch(() => {})
        )
      );
    } else {
      let backendDoctorId = null;
      let finalDoctorRecord = null;

      if (credentials) {
        try {
          const response = await api.post('/users/create', {
            name: formData.name,
            email: credentials.email,
            role: 'doctor',
            phone: formData.phone || null,
            password: credentials.password,
            hospital_id: resolvedHospitalId,
            hospital_name: resolvedHospitalName,
            specialization: formData.specialization || null,
            department_id: String(formData.departmentId || ''),
            department_name: deptName,
            room_no: String(formData.roomNo || ''),
            floor: String(formData.floor || '1'),
            room_id: null,
            license: formData.license || null,
            advanced_booking_category: formData.advancedBookingCategory || 'general',
            fee: parseFloat(formData.fee) || 0,
            experience: parseInt(formData.experience) || 0,
            qualifications: formData.qualifications || null,
            category: formData.category || 'general',
            promotion_label: formData.promotionLabel || null,
            status: formData.status || 'active',
          });
          backendDoctorId = response?.data?.id || null;
        } catch (_) {
          backendDoctorId = null;
        }
      }

      const newDoctor = {
        id: backendDoctorId || Date.now(),
        ...formData,
        departmentName: deptName,
        hospitalId: resolvedHospitalId,
        hospitalName: resolvedHospitalName,
        roomInfo: roomInfo,
        departmentId: String(formData.departmentId),
        roomNo: formData.roomNo,
        floor: formData.floor,
        advancedBookingCategory: formData.advancedBookingCategory || 'general',
        fee: parseFloat(formData.fee),
        doctorId: doctorId,
        email: formData.email || credentials?.email || '',
        password: credentials?.password || '',
        experience: parseInt(formData.experience) || 0,
        createdAt: new Date().toISOString(),
        roomId: Date.now() + 1000 // Temporary room ID
      };
      
      const updated = [...doctors, newDoctor];
      setDoctors(updated);
      await firebaseDbService.upsert('doctors', newDoctor.id, newDoctor);
      
      // Create/update room entry
      const existingRoom = rooms.find(r =>
        String(r.number) === String(formData.roomNo) &&
        String(r.floor || '1') === String(formData.floor || '1') &&
        (!r.hospitalId || String(r.hospitalId) === resolvedHospitalId)
      );
      let updatedRooms = [...rooms];
      
      if (existingRoom) {
        updatedRooms = updatedRooms.map(room => 
          room.id === existingRoom.id ? { 
            ...room, 
            status: 'occupied', 
            deptId: String(formData.departmentId),
            deptName: deptName,
            hospitalId: resolvedHospitalId,
            assignedDoctorId: String(newDoctor.id || ''),
            assignedDoctorName: newDoctor.name || ''
          } : room
        );

        const updatedDoctorsWithRoom = updated.map((doctor) =>
          doctor.id === newDoctor.id
            ? { ...doctor, roomId: existingRoom.id }
            : doctor
        );
        setDoctors(updatedDoctorsWithRoom);
        const roomDoctor = updatedDoctorsWithRoom.find((doctor) => doctor.id === newDoctor.id);
        finalDoctorRecord = roomDoctor || null;
        if (roomDoctor) {
          await firebaseDbService.upsert('doctors', roomDoctor.id, roomDoctor);
        }
      } else {
        const newRoom = {
          id: Date.now(),
          number: formData.roomNo,
          floor: formData.floor,
          deptId: String(formData.departmentId),
          deptName: deptName,
          hospitalId: resolvedHospitalId,
          status: 'occupied',
          assignedDoctorId: String(newDoctor.id || ''),
          assignedDoctorName: newDoctor.name || '',
          type: 'doctor',
          createdAt: new Date().toISOString()
        };
        updatedRooms.push(newRoom);

        const updatedDoctorsWithRoom = updated.map((doctor) =>
          doctor.id === newDoctor.id
            ? { ...doctor, roomId: newRoom.id }
            : doctor
        );
        setDoctors(updatedDoctorsWithRoom);
        const roomDoctor = updatedDoctorsWithRoom.find((doctor) => doctor.id === newDoctor.id);
        finalDoctorRecord = roomDoctor || null;
        if (roomDoctor) {
          await firebaseDbService.upsert('doctors', roomDoctor.id, roomDoctor);
        }
      }
      
      setRooms(updatedRooms);
      await Promise.all(
        updatedRooms.map((room) =>
          api.put(`/rooms/${room.id}`, {
            number: room.number,
            floor: room.floor,
            deptId: room.deptId,
            deptName: room.deptName,
            status: room.status,
            hospitalId: room.hospitalId,
            assignedDoctorId: room.assignedDoctorId,
            assignedDoctorName: room.assignedDoctorName,
            type: room.type,
          }).catch(() => {})
        )
      );

      if (backendDoctorId) {
        const doctorForBackend = finalDoctorRecord || newDoctor;
        await api.patch(`/users/${backendDoctorId}`, {
          specialization: doctorForBackend.specialization || null,
          hospital_name: doctorForBackend.hospitalName || null,
          department_id: String(doctorForBackend.departmentId || ''),
          department_name: doctorForBackend.departmentName || null,
          room_id: doctorForBackend.roomId ? String(doctorForBackend.roomId) : null,
          room_no: String(doctorForBackend.roomNo || ''),
          floor: String(doctorForBackend.floor || '1'),
          license: doctorForBackend.license || null,
          advanced_booking_category: doctorForBackend.advancedBookingCategory || 'general',
          fee: Number(doctorForBackend.fee || 0),
          experience: Number(doctorForBackend.experience || 0),
          qualifications: doctorForBackend.qualifications || null,
          category: doctorForBackend.category || null,
          promotion_label: doctorForBackend.promotionLabel || null,
          status: doctorForBackend.status || 'active',
        }).catch(() => {});
      }

      // Save doctor credentials for login
      if (credentials) {
        const doctorUser = {
          id: newDoctor.id,
          doctorId: doctorId,
          name: formData.name,
          email: credentials.email,
          password: credentials.password,
          specialization: formData.specialization,
          advancedBookingCategory: formData.advancedBookingCategory || 'general',
          hospitalId: resolvedHospitalId,
          hospitalName: resolvedHospitalName,
          departmentId: String(formData.departmentId),
          departmentName: deptName,
          status: 'active',
          createdAt: new Date().toISOString()
        };

        await firebaseDbService.upsert('doctorUsers', doctorUser.id, doctorUser);
      }
    }
    
    if (!formData.generateLogin || editing) {
      resetForm();
    }

    if (editing) {
      recordHistory({
        action: 'doctor_updated',
        module: 'doctors',
        message: `Updated doctor ${formData.name} (${formData.specialization})`,
        actorRole: 'hm',
        hospitalId: String(currentUser.hospitalId || currentUser.HID || ''),
        doctorId: String(editing.id || ''),
        meta: { name: formData.name, specialization: formData.specialization, department: getDeptName(formData.departmentId) },
      });
    } else {
      recordHistory({
        action: 'doctor_added',
        module: 'doctors',
        message: `Added new doctor ${formData.name} (${formData.specialization})`,
        actorRole: 'hm',
        hospitalId: String(currentUser.hospitalId || currentUser.HID || ''),
        meta: { name: formData.name, specialization: formData.specialization, department: getDeptName(formData.departmentId) },
      });
    }
  };

  const toggleDoctorStatus = async (id) => {
    const doctor = doctors.find(d => d.id === id);
    if (!doctor) return;
    
    const newStatus = doctor.status === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'active' ? 'enable' : 'disable';
    
    if (!window.confirm(`Are you sure you want to ${action} ${doctor.name}?`)) return;
    
    const updated = doctors.map(d => 
      d.id === id ? { ...d, status: newStatus } : d
    );
    
    setDoctors(updated);
    const updatedDoctor = updated.find((doctor) => doctor.id === id);
    if (updatedDoctor) {
      await firebaseDbService.upsert('doctors', updatedDoctor.id, updatedDoctor);
      await api.patch(`/users/${updatedDoctor.id}`, { status: newStatus }).catch(() => {});
    }
    recordHistory({
      action: `doctor_${action}d`,
      module: 'doctors',
      message: `${action === 'enable' ? 'Enabled' : 'Disabled'} doctor ${doctor.name} (${doctor.specialization})`,
      actorRole: 'hm',
      hospitalId: String(doctor.hospitalId || currentUser.hospitalId || ''),
      doctorId: String(id),
      meta: { name: doctor.name, specialization: doctor.specialization, newStatus },
    });

    const doctorUsers = await firebaseDbService.getCollection('doctorUsers');
    const updatedUsers = doctorUsers.map(user => 
      user.id === id ? { ...user, status: newStatus } : user
    );
    const updatedUser = updatedUsers.find((user) => user.id === id);
    if (updatedUser) {
      await firebaseDbService.upsert('doctorUsers', updatedUser.id, updatedUser);
    }
  };

  const deleteDoctor = async (id) => {
    const doctor = doctors.find(d => d.id === id);
    if (!doctor) return;
    
    if (!window.confirm(`Delete ${doctor.name} permanently?`)) return;
    
    const updated = doctors.filter(d => d.id !== id);
    setDoctors(updated);
    await api.delete(`/users/${id}`).catch(() => {});
    await firebaseDbService.remove('doctors', id);
    
    // Free up the room
    const updatedRooms = rooms.map(room => 
      room.number === doctor.roomNo && room.floor === doctor.floor
        ? { ...room, status: 'available', assignedDoctorId: null, assignedDoctorName: '' }
        : room
    );
    setRooms(updatedRooms);
    await Promise.all(
      updatedRooms.map((room) =>
        api.put(`/rooms/${room.id}`, {
          number: room.number,
          floor: room.floor,
          deptId: room.deptId,
          deptName: room.deptName,
          status: room.status,
          hospitalId: room.hospitalId,
          assignedDoctorId: room.assignedDoctorId,
          assignedDoctorName: room.assignedDoctorName,
          type: room.type,
        }).catch(() => {})
      )
    );
    recordHistory({
      action: 'doctor_deleted',
      module: 'doctors',
      message: `Permanently deleted doctor ${doctor.name} (${doctor.specialization})`,
      actorRole: 'hm',
      hospitalId: String(doctor.hospitalId || currentUser.hospitalId || ''),
      doctorId: String(id),
      meta: { name: doctor.name, specialization: doctor.specialization, license: doctor.license },
    });

    await firebaseDbService.remove('doctorUsers', id);
  };

  const editDoctor = (doctor) => {
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      license: doctor.license,
      departmentId: String(doctor.departmentId || ''),
      roomNo: doctor.roomNo || '',
      floor: doctor.floor || '1',
      shift: doctor.shift,
      advancedBookingCategory: doctor.advancedBookingCategory || doctor.advanced_booking_category || 'general',
      fee: doctor.fee.toString(),
      phone: doctor.phone || '',
      email: doctor.email || '',
      experience: doctor.experience?.toString() || '',
      qualifications: doctor.qualifications || '',
      category: doctor.category || 'general',
      promotionLabel: doctor.promotionLabel || '',
      status: doctor.status,
      generateLogin: false,
      customPassword: ''
    });
    setEditing(doctor);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      specialization: '',
      license: '',
      departmentId: '',
      roomNo: '',
      floor: '1',
      shift: 'morning',
      advancedBookingCategory: 'general',
      fee: '',
      phone: '',
      email: '',
      experience: '',
      qualifications: '',
      category: 'general',
      promotionLabel: '',
      status: 'active',
      generateLogin: true,
      customPassword: ''
    });
    setEditing(null);
    setShowForm(false);
    setShowCredentials(false);
    setGeneratedCredentials(null);
  };

  const copyCredentialsToClipboard = () => {
    if (!generatedCredentials) return;
    
    const text = `🚑 Doctor Login Credentials

👨‍⚕️ Name: ${formData.name}
📧 Email: ${generatedCredentials.email}
🔑 Password: ${generatedCredentials.password}
🆔 Doctor ID: ${generatedCredentials.doctorId}
🏥 Hospital: ${getHospitalDomain()}
📱 Phone: ${formData.phone}
📍 Room: Room ${formData.roomNo} - Floor ${formData.floor}

⚠️ Save these credentials securely!
Doctor should use these to login to the system.`;

    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
  };

  const viewDoctorProfile = (id) => {
    navigate(`/hm/doctor/${id}`);
  };

  return (
    <div style={styles.container}>
      <style>{`
        .stat-card svg { font-size: 1.8rem; margin-bottom: 0.5rem; }
        .search-box svg { color: #64748b; }
        .doctor-avatar svg { font-size: 2rem; color: #1e40af; }
        .doctor-meta svg { margin-right: 0.25rem; font-size: 0.8rem; color: #64748b; }
        .empty-state svg { font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem; }
        .card-actions button svg { margin-right: 0.5rem; }
        .modal-close svg { font-size: 1.2rem; }
        .promotion-badge svg { margin-right: 0.25rem; font-size: 0.8rem; }
      `}</style>
      
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/hm/management')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Dashboard
        </button>
        <div>
          <h1 style={styles.title}>Doctor Management</h1>
          <p style={styles.subtitle}>Manage doctors, assign rooms & generate login credentials</p>
        </div>
        <button style={styles.createBtn} onClick={() => setShowForm(true)}>
          <FontAwesomeIcon icon={faPlus} /> Add Doctor
        </button>
      </div>
      
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faUserMd} style={{color: '#3b82f6'}} />
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Doctors</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faToggleOn} style={{color: '#10b981'}} />
          <div style={styles.statValue}>{stats.active}</div>
          <div style={styles.statLabel}>Active</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faStethoscope} style={{color: '#8b5cf6'}} />
          <div style={styles.statValue}>{stats.specialists}</div>
          <div style={styles.statLabel}>Specialists</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faAward} style={{color: '#f59e0b'}} />
          <div style={styles.statValue}>{stats.withPromotion}</div>
          <div style={styles.statLabel}>Promoted</div>
        </div>
      </div>
      
      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} />
          <input 
            type="text" 
            placeholder="Search doctors by name, specialization, license..." 
            value={search} 
            onChange={(e) => setSearch(e.target.value)} 
            style={styles.searchInput} 
          />
        </div>
        
        <div style={styles.filterGroup}>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={styles.select}>
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="disabled">Disabled</option>
          </select>
          
          <select value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={styles.select}>
            <option value="all">All Departments</option>
            {departments.map(dept => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          <select style={styles.select}>
            <option value="">All Categories</option>
            {doctorCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div style={styles.listContainer}>
        {filteredDoctors.length === 0 ? (
          <div style={styles.emptyState}>
            <FontAwesomeIcon icon={faUserMd} />
            <p>No doctors found</p>
            <button onClick={() => setShowForm(true)} style={styles.actionBtn}>
              <FontAwesomeIcon icon={faPlus} /> Add First Doctor
            </button>
          </div>
        ) : (
          <div style={styles.cardsGrid}>
            {filteredDoctors.map(doctor => {
              const category = doctorCategories.find(c => c.id === doctor.category);
              const promotion = promotionLabels.find(p => p.id === doctor.promotionLabel);
              
              return (
                <div key={doctor.id} style={styles.doctorCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.doctorAvatar}>
                      <FontAwesomeIcon icon={faUserMd} />
                    </div>
                    <div style={styles.doctorInfo}>
                      <div style={styles.nameRow}>
                        <h3 style={styles.doctorName}>{doctor.name}</h3>
                        {promotion && (
                          <span style={{
                            ...styles.promotionBadge,
                            background: promotion.color
                          }}>
                            <FontAwesomeIcon icon={promotion.icon} />
                            {promotion.label}
                          </span>
                        )}
                      </div>
                      <p style={styles.specialization}>
                        <FontAwesomeIcon icon={faStethoscope} /> {doctor.specialization}
                      </p>
                      <div style={styles.doctorMeta}>
                        <span><FontAwesomeIcon icon={faBuilding} /> {doctor.departmentName}</span>
                        <span><FontAwesomeIcon icon={faDoorOpen} /> {doctor.roomInfo || 'Room not assigned'}</span>
                        {category && (
                          <span style={{ color: category.color }}>
                            <FontAwesomeIcon icon={faTags} /> {category.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{
                      ...styles.statusBadge,
                      background: doctor.status === 'active' ? '#dcfce7' : '#fee2e2',
                      color: doctor.status === 'active' ? '#166534' : '#991b1b'
                    }}>
                      {doctor.status === 'active' ? 'Active' : 'Disabled'}
                    </div>
                  </div>
                  
                  <div style={styles.cardDetails}>
                    <div style={styles.detailRow}>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}><FontAwesomeIcon icon={faIdCard} /> License:</label>
                        <span style={styles.detailValue}>{doctor.license}</span>
                      </div>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}><FontAwesomeIcon icon={faClock} /> Shift:</label>
                        <span style={styles.detailValue}>{doctor.shift}</span>
                      </div>
                    </div>
                    <div style={styles.detailRow}>
                      <div style={styles.detailItem}>
                        <label style={styles.detailLabel}><FontAwesomeIcon icon={faRupeeSign} /> Fee:</label>
                        <span style={styles.detailValue}>₹{doctor.fee}</span>
                      </div>
                      {doctor.experience && (
                        <div style={styles.detailItem}>
                          <label style={styles.detailLabel}><FontAwesomeIcon icon={faCalendar} /> Experience:</label>
                          <span style={styles.detailValue}>{doctor.experience} years</span>
                        </div>
                      )}
                    </div>
                    {doctor.phone && (
                      <div style={styles.contactInfo}>
                        <span><FontAwesomeIcon icon={faPhone} /> {doctor.phone}</span>
                        {doctor.email && <span><FontAwesomeIcon icon={faEnvelope} /> {doctor.email}</span>}
                      </div>
                    )}
                  </div>
                  
                  <div style={styles.cardActions}>
                    <button onClick={() => viewDoctorProfile(doctor.id)} style={styles.viewBtn}>
                      <FontAwesomeIcon icon={faEye} /> View
                    </button>
                    <button onClick={() => editDoctor(doctor)} style={styles.editBtn}>
                      <FontAwesomeIcon icon={faEdit} /> Edit
                    </button>
                    <button onClick={() => toggleDoctorStatus(doctor.id)} style={{
                      ...styles.toggleBtn,
                      background: doctor.status === 'active' ? '#f59e0b' : '#84cc16'
                    }}>
                      <FontAwesomeIcon icon={doctor.status === 'active' ? faToggleOff : faToggleOn} />
                      {doctor.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => deleteDoctor(doctor.id)} style={styles.deleteBtn}>
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
              <h3 style={styles.modalTitle}>{editing ? 'Edit Doctor' : 'Add New Doctor'}</h3>
              <button onClick={resetForm} style={styles.modalClose}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={styles.form}>
              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>
                  <FontAwesomeIcon icon={faUserMd} /> Basic Information
                </h4>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Full Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      placeholder="Dr. John Doe"
                      required
                      style={styles.input}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Specialization *</label>
                    <input
                      type="text"
                      value={formData.specialization}
                      onChange={(e) => setFormData({...formData, specialization: e.target.value})}
                      placeholder="Cardiology"
                      required
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>License Number *</label>
                    <input
                      type="text"
                      value={formData.license}
                      onChange={(e) => setFormData({...formData, license: e.target.value})}
                      placeholder="MED123456"
                      required
                      style={styles.input}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Consultation Fee *</label>
                    <input
                      type="number"
                      value={formData.fee}
                      onChange={(e) => setFormData({...formData, fee: e.target.value})}
                      placeholder="500"
                      min="0"
                      required
                      style={styles.input}
                    />
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>
                  <FontAwesomeIcon icon={faBuilding} /> Department & Room
                </h4>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Department *</label>
                    <select
                      value={formData.departmentId}
                      onChange={(e) => setFormData({...formData, departmentId: e.target.value})}
                      required
                      style={styles.select}
                    >
                      <option value="">Select Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                      style={styles.select}
                    >
                      {doctorCategories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Room Number *</label>
                    <select
                      value={formData.roomNo}
                      onChange={(e) => setFormData({...formData, roomNo: e.target.value})}
                      required
                      style={styles.select}
                    >
                      <option value="">Select Room No</option>
                      {roomNumbers.map(no => (
                        <option key={no} value={no}>Room {no}</option>
                      ))}
                    </select>
                  </div>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Floor *</label>
                    <select
                      value={formData.floor}
                      onChange={(e) => setFormData({...formData, floor: e.target.value})}
                      required
                      style={styles.select}
                    >
                      {floors.map(floor => (
                        <option key={floor} value={floor}>Floor {floor}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>
                  <FontAwesomeIcon icon={faUserTie} /> Additional Information
                </h4>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Contact Phone</label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      placeholder="9876543210"
                      style={styles.input}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      placeholder="doctor@hospital.com"
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Experience (Years)</label>
                    <input
                      type="number"
                      value={formData.experience}
                      onChange={(e) => setFormData({...formData, experience: e.target.value})}
                      placeholder="5"
                      min="0"
                      style={styles.input}
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Qualifications</label>
                    <input
                      type="text"
                      value={formData.qualifications}
                      onChange={(e) => setFormData({...formData, qualifications: e.target.value})}
                      placeholder="MBBS, MD, etc."
                      style={styles.input}
                    />
                  </div>
                </div>
                
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Shift *</label>
                    <select
                      value={formData.shift}
                      onChange={(e) => setFormData({...formData, shift: e.target.value})}
                      required
                      style={styles.select}
                    >
                      <option value="morning">Morning (9AM - 2PM)</option>
                      <option value="evening">Evening (4PM - 9PM)</option>
                      <option value="full">Full Day (9AM - 9PM)</option>
                      <option value="night">Night Shift (9PM - 9AM)</option>
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Advanced Booking Category</label>
                    <select
                      value={formData.advancedBookingCategory}
                      onChange={(e) => setFormData({ ...formData, advancedBookingCategory: e.target.value })}
                      style={styles.select}
                    >
                      {advancedBookingCategories.map((item) => (
                        <option key={item.id} value={item.id}>{item.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Promotion Label</label>
                    <select
                      value={formData.promotionLabel}
                      onChange={(e) => setFormData({...formData, promotionLabel: e.target.value})}
                      style={styles.select}
                    >
                      <option value="">No Promotion</option>
                      {promotionLabels.map(promo => (
                        <option key={promo.id} value={promo.id}>{promo.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div style={styles.formSection}>
                <h4 style={styles.sectionTitle}>
                  <FontAwesomeIcon icon={faShieldAlt} /> Account Settings
                </h4>
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}
                      style={styles.select}
                    >
                      <option value="active">Active</option>
                      <option value="disabled">Disabled</option>
                      <option value="on_leave">On Leave</option>
                      <option value="vacation">Vacation</option>
                    </select>
                  </div>
                </div>
                
                {!editing && (
                  <div style={styles.checkboxGroup}>
                    <label style={styles.checkboxLabel}>
                      <input
                        type="checkbox"
                        checked={formData.generateLogin}
                        onChange={(e) => setFormData({...formData, generateLogin: e.target.checked})}
                        style={styles.checkbox}
                      />
                      <FontAwesomeIcon icon={faKey} />
                      <span>Generate login credentials for doctor</span>
                    </label>
                    <small style={styles.helperText}>
                      Auto-generates email & password for doctor login access
                    </small>

                    {formData.generateLogin && (
                      <div style={{ marginTop: '0.85rem' }}>
                        <label style={styles.label}>Custom Password (Optional)</label>
                        <input
                          type="text"
                          value={formData.customPassword}
                          onChange={(e) => setFormData({ ...formData, customPassword: e.target.value })}
                          placeholder="Leave empty to auto-generate"
                          style={styles.input}
                        />
                        <small style={styles.helperText}>Minimum 6 characters if provided</small>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div style={styles.formActions}>
                <button type="button" onClick={resetForm} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editing ? 'Update Doctor' : 'Add Doctor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {showCredentials && generatedCredentials && (
        <div style={styles.credentialsModal}>
          <div style={styles.credentialsContent}>
            <div style={styles.credentialsHeader}>
              <h3 style={styles.credentialsTitle}>
                <FontAwesomeIcon icon={faKey} />
                Doctor Login Credentials Generated
              </h3>
              <button onClick={() => setShowCredentials(false)} style={styles.credentialsClose}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div style={styles.credentialsBody}>
              <div style={styles.credentialAlert}>
                <FontAwesomeIcon icon={faEye} />
                <strong>Save these credentials securely!</strong>
                <p>The doctor will use these to login to the system. Share only with the doctor.</p>
              </div>
              
              <div style={styles.credentialList}>
                <div style={styles.credentialItem}>
                  <label style={styles.credentialLabel}><FontAwesomeIcon icon={faUserMd} /> Doctor Name:</label>
                  <code style={styles.credentialValue}>{formData.name}</code>
                </div>
                <div style={styles.credentialItem}>
                  <label style={styles.credentialLabel}><FontAwesomeIcon icon={faIdCard} /> Doctor ID:</label>
                  <code style={styles.credentialValue}>{generatedCredentials.doctorId}</code>
                </div>
                <div style={styles.credentialItem}>
                  <label style={styles.credentialLabel}><FontAwesomeIcon icon={faBuilding} /> Hospital:</label>
                  <code style={styles.credentialValue}>{getHospitalDomain()}</code>
                </div>
                <div style={styles.credentialItem}>
                  <label style={styles.credentialLabel}><FontAwesomeIcon icon={faKey} /> Email:</label>
                  <code style={styles.credentialValue}>{generatedCredentials.email}</code>
                </div>
                <div style={styles.credentialItem}>
                  <label style={styles.credentialLabel}><FontAwesomeIcon icon={faLock} /> Password:</label>
                  <code style={styles.credentialValue}>{generatedCredentials.password}</code>
                </div>
                <div style={styles.credentialItem}>
                  <label style={styles.credentialLabel}><FontAwesomeIcon icon={faDoorOpen} /> Room:</label>
                  <code style={styles.credentialValue}>Room {formData.roomNo}, Floor {formData.floor}</code>
                </div>
              </div>
              
              <div style={styles.credentialsActions}>
                <button onClick={copyCredentialsToClipboard} style={styles.copyBtn}>
                  <FontAwesomeIcon icon={faCopy} /> Copy All Credentials
                </button>
                <button onClick={resetForm} style={styles.doneBtn}>
                  <FontAwesomeIcon icon={faCheck} /> Done & Close
                </button>
              </div>
              
              <div style={styles.credentialNote}>
                <small>
                  <strong>Note:</strong> These credentials are saved in the system. 
                  Doctor can login using this email & password. You can reset password anytime from Credentials Management page.
                </small>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: { padding: '1.5rem', background: '#f8fafc', minHeight: '100vh' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' },
  backBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500', color: '#475569' },
  title: { fontSize: '1.875rem', fontWeight: '700', color: '#1e293b', margin: 0 },
  subtitle: { color: '#64748b', margin: '0.25rem 0 0 0' },
  createBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statValue: { fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0.5rem 0' },
  statLabel: { color: '#64748b', fontSize: '0.875rem' },
  filtersBar: { background: 'white', padding: '1.25rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', flex: '1', minWidth: '300px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' },
  filterGroup: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  select: { padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', background: 'white', fontSize: '0.95rem', cursor: 'pointer', minWidth: '150px' },
  listContainer: { background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', padding: '1.5rem' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#64748b' },
  actionBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500', marginTop: '1rem' },
  cardsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: '1.5rem' },
  doctorCard: { border: '1px solid #e2e8f0', borderRadius: '0.75rem', padding: '1.5rem', transition: 'all 0.2s', ':hover': { boxShadow: '0 4px 6px rgba(0,0,0,0.1)' } },
  cardHeader: { display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '1rem' },
  nameRow: { display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' },
  doctorAvatar: { width: '3.5rem', height: '3.5rem', borderRadius: '0.75rem', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doctorInfo: { flex: '1' },
  doctorName: { fontSize: '1.125rem', fontWeight: '600', color: '#1e293b', margin: '0' },
  promotionBadge: { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.7rem', fontWeight: '600', color: 'white', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' },
  specialization: { color: '#3b82f6', fontWeight: '500', fontSize: '0.875rem', margin: '0.25rem 0 0.75rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  doctorMeta: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' },
  statusBadge: { padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500' },
  cardDetails: { margin: '1.25rem 0', padding: '1.25rem 0', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' },
  detailRow: { display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' },
  detailItem: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' },
  detailLabel: { color: '#64748b', fontWeight: '500', minWidth: '80px', display: 'flex', alignItems: 'center', gap: '0.25rem' },
  detailValue: { color: '#1e293b', fontWeight: '500' },
  contactInfo: { display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.75rem' },
  cardActions: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap' },
  viewBtn: { flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', color: '#475569' },
  editBtn: { flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' },
  toggleBtn: { flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' },
  deleteBtn: { flex: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.6rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '900px', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0 },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  form: { padding: '1.5rem' },
  formSection: { marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' },
  sectionTitle: { fontSize: '1rem', fontWeight: '600', color: '#374151', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  formRow: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' },
  formGroup: { display: 'flex', flexDirection: 'column' },
  label: { marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.875rem' },
  input: { padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem' },
  checkboxGroup: { margin: '1.5rem 0', padding: '1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem' },
  checkboxLabel: { display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '500', color: '#0369a1', cursor: 'pointer' },
  checkbox: { width: '1.2rem', height: '1.2rem' },
  helperText: { display: 'block', marginTop: '0.5rem', color: '#64748b', fontSize: '0.875rem' },
  formActions: { display: 'flex', gap: '1rem', marginTop: '2rem', paddingTop: '1.5rem' },
  cancelBtn: { flex: 1, padding: '0.75rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' },
  submitBtn: { flex: 1, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' },
  credentialsModal: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' },
  credentialsContent: { background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' },
  credentialsHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: '#f0f9ff' },
  credentialsTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#0369a1', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  credentialsClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  credentialsBody: { padding: '1.5rem' },
  credentialAlert: { padding: '1rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.5rem', marginBottom: '1.5rem', color: '#92400e' },
  credentialList: { display: 'flex', flexDirection: 'column', gap: '1rem' },
  credentialItem: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem' },
  credentialLabel: { minWidth: '120px', fontWeight: '600', color: '#374151', display: 'flex', alignItems: 'center', gap: '0.5rem' },
  credentialValue: { flex: 1, padding: '0.5rem', background: '#f8fafc', borderRadius: '0.25rem', fontFamily: 'monospace', fontSize: '0.9rem', overflow: 'auto' },
  credentialsActions: { display: 'flex', gap: '1rem', margin: '1.5rem 0' },
  copyBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' },
  doneBtn: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.75rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem' },
  credentialNote: { padding: '1rem', background: '#f1f5f9', borderRadius: '0.5rem', fontSize: '0.875rem', color: '#64748b' }
};

export default Doctors;