// pages/Login.jsx - MODIFIED: Terms & Conditions modal with accept button + OTP validation
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faHospitalAlt,
  faUserTie,
  faUserMd,
  faUser,
  faEnvelope,
  faKey,
  faLock,
  faSignInAlt,
  faSpinner,
  faEye,
  faEyeSlash,
  faShieldAlt,
  faMobileAlt,
  faCheckCircle,
  faFileContract,
  faTimes,
  faCheck,
  faExternalLinkAlt,
  faPhone
} from '@fortawesome/free-solid-svg-icons';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { firebaseAuth } from '../../firebase.js';
import { authService } from '../services/authService.js';
import { useAuth } from '../context/FirebaseAuthContext.jsx';

const Login = () => {
  const navigate = useNavigate();
  const { login: contextLogin } = useAuth();
  
  const [role, setRole] = useState('hm');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    hospitalId: '',
    otp: '',
    mobileNumber: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [generatingOTP, setGeneratingOTP] = useState(false);

  const roles = [
    { id: 'hm', icon: faUserTie, label: 'Hospital Manager', color: '#4f46e5' },
    { id: 'doctor', icon: faUserMd, label: 'Doctor', color: '#3b82f6' },
    { id: 'patient', icon: faUser, label: 'Patient', color: '#10b981' },
    { id: 'admin', icon: faShieldAlt, label: 'Admin', color: '#dc2626' }
  ];


  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validateMobileNumber = (mobile) => {
    return /^[0-9]{10,15}$/.test(mobile.replace(/[\s+\-()]/g, ''));
  };

  const generateOTP = () => {
    if (!formData.email.trim()) {
      setErrors(prev => ({ ...prev, email: 'Email is required to send OTP' }));
      return;
    }
    
    if (!validateEmail(formData.email)) {
      setErrors(prev => ({ ...prev, email: 'Please enter a valid email address' }));
      return;
    }

    if (formData.mobileNumber && !validateMobileNumber(formData.mobileNumber)) {
      setErrors(prev => ({ ...prev, mobileNumber: 'Please enter a valid mobile number' }));
      return;
    }

    setGeneratingOTP(true);
    
    setTimeout(() => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      setGeneratedOTP(otp);
      setFormData(prev => ({ ...prev, otp: otp }));
      setGeneratingOTP(false);
      
      let message = `OTP has been sent to ${formData.email}`;
      if (formData.mobileNumber) {
        message += ` and mobile number ${formData.mobileNumber}`;
      }
      message += `.\n\nYour OTP is: ${otp}\n(This would be sent via SMS/Email in real application)`;
      
      alert(message);
    }, 1500);
  };

  const handleOpenTermsModal = () => {
    setShowTermsModal(true);
  };

  const handleAcceptTerms = () => {
    setTermsAccepted(true);
    setShowTermsModal(false);
  };

  const handleDeclineTerms = () => {
    setTermsAccepted(false);
    setShowTermsModal(false);
  };


  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    if (role === 'patient') {
      if (formData.mobileNumber && !validateMobileNumber(formData.mobileNumber)) {
        newErrors.mobileNumber = 'Please enter a valid 10-15 digit mobile number';
      }
      
      if (!formData.otp) {
        newErrors.otp = 'OTP is required';
      } else if (formData.otp.length !== 6) {
        newErrors.otp = 'OTP must be 6 digits';
      } else if (!/^\d+$/.test(formData.otp)) {
        newErrors.otp = 'OTP must contain only numbers';
      }
      
      if (!termsAccepted) {
        newErrors.terms = 'You must accept Terms & Conditions';
      }
    } else {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 6) {
        newErrors.password = 'Password must be at least 6 characters';
      }
    }
    
    if (role === 'doctor' && !formData.hospitalId.trim()) {
      newErrors.hospitalId = 'Hospital ID is required for doctors';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAdminLogin = async () => {
    try {
      const result = await authService.login({
        role: 'admin',
        email: formData.email,
        password: formData.password,
      });
      const ok = await contextLogin(result?.user, result?.token);
      if (!ok) throw new Error('Session initialization failed. Please try again.');
      return true;
    } catch (error) {
      alert(error?.message || 'Admin login failed.');
      return false;
    }
  };

  const handleDoctorLogin = async () => {
    try {
      const result = await authService.login({
        role: 'doctor',
        email: formData.email,
        password: formData.password,
        hospitalId: formData.hospitalId,
      });
      const ok = await contextLogin(result?.user, result?.token);
      if (!ok) throw new Error('Session initialization failed. Please try again.');
      sessionStorage.setItem('doctorLoginTime', new Date().toISOString());
      return true;
    } catch (primaryError) {
      let firebaseIdToken = null;
      try {
        const firebaseUser = await signInWithEmailAndPassword(firebaseAuth, formData.email, formData.password);
        firebaseIdToken = await firebaseUser.user.getIdToken();
      } catch {
        firebaseIdToken = null;
      }

      if (!firebaseIdToken) {
        alert(primaryError?.message || 'Doctor login failed.');
        return false;
      }

      try {
        const result = await authService.login({
          role: 'doctor',
          email: formData.email,
          password: formData.password,
          hospitalId: formData.hospitalId,
          firebaseIdToken,
        });
        const ok = await contextLogin(result?.user, result?.token);
        if (!ok) throw new Error('Session initialization failed. Please try again.');
        sessionStorage.setItem('doctorLoginTime', new Date().toISOString());
        return true;
      } catch (firebaseError) {
        alert(firebaseError?.message || primaryError?.message || 'Doctor login failed.');
        return false;
      }
    }
  };

  const handleHmLogin = async () => {
    try {
      const result = await authService.login({
        role: 'hm',
        email: formData.email,
        password: formData.password,
      });
      const ok = await contextLogin(result?.user, result?.token);
      if (!ok) throw new Error('Session initialization failed. Please try again.');
      return true;
    } catch (primaryError) {
      let firebaseIdToken = null;
      try {
        const firebaseUser = await signInWithEmailAndPassword(firebaseAuth, formData.email, formData.password);
        firebaseIdToken = await firebaseUser.user.getIdToken();
      } catch {
        firebaseIdToken = null;
      }

      if (!firebaseIdToken) {
        alert(primaryError?.message || 'HM login failed.');
        return false;
      }

      try {
        const result = await authService.login({ role: 'hm', email: formData.email, password: formData.password, firebaseIdToken });
        const ok = await contextLogin(result?.user, result?.token);
        if (!ok) throw new Error('Session initialization failed. Please try again.');
        return true;
      } catch (firebaseError) {
        alert(firebaseError?.message || primaryError?.message || 'HM login failed.');
        return false;
      }
    }
  };

  const handlePatientLogin = async () => {
    try {
      const result = await authService.login({
        role: 'patient',
        email: formData.email,
        otp: formData.otp,
        _generatedOtp: generatedOTP,
      });
      const ok = await contextLogin(result?.user, result?.token);
      if (!ok) throw new Error('Session initialization failed. Please try again.');
      return true;
    } catch (error) {
      alert(error?.message || 'Patient login failed.');
      return false;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    setTimeout(async () => {
      let loginSuccess = false;
      
      if (role === 'admin') {
        loginSuccess = await handleAdminLogin();
        if (loginSuccess) {
          navigate('/admin/dashboard');
        }
      } 
      else if (role === 'doctor') {
        loginSuccess = await handleDoctorLogin();
        if (loginSuccess) {
          navigate('/doctor/dashboard');
        }
      }
      else if (role === 'hm') {
        loginSuccess = await handleHmLogin();
        if (loginSuccess) {
          navigate('/hm/management');
        }
      }
      else if (role === 'patient') {
        loginSuccess = await handlePatientLogin();
        if (loginSuccess) {
          navigate('/patient/dashboard');
        }
      }
      
      if (!loginSuccess) {
        setLoading(false);
        return;
      }
      
      setLoading(false);
    }, 1000);
  };

  const showHospitalIdField = role === 'doctor';
  const isPatient = role === 'patient';

  return (
    <>
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <div className="auth-logo">
              <div className="auth-logo-icon">
                <FontAwesomeIcon icon={faHospitalAlt} />
              </div>
              <div className="auth-logo-text">NOQ Hospital</div>
            </div>
            <p className="auth-tagline">Secure Login to Healthcare System</p>
          </div>

          <div className="form-group">
            <div className="form-label">
              <FontAwesomeIcon icon={faUserTie} />
              Select Your Role
            </div>
            <div className="role-selector">
              {roles.map(r => (
                <div
                  key={r.id}
                  className={`role-option ${role === r.id ? 'active' : ''}`}
                  onClick={() => {
                    setRole(r.id);
                    setFormData({
                      email: '',
                      password: '',
                      hospitalId: '',
                      otp: '',
                      mobileNumber: ''
                    });
                    setTermsAccepted(false);
                  }}
                  style={{ borderColor: r.color }}
                >
                  <FontAwesomeIcon icon={r.icon} className="role-icon" style={{ color: r.color }} />
                  <span className="role-name">{r.label}</span>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="email">
                <FontAwesomeIcon icon={faEnvelope} />
                {role === 'admin' ? 'Admin Email' : 'Email Address'}
              </label>
              <div className="input-container">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder={role === 'admin' ? 'admin@sunigmail.com' : 'Enter your email address'}
                  className={`form-control ${errors.email ? 'error' : ''}`}
                  disabled={loading}
                  required
                />
              </div>
              {errors.email && (
                <div className="error-message">
                  <FontAwesomeIcon icon={faKey} />
                  {errors.email}
                </div>
              )}
            </div>

            {isPatient ? (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="mobileNumber">
                    <FontAwesomeIcon icon={faPhone} />
                    Mobile Number (Optional but Recommended)
                  </label>
                  <div className="input-container">
                    <input
                      type="tel"
                      id="mobileNumber"
                      name="mobileNumber"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      placeholder="Enter your mobile number (e.g., +1234567890)"
                      className={`form-control ${errors.mobileNumber ? 'error' : ''}`}
                      disabled={loading}
                    />
                  </div>
                  {errors.mobileNumber && (
                    <div className="error-message">
                      <FontAwesomeIcon icon={faKey} />
                      {errors.mobileNumber}
                    </div>
                  )}
                  <div className="input-hint">
                    <small>OTP will be sent to your email and mobile if provided</small>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="otp">
                    <FontAwesomeIcon icon={faMobileAlt} />
                    OTP (One-Time Password)
                  </label>
                  <div className="input-with-button">
                    <div className="input-container">
                      <input
                        type="text"
                        id="otp"
                        name="otp"
                        value={formData.otp}
                        onChange={handleChange}
                        placeholder="Enter 6-digit OTP"
                        maxLength="6"
                        className={`form-control ${errors.otp ? 'error' : ''}`}
                        disabled={loading}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={generateOTP}
                      className="otp-generate-btn"
                      disabled={loading || generatingOTP}
                    >
                      {generatingOTP ? (
                        <>
                          <FontAwesomeIcon icon={faSpinner} spin />
                          Sending...
                        </>
                      ) : (
                        <>
                          <FontAwesomeIcon icon={faMobileAlt} />
                          Send OTP
                        </>
                      )}
                    </button>
                  </div>
                  {errors.otp && (
                    <div className="error-message">
                      <FontAwesomeIcon icon={faKey} />
                      {errors.otp}
                    </div>
                  )}
                  <div className="otp-note">
                    <small>Enter your email (and mobile if available) above, then click "Send OTP"</small>
                  </div>
                </div>

                <div className="form-group terms-group">
                  <div className={`terms-checkbox ${errors.terms ? 'error' : ''}`}>
                    <input
                      type="checkbox"
                      id="terms"
                      checked={termsAccepted}
                      onChange={(e) => {
                        if (!e.target.checked) {
                          setTermsAccepted(false);
                        } else {
                          handleOpenTermsModal();
                        }
                      }}
                      disabled={loading}
                    />
                    <label htmlFor="terms">
                      <FontAwesomeIcon icon={faFileContract} />
                      <span onClick={handleOpenTermsModal} style={{ cursor: 'pointer', textDecoration: 'underline' }}>
                        I accept the Terms & Conditions and Privacy Policy
                      </span>
                      {termsAccepted && (
                        <span className="terms-accepted-badge">
                          <FontAwesomeIcon icon={faCheck} /> Accepted
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="terms-links">
                    <small>
                      <a onClick={handleOpenTermsModal} style={{ cursor: 'pointer', color: '#3b82f6' }}>
                        <FontAwesomeIcon icon={faExternalLinkAlt} /> View Terms & Conditions
                      </a>
                    </small>
                  </div>
                  {errors.terms && (
                    <div className="error-message">
                      <FontAwesomeIcon icon={faKey} />
                      {errors.terms}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="password">
                  <FontAwesomeIcon icon={faLock} />
                  {role === 'admin' ? 'Admin Password' : 'Password'}
                </label>
                <div className="input-container">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    placeholder={role === 'admin' ? 'AdminSuni@484#' : 'Enter your password'}
                    className={`form-control ${errors.password ? 'error' : ''}`}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="password-toggle"
                    disabled={loading}
                  >
                    <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                  </button>
                </div>
                {errors.password && (
                  <div className="error-message">
                    <FontAwesomeIcon icon={faKey} />
                    {errors.password}
                  </div>
                )}
              </div>
            )}

            {showHospitalIdField && (
              <div className="form-group">
                <label className="form-label" htmlFor="hospitalId">
                  <FontAwesomeIcon icon={faHospitalAlt} />
                  Hospital ID
                </label>
                <div className="input-container">
                  <input
                    type="text"
                    id="hospitalId"
                    name="hospitalId"
                    value={formData.hospitalId}
                    onChange={handleChange}
                    placeholder="Enter Hospital ID (e.g., NOQ-PRI-12345)"
                    className={`form-control ${errors.hospitalId ? 'error' : ''}`}
                    disabled={loading}
                  />
                </div>
                {errors.hospitalId && (
                  <div className="error-message">
                    <FontAwesomeIcon icon={faKey} />
                    {errors.hospitalId}
                  </div>
                )}
              </div>
            )}

            {role === 'admin' && (
              <div className="admin-security-note">
                <FontAwesomeIcon icon={faShieldAlt} />
                <span>Secure Admin Portal - Restricted Access</span>
              </div>
            )}

            <button
              type="submit"
              className={`auth-btn ${role === 'admin' ? 'admin-btn' : ''} ${isPatient ? 'patient-btn' : ''}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} spin />
                  {role === 'admin' ? 'Signing in...' : 'Logging in...'}
                </>
              ) : (
                <>
                  <FontAwesomeIcon icon={role === 'admin' ? faShieldAlt : (isPatient ? faMobileAlt : faSignInAlt)} />
                  {role === 'admin' ? 'Sign In to Admin Portal' : `Login as ${roles.find(r => r.id === role)?.label}`}
                </>
              )}
            </button>
          </form>

          {role === 'doctor' && (
            <div className="doctor-login-note">
              <FontAwesomeIcon icon={faUserMd} />
              <div>
                <strong>Doctor Login Note:</strong>
                <p>Enter your registered email, password, and hospital ID.</p>
              </div>
            </div>
          )}

          {isPatient && (
            <div className="patient-login-note">
              <FontAwesomeIcon icon={faCheckCircle} />
              <div>
                <strong>Patient Login Note:</strong>
                <p>• Enter your email (required) and mobile number (optional)</p>
                <p>• Click "Send OTP" to receive OTP</p>
                <p>• Click "View Terms & Conditions" to read and accept</p>
              </div>
            </div>
          )}

          <div className="auth-links">
            {role !== 'admin' && (
              <div className="auth-switch-link">
                Don't have an account?
                <a onClick={() => navigate('/signup')}>
                  Sign up here
                </a>
              </div>
            )}
            
            <div className="demo-info">
              <p>
                Account and profile data are synced with backend when available and local storage fallback.
              </p>
            </div>
          </div>
        </div>
      </div>

      {showTermsModal && (
        <div className="terms-modal-overlay">
          <div className="terms-modal">
            <div className="terms-modal-header">
              <h3>
                <FontAwesomeIcon icon={faFileContract} />
                Terms & Conditions and Privacy Policy
              </h3>
              <button 
                className="terms-modal-close" 
                onClick={() => setShowTermsModal(false)}
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            
            <div className="terms-modal-content">
              <div className="terms-section">
                <h4>1. Acceptance of Terms</h4>
                <p>
                  By using NOQ Hospital's healthcare services, you agree to comply with and be bound by 
                  these terms and conditions. If you do not agree with any part of these terms, you must 
                  not use our services.
                </p>
              </div>
              
              <div className="terms-section">
                <h4>2. Medical Services</h4>
                <p>
                  Our platform provides medical consultation services. However, this does not replace 
                  emergency medical care. In case of emergencies, please contact your local emergency 
                  services immediately.
                </p>
              </div>
              
              <div className="terms-section">
                <h4>3. Patient Data Privacy</h4>
                <p>
                  We collect and store your medical information to provide healthcare services. Your data 
                  is protected under HIPAA regulations and will only be shared with your healthcare providers 
                  for treatment purposes.
                </p>
              </div>
              
              <div className="terms-section">
                <h4>4. Consent for Treatment</h4>
                <p>
                  By accepting these terms, you provide informed consent for medical treatment through 
                  our platform and understand the risks and benefits associated with telemedicine services.
                </p>
              </div>
              
              <div className="terms-section">
                <h4>5. Data Collection</h4>
                <p>
                  We collect: Medical history, contact information, treatment records, payment details, 
                  and usage data to improve our services.
                </p>
              </div>
              
              <div className="terms-section">
                <h4>6. Data Usage</h4>
                <p>
                  Your data is used for: Providing medical care, processing payments, improving services, 
                  and legal compliance. We do not sell your personal data to third parties.
                </p>
              </div>
              
              <div className="terms-section">
                <h4>7. Security Measures</h4>
                <p>
                  We implement industry-standard security measures including encryption, access controls, 
                  and regular security audits to protect your data.
                </p>
              </div>
              
              <div className="terms-section">
                <h4>8. Your Rights</h4>
                <p>
                  You have the right to: Access your medical records, request corrections, withdraw consent, 
                  and request data deletion (where applicable by law).
                </p>
              </div>
            </div>
            
            <div className="terms-modal-footer">
              <div className="terms-checkbox-confirm">
                <input
                  type="checkbox"
                  id="modal-terms"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                />
                <label htmlFor="modal-terms">
                  I have read and understood the Terms & Conditions and Privacy Policy
                </label>
              </div>
              
              <div className="terms-modal-actions">
                <button 
                  className="terms-decline-btn" 
                  onClick={handleDeclineTerms}
                >
                  <FontAwesomeIcon icon={faTimes} /> Decline
                </button>
                <button 
                  className="terms-accept-btn" 
                  onClick={handleAcceptTerms}
                  disabled={!termsAccepted}
                >
                  <FontAwesomeIcon icon={faCheck} /> Accept Terms
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Login;
