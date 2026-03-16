// pages/MedicalRecords.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from '../../context/FirebaseAuthContext';
import useFirebaseData from '../../hooks/useFirebaseData';
import firebaseDbService from '../../services/firebaseDbService';
import {
  faFileMedical,
  faFilePdf,
  faFileImage,
  faDownload,
  faShare,
  faEye,
  faPlus,
  faFilter,
  faSearch,
  faCalendarAlt,
  faStethoscope,
  faUserMd,
  faHospital,
  faChartLine,
  faPrint,
  faTrash,
  faEdit,
  faHistory,
  faHeartbeat,
  faAllergies,
  faSyringe,
  faProcedures,
  faNotesMedical,
  faClipboardList,
  faFileWaveform,
  faVial,
  faXRay,
  faPrescriptionBottle
} from '@fortawesome/free-solid-svg-icons';
import './patient.css';

const MedicalRecords = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const {
    patients: allPatients,
    medicalRecords: allMedicalRecords,
    prescriptions,
    loading: dataLoading,
  } = useFirebaseData();
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');

  const patient = useMemo(() => {
    const matchedPatient =
      allPatients.find((p) => String(p.id || '') === String(currentUser?.id || '')) ||
      allPatients.find((p) => p.email?.toLowerCase() === currentUser?.email?.toLowerCase());

    if (matchedPatient) {
      return matchedPatient;
    }

    if (currentUser && String(currentUser.role || '').toLowerCase() === 'patient') {
      return currentUser;
    }

    return null;
  }, [allPatients, currentUser]);

  // Record categories
  const categories = [
    { id: 'all', name: 'All Records', icon: faFileMedical, color: '#3b82f6' },
    { id: 'consultation', name: 'Consultations', icon: faStethoscope, color: '#10b981' },
    { id: 'lab', name: 'Lab Reports', icon: faVial, color: '#8b5cf6' },
    { id: 'radiology', name: 'Radiology', icon: faXRay, color: '#f59e0b' },
    { id: 'prescription', name: 'Prescriptions', icon: faPrescriptionBottle, color: '#ef4444' },
    { id: 'vaccination', name: 'Vaccinations', icon: faSyringe, color: '#06b6d4' },
    { id: 'surgery', name: 'Surgeries', icon: faProcedures, color: '#ec4899' },
    { id: 'chronic', name: 'Chronic Conditions', icon: faHeartbeat, color: '#dc2626' },
    { id: 'allergy', name: 'Allergies', icon: faAllergies, color: '#84cc16' }
  ];

  // Check authentication
  useEffect(() => {
    if (!authLoading && (!currentUser || String(currentUser.role || '').toLowerCase() !== 'patient')) {
      navigate('/login', { replace: true });
      return;
    }
  }, [authLoading, currentUser, navigate]);

  useEffect(() => {
    if (patient?.id) {
      loadMedicalRecords(patient.id);
    }
  }, [patient?.id, patient?.email, allMedicalRecords, prescriptions, activeTab]);

  // Load medical records
  const loadMedicalRecords = (patientId) => {
    setLoading(true);
    const patientEmail = String(patient?.email || '').toLowerCase();

    const patientRecords = allMedicalRecords.filter((record) =>
      String(record.patientId || '') === String(patientId) ||
      String(record.patientEmail || '').toLowerCase() === patientEmail
    );

    const patientPrescriptions = prescriptions
      .filter(
        (item) =>
          String(item.patientId || '') === String(patientId) ||
          String(item.patientEmail || '').toLowerCase() === patientEmail
      )
      .map((item) => ({
        id: `RX-${item.id || Date.now()}`,
        title: item.medicine || 'Prescription',
        category: 'prescription',
        doctor: item.doctorName || item.doctor || 'Doctor',
        hospital: item.hospitalName || item.hospital || 'Hospital',
        date: (item.date || item.createdAt || new Date().toISOString()).split('T')[0],
        type: 'pdf',
        size: 'Prescription',
        description: item.prescription || item.notes || 'Doctor prescription',
        tags: ['Prescription', item.status || 'active'].filter(Boolean),
        uploadedBy: item.doctorName || 'Doctor',
        confidential: false,
        patientId: String(item.patientId || ''),
        source: 'doctor-prescription',
      }));

    const mergedRecords = [...patientRecords, ...patientPrescriptions]
      .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));

    setRecords(mergedRecords);
    setFilteredRecords(filterRecords(mergedRecords, activeTab));
    setLoading(false);
  };

  // Filter records
  const filterRecords = (recs, tab) => {
    if (tab === 'all') return recs;
    return recs.filter(record => record.category === tab);
  };

  // Handle tab change
  const handleTabChange = (categoryId) => {
    setActiveTab(categoryId);
    setSelectedCategory(categoryId);
    setFilteredRecords(filterRecords(records, categoryId));
  };

  // Handle search
  const handleSearch = (e) => {
    const query = e.target.value.toLowerCase();
    setSearchQuery(query);
    
    if (!query) {
      setFilteredRecords(filterRecords(records, activeTab));
      return;
    }
    
    const filtered = records.filter(record =>
      String(record.title || '').toLowerCase().includes(query) ||
      String(record.doctor || '').toLowerCase().includes(query) ||
      String(record.description || '').toLowerCase().includes(query) ||
      (Array.isArray(record.tags) ? record.tags : []).some(tag => String(tag).toLowerCase().includes(query))
    );
    
    setFilteredRecords(filtered);
  };

  // Upload new record
  const handleUpload = async (file) => {
    const newRecord = {
      id: `mr_${Date.now()}`,
      title: file.name,
      category: selectedCategory || 'consultation',
      doctor: 'Self Uploaded',
      hospital: patient?.hospital || 'Self',
      date: new Date().toISOString().split('T')[0],
      type: file.type.includes('pdf') ? 'pdf' : 'image',
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      description: 'Uploaded by patient',
      tags: ['Self-Upload'],
      uploadedBy: patient?.name,
      confidential: false,
      patientId: patient.id
    };

    try {
      await firebaseDbService.upsert('medicalRecords', newRecord.id, newRecord);
      const updatedRecords = [...records, newRecord];
      setRecords(updatedRecords);
      setFilteredRecords(filterRecords(updatedRecords, activeTab));
      setShowUploadModal(false);
      alert('Record uploaded successfully!');
    } catch (error) {
      console.error('Error uploading record:', error);
      alert('Failed to upload record.');
    }
  };

  // Download record
  const downloadRecord = (record) => {
    // Simulate download
    const content = `Medical Record: ${record.title}\n\nDoctor: ${record.doctor}\nDate: ${record.date}\nDescription: ${record.description}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${record.title}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Share record
  const shareRecord = (record) => {
    const email = prompt('Enter doctor\'s email to share this record:');
    if (email) {
      alert(`Record shared with ${email}`);
      // In real app, would make API call to share
    }
  };

  // Get file icon
  const getFileIcon = (type) => {
    return type === 'pdf' ? faFilePdf : faFileImage;
  };

  // Get file color
  const getFileColor = (type) => {
    return type === 'pdf' ? '#ef4444' : '#10b981';
  };

  // Format date
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading || dataLoading || !patient) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading medical records...</p>
      </div>
    );
  }

  return (
    <div className="medical-records-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-left">
          <h1><FontAwesomeIcon icon={faFileMedical} /> Medical Records</h1>
          <p>Access your complete medical history and reports</p>
        </div>
        <div className="header-right">
          <button 
            className="btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <FontAwesomeIcon icon={faPlus} /> Upload New Record
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="records-stats">
        <div className="stat-card">
          <FontAwesomeIcon icon={faFileMedical} />
          <div className="stat-content">
            <span className="stat-number">{records.length}</span>
            <span className="stat-label">Total Records</span>
          </div>
        </div>
        <div className="stat-card">
          <FontAwesomeIcon icon={faHospital} />
          <div className="stat-content">
            <span className="stat-number">
              {[...new Set(records.map(r => r.hospital))].length}
            </span>
            <span className="stat-label">Hospitals</span>
          </div>
        </div>
        <div className="stat-card">
          <FontAwesomeIcon icon={faUserMd} />
          <div className="stat-content">
            <span className="stat-number">
              {[...new Set(records.map(r => r.doctor))].length}
            </span>
            <span className="stat-label">Doctors</span>
          </div>
        </div>
        <div className="stat-card">
          <FontAwesomeIcon icon={faHistory} />
          <div className="stat-content">
            <span className="stat-number">
              {new Date().getFullYear() - new Date(records[records.length - 1]?.date || new Date()).getFullYear()}
            </span>
            <span className="stat-label">Years of History</span>
          </div>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="category-tabs">
        {categories.map(category => (
          <button
            key={category.id}
            className={`category-tab ${activeTab === category.id ? 'active' : ''}`}
            onClick={() => handleTabChange(category.id)}
            style={{ '--category-color': category.color }}
          >
            <FontAwesomeIcon icon={category.icon} />
            <span>{category.name}</span>
          </button>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="search-filter-bar">
        <div className="search-box">
          <FontAwesomeIcon icon={faSearch} />
          <input
            type="text"
            placeholder="Search records by title, doctor, or tags..."
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
        <div className="filter-options">
          <select className="filter-select">
            <option>Sort by: Recent</option>
            <option>Sort by: Oldest</option>
            <option>Sort by: Name</option>
            <option>Sort by: Size</option>
          </select>
          <button className="filter-btn">
            <FontAwesomeIcon icon={faFilter} /> Filter
          </button>
        </div>
      </div>

      {/* Records Grid */}
      {loading ? (
        <div className="loading-records">
          <div className="loading-spinner"></div>
          <p>Loading medical records...</p>
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="no-records">
          <FontAwesomeIcon icon={faFileMedical} size="3x" />
          <h3>No medical records found</h3>
          <p>You don't have any medical records in this category.</p>
          <button 
            className="btn-primary"
            onClick={() => setShowUploadModal(true)}
          >
            <FontAwesomeIcon icon={faPlus} /> Upload Your First Record
          </button>
        </div>
      ) : (
        <div className="records-grid">
          {filteredRecords.map(record => (
            <div key={record.id} className="record-card">
              <div className="record-card-header">
                <div className="file-type" style={{ color: getFileColor(record.type) }}>
                  <FontAwesomeIcon icon={getFileIcon(record.type)} />
                </div>
                <div className="record-title">
                  <h4>{record.title}</h4>
                  <span className={`category-badge ${record.category}`}>
                    {categories.find(c => c.id === record.category)?.name}
                  </span>
                </div>
                {record.confidential && (
                  <span className="confidential-badge">
                    <FontAwesomeIcon icon={faEye} /> Confidential
                  </span>
                )}
              </div>
              
              <div className="record-card-body">
                <div className="record-details">
                  <p className="record-description">{record.description}</p>
                  
                  <div className="record-meta">
                    <div className="meta-item">
                      <FontAwesomeIcon icon={faUserMd} />
                      <span>{record.doctor}</span>
                    </div>
                    <div className="meta-item">
                      <FontAwesomeIcon icon={faHospital} />
                      <span>{record.hospital}</span>
                    </div>
                    <div className="meta-item">
                      <FontAwesomeIcon icon={faCalendarAlt} />
                      <span>{formatDate(record.date)}</span>
                    </div>
                    <div className="meta-item">
                      <FontAwesomeIcon icon={faFileWaveform} />
                      <span>{record.size}</span>
                    </div>
                  </div>
                  
                  <div className="record-tags">
                    {record.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                  
                  <div className="record-sharing">
                    <p>
                      <strong>Uploaded by:</strong> {record.uploadedBy}
                    </p>
                   {record.sharedWith?.length > 0 && (
  <p>
    <strong>Shared with:</strong> {record.sharedWith.join(', ')}
  </p>
)}

                  </div>
                </div>
                
                <div className="record-actions">
                  <button 
                    className="action-btn view-btn"
                    onClick={() => setSelectedRecord(record)}
                  >
                    <FontAwesomeIcon icon={faEye} /> View
                  </button>
                  <button 
                    className="action-btn download-btn"
                    onClick={() => downloadRecord(record)}
                  >
                    <FontAwesomeIcon icon={faDownload} /> Download
                  </button>
                  <button 
                    className="action-btn share-btn"
                    onClick={() => shareRecord(record)}
                  >
                    <FontAwesomeIcon icon={faShare} /> Share
                  </button>
                  <button className="action-btn print-btn">
                    <FontAwesomeIcon icon={faPrint} /> Print
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Health Summary */}
      <div className="health-summary-section">
        <h2><FontAwesomeIcon icon={faChartLine} /> Health Summary</h2>
        <div className="summary-cards">
          <div className="summary-card">
            <h4>Chronic Conditions</h4>
            <ul>
              <li>Hypertension (Diagnosed: 2020)</li>
              <li>Type 2 Diabetes (Diagnosed: 2021)</li>
              <li>Asthma (Childhood)</li>
            </ul>
          </div>
          <div className="summary-card">
            <h4>Allergies</h4>
            <ul>
              <li>Penicillin (Severe)</li>
              <li>Dust Mites (Moderate)</li>
              <li>Pollen (Seasonal)</li>
            </ul>
          </div>
          <div className="summary-card">
            <h4>Recent Procedures</h4>
            <ul>
              <li>Knee Replacement (Dec 2023)</li>
              <li>Appendectomy (2018)</li>
              <li>Dental Root Canal (2022)</li>
            </ul>
          </div>
          <div className="summary-card">
            <h4>Vaccinations</h4>
            <ul>
              <li>COVID-19 (3 doses)</li>
              <li>Influenza (Annual)</li>
              <li>Hepatitis B (Complete)</li>
              <li>Tetanus (Up to date)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Record Details Modal */}
      {selectedRecord && (
        <div className="modal-overlay">
          <div className="modal large-modal">
            <div className="modal-header">
              <h3>
                <FontAwesomeIcon icon={getFileIcon(selectedRecord.type)} />
                {selectedRecord.title}
              </h3>
              <button onClick={() => setSelectedRecord(null)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="record-details-modal">
                <div className="detail-section">
                  <div className="detail-grid">
                    <div className="detail-item">
                      <span className="detail-label">Category</span>
                      <span className="detail-value">{selectedRecord.category}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">{formatDate(selectedRecord.date)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Doctor</span>
                      <span className="detail-value">{selectedRecord.doctor}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Hospital</span>
                      <span className="detail-value">{selectedRecord.hospital}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">File Type</span>
                      <span className="detail-value">{selectedRecord.type.toUpperCase()}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">File Size</span>
                      <span className="detail-value">{selectedRecord.size}</span>
                    </div>
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Description</h4>
                  <p>{selectedRecord.description}</p>
                </div>
                
                <div className="detail-section">
                  <h4>Tags</h4>
                  <div className="tags-list">
                    {selectedRecord.tags.map((tag, index) => (
                      <span key={index} className="tag">{tag}</span>
                    ))}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Access Information</h4>
                  <div className="access-info">
                    <p><strong>Uploaded by:</strong> {selectedRecord.uploadedBy}</p>
                    <p><strong>Confidential:</strong> {selectedRecord.confidential ? 'Yes' : 'No'}</p>
                    {selectedRecord.sharedWith.length > 0 && (
                      <p><strong>Shared with:</strong> {selectedRecord.sharedWith.join(', ')}</p>
                    )}
                  </div>
                </div>
                
                <div className="detail-section">
                  <h4>Preview</h4>
                  <div className="file-preview">
                    <div className="preview-placeholder">
                      <FontAwesomeIcon icon={getFileIcon(selectedRecord.type)} size="3x" />
                      <p>Preview of {selectedRecord.title}</p>
                      <small>In a real application, this would show the actual file content</small>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setSelectedRecord(null)}>
                  Close
                </button>
                <button className="btn-primary" onClick={() => downloadRecord(selectedRecord)}>
                  <FontAwesomeIcon icon={faDownload} /> Download
                </button>
                <button className="btn-primary" onClick={() => shareRecord(selectedRecord)}>
                  <FontAwesomeIcon icon={faShare} /> Share with Doctor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3><FontAwesomeIcon icon={faPlus} /> Upload Medical Record</h3>
              <button onClick={() => setShowUploadModal(false)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="upload-form">
                <div className="form-group">
                  <label>Select Category</label>
                  <div className="category-options">
                    {categories.filter(c => c.id !== 'all').map(category => (
                      <button
                        key={category.id}
                        className={`category-option ${selectedCategory === category.id ? 'selected' : ''}`}
                        onClick={() => setSelectedCategory(category.id)}
                      >
                        <FontAwesomeIcon icon={category.icon} />
                        <span>{category.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Upload File</label>
                  <div className="file-upload-area">
                    <FontAwesomeIcon icon={faFileMedical} size="2x" />
                    <p>Drag & drop files here or click to browse</p>
                    <small>Supported formats: PDF, JPG, PNG (Max 10MB)</small>
                    <input 
                      type="file" 
                      id="file-upload"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        if (e.target.files[0]) {
                          handleUpload(e.target.files[0]);
                        }
                      }}
                      style={{ display: 'none' }}
                    />
                    <label htmlFor="file-upload" className="browse-btn">
                      Browse Files
                    </label>
                  </div>
                </div>
                
                <div className="form-group">
                  <label>Description (Optional)</label>
                  <textarea
                    placeholder="Add a description for this medical record..."
                    rows="3"
                  />
                </div>
                
                <div className="upload-note">
                  <FontAwesomeIcon icon={faNotesMedical} />
                  <p>
                    <strong>Note:</strong> Uploaded records will be verified by medical staff 
                    before being added to your official medical history.
                  </p>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowUploadModal(false)}
                >
                  Cancel
                </button>
                <button className="btn-primary" disabled>
                  Upload Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicalRecords;