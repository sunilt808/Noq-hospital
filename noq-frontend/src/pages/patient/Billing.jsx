// pages/PatientBilling.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faMoneyBill,
  faCreditCard,
  faReceipt,
  faDownload,
  faPrint,
  faHistory,
  faClock,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faQrcode,
  faWallet,
  faUniversity,
  faMobileAlt,
  faShieldAlt,
  faCalendarAlt,
  faFileInvoice,
  faFilePdf,
  faFileExcel,
  faShare,
  faCopy,
  faFilter,
  faSearch,
  faSort,
  faSortUp,
  faSortDown,
  faPlus,
  faTrash,
  faEdit,
  faEye,
  faCalendarCheck,
  faHospital,
  faUserMd,
  faPills,
  faSyringe,
  faBed,
  faAmbulance,
  faSpinner,
  faChevronRight,
  faChevronDown,
  faInfoCircle,
  faCalendarTimes,
  faCalendarDay,
  faCalendarWeek,
  faCalendar,
  faPercentage,
  faIndianRupeeSign
} from '@fortawesome/free-solid-svg-icons';
import './patient.css';

const PatientBilling = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedBill, setSelectedBill] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiId, setUpiId] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', expiry: '', cvv: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [filterDate, setFilterDate] = useState('');
  const [totalPending, setTotalPending] = useState(0);
  const [totalPaid, setTotalPaid] = useState(0);

  // Load bills from API
  useEffect(() => {
    if (authLoading) return;
    
    if (!currentUser || currentUser.role !== 'patient') {
      navigate('/login', { replace: true });
      return;
    }

    const loadBills = async () => {
      try {
        setLoading(true);
        const data = await patientService.getBillingHistory();
        const normalized = Array.isArray(data) ? data.map((bill) => ({
          id: bill.id,
          appointmentId: bill.appointment_id,
          amount: Number(bill.amount || 0),
          status: String(bill.status || 'pending').toLowerCase(),
          createdAt: bill.created_at || new Date().toISOString(),
          hospitalName: bill.hospital_name || bill.hospitalName || 'Hospital',
          doctorName: bill.doctor_name || bill.doctorName || 'Doctor',
          description: bill.description || '',
          dueDate: bill.due_date || bill.dueDate
        })) : [];

        setBills(normalized.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        
        const pending = normalized.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
        const paid = normalized.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
        setTotalPending(pending);
        setTotalPaid(paid);
      } catch (error) {
        console.error('Error loading bills:', error);
        setBills([]);
      } finally {
        setLoading(false);
      }
    };

    loadBills();
  }, [authLoading, currentUser, navigate]);
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Check authentication
  useEffect(() => {
    if (!authLoading && currentUser && String(currentUser.role || '').toLowerCase() !== 'patient') {
      navigate('/login', { replace: true });
      return;
    }
  }, [authLoading, currentUser, navigate]);

  useEffect(() => {
    if (!currentUser) return;
    const patientData =
      allPatients.find((p) => String(p.id || '') === String(currentUser.id || '')) ||
      allPatients.find((p) => p.email?.toLowerCase() === currentUser.email?.toLowerCase());

    if (patientData) {
      setPatient(patientData);
      loadBillingData(patientData.id);
    }
  }, [currentUser, allPatients, allBills]);

  useEffect(() => {
    if (patient?.id) {
      loadBillingData(patient.id);
    }
  }, [patient?.id, allBills]);

  // Load billing data
  const loadBillingData = (patientId) => {
    setLoading(true);

    setTimeout(() => {
      const patientBills = (allBills || []).filter(bill => String(bill.patientId || '') === String(patientId));
      const billsForPatient = patientBills;
      
      // Calculate totals
      const pendingTotal = billsForPatient
        .filter(bill => bill.status === 'pending')
        .reduce((sum, bill) => sum + Number(bill.total || 0), 0);
      
      const paidTotal = billsForPatient
        .filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + Number(bill.total || 0), 0);
      
      setBills(billsForPatient);
      setTotalPending(pendingTotal);
      setTotalPaid(paidTotal);
      setFilteredBills(filterBills(billsForPatient, activeTab));
      setPaymentMethods(JSON.parse(sessionStorage.getItem('paymentMethods') || '[]'));
      setLoading(false);
    }, 500);
  };

  // Filter bills based on active tab
  const filterBills = (billsList, tab) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    let filtered = billsList;
    
    switch(tab) {
      case 'pending':
        filtered = billsList.filter(bill => bill.status === 'pending');
        break;
      case 'overdue':
        filtered = billsList.filter(bill => bill.status === 'overdue');
        break;
      case 'paid':
        filtered = billsList.filter(bill => bill.status === 'paid');
        break;
      case 'upcoming':
        filtered = billsList.filter(bill => bill.status === 'upcoming');
        break;
      case 'all':
      default:
        filtered = billsList;
    }
    
    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(bill => 
        bill.billNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.hospital.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bill.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    // Apply date filter
    if (filterDate) {
      filtered = filtered.filter(bill => bill.date === filterDate);
    }
    
    // Apply sorting
    filtered = sortBills(filtered, sortBy, sortOrder);
    
    return filtered;
  };

  // Sort bills
  const sortBills = (billsList, sortBy, order) => {
    const sorted = [...billsList];
    
    sorted.sort((a, b) => {
      let aValue, bValue;
      
      switch(sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'dueDate':
          aValue = new Date(a.dueDate);
          bValue = new Date(b.dueDate);
          break;
        case 'amount':
          aValue = a.total;
          bValue = b.total;
          break;
        case 'hospital':
          aValue = a.hospital;
          bValue = b.hospital;
          break;
        default:
          aValue = new Date(a.date);
          bValue = new Date(b.date);
      }
      
      if (order === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });
    
    return sorted;
  };

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setFilteredBills(filterBills(bills, tab));
  };

  // Handle search
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setFilteredBills(filterBills(bills, activeTab));
  };

  // Handle sort
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setFilteredBills(filterBills(bills, activeTab));
  };

  // Handle date filter
  const handleDateFilter = (date) => {
    setFilterDate(date);
    setFilteredBills(filterBills(bills, activeTab));
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterDate('');
    setSortBy('date');
    setSortOrder('desc');
    setFilteredBills(filterBills(bills, activeTab));
  };

  // Get status color
  const getStatusColor = (status) => {
    switch(status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'overdue': return '#ef4444';
      case 'upcoming': return '#3b82f6';
      default: return '#64748b';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch(status) {
      case 'paid': return faCheckCircle;
      case 'pending': return faClock;
      case 'overdue': return faExclamationTriangle;
      case 'upcoming': return faCalendarAlt;
      default: return faMoneyBill;
    }
  };

  // Get category icon
  const getCategoryIcon = (category) => {
    switch(category) {
      case 'Consultation': return faUserMd;
      case 'Diagnostics': return faSyringe;
      case 'Pharmacy': return faPills;
      case 'Hospitalization': return faBed;
      case 'Therapy': return faHospital;
      default: return faReceipt;
    }
  };

  // Get payment method icon
  const getPaymentMethodIcon = (method) => {
    switch(method) {
      case 'upi': return faMobileAlt;
      case 'card': return faCreditCard;
      case 'netbanking': return faUniversity;
      case 'wallet': return faWallet;
      case 'insurance': return faShieldAlt;
      default: return faMoneyBill;
    }
  };

  // Pay bill
  const payBill = (billId) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;
    
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  // Process payment
  const processPayment = async () => {
    if (!selectedBill) return;
    
    setLoading(true);
    
    setTimeout(async () => {
      const updatedBills = bills.map(bill => {
        if (bill.id === selectedBill.id) {
          return {
            ...bill,
            status: 'paid',
            paymentMethod,
            paidDate: new Date().toISOString().split('T')[0]
          };
        }
        return bill;
      });

      const updatedBill = updatedBills.find((bill) => String(bill.id) === String(selectedBill.id));
      if (updatedBill) {
        await apiDbService.upsert('bills', selectedBill.id, updatedBill);
      }
      
      // Update totals
      const pendingTotal = updatedBills
        .filter(bill => bill.status === 'pending')
        .reduce((sum, bill) => sum + bill.total, 0);
      
      const paidTotal = updatedBills
        .filter(bill => bill.status === 'paid')
        .reduce((sum, bill) => sum + bill.total, 0);
      
      setBills(updatedBills);
      setTotalPending(pendingTotal);
      setTotalPaid(paidTotal);
      setFilteredBills(filterBills(updatedBills, activeTab));

      recordHistory({
        module: 'billing',
        action: 'bill-paid',
        message: `Bill ${selectedBill.billNumber || selectedBill.id} paid via ${paymentMethod}`,
        patientId: String(selectedBill.patientId || patient?.id || ''),
        doctorId: String(selectedBill.doctorId || ''),
        hospitalId: String(selectedBill.hospitalId || ''),
        appointmentId: String(selectedBill.appointmentId || ''),
        meta: {
          amount: Number(selectedBill.total || selectedBill.amount || 0),
          method: paymentMethod,
        },
      });
      
      setShowPaymentModal(false);
      setSelectedBill(null);
      setPaymentMethod('upi');
      setUpiId('');
      setCardDetails({ number: '', expiry: '', cvv: '' });
      setLoading(false);
      
      alert('Payment successful! Receipt has been sent to your email.');
    }, 1500);
  };

  // Download invoice
  const downloadInvoice = (bill) => {
    const content = `
      MEDICAL BILL INVOICE
      ====================
      
      Invoice Number: ${bill.billNumber}
      Date: ${bill.date}
      Due Date: ${bill.dueDate}
      
      PATIENT DETAILS
      ---------------
      Name: ${patient?.name}
      Patient ID: ${patient?.id || 'N/A'}
      
      HOSPITAL DETAILS
      ----------------
      Hospital: ${bill.hospital}
      Description: ${bill.description}
      
      BILL DETAILS
      ------------
      ${bill.items.map(item => `${item.name}: ₹${item.amount}`).join('\n')}
      
      SUMMARY
      -------
      Subtotal: ₹${bill.amount}
      Tax: ₹${bill.tax}
      Discount: ₹${bill.discount}
      Total: ₹${bill.total}
      
      Payment Status: ${bill.status.toUpperCase()}
      ${bill.paidDate ? `Paid Date: ${bill.paidDate}` : ''}
      ${bill.paymentMethod ? `Payment Method: ${bill.paymentMethod.toUpperCase()}` : ''}
      
      Thank you for choosing our services!
      ------------------------------------
      This is a computer-generated invoice.
    `;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${bill.billNumber}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // View invoice
  const viewInvoice = (bill) => {
    setSelectedBill(bill);
    setShowInvoiceModal(true);
  };

  // Add payment method
  const addPaymentMethod = () => {
    if (!upiId.trim() && paymentMethod === 'upi') {
      alert('Please enter UPI ID');
      return;
    }
    
    if (paymentMethod === 'card' && (!cardDetails.number || !cardDetails.expiry || !cardDetails.cvv)) {
      alert('Please fill all card details');
      return;
    }
    
    const newMethod = {
      id: paymentMethods.length + 1,
      type: paymentMethod,
      name: paymentMethod === 'upi' ? 'UPI' : 
            paymentMethod === 'card' ? 'Credit Card' :
            paymentMethod === 'netbanking' ? 'Net Banking' : 'Wallet',
      isDefault: false
    };
    
    if (paymentMethod === 'upi') {
      newMethod.upiId = upiId;
    }
    
    if (paymentMethod === 'card') {
      newMethod.lastFour = cardDetails.number.slice(-4);
      newMethod.expiry = cardDetails.expiry;
    }
    
    setPaymentMethods([...paymentMethods, newMethod]);
    setShowAddPaymentMethod(false);
    setUpiId('');
    setCardDetails({ number: '', expiry: '', cvv: '' });
    alert('Payment method added successfully!');
  };

  // Set default payment method
  const setDefaultPaymentMethod = (methodId) => {
    const updatedMethods = paymentMethods.map(method => ({
      ...method,
      isDefault: method.id === methodId
    }));
    setPaymentMethods(updatedMethods);
  };

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Check if bill is overdue
  const isOverdue = (dueDate) => {
    const today = new Date();
    const due = new Date(dueDate);
    return due < today;
  };

  if (!patient) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading billing information...</p>
      </div>
    );
  }

  return (
    <div className="patient-billing-page">
      {/* Header */}
      <header className="billing-header">
        <button className="back-btn" onClick={() => navigate('/patient/dashboard')}>
          <FontAwesomeIcon icon={faArrowLeft} />
          Back to Dashboard
        </button>
        <h2><FontAwesomeIcon icon={faMoneyBill} /> Billing & Payments</h2>
        <div className="patient-info">
          <span>{patient.name}</span>
          <span className="total-pending">
            Total Due: ₹{totalPending}
          </span>
        </div>
      </header>

      {/* Financial Summary */}
      <div className="financial-summary">
        <div className="summary-card pending">
          <div className="summary-icon">
            <FontAwesomeIcon icon={faClock} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Pending Bills</span>
            <span className="summary-amount">₹{totalPending}</span>
            <span className="summary-count">
              {bills.filter(b => b.status === 'pending').length} bills
            </span>
          </div>
        </div>
        
        <div className="summary-card paid">
          <div className="summary-icon">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Total Paid</span>
            <span className="summary-amount">₹{totalPaid}</span>
            <span className="summary-count">
              {bills.filter(b => b.status === 'paid').length} bills
            </span>
          </div>
        </div>
        
        <div className="summary-card overdue">
          <div className="summary-icon">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Overdue</span>
            <span className="summary-amount">
              ₹{bills.filter(b => b.status === 'overdue').reduce((sum, b) => sum + b.total, 0)}
            </span>
            <span className="summary-count">
              {bills.filter(b => b.status === 'overdue').length} bills
            </span>
          </div>
        </div>
        
        <div className="summary-card upcoming">
          <div className="summary-icon">
            <FontAwesomeIcon icon={faCalendarAlt} />
          </div>
          <div className="summary-content">
            <span className="summary-label">Upcoming</span>
            <span className="summary-amount">
              ₹{bills.filter(b => b.status === 'upcoming').reduce((sum, b) => sum + b.total, 0)}
            </span>
            <span className="summary-count">
              {bills.filter(b => b.status === 'upcoming').length} bills
            </span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="billing-main">
        <div className="billing-left">
          {/* Filters and Controls */}
          <div className="billing-controls">
            <div className="search-sort-section">
              <div className="search-box">
                <FontAwesomeIcon icon={faSearch} />
                <input
                  type="text"
                  placeholder="Search bills by number, hospital, description..."
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
              
              <div className="sort-controls">
                <div className="date-filter">
                  <FontAwesomeIcon icon={faCalendarDay} />
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => handleDateFilter(e.target.value)}
                  />
                  {filterDate && (
                    <button className="clear-btn" onClick={() => handleDateFilter('')}>
                      Clear
                    </button>
                  )}
                </div>
                
                <div className="sort-dropdown">
                  <span>Sort by:</span>
                  <select value={sortBy} onChange={(e) => handleSort(e.target.value)}>
                    <option value="date">Date</option>
                    <option value="dueDate">Due Date</option>
                    <option value="amount">Amount</option>
                    <option value="hospital">Hospital</option>
                  </select>
                  <button 
                    className="sort-order-btn"
                    onClick={() => handleSort(sortBy)}
                  >
                    <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} />
                  </button>
                </div>
                
                {(searchQuery || filterDate) && (
                  <button className="clear-filters-btn" onClick={clearFilters}>
                    Clear Filters
                  </button>
                )}
              </div>
            </div>
            
            <div className="billing-tabs">
              <button 
                className={`billing-tab ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => handleTabChange('all')}
              >
                All Bills ({bills.length})
              </button>
              <button 
                className={`billing-tab ${activeTab === 'pending' ? 'active' : ''}`}
                onClick={() => handleTabChange('pending')}
              >
                Pending ({bills.filter(b => b.status === 'pending').length})
              </button>
              <button 
                className={`billing-tab ${activeTab === 'overdue' ? 'active' : ''}`}
                onClick={() => handleTabChange('overdue')}
              >
                Overdue ({bills.filter(b => b.status === 'overdue').length})
              </button>
              <button 
                className={`billing-tab ${activeTab === 'paid' ? 'active' : ''}`}
                onClick={() => handleTabChange('paid')}
              >
                Paid ({bills.filter(b => b.status === 'paid').length})
              </button>
              <button 
                className={`billing-tab ${activeTab === 'upcoming' ? 'active' : ''}`}
                onClick={() => handleTabChange('upcoming')}
              >
                Upcoming ({bills.filter(b => b.status === 'upcoming').length})
              </button>
            </div>
          </div>

          {/* Bills List */}
          <div className="bills-list">
            {loading ? (
              <div className="loading-bills">
                <div className="loading-spinner"></div>
                <p>Loading bills...</p>
              </div>
            ) : filteredBills.length === 0 ? (
              <div className="no-bills">
                <FontAwesomeIcon icon={faReceipt} size="3x" />
                <h3>No bills found</h3>
                <p>You don't have any {activeTab} bills.</p>
                {activeTab === 'pending' && totalPending > 0 && (
                  <button className="btn-primary" onClick={() => handleTabChange('all')}>
                    View All Bills
                  </button>
                )}
              </div>
            ) : (
              <div className="bills-container">
                {filteredBills.map(bill => {
                  const isBillOverdue = bill.status === 'pending' && isOverdue(bill.dueDate);
                  
                  return (
                    <div key={bill.id} className="bill-card">
                      <div className="bill-card-header">
                        <div className="bill-info">
                          <div className="bill-number">
                            <FontAwesomeIcon icon={faReceipt} />
                            <span>{bill.billNumber}</span>
                          </div>
                          <div className="bill-category">
                            <FontAwesomeIcon icon={getCategoryIcon(bill.category)} />
                            <span>{bill.category}</span>
                          </div>
                        </div>
                        
                        <div className="bill-status">
                          <span 
                            className={`status-badge ${bill.status} ${isBillOverdue ? 'overdue' : ''}`}
                            style={{ backgroundColor: getStatusColor(bill.status) }}
                          >
                            <FontAwesomeIcon icon={getStatusIcon(bill.status)} />
                            {isBillOverdue ? 'OVERDUE' : bill.status.toUpperCase()}
                          </span>
                        </div>
                      </div>
                      
                      <div className="bill-card-body">
                        <div className="bill-details">
                          <h4 className="bill-description">{bill.description}</h4>
                          <div className="bill-meta">
                            <span className="hospital">
                              <FontAwesomeIcon icon={faHospital} />
                              {bill.hospital}
                            </span>
                            <span className="date">
                              <FontAwesomeIcon icon={faCalendarDay} />
                              {formatDate(bill.date)}
                            </span>
                            <span className={`due-date ${isBillOverdue ? 'overdue' : ''}`}>
                              <FontAwesomeIcon icon={faCalendarTimes} />
                              Due: {formatDate(bill.dueDate)}
                            </span>
                          </div>
                          
                          <div className="bill-amount">
                            <div className="amount-details">
                              <span>Amount: <strong>₹{bill.amount}</strong></span>
                              {bill.tax > 0 && <span>Tax: ₹{bill.tax}</span>}
                              {bill.discount > 0 && <span>Discount: -₹{bill.discount}</span>}
                            </div>
                            <div className="total-amount">
                              <span>Total:</span>
                              <span className="total">₹{bill.total}</span>
                            </div>
                          </div>
                          
                          {bill.paymentMethod && (
                            <div className="payment-method-info">
                              <FontAwesomeIcon icon={getPaymentMethodIcon(bill.paymentMethod)} />
                              <span>Paid via {bill.paymentMethod.toUpperCase()}</span>
                              {bill.paidDate && <span>on {formatDate(bill.paidDate)}</span>}
                            </div>
                          )}
                        </div>
                        
                        <div className="bill-actions">
                          {bill.status === 'pending' || bill.status === 'overdue' ? (
                            <>
                              <button 
                                className="action-btn pay-btn"
                                onClick={() => payBill(bill.id)}
                              >
                                <FontAwesomeIcon icon={faCreditCard} />
                                Pay Now
                              </button>
                              <button 
                                className="action-btn view-btn"
                                onClick={() => viewInvoice(bill)}
                              >
                                <FontAwesomeIcon icon={faEye} />
                                View
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                className="action-btn download-btn"
                                onClick={() => downloadInvoice(bill)}
                              >
                                <FontAwesomeIcon icon={faDownload} />
                                Download
                              </button>
                              <button 
                                className="action-btn view-btn"
                                onClick={() => viewInvoice(bill)}
                              >
                                <FontAwesomeIcon icon={faEye} />
                                View
                              </button>
                            </>
                          )}
                          
                          <button 
                            className="action-btn share-btn"
                            onClick={() => alert('Share functionality coming soon!')}
                          >
                            <FontAwesomeIcon icon={faShare} />
                            Share
                          </button>
                        </div>
                      </div>
                      
                      <div className="bill-card-footer">
                        {isBillOverdue && (
                          <div className="overdue-warning">
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                            <span>This bill is overdue! Please pay immediately to avoid late fees.</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
        
        <div className="billing-right">
          {/* Payment Methods */}
          <div className="payment-methods-card">
            <div className="card-header">
              <h3><FontAwesomeIcon icon={faCreditCard} /> Payment Methods</h3>
              <button 
                className="add-method-btn"
                onClick={() => setShowAddPaymentMethod(true)}
              >
                <FontAwesomeIcon icon={faPlus} />
                Add New
              </button>
            </div>
            
            <div className="methods-list">
              {paymentMethods.map(method => (
                <div key={method.id} className={`method-item ${method.isDefault ? 'default' : ''}`}>
                  <div className="method-icon">
                    <FontAwesomeIcon icon={getPaymentMethodIcon(method.type)} />
                  </div>
                  <div className="method-details">
                    <h4>{method.name}</h4>
                    {method.type === 'upi' && <p>{method.upiId}</p>}
                    {method.type === 'card' && <p>**** **** **** {method.lastFour}</p>}
                    {method.type === 'wallet' && <p>Balance: ₹{method.balance}</p>}
                  </div>
                  <div className="method-actions">
                    {method.isDefault ? (
                      <span className="default-badge">Default</span>
                    ) : (
                      <button 
                        className="set-default-btn"
                        onClick={() => setDefaultPaymentMethod(method.id)}
                      >
                        Set Default
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Quick Pay */}
          <div className="quick-pay-card">
            <h3><FontAwesomeIcon icon={faQrcode} /> Quick Pay</h3>
            <div className="qr-code">
              {/* In real app, generate QR code for UPI payment */}
              <div className="qr-placeholder">
                <FontAwesomeIcon icon={faQrcode} size="4x" />
                <p>Scan to pay with UPI</p>
              </div>
            </div>
            <div className="quick-pay-info">
              <p>Total Pending: <strong>₹{totalPending}</strong></p>
              <button 
                className="btn-primary pay-all-btn"
                onClick={() => {
                  const pendingBills = bills.filter(b => b.status === 'pending' || b.status === 'overdue');
                  if (pendingBills.length > 0) {
                    const total = pendingBills.reduce((sum, b) => sum + b.total, 0);
                    if (window.confirm(`Pay all ${pendingBills.length} pending bills for ₹${total}?`)) {
                      alert('Redirecting to payment gateway...');
                    }
                  } else {
                    alert('No pending bills to pay.');
                  }
                }}
              >
                Pay All Pending Bills
              </button>
            </div>
          </div>
          
          {/* Billing Tips */}
          <div className="billing-tips-card">
            <h3><FontAwesomeIcon icon={faInfoCircle} /> Billing Tips</h3>
            <div className="tips-list">
              <div className="tip-item">
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>Pay bills before due date to avoid late fees</span>
              </div>
              <div className="tip-item">
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>Keep digital copies of all receipts for insurance claims</span>
              </div>
              <div className="tip-item">
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>Set up auto-pay for regular medication bills</span>
              </div>
              <div className="tip-item">
                <FontAwesomeIcon icon={faCheckCircle} />
                <span>Contact hospital billing department for payment plans if needed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedBill && (
        <div className="modal-overlay">
          <div className="modal payment-modal">
            <div className="modal-header">
              <h3>Pay Bill: {selectedBill.billNumber}</h3>
              <button onClick={() => setShowPaymentModal(false)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="payment-summary">
                <div className="summary-section">
                  <h4>Bill Details</h4>
                  <div className="bill-info-modal">
                    <p><strong>Description:</strong> {selectedBill.description}</p>
                    <p><strong>Hospital:</strong> {selectedBill.hospital}</p>
                    <p><strong>Due Date:</strong> {formatDate(selectedBill.dueDate)}</p>
                  </div>
                </div>
                
                <div className="summary-section">
                  <h4>Amount Breakdown</h4>
                  <div className="amount-breakdown">
                    {selectedBill.items.map((item, index) => (
                      <div key={index} className="breakdown-row">
                        <span>{item.name}</span>
                        <span>₹{item.amount}</span>
                      </div>
                    ))}
                    <div className="breakdown-total">
                      <span>Total Amount</span>
                      <span className="total-amount">₹{selectedBill.total}</span>
                    </div>
                  </div>
                </div>
                
                <div className="payment-method-selection">
                  <h4>Select Payment Method</h4>
                  <div className="payment-options">
                    {paymentMethods.map(method => (
                      <button
                        key={method.id}
                        className={`payment-option ${paymentMethod === method.type ? 'selected' : ''}`}
                        onClick={() => setPaymentMethod(method.type)}
                      >
                        <FontAwesomeIcon icon={getPaymentMethodIcon(method.type)} />
                        <span>{method.name}</span>
                        {method.isDefault && <span className="default-tag">Default</span>}
                      </button>
                    ))}
                  </div>
                  
                  {paymentMethod === 'upi' && (
                    <div className="payment-details">
                      <label>Enter UPI ID</label>
                      <input
                        type="text"
                        placeholder="username@bank"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                      />
                    </div>
                  )}
                  
                  {paymentMethod === 'card' && (
                    <div className="payment-details">
                      <label>Card Details</label>
                      <input
                        type="text"
                        placeholder="Card Number"
                        value={cardDetails.number}
                        onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                      />
                      <div className="card-details-row">
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardDetails.expiry}
                          onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                        />
                        <input
                          type="text"
                          placeholder="CVV"
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="payment-security">
                  <FontAwesomeIcon icon={faShieldAlt} />
                  <span>Your payment is secure and encrypted</span>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowPaymentModal(false)}
                  disabled={loading}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={processPayment}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <FontAwesomeIcon icon={faSpinner} spin />
                      Processing...
                    </>
                  ) : (
                    <>
                      Pay ₹{selectedBill.total}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Modal */}
      {showInvoiceModal && selectedBill && (
        <div className="modal-overlay">
          <div className="modal invoice-modal">
            <div className="modal-header">
              <h3>Invoice: {selectedBill.billNumber}</h3>
              <button onClick={() => setShowInvoiceModal(false)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="invoice-preview">
                <div className="invoice-header">
                  <h2>MEDICAL BILL INVOICE</h2>
                  <div className="invoice-meta">
                    <p><strong>Invoice No:</strong> {selectedBill.billNumber}</p>
                    <p><strong>Date:</strong> {formatDate(selectedBill.date)}</p>
                    <p><strong>Due Date:</strong> {formatDate(selectedBill.dueDate)}</p>
                  </div>
                </div>
                
                <div className="invoice-section">
                  <h4>Bill To:</h4>
                  <div className="patient-details">
                    <p><strong>{patient.name}</strong></p>
                    <p>Patient ID: {patient.id || 'N/A'}</p>
                    <p>Email: {patient.email}</p>
                  </div>
                </div>
                
                <div className="invoice-section">
                  <h4>Hospital Details:</h4>
                  <div className="hospital-details">
                    <p><strong>{selectedBill.hospital}</strong></p>
                    <p>{selectedBill.description}</p>
                  </div>
                </div>
                
                <div className="invoice-section">
                  <h4>Items:</h4>
                  <table className="invoice-items">
                    <thead>
                      <tr>
                        <th>Description</th>
                        <th>Amount (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedBill.items.map((item, index) => (
                        <tr key={index}>
                          <td>{item.name}</td>
                          <td>{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="invoice-totals">
                  <div className="total-row">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedBill.amount)}</span>
                  </div>
                  {selectedBill.tax > 0 && (
                    <div className="total-row">
                      <span>Tax (10%):</span>
                      <span>{formatCurrency(selectedBill.tax)}</span>
                    </div>
                  )}
                  {selectedBill.discount > 0 && (
                    <div className="total-row discount">
                      <span>Discount:</span>
                      <span>-{formatCurrency(selectedBill.discount)}</span>
                    </div>
                  )}
                  <div className="total-row grand-total">
                    <span>Total Amount:</span>
                    <span>{formatCurrency(selectedBill.total)}</span>
                  </div>
                </div>
                
                <div className="invoice-footer">
                  <div className="payment-status">
                    <strong>Status:</strong> {selectedBill.status.toUpperCase()}
                    {selectedBill.paymentMethod && (
                      <span> • Paid via {selectedBill.paymentMethod.toUpperCase()}</span>
                    )}
                    {selectedBill.paidDate && (
                      <span> • Paid on {formatDate(selectedBill.paidDate)}</span>
                    )}
                  </div>
                  <div className="invoice-notes">
                    <p><strong>Notes:</strong></p>
                    <p>• This is a computer-generated invoice</p>
                    <p>• Please keep this invoice for your records</p>
                    <p>• For queries, contact hospital billing department</p>
                  </div>
                </div>
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowInvoiceModal(false)}
                >
                  Close
                </button>
                <button 
                  className="btn-primary"
                  onClick={() => downloadInvoice(selectedBill)}
                >
                  <FontAwesomeIcon icon={faDownload} />
                  Download Invoice
                </button>
                <button 
                  className="btn-secondary"
                  onClick={() => window.print()}
                >
                  <FontAwesomeIcon icon={faPrint} />
                  Print
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Method Modal */}
      {showAddPaymentMethod && (
        <div className="modal-overlay">
          <div className="modal add-method-modal">
            <div className="modal-header">
              <h3>Add Payment Method</h3>
              <button onClick={() => setShowAddPaymentMethod(false)} className="modal-close">
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="method-selection">
                <h4>Select Method Type</h4>
                <div className="method-type-options">
                  {['upi', 'card', 'netbanking', 'wallet'].map(type => (
                    <button
                      key={type}
                      className={`method-type-option ${paymentMethod === type ? 'selected' : ''}`}
                      onClick={() => setPaymentMethod(type)}
                    >
                      <FontAwesomeIcon icon={getPaymentMethodIcon(type)} size="2x" />
                      <span>{type.toUpperCase()}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="method-details-form">
                {paymentMethod === 'upi' && (
                  <div className="form-group">
                    <label>UPI ID</label>
                    <input
                      type="text"
                      placeholder="username@bank"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                    />
                    <small>e.g., 1234567890@upi, name@okbank</small>
                  </div>
                )}
                
                {paymentMethod === 'card' && (
                  <>
                    <div className="form-group">
                      <label>Card Number</label>
                      <input
                        type="text"
                        placeholder="1234 5678 9012 3456"
                        value={cardDetails.number}
                        onChange={(e) => setCardDetails({...cardDetails, number: e.target.value})}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input
                          type="text"
                          placeholder="MM/YY"
                          value={cardDetails.expiry}
                          onChange={(e) => setCardDetails({...cardDetails, expiry: e.target.value})}
                        />
                      </div>
                      <div className="form-group">
                        <label>CVV</label>
                        <input
                          type="text"
                          placeholder="123"
                          value={cardDetails.cvv}
                          onChange={(e) => setCardDetails({...cardDetails, cvv: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Name on Card</label>
                      <input
                        type="text"
                        placeholder="John Smith"
                      />
                    </div>
                  </>
                )}
              </div>
              
              <div className="modal-actions">
                <button 
                  className="btn-secondary"
                  onClick={() => setShowAddPaymentMethod(false)}
                >
                  Cancel
                </button>
                <button 
                  className="btn-primary"
                  onClick={addPaymentMethod}
                >
                  Add Payment Method
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientBilling;