import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faKey, faArrowLeft, faSearch, faEye, faEyeSlash, faRefresh, 
  faCopy, faTrash, faUserMd, faEnvelope, faBuilding, faLock, 
  faCheck, faTimes, faIdCard, faCalendar, faPhone, faShieldAlt,
  faFilter, faToggleOn, faToggleOff, faEdit, faDownload, faPrint,
  faClipboardCheck, faHistory, faUserCheck, faBan,
  faStethoscope
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

// Password generation utility function
const generateStructuredPassword = (doctorName, specialization) => {
  // Get initials from doctor name (first letter of first two words or first name)
  const nameParts = doctorName.split(' ').filter(part => part.length > 0);
  const nameInitial = nameParts[0] ? nameParts[0][0].toUpperCase() : 'D';
  const secondInitial = nameParts[1] ? nameParts[1][0].toLowerCase() : 'r';
  
  // Get specialization initial (first letter, lowercase)
  const specInitial = specialization && specialization.length > 0 
    ? specialization[0].toLowerCase() 
    : 'd';
  
  // Generate a sequential number based on current timestamp
  const seqNumber = Math.floor(Date.now() % 1000).toString().padStart(3, '0');
  
  // Strong character sets
  const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lowercase = 'abcdefghijkmnpqrstuvwxyz';
  const numbers = '23456789';
  const special = '!@#$%&*?';
  
  // Ensure we have at least one from each character set
  const randomUppercase = uppercase[Math.floor(Math.random() * uppercase.length)];
  const randomLowercase = lowercase[Math.floor(Math.random() * lowercase.length)];
  const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
  const randomSpecial = special[Math.floor(Math.random() * special.length)];
  
  // Create base structured password
  const basePassword = `${nameInitial}${secondInitial}${specInitial}@${seqNumber}`;
  
  // Add strong characters
  const strongPart = `${randomUppercase}${randomLowercase}${randomNumber}${randomSpecial}`;
  
  // Combine and shuffle to make it more secure
  const combined = basePassword + strongPart;
  const shuffled = combined.split('').sort(() => Math.random() - 0.5).join('');
  
  return shuffled.substring(0, 12); // Ensure 12 characters length
};

const DoctorCredentials = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const currentHospitalId = String(currentUser?.hospitalId || currentUser?.hospital_id || currentUser?.HID || '');
  const [doctorUsers, setDoctorUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showPasswordId, setShowPasswordId] = useState(null);
  const [editingPassword, setEditingPassword] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [passwordSequence, setPasswordSequence] = useState({});

  useEffect(() => {
    loadDoctorUsers();
  }, [currentHospitalId]);

  const loadDoctorUsers = async () => {
    const backendDoctorsRes = await api
      .get(`/users?role=doctor${currentHospitalId ? `&hospital_id=${encodeURIComponent(currentHospitalId)}` : ''}`)
      .catch(() => ({ data: { users: [] } }));

    const backendDoctors = Array.isArray(backendDoctorsRes?.data?.data?.users)
      ? backendDoctorsRes.data.data.users
      : Array.isArray(backendDoctorsRes?.data?.users)
        ? backendDoctorsRes.data.users
        : [];

    const normalizedUsers = backendDoctors.map((user) => ({
      ...user,
      name: user.full_name || user.name || '',
      doctorId: user.doctorId || user.id,
      hospitalId: user.hospitalId || user.hospital_id || '',
      hospitalName: user.hospitalName || user.hospital_name || '',
      specialization: user.specialization || '',
      departmentName: user.departmentName || user.department_name || '',
      roomInfo: user.roomInfo || 'Not assigned',
      status: user.status || 'active',
      password: 'Set at creation / reset only',
    }));

    setDoctorUsers(normalizedUsers);
    
    // Initialize password sequence
    const seq = {};
    normalizedUsers.forEach(user => {
      seq[user.id] = 1; // Start sequence at 1 for each user
    });
    setPasswordSequence(seq);
  };

  const filteredUsers = doctorUsers.filter(user => {
    const matchesSearch = String(user.name || '').toLowerCase().includes(search.toLowerCase()) ||
                         String(user.email || '').toLowerCase().includes(search.toLowerCase()) ||
                         String(user.doctorId || '').toLowerCase().includes(search.toLowerCase()) ||
                         String(user.specialization || '').toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filter === 'all' || user.status === filter;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: doctorUsers.length,
    active: doctorUsers.filter(u => u.status === 'active').length,
    disabled: doctorUsers.filter(u => u.status === 'disabled').length,
    changedToday: doctorUsers.filter(u => {
      const today = new Date().toDateString();
      return new Date(u.lastPasswordChange || u.createdAt).toDateString() === today;
    }).length
  };

  const togglePasswordVisibility = (id) => {
    setShowPasswordId(showPasswordId === id ? null : id);
  };

  const startPasswordReset = (user) => {
    setEditingPassword(user.id);
    setNewPassword('');
    setSelectedUser(user);
  };

  const generateNewPassword = () => {
    if (!selectedUser) return;
    
    // Generate structured password
    const password = generateStructuredPassword(
      selectedUser.name,
      selectedUser.specialization
    );
    
    setNewPassword(password);
    
    // Increment sequence for next generation
    setPasswordSequence(prev => ({
      ...prev,
      [selectedUser.id]: (prev[selectedUser.id] || 1) + 1
    }));
  };

  const resetPassword = async () => {
    if (!newPassword.trim() || !selectedUser) return;

    await api.patch(`/users/${selectedUser.id}/credentials`, {
      password: newPassword,
    });

    const updatedUsers = doctorUsers.map(user =>
      user.id === selectedUser.id 
        ? { 
            ...user, 
            password: newPassword,
            lastPasswordChange: new Date().toISOString(),
            passwordChangedBy: currentUser?.name || 'Hospital Manager',
            passwordStructure: 'name+specialization+sequential+strong' // Track password type
          } 
        : user
    );

    setDoctorUsers(updatedUsers);

    setEditingPassword(null);
    setNewPassword('');
    setSelectedUser(null);
    setShowConfirm(false);
    
    alert(`Password reset successful for ${selectedUser.name}`);
  };

  const deleteCredentials = async (id) => {
    const user = doctorUsers.find(u => u.id === id);
    if (!user) return;
    
    if (!window.confirm(`Delete login credentials for ${user.name}? Doctor won't be able to login.`)) return;

    await api.delete(`/users/${id}`);
    const updatedUsers = doctorUsers.filter(u => u.id !== id);
    setDoctorUsers(updatedUsers);
    
    alert(`Credentials deleted for ${user.name}`);
  };

  const toggleUserStatus = async (id) => {
    const user = doctorUsers.find(u => u.id === id);
    if (!user) return;
    
    const newStatus = user.status === 'active' ? 'disabled' : 'active';
    const action = newStatus === 'active' ? 'enable' : 'disable';
    
    if (!window.confirm(`Are you sure you want to ${action} login access for ${user.name}?`)) return;
    
    await api.patch(`/users/${id}`, { status: newStatus });

    const updatedUsers = doctorUsers.map(u =>
      u.id === id ? { ...u, status: newStatus } : u
    );

    setDoctorUsers(updatedUsers);
  };

  const copyCredentials = (user) => {
    const text = `👨‍⚕️ Doctor Login Credentials

Name: ${user.name}
Doctor ID: ${user.doctorId}
Email: ${user.email}
Password: ${user.password}
Specialization: ${user.specialization}
Department: ${user.departmentName}
Hospital: ${user.hospitalName}
Status: ${user.status}
Last Password Change: ${user.lastPasswordChange ? new Date(user.lastPasswordChange).toLocaleString() : 'Never'}
Password Type: ${user.passwordStructure || 'Standard'}`;

    navigator.clipboard.writeText(text);
    alert('Credentials copied to clipboard!');
  };

  const exportCredentials = () => {
    const data = filteredUsers.map(user => ({
      name: user.name,
      doctorId: user.doctorId,
      email: user.email,
      password: user.password,
      specialization: user.specialization,
      department: user.departmentName,
      status: user.status,
      lastLogin: user.lastLogin || 'Never',
      createdAt: user.createdAt,
      passwordStructure: user.passwordStructure || 'Standard'
    }));
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `doctor-credentials-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const printCredentials = () => {
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
          <title>Doctor Credentials Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
            th { background-color: #f4f4f4; }
            .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
            .timestamp { color: #666; font-size: 14px; }
            .password-note { background-color: #f0f9ff; padding: 10px; border-radius: 5px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Doctor Login Credentials Report</h1>
            <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
          </div>
          <div class="password-note">
            <strong>Note:</strong> Passwords follow structured format: Name initials + specialization + sequence + strong characters
          </div>
          <table>
            <thead>
              <tr>
                <th>Doctor Name</th>
                <th>Doctor ID</th>
                <th>Email</th>
                <th>Password</th>
                <th>Specialization</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filteredUsers.map(user => `
                <tr>
                  <td>${escapeHtml(user.name)}</td>
                  <td>${escapeHtml(user.doctorId)}</td>
                  <td>${escapeHtml(user.email)}</td>
                  <td>${escapeHtml(user.password)}</td>
                  <td>${escapeHtml(user.specialization)}</td>
                  <td>${escapeHtml(user.departmentName)}</td>
                  <td>${escapeHtml(user.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const toggleSelectUser = (id) => {
    setSelectedUsers(prev => 
      prev.includes(id) 
        ? prev.filter(userId => userId !== id)
        : [...prev, id]
    );
  };

  const bulkDisableUsers = async () => {
    if (selectedUsers.length === 0) return;
    
    if (!window.confirm(`Disable login access for ${selectedUsers.length} selected doctors?`)) return;
    
    await Promise.all(selectedUsers.map((id) => api.patch(`/users/${id}`, { status: 'disabled' })));

    const updatedUsers = doctorUsers.map(user =>
      selectedUsers.includes(user.id) ? { ...user, status: 'disabled' } : user
    );

    setDoctorUsers(updatedUsers);

    setSelectedUsers([]);
    alert(`Disabled ${selectedUsers.length} doctor accounts`);
  };

  const bulkDeleteCredentials = async () => {
    if (selectedUsers.length === 0) return;
    
    if (!window.confirm(`Delete credentials for ${selectedUsers.length} selected doctors? This cannot be undone.`)) return;
    
    await Promise.all(selectedUsers.map((id) => api.delete(`/users/${id}`)));
    const updatedUsers = doctorUsers.filter(user => !selectedUsers.includes(user.id));
    setDoctorUsers(updatedUsers);
    
    setSelectedUsers([]);
    alert(`Deleted ${selectedUsers.length} doctor credentials`);
  };

  // Analyze password strength
  const analyzePasswordStrength = (password) => {
    if (!password) return { score: 0, label: 'Weak' };
    
    let score = 0;
    
    // Length check
    if (password.length >= 8) score += 1;
    if (password.length >= 12) score += 1;
    
    // Character diversity checks
    if (/[A-Z]/.test(password)) score += 1; // Has uppercase
    if (/[a-z]/.test(password)) score += 1; // Has lowercase
    if (/[0-9]/.test(password)) score += 1; // Has numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 1; // Has special chars
    
    // Pattern check - avoids simple patterns
    if (!/(.)\1{2,}/.test(password)) score += 1; // No repeated chars
    
    if (score >= 6) return { score: 3, label: 'Strong', color: '#10b981' };
    if (score >= 4) return { score: 2, label: 'Medium', color: '#f59e0b' };
    return { score: 1, label: 'Weak', color: '#ef4444' };
  };

  return (
    <div className="doctor-credentials-container" style={styles.container}>
      <style>
        {`
          /* Component-specific styles */
          .doctor-credentials-container .stat-card svg {
            font-size: 1.8rem;
            margin-bottom: 0.5rem;
          }
          
          .doctor-credentials-container .search-box svg {
            color: #64748b;
          }
          
          .doctor-credentials-container .doctor-avatar svg {
            font-size: 1.5rem;
            color: #1e40af;
          }
          
          .doctor-credentials-container .action-btn svg {
            margin-right: 0.5rem;
          }
          
          .doctor-credentials-container .empty-state svg {
            font-size: 3rem;
            color: #cbd5e1;
            margin-bottom: 1rem;
          }
          
          .doctor-credentials-container .table-actions button svg {
            margin-right: 0.5rem;
          }
          
          /* Hover effects */
          .doctor-credentials-container .table-row:hover {
            background-color: #f8fafc;
          }
          
          .doctor-credentials-container .back-btn:hover {
            background-color: #e2e8f0;
          }
          
          .doctor-credentials-container .export-btn:hover {
            background-color: #2563eb;
          }
          
          .doctor-credentials-container .print-btn:hover {
            background-color: #059669;
          }
          
          .doctor-credentials-container .bulk-btn:hover:not(:disabled) {
            background-color: #e0f2fe;
          }
          
          .doctor-credentials-container .bulk-disable-btn:hover {
            background-color: #fde68a;
          }
          
          .doctor-credentials-container .bulk-delete-btn:hover {
            background-color: #fecaca;
          }
          
          .doctor-credentials-container .bulk-clear-btn:hover {
            background-color: #e2e8f0;
          }
          
          .doctor-credentials-container .reset-btn:hover {
            background-color: #e0f2fe;
          }
          
          .doctor-credentials-container .copy-btn:hover {
            background-color: #e2e8f0;
          }
          
          .doctor-credentials-container .toggle-btn:hover {
            opacity: 0.9;
          }
          
          .doctor-credentials-container .delete-btn:hover {
            background-color: #fecaca;
          }
          
          .doctor-credentials-container .generate-btn:hover {
            background-color: #2563eb;
          }
          
          .doctor-credentials-container .cancel-btn:hover {
            background-color: #e5e7eb;
          }
          
          .doctor-credentials-container .confirm-btn:hover:not(:disabled) {
            background-color: #2563eb;
          }
          
          .doctor-credentials-container .confirm-cancel-btn:hover {
            background-color: #e5e7eb;
          }
          
          .doctor-credentials-container .confirm-submit-btn:hover {
            background-color: #b91c1c;
          }
          
          .doctor-credentials-container .password-toggle:hover {
            color: #475569;
          }
          
          /* Responsive styles */
          @media (max-width: 1024px) {
            .doctor-credentials-container .header {
              flex-direction: column;
              align-items: flex-start;
              gap: 1rem;
            }
            
            .doctor-credentials-container .header-actions {
              align-self: stretch;
              display: flex;
            }
            
            .doctor-credentials-container .header-actions button {
              flex: 1;
            }
          }
          
          @media (max-width: 768px) {
            .doctor-credentials-container .stats-grid {
              grid-template-columns: repeat(2, 1fr);
            }
            
            .doctor-credentials-container .filters-bar {
              flex-direction: column;
              align-items: stretch;
            }
            
            .doctor-credentials-container .search-box {
              min-width: 100%;
            }
            
            .doctor-credentials-container .filter-group {
              flex-direction: column;
            }
            
            .doctor-credentials-container .table-wrapper {
              overflow-x: auto;
              -webkit-overflow-scrolling: touch;
            }
            
            .doctor-credentials-container .action-buttons {
              flex-wrap: wrap;
              justify-content: center;
            }
            
            .doctor-credentials-container .bulk-buttons {
              flex-wrap: wrap;
            }
          }
          
          @media (max-width: 480px) {
            .doctor-credentials-container .stats-grid {
              grid-template-columns: 1fr;
            }
            
            .doctor-credentials-container .password-input-group {
              flex-direction: column;
            }
            
            .doctor-credentials-container .modal-actions,
            .doctor-credentials-container .confirm-actions {
              flex-direction: column;
            }
          }
          
          /* Animation for modal appearance */
          .doctor-credentials-container .modal-overlay,
          .doctor-credentials-container .confirm-overlay {
            animation: fadeIn 0.2s ease-in-out;
          }
          
          .doctor-credentials-container .modal,
          .doctor-credentials-container .confirm-modal {
            animation: slideIn 0.3s ease-out;
          }
          
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideIn {
            from {
              opacity: 0;
              transform: translateY(-20px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          /* Password strength meter */
          .password-strength-meter {
            height: 0.25rem;
            background: #e2e8f0;
            border-radius: 9999px;
            margin-bottom: 0.5rem;
            overflow: hidden;
          }
          
          .password-strength-bar {
            height: 100%;
            transition: width 0.3s ease;
          }
        `}
      </style>
      
      <div style={styles.header}>
        <button className="back-btn" style={styles.backBtn} onClick={() => navigate('/hm/management')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Dashboard
        </button>
        <div>
          <h1 style={styles.title}>Doctor Credentials Management</h1>
          <p style={styles.subtitle}>Manage doctor login credentials & password resets</p>
        </div>
        <div style={styles.headerActions}>
          <button className="export-btn" style={styles.exportBtn} onClick={exportCredentials}>
            <FontAwesomeIcon icon={faDownload} /> Export
          </button>
          <button className="print-btn" style={styles.printBtn} onClick={printCredentials}>
            <FontAwesomeIcon icon={faPrint} /> Print
          </button>
        </div>
      </div>
      
      <div className="stats-grid" style={styles.statsGrid}>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faKey} style={{color: '#3b82f6'}} />
          <div style={styles.statValue}>{stats.total}</div>
          <div style={styles.statLabel}>Total Accounts</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faUserCheck} style={{color: '#10b981'}} />
          <div style={styles.statValue}>{stats.active}</div>
          <div style={styles.statLabel}>Active</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faBan} style={{color: '#ef4444'}} />
          <div style={styles.statValue}>{stats.disabled}</div>
          <div style={styles.statLabel}>Disabled</div>
        </div>
        <div style={styles.statCard}>
          <FontAwesomeIcon icon={faHistory} style={{color: '#f59e0b'}} />
          <div style={styles.statValue}>{stats.changedToday}</div>
          <div style={styles.statLabel}>Changed Today</div>
        </div>
      </div>
      
      <div style={styles.filtersBar}>
        <div className="search-box" style={styles.searchBox}>
          <FontAwesomeIcon icon={faSearch} />
          <input 
            type="text" 
            placeholder="Search by name, email, doctor ID..." 
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
          
          <button 
            className="bulk-btn"
            style={styles.bulkBtn}
            onClick={() => setShowBulkActions(!showBulkActions)}
            disabled={selectedUsers.length === 0}
          >
            <FontAwesomeIcon icon={faClipboardCheck} />
            Bulk Actions ({selectedUsers.length})
          </button>
        </div>
      </div>
      
      {showBulkActions && selectedUsers.length > 0 && (
        <div style={styles.bulkActionsBar}>
          <div style={styles.bulkInfo}>
            <strong>{selectedUsers.length} doctors selected</strong>
          </div>
          <div className="bulk-buttons" style={styles.bulkButtons}>
            <button className="bulk-disable-btn" style={styles.bulkDisableBtn} onClick={bulkDisableUsers}>
              <FontAwesomeIcon icon={faToggleOff} /> Disable All
            </button>
            <button className="bulk-delete-btn" style={styles.bulkDeleteBtn} onClick={bulkDeleteCredentials}>
              <FontAwesomeIcon icon={faTrash} /> Delete All
            </button>
            <button className="bulk-clear-btn" style={styles.bulkClearBtn} onClick={() => setSelectedUsers([])}>
              <FontAwesomeIcon icon={faTimes} /> Clear Selection
            </button>
          </div>
        </div>
      )}
      
      <div style={styles.tableContainer}>
        {filteredUsers.length === 0 ? (
          <div className="empty-state" style={styles.emptyState}>
            <FontAwesomeIcon icon={faKey} />
            <p>No doctor credentials found</p>
            <p style={{fontSize: '0.9rem', color: '#64748b'}}>
              Add doctors from the Doctors Management page first
            </p>
          </div>
        ) : (
          <div className="table-wrapper" style={styles.tableWrapper}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeader}>
                  <th style={styles.tableCheckbox}>
                    <input 
                      type="checkbox" 
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(u => u.id));
                        } else {
                          setSelectedUsers([]);
                        }
                      }}
                      style={styles.checkbox}
                    />
                  </th>
                  <th style={styles.tableHeaderCell}>Doctor</th>
                  <th style={styles.tableHeaderCell}>Login Details</th>
                  <th style={styles.tableHeaderCell}>Status</th>
                  <th style={styles.tableHeaderCell}>Last Changed</th>
                  <th style={styles.tableHeaderCell}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map(user => {
                  const passwordStrength = analyzePasswordStrength(user.password);
                  
                  return (
                    <tr key={user.id} className="table-row" style={styles.tableRow}>
                      <td style={styles.tableCell}>
                        <input 
                          type="checkbox" 
                          checked={selectedUsers.includes(user.id)}
                          onChange={() => toggleSelectUser(user.id)}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.doctorInfo}>
                          <div className="doctor-avatar" style={styles.doctorAvatar}>
                            <FontAwesomeIcon icon={faUserMd} />
                          </div>
                          <div>
                            <div style={styles.doctorName}>{user.name}</div>
                            <div style={styles.doctorMeta}>
                              <span><FontAwesomeIcon icon={faIdCard} /> {user.doctorId}</span>
                              <span><FontAwesomeIcon icon={faStethoscope} /> {user.specialization}</span>
                              <span><FontAwesomeIcon icon={faBuilding} /> {user.departmentName}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.credentialsInfo}>
                          <div style={styles.credentialRow}>
                            <FontAwesomeIcon icon={faEnvelope} />
                            <span style={styles.credentialValue}>{user.email}</span>
                          </div>
                          <div style={styles.credentialRow}>
                            <FontAwesomeIcon icon={faLock} />
                            <span style={styles.credentialValue}>
                              {showPasswordId === user.id ? user.password : '••••••••••'}
                            </span>
                            <button 
                              onClick={() => togglePasswordVisibility(user.id)}
                              style={styles.passwordToggle}
                              className="password-toggle"
                            >
                              <FontAwesomeIcon icon={showPasswordId === user.id ? faEyeSlash : faEye} />
                            </button>
                          </div>
                          <div style={styles.passwordStrength}>
                            <div className="password-strength-meter">
                              <div 
                                className="password-strength-bar"
                                style={{
                                  width: `${(passwordStrength.score / 3) * 100}%`,
                                  background: passwordStrength.color
                                }}
                              />
                            </div>
                            <span style={{fontSize: '0.75rem', color: passwordStrength.color}}>
                              {passwordStrength.label} Password
                              {user.passwordStructure && ` • ${user.passwordStructure}`}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={{
                          ...styles.statusBadge,
                          background: user.status === 'active' ? '#dcfce7' : '#fee2e2',
                          color: user.status === 'active' ? '#166534' : '#991b1b'
                        }}>
                          <FontAwesomeIcon icon={user.status === 'active' ? faToggleOn : faToggleOff} />
                          {user.status === 'active' ? 'Active' : 'Disabled'}
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div style={styles.lastChanged}>
                          {user.lastPasswordChange ? (
                            <>
                              <FontAwesomeIcon icon={faCalendar} />
                              {new Date(user.lastPasswordChange).toLocaleDateString()}
                              <br/>
                              <small style={{color: '#64748b', fontSize: '0.8rem'}}>
                                by {user.passwordChangedBy || 'System'}
                              </small>
                            </>
                          ) : (
                            <span style={{color: '#64748b'}}>Never changed</span>
                          )}
                        </div>
                      </td>
                      <td style={styles.tableCell}>
                        <div className="action-buttons" style={styles.actionButtons}>
                          <button 
                            onClick={() => startPasswordReset(user)}
                            style={styles.resetBtn}
                            className="reset-btn"
                            title="Reset Password"
                          >
                            <FontAwesomeIcon icon={faRefresh} />
                          </button>
                          <button 
                            onClick={() => copyCredentials(user)}
                            style={styles.copyBtn}
                            className="copy-btn"
                            title="Copy Credentials"
                          >
                            <FontAwesomeIcon icon={faCopy} />
                          </button>
                          <button 
                            onClick={() => toggleUserStatus(user.id)}
                            style={{
                              ...styles.toggleBtn,
                              background: user.status === 'active' ? '#f59e0b' : '#84cc16'
                            }}
                            className="toggle-btn"
                            title={user.status === 'active' ? 'Disable Login' : 'Enable Login'}
                          >
                            <FontAwesomeIcon icon={user.status === 'active' ? faToggleOff : faToggleOn} />
                          </button>
                          <button 
                            onClick={() => deleteCredentials(user.id)}
                            style={styles.deleteBtn}
                            className="delete-btn"
                            title="Delete Credentials"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {editingPassword && selectedUser && (
        <div className="modal-overlay" style={styles.modalOverlay}>
          <div className="modal" style={styles.modal}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FontAwesomeIcon icon={faKey} />
                Reset Password for {selectedUser.name}
              </h3>
              <button onClick={() => {
                setEditingPassword(null);
                setNewPassword('');
                setSelectedUser(null);
              }} style={styles.modalClose}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div style={styles.modalBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Current Email</label>
                <div style={styles.currentEmail}>{selectedUser.email}</div>
              </div>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>New Password</label>
                <div style={styles.passwordInputGroup}>
                  <input
                    type="text"
                    value={newPassword}
                    readOnly
                    style={styles.passwordInput}
                    placeholder="Click generate to create structured password"
                  />
                  <button onClick={generateNewPassword} style={styles.generateBtn} className="generate-btn">
                    <FontAwesomeIcon icon={faRefresh} /> Generate
                  </button>
                </div>
                <small style={styles.helperText}>
                  Structured format: Name initials + specialization + sequence + strong characters
                </small>
              </div>
              
              {newPassword && (
                <div style={styles.passwordStrength}>
                  <div className="password-strength-meter">
                    <div 
                      className="password-strength-bar"
                      style={{
                        width: '100%',
                        background: '#10b981'
                      }}
                    />
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.5rem'}}>
                    <span style={{color: '#10b981', fontSize: '0.875rem', fontWeight: '500'}}>
                      Strong structured password generated
                    </span>
                    <div style={styles.passwordStructureInfo}>
                      <small style={{color: '#64748b', fontSize: '0.75rem'}}>
                        Contains: A-Z, a-z, 0-9, special chars
                      </small>
                    </div>
                  </div>
                </div>
              )}
              
              <div style={styles.warningBox}>
                <FontAwesomeIcon icon={faShieldAlt} />
                <div>
                  <strong>Password Structure:</strong>
                  <p style={{margin: '0.5rem 0 0 0', fontSize: '0.875rem'}}>
                    Format: <code>DrInitialsSpec@Seq+StrongChars</code><br/>
                    Example: <code>DrJC@123!Aa9$</code>
                  </p>
                </div>
              </div>
            </div>
            
            <div style={styles.modalActions}>
              <button 
                onClick={() => {
                  setEditingPassword(null);
                  setNewPassword('');
                  setSelectedUser(null);
                }} 
                style={styles.cancelBtn}
                className="cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={() => setShowConfirm(true)}
                disabled={!newPassword.trim()}
                style={styles.confirmBtn}
                className="confirm-btn"
              >
                <FontAwesomeIcon icon={faCheck} /> Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
      
      {showConfirm && selectedUser && (
        <div className="confirm-overlay" style={styles.confirmOverlay}>
          <div className="confirm-modal" style={styles.confirmModal}>
            <div style={styles.confirmHeader}>
              <h4 style={styles.confirmTitle}>
                <FontAwesomeIcon icon={faShieldAlt} />
                Confirm Password Reset
              </h4>
            </div>
            
            <div style={styles.confirmBody}>
              <p>Are you sure you want to reset password for <strong>{selectedUser.name}</strong>?</p>
              <div style={styles.confirmDetails}>
                <div><strong>Email:</strong> {selectedUser.email}</div>
                <div><strong>New Password:</strong> <code style={{fontFamily: 'monospace', fontSize: '0.9rem'}}>{newPassword}</code></div>
                <div style={{marginTop: '0.5rem', fontSize: '0.85rem', color: '#64748b'}}>
                  <strong>Structure:</strong> Name({selectedUser.name[0]}) + Spec({selectedUser.specialization[0]}) + Sequence + StrongChars
                </div>
              </div>
              <div style={styles.confirmWarning}>
                <FontAwesomeIcon icon={faEye} />
                <span>The doctor will need to use this new password immediately.</span>
              </div>
            </div>
            
            <div style={styles.confirmActions}>
              <button 
                onClick={() => setShowConfirm(false)}
                style={styles.confirmCancelBtn}
                className="confirm-cancel-btn"
              >
                Cancel
              </button>
              <button 
                onClick={resetPassword}
                style={styles.confirmSubmitBtn}
                className="confirm-submit-btn"
              >
                <FontAwesomeIcon icon={faCheck} /> Yes, Reset Password
              </button>
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
  headerActions: { display: 'flex', gap: '0.75rem' },
  exportBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' },
  printBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: '#10b981', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500' },
  statsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '2rem' },
  statCard: { background: 'white', padding: '1.5rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', textAlign: 'center', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  statValue: { fontSize: '2rem', fontWeight: '700', color: '#1e293b', margin: '0.5rem 0' },
  statLabel: { color: '#64748b', fontSize: '0.875rem' },
  filtersBar: { background: 'white', padding: '1.25rem', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem', border: '1px solid #e2e8f0', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' },
  searchBox: { display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: '#f8fafc', borderRadius: '0.5rem', border: '1px solid #e2e8f0', flex: '1', minWidth: '300px' },
  searchInput: { border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.95rem' },
  filterGroup: { display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' },
  select: { padding: '0.5rem 1rem', border: '1px solid #cbd5e1', borderRadius: '0.5rem', background: 'white', fontSize: '0.95rem', cursor: 'pointer', minWidth: '150px' },
  bulkBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '0.5rem', cursor: 'pointer', fontWeight: '500', transition: 'all 0.2s' },
  bulkActionsBar: { background: '#f0f9ff', padding: '1rem 1.5rem', borderRadius: '0.75rem', marginBottom: '1rem', border: '1px solid #bae6fd', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' },
  bulkInfo: { color: '#0369a1', fontWeight: '600' },
  bulkButtons: { display: 'flex', gap: '0.75rem' },
  bulkDisableBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#fef3c7', color: '#92400e', border: '1px solid #fde68a', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' },
  bulkDeleteBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' },
  bulkClearBtn: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' },
  tableContainer: { background: 'white', borderRadius: '0.75rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0', padding: '1.5rem' },
  emptyState: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '3rem', color: '#64748b', textAlign: 'center' },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  tableHeader: { background: '#f8fafc' },
  tableCheckbox: { width: '40px', padding: '1rem' },
  tableHeaderCell: { padding: '1rem', textAlign: 'left', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: '600' },
  tableRow: { borderBottom: '1px solid #e2e8f0' },
  tableCell: { padding: '1rem', verticalAlign: 'top' },
  checkbox: { width: '1.2rem', height: '1.2rem', cursor: 'pointer' },
  doctorInfo: { display: 'flex', alignItems: 'center', gap: '1rem' },
  doctorAvatar: { width: '2.5rem', height: '2.5rem', borderRadius: '0.5rem', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  doctorName: { fontSize: '1rem', fontWeight: '600', color: '#1e293b', marginBottom: '0.25rem' },
  doctorMeta: { display: 'flex', flexWrap: 'wrap', gap: '0.75rem', fontSize: '0.75rem', color: '#64748b' },
  credentialsInfo: { display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  credentialRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  credentialValue: { fontFamily: 'monospace', fontSize: '0.875rem' },
  passwordToggle: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0.25rem', transition: 'color 0.2s' },
  passwordStrength: { marginTop: '0.5rem', marginBottom: '1.5rem' }, // COMBINED THE TWO PROPERTIES
  statusBadge: { display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '500' },
  lastChanged: { fontSize: '0.875rem', color: '#1e293b' },
  actionButtons: { display: 'flex', gap: '0.5rem' },
  resetBtn: { padding: '0.5rem', background: '#f0f9ff', color: '#0369a1', border: '1px solid #bae6fd', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' },
  copyBtn: { padding: '0.5rem', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' },
  toggleBtn: { padding: '0.5rem', color: 'white', border: 'none', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' },
  deleteBtn: { padding: '0.5rem', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.2s' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' },
  modal: { background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflow: 'auto' },
  modalHeader: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid #e2e8f0' },
  modalTitle: { fontSize: '1.25rem', fontWeight: '600', color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  modalClose: { background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: '0', width: '2rem', height: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  modalBody: { padding: '1.5rem' },
  formGroup: { marginBottom: '1.5rem' },
  label: { display: 'block', marginBottom: '0.5rem', fontWeight: '500', color: '#374151', fontSize: '0.875rem' },
  currentEmail: { padding: '0.75rem', background: '#f8fafc', borderRadius: '0.5rem', fontFamily: 'monospace', fontSize: '0.9rem' },
  passwordInputGroup: { display: 'flex', gap: '0.75rem' },
  passwordInput: { flex: 1, padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', fontSize: '1rem', background: '#f8fafc' },
  generateBtn: { padding: '0.75rem 1rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '0.875rem', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  helperText: { display: 'block', marginTop: '0.5rem', color: '#64748b', fontSize: '0.875rem' },
  passwordStructureInfo: { textAlign: 'right' }, // REMOVED THE DUPLICATE passwordstrength KEY
  warningBox: { padding: '1rem', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '0.5rem', color: '#0369a1', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' },
  modalActions: { padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem' },
  cancelBtn: { flex: 1, padding: '0.75rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' },
  confirmBtn: { flex: 1, padding: '0.75rem', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' },
  confirmOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '1rem' },
  confirmModal: { background: 'white', borderRadius: '0.75rem', width: '100%', maxWidth: '400px', overflow: 'auto' },
  confirmHeader: { padding: '1.5rem', borderBottom: '1px solid #e2e8f0', background: '#fee2e2' },
  confirmTitle: { fontSize: '1.125rem', fontWeight: '600', color: '#991b1b', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' },
  confirmBody: { padding: '1.5rem' },
  confirmDetails: { margin: '1rem 0', padding: '1rem', background: '#f8fafc', borderRadius: '0.5rem', fontSize: '0.875rem' },
  confirmWarning: { padding: '0.75rem', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '0.5rem', color: '#92400e', display: 'flex', gap: '0.5rem', alignItems: 'center', fontSize: '0.875rem' },
  confirmActions: { padding: '1.5rem', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '1rem' },
  confirmCancelBtn: { flex: 1, padding: '0.75rem', background: '#f3f4f6', color: '#374151', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' },
  confirmSubmitBtn: { flex: 1, padding: '0.75rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }
};

export default DoctorCredentials;