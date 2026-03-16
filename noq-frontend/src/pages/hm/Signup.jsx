// pages/hm/Signup.jsx - MODIFIED: Removed icons from input fields and error messages
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faHospitalAlt,
  faUserTie,
  faUser,
  faEnvelope,
  faPhone,
  faKey,
  faLock,
  faRobot,
  faUserPlus,
  faEye,
  faEyeSlash,
  faCheck,
  faSpinner,
  faInfoCircle,
  faArrowLeft,
  faBuilding,
  faShieldAlt
} from '@fortawesome/free-solid-svg-icons';

const HmSignup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    hospitalName: '',
    category: '',
    hmName: '',
    dob: '',
    gender: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    captchaInput: '',
    recaptcha: false
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [captcha, setCaptcha] = useState('');
  const [generatedHID, setGeneratedHID] = useState('');

  // Generate CAPTCHA
  React.useEffect(() => {
    setCaptcha([...Array(6)].map(() => 
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 56)]
    ).join(''));
  }, []);

  const categories = ['Government', 'Private'];
  const genders = ['Male', 'Female', 'Other'];

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const refreshCaptcha = () => {
    setCaptcha([...Array(6)].map(() => 
      'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'[Math.floor(Math.random() * 56)]
    ).join(''));
    setFormData({ ...formData, captchaInput: '' });
  };

  const toggleRecaptcha = () => {
    setFormData({ ...formData, recaptcha: !formData.recaptcha });
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.hospitalName.trim()) {
      newErrors.hospitalName = 'Hospital name is required';
    } else if (formData.hospitalName.trim().length < 3) {
      newErrors.hospitalName = 'Hospital name must be at least 3 characters';
    }
    
    if (!formData.category) {
      newErrors.category = 'Please select hospital category';
    }
    
    if (!formData.hmName.trim()) {
      newErrors.hmName = 'Hospital Manager name is required';
    }

    if (!formData.dob) {
      newErrors.dob = 'Date of birth is required';
    }

    if (!formData.gender) {
      newErrors.gender = 'Gender is required';
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    const phoneRegex = /^[0-9]{10}$/;
    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = 'Please enter a valid 10-digit phone number';
    }
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!passwordRegex.test(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.captchaInput) {
      newErrors.captchaInput = 'CAPTCHA is required';
    } else if (formData.captchaInput !== captcha) {
      newErrors.captchaInput = 'CAPTCHA code is incorrect';
    }
    
    if (!formData.recaptcha) {
      newErrors.recaptcha = 'Please verify you are not a robot';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await authService.register({
        role: 'hm',
        fullName: formData.hmName.trim(),
        dob: formData.dob,
        gender: formData.gender.toLowerCase(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        password: formData.password,
        hospitalName: formData.hospitalName.trim(),
        category: formData.category.toLowerCase(),
        address: '',
      });

      setGeneratedHID(result?.user?.hospitalId || result?.hospital?.HID || 'Pending Allocation');
      
      setMessage({
        type: 'success',
        text: `✅ Account request submitted successfully! Your Hospital ID is pending admin approval.`
      });
      
      // Clear form
      setFormData({
        hospitalName: '',
        category: '',
        hmName: '',
        dob: '',
        gender: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        captchaInput: '',
        recaptcha: false
      });
      
      refreshCaptcha();
      
    } catch (error) {
      setMessage({
        type: 'error',
        text: `❌ ${error?.message || 'Registration failed. Please try again.'}`
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
            <div className="auth-logo-text">NOQ Hospital - HM Registration</div>
          </div>
          <p className="auth-tagline">Register as Hospital Manager - Admin approval required</p>
        </div>

        {/* Back to Login Link */}
        <div className="back-link" onClick={() => navigate('/login')}>
          <FontAwesomeIcon icon={faArrowLeft} />
          <span>Back to Login</span>
        </div>

        {/* Success Message */}
        {message && (
          <div className={`auth-message ${message.type === 'success' ? 'success' : 'error'}`}>
            {message.text}
            {generatedHID && (
              <div className="hid-display">
                <FontAwesomeIcon icon={faShieldAlt} />
                <strong>Hospital ID:</strong> {generatedHID}
                <small>Save this ID for future reference</small>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Hospital Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="hospitalName">
              <FontAwesomeIcon icon={faBuilding} />
              Hospital Name
            </label>
            <div className="input-container">
              {/* Left icon removed */}
              <input
                type="text"
                id="hospitalName"
                name="hospitalName"
                value={formData.hospitalName}
                onChange={handleChange}
                placeholder="Enter your hospital name"
                className={`form-control ${errors.hospitalName ? 'error' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.hospitalName && (
              <div className="error-message">
                {/* Error icon removed */}
                {errors.hospitalName}
              </div>
            )}
          </div>

          {/* Hospital Category */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faHospitalAlt} />
              Hospital Category
            </label>
            <div className="category-selector">
              {categories.map(category => (
                <div
                  key={category}
                  className={`category-option ${formData.category === category ? 'active' : ''}`}
                  onClick={() => {
                    if (!loading) {
                      setFormData({ ...formData, category });
                    }
                  }}
                >
                  <div className="category-icon">
                    <FontAwesomeIcon icon={category === 'Government' ? faShieldAlt : faBuilding} />
                  </div>
                  <div className="category-info">
                    <div className="category-name">{category}</div>
                    <div className="category-desc">
                      {category === 'Government' ? 'Government Hospital' : 'Private Hospital'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {errors.category && (
              <div className="error-message">
                {/* Error icon removed */}
                {errors.category}
              </div>
            )}
          </div>

          {/* HM Name */}
          <div className="form-group">
            <label className="form-label" htmlFor="hmName">
              <FontAwesomeIcon icon={faUserTie} />
              Hospital Manager Name
            </label>
            <div className="input-container">
              {/* Left icon removed */}
              <input
                type="text"
                id="hmName"
                name="hmName"
                value={formData.hmName}
                onChange={handleChange}
                placeholder="Enter your full name"
                className={`form-control ${errors.hmName ? 'error' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.hmName && (
              <div className="error-message">
                {/* Error icon removed */}
                {errors.hmName}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="dob">
              <FontAwesomeIcon icon={faCalendar} />
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
              <FontAwesomeIcon icon={faUser} />
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
                <option value="">Select gender</option>
                {genders.map((gender) => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>
            {errors.gender && <div className="error-message">{errors.gender}</div>}
          </div>

          {/* Email */}
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              <FontAwesomeIcon icon={faEnvelope} />
              Email Address
            </label>
            <div className="input-container">
              {/* Left icon removed */}
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="Enter your email address"
                className={`form-control ${errors.email ? 'error' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.email && (
              <div className="error-message">
                {/* Error icon removed */}
                {errors.email}
              </div>
            )}
          </div>

          {/* Phone */}
          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              <FontAwesomeIcon icon={faPhone} />
              Phone Number
            </label>
            <div className="input-container">
              {/* Left icon removed */}
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                maxLength="10"
                placeholder="Enter 10-digit phone number"
                className={`form-control ${errors.phone ? 'error' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.phone && (
              <div className="error-message">
                {/* Error icon removed */}
                {errors.phone}
              </div>
            )}
          </div>

          {/* Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              <FontAwesomeIcon icon={faLock} />
              Password
            </label>
            <div className="input-container">
              {/* Left icon removed */}
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter strong password (min 8 chars with uppercase, lowercase, number, special)"
                className={`form-control ${errors.password ? 'error' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.password && (
              <div className="error-message">
                {/* Error icon removed */}
                {errors.password}
              </div>
            )}
            <div className="password-requirements">
              <FontAwesomeIcon icon={faInfoCircle} />
              <span>Must include: uppercase, lowercase, number, special character (@$!%*?&)</span>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              <FontAwesomeIcon icon={faLock} />
              Confirm Password
            </label>
            <div className="input-container">
              {/* Left icon removed */}
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Confirm your password"
                className={`form-control ${errors.confirmPassword ? 'error' : ''}`}
                disabled={loading}
              />
            </div>
            {errors.confirmPassword && (
              <div className="error-message">
                {/* Error icon removed */}
                {errors.confirmPassword}
              </div>
            )}
          </div>

          {/* CAPTCHA */}
          <div className="form-group">
            <label className="form-label">
              <FontAwesomeIcon icon={faRobot} />
              Security Verification
            </label>
            <div className="captcha-container">
              <div className="captcha-code">{captcha}</div>
              <button
                type="button"
                onClick={refreshCaptcha}
                className="refresh-captcha"
                disabled={loading}
              >
                Refresh
              </button>
            </div>
            <input
              type="text"
              placeholder="Enter CAPTCHA code"
              className={`form-control ${errors.captchaInput ? 'error' : ''}`}
              value={formData.captchaInput}
              onChange={(e) => setFormData({ ...formData, captchaInput: e.target.value })}
              disabled={loading}
            />
            {errors.captchaInput && (
              <div className="error-message">
                {/* Error icon removed */}
                {errors.captchaInput}
              </div>
            )}

            {/* reCAPTCHA */}
            <div 
              className={`recaptcha-box ${loading ? 'disabled' : ''}`}
              onClick={() => !loading && toggleRecaptcha()}
            >
              <div className={`recaptcha-checkbox ${formData.recaptcha ? 'checked' : ''}`}>
                <FontAwesomeIcon icon={faCheck} />
              </div>
              <div className="recaptcha-text">I'm not a robot</div>
            </div>
            {errors.recaptcha && (
              <div className="error-message">
                {/* Error icon removed */}
                {errors.recaptcha}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="auth-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <FontAwesomeIcon icon={faSpinner} spin />
                Processing Registration...
              </>
            ) : (
              <>
                <FontAwesomeIcon icon={faUserPlus} />
                Submit for Admin Approval
              </>
            )}
          </button>
        </form>

        {/* Important Notice */}
        <div className="auth-notice">
          <FontAwesomeIcon icon={faInfoCircle} />
          <div>
            <strong>Important:</strong> Your account requires admin approval. After approval, you'll need to complete hospital profile setup before accessing the system.
          </div>
        </div>

        {/* Login Link */}
        <div className="auth-switch-link">
          Already have an account?
          <a onClick={() => navigate('/login')}>
            Login here
          </a>
        </div>
      </div>
    </div>
  );
};

export default HmSignup;