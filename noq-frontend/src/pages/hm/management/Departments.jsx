// pages/hm/management/Departments.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBuilding, faSearch, faPlus, faEdit, faTrash, faToggleOn, faToggleOff, faArrowLeft, faUsers, faDoorOpen, faStethoscope, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons';
import api from '../../../services/api';
import { useAuth } from '../../../context/AuthContext';

const DEPARTMENT_OPTIONS = [
  'Cardiology', 'Neurology', 'Orthopedics', 'Dermatology', 'Pediatrics', 'Oncology',
  'Radiology', 'Pathology', 'General Medicine', 'General Surgery', 'ENT', 'Ophthalmology',
  'Urology', 'Nephrology', 'Gastroenterology', 'Pulmonology', 'Endocrinology', 'Psychiatry',
  'Dental', 'Physiotherapy', 'Emergency Medicine', 'Anesthesiology', 'ICU', 'Obstetrics',
  'Gynecology', 'Rheumatology', 'Immunology', 'Infectious Disease', 'Plastic Surgery', 'Rehabilitation'
];

const Departments = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [departments, setDepartments] = useState([]);
  
  const [doctors, setDoctors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', customName: '', status: 'active' });
  const [resolvedHospitalId, setResolvedHospitalId] = useState('');

  const hmHospitalId = String(currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID || '');

  useEffect(() => {
    let active = true;

    const resolveHospitalContext = async () => {
      if (hmHospitalId) {
        setResolvedHospitalId(hmHospitalId);
        return;
      }

      try {
        const response = await api.get('/hospitals').catch(() => ({ data: { data: { hospitals: [] } } }));
        const hospitals = Array.isArray(response?.data?.data?.hospitals)
          ? response.data.data.hospitals
          : Array.isArray(response?.data?.hospitals)
            ? response.data.hospitals
            : [];
        if (!active) return;
        const matchedHospital = (hospitals || []).find((item) =>
          String(item?.email || '').toLowerCase() === String(currentUser?.email || '').toLowerCase() ||
          String(item?.hm_email || '').toLowerCase() === String(currentUser?.email || '').toLowerCase() ||
          String(item?.hm_name || '').toLowerCase() === String(currentUser?.name || '').toLowerCase()
        );
        const fallbackId = String(matchedHospital?.id || matchedHospital?.HID || matchedHospital?.hospital_id || '');
        setResolvedHospitalId(fallbackId);
      } catch {
        if (!active) return;
        setResolvedHospitalId('');
      }
    };

    if (currentUser) {
      resolveHospitalContext();
    }

    return () => {
      active = false;
    };
  }, [currentUser, hmHospitalId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [deptRes, docList, roomList] = await Promise.all([
        api.get(`/departments${resolvedHospitalId ? `?hospital_id=${encodeURIComponent(resolvedHospitalId)}` : ''}`),
        api.get(`/users?role=doctor${resolvedHospitalId ? `&hospital_id=${encodeURIComponent(resolvedHospitalId)}` : ''}`).catch(() => ({ data: { data: { users: [] } } })),
        api.get('/rooms').catch(() => ({ data: { rooms: [] } })),
      ]);

      const deptList = Array.isArray(deptRes?.data?.departments) ? deptRes.data.departments : [];
      const doctorList = Array.isArray(docList?.data?.data?.users)
        ? docList.data.data.users
        : Array.isArray(docList?.data?.users)
          ? docList.data.users
          : [];
      const roomRows = Array.isArray(roomList?.data?.rooms) ? roomList.data.rooms : [];

      const byHospital = (item) => {
        if (!resolvedHospitalId) return true;
        return String(item?.hospital_id || item?.hospitalId || item?.HID || '') === resolvedHospitalId;
      };

      setDepartments(deptList.filter(byHospital));
      setDoctors(doctorList.filter(byHospital));
      setRooms(roomRows.filter(byHospital));
    } catch (error) {
      console.error('Failed to load departments data:', error);
      alert('Failed to load departments. Please refresh and try again.');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    if (!currentUser) return;
    loadData();
  }, [currentUser, resolvedHospitalId]);
  
  const filteredDepartments = departments.filter(dept => {
    const deptName = String(dept?.name || '');
    const deptStatus = String(dept?.status || '').toLowerCase();
    const matchesSearch = deptName.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || deptStatus === filter;
    return matchesSearch && matchesFilter;
  });
  
  const getDeptStats = (deptId) => {
    const deptDoctors = doctors.filter(d => String(d.departmentId || d.deptId || '') === String(deptId));
    const deptRooms = rooms.filter(r => String(r.deptId || r.departmentId || '') === String(deptId));
    return {
      doctors: deptDoctors.length,
      rooms: deptRooms.length,
      activeDoctors: deptDoctors.filter(d => d.status === 'active').length
    };
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!resolvedHospitalId) {
      alert('Hospital context not loaded yet. Please wait a moment and try again.');
      return;
    }

    const selectedName = (formData.name === '__custom__' ? formData.customName : formData.name).trim();
    
    if (!selectedName) {
      alert('Department name is required');
      return;
    }
    
    if (departments.some(d => 
      String(d.name || '').toLowerCase() === selectedName.toLowerCase() && 
      d.id !== editing?.id
    )) {
      alert('Department name already exists');
      return;
    }
    
    if (editing) {
      try {
        await api.put(`/departments/${editing.id}`, {
          name: selectedName,
          status: formData.status,
        });
      } catch (error) {
        alert(error?.message || 'Failed to update department. Please try again.');
        return;
      }

      await Promise.all(
        rooms
          .filter((room) => String(room.deptId || room.departmentId || '') === String(editing.id))
          .map((room) =>
            api.put(`/rooms/${room.id}`, {
              number: room.number,
              floor: room.floor,
              deptId: room.deptId || room.departmentId || editing.id,
              deptName: selectedName,
              status: room.status,
              hospitalId: room.hospital_id || room.hospitalId || resolvedHospitalId,
              assignedDoctorId: room.assignedDoctorId || null,
              assignedDoctorName: room.assignedDoctorName || '',
              type: room.type || 'doctor',
            })
          )
      );
    } else {
      try {
        await api.post('/departments', {
          name: selectedName,
          status: formData.status,
          hospital_id: resolvedHospitalId,
        });
      } catch (error) {
        alert(error?.message || 'Failed to create department. Please try again.');
        return;
      }
    }
    
    await loadData();
    resetForm();
  };
  
  const deleteDepartment = async (id) => {
    const dept = departments.find(d => d.id === id);
    if (!dept) return;
    
    const stats = getDeptStats(id);
    
    if (stats.doctors > 0) {
      alert(`Cannot delete department with ${stats.doctors} doctor(s). Remove doctors first.`);
      return;
    }
    
    if (stats.rooms > 0) {
      alert(`Cannot delete department with ${stats.rooms} room(s). Remove rooms first.`);
      return;
    }
    
    if (!window.confirm(`Delete department "${dept.name}"?`)) return;

    try {
      await api.delete(`/departments/${id}`);
    } catch (error) {
      alert(error?.message || 'Failed to delete department.');
      return;
    }
    await loadData();
  };
  
  const toggleStatus = async (id) => {
    const dept = departments.find(d => d.id === id);
    if (!dept) return;
    
    const newStatus = dept.status === 'active' ? 'disabled' : 'active';
    const message = newStatus === 'active' ? 'enable' : 'disable';
    
    if (!window.confirm(`Are you sure you want to ${message} ${dept.name}?`)) return;
    
    try {
      await api.put(`/departments/${id}`, {
        status: newStatus,
      });
    } catch (error) {
      alert(error?.message || `Failed to ${message} department.`);
      return;
    }
    await loadData();
  };
  
  const editDepartment = (dept) => {
    const deptName = String(dept?.name || '');
    const isPredefined = DEPARTMENT_OPTIONS.includes(deptName);
    setFormData({
      name: isPredefined ? deptName : '__custom__',
      customName: isPredefined ? '' : deptName,
      status: dept.status,
    });
    setEditing(dept);
    setShowForm(true);
  };
  
  const resetForm = () => {
    setFormData({ name: '', customName: '', status: 'active' });
    setEditing(null);
    setShowForm(false);
  };
  
  return (
    <div style={styles.container}>
      <style>{cssRules}</style>
      
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/hm/management')}>
          <FontAwesomeIcon icon={faArrowLeft} />HM Dashboard
        </button>
        <div>
          <h1 style={styles.title}>Department Management</h1>
          <p style={styles.subtitle}>Manage hospital departments</p>
        </div>
        <button style={styles.createBtn} onClick={() => setShowForm(true)}>
          <FontAwesomeIcon icon={faPlus} /> Add Department
        </button>
      </div>
      
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faBuilding} />
          <div style={styles.statValue}>{departments.length}</div>
          <div style={styles.statLabel}>Total Departments</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faToggleOn} />
          <div style={styles.statValue}>{departments.filter(d => d.status === 'active').length}</div>
          <div style={styles.statLabel}>Active Departments</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faStethoscope} />
          <div style={styles.statValue}>{doctors.length}</div>
          <div style={styles.statLabel}>Total Doctors</div>
        </div>
      </div>
      
      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} />
          <input
            type="text"
            placeholder="Search departments..."
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
        </div>
      </div>
      
      <div style={styles.listContainer}>
        {loading && (
          <div style={{ marginBottom: '1rem', color: '#64748b' }}>Loading departments...</div>
        )}
        {filteredDepartments.length === 0 ? (
          <div style={styles.emptyState}>
            <FontAwesomeIcon icon={faBuilding} />
            <p>No departments found</p>
            <button onClick={() => setShowForm(true)} style={styles.actionBtn}>
              <FontAwesomeIcon icon={faPlus} /> Add First Department
            </button>
          </div>
        ) : (
          <div style={styles.cardsGrid}>
            {filteredDepartments.map(dept => {
              const stats = getDeptStats(dept.id);
              
              return (
                <div key={dept.id} style={styles.departmentCard}>
                  <div style={styles.cardHeader}>
                    <div style={styles.deptIcon}>
                      <FontAwesomeIcon icon={faBuilding} />
                    </div>
                    <div style={styles.deptInfo}>
                      <h3 style={styles.deptName}>{dept.name}</h3>
                      <div style={{
                        ...styles.statusBadge,
                        backgroundColor: dept.status === 'active' ? '#dcfce7' : '#fee2e2',
                        color: dept.status === 'active' ? '#166534' : '#991b1b'
                      }}>
                        {dept.status === 'active' ? 'Active' : 'Disabled'}
                      </div>
                    </div>
                  </div>
                  
                  <div style={styles.deptStats}>
                    <div style={styles.statItem}>
                      <FontAwesomeIcon icon={faStethoscope} />
                      <div>
                        <div style={styles.statNumber}>{stats.doctors}</div>
                        <div style={styles.statLabelSmall}>Doctors</div>
                      </div>
                    </div>
                    <div style={styles.statItem}>
                      <FontAwesomeIcon icon={faDoorOpen} />
                      <div>
                        <div style={styles.statNumber}>{stats.rooms}</div>
                        <div style={styles.statLabelSmall}>Rooms</div>
                      </div>
                    </div>
                    <div style={styles.statItem}>
                      <FontAwesomeIcon icon={faToggleOn} />
                      <div>
                        <div style={styles.statNumber}>{stats.activeDoctors}</div>
                        <div style={styles.statLabelSmall}>Active</div>
                      </div>
                    </div>
                  </div>
                  
                  {stats.doctors > 0 && dept.status === 'disabled' && (
                    <div style={styles.warningAlert}>
                      <FontAwesomeIcon icon={faExclamationTriangle} />
                      <span>Department disabled but has {stats.doctors} active doctor(s)</span>
                    </div>
                  )}
                  
                  <div style={styles.cardActions}>
                    <button onClick={() => editDepartment(dept)} style={styles.editBtn}>
                      <FontAwesomeIcon icon={faEdit} /> Edit
                    </button>
                    <button 
                      onClick={() => toggleStatus(dept.id)} 
                      style={{
                        ...styles.toggleBtn,
                        backgroundColor: dept.status === 'active' ? '#f59e0b' : '#84cc16'
                      }}
                    >
                      <FontAwesomeIcon icon={dept.status === 'active' ? faToggleOff : faToggleOn} />
                      {dept.status === 'active' ? 'Disable' : 'Enable'}
                    </button>
                    <button 
                      onClick={() => deleteDepartment(dept.id)} 
                      style={{
                        ...styles.deleteBtn,
                        opacity: stats.doctors > 0 || stats.rooms > 0 ? 0.5 : 1,
                        cursor: stats.doctors > 0 || stats.rooms > 0 ? 'not-allowed' : 'pointer'
                      }}
                      disabled={stats.doctors > 0 || stats.rooms > 0}
                    >
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
              <h3 style={styles.modalTitle}>{editing ? 'Edit Department' : 'Add New Department'}</h3>
              <button onClick={resetForm} style={styles.modalClose}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Department Name *</label>
                <select
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={styles.formInput}
                >
                  <option value="">Select department</option>
                  {DEPARTMENT_OPTIONS.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                  <option value="__custom__">Other (Custom)</option>
                </select>
                {formData.name === '__custom__' && (
                  <input
                    type="text"
                    value={formData.customName}
                    onChange={(e) => setFormData({ ...formData, customName: e.target.value })}
                    placeholder="Enter custom department name"
                    required
                    style={{ ...styles.formInput, marginTop: '0.6rem' }}
                  />
                )}
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Status</label>
                <div style={styles.statusOptions}>
                  <button
                    type="button"
                    style={{
                      ...styles.statusOption,
                      backgroundColor: formData.status === 'active' ? '#dcfce7' : '#f1f5f9',
                      color: formData.status === 'active' ? '#166534' : '#64748b'
                    }}
                    onClick={() => setFormData({ ...formData, status: 'active' })}
                  >
                    <FontAwesomeIcon icon={faToggleOn} />
                    Active
                  </button>
                  <button
                    type="button"
                    style={{
                      ...styles.statusOption,
                      backgroundColor: formData.status === 'disabled' ? '#fee2e2' : '#f1f5f9',
                      color: formData.status === 'disabled' ? '#991b1b' : '#64748b'
                    }}
                    onClick={() => setFormData({ ...formData, status: 'disabled' })}
                  >
                    <FontAwesomeIcon icon={faToggleOff} />
                    Disabled
                  </button>
                </div>
              </div>
              
              <div style={styles.formActions}>
                <button type="button" onClick={resetForm} style={styles.cancelBtn}>
                  Cancel
                </button>
                <button type="submit" style={styles.submitBtn}>
                  {editing ? 'Update Department' : 'Create Department'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const cssRules = `
  .stat-card svg {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
    color: #3b82f6;
  }
  
  .search-box svg {
    color: #64748b;
  }
  
  .dept-icon svg {
    color: #3b82f6;
    font-size: 1.5rem;
  }
  
  .stat-item svg {
    color: #64748b;
    font-size: 0.9rem;
  }
  
  .warning-alert svg {
    color: #f59e0b;
  }
  
  .empty-state svg {
    font-size: 3rem;
    color: #cbd5e1;
    margin-bottom: 1rem;
  }
  
  .status-option svg {
    margin-right: 0.5rem;
  }
`;

const styles = {
  container: {
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    minHeight: '100vh'
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
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
    color: '#475569',
    transition: 'all 0.2s'
  },
  title: {
    fontSize: '1.875rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: 0
  },
  subtitle: {
    color: '#64748b',
    margin: '0.25rem 0 0 0'
  },
  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
    transition: 'background 0.2s'
  },
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem',
    marginBottom: '2rem'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  statValue: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0.5rem 0'
  },
  statLabel: {
    color: '#64748b',
    fontSize: '0.875rem'
  },
  filtersBar: {
    backgroundColor: 'white',
    padding: '1.25rem',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    marginBottom: '1.5rem',
    border: '1px solid #e2e8f0',
    display: 'flex',
    flexWrap: 'wrap',
    gap: '1rem',
    alignItems: 'center'
  },
  searchBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#f8fafc',
    borderRadius: '0.5rem',
    border: '1px solid #e2e8f0',
    flex: '1',
    minWidth: '250px'
  },
  searchInput: {
    border: 'none',
    backgroundColor: 'transparent',
    outline: 'none',
    width: '100%',
    fontSize: '0.95rem'
  },
  filterGroup: {
    display: 'flex',
    gap: '0.75rem',
    flexWrap: 'wrap'
  },
  select: {
    padding: '0.5rem 1rem',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    backgroundColor: 'white',
    fontSize: '0.95rem',
    cursor: 'pointer',
    minWidth: '150px'
  },
  listContainer: {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
    padding: '1.5rem'
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    color: '#64748b'
  },
  actionBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
    marginTop: '1rem'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1rem'
  },
  departmentCard: {
    border: '1px solid #e2e8f0',
    borderRadius: '0.75rem',
    padding: '1.25rem',
    transition: 'all 0.2s'
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '1rem'
  },
  deptIcon: {
    width: '3rem',
    height: '3rem',
    borderRadius: '0.5rem',
    backgroundColor: '#dbeafe',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deptInfo: {
    flex: '1'
  },
  deptName: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0 0 0.25rem 0'
  },
  statusBadge: {
    display: 'inline-block',
    padding: '0.25rem 0.75rem',
    borderRadius: '9999px',
    fontSize: '0.75rem',
    fontWeight: '500'
  },
  deptStats: {
    display: 'flex',
    justifyContent: 'space-between',
    margin: '1.5rem 0',
    padding: '1rem 0',
    borderTop: '1px solid #e2e8f0',
    borderBottom: '1px solid #e2e8f0'
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  statNumber: {
    fontSize: '1.125rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  statLabelSmall: {
    fontSize: '0.75rem',
    color: '#64748b'
  },
  warningAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    backgroundColor: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '0.5rem',
    color: '#92400e',
    fontSize: '0.875rem',
    marginBottom: '1rem'
  },
  cardActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  editBtn: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569'
  },
  toggleBtn: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: '#f59e0b',
    color: 'white',
    border: 'none',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  deleteBtn: {
    flex: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    backgroundColor: '#fee2e2',
    color: '#dc2626',
    border: '1px solid #fecaca',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '1rem'
  },
  modal: {
    backgroundColor: 'white',
    borderRadius: '0.75rem',
    width: '100%',
    maxWidth: '500px',
    maxHeight: '90vh',
    overflow: 'auto'
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1.5rem',
    borderBottom: '1px solid #e2e8f0'
  },
  modalTitle: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: 0
  },
  modalClose: {
    fontSize: '1.5rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#64748b',
    padding: '0',
    width: '2rem',
    height: '2rem',
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
    borderRadius: '0.5rem',
    fontSize: '1rem',
    boxSizing: 'border-box'
  },
  statusOptions: {
    display: 'flex',
    gap: '1rem',
    marginTop: '0.5rem'
  },
  statusOption: {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.5rem',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '0.875rem'
  },
  formActions: {
    padding: '1.5rem',
    display: 'flex',
    gap: '1rem'
  },
  cancelBtn: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem'
  },
  submitBtn: {
    flex: 1,
    padding: '0.75rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem'
  }
};

export default Departments;