/**
 * revenueService.js - Revenue & Earnings Calculation Service
 * Handles calculations for doctor earnings, patient bills, and hospital revenue
 */

const revenueService = {
  /**
   * Calculate doctor's total earnings from bills
   */
  calculateDoctorEarnings: (bills = [], doctorId) => {
    if (!doctorId || !Array.isArray(bills)) {
      return {
        totalEarnings: 0,
        billsCount: 0,
        avgEarning: 0,
        transactions: [],
      };
    }

    const doctorBills = bills.filter(
      (bill) =>
        String(bill.doctorId || bill.doctor_id || '') ===
        String(doctorId || ''),
    );

    const paidBills = doctorBills.filter(
      (bill) =>
        String(bill.status || '').toLowerCase() === 'paid' ||
        String(bill.paymentStatus || '').toLowerCase() === 'paid',
    );

    const totalEarnings = paidBills.reduce(
      (sum, bill) => sum + Number(bill.amount || bill.total || 0),
      0,
    );
    const billsCount = paidBills.length;
    const avgEarning = billsCount > 0 ? totalEarnings / billsCount : 0;

    const transactions = paidBills
      .sort(
        (a, b) =>
          new Date(b.paidDate || b.date || 0) -
          new Date(a.paidDate || a.date || 0),
      )
      .map((bill) => ({
        id: bill.id,
        patientName: bill.patientName || bill.patient || 'Patient',
        amount: Number(bill.amount || bill.total || 0),
        date: bill.paidDate || bill.date || bill.createdAt,
        appointmentId: bill.appointmentId,
        category: bill.category || 'Consultation',
      }));

    return {
      totalEarnings: Number(totalEarnings.toFixed(2)),
      billsCount,
      avgEarning: Number(avgEarning.toFixed(2)),
      transactions,
    };
  },

  /**
   * Calculate hospital's total revenue from bills
   */
  calculateHospitalRevenue: (bills = [], hospitalId) => {
    if (!hospitalId || !Array.isArray(bills)) {
      return {
        totalRevenue: 0,
        billsCount: 0,
        avgTransaction: 0,
        transactions: [],
        byCategory: {},
        byDoctor: {},
      };
    }

    const hospitalBills = bills.filter(
      (bill) =>
        String(bill.hospitalId || bill.HID || '') ===
        String(hospitalId || ''),
    );

    const paidBills = hospitalBills.filter(
      (bill) =>
        String(bill.status || '').toLowerCase() === 'paid' ||
        String(bill.paymentStatus || '').toLowerCase() === 'paid',
    );

    const totalRevenue = paidBills.reduce(
      (sum, bill) => sum + Number(bill.amount || bill.total || 0),
      0,
    );
    const billsCount = paidBills.length;
    const avgTransaction = billsCount > 0 ? totalRevenue / billsCount : 0;

    // Break down by category
    const byCategory = {};
    paidBills.forEach((bill) => {
      const category = bill.category || 'General';
      if (!byCategory[category]) {
        byCategory[category] = { amount: 0, count: 0 };
      }
      byCategory[category].amount += Number(bill.amount || bill.total || 0);
      byCategory[category].count += 1;
    });

    // Break down by doctor
    const byDoctor = {};
    paidBills.forEach((bill) => {
      const doctor = bill.doctorName || 'Unknown Doctor';
      if (!byDoctor[doctor]) {
        byDoctor[doctor] = { amount: 0, count: 0, doctorId: bill.doctorId };
      }
      byDoctor[doctor].amount += Number(bill.amount || bill.total || 0);
      byDoctor[doctor].count += 1;
    });

    const transactions = paidBills
      .sort(
        (a, b) =>
          new Date(b.paidDate || b.date || 0) -
          new Date(a.paidDate || a.date || 0),
      )
      .slice(0, 20)
      .map((bill) => ({
        id: bill.id,
        patient: bill.patientName || bill.patient || 'Patient',
        doctor: bill.doctorName || 'Doctor',
        amount: Number(bill.amount || bill.total || 0),
        date: bill.paidDate || bill.date || bill.createdAt,
        status: String(bill.status || 'paid').toLowerCase(),
        category: bill.category || 'General',
      }));

    return {
      totalRevenue: Number(totalRevenue.toFixed(2)),
      billsCount,
      avgTransaction: Number(avgTransaction.toFixed(2)),
      transactions,
      byCategory,
      byDoctor,
    };
  },

  /**
   * Calculate patient's total bill amount
   */
  calculatePatientBills: (bills = [], patientId) => {
    if (!patientId || !Array.isArray(bills)) {
      return {
        totalBilled: 0,
        totalPaid: 0,
        totalPending: 0,
        billsCount: 0,
        bills: [],
      };
    }

    const patientBills = bills.filter(
      (bill) =>
        String(bill.patientId || bill.patient_id || '') ===
        String(patientId || ''),
    );

    const totalBilled = patientBills.reduce(
      (sum, bill) => sum + Number(bill.amount || bill.total || 0),
      0,
    );

    const paidBills = patientBills.filter(
      (bill) =>
        String(bill.status || '').toLowerCase() === 'paid' ||
        String(bill.paymentStatus || '').toLowerCase() === 'paid',
    );
    const totalPaid = paidBills.reduce(
      (sum, bill) => sum + Number(bill.amount || bill.total || 0),
      0,
    );

    const pendingBills = patientBills.filter(
      (bill) =>
        String(bill.status || '').toLowerCase() !== 'paid' &&
        String(bill.paymentStatus || '').toLowerCase() !== 'paid',
    );
    const totalPending = pendingBills.reduce(
      (sum, bill) => sum + Number(bill.amount || bill.total || 0),
      0,
    );

    const billsList = patientBills
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
      )
      .map((bill) => ({
        id: bill.id,
        billNumber: bill.billNumber || bill.id,
        hospital: bill.hospitalName || bill.hospital || 'Hospital',
        doctor: bill.doctorName || 'Doctor',
        amount: Number(bill.amount || bill.total || 0),
        status: String(bill.status || 'pending').toLowerCase(),
        date: bill.createdAt || bill.date,
        appointmentId: bill.appointmentId,
      }));

    return {
      totalBilled: Number(totalBilled.toFixed(2)),
      totalPaid: Number(totalPaid.toFixed(2)),
      totalPending: Number(totalPending.toFixed(2)),
      billsCount: patientBills.length,
      bills: billsList,
    };
  },

  /**
   * Get monthly revenue breakdown
   */
  getMonthlyRevenue: (bills = [], hospitalId) => {
    if (!hospitalId || !Array.isArray(bills)) {
      return {};
    }

    const hospitalBills = bills.filter(
      (bill) =>
        String(bill.hospitalId || bill.HID || '') ===
        String(hospitalId || ''),
    );

    const paidBills = hospitalBills.filter(
      (bill) =>
        String(bill.status || '').toLowerCase() === 'paid' ||
        String(bill.paymentStatus || '').toLowerCase() === 'paid',
    );

    const months = {};
    paidBills.forEach((bill) => {
      const date = new Date(bill.paidDate || bill.date || bill.createdAt || 0);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!months[monthKey]) {
        months[monthKey] = 0;
      }
      months[monthKey] += Number(bill.amount || bill.total || 0);
    });

    return months;
  },
};

export default revenueService;
