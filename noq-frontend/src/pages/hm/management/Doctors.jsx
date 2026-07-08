// ...existing code...
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { recordHistory } from '../../../services/historyService';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';
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
      const [backendDoctorRes, departmentRes, roomRes, hospitalRes] = await Promise.all([
        api.get(`/users?role=doctor${currentHospitalId ? `&hospital_id=${encodeURIComponent(currentHospitalId)}` : ''}`).catch(() => ({ data: { data: { users: [] } } })),
        api.get(`/departments${currentHospitalId ? `?hospital_id=${encodeURIComponent(currentHospitalId)}` : ''}`).catch(() => ({ data: { departments: [] } })),
        api.get('/rooms').catch(() => ({ data: { rooms: [] } })),
        api.get('/hospitals').catch(() => ({ data: { data: { hospitals: [] } } })),
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

      const normalizedRooms = (Array.isArray(roomRows) ? roomRows : []).map((room) => ({
        ...room,
        id: room.id || room._id,
        hospitalId: String(room.hospitalId || room.hospital_id || room.HID || ''),
        deptId: String(room.deptId || room.departmentId || room.department_id || ''),
        number: String(room.number || room.room_number || room.roomNo || ''),
        floor: String(room.floor || '1'),
        status: room.status || 'available',
      }));

      const normalizedDoctors = Array.from(mergedById.values())
        .map((doctor) => {
          const doctorHospitalId = String(doctor.hospitalId || doctor.hospital_id || doctor.HID || '');
          const doctorRoomId = doctor.roomId || doctor.room_id || null;
          const doctorRoomNo = String(doctor.roomNo || doctor.room_no || doctor.roomNumber || '');
          const doctorFloor = String(doctor.floor || '1');

          const roomById = doctorRoomId
            ? normalizedRooms.find((room) => String(room.id) === String(doctorRoomId))
            : null;
          const roomByNumber = !roomById && doctorRoomNo
            ? normalizedRooms.find(
                (room) =>
                  String(room.number) === doctorRoomNo &&
                  String(room.floor || '1') === doctorFloor &&
                  (!room.hospitalId || !doctorHospitalId || String(room.hospitalId) === doctorHospitalId)
              )
            : null;
          const matchedRoom = roomById || roomByNumber;
          const resolvedRoomNo = doctorRoomNo || String(matchedRoom?.number || '');
          const resolvedFloor = doctorFloor || String(matchedRoom?.floor || '1');

          return {
            ...doctor,
            hospitalId: doctorHospitalId,
            hospitalName: doctor.hospitalName || doctor.hospital_name || '',
            departmentId: String(doctor.departmentId || doctor.department_id || doctor.deptId || ''),
            departmentName: doctor.departmentName || doctor.department_name || '',
            roomNo: resolvedRoomNo,
            roomNumber: resolvedRoomNo,
            roomId: doctorRoomId || matchedRoom?.id || null,
            roomInfo: resolvedRoomNo ? `Room ${resolvedRoomNo} - Floor ${resolvedFloor}` : 'Room not assigned',
            floor: resolvedFloor,
            license: doctor.license || doctor.license_number || '',
            shift: doctor.shift || 'morning',
            fee: Number(doctor.fee ?? doctor.consultation_fee ?? 0),
            advancedBookingCategory: doctor.advancedBookingCategory || doctor.advanced_booking_category || 'general',
            promotionLabel: doctor.promotionLabel || doctor.promotion_label || '',
          };
        })
        .filter((doctor) => {
          const hospitalId = String(doctor.hospitalId || '');
          const isActive = !doctor.status || doctor.status === 'active';
          return isActive && (!currentHospitalId || !hospitalId || hospitalId === currentHospitalId);
        });

      setDoctors(normalizedDoctors);
      const departmentRows = Array.isArray(departmentRes?.data?.departments)
        ? departmentRes.data.departments
        : [];
      const hospitalRows = Array.isArray(hospitalRes?.data?.data?.hospitals)
        ? hospitalRes.data.data.hospitals
        : Array.isArray(hospitalRes?.data?.hospitals)
          ? hospitalRes.data.hospitals
          : [];

      setDepartments((Array.isArray(departmentRows) ? departmentRows : []).filter(d => d.status === 'active'));
      setRooms(
        normalizedRooms.filter((room) => {
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

  const isPersistentRoomId = (roomId) => {
    const value = String(roomId || '');
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
    return isUuid || value.startsWith('ROOM-');
  };

  const buildRoomPayload = (room, fallbackHospitalId = '', fallbackDepartmentId = '') => ({
    hospital_id: String(room.hospitalId || room.hospital_id || fallbackHospitalId || ''),
    department_id: String(room.deptId || room.departmentId || room.department_id || fallbackDepartmentId || ''),
    department_name: room.deptName || room.departmentName || room.department_name || null,
    room_number: String(room.number || room.room_number || room.roomNo || ''),
    floor: String(room.floor || '1'),
    status: room.status || 'available',
    type: room.type || 'doctor',
    assigned_doctor_id: room.assignedDoctorId || room.assigned_doctor_id || null,
    assigned_doctor_name: room.assignedDoctorName || room.assigned_doctor_name || null,
  });

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

  const generateSamplePassword = () => {
    const prefixes = ['Abcd', 'Medx', 'Doca', 'Heal', 'Care'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const digits = Math.floor(100 + Math.random() * 900);
    return `${prefix}@${digits}`;
  };

  const fillSampleDoctorData = () => {
    const firstNames = ['Arjun', 'Kiran', 'Rahul', 'Naveen', 'Vikram', 'Sanjay'];
    const middleNames = ['Dev', 'Raj', 'Kumar', 'Sai', 'Prasad', 'Teja'];
    const lastNames = ['Reddy', 'Sharma', 'Patel', 'Nair', 'Mehta', 'Verma'];
    const specializations = ['Cardiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Pediatrics', 'ENT'];
    const qualificationsList = ['MBBS, MD', 'MBBS, MS', 'MBBS, DNB', 'MBBS, MD, DM'];
    const licenses = ['MED', 'DOC', 'REG', 'LIC'];

    const pick = (list) => list[Math.floor(Math.random() * list.length)];
    const randomName = `${pick(firstNames)} ${pick(middleNames)} ${pick(middleNames)} ${pick(lastNames)}`;
    const randomSpecialization = pick(specializations);
    const randomDepartmentId = departments?.[0]?.id ? String(departments[0].id) : '';
    const randomRoom = roomNumbers.find((roomNo) => !doctors.some((d) => String(d.roomNo || '') === String(roomNo))) || roomNumbers[0] || '1';
    const randomFloor = floors.find((floor) => String(floor).toLowerCase() !== 'ground') || '1';
    const randomPassword = generateSamplePassword();
    const email = generateDoctorEmail(randomName).replace(/\s+/g, '').toLowerCase();

    setFormData((prev) => ({
      ...prev,
      name: randomName,
      specialization: randomSpecialization,
      license: `${pick(licenses)}${Math.floor(100000 + Math.random() * 900000)}`,
      departmentId: randomDepartmentId,
      roomNo: String(randomRoom),
      floor: String(randomFloor),
      shift: 'morning',
      advancedBookingCategory: 'general',
      fee: String((Math.floor(Math.random() * 6) + 5) * 100),
      phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
      email,
      experience: String(Math.floor(Math.random() * 8) + 2),
      qualifications: pick(qualificationsList),
      category: 'general',
      promotionLabel: '',
      status: 'active',
      generateLogin: true,
      customPassword: randomPassword,
    }));
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

    const proposedEmail = String(formData.email || generateDoctorEmail(formData.name)).trim().toLowerCase();
    if (!editing && formData.generateLogin) {
      const duplicateEmailDoctor = doctors.find(
        (doctor) => String(doctor.email || '').trim().toLowerCase() === proposedEmail
      );
      if (duplicateEmailDoctor) {
        alert(`Doctor email already exists: ${proposedEmail}. Please use a different email.`);
        return;
      }
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
        await api.patch(`/users/${updatedDoctor.id}`, {
          name: updatedDoctor.name || null,
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

      const syncedRooms = await Promise.all(
        updatedRooms.map(async (room) => {
          const roomPayload = buildRoomPayload(room, resolvedHospitalId, String(formData.departmentId || ''));

          const roomId = String(room.id || '');

          if (!isPersistentRoomId(roomId)) {
            const created = await api.post('/rooms', roomPayload).catch(() => null);
            const createdRoom = created?.data?.room || created?.room || null;
            return createdRoom ? { ...room, ...createdRoom, id: createdRoom.id } : room;
          }

          const updatedRoomResponse = await api.put(`/rooms/${roomId}`, roomPayload).catch((error) => {
            if (error?.status === 404) {
              return api.post('/rooms', roomPayload).catch(() => null);
            }
            return null;
          });
          const updatedRoom = updatedRoomResponse?.data?.room || updatedRoomResponse?.room || null;
          return updatedRoom ? { ...room, ...updatedRoom, id: updatedRoom.id || room.id } : room;
        })
      );
      setRooms(syncedRooms);

      const syncedTargetRoom = syncedRooms.find(
        (room) =>
          String(room.number || room.room_number || '') === newRoomNo &&
          String(room.floor || '1') === newFloor &&
          (!room.hospitalId || String(room.hospitalId) === resolvedHospitalId)
      );

      const doctorsAfterRoomSync = updated.map((doctor) =>
        doctor.id === editing.id
          ? {
              ...doctor,
              roomId: syncedTargetRoom?.id || doctor.roomId || null,
              roomNo: newRoomNo,
              floor: newFloor,
              roomInfo: `Room ${newRoomNo} - Floor ${newFloor}`,
            }
          : doctor
      );
      setDoctors(doctorsAfterRoomSync);

      const syncedEditedDoctor = doctorsAfterRoomSync.find((doctor) => doctor.id === editing.id);
      if (syncedEditedDoctor) {
        await api.patch(`/users/${syncedEditedDoctor.id}`, {
          room_no: String(syncedEditedDoctor.roomNo || ''),
          floor: String(syncedEditedDoctor.floor || '1'),
        }).catch(() => {});
      }
    } else {
      let backendDoctorId = null;

      if (credentials) {
        try {
          const payload = {
            name: formData.name,
            email: credentials.email,
            role: 'doctor',
            phone: formData.phone || null,
            password: credentials.password,
            hospital_id: resolvedHospitalId,
            hospital_name: resolvedHospitalName,
            specialization: formData.specialization || null,
            department_id: String(formData.departmentId || '').trim() || null,
            department_name: deptName || null,
            room_no: String(formData.roomNo || '').trim() || null,
            floor: String(formData.floor || '').trim() || null,
            license: formData.license || null,
            shift: formData.shift || 'morning',
            advanced_booking_category: formData.advancedBookingCategory || 'general',
            fee: parseFloat(formData.fee) || 0,
            experience: parseInt(formData.experience) || 0,
            qualifications: formData.qualifications || null,
            category: formData.category || 'general',
            promotion_label: formData.promotionLabel || null,
            status: formData.status || 'active',
          };
          // Filter out null values to prevent Pydantic validation errors
          const filteredPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v !== null));
          const response = await api.post('/users/create', filteredPayload);
          backendDoctorId = response?.data?.id || response?.id || null;
        } catch (error) {
          const errMsg = error?.response?.detail || error?.message || 'Doctor creation failed';
          alert(`Error: ${errMsg}`);
          return;
        }
      }

      if (!backendDoctorId) {
        alert('Doctor account was not created in backend. Please enable login creation and retry.');
        return;
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
      };

      const existingRoom = rooms.find((room) =>
        String(room.number || room.room_number || '') === String(formData.roomNo || '') &&
        String(room.floor || '1') === String(formData.floor || '1') &&
        (!room.hospitalId || String(room.hospitalId) === resolvedHospitalId)
      );

      const roomDraft = {
        ...(existingRoom || {}),
        number: String(formData.roomNo || ''),
        floor: String(formData.floor || '1'),
        deptId: String(formData.departmentId || ''),
        deptName,
        hospitalId: resolvedHospitalId,
        status: 'occupied',
        assignedDoctorId: String(backendDoctorId || ''),
        assignedDoctorName: formData.name || '',
        type: 'doctor',
      };

      const roomPayload = buildRoomPayload(roomDraft, resolvedHospitalId, String(formData.departmentId || ''));
      let syncedDoctorRoom = null;

      if (existingRoom && isPersistentRoomId(String(existingRoom.id || ''))) {
        const roomId = String(existingRoom.id || '');
        const roomUpdateResponse = await api.put(`/rooms/${roomId}`, roomPayload).catch((error) => {
          if (error?.status === 404) {
            return api.post('/rooms', roomPayload).catch(() => null);
          }
          return null;
        });
        syncedDoctorRoom = roomUpdateResponse?.data?.room || roomUpdateResponse?.room || null;
      } else {
        const roomCreateResponse = await api.post('/rooms', roomPayload).catch(() => null);
        syncedDoctorRoom = roomCreateResponse?.data?.room || roomCreateResponse?.room || null;
      }

      const userPatchPayload = {
        specialization: newDoctor.specialization || null,
        hospital_name: newDoctor.hospitalName || null,
        department_id: String(newDoctor.departmentId || ''),
        department_name: newDoctor.departmentName || null,
        room_id: syncedDoctorRoom?.id ? String(syncedDoctorRoom.id) : null,
        room_no: syncedDoctorRoom
          ? String(syncedDoctorRoom.room_number || syncedDoctorRoom.number || formData.roomNo || '')
          : null,
        floor: syncedDoctorRoom
          ? String(syncedDoctorRoom.floor || formData.floor || '1')
          : null,
        license: newDoctor.license || null,
        advanced_booking_category: newDoctor.advancedBookingCategory || 'general',
        fee: Number(newDoctor.fee || 0),
        experience: Number(newDoctor.experience || 0),
        qualifications: newDoctor.qualifications || null,
        category: newDoctor.category || null,
        promotion_label: newDoctor.promotionLabel || null,
        status: newDoctor.status || 'active',
      };
      const filteredUserPatchPayload = Object.fromEntries(
        Object.entries(userPatchPayload).filter(([, value]) => value !== null)
      );
      await api.patch(`/users/${backendDoctorId}`, filteredUserPatchPayload).catch(() => {});

      if (!syncedDoctorRoom) {
        alert('Doctor created, but room sync failed. Refresh page and assign room from Rooms page.');
      }

      const finalDoctor = {
        ...newDoctor,
        roomId: syncedDoctorRoom?.id || null,
        roomNo: syncedDoctorRoom
          ? String(syncedDoctorRoom.room_number || syncedDoctorRoom.number || formData.roomNo || '')
          : '',
        floor: syncedDoctorRoom ? String(syncedDoctorRoom.floor || formData.floor || '1') : '1',
        roomInfo: syncedDoctorRoom
          ? `Room ${String(syncedDoctorRoom.room_number || syncedDoctorRoom.number || formData.roomNo || '')} - Floor ${String(syncedDoctorRoom.floor || formData.floor || '1')}`
          : 'Room not assigned',
      };

      setDoctors([...doctors, finalDoctor]);
      if (syncedDoctorRoom) {
        const normalizedSyncedRoom = {
          ...syncedDoctorRoom,
          id: syncedDoctorRoom.id,
          number: String(syncedDoctorRoom.number || syncedDoctorRoom.room_number || formData.roomNo || ''),
          floor: String(syncedDoctorRoom.floor || formData.floor || '1'),
          deptId: String(syncedDoctorRoom.deptId || syncedDoctorRoom.departmentId || syncedDoctorRoom.department_id || formData.departmentId || ''),
          deptName: syncedDoctorRoom.deptName || syncedDoctorRoom.departmentName || syncedDoctorRoom.department_name || deptName,
          hospitalId: String(syncedDoctorRoom.hospitalId || syncedDoctorRoom.hospital_id || resolvedHospitalId),
          assignedDoctorId: String(syncedDoctorRoom.assignedDoctorId || syncedDoctorRoom.assigned_doctor_id || backendDoctorId || ''),
          assignedDoctorName: syncedDoctorRoom.assignedDoctorName || syncedDoctorRoom.assigned_doctor_name || formData.name || '',
          status: syncedDoctorRoom.status || 'occupied',
          type: syncedDoctorRoom.type || 'doctor',
        };
        setRooms((prevRooms) => {
          const exists = prevRooms.some((room) => String(room.id || '') === String(normalizedSyncedRoom.id || ''));
          if (exists) {
            return prevRooms.map((room) =>
              String(room.id || '') === String(normalizedSyncedRoom.id || '')
                ? { ...room, ...normalizedSyncedRoom }
                : room
            );
          }
          return [...prevRooms, normalizedSyncedRoom];
        });
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

  };

  const deleteDoctor = async (id) => {
    const doctor = doctors.find(d => d.id === id);
    if (!doctor) {
      alert('Doctor not found');
      return;
    }
    
    if (!window.confirm(`Delete ${doctor.name} permanently?`)) return;
    
    try {
      // Soft delete via PATCH first
      await api.patch(`/users/${id}`, { status: 'inactive' }).catch(async (err) => {
        console.warn('PATCH /users failed, trying DELETE', err);
        // Fallback to hard delete if PATCH fails
        await api.delete(`/users/${id}`);
      });
      
      // Remove from local state after successful API call
      const updated = doctors.filter(d => d.id !== id);
      setDoctors(updated);
      
      // Record history (don't let errors here break the delete)
      try {
        recordHistory({
          action: 'doctor_deleted',
          module: 'doctors',
          message: `Permanently deleted doctor ${doctor.name} (${doctor.specialization})`,
          actorRole: 'hm',
          hospitalId: String(doctor.hospitalId || currentUser.hospitalId || ''),
          doctorId: String(id),
          meta: { name: doctor.name, specialization: doctor.specialization, license: doctor.license },
        });
      } catch (historyErr) {
        console.warn('History recording failed:', historyErr);
      }
      
      alert(`Doctor ${doctor.name} deleted successfully`);
    } catch (error) {
      alert(`Failed to delete doctor: ${error?.message || 'Unknown error'}`);
      // Restore to list on failure
      const updated = doctors.filter(d => d.id !== id);
      setDoctors(updated.length > doctors.length - 1 ? doctors : updated);
    }
  };

  const editDoctor = (doctor) => {
    setFormData({
      name: doctor.name || '',
      specialization: doctor.specialization || '',
      license: doctor.license || '',
      departmentId: String(doctor.departmentId || doctor.department_id || ''),
      roomNo: String(doctor.roomNo || doctor.room_no || ''),
      floor: String(doctor.floor || '1'),
      shift: doctor.shift || 'morning',
      advancedBookingCategory: doctor.advancedBookingCategory || doctor.advanced_booking_category || 'general',
      fee: String(doctor.fee || '0'),
      phone: doctor.phone || '',
      email: doctor.email || '',
      experience: String(doctor.experience || '0'),
      qualifications: doctor.qualifications || '',
      category: doctor.category || 'general',
      promotionLabel: doctor.promotionLabel || doctor.promotion_label || '',
      status: doctor.status || 'active',
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
              {!editing && (
                <div style={styles.sampleGeneratorRow}>
                  <button
                    type="button"
                    onClick={fillSampleDoctorData}
                    style={styles.sampleFillBtn}
                  >
                    Generate Sample Doctor
                  </button>
                  <small style={styles.helperText}>Auto-fills 4-word name, strong password format like Abcd@123, and required fields.</small>
                </div>
              )}

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
  sampleGeneratorRow: { marginBottom: '1rem', padding: '0.9rem', border: '1px solid #bfdbfe', borderRadius: '0.5rem', background: '#eff6ff' },
  sampleFillBtn: { padding: '0.6rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '600' },
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