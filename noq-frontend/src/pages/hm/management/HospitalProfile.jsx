// pages/hm/management/HospitalProfile.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHospital, faArrowLeft, faSave, faEdit,
  faMapMarkerAlt, faPhone, faEnvelope,
  faGlobe, faBuilding, faUser, faCalendar,
  faCheckCircle, faClock, faFileContract,
  faBed // ADDED MISSING IMPORT
} from '@fortawesome/free-solid-svg-icons';
import { useAuth } from '../../../context/AuthContext';
import api from '../../../services/api';

const HospitalProfile = () => {
  const navigate = useNavigate();
  const { currentUser, updateUser } = useAuth();
  const resolveHospitalId = (item) => String(item?.id || item?.HID || item?.hospitalId || item?.hospital_id || '');

  const [isEditing, setIsEditing] = useState(false);
  const [hospital, setHospital] = useState({
    HID: '',
    name: '',
    category: '',
    type: '',
    establishedYear: '',
    registrationNumber: '',
    address: '',
    phone: '',
    email: '',
    website: '',
    emergencyContact: '',
    ownerName: '',
    directorName: '',
    totalBeds: 0,
    totalIcuBeds: 0,
    totalOperationTheatres: 0,
    accreditation: [],
    services: [],
    status: 'pending_approval',
    lastUpdated: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    let active = true;

    const loadHospital = async () => {
      const currentHospitalId = resolveHospitalId(currentUser);
      const primary = currentHospitalId
        ? await api.get(`/hospitals/${encodeURIComponent(currentHospitalId)}`).catch(() => null)
        : null;

      const hospitals = await api.get('/hospitals?status_filter=all').catch(() => []);
      if (!active) return;

      const hospitalRows = Array.isArray(hospitals) ? hospitals : [];
      const match = primary
        || hospitalRows.find((h) => String(h?.id || '') === currentHospitalId)
        || (!currentHospitalId
          ? hospitalRows.find((h) => String(h?.email || '').toLowerCase() === String(currentUser?.email || '').toLowerCase())
          : null)
        || null;

      setHospital({
        HID: currentHospitalId || resolveHospitalId(match) || '',
        name: match?.name || match?.hospitalName || match?.hospital_name || currentUser?.hospitalName || '',
        category: match?.category || '',
        type: match?.type || '',
        establishedYear: match?.establishedYear || '',
        registrationNumber: match?.registrationNumber || '',
        address: match?.address || '',
        phone: match?.phone || currentUser?.phone || '',
        email: match?.email || currentUser?.email || '',
        website: match?.website || '',
        emergencyContact: match?.emergencyContact || match?.emergency_contact || '',
        ownerName: match?.ownerName || '',
        directorName: match?.directorName || currentUser?.name || '',
        totalBeds: match?.totalBeds || match?.beds || 0,
        totalIcuBeds: match?.totalIcuBeds || 0,
        totalOperationTheatres: match?.totalOperationTheatres || 0,
        accreditation: match?.accreditation || [],
        services: match?.services || [],
        status: String(match?.status || 'pending').toLowerCase(),
        lastUpdated: match?.updated_at?.split?.('T')?.[0] || match?.lastUpdated || match?.updatedAt || new Date().toISOString().split('T')[0],
      });
    };

    loadHospital();
    return () => {
      active = false;
    };
  }, [currentUser]);

  // CSS Styles - FIXED: Remove media queries from CSS-in-JS
  const styles = {
    container: {
      padding: '1.5rem',
      maxWidth: '1200px',
      margin: '0 auto',
      fontFamily: "'Segoe UI', 'Roboto', sans-serif"
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
      background: '#f1f5f9',
      color: '#475569',
      border: '1px solid #cbd5e1',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      transition: 'all 0.2s'
    },
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 0.25rem 0'
    },
    subtitle: {
      color: '#64748b',
      fontSize: '0.95rem',
      margin: '0'
    },
    saveBtn: {
      background: '#10b981',
      color: 'white',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: '600',
      transition: 'background 0.2s'
    },
    editBtn: {
      background: '#3b82f6',
      color: 'white',
      border: 'none',
      padding: '0.75rem 1.5rem',
      borderRadius: '8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      fontWeight: '600',
      transition: 'background 0.2s'
    },
    profileCard: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '16px',
      padding: '2rem',
      marginBottom: '2rem',
      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'center',
      gap: '2rem',
      marginBottom: '2rem',
      paddingBottom: '2rem',
      borderBottom: '1px solid #f1f5f9',
      flexWrap: 'wrap'
    },
    avatar: {
      width: '120px',
      height: '120px',
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      borderRadius: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '3rem'
    },
    profileInfo: {
      flex: '1'
    },
    profileName: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#1e293b',
      margin: '0 0 0.5rem 0'
    },
    categoryBadge: {
      display: 'inline-block',
      background: '#dbeafe',
      color: '#1d4ed8',
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '600',
      marginRight: '0.5rem'
    },
    typeBadge: {
      display: 'inline-block',
      background: '#dcfce7',
      color: '#166534',
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '600'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.5rem',
      marginTop: '1rem',
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '500'
    },
    activeStatus: {
      background: '#d1fae5',
      color: '#065f46'
    },
    sectionsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
      gap: '1.5rem',
      marginBottom: '2rem'
    },
    section: {
      background: 'white',
      border: '1px solid #e2e8f0',
      borderRadius: '12px',
      padding: '1.5rem'
    },
    sectionTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#1e293b',
      margin: '0 0 1rem 0',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    },
    infoGrid: {
      display: 'grid',
      gap: '1rem'
    },
    infoRow: {
      display: 'flex',
      justifyContent: 'space-between',
      paddingBottom: '0.75rem',
      borderBottom: '1px solid #f1f5f9'
    },
    infoLabel: {
      color: '#64748b',
      fontSize: '0.875rem',
      fontWeight: '500'
    },
    infoValue: {
      color: '#1e293b',
      fontSize: '0.95rem',
      fontWeight: '500',
      textAlign: 'right'
    },
    inputField: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #cbd5e1',
      borderRadius: '8px',
      fontSize: '0.95rem',
      boxSizing: 'border-box',
      background: '#f8fafc'
    },
    contactCard: {
      background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
      border: '1px solid #bae6fd',
      borderRadius: '12px',
      padding: '1.5rem',
      marginBottom: '2rem'
    },
    contactGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '1.5rem'
    },
    contactItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '1rem'
    },
    contactIcon: {
      width: '48px',
      height: '48px',
      background: '#3b82f6',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontSize: '1.25rem'
    },
    contactInfo: {
      flex: '1'
    },
    contactLabel: {
      color: '#64748b',
      fontSize: '0.875rem',
      margin: '0 0 0.25rem 0'
    },
    contactValue: {
      color: '#1e293b',
      fontSize: '1.125rem',
      fontWeight: '600',
      margin: '0'
    },
    capacityGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
      gap: '1rem',
      marginTop: '1rem'
    },
    capacityItem: {
      textAlign: 'center',
      padding: '1rem',
      background: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    },
    capacityValue: {
      fontSize: '1.5rem',
      fontWeight: '700',
      color: '#3b82f6',
      margin: '0.5rem 0'
    },
    capacityLabel: {
      color: '#64748b',
      fontSize: '0.875rem'
    },
    tagsContainer: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.5rem',
      marginTop: '1rem'
    },
    tag: {
      background: '#f1f5f9',
      color: '#475569',
      padding: '0.5rem 1rem',
      borderRadius: '20px',
      fontSize: '0.875rem',
      fontWeight: '500'
    },
    formRow: {
      marginBottom: '1.5rem'
    },
    formLabel: {
      display: 'block',
      marginBottom: '0.5rem',
      fontWeight: '500',
      color: '#374151'
    },
    footer: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: '2rem',
      paddingTop: '1.5rem',
      borderTop: '1px solid #f1f5f9',
      color: '#64748b',
      fontSize: '0.875rem'
    }
  };

  const handleInputChange = (field, value) => {
    setHospital(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    const updated = {
      ...hospital,
      lastUpdated: new Date().toISOString().split('T')[0]
    };

    await api.patch(`/hospitals/${encodeURIComponent(updated.HID)}`, {
      name: updated.name,
      address: updated.address,
      phone: updated.phone,
      email: updated.email,
      city: updated.city || '',
      state: updated.state || '',
      pincode: updated.pincode || '',
    });

    setHospital(updated);
    updateUser?.({ hospitalName: updated.name });

    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  // FIXED: Added proper field mapping for capacity items
  const capacityItems = [
    { label: 'Total Beds', value: hospital.totalBeds, icon: faBed, field: 'totalBeds' },
    { label: 'ICU Beds', value: hospital.totalIcuBeds, icon: faHospital, field: 'totalIcuBeds' },
    { label: 'Operation Theatres', value: hospital.totalOperationTheatres, icon: faBuilding, field: 'totalOperationTheatres' }
  ];

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/hm/management')}
          onMouseOver={e => e.currentTarget.style.background = '#e2e8f0'}
          onMouseOut={e => e.currentTarget.style.background = '#f1f5f9'}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
        </button>
        
        <div>
          <h1 style={styles.title}>Hospital Profile</h1>
          <p style={styles.subtitle}>Manage your hospital information and settings</p>
        </div>
        
        {isEditing ? (
          <button style={styles.saveBtn} onClick={handleSave}
            onMouseOver={e => e.currentTarget.style.background = '#059669'}
            onMouseOut={e => e.currentTarget.style.background = '#10b981'}>
            <FontAwesomeIcon icon={faSave} /> Save Changes
          </button>
        ) : (
          <button style={styles.editBtn} onClick={() => setIsEditing(true)}
            onMouseOver={e => e.currentTarget.style.background = '#2563eb'}
            onMouseOut={e => e.currentTarget.style.background = '#3b82f6'}>
            <FontAwesomeIcon icon={faEdit} /> Edit Profile
          </button>
        )}
      </div>

      <div style={styles.profileCard}>
        <div style={styles.profileHeader}>
          <div style={styles.avatar}>
            <FontAwesomeIcon icon={faHospital} />
          </div>
          
          <div style={styles.profileInfo}>
            {isEditing ? (
              <input 
                type="text" 
                value={hospital.name} 
                onChange={(e) => handleInputChange('name', e.target.value)}
                style={{
                  ...styles.inputField, 
                  fontSize: '2rem', 
                  fontWeight: '700', 
                  marginBottom: '0.5rem',
                  background: 'white',
                  borderColor: '#3b82f6'
                }} 
              />
            ) : (
              <h2 style={styles.profileName}>{hospital.name}</h2>
            )}
            
            <div>
              <span style={styles.categoryBadge}>{hospital.category}</span>
              <span style={styles.typeBadge}>{hospital.type}</span>
            </div>
            
            <div style={{...styles.statusBadge, ...styles.activeStatus}}>
              <FontAwesomeIcon icon={faCheckCircle} />
              Active • Last updated: {hospital.lastUpdated}
            </div>
          </div>
        </div>

        <div style={styles.sectionsGrid}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FontAwesomeIcon icon={faFileContract} />
              Registration Details
            </h3>
            
            <div style={styles.infoGrid}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Hospital ID</span>
                <span style={{ ...styles.infoValue, fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 10px', borderRadius: '6px', letterSpacing: '0.05em' }}>
                  {hospital.HID || '—'}
                </span>
              </div>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Established Year</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={hospital.establishedYear} 
                    onChange={(e) => handleInputChange('establishedYear', e.target.value)}
                    style={{
                      ...styles.inputField, 
                      width: '150px',
                      textAlign: 'center'
                    }} 
                  />
                ) : (
                  <span style={styles.infoValue}>{hospital.establishedYear}</span>
                )}
              </div>
              
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Registration Number</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={hospital.registrationNumber} 
                    onChange={(e) => handleInputChange('registrationNumber', e.target.value)}
                    style={{
                      ...styles.inputField, 
                      width: '200px'
                    }} 
                  />
                ) : (
                  <span style={styles.infoValue}>{hospital.registrationNumber}</span>
                )}
              </div>
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FontAwesomeIcon icon={faUser} />
              Management
            </h3>
            
            <div style={styles.infoGrid}>
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Owner</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={hospital.ownerName} 
                    onChange={(e) => handleInputChange('ownerName', e.target.value)}
                    style={{
                      ...styles.inputField, 
                      width: '200px'
                    }} 
                  />
                ) : (
                  <span style={styles.infoValue}>{hospital.ownerName}</span>
                )}
              </div>
              
              <div style={styles.infoRow}>
                <span style={styles.infoLabel}>Director</span>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={hospital.directorName} 
                    onChange={(e) => handleInputChange('directorName', e.target.value)}
                    style={{
                      ...styles.inputField, 
                      width: '200px'
                    }} 
                  />
                ) : (
                  <span style={styles.infoValue}>{hospital.directorName}</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.contactCard}>
          <h3 style={styles.sectionTitle}>
            <FontAwesomeIcon icon={faPhone} />
            Contact Information
          </h3>
          
          <div style={styles.contactGrid}>
            <div style={styles.contactItem}>
              <div style={styles.contactIcon}>
                <FontAwesomeIcon icon={faMapMarkerAlt} />
              </div>
              <div style={styles.contactInfo}>
                <p style={styles.contactLabel}>Address</p>
                {isEditing ? (
                  <textarea 
                    value={hospital.address} 
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    style={{
                      ...styles.inputField, 
                      minHeight: '80px', 
                      resize: 'vertical',
                      background: 'white'
                    }} 
                  />
                ) : (
                  <p style={styles.contactValue}>{hospital.address}</p>
                )}
              </div>
            </div>
            
            <div style={styles.contactItem}>
              <div style={styles.contactIcon}>
                <FontAwesomeIcon icon={faPhone} />
              </div>
              <div style={styles.contactInfo}>
                <p style={styles.contactLabel}>Phone</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={hospital.phone} 
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    style={styles.inputField} 
                  />
                ) : (
                  <p style={styles.contactValue}>{hospital.phone}</p>
                )}
              </div>
            </div>
            
            <div style={styles.contactItem}>
              <div style={styles.contactIcon}>
                <FontAwesomeIcon icon={faEnvelope} />
              </div>
              <div style={styles.contactInfo}>
                <p style={styles.contactLabel}>Email</p>
                {isEditing ? (
                  <input 
                    type="email" 
                    value={hospital.email} 
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    style={styles.inputField} 
                  />
                ) : (
                  <p style={styles.contactValue}>{hospital.email}</p>
                )}
              </div>
            </div>
            
            <div style={styles.contactItem}>
              <div style={styles.contactIcon}>
                <FontAwesomeIcon icon={faGlobe} />
              </div>
              <div style={styles.contactInfo}>
                <p style={styles.contactLabel}>Website</p>
                {isEditing ? (
                  <input 
                    type="url" 
                    value={hospital.website} 
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    style={styles.inputField} 
                  />
                ) : (
                  <p style={styles.contactValue}>{hospital.website}</p>
                )}
              </div>
            </div>
          </div>
          
          <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0' }}>
            <div style={styles.contactItem}>
              <div style={{...styles.contactIcon, background: '#ef4444'}}>
                <FontAwesomeIcon icon={faPhone} />
              </div>
              <div style={styles.contactInfo}>
                <p style={styles.contactLabel}>Emergency Contact</p>
                {isEditing ? (
                  <input 
                    type="text" 
                    value={hospital.emergencyContact} 
                    onChange={(e) => handleInputChange('emergencyContact', e.target.value)}
                    style={{
                      ...styles.inputField, 
                      background: '#fee2e2', 
                      borderColor: '#fecaca'
                    }} 
                  />
                ) : (
                  <p style={{...styles.contactValue, color: '#ef4444'}}>{hospital.emergencyContact}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={styles.sectionsGrid}>
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FontAwesomeIcon icon={faBuilding} />
              Hospital Capacity
            </h3>
            
            <div style={styles.capacityGrid}>
              {capacityItems.map((item, idx) => (
                <div key={idx} style={styles.capacityItem}>
                  <FontAwesomeIcon icon={item.icon} style={{ fontSize: '1.5rem', color: '#3b82f6' }} />
                  {isEditing ? (
                    <input 
                      type="number" 
                      value={item.value} 
                      onChange={(e) => handleInputChange(item.field, parseInt(e.target.value) || 0)}
                      style={{
                        ...styles.inputField, 
                        textAlign: 'center', 
                        fontSize: '1.5rem', 
                        fontWeight: '700',
                        padding: '0.5rem'
                      }} 
                    />
                  ) : (
                    <div style={styles.capacityValue}>{item.value}</div>
                  )}
                  <div style={styles.capacityLabel}>{item.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FontAwesomeIcon icon={faCheckCircle} />
              Accreditations
            </h3>
            
            <div style={styles.tagsContainer}>
              {hospital.accreditation.map((acc, idx) => (
                <span key={idx} style={styles.tag}>{acc}</span>
              ))}
              {isEditing && (
                <button 
                  style={{
                    ...styles.tag, 
                    background: '#3b82f6', 
                    color: 'white', 
                    border: 'none', 
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const newAcc = prompt('Enter new accreditation:');
                    if (newAcc && newAcc.trim()) {
                      handleInputChange('accreditation', [...hospital.accreditation, newAcc.trim()]);
                    }
                  }}
                >
                  + Add
                </button>
              )}
            </div>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>
              <FontAwesomeIcon icon={faHospital} />
              Services
            </h3>
            
            <div style={styles.tagsContainer}>
              {hospital.services.map((service, idx) => (
                <span key={idx} style={styles.tag}>{service}</span>
              ))}
              {isEditing && (
                <button 
                  style={{
                    ...styles.tag, 
                    background: '#3b82f6', 
                    color: 'white', 
                    border: 'none', 
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    const newService = prompt('Enter new service:');
                    if (newService && newService.trim()) {
                      handleInputChange('services', [...hospital.services, newService.trim()]);
                    }
                  }}
                >
                  + Add
                </button>
              )}
            </div>
          </div>
        </div>

        <div style={styles.footer}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FontAwesomeIcon icon={faClock} />
            <span>Last updated: {hospital.lastUpdated}</span>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FontAwesomeIcon icon={faCheckCircle} style={{ color: '#10b981' }} />
            <span>Status: Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HospitalProfile;