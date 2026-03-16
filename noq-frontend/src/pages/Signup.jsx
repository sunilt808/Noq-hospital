// pages/Signup.js - REDESIGNED to match Login UI/UX
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faEnvelope,
  faPhone,
  faLock,
  faCalendarAlt,
  faVenusMars,
  faHospitalAlt,
  faBuilding,
  faMapMarkerAlt,
  faFileUpload,
  faSpinner,
  faCheckCircle,
  faShieldAlt,
  faUserTie,
  faUserMd,
  faUserInjured,
  faClipboard,
  faEye,
  faEyeSlash,
  faFileContract
} from '@fortawesome/free-solid-svg-icons';
import { authService } from '../services/authService.js';

const Signup = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState('patient');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [proofFile, setProofFile] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    dob: '',
    gender: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    hospitalName: '',
    category: 'private',
    address: '',
  });

  const [errors, setErrors] = useState({});

  const roles = [
    { id: 'patient', icon: faUserInjured, label: 'Patient', color: '#10b981' },
    { id: 'hm', icon: faUserTie, label: 'Hospital Manager', color: '#4f46e5' }
  ];

  const handleChange = (e) => {
    const { name, value } = e.target;
    const nextValue = name === 'phone' ? value.replace(/\D/g, '').slice(0, 10) : value;
    setFormData(prev => ({ ...prev, [name]: nextValue }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePhone = (phone) => /^[0-9]{10}$/.test(phone);

  const validate = () => {
    const newErrors = {};

    if (!formData.fullName.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.dob) newErrors.dob = 'Date of birth is required';
    if (!formData.gender) newErrors.gender = 'Please select a gender';
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Enter a valid email address';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!validatePhone(formData.phone)) {
      newErrors.phone = 'Enter a valid 10-digit phone number';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (role === 'hm') {
      if (!formData.hospitalName.trim()) newErrors.hospitalName = 'Hospital name is required';
      if (!formData.category) newErrors.category = 'Please select a category';
    }

    if (role === 'patient' && !proofFile) {
      newErrors.proofFile = 'Proof document is required any (PDF/Image)';
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the Terms & Conditions';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      await authService.register({
        role,
        fullName: formData.fullName,
        dob: formData.dob,
        gender: formData.gender,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        proofFile,
        hospitalName: formData.hospitalName,
        category: formData.category,
        address: formData.address,
      });

      setMessage({
        type: 'success',
        text: role === 'hm'
          ? 'Hospital registration submitted! Pending admin approval.'
          : 'Patient account created successfully! You can now login.',
      });

      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setMessage({
        type: 'error',
        text: error?.message || 'Registration failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <div className="auth-logo-icon">
              <FontAwesomeIcon icon={faHospitalAlt} />
            </div>
            <div className="auth-logo-text">NOQ Hospital</div>
          </div>
          <p className="auth-tagline">Create your account to get started</p>
        </div>

        <div className="demo-banner">
          <FontAwesomeIcon icon={faClipboard} />
          <span>Create account and submit registration</span>
        </div>

        {message.text && (
          <div className={`auth-message ${message.type === 'success' ? 'success' : 'error'}`}>
            <FontAwesomeIcon icon={message.type === 'success' ? faCheckCircle : faShieldAlt} />
            {message.text}
          </div>
        )}

        <div className="form-group">
          <div className="form-label">
            <FontAwesomeIcon icon={faUser} />
            Select
          </div>
          <div className="role-selector">
            {roles.map(r => (
              <div
                key={r.id}
                className={`role-option ${role === r.id ? 'active' : ''}`}
                onClick={() => setRole(r.id)}
                style={{ borderColor: r.color }}
              >
                <FontAwesomeIcon icon={r.icon} className="role-icon" style={{ color: r.color }} />
                <span className="role-name">{r.label}</span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Full Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="fullName">
              <FontAwesomeIcon icon={faUser} />
              Full Name
            </label>
            <div className="input-container">
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`form-control ${errors.fullName ? 'error' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.fullName && <div className="error-message">{errors.fullName}</div>}
          </div>

          {/* Date of Birth & Gender */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="dob">
                <FontAwesomeIcon icon={faCalendarAlt} />
                Date of Birth
              </label>
              <div className="input-container">
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className={`form-control ${errors.dob ? 'error' : ''}`}
                  disabled={loading}
                />
              </div>
              {errors.dob && <div className="error-message">{errors.dob}</div>}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="gender">
                <FontAwesomeIcon icon={faVenusMars} />
                Gender
              </label>
              <div className="input-container">
                <select
                  id="gender"
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={`form-control ${errors.gender ? 'error' : ''}`}
                  disabled={loading}
                >
                  <option value="">Select</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {errors.gender && <div className="error-message">{errors.gender}</div>}
            </div>
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              <FontAwesomeIcon icon={faEnvelope} />
              Email Address
            </label>
            <div className="input-container">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className={`form-control ${errors.email ? 'error' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.email && <div className="error-message">{errors.email}</div>}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              <FontAwesomeIcon icon={faPhone} />
              Phone Number
            </label>
            <div className="input-container">
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="10-digit mobile number"
                maxLength="10"
                inputMode="numeric"
                pattern="[0-9]{10}"
                className={`form-control ${errors.phone ? 'error' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.phone && <div className="error-message">{errors.phone}</div>}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              <FontAwesomeIcon icon={faLock} />
              Password
            </label>
            <div className="input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create a password (min. 6 characters)"
                className={`form-control ${errors.password ? 'error' : ''}`}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {errors.password && <div className="error-message">{errors.password}</div>}
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              <FontAwesomeIcon icon={faLock} />
              Confirm Password
            </label>
            <div className="input-container">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                className={`form-control ${errors.confirmPassword ? 'error' : ''}`}
                disabled={loading}
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={loading}
              >
                <FontAwesomeIcon icon={showConfirmPassword ? faEyeSlash : faEye} />
              </button>
            </div>
            {errors.confirmPassword && <div className="error-message">{errors.confirmPassword}</div>}
          </div>

          {/* Hospital Manager specific fields */}
          {role === 'hm' && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="hospitalName">
                  <FontAwesomeIcon icon={faHospitalAlt} />
                  Hospital Name
                </label>
                <div className="input-container">
                  <input
                    type="text"
                    id="hospitalName"
                    name="hospitalName"
                    value={formData.hospitalName}
                    onChange={handleChange}
                    placeholder="Enter hospital name"
                    className={`form-control ${errors.hospitalName ? 'error' : ''}`}
                    disabled={loading}
                  />
                </div>
                {errors.hospitalName && <div className="error-message">{errors.hospitalName}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="category">
                  <FontAwesomeIcon icon={faBuilding} />
                  Hospital Category
                </label>
                <div className="input-container">
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className={`form-control ${errors.category ? 'error' : ''}`}
                    disabled={loading}
                  >
                    <option value="private">Private</option>
                    <option value="government">Government</option>
                  </select>
                </div>
                {errors.category && <div className="error-message">{errors.category}</div>}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="address">
                  <FontAwesomeIcon icon={faMapMarkerAlt} />
                  Hospital Address (Optional)
                </label>
                <div className="input-container">
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Street, city, etc."
                    className="form-control"
                    disabled={loading}
                  />
                </div>
              </div>
            </>
          )}

          {/* Patient specific fields */}
          {role === 'patient' && (
            <div className="form-group">
              <label className="form-label" htmlFor="proofFile">
                <FontAwesomeIcon icon={faFileUpload} />
                Proof Document (ID/aadhar/election/other - PDF/Image)
              </label>
              <div className={`file-upload-container ${errors.proofFile ? 'error' : ''}`}>
                <input
                  type="file"
                  id="proofFile"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  disabled={loading}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="file-upload-btn"
                  onClick={() => document.getElementById('proofFile').click()}
                  disabled={loading}
                >
                  <FontAwesomeIcon icon={faFileUpload} />
                  {proofFile ? proofFile.name : 'Choose file (PDF/Image)'}
                </button>
              </div>
              {errors.proofFile && <div className="error-message">{errors.proofFile}</div>}
            </div>
          )}

          {/* Terms & Conditions */}
          <div className="form-group terms-group">
            <div className={`terms-checkbox ${errors.terms ? 'error' : ''}`}>
              <input
                type="checkbox"
                id="terms"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                disabled={loading}
              />
              <label htmlFor="terms">
                <FontAwesomeIcon icon={faFileContract} />
                <span>
                  I accept the <a href="#" onClick={(e) => e.preventDefault()}>Terms & Conditions</a> and <a href="#" onClick={(e) => e.preventDefault()}>Privacy Policy</a>
                </span>
              </label>
            </div>
            {errors.terms && <div className="error-message">{errors.terms}</div>}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`auth-btn ${role === 'hm' ? 'hm-btn' : 'patient-btn'}`}
            disabled={loading}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Creating Account...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={role === 'hm' ? faHospitalAlt : faUserInjured} />
                {role === 'hm' ? 'Register Hospital' : 'Create Patient Account'}
              </>
            )}
          </button>
        </form>

        <div className="auth-links">
          <div className="auth-switch-link">
            Already have an account? <a onClick={() => navigate('/login')}>Sign in</a>
          </div>
          <div className="demo-info">
            <p>
              Account and profile data are synced with backend when available and local fallback.
              {role === 'hm' && ' Hospital registrations require admin approval.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;