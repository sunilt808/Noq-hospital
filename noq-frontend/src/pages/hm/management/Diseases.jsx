import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFileMedical, faSearch, faPlus, faEdit, faTrash, faBuilding, faArrowLeft, faExclamationCircle, faUpload, faDownload } from '@fortawesome/free-solid-svg-icons';
import apiDbService from '../../../services/apiDbService.js';
import api from '../../../services/api.js';
import { useAuth } from '../../../context/AuthContext.jsx';

const Diseases = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const currentHospitalId = String(currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID || '');

  const [diseases, setDiseases] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', departmentId: '', doctorId: '' });

  useEffect(() => {
    const load = async () => {
      const [fetchedDiseases, fetchedDepts, fetchedDoctorsRes] = await Promise.all([
        apiDbService.getCollection('diseases'),
        apiDbService.getCollection('departments'),
        api.get(`/users?role=doctor${currentHospitalId ? `&hospital_id=${encodeURIComponent(currentHospitalId)}` : ''}`).catch(() => ({ data: { users: [] } })),
      ]);

      const normalizedDiseases = (fetchedDiseases || []).map((item) => ({
        ...item,
        departmentId: String(item.departmentId || item.department_id || ''),
        doctorId: String(item.doctorId || item.doctor_id || ''),
      }));
      setDiseases(normalizedDiseases);
      setDepartments((fetchedDepts || []).filter(d => d.status === 'active'));

      const backendDoctors = Array.isArray(fetchedDoctorsRes?.data?.data?.users)
        ? fetchedDoctorsRes.data.data.users
        : Array.isArray(fetchedDoctorsRes?.data?.users)
          ? fetchedDoctorsRes.data.users
          : [];
      setDoctors(
        backendDoctors
          .filter((doctor) => (doctor.status || 'active') === 'active')
          .map((doctor) => ({
            id: String(doctor.id || ''),
            name: doctor.full_name || doctor.name || 'Doctor',
            departmentId: String(doctor.department_id || doctor.departmentId || ''),
          }))
      );
      setLoading(false);
    };
    load();
  }, [currentHospitalId]);

  const doctorsForSelectedDepartment = doctors.filter(
    (doctor) => String(doctor.departmentId || '') === String(formData.departmentId || '')
  );

  const filteredDiseases = diseases.filter(disease => {
    const matchesSearch = disease.name.toLowerCase().includes(search.toLowerCase());
    const matchesDept = deptFilter === 'all' || String(disease.departmentId) === String(deptFilter);
    return matchesSearch && matchesDept;
  });

  const getDeptName = (deptId) => {
    const dept = departments.find(d => String(d.id) === String(deptId));
    return dept ? dept.name : 'Unknown';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.departmentId || !formData.doctorId) {
      alert('All fields are required');
      return;
    }

    const selectedDoctor = doctors.find((doctor) => String(doctor.id) === String(formData.doctorId));
    const selectedDepartment = departments.find((department) => String(department.id) === String(formData.departmentId));

    if (editing) {
      const updated = {
        ...editing,
        ...formData,
        departmentId: String(formData.departmentId),
        doctorId: String(formData.doctorId),
        doctorName: selectedDoctor?.name || editing.doctorName || '',
        departmentName: selectedDepartment?.name || editing.departmentName || '',
      };
      await apiDbService.upsert('diseases', editing.id, updated);
      setDiseases(prev => prev.map(d => d.id === editing.id ? updated : d));
    } else {
      const newDisease = {
        id: `DIS-${Date.now()}`,
        name: formData.name.trim(),
        departmentId: String(formData.departmentId),
        departmentName: selectedDepartment?.name || '',
        doctorId: String(formData.doctorId),
        doctorName: selectedDoctor?.name || '',
        hospitalId: currentHospitalId,
        createdAt: new Date().toISOString(),
      };
      await apiDbService.upsert('diseases', newDisease.id, newDisease);
      setDiseases(prev => [...prev, newDisease]);
    }
    resetForm();
  };

  const deleteDisease = async (id) => {
    const disease = diseases.find(d => d.id === id);
    if (!disease || !window.confirm(`Delete disease "${disease.name}"?`)) return;
    await apiDbService.remove('diseases', id);
    setDiseases(prev => prev.filter(d => d.id !== id));
  };

  const editDisease = (disease) => {
    setFormData({
      name: disease.name,
      departmentId: String(disease.departmentId || disease.department_id || ''),
      doctorId: String(disease.doctorId || disease.doctor_id || ''),
    });
    setEditing(disease);
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({ name: '', departmentId: '', doctorId: '' });
    setEditing(null);
    setShowForm(false);
  };

  const exportDiseases = () => {
    const dataStr = JSON.stringify(diseases, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'diseases-export.json';
    link.click();
  };

  const importDiseases = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          for (const item of imported) {
            const entry = { ...item, id: item.id || `DIS-${Date.now()}-${Math.random()}`, departmentId: String(item.departmentId || '') };
            await apiDbService.upsert('diseases', entry.id, entry);
          }
          setDiseases(imported);
          alert(`${imported.length} diseases imported`);
        } else alert('Invalid format');
      } catch { alert('Import error'); }
    };
    reader.readAsText(file);
  };

  return (
    <div style={styles.container}>
      <style>{cssRules}</style>

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/hm/management')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Dashboard
        </button>
        <div>
          <h1 style={styles.title}>Disease Management</h1>
          <p style={styles.subtitle}>Map diseases to departments</p>
        </div>
        <div style={styles.headerActions}>
          <button style={styles.importBtn} onClick={() => document.getElementById('import-file').click()}>
            <FontAwesomeIcon icon={faUpload} /> Import
          </button>
          <button style={styles.exportBtn} onClick={exportDiseases}>
            <FontAwesomeIcon icon={faDownload} /> Export
          </button>
          <button style={styles.createBtn} onClick={() => setShowForm(true)}>
            <FontAwesomeIcon icon={faPlus} /> Add Disease
          </button>
        </div>
        <input type="file" id="import-file" accept=".json" onChange={importDiseases} style={{ display: 'none' }} />
      </div>

      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faFileMedical} />
          <div style={styles.statValue}>{diseases.length}</div>
          <div style={styles.statLabel}>Total Diseases</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faBuilding} />
          <div style={styles.statValue}>{[...new Set(diseases.map(d => d.departmentId))].length}</div>
          <div style={styles.statLabel}>Departments Mapped</div>
        </div>
      </div>

      <div style={styles.filtersBar}>
        <div style={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} />
          <input type="text" placeholder="Search diseases..." value={search} onChange={(e) => setSearch(e.target.value)} style={styles.searchInput} />
        </div>
        <div style={styles.filterGroup}>
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} style={styles.select}>
            <option value="all">All Departments</option>
            {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
          </select>
        </div>
      </div>

      <div style={styles.listContainer}>
        {filteredDiseases.length === 0 ? (
          <div style={styles.emptyState}>
            <FontAwesomeIcon icon={faFileMedical} />
            <p>No diseases mapped yet</p>
            <button onClick={() => setShowForm(true)} style={styles.actionBtn}>
              <FontAwesomeIcon icon={faPlus} /> Add First Disease
            </button>
          </div>
        ) : (
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.tableHeader}>Disease Name</th>
                  <th style={styles.tableHeader}>Department</th>
                  <th style={styles.tableHeader}>Doctor</th>
                  <th style={styles.tableHeader}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDiseases.map(disease => (
                  <tr key={disease.id} style={styles.tableRow}>
                    <td>
                      <div style={styles.diseaseInfo}>
                        <FontAwesomeIcon icon={faFileMedical} />
                        <span>{disease.name}</span>
                      </div>
                    </td>
                    <td>
                      <span style={styles.deptBadge}>
                        <FontAwesomeIcon icon={faBuilding} />
                        {getDeptName(disease.departmentId)}
                      </span>
                    </td>
                    <td>{disease.doctorName || '-'}</td>
                    <td>
                      <div style={styles.tableActions}>
                        <button onClick={() => editDisease(disease)} style={styles.tableEditBtn}>
                          <FontAwesomeIcon icon={faEdit} /> Edit
                        </button>
                        <button onClick={() => deleteDisease(disease.id)} style={styles.tableDeleteBtn}>
                          <FontAwesomeIcon icon={faTrash} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>{editing ? 'Edit Disease' : 'Add New Disease'}</h3>
              <button onClick={resetForm} style={styles.modalClose}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Disease Name *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., Heart Disease, Diabetes" required style={styles.formInput} />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Department *</label>
                <select value={formData.departmentId} onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })} required style={styles.formSelect}>
                  <option value="">Select Department</option>
                  {departments.map(dept => <option key={dept.id} value={dept.id}>{dept.name}</option>)}
                </select>
              </div>
              <div style={styles.formGroup}>
                <label style={styles.formLabel}>Doctor *</label>
                <select
                  value={formData.doctorId}
                  onChange={(e) => setFormData({ ...formData, doctorId: e.target.value })}
                  required
                  style={styles.formSelect}
                  disabled={!formData.departmentId}
                >
                  <option value="">Select Doctor</option>
                  {doctorsForSelectedDepartment.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.name}</option>
                  ))}
                </select>
              </div>
              <div style={styles.formActions}>
                <button type="button" onClick={resetForm} style={styles.cancelBtn}>Cancel</button>
                <button type="submit" style={styles.submitBtn}>{editing ? 'Update Disease' : 'Add Disease'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const cssRules = `
  .stat-card svg { font-size: 1.8rem; margin-bottom: 0.5rem; color: #3b82f6; }
  .search-box svg { color: #64748b; }
  .disease-info svg { color: #3b82f6; margin-right: 0.75rem; }
  .dept-badge svg { margin-right: 0.5rem; font-size: 0.9rem; }
  .empty-state svg { font-size: 3rem; color: #cbd5e1; margin-bottom: 1rem; }
  .table-actions button svg { margin-right: 0.5rem; }
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

  headerActions: {
    display: 'flex',
    gap: '0.75rem'
  },

  importBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: '1px solid #cbd5e1',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500'
  },

  exportBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500'
  },

  createBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.6rem 1.2rem',
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500'
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
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontWeight: '500',
    marginTop: '1rem'
  },

  tableContainer: {
    overflowX: 'auto'
  },

  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },

  tableHeaderRow: {
    backgroundColor: '#f8fafc'
  },

  tableHeader: {
    padding: '1rem',
    textAlign: 'left',
    borderBottom: '2px solid #e2e8f0',
    color: '#64748b',
    fontWeight: '600'
  },

  tableRow: {
    borderBottom: '1px solid #e2e8f0',
    '&:hover': { backgroundColor: '#f8fafc' }
  },

  diseaseInfo: {
    display: 'flex',
    alignItems: 'center',
    padding: '1rem'
  },

  deptBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    borderRadius: '9999px',
    fontSize: '0.875rem',
    fontWeight: '500'
  },

  tableActions: {
    display: 'flex',
    gap: '0.5rem'
  },

  tableEditBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
    backgroundColor: '#f1f5f9',
    border: '1px solid #cbd5e1',
    borderRadius: '0.375rem',
    cursor: 'pointer',
    fontSize: '0.875rem',
    color: '#475569'
  },

  tableDeleteBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem 1rem',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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

  formSelect: {
    width: '100%',
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    fontSize: '1rem',
    backgroundColor: 'white',
    cursor: 'pointer'
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
    backgroundColor: '#10b981',
    color: 'white',
    border: 'none',
    borderRadius: '0.5rem',
    cursor: 'pointer',
    fontSize: '1rem'
  }
};

export default Diseases;