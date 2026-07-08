// Profile.js – Enhanced with better spacing, modern avatar, and refined UI
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "../../context/AuthContext";
import patientService from "../../services/patientService";
import {
    faUser,
    faEnvelope,
    faPhone,
    faCalendar,
    faDroplet,
    faEdit,
    faSave,
    faXmark,
    faCamera,
    faShieldHalved,
    faHistory,
    faFileMedical,
    faHospital,
    faMapMarkerAlt,
    faVenusMars,
    faCakeCandles,
    faIdCard,
    faCircleCheck,
    faClock,
    faChartSimple,
    faFilePrescription,
    faCalendarCheck,
    faUserDoctor,
    faStethoscope,
    faPrescriptionBottle,
} from "@fortawesome/free-solid-svg-icons";

const Profile = () => {
    const navigate = useNavigate();
    const { currentUser, loading: authLoading } = useAuth();

    const [patient, setPatient] = useState(null);
    const [patientAvatar, setPatientAvatar] = useState(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editForm, setEditForm] = useState({});
    const [message, setMessage] = useState({ type: '', text: '' });
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        medicalRecords: 0,
        appointments: 0,
        prescriptions: 0,
    });

    // Load patient profile from API
    useEffect(() => {
        if (authLoading) return;

        if (!currentUser || currentUser.role !== 'patient') {
            navigate('/login', { replace: true });
            return;
        }

        const loadProfile = async () => {
            try {
                setLoading(true);
                const [profileData, appointmentsData, recordsData, prescriptionsData] = await Promise.all([
                    patientService.getMyProfile(),
                    patientService.getMyAppointments(),
                    patientService.getMedicalRecords(),
                    patientService.getPrescriptions ? patientService.getPrescriptions() : Promise.resolve([]),
                ]);

                if (profileData) {
                    setPatient(profileData);
                    setEditForm({
                        full_name: profileData.full_name || profileData.name || '',
                        email: profileData.email || '',
                        phone: profileData.phone || '',
                        dob: profileData.dob || profileData.date_of_birth || '',
                        gender: profileData.gender || '',
                        bloodGroup: profileData.bloodGroup || profileData.blood_group || '',
                        address: profileData.address || '',
                        hospitalId: profileData.hospital_id || '',
                    });
                }

                setStats({
                    appointments: Array.isArray(appointmentsData) ? appointmentsData.length : 0,
                    medicalRecords: Array.isArray(recordsData) ? recordsData.length : 0,
                    prescriptions: Array.isArray(prescriptionsData) ? prescriptionsData.length : 0,
                });
            } catch (error) {
                console.error('Error loading profile:', error);
            } finally {
                setLoading(false);
            }
        };

        loadProfile();
    }, [authLoading, currentUser, navigate]);

    const handleEditToggle = () => {
        if (isEditing) {
            setEditForm({
                full_name: patient?.full_name || patient?.name || '',
                email: patient?.email || '',
                phone: patient?.phone || '',
                dob: patient?.dob || patient?.date_of_birth || '',
                gender: patient?.gender || '',
                bloodGroup: patient?.bloodGroup || patient?.blood_group || '',
                address: patient?.address || '',
                hospitalId: patient?.hospital_id || '',
            });
        }
        setIsEditing(!isEditing);
    };

    const handleSave = async () => {
        if (!editForm.full_name?.trim()) {
            setMessage({ type: 'error', text: 'Full name is required.' });
            return;
        }

        if (!editForm.email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email)) {
            setMessage({ type: 'error', text: 'A valid email address is required.' });
            return;
        }

        if (editForm.phone && !/^[0-9]{10,15}$/.test(String(editForm.phone).replace(/[^0-9]/g, ''))) {
            setMessage({ type: 'error', text: 'Phone number must contain 10 to 15 digits.' });
            return;
        }

        try {
            const updateData = {
                full_name: editForm.full_name,
                email: editForm.email,
                phone: editForm.phone,
                dob: editForm.dob,
                gender: editForm.gender,
                blood_group: editForm.bloodGroup,
                address: editForm.address,
                hospital_id: editForm.hospitalId,
            };

            await patientService.updateProfile(updateData);

            setPatient(prev => ({
                ...prev,
                ...updateData,
                bloodGroup: editForm.bloodGroup,
            }));

            setIsEditing(false);
            setMessage({ type: 'success', text: 'Profile updated successfully.' });

            setTimeout(() => setMessage({ type: '', text: '' }), 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
            setMessage({ type: 'error', text: 'Failed to save profile.' });
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setEditForm((prev) => ({ ...prev, [name]: value }));
    };

    const normalizedStatus = String(patient?.status || 'active').toLowerCase();
    const statusLabel = normalizedStatus === 'active' ? 'Active' :
        normalizedStatus === 'blocked' ? 'Blocked' :
        normalizedStatus === 'inactive' ? 'Inactive' : normalizedStatus;

    const displayName = patient?.full_name || patient?.name || 'Patient';
    const avatarLetter = displayName.charAt(0).toUpperCase();

    const calculateAge = (dob) => {
        if (!dob) return "N/A";
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
        return age;
    };

    const getInitials = (name) => {
        if (!name) return 'P';
        const parts = name.trim().split(' ');
        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
    };

    const getGradient = (name) => {
        const colors = [
            'linear-gradient(135deg, #6366f1, #8b5cf6)',
            'linear-gradient(135deg, #ec4899, #f472b6)',
            'linear-gradient(135deg, #3b82f6, #60a5fa)',
            'linear-gradient(135deg, #10b981, #34d399)',
            'linear-gradient(135deg, #f59e0b, #fbbf24)',
            'linear-gradient(135deg, #ef4444, #f87171)',
            'linear-gradient(135deg, #8b5cf6, #a78bfa)',
            'linear-gradient(135deg, #14b8a6, #2dd4bf)',
        ];
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    if (loading || authLoading) {
        return (
            <div className="profile-loading">
                <div className="profile-spinner"></div>
                <p>Loading your profile...</p>
            </div>
        );
    }

    if (!patient) {
        return (
            <div className="profile-empty">
                <FontAwesomeIcon icon={faUser} className="empty-icon" />
                <h3>Patient not found</h3>
                <p>Please login again</p>
            </div>
        );
    }

    return (
        <div className="profile-page-wrapper">
            {/* ─── ALL STYLES ─── */}
            <style>{`
                /* ── Base ── */
                .profile-page-wrapper {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem 1.5rem;
                    background: #f1f5f9;
                    min-height: calc(100vh - 60px);
                    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                }

                /* ── Loading ── */
                .profile-loading {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    min-height: 400px;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
                }
                .profile-spinner {
                    width: 44px;
                    height: 44px;
                    border: 4px solid #e2e8f0;
                    border-top: 4px solid #6366f1;
                    border-radius: 50%;
                    animation: spin 0.9s linear infinite;
                    margin-bottom: 1.25rem;
                }
                .profile-loading p { color: #64748b; font-weight: 500; }

                /* ── Empty ── */
                .profile-empty {
                    text-align: center;
                    padding: 4rem 2rem;
                    background: white;
                    border-radius: 20px;
                    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
                }
                .profile-empty .empty-icon {
                    font-size: 3rem;
                    color: #94a3b8;
                    margin-bottom: 1rem;
                }
                .profile-empty h3 { color: #1e293b; margin-bottom: 0.5rem; }
                .profile-empty p { color: #64748b; }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                /* ── Page Header ── */
                .profile-page-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    margin-bottom: 2rem;
                    padding-bottom: 1rem;
                    border-bottom: 2px solid #e2e8f0;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                .profile-page-header .header-left h1 {
                    font-size: 2rem;
                    font-weight: 700;
                    color: #0f172a;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    margin: 0 0 0.25rem 0;
                }
                .profile-page-header .header-left h1 svg {
                    color: #6366f1;
                }
                .profile-page-header .header-left p {
                    color: #64748b;
                    font-size: 1rem;
                    margin: 0;
                }
                .profile-page-header .header-actions {
                    display: flex;
                    gap: 0.75rem;
                    flex-wrap: wrap;
                }
                .profile-page-header .header-actions .btn {
                    padding: 0.65rem 1.4rem;
                    border: none;
                    border-radius: 12px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s ease;
                }
                .profile-page-header .header-actions .btn-primary {
                    background: #6366f1;
                    color: white;
                    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.25);
                }
                .profile-page-header .header-actions .btn-primary:hover {
                    background: #4f46e5;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(99, 102, 241, 0.3);
                }
                .profile-page-header .header-actions .btn-secondary {
                    background: #f1f5f9;
                    color: #1e293b;
                }
                .profile-page-header .header-actions .btn-secondary:hover {
                    background: #e2e8f0;
                }
                .profile-page-header .header-actions .btn-success {
                    background: #10b981;
                    color: white;
                    box-shadow: 0 4px 12px rgba(16, 185, 129, 0.25);
                }
                .profile-page-header .header-actions .btn-success:hover {
                    background: #059669;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(16, 185, 129, 0.3);
                }
                .profile-page-header .header-actions .btn-danger {
                    background: #ef4444;
                    color: white;
                }
                .profile-page-header .header-actions .btn-danger:hover {
                    background: #dc2626;
                }

                /* ── Message ── */
                .profile-message {
                    margin-bottom: 1.5rem;
                    padding: 0.85rem 1.25rem;
                    border-radius: 14px;
                    font-weight: 500;
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                }
                .profile-message.success {
                    background: #ecfdf5;
                    color: #065f46;
                    border: 1px solid #a7f3d0;
                }
                .profile-message.error {
                    background: #fef2f2;
                    color: #991b1b;
                    border: 1px solid #fecaca;
                }

                /* ── Profile Card ── */
                .profile-card {
                    background: white;
                    border-radius: 24px;
                    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
                    overflow: hidden;
                }

                /* ── Profile Header ── */
                .profile-card-header {
                    display: flex;
                    align-items: center;
                    gap: 2.5rem;
                    padding: 2.5rem 2.5rem 2rem 2.5rem;
                    background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
                    border-bottom: 1px solid #e2e8f0;
                    flex-wrap: wrap;
                }

                /* ── Avatar ── */
                .profile-avatar-wrap {
                    position: relative;
                    flex-shrink: 0;
                }
                .profile-avatar {
                    width: 120px;
                    height: 120px;
                    border-radius: 50%;
                    background: var(--avatar-grad, linear-gradient(135deg, #6366f1, #8b5cf6));
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 3.2rem;
                    font-weight: 600;
                    color: white;
                    box-shadow:
                        0 0 0 4px white,
                        0 0 0 6px #e2e8f0,
                        0 8px 32px rgba(0, 0, 0, 0.12);
                    transition: all 0.3s ease;
                    overflow: hidden;
                    flex-shrink: 0;
                    position: relative;
                    user-select: none;
                }
                .profile-avatar:hover {
                    transform: scale(1.02);
                    box-shadow:
                        0 0 0 4px white,
                        0 0 0 6px #6366f1,
                        0 12px 40px rgba(99, 102, 241, 0.25);
                }
                .profile-avatar img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    display: block;
                }
                .profile-avatar .avatar-initials {
                    font-size: 2.8rem;
                    font-weight: 600;
                    letter-spacing: 1px;
                    text-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
                }
                .profile-avatar .online-dot {
                    position: absolute;
                    bottom: 6px;
                    right: 6px;
                    width: 18px;
                    height: 18px;
                    background: #22c55e;
                    border-radius: 50%;
                    border: 3px solid white;
                    box-shadow: 0 2px 8px rgba(34, 197, 94, 0.3);
                }
                .avatar-upload-btn {
                    position: absolute;
                    bottom: 4px;
                    right: 4px;
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    background: white;
                    border: 2px solid #e2e8f0;
                    color: #64748b;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                }
                .avatar-upload-btn:hover {
                    background: #f1f5f9;
                    color: #6366f1;
                    border-color: #6366f1;
                    transform: scale(1.05);
                }

                /* ── Profile Info ── */
                .profile-info-area {
                    flex: 1;
                    min-width: 200px;
                }
                .profile-info-area .name-row {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    flex-wrap: wrap;
                    margin-bottom: 0.4rem;
                }
                .profile-info-area .name-row h2 {
                    font-size: 1.8rem;
                    font-weight: 700;
                    color: #0f172a;
                    margin: 0;
                }
                .profile-info-area .patient-id {
                    color: #64748b;
                    font-size: 0.95rem;
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                    margin-bottom: 0.6rem;
                }
                .profile-info-area .patient-id svg {
                    color: #94a3b8;
                }
                .profile-info-area .status-row {
                    display: flex;
                    align-items: center;
                    gap: 1.25rem;
                    flex-wrap: wrap;
                }
                .status-badge {
                    display: inline-flex;
                    align-items: center;
                    gap: 0.4rem;
                    padding: 0.3rem 0.9rem;
                    border-radius: 100px;
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                .status-badge.active {
                    background: #dcfce7;
                    color: #15803d;
                }
                .status-badge.inactive {
                    background: #fee2e2;
                    color: #991b1b;
                }
                .status-badge.blocked {
                    background: #fef3c7;
                    color: #92400e;
                }
                .member-since {
                    color: #64748b;
                    font-size: 0.9rem;
                    display: flex;
                    align-items: center;
                    gap: 0.4rem;
                }
                .member-since svg {
                    color: #94a3b8;
                }

                /* ── Stats Bar ── */
                .profile-stats-bar {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
                    gap: 1rem;
                    padding: 0 2.5rem 2rem 2.5rem;
                    background: white;
                    border-bottom: 1px solid #e2e8f0;
                }
                .profile-stats-bar .stat-item {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 0.75rem 1rem;
                    background: #f8fafc;
                    border-radius: 14px;
                    transition: all 0.2s ease;
                }
                .profile-stats-bar .stat-item:hover {
                    background: #f1f5f9;
                    transform: translateY(-2px);
                }
                .profile-stats-bar .stat-item svg {
                    font-size: 1.3rem;
                    color: #6366f1;
                    width: 2rem;
                    height: 2rem;
                    background: #eef2ff;
                    border-radius: 10px;
                    padding: 0.4rem;
                    flex-shrink: 0;
                }
                .profile-stats-bar .stat-item .stat-num {
                    font-size: 1.3rem;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1.2;
                }
                .profile-stats-bar .stat-item .stat-label {
                    font-size: 0.75rem;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                    font-weight: 600;
                }

                /* ── Profile Body ── */
                .profile-body {
                    padding: 2rem 2.5rem 2.5rem 2.5rem;
                    display: flex;
                    flex-direction: column;
                    gap: 2rem;
                }

                /* ── Section ── */
                .profile-section {
                    background: #f8fafc;
                    border-radius: 18px;
                    overflow: hidden;
                    border: 1px solid #eef2f6;
                    transition: all 0.2s ease;
                }
                .profile-section:hover {
                    border-color: #e2e8f0;
                }
                .profile-section .section-head {
                    display: flex;
                    align-items: center;
                    gap: 0.75rem;
                    padding: 1.2rem 1.5rem;
                    background: white;
                    border-bottom: 1px solid #eef2f6;
                }
                .profile-section .section-head h3 {
                    font-size: 1.05rem;
                    font-weight: 600;
                    color: #0f172a;
                    margin: 0;
                }
                .profile-section .section-head svg {
                    color: #6366f1;
                    font-size: 1.1rem;
                }
                .profile-section .section-body {
                    padding: 1.5rem;
                }

                /* ── Info Grid ── */
                .info-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
                    gap: 1.25rem;
                }
                .info-item {
                    display: flex;
                    flex-direction: column;
                    gap: 0.3rem;
                }
                .info-item .info-label {
                    font-size: 0.75rem;
                    font-weight: 600;
                    color: #94a3b8;
                    text-transform: uppercase;
                    letter-spacing: 0.4px;
                }
                .info-item .info-value {
                    font-size: 1rem;
                    color: #0f172a;
                    font-weight: 500;
                    padding: 0.4rem 0;
                }
                .info-item .form-input {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 0.95rem;
                    font-family: inherit;
                    transition: border-color 0.2s ease;
                    background: white;
                    color: #0f172a;
                }
                .info-item .form-input:focus {
                    outline: none;
                    border-color: #6366f1;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
                }
                .info-item .form-input[type="date"] {
                    min-height: 42px;
                }
                .info-item .form-select {
                    width: 100%;
                    padding: 0.5rem 0.75rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 10px;
                    font-size: 0.95rem;
                    font-family: inherit;
                    background: white;
                    color: #0f172a;
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%2394a3b8' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 0.75rem center;
                    min-height: 42px;
                }
                .info-item .form-select:focus {
                    outline: none;
                    border-color: #6366f1;
                    box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.08);
                }
                .info-item textarea.form-input {
                    min-height: 70px;
                    resize: vertical;
                }

                /* ── Health Summary ── */
                .health-summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
                    gap: 1rem;
                }
                .health-summary-grid .health-card {
                    background: white;
                    border-radius: 14px;
                    padding: 1.25rem;
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
                    border: 1px solid #eef2f6;
                    transition: all 0.2s ease;
                }
                .health-summary-grid .health-card:hover {
                    border-color: #e2e8f0;
                    transform: translateY(-2px);
                    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.06);
                }
                .health-summary-grid .health-card svg {
                    font-size: 1.5rem;
                    width: 3rem;
                    height: 3rem;
                    border-radius: 12px;
                    padding: 0.6rem;
                    flex-shrink: 0;
                }
                .health-summary-grid .health-card .hc-icon-blue svg {
                    background: #eef2ff;
                    color: #6366f1;
                }
                .health-summary-grid .health-card .hc-icon-green svg {
                    background: #ecfdf5;
                    color: #10b981;
                }
                .health-summary-grid .health-card .hc-icon-amber svg {
                    background: #fffbeb;
                    color: #f59e0b;
                }
                .health-summary-grid .health-card .hc-icon-rose svg {
                    background: #fef2f2;
                    color: #ef4444;
                }
                .health-summary-grid .health-card .hc-label {
                    font-size: 0.8rem;
                    color: #94a3b8;
                    font-weight: 600;
                    text-transform: uppercase;
                    letter-spacing: 0.3px;
                }
                .health-summary-grid .health-card .hc-value {
                    font-size: 1.4rem;
                    font-weight: 700;
                    color: #0f172a;
                    line-height: 1.2;
                }

                /* ── Security ── */
                .security-actions {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 0.75rem;
                }
                .security-btn {
                    padding: 0.6rem 1.2rem;
                    border: 2px solid #e2e8f0;
                    border-radius: 12px;
                    background: white;
                    color: #1e293b;
                    font-size: 0.9rem;
                    font-weight: 500;
                    cursor: pointer;
                    display: inline-flex;
                    align-items: center;
                    gap: 0.5rem;
                    transition: all 0.2s ease;
                }
                .security-btn:hover {
                    background: #f8fafc;
                    border-color: #cbd5e1;
                }
                .security-btn.danger {
                    border-color: #fecaca;
                    color: #dc2626;
                }
                .security-btn.danger:hover {
                    background: #fef2f2;
                    border-color: #fca5a5;
                }

                /* ── Responsive ── */
                @media (max-width: 900px) {
                    .profile-card-header {
                        flex-direction: column;
                        align-items: center;
                        text-align: center;
                        padding: 2rem 1.5rem 1.5rem;
                        gap: 1.5rem;
                    }
                    .profile-info-area .status-row {
                        justify-content: center;
                    }
                    .profile-info-area .name-row {
                        justify-content: center;
                    }
                    .profile-stats-bar {
                        padding: 0 1.5rem 1.5rem 1.5rem;
                    }
                    .profile-body {
                        padding: 1.5rem;
                    }
                    .profile-page-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                }

                @media (max-width: 640px) {
                    .profile-page-wrapper {
                        padding: 1rem 0.75rem;
                    }
                    .profile-avatar {
                        width: 96px;
                        height: 96px;
                        font-size: 2.4rem;
                    }
                    .profile-avatar .avatar-initials {
                        font-size: 2rem;
                    }
                    .profile-card-header {
                        padding: 1.5rem 1rem 1rem;
                        gap: 1rem;
                    }
                    .profile-body {
                        padding: 1rem;
                        gap: 1.25rem;
                    }
                    .profile-section .section-body {
                        padding: 1rem;
                    }
                    .profile-stats-bar {
                        grid-template-columns: repeat(2, 1fr);
                        padding: 0 1rem 1rem 1rem;
                        gap: 0.5rem;
                    }
                    .profile-stats-bar .stat-item {
                        padding: 0.5rem 0.75rem;
                    }
                    .info-grid {
                        grid-template-columns: 1fr;
                        gap: 1rem;
                    }
                    .health-summary-grid {
                        grid-template-columns: 1fr 1fr;
                    }
                    .profile-page-header .header-actions {
                        width: 100%;
                    }
                    .profile-page-header .header-actions .btn {
                        flex: 1;
                        justify-content: center;
                    }
                    .profile-info-area .name-row h2 {
                        font-size: 1.4rem;
                    }
                }

                @media (max-width: 420px) {
                    .health-summary-grid {
                        grid-template-columns: 1fr;
                    }
                    .profile-stats-bar {
                        grid-template-columns: 1fr 1fr;
                    }
                    .security-actions {
                        flex-direction: column;
                    }
                    .security-btn {
                        justify-content: center;
                    }
                }
            `}</style>

            {/* ─── PAGE HEADER ─── */}
            <div className="profile-page-header">
                <div className="header-left">
                    <h1>
                        <FontAwesomeIcon icon={faUser} />
                        My Profile
                    </h1>
                    <p>Manage your personal information and health details</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn ${isEditing ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={handleEditToggle}
                    >
                        <FontAwesomeIcon icon={isEditing ? faXmark : faEdit} />
                        {isEditing ? 'Cancel' : 'Edit Profile'}
                    </button>
                    {isEditing && (
                        <button className="btn btn-success" onClick={handleSave}>
                            <FontAwesomeIcon icon={faSave} /> Save Changes
                        </button>
                    )}
                </div>
            </div>

            {/* ─── MESSAGE ─── */}
            {message.text && (
                <div className={`profile-message ${message.type}`}>
                    {message.type === 'success' ? <FontAwesomeIcon icon={faCircleCheck} /> : '⚠️'}
                    {message.text}
                </div>
            )}

            {/* ─── PROFILE CARD ─── */}
            <div className="profile-card">

                {/* ── Header ── */}
                <div className="profile-card-header">
                    <div className="profile-avatar-wrap">
                        <div
                            className="profile-avatar"
                            style={{ '--avatar-grad': getGradient(displayName) }}
                        >
                            {patientAvatar ? (
                                <img src={patientAvatar} alt="Profile" />
                            ) : (
                                <span className="avatar-initials">{getInitials(displayName)}</span>
                            )}
                            <span className="online-dot"></span>
                        </div>
                        <button className="avatar-upload-btn" title="Change photo">
                            <FontAwesomeIcon icon={faCamera} />
                        </button>
                    </div>

                    <div className="profile-info-area">
                        <div className="name-row">
                            <h2>{displayName}</h2>
                        </div>
                        <div className="patient-id">
                            <FontAwesomeIcon icon={faIdCard} />
                            Patient ID: {patient.id || "N/A"}
                        </div>
                        <div className="status-row">
                            <span className={`status-badge ${normalizedStatus === 'active' ? 'active' : 'inactive'}`}>
                                <FontAwesomeIcon icon={faCircleCheck} />
                                {statusLabel}
                            </span>
                            <span className="member-since">
                                <FontAwesomeIcon icon={faClock} />
                                Member since{' '}
                                {(patient.createdAt || patient.updatedAt)
                                    ? new Date(patient.createdAt || patient.updatedAt).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })
                                    : 'Not available'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* ── Stats Bar ── */}
                <div className="profile-stats-bar">
                    <div className="stat-item">
                        <FontAwesomeIcon icon={faFileMedical} />
                        <div>
                            <div className="stat-num">{stats.medicalRecords}</div>
                            <div className="stat-label">Records</div>
                        </div>
                    </div>
                    <div className="stat-item">
                        <FontAwesomeIcon icon={faCalendarCheck} />
                        <div>
                            <div className="stat-num">{stats.appointments}</div>
                            <div className="stat-label">Appointments</div>
                        </div>
                    </div>
                    <div className="stat-item">
                        <FontAwesomeIcon icon={faPrescriptionBottle} />
                        <div>
                            <div className="stat-num">{stats.prescriptions}</div>
                            <div className="stat-label">Prescriptions</div>
                        </div>
                    </div>
                    <div className="stat-item">
                        <FontAwesomeIcon icon={faDroplet} />
                        <div>
                            <div className="stat-num">{patient.bloodGroup || patient.blood_group || '—'}</div>
                            <div className="stat-label">Blood Group</div>
                        </div>
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="profile-body">

                    {/* Personal Information */}
                    <div className="profile-section">
                        <div className="section-head">
                            <FontAwesomeIcon icon={faUser} />
                            <h3>Personal Information</h3>
                        </div>
                        <div className="section-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Full Name</span>
                                    {isEditing ? (
                                        <input
                                            type="text"
                                            name="full_name"
                                            value={editForm.full_name || ''}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Enter full name"
                                        />
                                    ) : (
                                        <span className="info-value">{displayName}</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Date of Birth</span>
                                    {isEditing ? (
                                        <input
                                            type="date"
                                            name="dob"
                                            value={editForm.dob || ''}
                                            onChange={handleChange}
                                            className="form-input"
                                        />
                                    ) : (
                                        <span className="info-value">{patient.dob || 'Not set'}</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Age</span>
                                    <span className="info-value">{calculateAge(patient.dob)} years</span>
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Gender</span>
                                    {isEditing ? (
                                        <select
                                            name="gender"
                                            value={editForm.gender || ''}
                                            onChange={handleChange}
                                            className="form-select"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                            <option value="Other">Other</option>
                                            <option value="Prefer not to say">Prefer not to say</option>
                                        </select>
                                    ) : (
                                        <span className="info-value">{patient.gender || 'Not specified'}</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Blood Group</span>
                                    {isEditing ? (
                                        <select
                                            name="bloodGroup"
                                            value={editForm.bloodGroup || ''}
                                            onChange={handleChange}
                                            className="form-select"
                                        >
                                            <option value="">Select Blood Group</option>
                                            <option value="A+">A+</option>
                                            <option value="A-">A−</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B−</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O−</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB−</option>
                                        </select>
                                    ) : (
                                        <span className="info-value">{patient.bloodGroup || patient.blood_group || 'Not specified'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="profile-section">
                        <div className="section-head">
                            <FontAwesomeIcon icon={faPhone} />
                            <h3>Contact Information</h3>
                        </div>
                        <div className="section-body">
                            <div className="info-grid">
                                <div className="info-item">
                                    <span className="info-label">Email Address</span>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            name="email"
                                            value={editForm.email || ''}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="you@example.com"
                                        />
                                    ) : (
                                        <span className="info-value">{patient.email}</span>
                                    )}
                                </div>
                                <div className="info-item">
                                    <span className="info-label">Phone</span>
                                    {isEditing ? (
                                        <input
                                            type="tel"
                                            name="phone"
                                            value={editForm.phone || ''}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="+1 234 567 890"
                                        />
                                    ) : (
                                        <span className="info-value">{patient.phone || 'Not provided'}</span>
                                    )}
                                </div>
                                <div className="info-item" style={{ gridColumn: '1 / -1' }}>
                                    <span className="info-label">Address</span>
                                    {isEditing ? (
                                        <textarea
                                            name="address"
                                            value={editForm.address || ''}
                                            onChange={handleChange}
                                            className="form-input"
                                            placeholder="Enter your full address"
                                        />
                                    ) : (
                                        <span className="info-value">{patient.address || 'Not provided'}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Health Summary */}
                    <div className="profile-section">
                        <div className="section-head">
                            <FontAwesomeIcon icon={faChartSimple} />
                            <h3>Health Summary</h3>
                        </div>
                        <div className="section-body">
                            <div className="health-summary-grid">
                                <div className="health-card hc-icon-blue">
                                    <FontAwesomeIcon icon={faFileMedical} />
                                    <div>
                                        <div className="hc-label">Medical Records</div>
                                        <div className="hc-value">{stats.medicalRecords}</div>
                                    </div>
                                </div>
                                <div className="health-card hc-icon-green">
                                    <FontAwesomeIcon icon={faCalendarCheck} />
                                    <div>
                                        <div className="hc-label">Appointments</div>
                                        <div className="hc-value">{stats.appointments}</div>
                                    </div>
                                </div>
                                <div className="health-card hc-icon-amber">
                                    <FontAwesomeIcon icon={faPrescriptionBottle} />
                                    <div>
                                        <div className="hc-label">Prescriptions</div>
                                        <div className="hc-value">{stats.prescriptions}</div>
                                    </div>
                                </div>
                                <div className="health-card hc-icon-rose">
                                    <FontAwesomeIcon icon={faDroplet} />
                                    <div>
                                        <div className="hc-label">Blood Group</div>
                                        <div className="hc-value">{patient.bloodGroup || patient.blood_group || '—'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Security */}
                    <div className="profile-section">
                        <div className="section-head">
                            <FontAwesomeIcon icon={faShieldHalved} />
                            <h3>Account Security</h3>
                        </div>
                        <div className="section-body">
                            <div className="security-actions">
                                <button className="security-btn" onClick={() => navigate('/patient/settings')}>
                                    <FontAwesomeIcon icon={faEnvelope} /> Manage Email
                                </button>
                                <button className="security-btn" onClick={() => navigate('/patient/settings')}>
                                    <FontAwesomeIcon icon={faShieldHalved} /> Change Password
                                </button>
                                <button className="security-btn" onClick={() => navigate('/patient/settings')}>
                                    <FontAwesomeIcon icon={faFileMedical} /> Privacy &amp; Security
                                </button>
                                <button className="security-btn danger" onClick={() => navigate('/patient/settings')}>
                                    <FontAwesomeIcon icon={faUserDoctor} /> Account Controls
                                </button>
                            </div>
                        </div>
                    </div>

                </div>
                {/* ── end body ── */}
            </div>
            {/* ── end card ── */}
        </div>
    );
};

export default Profile;