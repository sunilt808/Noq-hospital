// pages/PatientBilling.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import patientService from '../../services/patientService';
import api from '../../services/api';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft, faMoneyBill, faCreditCard, faReceipt,
  faDownload, faPrint, faClock, faCheckCircle,
  faExclamationTriangle, faQrcode, faWallet, faUniversity,
  faMobileAlt, faShieldAlt, faCalendarAlt, faFilePdf,
  faShare, faFilter, faSearch, faSortUp, faSortDown,
  faPlus, faEye, faCalendarCheck, faHospital, faUserMd,
  faPills, faSyringe, faBed, faSpinner, faChevronRight,
  faInfoCircle, faCalendarTimes, faCalendarDay,
  faPercentage, faIndianRupeeSign
} from '@fortawesome/free-solid-svg-icons';
import './patient.css';

const PatientBilling = () => {
  const navigate = useNavigate();
  const { currentUser, loading: authLoading } = useAuth();
  const [bills, setBills] = useState([]);
  const [filteredBills, setFilteredBills] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
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
  const [showAddPaymentMethod, setShowAddPaymentMethod] = useState(false);
  const [paymentMethods, setPaymentMethods] = useState([]);

  // Load bills from API
  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) return;
    if (String(currentUser.role || '').toLowerCase() !== 'patient') {
      navigate('/login', { replace: true });
      return;
    }

    const loadBills = async () => {
      try {
        setLoading(true);
        const data = await patientService.getBillingHistory();
        const rawBills = Array.isArray(data) ? data : [];
        const normalized = rawBills.map((bill) => ({
          id: bill.id,
          billNumber: bill.id || `BILL-${Date.now()}`,
          appointmentId: bill.appointment_id,
          amount: Number(bill.amount || 0),
          total: Number(bill.total || bill.amount || 0),
          tax: Number(bill.tax || 0),
          discount: Number(bill.discount || 0),
          status: String(bill.status || 'pending').toLowerCase(),
          createdAt: bill.created_at || new Date().toISOString(),
          date: bill.created_at
            ? new Date(bill.created_at).toISOString().split('T')[0]
            : new Date().toISOString().split('T')[0],
          dueDate: bill.due_date || bill.dueDate || new Date().toISOString().split('T')[0],
          hospitalName: bill.hospital_name || bill.hospitalName || 'Hospital',
          hospital: bill.hospital_name || bill.hospitalName || 'Hospital',
          doctorName: bill.doctor_name || bill.doctorName || 'Doctor',
          doctor: bill.doctor_name || bill.doctorName || 'Doctor',
          description: bill.description || 'Consultation',
          category: bill.category || 'Consultation',
          items: bill.items || [{ name: bill.description || 'Consultation', amount: Number(bill.amount || 0) }],
          paymentMethod: bill.paymentMethod || null,
          paidDate: bill.paidDate || null,
        }));

        const sorted = normalized.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        setBills(sorted);
        setFilteredBills(sorted);

        const pending = sorted.filter(b => b.status === 'pending').reduce((sum, b) => sum + b.amount, 0);
        const paid = sorted.filter(b => b.status === 'paid').reduce((sum, b) => sum + b.amount, 0);
        setTotalPending(pending);
        setTotalPaid(paid);
      } catch (error) {
        console.error('Error loading bills:', error);
        setBills([]);
        setFilteredBills([]);
      } finally {
        setLoading(false);
      }
    };

    loadBills();
  }, [authLoading, currentUser, navigate]);

  // Recompute filtered bills whenever tab, search, sort changes
  useEffect(() => {
    setFilteredBills(computeFiltered(bills, activeTab, searchQuery, filterDate, sortBy, sortOrder));
  }, [activeTab, searchQuery, filterDate, sortBy, sortOrder, bills]);

  const computeFiltered = (billsList, tab, query, date, sort, order) => {
    let filtered = [...billsList];

    // Tab filter
    if (tab !== 'all') filtered = filtered.filter(b => b.status === tab);

    // Search filter
    if (query) {
      const q = query.toLowerCase();
      filtered = filtered.filter(b =>
        String(b.billNumber || '').toLowerCase().includes(q) ||
        String(b.description || '').toLowerCase().includes(q) ||
        String(b.hospital || '').toLowerCase().includes(q) ||
        String(b.category || '').toLowerCase().includes(q)
      );
    }

    // Date filter
    if (date) filtered = filtered.filter(b => b.date === date);

    // Sort
    filtered.sort((a, b) => {
      let av, bv;
      if (sort === 'amount') { av = a.total; bv = b.total; }
      else if (sort === 'dueDate') { av = new Date(a.dueDate); bv = new Date(b.dueDate); }
      else if (sort === 'hospital') { av = a.hospital; bv = b.hospital; }
      else { av = new Date(a.date); bv = new Date(b.date); }
      return order === 'asc' ? (av > bv ? 1 : -1) : (av < bv ? 1 : -1);
    });

    return filtered;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'paid': return '#10b981';
      case 'pending': return '#f59e0b';
      case 'overdue': return '#ef4444';
      case 'cancelled': return '#6b7280';
      default: return '#64748b';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'paid': return faCheckCircle;
      case 'pending': return faClock;
      case 'overdue': return faExclamationTriangle;
      case 'cancelled': return faCalendarTimes;
      default: return faMoneyBill;
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Consultation': return faUserMd;
      case 'Diagnostics': return faSyringe;
      case 'Pharmacy': return faPills;
      case 'Hospitalization': return faBed;
      default: return faReceipt;
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'upi': return faMobileAlt;
      case 'card': return faCreditCard;
      case 'netbanking': return faUniversity;
      case 'wallet': return faWallet;
      default: return faMoneyBill;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount || 0);

  const isOverdue = (dueDate) => dueDate && new Date(dueDate) < new Date();

  // Pay bill — updates appointment status to completed via API, which triggers revenue distribution
  const payBill = (bill) => {
    setSelectedBill(bill);
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!selectedBill) return;
    setLoading(true);
    try {
      // Mark the linked appointment as completed — bills.py derives 'paid' from completed appointments
      const appointmentId = selectedBill.appointmentId || selectedBill.id?.replace('BILL-', '');
      if (appointmentId) {
        await api.put(`/appointments/${appointmentId}`, { status: 'completed' });
      }

      // Optimistically update local bill state
      const updatedBills = bills.map(b =>
        b.id === selectedBill.id
          ? { ...b, status: 'paid', paymentMethod, paidDate: new Date().toISOString().split('T')[0] }
          : b
      );
      setBills(updatedBills);
      setTotalPending(updatedBills.filter(b => b.status === 'pending').reduce((s, b) => s + b.amount, 0));
      setTotalPaid(updatedBills.filter(b => b.status === 'paid').reduce((s, b) => s + b.amount, 0));
      setShowPaymentModal(false);
      setSelectedBill(null);
      alert('Payment successful! The appointment is now marked as completed.');
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const downloadInvoice = (bill) => {
    if (!bill) return;
    const content = `MEDICAL BILL INVOICE\n====================\n\nInvoice No: ${bill.billNumber}\nDate: ${bill.date}\nDue Date: ${bill.dueDate}\n\nHospital: ${bill.hospital}\nDoctor: ${bill.doctor}\nDescription: ${bill.description}\n\nAmount: ₹${bill.amount}\nTax: ₹${bill.tax}\nDiscount: ₹${bill.discount}\nTotal: ₹${bill.total}\n\nPayment Status: ${bill.status.toUpperCase()}\n${bill.paidDate ? `Paid Date: ${bill.paidDate}` : ''}\n${bill.paymentMethod ? `Payment Method: ${bill.paymentMethod.toUpperCase()}` : ''}\n\nThank you for choosing our services!\n------------------------------------\nThis is a computer-generated invoice.`;
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

  const patientName = currentUser?.full_name || currentUser?.name || 'Patient';

  if (authLoading) {
    return <div className="loading-container"><div className="loading-spinner"></div><p>Loading billing information...</p></div>;
  }

  return (
    <div className="patient-billing-page">
      {/* Header */}
      <header className="billing-header">
        <button className="back-btn" onClick={() => navigate('/patient/dashboard')}>
          <FontAwesomeIcon icon={faArrowLeft} /> Back to Dashboard
        </button>
        <h2><FontAwesomeIcon icon={faMoneyBill} /> Billing &amp; Payments</h2>
        <div className="patient-info">
          <span>{patientName}</span>
          <span className="total-pending">Total Due: ₹{totalPending.toLocaleString()}</span>
        </div>
      </header>

      {/* Financial Summary */}
      <div className="financial-summary">
        <div className="summary-card pending">
          <div className="summary-icon"><FontAwesomeIcon icon={faClock} /></div>
          <div className="summary-content">
            <span className="summary-label">Pending Bills</span>
            <span className="summary-amount">₹{totalPending.toLocaleString()}</span>
            <span className="summary-count">{bills.filter(b => b.status === 'pending').length} bills</span>
          </div>
        </div>
        <div className="summary-card paid">
          <div className="summary-icon"><FontAwesomeIcon icon={faCheckCircle} /></div>
          <div className="summary-content">
            <span className="summary-label">Total Paid</span>
            <span className="summary-amount">₹{totalPaid.toLocaleString()}</span>
            <span className="summary-count">{bills.filter(b => b.status === 'paid').length} bills</span>
          </div>
        </div>
        <div className="summary-card overdue">
          <div className="summary-icon"><FontAwesomeIcon icon={faExclamationTriangle} /></div>
          <div className="summary-content">
            <span className="summary-label">Overdue</span>
            <span className="summary-amount">₹{bills.filter(b => b.status === 'overdue').reduce((s, b) => s + b.total, 0).toLocaleString()}</span>
            <span className="summary-count">{bills.filter(b => b.status === 'overdue').length} bills</span>
          </div>
        </div>
        <div className="summary-card upcoming">
          <div className="summary-icon"><FontAwesomeIcon icon={faCalendarAlt} /></div>
          <div className="summary-content">
            <span className="summary-label">Cancelled</span>
            <span className="summary-amount">₹0</span>
            <span className="summary-count">{bills.filter(b => b.status === 'cancelled').length} bills</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="billing-main">
        <div className="billing-left">
          {/* Filters */}
          <div className="billing-controls">
            <div className="search-sort-section">
              <div className="search-box">
                <FontAwesomeIcon icon={faSearch} />
                <input
                  type="text"
                  placeholder="Search bills by number, hospital, description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="sort-controls">
                <div className="date-filter">
                  <FontAwesomeIcon icon={faCalendarDay} />
                  <input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
                  {filterDate && <button className="clear-btn" onClick={() => setFilterDate('')}>Clear</button>}
                </div>
                <div className="sort-dropdown">
                  <span>Sort by:</span>
                  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                    <option value="date">Date</option>
                    <option value="dueDate">Due Date</option>
                    <option value="amount">Amount</option>
                    <option value="hospital">Hospital</option>
                  </select>
                  <button className="sort-order-btn" onClick={() => setSortOrder(o => o === 'asc' ? 'desc' : 'asc')}>
                    <FontAwesomeIcon icon={sortOrder === 'asc' ? faSortUp : faSortDown} />
                  </button>
                </div>
              </div>
            </div>

            <div className="billing-tabs">
              {['all', 'pending', 'paid', 'overdue', 'cancelled'].map(tab => (
                <button key={tab} className={`billing-tab ${activeTab === tab ? 'active' : ''}`} onClick={() => setActiveTab(tab)}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)} ({bills.filter(b => tab === 'all' ? true : b.status === tab).length})
                </button>
              ))}
            </div>
          </div>

          {/* Bills List */}
          <div className="bills-list">
            {loading ? (
              <div className="loading-bills"><div className="loading-spinner"></div><p>Loading bills...</p></div>
            ) : filteredBills.length === 0 ? (
              <div className="no-bills">
                <FontAwesomeIcon icon={faReceipt} size="3x" />
                <h3>No bills found</h3>
                <p>You don't have any {activeTab !== 'all' ? activeTab : ''} bills yet.</p>
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
                            <span>{bill.billNumber || bill.id}</span>
                          </div>
                          <div className="bill-category">
                            <FontAwesomeIcon icon={getCategoryIcon(bill.category)} />
                            <span>{bill.category}</span>
                          </div>
                        </div>
                        <div className="bill-status">
                          <span
                            className={`status-badge ${bill.status} ${isBillOverdue ? 'overdue' : ''}`}
                            style={{ backgroundColor: getStatusColor(isBillOverdue ? 'overdue' : bill.status) }}
                          >
                            <FontAwesomeIcon icon={getStatusIcon(isBillOverdue ? 'overdue' : bill.status)} />
                            {isBillOverdue ? 'OVERDUE' : bill.status.toUpperCase()}
                          </span>
                        </div>
                      </div>

                      <div className="bill-card-body">
                        <div className="bill-details">
                          <h4 className="bill-description">{bill.description}</h4>
                          <div className="bill-meta">
                            <span className="hospital"><FontAwesomeIcon icon={faHospital} /> {bill.hospital}</span>
                            <span className="date"><FontAwesomeIcon icon={faCalendarDay} /> {formatDate(bill.date)}</span>
                            <span className={`due-date ${isBillOverdue ? 'overdue' : ''}`}>
                              <FontAwesomeIcon icon={faCalendarTimes} /> Due: {formatDate(bill.dueDate)}
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
                          {(bill.status === 'pending' || isBillOverdue) ? (
                            <>
                              <button className="action-btn pay-btn" onClick={() => payBill(bill)}>
                                <FontAwesomeIcon icon={faCreditCard} /> Pay Now
                              </button>
                              <button className="action-btn view-btn" onClick={() => { setSelectedBill(bill); setShowInvoiceModal(true); }}>
                                <FontAwesomeIcon icon={faEye} /> View
                              </button>
                            </>
                          ) : (
                            <>
                              <button className="action-btn download-btn" onClick={() => downloadInvoice(bill)}>
                                <FontAwesomeIcon icon={faDownload} /> Download
                              </button>
                              <button className="action-btn view-btn" onClick={() => { setSelectedBill(bill); setShowInvoiceModal(true); }}>
                                <FontAwesomeIcon icon={faEye} /> View
                              </button>
                            </>
                          )}
                          <button className="action-btn share-btn" onClick={() => alert('Share functionality coming soon!')}>
                            <FontAwesomeIcon icon={faShare} /> Share
                          </button>
                        </div>
                      </div>

                      {isBillOverdue && (
                        <div className="bill-card-footer">
                          <div className="overdue-warning">
                            <FontAwesomeIcon icon={faExclamationTriangle} />
                            <span>This bill is overdue! Please pay immediately to avoid late fees.</span>
                          </div>
                        </div>
                      )}
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
              <button className="add-method-btn" onClick={() => setShowAddPaymentMethod(true)}>
                <FontAwesomeIcon icon={faPlus} /> Add New
              </button>
            </div>
            <div className="methods-list">
              {paymentMethods.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '0.9rem', padding: '0.5rem 0' }}>No saved payment methods. Add one to pay quickly.</p>
              ) : (
                paymentMethods.map(method => (
                  <div key={method.id} className={`method-item ${method.isDefault ? 'default' : ''}`}>
                    <div className="method-icon"><FontAwesomeIcon icon={getPaymentMethodIcon(method.type)} /></div>
                    <div className="method-details">
                      <h4>{method.name}</h4>
                      {method.type === 'upi' && <p>{method.upiId}</p>}
                      {method.type === 'card' && <p>**** **** **** {method.lastFour}</p>}
                    </div>
                    <div className="method-actions">
                      {method.isDefault ? (
                        <span className="default-badge">Default</span>
                      ) : (
                        <button className="set-default-btn" onClick={() => {
                          setPaymentMethods(old => old.map(m => ({ ...m, isDefault: m.id === method.id })));
                        }}>Set Default</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Pay */}
          <div className="quick-pay-card">
            <h3><FontAwesomeIcon icon={faQrcode} /> Quick Pay</h3>
            <div className="qr-code">
              <div className="qr-placeholder">
                <FontAwesomeIcon icon={faQrcode} size="4x" />
                <p>Scan to pay with UPI</p>
              </div>
            </div>
            <div className="quick-pay-info">
              <p>Total Pending: <strong>₹{totalPending.toLocaleString()}</strong></p>
              <button className="btn-primary pay-all-btn" onClick={() => {
                const pending = bills.filter(b => b.status === 'pending');
                if (pending.length > 0) {
                  const total = pending.reduce((s, b) => s + b.total, 0);
                  if (window.confirm(`Pay all ${pending.length} pending bills for ₹${total}?`)) {
                    alert('Redirecting to payment gateway...');
                  }
                } else {
                  alert('No pending bills to pay.');
                }
              }}>
                Pay All Pending Bills
              </button>
            </div>
          </div>

          {/* Billing Tips */}
          <div className="billing-tips-card">
            <h3><FontAwesomeIcon icon={faInfoCircle} /> Billing Tips</h3>
            <div className="tips-list">
              {[
                'Pay bills before due date to avoid late fees',
                'Keep digital copies of all receipts for insurance claims',
                'Set up auto-pay for regular medication bills',
                'Contact hospital billing department for payment plans if needed'
              ].map((tip, i) => (
                <div key={i} className="tip-item">
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>{tip}</span>
                </div>
              ))}
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
              <button onClick={() => setShowPaymentModal(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="payment-summary">
                <div className="summary-section">
                  <h4>Bill Details</h4>
                  <div className="bill-info-modal">
                    <p><strong>Description:</strong> {selectedBill.description}</p>
                    <p><strong>Hospital:</strong> {selectedBill.hospital}</p>
                    <p><strong>Doctor:</strong> {selectedBill.doctor}</p>
                    <p><strong>Due Date:</strong> {formatDate(selectedBill.dueDate)}</p>
                  </div>
                </div>
                <div className="summary-section">
                  <h4>Amount Breakdown</h4>
                  <div className="amount-breakdown">
                    <div className="breakdown-row"><span>Consultation Fee</span><span>₹{selectedBill.amount}</span></div>
                    {selectedBill.tax > 0 && <div className="breakdown-row"><span>Tax</span><span>₹{selectedBill.tax}</span></div>}
                    {selectedBill.discount > 0 && <div className="breakdown-row"><span>Discount</span><span>-₹{selectedBill.discount}</span></div>}
                    <div className="breakdown-total"><span>Total Amount</span><span className="total-amount">₹{selectedBill.total}</span></div>
                  </div>
                </div>
                <div className="payment-method-selection">
                  <h4>Select Payment Method</h4>
                  <div className="payment-options">
                    {['upi', 'card', 'netbanking', 'wallet'].map(m => (
                      <button key={m} className={`payment-option ${paymentMethod === m ? 'selected' : ''}`} onClick={() => setPaymentMethod(m)}>
                        <FontAwesomeIcon icon={getPaymentMethodIcon(m)} />
                        <span>{m.toUpperCase()}</span>
                      </button>
                    ))}
                  </div>
                  {paymentMethod === 'upi' && (
                    <div className="payment-details">
                      <label>Enter UPI ID</label>
                      <input type="text" placeholder="username@bank" value={upiId} onChange={e => setUpiId(e.target.value)} />
                    </div>
                  )}
                  {paymentMethod === 'card' && (
                    <div className="payment-details">
                      <label>Card Details</label>
                      <input type="text" placeholder="Card Number" value={cardDetails.number} onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })} />
                      <div className="card-details-row">
                        <input type="text" placeholder="MM/YY" value={cardDetails.expiry} onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })} />
                        <input type="text" placeholder="CVV" value={cardDetails.cvv} onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })} />
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
                <button className="btn-secondary" onClick={() => setShowPaymentModal(false)} disabled={loading}>Cancel</button>
                <button className="btn-primary" onClick={processPayment} disabled={loading}>
                  {loading ? <><FontAwesomeIcon icon={faSpinner} spin /> Processing...</> : <>Pay ₹{selectedBill.total}</>}
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
              <button onClick={() => setShowInvoiceModal(false)} className="modal-close">×</button>
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
                    <p><strong>{patientName}</strong></p>
                    <p>Email: {currentUser?.email}</p>
                  </div>
                </div>
                <div className="invoice-section">
                  <h4>Hospital Details:</h4>
                  <div className="hospital-details">
                    <p><strong>{selectedBill.hospital}</strong></p>
                    <p>Dr. {selectedBill.doctor}</p>
                    <p>{selectedBill.description}</p>
                  </div>
                </div>
                <div className="invoice-totals">
                  <div className="total-row"><span>Subtotal:</span><span>{formatCurrency(selectedBill.amount)}</span></div>
                  {selectedBill.tax > 0 && <div className="total-row"><span>Tax:</span><span>{formatCurrency(selectedBill.tax)}</span></div>}
                  {selectedBill.discount > 0 && <div className="total-row discount"><span>Discount:</span><span>-{formatCurrency(selectedBill.discount)}</span></div>}
                  <div className="total-row grand-total"><span>Total Amount:</span><span>{formatCurrency(selectedBill.total)}</span></div>
                </div>
                <div className="invoice-footer">
                  <div className="payment-status">
                    <strong>Status:</strong> {selectedBill.status.toUpperCase()}
                    {selectedBill.paymentMethod && <span> • Paid via {selectedBill.paymentMethod.toUpperCase()}</span>}
                    {selectedBill.paidDate && <span> • Paid on {formatDate(selectedBill.paidDate)}</span>}
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
                <button className="btn-secondary" onClick={() => setShowInvoiceModal(false)}>Close</button>
                <button className="btn-primary" onClick={() => downloadInvoice(selectedBill)}><FontAwesomeIcon icon={faDownload} /> Download Invoice</button>
                <button className="btn-secondary" onClick={() => window.print()}><FontAwesomeIcon icon={faPrint} /> Print</button>
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
              <button onClick={() => setShowAddPaymentMethod(false)} className="modal-close">×</button>
            </div>
            <div className="modal-body">
              <div className="method-selection">
                <h4>Select Method Type</h4>
                <div className="method-type-options">
                  {['upi', 'card', 'netbanking', 'wallet'].map(type => (
                    <button key={type} className={`method-type-option ${paymentMethod === type ? 'selected' : ''}`} onClick={() => setPaymentMethod(type)}>
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
                    <input type="text" placeholder="username@bank" value={upiId} onChange={e => setUpiId(e.target.value)} />
                    <small>e.g., 1234567890@upi, name@okbank</small>
                  </div>
                )}
                {paymentMethod === 'card' && (
                  <>
                    <div className="form-group">
                      <label>Card Number</label>
                      <input type="text" placeholder="1234 5678 9012 3456" value={cardDetails.number} onChange={e => setCardDetails({ ...cardDetails, number: e.target.value })} />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Expiry Date</label>
                        <input type="text" placeholder="MM/YY" value={cardDetails.expiry} onChange={e => setCardDetails({ ...cardDetails, expiry: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>CVV</label>
                        <input type="text" placeholder="123" value={cardDetails.cvv} onChange={e => setCardDetails({ ...cardDetails, cvv: e.target.value })} />
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-actions">
                <button className="btn-secondary" onClick={() => setShowAddPaymentMethod(false)}>Cancel</button>
                <button className="btn-primary" onClick={() => {
                  const newMethod = {
                    id: Date.now(),
                    type: paymentMethod,
                    name: paymentMethod === 'upi' ? 'UPI' : paymentMethod === 'card' ? 'Credit Card' : paymentMethod === 'netbanking' ? 'Net Banking' : 'Wallet',
                    isDefault: paymentMethods.length === 0,
                    upiId: paymentMethod === 'upi' ? upiId : undefined,
                    lastFour: paymentMethod === 'card' ? cardDetails.number.slice(-4) : undefined,
                  };
                  setPaymentMethods(prev => [...prev, newMethod]);
                  setShowAddPaymentMethod(false);
                  setUpiId('');
                  setCardDetails({ number: '', expiry: '', cvv: '' });
                  alert('Payment method added!');
                }}>
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