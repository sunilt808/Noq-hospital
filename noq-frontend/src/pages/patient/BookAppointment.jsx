// pages/patient/BookAppointment.jsx - Appointment booking with SQLite backend
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faHospital, faBuilding, faShieldAlt, faStethoscope,
  faUserMd, faCalendarAlt, faClock, faMoneyBill, faCreditCard,
  faQrcode, faCopy, faCheckCircle, faExclamationTriangle,
  faCalendarPlus, faMapMarkerAlt, faLocationArrow,
  faSearch, faSpinner, faPrint, faPhoneAlt, faUser,
  faDoorOpen, faTicketAlt, faBolt,
  faHeartbeat, faLungs, faBrain, faTooth, faEye,
  faEarListen, faBone, faViruses,
  faThermometerHalf, faAllergies, faStar,
  faChevronRight, faTimes
} from '@fortawesome/free-solid-svg-icons';
import { queueService, tokenService } from '../../services/queueService';
import { recordHistory } from '../../services/historyService';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api.js';
import hospitalQrImage from '../../assets/qr-hospital.png';
import './patient.css';

const BookAppointment = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [patient, setPatient] = useState(null);
  const [step, setStep] = useState(1);
  const [hospitalCategory, setHospitalCategory] = useState('');
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [selectedDisease, setSelectedDisease] = useState('');
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedSpecialization, setSelectedSpecialization] = useState('');
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showTokenPreview, setShowTokenPreview] = useState(false);
  const [diseaseSearch, setDiseaseSearch] = useState('');
  const [filteredDiseases, setFilteredDiseases] = useState([]);
  const [allocationError, setAllocationError] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('card');
  const [hospitalsRaw, setHospitalsRaw] = useState([]);
  const [doctorsRaw, setDoctorsRaw] = useState([]);
  const [roomsRaw, setRoomsRaw] = useState([]);
  const [departmentsRaw, setDepartmentsRaw] = useState([]);
  const [diseasesRaw, setDiseasesRaw] = useState([]);
  const [hmUsersRaw, setHmUsersRaw] = useState([]);
  const [patientsRaw, setPatientsRaw] = useState([]);

  const normalizeText = (value) => String(value || '').trim().toLowerCase();

  const normalizeDepartmentId = (value) => String(value || '').trim();

  const getDepartmentNameById = (departmentId) => {
    const targetId = normalizeDepartmentId(departmentId);
    if (!targetId) return '';
    const department = departmentsRaw.find(
      (item) => normalizeDepartmentId(item.id || item.DID || item.departmentId) === targetId
    );
    return department?.name || '';
  };

  const getDoctorSpecializationCandidates = (doctor) => {
    const deptNameFromId = getDepartmentNameById(doctor.departmentId || doctor.department_id || doctor.deptId);
    return [
      doctor.specialization,
      doctor.departmentName,
      doctor.department_name,
      doctor.department,
      deptNameFromId,
      doctor.advancedBookingCategory,
      doctor.advanced_booking_category,
    ]
      .map((value) => String(value || '').trim())
      .filter(Boolean);
  };

  const loadBookingData = async () => {
    try {
      // Fetch data from backend API
      const [hospitalsRes, departmentsRes, diseasesRes, doctorsRes] = await Promise.all([
        api.get('/hospitals/available').catch(err => { console.error('Hospitals fetch error:', err); return null; }),
        api.get('/departments/').catch(err => { console.error('Departments fetch error:', err); return null; }),
        api.get('/diseases/').catch(err => { console.error('Diseases fetch error:', err); return null; }),
        api.get('/users/?role=doctor').catch(err => { console.error('Doctors fetch error:', err); return null; }),
      ]);

      const hospitals = hospitalsRes?.data || hospitalsRes?.value || hospitalsRes || [];
      const departments = departmentsRes?.data?.departments || departmentsRes?.data || departmentsRes || [];
      const diseases = diseasesRes?.data?.diseases || diseasesRes?.data || diseasesRes || [];
      
      // Fetch doctors from users endpoint
      const doctors = doctorsRes?.data?.users || doctorsRes?.data || doctorsRes || [];
      
      // Initialize local data sources (from localStorage or empty)
      const doctorUsers = [];
      const savedDoctorUsers = [];
      const rooms = [];
      const patients = [];
      const hmUsers = [];

      console.log('📚 BOOKING DATA LOAD:', {
        hospitalsCount: hospitals.length,
        departmentsCount: departments.length,
        diseasesCount: diseases.length,
        doctors: doctors.length,
      });

      const mergedDoctorsMap = new Map();
      const putDoctor = (doctor, sourcePriority) => {
        const key = String(
          doctor?.id || doctor?.DID || doctor?.doctorId || doctor?.email || `${sourcePriority}-${Math.random()}`
        ).toLowerCase();

        const current = mergedDoctorsMap.get(key) || {};
        mergedDoctorsMap.set(key, {
          ...current,
          ...doctor,
          _sourcePriority: sourcePriority,
        });
      };

      [...doctorUsers, ...savedDoctorUsers].forEach((doctor) => putDoctor(doctor, 1));
      doctors.forEach((doctor) => putDoctor(doctor, 2));

      const mergedDoctors = Array.from(mergedDoctorsMap.values()).map(({ _sourcePriority, ...doctor }) => doctor);

      console.log('📝 MERGED DOCTORS:', {
        totalMerged: mergedDoctors.length,
        fromUsers: doctorUsers.length,
        fromDoctorsCollection: Array.isArray(doctors) ? doctors.length : 0,
        fromSavedDoctorUsers: Array.isArray(savedDoctorUsers) ? savedDoctorUsers.length : 0,
      });

      setHospitalsRaw(Array.isArray(hospitals) ? hospitals : []);
      setDoctorsRaw(mergedDoctors);
      setRoomsRaw(Array.isArray(rooms) ? rooms : []);
      setDepartmentsRaw(Array.isArray(departments) ? departments : []);
      setDiseasesRaw(Array.isArray(diseases) ? diseases : []);
      setHmUsersRaw(hmUsers);
      setPatientsRaw(Array.isArray(patients) ? patients : []);
    } catch (error) {
      console.error('❌ Error loading booking data:', error);
    }
  };

  useEffect(() => {
    loadBookingData();
    window.addEventListener('focus', loadBookingData);
    // Reload data every 5 seconds to catch newly seeded doctors
    const interval = setInterval(loadBookingData, 5000);
    return () => {
      window.removeEventListener('focus', loadBookingData);
      clearInterval(interval);
    };
  }, []);

  const normalizedDoctors = useMemo(
    () => {
      const filtered = (doctorsRaw || [])
        .filter((doctor) => String(doctor.status || 'active').toLowerCase() === 'active')
        .map((doctor) => {
          const departmentId = normalizeDepartmentId(doctor.departmentId || doctor.department_id || doctor.deptId);
          const specializationCandidates = [
            doctor.specialization,
            doctor.departmentName,
            doctor.department_name,
            doctor.department,
            getDepartmentNameById(departmentId),
            doctor.advancedBookingCategory,
            doctor.advanced_booking_category,
          ]
            .map((value) => String(value || '').trim())
            .filter(Boolean);

          return {
            id: doctor.id || doctor.DID || `DOC-${Math.random().toString(36).slice(2, 8)}`,
            name: doctor.name || doctor.full_name || doctor.fullName || doctor.username || 'Doctor',
            specialization: specializationCandidates[0] || 'General Medicine',
            specializationCandidates,
            departmentName: doctor.departmentName || doctor.department_name || getDepartmentNameById(departmentId) || '',
            department: doctor.department || '',
            departmentId,
            hospitalId: String(doctor.hospitalId || doctor.hospital_id || doctor.HID || ''),
            hospitalName: doctor.hospitalName || doctor.hospital_name || doctor.hospital || '',
            experience: Number(doctor.experience || 0),
            fee: Number(doctor.fee || doctor.consultationFee || 500),
            available: String(doctor.status || 'active').toLowerCase() === 'active',
            currentPatients: Number(doctor.currentPatients || 0),
            maxPatients: Number(doctor.maxPatients || 20),
            roomNo: String(doctor.roomNo || doctor.room_no || doctor.roomNumber || ''),
            roomNumber: String(doctor.roomNo || doctor.room_no || doctor.roomNumber || ''),
            floor: String(doctor.floor || doctor.room_floor || '1'),
          };
        });

      console.log('🏥 NORMALIZED DOCTORS:', {
        rawCount: doctorsRaw.length,
        normalizedCount: filtered.length,
        filtered: filtered.slice(0, 3).map(d => ({
          id: d.id,
          name: d.name,
          spec: d.specialization,
          hospital: d.hospitalId
        }))
      });

      return filtered;
    },
    [doctorsRaw, departmentsRaw]
  );

  const getDepartmentHospitalId = (department) =>
    String(department?.hospitalId || department?.hospital_id || department?.HID || '');

  const getDepartmentDisplayName = (department) =>
    String(department?.name || department?.departmentName || department?.department || '').trim();

  const getDiseaseIcon = (name) => {
    const text = normalizeText(name);
    if (text.includes('heart') || text.includes('card')) return faHeartbeat;
    if (text.includes('lung') || text.includes('respir')) return faLungs;
    if (text.includes('brain') || text.includes('neuro')) return faBrain;
    if (text.includes('tooth') || text.includes('dental')) return faTooth;
    if (text.includes('eye') || text.includes('vision') || text.includes('ophthal')) return faEye;
    if (text.includes('ear') || text.includes('ent')) return faEarListen;
    if (text.includes('bone') || text.includes('ortho')) return faBone;
    if (text.includes('virus') || text.includes('infection') || text.includes('fever')) return faViruses;
    if (text.includes('allerg')) return faAllergies;
    return faStethoscope;
  };

  const hospitalHmIdsMap = useMemo(() => {
    const map = {};
    hmUsersRaw.forEach((hm) => {
      const hospitalId = String(hm.hospitalId || '');
      if (!hospitalId) return;
      map[hospitalId] = map[hospitalId] || [];
      if (hm.id) map[hospitalId].push(String(hm.id));
    });
    return map;
  }, [hmUsersRaw]);

  const isDoctorForHospital = (doctor, hospital) => {
    const doctorHospitalId = String(doctor.hospitalId || doctor.hospital_id || doctor.HID || '');
    const hospitalId = String(hospital.id || hospital.HID || '');
    const doctorHospitalName = normalizeText(doctor.hospitalName || doctor.hospital_name || '');
    const hospitalName = normalizeText(hospital.hospitalName || hospital.hospital_name || hospital.name || '');
    const hmIds = hospitalHmIdsMap[hospitalId] || [];

    // Exact ID match
    if (doctorHospitalId && hospitalId && doctorHospitalId === hospitalId) {
      return true;
    }

    // HM ID match
    if (hmIds.includes(doctorHospitalId)) {
      return true;
    }

    // Hospital name match (both must be non-empty and exact match)
    if (doctorHospitalName && hospitalName && doctorHospitalName === hospitalName) {
      return true;
    }

    // Substring match for partial name matching (helpful for static hospitals)
    if (doctorHospitalName && hospitalName && 
        (doctorHospitalName.includes(hospitalName) || hospitalName.includes(doctorHospitalName))) {
      return true;
    }

    return false;
  };

  const hospitalsData = useMemo(() => {
    const isApprovedStatus = (status) => {
      const value = String(status || '').toLowerCase();
      return value.includes('approve') || value === 'active';
    };

    return hospitalsRaw
      .filter((hospital) => isApprovedStatus(hospital.status))
      .map((hospital) => {
        const hospitalId = String(hospital.HID || hospital.id || '');
        const doctorsInHospital = normalizedDoctors.filter((doctor) => isDoctorForHospital(doctor, hospital));
        const deptIdsInHospital = [
          ...new Set(
            doctorsInHospital
              .map((doctor) => normalizeDepartmentId(doctor.departmentId || doctor.deptId))
              .filter(Boolean)
          ),
        ];
        const deptNamesFromDeptStore = departmentsRaw
          .filter(
            (dept) =>
              deptIdsInHospital.includes(normalizeDepartmentId(dept.id || dept.DID || dept.departmentId)) &&
              normalizeText(dept.status || 'active') === 'active'
          )
          .map((dept) => dept.name)
          .filter(Boolean);
        const derivedDepartments = [
          ...new Set([
            ...doctorsInHospital.flatMap((doctor) => getDoctorSpecializationCandidates(doctor)),
            ...deptNamesFromDeptStore,
          ].filter(Boolean)),
        ];
        return {
          id: hospitalId,
          name: hospital.hospitalName || hospital.hospital_name || hospital.name || 'Hospital',
          category: String(hospital.category || hospital.type || 'private').toLowerCase(),
          address: hospital.address || 'Address not provided',
          rating: Number(hospital.rating || 0),
          departments: Array.isArray(hospital.departments) && hospital.departments.length > 0
            ? hospital.departments
            : derivedDepartments,
          doctors: doctorsInHospital.length,
          beds: Number(hospital.totalBeds || hospital.beds || 0),
          fees: {
            consultation: Number(hospital.fees?.consultation || hospital.consultationFee || 500),
            registration: Number(hospital.fees?.registration || hospital.registrationFee || 100),
          },
        };
      });
  }, [hospitalsRaw, normalizedDoctors, departmentsRaw, hmUsersRaw]);

  const roomsData = useMemo(
    () =>
      roomsRaw.map((room) => ({
        id: room.id || `${room.number || room.roomNumber || 'ROOM'}-${Math.random().toString(36).slice(2, 8)}`,
        hospitalId: String(room.hospitalId || room.hospital_id || room.HID || ''),
        department: room.department || room.specialization || '',
        deptId: Number(room.deptId || room.departmentId || 0),
        deptName: room.deptName || room.departmentName || room.department || '',
        roomNumber: String(room.number || room.roomNumber || ''),
        floor: String(room.floor || '1'),
        available: String(room.status || '').toLowerCase() !== 'occupied',
      })),
    [roomsRaw]
  );

  const selectedHospitalDepartments = useMemo(() => {
    if (!selectedHospital) return [];

    const selectedHospitalId = String(selectedHospital.id || '');
    const selectedHospitalName = normalizeText(selectedHospital.name || selectedHospital.hospitalName || '');
    
    const matchedDepartments = departmentsRaw.filter((department) => {
      const departmentHospitalId = getDepartmentHospitalId(department);
      const status = normalizeText(department.status || 'active');
      return (!departmentHospitalId || departmentHospitalId === selectedHospitalId) && status === 'active';
    });

    const byName = new Map();

    matchedDepartments.forEach((department) => {
      const name = getDepartmentDisplayName(department);
      if (!name) return;
      const id = normalizeDepartmentId(department.id || department.DID || department.departmentId || name);
      byName.set(normalizeText(name), {
        id,
        name,
        specialization: name,
        icon: getDiseaseIcon(name),
        severity: 'Standard',
        departmentId: id,
      });
    });

    // Get all doctors (even if they don't perfectly match the hospital)
    // This helps when hospitals are static but doctors are from DB
    const allDocsForHospital = normalizedDoctors.filter((doctor) => {
      // Check strict match
      if (isDoctorForHospital(doctor, selectedHospital)) return true;
      
      // Fallback: Match by hospital name if hospital ID doesn't match
      const docHospitalName = normalizeText(doctor.hospitalName || doctor.hospital_name || '');
      return docHospitalName === selectedHospitalName && docHospitalName.length > 0;
    });

    allDocsForHospital.forEach((doctor) => {
      getDoctorSpecializationCandidates(doctor).forEach((candidate) => {
        const name = String(candidate || '').trim();
        if (!name) return;
        const key = normalizeText(name);
        if (!byName.has(key)) {
          const doctorDepartmentId = normalizeDepartmentId(doctor.departmentId || doctor.deptId || name);
          byName.set(key, {
            id: doctorDepartmentId || `dept-${key}`,
            name,
            specialization: name,
            icon: getDiseaseIcon(name),
            severity: 'Standard',
            departmentId: doctorDepartmentId,
          });
        }
      });
    });

    const result = Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
    
    console.log('🏥 SELECTED HOSPITAL DEPARTMENTS:', {
      hospitalName: selectedHospital?.name,
      hospitalId: selectedHospitalId,
      departmentsFromAPI: matchedDepartments.length,
      doctorsForHospital: allDocsForHospital.length,
      derivedDepartmentsCount: result.length,
      departments: result.slice(0, 5).map(d => d.name)
    });
    
    return result;
  }, [selectedHospital, departmentsRaw, normalizedDoctors, hmUsersRaw]);

  const departmentOptions = useMemo(() => selectedHospitalDepartments, [selectedHospitalDepartments]);

  const diseaseOptions = useMemo(() => {
    if (!selectedHospital) return [];

    // If a department is selected, filter diseases for that department
    if (selectedDepartmentId) {
      const targetDepartmentId = normalizeDepartmentId(selectedDepartmentId);
      const mappedDiseases = diseasesRaw
        .filter((disease) => {
          const diseaseDepartmentId = normalizeDepartmentId(disease.departmentId || disease.deptId || disease.department_id);
          const diseaseDepartmentName = normalizeText(disease.departmentName || getDepartmentNameById(diseaseDepartmentId));
          const targetDeptName = normalizeText(
            selectedHospitalDepartments.find((d) => normalizeDepartmentId(d.departmentId || d.id) === targetDepartmentId)?.name || ''
          );
          return (diseaseDepartmentId === targetDepartmentId || diseaseDepartmentName === targetDeptName);
        })
        .map((disease) => {
          const diseaseDepartmentId = normalizeDepartmentId(disease.departmentId || disease.deptId || disease.department_id);
          const specialization =
            getDepartmentNameById(diseaseDepartmentId) ||
            disease.departmentName ||
            disease.specialization ||
            disease.name ||
            'General Medicine';
          return {
            id: String(disease.id || `DIS-${normalizeText(disease.name)}`),
            name: String(disease.name || specialization).trim(),
            specialization: String(specialization).trim(),
            severity: String(disease.severity || 'Standard'),
            icon: getDiseaseIcon(disease.name || specialization),
            departmentId: diseaseDepartmentId,
          };
        });

      if (mappedDiseases.length > 0) {
        return mappedDiseases.sort((a, b) => a.name.localeCompare(b.name));
      }

      // Fallback to selected department
      const selectedDept = selectedHospitalDepartments.find((d) => normalizeDepartmentId(d.departmentId || d.id) === targetDepartmentId);
      return selectedDept
        ? [
            {
              id: String(selectedDept.id || `DEPT-${normalizeText(selectedDept.name)}`),
              name: selectedDept.name,
              specialization: selectedDept.specialization || selectedDept.name,
              severity: 'Standard',
              icon: selectedDept.icon || getDiseaseIcon(selectedDept.name),
              departmentId: targetDepartmentId,
            },
          ]
        : [];
    }

    // Original logic: filter diseases by hospital departments
    const departmentIds = new Set(
      selectedHospitalDepartments.map((department) => normalizeDepartmentId(department.departmentId || department.id)).filter(Boolean)
    );
    const departmentNames = new Set(
      selectedHospitalDepartments.map((department) => normalizeText(department.name || department.specialization)).filter(Boolean)
    );

    const mappedDiseases = diseasesRaw
      .filter((disease) => {
        const diseaseDepartmentId = normalizeDepartmentId(disease.departmentId || disease.deptId || disease.department_id);
        const diseaseDepartmentName = normalizeText(disease.departmentName || getDepartmentNameById(diseaseDepartmentId));
        return departmentIds.has(diseaseDepartmentId) || departmentNames.has(diseaseDepartmentName);
      })
      .map((disease) => {
        const diseaseDepartmentId = normalizeDepartmentId(disease.departmentId || disease.deptId || disease.department_id);
        const specialization =
          getDepartmentNameById(diseaseDepartmentId) ||
          disease.departmentName ||
          disease.specialization ||
          disease.name ||
          'General Medicine';

        return {
          id: String(disease.id || `DIS-${normalizeText(disease.name)}`),
          name: String(disease.name || specialization).trim(),
          specialization: String(specialization).trim(),
          severity: String(disease.severity || 'Standard'),
          icon: getDiseaseIcon(disease.name || specialization),
          departmentId: diseaseDepartmentId,
        };
      });

    if (mappedDiseases.length > 0) {
      return mappedDiseases.sort((a, b) => a.name.localeCompare(b.name));
    }

    // FALLBACK: If no diseases from API, use departments as disease options
    // This ensures users can still select something even if disease data is not available
    const fallbackDiseases = selectedHospitalDepartments.map((department) => ({
      id: String(department.id || `DEPT-${normalizeText(department.name)}`),
      name: department.name,
      specialization: department.specialization || department.name,
      severity: 'Standard',
      icon: department.icon || getDiseaseIcon(department.name),
      departmentId: normalizeDepartmentId(department.departmentId || department.id),
    }));

    console.log('📋 DISEASE OPTIONS DEBUG:', {
      selectedHospital: selectedHospital?.name,
      apiDiseasesCount: diseasesRaw.length,
      selectedDepartmentsCount: selectedHospitalDepartments.length,
      mappedDiseasesCount: mappedDiseases.length,
      fallbackDiseasesCount: fallbackDiseases.length,
      usingFallback: fallbackDiseases.length > 0,
      fallbackDiseases: fallbackDiseases.slice(0, 3).map(d => d.name)
    });

    return fallbackDiseases;
  }, [selectedHospital, selectedDepartmentId, selectedHospitalDepartments, diseasesRaw, departmentsRaw]);

  // ---------- Filter doctors by selected department ----------
  const departmentDoctors = useMemo(() => {
    if (!selectedHospital || !selectedDepartmentId) {
      // If hospital is selected but not department, show all doctors in that hospital
      if (selectedHospital) {
        return normalizedDoctors.filter((doctor) => isDoctorForHospital(doctor, selectedHospital));
      }
      return [];
    }

    // Filter doctors by selected department
    const targetDepartmentId = normalizeDepartmentId(selectedDepartmentId);
    return normalizedDoctors.filter((doctor) => {
      // Must be from selected hospital
      if (!isDoctorForHospital(doctor, selectedHospital)) return false;

      // Check if doctor's department matches
      const doctorDepartmentId = normalizeDepartmentId(doctor.departmentId || doctor.deptId);
      if (doctorDepartmentId === targetDepartmentId) return true;

      // Check specialization candidates
      const candidates = getDoctorSpecializationCandidates(doctor)
        .map((v) => normalizeText(v))
        .filter(Boolean);

      const targetDeptName = normalizeText(
        selectedHospitalDepartments.find((d) => normalizeDepartmentId(d.departmentId || d.id) === targetDepartmentId)?.name || ''
      );

      return candidates.some((c) => c === targetDeptName);
    });
  }, [selectedHospital, selectedDepartmentId, normalizedDoctors, selectedHospitalDepartments]);

  // ---------- Authentication ----------
  useEffect(() => {
    if (authLoading) return;
    if (!currentUser || String(currentUser?.role || '').toLowerCase() !== 'patient') {
      navigate('/login');
      return;
    }
    const patientData = patientsRaw.find(
      (item) => String(item.id || '') === String(currentUser.id || '') || item.email === currentUser.email
    );
    setPatient(patientData || currentUser);
  }, [authLoading, currentUser, navigate, patientsRaw]);

  // ---------- Filter diseases by hospital departments ----------
  useEffect(() => {
    if (!selectedHospital) {
      setFilteredDiseases([]);
      return;
    }
    let filtered = diseaseOptions;
    if (diseaseSearch) {
      filtered = filtered.filter(d =>
        String(d.name || '').toLowerCase().includes(diseaseSearch.toLowerCase()) ||
        String(d.specialization || '').toLowerCase().includes(diseaseSearch.toLowerCase())
      );
    }
    console.log('🔍 FILTERED DISEASES:', {
      hospitalName: selectedHospital?.name,
      diseaseOptionsCount: diseaseOptions.length,
      filteredCount: filtered.length,
      searchQuery: diseaseSearch,
      firstThree: filtered.slice(0, 3).map(d => d.name)
    });
    setFilteredDiseases(filtered);
  }, [selectedHospital, diseaseSearch, diseaseOptions]);

  useEffect(() => {
    if (!selectedDisease) return;
    const exists = filteredDiseases.some((item) => String(item.id) === String(selectedDisease));
    if (!exists) {
      setSelectedDisease('');
      setSelectedSpecialization('');
    }
  }, [filteredDiseases, selectedDisease]);

  useEffect(() => {
    if (!selectedHospital) return;
    const exists = hospitalsData.some((hospital) => String(hospital.id) === String(selectedHospital.id));
    if (!exists) {
      setSelectedHospital(null);
      setSelectedDisease('');
      setSelectedDepartmentId('');
      setSelectedSpecialization('');
    }
  }, [hospitalsData, selectedHospital]);

  // ---------- Allocation functions ----------
  const allocateDoctor = (hospital, specialization, departmentId, availableDoctorsPool = null) => {
    const targetDepartmentId = normalizeDepartmentId(departmentId);
    const targetSpecialization = normalizeText(specialization);

    if (!targetSpecialization && !targetDepartmentId) {
      console.warn('⚠️ allocateDoctor: No specialization or departmentId provided');
      return null;
    }

    // Use the provided doctor pool (e.g., departmentDoctors) or fall back to normalizedDoctors
    const doctorPool = availableDoctorsPool && availableDoctorsPool.length > 0 ? availableDoctorsPool : normalizedDoctors;

    const matchesDepartment = (doctor) => {
      const doctorDepartmentId = normalizeDepartmentId(doctor.departmentId || doctor.deptId);
      if (targetDepartmentId && doctorDepartmentId && doctorDepartmentId === targetDepartmentId) {
        return true;
      }

      const departmentCandidates = [
        doctor.departmentName,
        doctor.department,
        getDepartmentNameById(doctor.departmentId || doctor.deptId),
      ]
        .map((value) => normalizeText(value))
        .filter(Boolean);

      return departmentCandidates.some(
        (candidate) =>
          candidate === targetSpecialization ||
          candidate.includes(targetSpecialization) ||
          targetSpecialization.includes(candidate)
      );
    };

    const matchesSpecialization = (doctor) => {
      const candidates = [
        ...(doctor.specializationCandidates || []),
        ...getDoctorSpecializationCandidates(doctor),
      ]
        .map((value) => normalizeText(value))
        .filter(Boolean);

      // Direct match or substring match
      return candidates.some(
        (candidate) =>
          candidate === targetSpecialization ||
          candidate.includes(targetSpecialization) ||
          targetSpecialization.includes(candidate)
      );
    };

    const matchesSelectedCriteria = (doctor) =>
      matchesDepartment(doctor) || matchesSpecialization(doctor);

    // 1. STRICT: Same hospital + matches specialization + available + under capacity
    const strictAvailable = doctorPool.filter(
      (doc) =>
        isDoctorForHospital(doc, hospital) &&
        matchesSelectedCriteria(doc) &&
        doc.available !== false &&
        (doc.currentPatients || 0) < (doc.maxPatients || 20)
    );

    // 2. RELAXED: Any hospital + matches specialization + available + under capacity
    const relaxedAvailable = doctorPool.filter(
      (doc) =>
        matchesSelectedCriteria(doc) &&
        doc.available !== false &&
        (doc.currentPatients || 0) < (doc.maxPatients || 20)
    );

    // 3. STRICT: Same hospital + matches specialization (ignore availability)
    const strictAny = doctorPool.filter(
      (doc) => isDoctorForHospital(doc, hospital) && matchesSelectedCriteria(doc)
    );

    // 4. RELAXED: Any doctor matching specialization
    const relaxedAny = doctorPool.filter((doc) => matchesSelectedCriteria(doc));

    // 5. FALLBACK: Any doctor from the hospital (if no specialization match found)
    const hospitalFallback = doctorPool.filter((doc) => isDoctorForHospital(doc, hospital));

    // 6. LAST RESORT: ANY active doctor (matching is too strict, just assign someone)
    const absoluteFallback = doctorPool;

    const candidates =
      strictAvailable.length > 0
        ? strictAvailable
        : relaxedAvailable.length > 0
          ? relaxedAvailable
          : strictAny.length > 0
            ? strictAny
            : relaxedAny.length > 0
              ? relaxedAny
              : hospitalFallback.length > 0
                ? hospitalFallback
                : absoluteFallback;

    console.log('🏥 Doctor Allocation:', {
      targetSpecialization,
      targetDepartmentId,
      doctorPoolSize: doctorPool.length,
      usingDepartmentPool: availableDoctorsPool && availableDoctorsPool.length > 0,
      strictAvailable: strictAvailable.length,
      relaxedAvailable: relaxedAvailable.length,
      strictAny: strictAny.length,
      relaxedAny: relaxedAny.length,
      hospitalFallback: hospitalFallback.length,
      absoluteFallback: absoluteFallback.length,
      selectedTier: 
        strictAvailable.length > 0 ? 'strictAvailable' :
        relaxedAvailable.length > 0 ? 'relaxedAvailable' :
        strictAny.length > 0 ? 'strictAny' :
        relaxedAny.length > 0 ? 'relaxedAny' :
        hospitalFallback.length > 0 ? 'hospitalFallback' :
        'absoluteFallback',
      selected: candidates.length > 0 ? candidates[0].name : 'NONE'
    });

    if (candidates.length === 0) {
      console.error('❌ No doctors found for:', { targetSpecialization, targetDepartmentId });
      return null;
    }

    return candidates.sort((a, b) => {
      if (b.experience !== a.experience) return b.experience - a.experience;
      return (a.currentPatients || 0) - (b.currentPatients || 0);
    })[0];
  };

  const allocateRoom = (hospitalId, department, doctor) => {
    if (doctor?.roomNumber) {
      return { roomNumber: doctor.roomNumber, floor: doctor.floor || '1' };
    }
    const available = roomsData.filter((room) => {
      const sameHospital = !room.hospitalId || String(room.hospitalId) === String(hospitalId);
      const sameDepartment =
        normalizeText(room.department) === normalizeText(department) ||
        normalizeText(room.deptName) === normalizeText(department);
      return sameHospital && sameDepartment && room.available !== false;
    });
    const sortedAvailable = available
      .slice()
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

    if (sortedAvailable.length) {
      return sortedAvailable[0];
    }

    const fallbackByDepartment = roomsData.find((room) =>
      normalizeText(room.deptName) === normalizeText(department) || normalizeText(room.department) === normalizeText(department)
    );

    if (fallbackByDepartment) {
      return { roomNumber: fallbackByDepartment.roomNumber || '101', floor: fallbackByDepartment.floor || '1' };
    }

    return { roomNumber: doctor?.roomNumber || '101', floor: doctor?.floor || '1' };
  };

  const generateToken = (hospitalId, department, doctorId) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const queueNumber = Math.floor(Math.random() * 20) + 1;
    const estimatedWaitTime = queueNumber * 5;
    const priorityScore = 1;
    return {
      
      id: `TK-${hospitalId}${department.slice(0,3).toUpperCase()}${Date.now().toString().slice(-6)}`,
      tokenNumber: `T${hospitalId}${queueNumber.toString().padStart(3,'0')}`,
      queueNumber,
      date: dateStr,
      time: timeStr,
      estimatedWaitTime,
      priority: priorityScore > 2 ? 'High Priority' : 'Normal',
      hospitalId,
      department,
      doctorId,
      status: 'pending'
    };
  };

  const runAllocationAlgorithm = () => {
    if (!selectedHospital || !selectedSpecialization || !selectedDisease) {
      setAllocationError('Missing selection. Please go back.');
      return;
    }

    setAllocationError(null);
    setLoading(true);

    setTimeout(() => {
      try {
        const selectedDept = filteredDiseases.find((item) => String(item.id) === String(selectedDisease));
        const allocatedDoctor = allocateDoctor(
          selectedHospital,
          selectedSpecialization,
          selectedDept?.departmentId || selectedDepartmentId,
          selectedDepartmentId && departmentDoctors.length > 0 ? departmentDoctors : null
        );
        if (!allocatedDoctor) {
          setAllocationError('No doctor available for this specialization. Please choose another hospital or disease.');
          setLoading(false);
          return;
        }

        const allocatedRoom = allocateRoom(selectedHospital.id, selectedSpecialization, allocatedDoctor);
        const generatedToken = generateToken(selectedHospital.id, selectedSpecialization, allocatedDoctor.id);

        const consultationFee = selectedHospital.fees?.consultation || 500;
        const registrationFee = selectedHospital.fees?.registration || 100;
        const totalFee = consultationFee + registrationFee;

        // Generate consistent appointment ID
        const appointmentId = `APT-${Date.now()}-${Math.random().toString(36).substring(7)}`.substr(0, 30);

        const appointmentData = {
          id: appointmentId,
          patientId: String(patient.id || ''),
          patientName: patient.name,
          patientAge: patient.age || 30,
          patientGender: patient.gender || 'Male',
          hospitalId: String(selectedHospital.id || ''),
          hospitalName: selectedHospital.name,
          doctorId: String(allocatedDoctor.id || ''),
          doctorName: allocatedDoctor.name,
          doctorSpecialization: allocatedDoctor.specialization,
          doctorExperience: allocatedDoctor.experience,
          roomNumber: allocatedRoom.roomNumber,
          roomFloor: allocatedRoom.floor || '1',
          diseaseId: selectedDisease,
          diseaseName: selectedDept?.name || selectedSpecialization,
          departmentId: selectedDept?.departmentId || selectedDepartmentId || null,
          departmentName: selectedDept?.specialization || selectedSpecialization,
          specialization: selectedSpecialization,
          appointmentDate: new Date().toISOString().split('T')[0],
          appointmentTime: generatedToken.time,
          token: generatedToken,
          fees: { consultation: consultationFee, registration: registrationFee, total: totalFee },
          status: 'pending_payment',
          createdAt: new Date().toISOString()
        };

        setAppointmentDetails(appointmentData);
        setToken(generatedToken);
        setLoading(false);
      } catch (error) {
        console.error(error);
        setAllocationError('Unexpected error. Please try again.');
        setLoading(false);
      }
    }, 1500);
  };

  // Auto-start allocation when step becomes 3
  useEffect(() => {
    if (step === 3 && selectedHospital && selectedSpecialization && selectedDisease && !appointmentDetails && !allocationError && !loading) {
      // Debug: Log what we're trying to match
      console.log('🔍 ALLOCATION DEBUG:', {
        hospital: selectedHospital.name,
        specialization: selectedSpecialization,
        departmentId: selectedDepartmentId,
        totalDoctors: normalizedDoctors.length,
        departmentFilteredDoctors: departmentDoctors.length,
        doctorsForHospital: normalizedDoctors.filter(d => isDoctorForHospital(d, selectedHospital)).length,
        sampleDoctors: normalizedDoctors.slice(0, 2).map(d => ({
          name: d.name,
          specialization: d.specialization,
          departmentId: d.departmentId,
          hospitalsMatch: isDoctorForHospital(d, selectedHospital)
        }))
      });
      runAllocationAlgorithm();
    }
  }, [step, selectedHospital, selectedSpecialization, selectedDisease, departmentDoctors, selectedDepartmentId]);

  const ensureQueueForBooking = async () => {
    const allQueues = await queueService.fetchAll();
    const queueList = Array.isArray(allQueues?.queues)
      ? allQueues.queues
      : Array.isArray(allQueues)
        ? allQueues
        : [];

    const existingQueue = queueList.find((queue) =>
      String(queue.hospital_id || queue.hospitalId) === String(appointmentDetails.hospitalId) &&
      String(queue.doctor_id || queue.doctorId) === String(appointmentDetails.doctorId)
    );

    if (existingQueue) {
      return existingQueue.id;
    }

    const createdQueue = await queueService.create({
      hospital_id: String(appointmentDetails.hospitalId),
      doctor_id: String(appointmentDetails.doctorId),
      doctor_name: appointmentDetails.doctorName,
      department: appointmentDetails.specialization,
      room: String(appointmentDetails.roomNumber || ''),
    });

    return createdQueue?.id;
  };

  // ---------- Payment handler ----------
  const handlePayment = () => {
    setLoading(true);
    setTimeout(async () => {
      const now = new Date();
      const expirationDate = new Date(now);
      expirationDate.setDate(now.getDate() + 7);
      const amountTotal = Number(appointmentDetails?.fees?.total || 0);
      const consultationFee = Number(appointmentDetails?.fees?.consultation || 0);
      const registrationFee = Number(appointmentDetails?.fees?.registration || 0);

      let backendToken = null;
      try {
        const queueId = await ensureQueueForBooking();
        if (queueId) {
          backendToken = await tokenService.create({
            queue_id: queueId,
            patient_id: String(patient?.id || ''),
            patient_name: patient?.name || 'Patient',
            patient_phone: patient?.phone || '',
            patient_email: patient?.email || '',
            appointment_type: 'regular',
            priority: token?.priority === 'High Priority' ? 'high' : 'normal',
            notes: appointmentDetails?.diseaseName || '',
          });
        }
      } catch (error) {
        console.error('Backend token creation failed, keeping local token only:', error);
      }

      const confirmedAppointment = {
        ...appointmentDetails,
        status: 'confirmed',
        paymentStatus: 'paid',
        paymentDate: now.toISOString(),
        expirationDate: expirationDate.toISOString(),
        backendTokenId: backendToken?.id || null,
      };

      // Save to backend API
      try {
        await api.post('/appointments/create', confirmedAppointment);
        console.log('✅ Appointment saved to backend API');

        // 🔥 Save to Firebase "bills" collection for legacy hm/Revenue.jsx compatibility
        try {
          const { default: fbs } = await import('../../services/firebaseDbService.js');
          const billId = `BILL-${confirmedAppointment.id || Date.now()}`;
          await fbs.upsert('bills', billId, {
            id: billId,
            appointmentId: confirmedAppointment.id || '',
            patientId: confirmedAppointment.patientId || '',
            patient: confirmedAppointment.patientName || 'Unknown Patient',
            patientName: confirmedAppointment.patientName || 'Unknown Patient',
            doctorId: confirmedAppointment.doctorId || '',
            doctor: confirmedAppointment.doctorName || 'Unknown Doctor',
            doctorName: confirmedAppointment.doctorName || 'Unknown Doctor',
            hospitalId: confirmedAppointment.hospitalId || '',
            hospital: confirmedAppointment.hospitalName || 'Unknown Hospital',
            amount: Number(amountTotal || 0),
            status: 'paid',
            paymentStatus: 'paid',
            category: confirmedAppointment.departmentName || confirmedAppointment.specialization || 'Consultation',
            date: now.toISOString(),
            createdAt: now.toISOString()
          });
          console.log('✅ Bill saved to Firebase for revenue tracking');
        } catch (fbErr) {
          console.error('Failed to save bill to Firebase:', fbErr);
        }
      } catch (apiError) {
        console.error('❌ Failed to save appointment:', apiError);
        throw new Error('Failed to save appointment');
      }

      recordHistory({
        module: 'booking',
        action: 'advanced-payment-success',
        message: `Appointment booked with ${confirmedAppointment.doctorName} at ${confirmedAppointment.hospitalName}`,
        patientId: String(confirmedAppointment.patientId || ''),
        doctorId: String(confirmedAppointment.doctorId || ''),
        hospitalId: String(confirmedAppointment.hospitalId || ''),
        appointmentId: String(confirmedAppointment.id || ''),
        meta: {
          bookingType: 'regular',
          amount: amountTotal,
          token: token?.tokenNumber || token?.id || '',
        },
      });

      setPaymentStatus('success');
      setLoading(false);
      setStep(5);
    }, 1000);
  };

  // ---------- Navigation helpers ----------
  const goBackToDisease = () => {
    setAllocationError(null);
    setStep(2);
  };
  const changeHospital = () => {
    setAllocationError(null);
    setSelectedHospital(null);
    setHospitalCategory('');
    setSelectedDepartmentId('');
    setStep(1);
  };

  const copyTokenToClipboard = () => {
    navigator.clipboard.writeText(token.tokenNumber);
    alert('Token copied to clipboard!');
  };

  // ---------- IMPROVED TOKEN CERTIFICATE COMPONENT ----------
  const TokenCertificate = ({ token, appointment, patient, hospital }) => {
    const handlePrint = () => {
      const escapeHtml = (value) =>
        String(value ?? '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#39;');

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
        <html>
          <head>
            <title>Appointment Token</title>
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; font-family: 'Segoe UI', Roboto, sans-serif; }
              body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #f1f5f9; padding: 16px; }
              .token-certificate {
                max-width: 560px;
                width: 100%;
                background: white;
                border-radius: 24px;
                padding: 32px 28px;
                box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
                position: relative;
                border: 1px solid #e2e8f0;
              }
              .token-certificate::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 8px;
                background: linear-gradient(90deg, #2563eb, #3b82f6, #60a5fa);
                border-radius: 24px 24px 0 0;
              }
              .token-id {
                position: absolute;
                top: 20px;
                right: 28px;
                background: #1e3a8a;
                color: white;
                padding: 6px 16px;
                border-radius: 40px;
                font-weight: 600;
                font-size: 13px;
                letter-spacing: 0.5px;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
              }
              .hospital-header {
                text-align: center;
                margin: 20px 0 24px;
              }
              .hospital-name {
                color: #0f172a;
                font-size: 30px;
                font-weight: 700;
                line-height: 1.2;
                margin-bottom: 6px;
              }
              .hospital-tagline {
                color: #475569;
                font-size: 14px;
                border-bottom: 2px solid #dbeafe;
                padding-bottom: 20px;
                margin-bottom: 8px;
              }
              .profile-container {
                display: flex;
                justify-content: center;
                margin: 24px 0 32px;
              }
              .profile-icon {
                width: 96px;
                height: 96px;
                border-radius: 50%;
                background: linear-gradient(145deg, #2563eb, #1e40af);
                display: flex;
                align-items: center;
                justify-content: center;
                border: 4px solid #bfdbfe;
                box-shadow: 0 10px 15px -3px rgba(37,99,235,0.2);
              }
              .profile-icon i {
                font-size: 44px;
                color: white;
              }
              .token-details {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 16px;
                margin-bottom: 32px;
              }
              .token-row {
                background: #f8fafc;
                border-radius: 16px;
                padding: 14px 16px;
                border-left: 5px solid #3b82f6;
                box-shadow: 0 2px 4px rgba(0,0,0,0.02);
              }
              .token-label {
                font-size: 12px;
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.3px;
                color: #64748b;
                margin-bottom: 6px;
                display: block;
              }
              .token-value {
                font-size: 16px;
                font-weight: 700;
                color: #0f172a;
                word-break: break-word;
              }
              .prescription-gap {
                background: #f0f9ff;
                border: 2px dashed #7aa7ff;
                border-radius: 24px;
                padding: 28px 20px;
                text-align: center;
                margin: 30px 0 20px;
              }
              .prescription-line {
                height: 2px;
                background: repeating-linear-gradient(90deg, #3b82f6 0px, #3b82f6 8px, transparent 8px, transparent 16px);
                margin: 16px 0;
              }
              .gap-label {
                color: #1e3a8a;
                font-weight: 700;
                font-size: 18px;
                text-transform: uppercase;
                margin: 10px 0;
              }
              .gap-subtext {
                color: #334155;
                font-size: 14px;
              }
              .token-actions {
                display: flex;
                gap: 12px;
                justify-content: center;
                margin-top: 28px;
              }
              .action-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 40px;
                font-weight: 600;
                font-size: 15px;
                cursor: pointer;
                display: inline-flex;
                align-items: center;
                gap: 10px;
                transition: all 0.2s;
                box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
              }
              .print-btn {
                background: #2563eb;
                color: white;
              }
              .print-btn:hover { background: #1d4ed8; }
              .emergency-btn {
                background: #dc2626;
                color: white;
              }
              .emergency-btn:hover { background: #b91c1c; }
              @media (max-width: 500px) {
                .token-certificate { padding: 24px 16px; }
                .token-details { grid-template-columns: 1fr; }
                .token-actions { flex-direction: column; }
                .hospital-name { font-size: 24px; }
              }
            </style>
          </head>
          <body>
            <div class="token-certificate" id="token-certificate-content">
              <div class="token-id">TOKEN: #${escapeHtml(token.id)}</div>
              <div class="hospital-header">
                <h1 class="hospital-name">${escapeHtml(hospital.name)}</h1>
                <p class="hospital-tagline">Quality Care • Advanced Treatment • Patient First</p>
              </div>
              <div class="profile-container">
                <div class="profile-icon">
                  <i class="fas fa-user-md"></i>
                </div>
              </div>
              <div class="token-details">
                <div class="token-row"><span class="token-label">Patient Name</span><span class="token-value">${escapeHtml(patient.name)}</span></div>
                <div class="token-row"><span class="token-label">Token Number</span><span class="token-value">${escapeHtml(token.tokenNumber)}</span></div>
                <div class="token-row"><span class="token-label">Diagnosis</span><span class="token-value">${escapeHtml(appointment.diseaseName)}</span></div>
                <div class="token-row"><span class="token-label">Doctor</span><span class="token-value">${escapeHtml(appointment.doctorName)}</span></div>
                <div class="token-row"><span class="token-label">Room</span><span class="token-value">${escapeHtml(appointment.specialization)} - ${escapeHtml(appointment.roomNumber)}</span></div>
                <div class="token-row"><span class="token-label">Time</span><span class="token-value">${escapeHtml(appointment.appointmentTime)}</span></div>
                <div class="token-row"><span class="token-label">Date</span><span class="token-value">${escapeHtml(token.date)}</span></div>
                <div class="token-row"><span class="token-label">Priority</span><span class="token-value">${escapeHtml(token.priority)}</span></div>
              </div>
              <div class="prescription-gap">
                <div class="prescription-line"></div>
                <p class="gap-label">Prescription & Medical Notes</p>
                <div class="prescription-line"></div>
                <p class="gap-subtext">This area is reserved for the doctor's prescription, treatment notes, and follow‑up instructions.</p>
              </div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    };

    return (
      
      <div className="token-certificate" id="token-certificate-content">
        <div className="token-id">TOKEN: #{token.id}</div>
        <div className="hospital-header">
          <h1 className="hospital-name">{hospital.name}</h1>
          <p className="hospital-tagline">Quality Care • Advanced Treatment • Patient First</p>
        </div>
        <div className="profile-container">
          <div className="profile-icon">
            <i className="fas fa-user-md"></i>
          </div>
        </div>
        <div className="token-details">
          <div className="token-row">
            <span className="token-label">Patient Name</span>
            <span className="token-value">{patient.name}</span>
          </div>
          <div className="token-row">
            <span className="token-label">Token Number</span>
            <span className="token-value">{token.tokenNumber}</span>
          </div>
          <div className="token-row">
            <span className="token-label">Diagnosis</span>
            <span className="token-value">{appointment.diseaseName}</span>
          </div>
          <div className="token-row">
            <span className="token-label">Doctor</span>
            <span className="token-value">{appointment.doctorName}</span>
          </div>
          <div className="token-row">
            <span className="token-label">Room</span>
            <span className="token-value">{appointment.specialization} - {appointment.roomNumber}</span>
          </div>
          <div className="token-row">
            <span className="token-label">Time</span>
            <span className="token-value">{appointment.appointmentTime}</span>
          </div>
          <div className="token-row">
            <span className="token-label">Date</span>
            <span className="token-value">{token.date}</span>
          </div>
          <div className="token-row">
            <span className="token-label">Priority</span>
            <span className="token-value">{token.priority}</span>
          </div>
        </div>
        <div className="prescription-gap">
          <div className="prescription-line"></div>
          <p className="gap-label">Prescription & Medical Notes</p>
          <div className="prescription-line"></div>
          <p className="gap-subtext">This area is reserved for the doctor's prescription, treatment notes, and follow‑up instructions.</p>
        </div>
        <div className="token-actions">
          <button className="action-btn print-btn" onClick={handlePrint}>
            <i className="fas fa-print"></i> Print Token
          </button>
          <button className="action-btn emergency-btn" onClick={() => window.location.href = 'tel:108'}>
            <i className="fas fa-phone-alt"></i> Emergency (108)
          </button>
        </div>
      </div>
    );
  };

  // ---------- RENDER STEPS ----------
  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="step-content">
            <h3>Select Hospital</h3>
            <p className="step-description">Choose a hospital category or search by name</p>

            {/* IMPROVED CATEGORY SELECTOR */}
         <div className="category-selector">
  <button
    className={`category-option ${hospitalCategory === 'government' ? 'active' : ''}`}
    onClick={() => setHospitalCategory('government')}
  >
    <FontAwesomeIcon icon={faBuilding} />
    <span>Government</span>
  </button>
  <button
    className={`category-option ${hospitalCategory === 'private' ? 'active' : ''}`}
    onClick={() => setHospitalCategory('private')}
  >
    <FontAwesomeIcon icon={faHospital} />
    <span>Private</span>
  </button>
  <button
    className={`category-option ${hospitalCategory === '' ? 'active' : ''}`}
    onClick={() => setHospitalCategory('')}
  >
    <FontAwesomeIcon icon={faShieldAlt} />
    <span>All</span>
  </button>
</div>
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} />
              <input
                type="text"
                placeholder="Search hospital by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="hospital-list">
              {hospitalsData
                .filter(h => (!hospitalCategory || h.category === hospitalCategory) && 
                            h.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map(hospital => (
                  <div 
                    key={hospital.id} 
                    className={`hospital-card ${selectedHospital?.id === hospital.id ? 'selected' : ''}`}
                    onClick={() => setSelectedHospital(hospital)}
                  >
                    <div className="hospital-header">
                      <h4>{hospital.name}</h4>
                      <span className="rating"><FontAwesomeIcon icon={faStar} /> {hospital.rating}</span>
                    </div>
                    <p><FontAwesomeIcon icon={faMapMarkerAlt} /> {hospital.address}</p>
                    <p><FontAwesomeIcon icon={faUserMd} /> {hospital.doctors} Doctors • {hospital.beds} Beds</p>
                    <p>Departments: {hospital.departments.join(', ')}</p>
                    <div className="fees-preview">
                      <span>Consultation: ₹{hospital.fees.consultation}</span>
                      <span>Registration: ₹{hospital.fees.registration}</span>
                    </div>
                  </div>
                ))}
              {hospitalsData.filter(h => (!hospitalCategory || h.category === hospitalCategory) && h.name.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 && (
                <p className="no-results">No approved hospitals available.</p>
              )}
            </div>

            {selectedHospital && (
              <div className="selected-summary">
                <p><strong>Selected:</strong> {selectedHospital.name}</p>
                <button className="btn-primary" onClick={() => setStep(2)}>
                  Next <FontAwesomeIcon icon={faChevronRight} />
                </button>
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div className="step-content">
            <h3>Select Disease / Specialty</h3>
            <p className="step-description">Choose from available diseases at {selectedHospital?.name}</p>
            
            <div className="search-box">
              <FontAwesomeIcon icon={faSearch} />
              <input
                type="text"
                placeholder="Search disease or specialty..."
                value={diseaseSearch}
                onChange={(e) => setDiseaseSearch(e.target.value)}
              />
            </div>

            {/* Debug info */}
            {filteredDiseases.length === 0 && (
              <div style={{ padding: '10px', background: '#f3f4f6', borderRadius: '8px', marginBottom: '15px', fontSize: '12px' }}>
                <p><strong>Debug:</strong> selectedHospital={selectedHospital?.name}, departments={selectedHospitalDepartments.length}, diseases={diseaseOptions.length}</p>
              </div>
            )}

            <div className="disease-list">
              {filteredDiseases.length > 0 ? (
                filteredDiseases.map(disease => (
                  <div 
                    key={disease.id}
                    className={`disease-card ${selectedDisease === disease.id.toString() ? 'selected' : ''}`}
                    onClick={() => {
                      setSelectedDisease(String(disease.id));
                      setSelectedDepartmentId(String(disease.departmentId || disease.id || ''));
                      setSelectedSpecialization(disease.specialization);
                    }}
                  >
                    <div className="disease-icon">
                      <FontAwesomeIcon icon={disease.icon} />
                    </div>
                    <div className="disease-info">
                      <h4>{disease.name}</h4>
                      <p>{disease.specialization} • Severity: {disease.severity}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ padding: '20px', textAlign: 'center' }}>
                  <p className="no-results">No diseases available for this hospital.</p>
                  <button className="btn-secondary" onClick={() => {
                    setSelectedHospital(null);
                    setHospitalCategory('');
                    setSelectedDepartmentId('');
                    setSelectedDisease('');
                    setStep(1);
                  }} style={{ marginTop: '10px' }}>
                    Select Different Hospital
                  </button>
                </div>
              )}
            </div>

            {selectedDisease && (
              <div className="selected-summary">
                <p><strong>Selected:</strong> {filteredDiseases.find((item) => String(item.id) === String(selectedDisease))?.name}</p>
                <div className="button-group">
                  <button className="btn-secondary" onClick={() => {
                    setSelectedHospital(null);
                    setHospitalCategory('');
                    setSelectedDepartmentId('');
                    setSelectedDisease('');
                    setStep(1);
                  }}>
                    <FontAwesomeIcon icon={faArrowLeft} /> Back
                  </button>
                  <button className="btn-primary" onClick={() => setStep(3)}>
                    Find Doctor <FontAwesomeIcon icon={faChevronRight} />
                  </button>
                </div>
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="step-content">
            <h3>Allocating Resources</h3>
            <p className="step-description">Finding the best doctor and room for you</p>
            
            {loading && (
              <div className="allocation-loading">
                <FontAwesomeIcon icon={faSpinner} spin size="3x" />
                <p>Analyzing availability...</p>
              </div>
            )}

            {allocationError && (
              <div className="error-message">
                <FontAwesomeIcon icon={faExclamationTriangle} />
                <p>{allocationError}</p>
                <button className="btn-secondary" onClick={goBackToDisease}>Go Back</button>
              </div>
            )}

            {appointmentDetails && !loading && (
              <div className="allocation-result">
                <h4>Doctor Assigned</h4>
                <div className="doctor-card">
                  <FontAwesomeIcon icon={faUserMd} />
                  <div>
                    <p><strong>{appointmentDetails.doctorName}</strong></p>
                    <p>{appointmentDetails.doctorSpecialization} • {appointmentDetails.doctorExperience} years exp.</p>
                    <p>Room: {appointmentDetails.roomNumber} (Floor {appointmentDetails.roomFloor})</p>
                  </div>
                </div>

                <div className="token-preview">
                  <h4>Token Details</h4>
                  <p><FontAwesomeIcon icon={faTicketAlt} /> Token: <strong>{token.tokenNumber}</strong></p>
                  <p><FontAwesomeIcon icon={faClock} /> Estimated wait: {token.estimatedWaitTime} mins</p>
                  <p><FontAwesomeIcon icon={faCalendarAlt} /> Date: {token.date} at {token.appointmentTime}</p>
                </div>

                <div className="fee-summary">
                  <h4>Fee Summary</h4>
                  <p>Consultation: ₹{appointmentDetails.fees.consultation}</p>
                  <p>Registration: ₹{appointmentDetails.fees.registration}</p>
                  <p><strong>Total: ₹{appointmentDetails.fees.total}</strong></p>
                </div>

                <div className="action-buttons">
                  <button className="btn-secondary" onClick={goBackToDisease}>Change Disease</button>
                  <button className="btn-primary" onClick={() => setStep(4)}>Proceed to Payment</button>
                </div>
              </div>
            )}
          </div>
        );

      case 4:
        return (
          <div className="step-content">
            <h3>Payment</h3>
            <p className="step-description">Complete your booking</p>

            <div className="payment-methods">
              <label className={`payment-method ${selectedPaymentMethod === 'card' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="card"
                  checked={selectedPaymentMethod === 'card'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                />
                <FontAwesomeIcon icon={faCreditCard} />
                <span>Credit / Debit Card</span>
              </label>

              <label className={`payment-method ${selectedPaymentMethod === 'qr' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="payment"
                  value="qr"
                  checked={selectedPaymentMethod === 'qr'}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                />
                <FontAwesomeIcon icon={faQrcode} />
                <span>QR Code</span>
              </label>
            </div>

            {selectedPaymentMethod === 'card' && (
              <div className="card-form">
                <input type="text" placeholder="Card Number" />
                <div className="row">
                  <input type="text" placeholder="MM/YY" />
                  <input type="text" placeholder="CVV" />
                </div>
                <input type="text" placeholder="Cardholder Name" />
              </div>
            )}

            {selectedPaymentMethod === 'qr' && (
              <div className="qr-payment">
                <img src={hospitalQrImage} alt="Hospital payment QR" />
                <p>Scan this hospital QR in any UPI app and then click Pay Now.</p>
              </div>
            )}

            <div className="amount-due">
              <h4>Total Amount: ₹{appointmentDetails?.fees.total}</h4>
            </div>

            <div className="action-buttons">
              <button className="btn-secondary" onClick={() => setStep(3)}>Back</button>
              <button className="btn-primary" onClick={handlePayment} disabled={loading}>
                {loading ? <FontAwesomeIcon icon={faSpinner} spin /> : 'Pay Now'}
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="step-content">
            <h3><FontAwesomeIcon icon={faCheckCircle} /> Appointment Confirmed!</h3>
            <p className="step-description">Your appointment has been booked successfully</p>
            {paymentStatus === 'success' ? (
              <div className="confirmation-container">
                <div className="confirmation-card success">
                  <div className="confirmation-header">
                    <FontAwesomeIcon icon={faCheckCircle} size="3x" />
                    <h4>Payment Successful!</h4>
                    <p>Your appointment has been confirmed</p>
                  </div>
                  <div className="confirmation-details">
                    <div className="detail-item">
                      <FontAwesomeIcon icon={faTicketAlt} />
                      <div><h5>Token Number</h5><p className="token-big">{token.tokenNumber}</p></div>
                    </div>
                    <div className="detail-item">
                      <FontAwesomeIcon icon={faClock} />
                      <div><h5>Appointment Time</h5><p>{appointmentDetails.appointmentTime}</p></div>
                    </div>
                    <div className="detail-item">
                      <FontAwesomeIcon icon={faUserMd} />
                      <div><h5>Doctor</h5><p>{appointmentDetails.doctorName}</p></div>
                    </div>
                    <div className="detail-item">
                      <FontAwesomeIcon icon={faDoorOpen} />
                      <div><h5>Room</h5><p>{appointmentDetails.roomNumber}</p></div>
                    </div>
                  </div>
                  <div className="confirmation-actions">
                    <button className="btn-primary" onClick={() => setShowTokenPreview(true)}>
                      <FontAwesomeIcon icon={faPrint} /> View & Print Token
                    </button>
                    <button className="btn-secondary" onClick={() => navigate('/patient/dashboard')}>
                      Go to Dashboard
                    </button>
                  </div>
                  <div className="confirmation-note">
                    <FontAwesomeIcon icon={faExclamationTriangle} />
                    <p>Please carry your token number and reach 15 minutes before appointment time.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="payment-pending">
                <div className="loading-spinner"></div>
                <p>Processing your payment...</p>
              </div>
            )}

            {showTokenPreview && (
              <div className="token-modal-overlay">
                <div className="token-modal">
                  <div className="token-modal-header">
                    <h4>Your Appointment Token</h4>
                    <button onClick={() => setShowTokenPreview(false)}>×</button>
                  </div>
                  <div className="token-modal-body" id="token-preview">
                    <TokenCertificate
                      token={token}
                      appointment={appointmentDetails}
                      patient={patient}
                      hospital={selectedHospital}
                    />
                  </div>
                  <div className="token-modal-footer">
                    <button className="btn-secondary" onClick={copyTokenToClipboard}>
                      <FontAwesomeIcon icon={faCopy} /> Copy Token
                    </button>
                    <button className="btn-primary" onClick={() => setShowTokenPreview(false)}>
                      Close
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (!patient) return <div className="loading-spinner" />;

  return (
    <div className="book-appointment-page">
      <header className="appointment-header">
        <button className="back-btn" onClick={() => navigate('/patient/dashboard')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back
        </button>
        <h2><FontAwesomeIcon icon={faCalendarPlus} /> Book Appointment</h2>
        <div className="patient-info"><FontAwesomeIcon icon={faUser} /> {patient.name}</div>
      </header>

      <div className="appointment-stepper">
        {[1,2,3,4,5].map(i => (
          <div key={i} className={`step ${step >= i ? 'active' : ''}`}>
            <div className="step-number">{i}</div>
            <div className="step-label">{['Hospital','Disease','Allocation','Payment','Confirm'][i-1]}</div>
          </div>
        ))}
      </div>

      <div className="appointment-content">{renderStepContent()}</div>

      <div className="appointment-footer">
        {step > 1 && step < 5 && (
          <button className="btn-secondary" onClick={() => setStep(step-1)}>
            <FontAwesomeIcon icon={faArrowLeft} /> Previous
          </button>
        )}
        <span>Step {step} of 5</span>
      </div>
       <style>{`
      .category-selector {
        display: flex;
        gap: 8px;
        background: #f1f5f9;
        padding: 6px;
        border-radius: 48px;
        margin-bottom: 24px;
        max-width: 400px;
      }
      .category-option {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 12px 16px;
        border: none;
        background: transparent;
        border-radius: 40px;
        font-weight: 600;
        color: #475569;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 15px;
      }
      .category-option.active {
        background: white;
        color: #1e40af;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      }
      .category-option svg {
        font-size: 16px;
      }
      .category-option:hover:not(.active) {
        background: #e2e8f0;
      }
    `}</style>

    </div>
  );
};

export default BookAppointment;