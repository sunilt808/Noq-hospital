import { useState, useEffect } from 'react';
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';
import { useNavigate } from 'react-router-dom';

export default function HMDepartments() {
  const { currentUser, token } = useAuth();
  const { data: allDepartments, loading: dataLoading } = useFirebaseData();
  const navigate = useNavigate();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    department_name: '',
    description: '',
    floor_number: ''
  });

  useEffect(() => {
    if (!currentUser || currentUser.role !== 'hm') {
      navigate('/hm-login');
      return;
    }
  }, [currentUser, navigate]);

  // Filter departments for this hospital from Firebase data
  useEffect(() => {
    if (allDepartments?.departments && currentUser?.hospital_id) {
      const hospitalDepts = allDepartments.departments.filter(
        d => d.hospital_id === currentUser.hospital_id
      );
      setDepartments(hospitalDepts);
      setLoading(dataLoading);
    }
  }, [allDepartments, dataLoading, currentUser?.hospital_id]);

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    
    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      
      const response = await fetch('http://127.0.0.1:8000/departments', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          ...formData,
          hospital_id: currentUser?.hospital_id
        })
      });
      
      if (response.ok) {
        setFormData({ department_name: '', description: '', floor_number: '' });
        setShowAddForm(false);
        // Data will auto-update via useFirebaseData hook
      }
    } catch (error) {
      console.error('Error creating department:', error);
    }
  };

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate('/hm/dashboard')}
            className="text-blue-600 hover:text-blue-800 mb-4"
          >
            ← Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Manage Departments</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Add Department Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {showAddForm ? 'Cancel' : 'Add Department'}
          </button>
        </div>

        {/* Add Department Form */}
        {showAddForm && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <form onSubmit={handleAddDepartment}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Department Name</label>
                  <input
                    type="text"
                    value={formData.department_name}
                    onChange={(e) => setFormData({...formData, department_name: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Floor Number</label>
                  <input
                    type="text"
                    value={formData.floor_number}
                    onChange={(e) => setFormData({...formData, floor_number: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  />
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-gray-700 font-semibold mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                  rows="3"
                />
              </div>
              
              <button
                type="submit"
                className="mt-4 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Create Department
              </button>
            </form>
          </div>
        )}

        {/* Departments List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {departments.length > 0 ? (
            departments.map((dept) => (
              <div key={dept.id} className="bg-white rounded-lg shadow p-6">
                <h3 className="text-xl font-bold text-gray-900">{dept.department_name}</h3>
                {dept.floor_number && (
                  <p className="text-gray-600 mt-2">Floor: {dept.floor_number}</p>
                )}
                {dept.description && (
                  <p className="text-gray-600 mt-2 text-sm">{dept.description}</p>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-12 text-gray-500">
              No departments yet. Create your first department!
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
