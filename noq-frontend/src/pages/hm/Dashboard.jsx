import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api.js';

export default function HMDashboard() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    hospitals: 0,
    doctors: 0,
    departments: 0,
    todayAppointments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser) return;
    if (currentUser.role !== 'hm') {
      navigate('/hm-login');
      return;
    }

    const loadStats = async () => {
      try {
        setLoading(true);
        const hospitalId = currentUser.hospital_id || currentUser.hospitalId || '';
        const [doctorsRes, appointmentsRes] = await Promise.all([
          api.get('/users?role=doctor').catch(() => null),
          api.get('/appointments').catch(() => null),
        ]);

        const doctors = Array.isArray(doctorsRes)
          ? doctorsRes
          : doctorsRes?.data?.users || doctorsRes?.users || [];

        const appointments = Array.isArray(appointmentsRes)
          ? appointmentsRes
          : appointmentsRes?.items || appointmentsRes?.data?.appointments || [];

        const today = new Date().toISOString().split('T')[0];
        const todayAppts = appointments.filter(
          a => String(a.hospital_id || '') === hospitalId &&
               (a.appointment_date || '').startsWith(today)
        );
        const myDoctors = doctors.filter(
          d => String(d.hospital_id || d.hospitalId || '') === hospitalId
        );

        setStats({
          hospitals: hospitalId ? 1 : 0,
          doctors: myDoctors.length,
          departments: 0,
          todayAppointments: todayAppts.length,
        });
      } catch (err) {
        console.error('HM Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, [currentUser, navigate]);

  const handleLogout = async () => {
    await logout();
    navigate('/hm-login');
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">HM Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome, {currentUser?.full_name || currentUser?.name || 'Hospital Manager'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">HOSPITALS</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.hospitals}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">DOCTORS</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.doctors}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">DEPARTMENTS</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.departments}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="text-gray-500 text-sm font-medium">TODAY'S APPOINTMENTS</div>
            <div className="text-3xl font-bold text-gray-900 mt-2">{stats.todayAppointments}</div>
          </div>
        </div>

        {/* Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <button
            onClick={() => navigate('/hm/departments')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left"
          >
            <h3 className="text-xl font-bold text-gray-900">Manage Departments</h3>
            <p className="text-gray-600 mt-2">Create and manage hospital departments</p>
            <div className="mt-4 text-blue-600 font-semibold">Go to Departments →</div>
          </button>

          <button
            onClick={() => navigate('/hm/doctors')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left"
          >
            <h3 className="text-xl font-bold text-gray-900">Manage Doctors</h3>
            <p className="text-gray-600 mt-2">View and assign doctors to departments</p>
            <div className="mt-4 text-blue-600 font-semibold">Go to Doctors →</div>
          </button>

          <button
            onClick={() => navigate('/hm/rooms')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left"
          >
            <h3 className="text-xl font-bold text-gray-900">Manage Rooms</h3>
            <p className="text-gray-600 mt-2">Setup and manage consultation rooms</p>
            <div className="mt-4 text-blue-600 font-semibold">Go to Rooms →</div>
          </button>

          <button
            onClick={() => navigate('/hm/profile')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-left"
          >
            <h3 className="text-xl font-bold text-gray-900">Hospital Settings</h3>
            <p className="text-gray-600 mt-2">Update hospital profile and settings</p>
            <div className="mt-4 text-blue-600 font-semibold">Go to Settings →</div>
          </button>
        </div>
      </main>
    </div>
  );
}
