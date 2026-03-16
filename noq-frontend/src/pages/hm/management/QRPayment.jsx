// components/hm/QRPayment.jsx
import React, { useState, useRef } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQrcode, faDownload, faShare, faPrint,
  faRupeeSign, faHistory, faChartLine, faCopy,
  faMoneyBill, faCheckCircle, faCreditCard,
  faWhatsapp, faEnvelope
} from '@fortawesome/free-solid-svg-icons';

// Import your QR image
import hospitalQR from '../../assets/image.png'; // Your QR image

const QRPayment = ({ hospital, onPaymentComplete }) => {
  const qrRef = useRef(null);
  const [showQR, setShowQR] = useState(true);
  const [qrImageError, setQrImageError] = useState(false);
  const [qrData, setQrData] = useState({
    upiId: 'your-hospital@okbank', // Replace with your actual UPI ID
    name: hospital?.name || 'City General Hospital',
    amount: '',
    note: 'Hospital Payment',
    transactionCount: 45,
    totalAmount: 12500
  });

  // ... rest of your component code ...

  // Update the QR display section:
  const YourQRCode = () => (
    <div style={styles.qrBox} ref={qrRef}>
      {qrImageError ? (
        <div style={{ fontSize: '4rem', color: '#3b82f6', opacity: 0.7 }}>
          <FontAwesomeIcon icon={faQrcode} />
        </div>
      ) : (
        <img
          src={hospitalQR}
          alt="Hospital UPI QR Code"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            borderRadius: '8px'
          }}
          onError={() => {
            console.error('QR image failed to load');
            setQrImageError(true);
          }}
        />
      )}
      <div style={{
        position: 'absolute',
        bottom: '10px',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(255, 255, 255, 0.95)',
        padding: '0.25rem 1rem',
        borderRadius: '20px',
        fontSize: '0.75rem',
        fontWeight: '600',
        color: '#3b82f6',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        whiteSpace: 'nowrap'
      }}>
        {hospital?.name?.substring(0, 15) || 'Hospital'} QR
      </div>
    </div>
  );

  // Enhanced download function
  const handleDownloadQR = async () => {
    try {
      // Method 1: Direct download of your image
      const link = document.createElement('a');
      link.href = hospitalQR;
      link.download = `${hospital?.HID || 'hospital'}-qr-code.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      alert('QR Code downloaded successfully!');
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download QR. Please right-click and save image.');
    }
  };

  // Enhanced share function
  const handleShareQR = async () => {
    const shareData = {
      title: `${hospital?.name} Payment QR`,
      text: `Scan this QR to pay ${hospital?.name}\nUPI ID: ${qrData.upiId}`,
      url: window.location.href
    };

    if (navigator.share && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Sharing cancelled or failed');
        // Fallback to manual share
        handleManualShare();
      }
    } else {
      handleManualShare();
    }
  };

  const handleManualShare = () => {
    const shareText = `Pay ${hospital?.name} via UPI QR\n\n` +
                     `UPI ID: ${qrData.upiId}\n` +
                     `Hospital: ${hospital?.name}\n\n` +
                     `Scan the QR code for payment`;
    
    alert(`Share this information:\n\n${shareText}\n\n` +
          `Or download the QR image and share it.`);
  };

  // WhatsApp share
  const handleShareWhatsApp = () => {
    const message = `Pay ${hospital?.name} via UPI QR\n\n` +
                   `UPI ID: ${qrData.upiId}\n` +
                   `Scan the attached QR code for payment\n\n` +
                   `Download QR: ${window.location.origin}${hospitalQR}`;
    
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  // Email share
  const handleShareEmail = () => {
    const subject = `${hospital?.name} - Payment QR Code`;
    const body = `Dear Patient,\n\n` +
                `Please use the attached QR code to make payments to ${hospital?.name}.\n\n` +
                `UPI ID: ${qrData.upiId}\n` +
                `Hospital: ${hospital?.name}\n` +
                `Address: ${hospital?.address || 'N/A'}\n\n` +
                `Instructions:\n` +
                `1. Open any UPI app (GPay, PhonePe, Paytm, etc.)\n` +
                `2. Tap on "Scan QR Code"\n` +
                `3. Scan the attached QR code\n` +
                `4. Enter amount and complete payment\n\n` +
                `Thank you!\n` +
                `${hospital?.name} Management`;
    
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  // Update your component return to use the new QR
  return (
    <div style={styles.container}>
      {/* ... header and stats ... */}
      
      {showQR && (
        <>
          <div style={styles.qrContainer}>
            <YourQRCode />
            
            <div style={styles.qrDetails}>
              <p style={styles.hospitalName}>{hospital?.name}</p>
              <div 
                style={styles.upiId} 
                onClick={handleCopyUPI}
                title="Click to copy UPI ID"
              >
                {qrData.upiId} 
                <FontAwesomeIcon 
                  icon={faCopy} 
                  style={{ 
                    marginLeft: '0.5rem', 
                    cursor: 'pointer',
                    fontSize: '0.9rem'
                  }} 
                />
              </div>
              
              <p style={{ 
                fontSize: '0.8rem', 
                color: '#64748b',
                margin: '0.5rem 0',
                maxWidth: '300px'
              }}>
                Scan with any UPI app (GPay, PhonePe, Paytm, etc.)
              </p>
              
              {/* Amount input section */}
              <div style={{ margin: '1rem 0', width: '100%', maxWidth: '300px' }}>
                <div style={{
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  color: '#475569',
                  marginBottom: '0.5rem'
                }}>
                  Quick Payment Amount (Optional)
                </div>
                <input
                  type="number"
                  placeholder="Enter amount (₹)"
                  style={styles.amountInput}
                  value={qrData.amount}
                  onChange={(e) => {
                    setQrData({ ...qrData, amount: e.target.value });
                    // You could generate dynamic QR with amount here
                  }}
                  min="1"
                  step="1"
                />
                <button 
                  style={{...styles.actionBtn, ...styles.primaryBtn, width: '100%'}}
                  onClick={handleAddTransaction}
                  disabled={!qrData.amount || qrData.amount <= 0}
                >
                  <FontAwesomeIcon icon={faRupeeSign} />
                  Record ₹{qrData.amount || '0'} Payment
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={styles.actions}>
            <button 
              style={styles.actionBtn} 
              onClick={handleDownloadQR}
              title="Download QR Image"
            >
              <FontAwesomeIcon icon={faDownload} />
              Download QR
            </button>
            
            <button 
              style={styles.actionBtn} 
              onClick={handlePrintQR}
              title="Print QR Code"
            >
              <FontAwesomeIcon icon={faPrint} />
              Print
            </button>
            
            <div style={{ position: 'relative' }}>
              <button 
                style={{...styles.actionBtn, ...styles.successBtn}}
                onClick={() => setShowShareOptions(!showShareOptions)}
                title="Share QR Code"
              >
                <FontAwesomeIcon icon={faShare} />
                Share
              </button>
              
              {/* Share options dropdown */}
              {showShareOptions && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  background: 'white',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                  zIndex: 100,
                  marginTop: '0.25rem',
                  minWidth: '150px'
                }}>
                  <button 
                    style={{
                      ...styles.actionBtn,
                      border: 'none',
                      borderRadius: '0',
                      width: '100%',
                      justifyContent: 'flex-start',
                      background: 'transparent'
                    }}
                    onClick={handleShareWhatsApp}
                  >
                    <FontAwesomeIcon icon={faWhatsapp} style={{ color: '#25D366' }} />
                    WhatsApp
                  </button>
                  <button 
                    style={{
                      ...styles.actionBtn,
                      border: 'none',
                      borderRadius: '0',
                      width: '100%',
                      justifyContent: 'flex-start',
                      background: 'transparent'
                    }}
                    onClick={handleShareEmail}
                  >
                    <FontAwesomeIcon icon={faEnvelope} style={{ color: '#EA4335' }} />
                    Email
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      
      {/* ... transactions section ... */}
    </div>
  );
};

// Add these styles to your existing styles object:
const styles = {
  // ... your existing styles ...
  
  qrBox: {
    width: '220px',
    height: '220px',
    background: '#ffffff',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: '10px',
    boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
  },
  
  actions: {
    display: 'flex',
    gap: '0.75rem',
    justifyContent: 'center',
    flexWrap: 'wrap',
    marginTop: '1.5rem'
  },
  // ... rest of styles
};

export default QRPayment;