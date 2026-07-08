// Patient Layout - JWT-based authentication with SQLite backend
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/AuthContext';
import {
  faHospital,
  faUser,
  faCalendarCheck,
  faFileMedical,
  faPrescriptionBottle,
  faStar,
  faCreditCard,
  faChartLine,
  faCog,
  faRightFromBracket,
  faHome,
  faCalendarPlus,
  faShieldHeart,
  faChevronRight,
  faChevronLeft,
  faTriangleExclamation,
  faBell,
  faSignOutAlt,
  faFlag,
  faSun,
  faMoon,
} from '@fortawesome/free-solid-svg-icons';
import { useTheme } from '../../context/ThemeContext';
import './p.css';

/* ======================================================
   QUICK ACTIONS COMPONENT  ✅ (FIXED)
====================================================== */
const QuickActions = ({ actions }) => {
  return (
    <div className="quick-actions">
      {actions.map((item, index) => (
        <button
          key={index}
          className="quick-action-btn"
          style={{ backgroundColor: item.color }}
          onClick={item.action}
        >
          <FontAwesomeIcon icon={item.icon} />
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  );
};

/* ======================================================
   MAIN LAYOUT
====================================================== */
const PatientLayout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, logout, loading: authLoading } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeMenu, setActiveMenu] = useState('');

  // Get current patient from authenticated user
  const patient = useMemo(() => {
    return currentUser ? {
      ...currentUser,
      name: currentUser?.full_name || currentUser?.fullName || 'Patient',
      status: currentUser?.status || 'active',
    } : null;
  }, [currentUser]);
  const blockStatus = patient ? {
    isBlocked: patient.status === 'blocked',
    blockLevel: patient.blockLevel || 0,
    fines: patient.fines || 0,
  } : null;

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: faHome, path: '/patient/dashboard' },
    { id: 'book', label: 'Book Appointment', icon: faCalendarPlus, path: '/patient/book-appointment' },
    { id: 'advanced-booking', label: 'Advanced Booking', icon: faShieldHeart, path: '/patient/advanced-booking' },
    { id: 'appointments', label: 'My Appointments', icon: faCalendarCheck, path: '/patient/my-appointments' },
    { id: 'records', label: 'Medical Records', icon: faFileMedical, path: '/patient/medical-records' },
    { id: 'prescriptions', label: 'Prescriptions', icon: faPrescriptionBottle, path: '/patient/prescriptions' },
    { id: 'billing', label: 'Billing', icon: faCreditCard, path: '/patient/billing' },
    { id: 'reviews', label: 'Reviews', icon: faStar, path: '/patient/reviews' },
    { id: 'complaints', label: 'Complaint Box', icon: faFlag, path: '/patient/complaints' },
    { id: 'notifications', label: 'Notifications', icon: faChartLine, path: '/patient/notifications' },
    { id: 'profile', label: 'Profile & Settings', icon: faCog, path: '/patient/profile' },
  ];

  // Verify user is a patient - only redirect if auth is complete and user is definitively not a patient
  useEffect(() => {
    if (!authLoading && currentUser && String(currentUser?.role || '').toLowerCase() !== 'patient') {
      navigate('/login', { replace: true });
    }
  }, [authLoading, currentUser, navigate]);

  // Update active menu based on location
  useEffect(() => {
    const current = menuItems.find(i => location.pathname.startsWith(i.path));
    if (current) setActiveMenu(current.id);
  }, [location.pathname]);

  // Show loading only if auth is still loading. Once currentUser is set, proceed with layout rendering
  if (authLoading || !currentUser) return <div style={{ padding: '20px' }}>Loading...</div>;
  
  // Once auth is done, render layout with authenticated patient data

  return (
    <div className={`patient-layout ${sidebarOpen ? 'open' : 'collapsed'}`}>

      {/* SIDEBAR */}
      <aside className="patient-sidebar">

        {/* HEADER */}
        <div className="sidebar-header">
          <FontAwesomeIcon icon={faHospital} />
          <span>NOQ Hospital</span>
          <button onClick={() => setSidebarOpen(!sidebarOpen)}>
            <FontAwesomeIcon icon={sidebarOpen ? faChevronLeft : faChevronRight} />
          </button>
        </div>

        {/* PROFILE */}
        <div className="sidebar-profile">
          <FontAwesomeIcon icon={faUser} className="profile-icon" />
          <div>
            <h4>{patient.name}</h4>
            <p>{patient.email}</p>
            <span className={`status ${patient.status}`}>{patient.status}</span>
          </div>
        </div>

        {/* QUICK ACTIONS ✅ */}
        <QuickActions
          actions={[
            {
              icon: faCalendarPlus,
              label: 'Book Now',
              action: () => navigate('/patient/book-appointment'),
              color: '#10b981',
            },
            {
              icon: faFileMedical,
              label: 'Records',
              action: () => navigate('/patient/medical-records'),
              color: '#3b82f6',
            },
            {
              icon: faShieldHeart,
              label: 'Advanced',
              action: () => navigate('/patient/advanced-booking'),
              color: '#0ea5e9',
            },
            {
              icon: faPrescriptionBottle,
              label: 'Prescriptions',
              action: () => navigate('/patient/prescriptions'),
              color: '#8b5cf6',
            },
          ]}
        />

        {/* NAVIGATION */}
        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <Link
              key={item.id}
              to={item.path}
              className={activeMenu === item.id ? 'active' : ''}
              onClick={() => setActiveMenu(item.id)}
            >
              <FontAwesomeIcon icon={item.icon} />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* BLOCK WARNING */}
        {blockStatus?.blockLevel > 0 && (
          <div className="block-warning">
            <FontAwesomeIcon icon={faTriangleExclamation} />
            <p>Block Level {blockStatus.blockLevel}/3</p>
          </div>
        )}

        {/* LOGOUT */}
        <button
          className="logout-btn"
          onClick={async () => {
            await logout();
            navigate('/login', { replace: true });
          }}
        >
          <FontAwesomeIcon icon={faRightFromBracket} />
          Logout
        </button>

      </aside>

      {/* MAIN CONTENT */}
      <main className="patient-main">
        <header className="patient-top-header" style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 20px',
          background: isDark ? '#1e293b' : 'white',
          borderBottom: isDark ? '1px solid #334155' : '1px solid #e2e8f0',
          color: isDark ? '#f1f5f9' : '#1e293b'
        }}>
          <h3>Patient Portal</h3>
          <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
            <button
              onClick={toggleTheme}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isDark ? '#f59e0b' : '#64748b',
                fontSize: '18px'
              }}
              title={isDark ? "Light Mode" : "Dark Mode"}
            >
              <FontAwesomeIcon icon={isDark ? faSun : faMoon} />
            </button>
            <button
              onClick={async () => {
                await logout();
                navigate('/login', { replace: true });
              }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                fontSize: '18px'
              }}
              title="Logout"
            >
              <FontAwesomeIcon icon={faSignOutAlt} />
            </button>
          </div>
        </header>
        <div style={{ padding: '20px' }}>
          {children}
        </div>
      </main>

    </div>
  );
};

export default PatientLayout;
