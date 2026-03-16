// components/pat/PatientApp.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Import patient pages
import PatientDashboard from "../../pages/patient/PatientDashboard";
import BookAppointment from "../../pages/patient/BookAppointment";
import AdvancedBooking from "../../pages/patient/AdvancedBooking";
import MyAppointments from "../../pages/patient/MyAppointments";
import MedicalRecords from "../../pages/patient/MedicalRecords";
import Prescriptions from "../../pages/patient/Prescriptions";
import Billing from "../../pages/patient/Billing";
import Notifications from "../../pages/patient/Notifications";
import Reviews from "../../pages/patient/Reviews";
import Profile from "../../pages/patient/Profile";
import Settings from "../../pages/patient/Settings";

import PatientLayout from "./PatientLayout"; 

const PatientApp = () => {
  return (
    <PatientLayout>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<PatientDashboard />} />
        <Route path="book-appointment" element={<BookAppointment />} />
        <Route path="advanced-booking" element={<AdvancedBooking />} />
        <Route path="my-appointments" element={<MyAppointments />} />
        <Route path="medical-records" element={<MedicalRecords />} />
        <Route path="prescriptions" element={<Prescriptions />} />
        <Route path="billing" element={<Billing />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </PatientLayout>
  );
};

export default PatientApp;