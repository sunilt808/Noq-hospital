import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function HMDashboard() {
  const { currentUser, logout } = useAuth();
  const { data: apiData, loading: dataLoading } = useApiData();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    hospitals: 0,
    doctors: 0,
    departments: 0,
    todayAppointments: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'hm') {
      navigate('/hm-login');
      return;
    }
    setLoading(dataLoading);
  }, [currentUser, dataLoading, navigate]);

  // Calculate stats from API data
  useEffect(() => {
    if (currentUser?.hospital_id && apiData) {
      const hospitalDoctors = apiData.doctors?.filter(
        d => d.hospital_id === currentUser.hospital_id
      ) || [];
      
      const hospitalDepartments = apiData.departments?.filter(
        d => d.hospital_id === currentUser.hospital_id
      ) || [];
      
      const todayAppointments = apiData.appointments?.filter(
        a => a.hospital_id === currentUser.hospital_id && 
        a.appointment_date?.split('T')[0] === new Date().toISOString().split('T')[0]
      ) || [];
      
      setStats({
        hospitals: 1, // Current hospital
        doctors: hospitalDoctors.length,
        departments: hospitalDepartments.length,
        todayAppointments: todayAppointments.length
      });
    }
  }, [apiData, currentUser?.hospital_id]);

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
            <p className="text-gray-600 mt-1">Welcome, {user?.name}</p>
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
