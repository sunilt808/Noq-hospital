// src/assets/components/doctor/DoctorApp.jsx - FIXED (No authentication)
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import DoctorLayout from './DoctorLayout';

// Import doctor pages
import Dashboard from "../../pages/doctor/Dashboard";
import DoctorAppointments from "../../pages/doctor/DoctorAppointments";
import DoctorPatients from "../../pages/doctor/DoctorPatients";
import DoctorQueue from "../../pages/doctor/DoctorQueue";
import DoctorProfile from "../../pages/doctor/DoctorProfile";
import PatientsManagement from '../../pages/doctor/PatientsManagement';
import DoctorPrescriptions from '../../pages/doctor/DoctorPrescriptions';
import DoctorAdvancedBookings from '../../pages/doctor/DoctorAdvancedBookings';
const DoctorApp = () => {
  // REMOVED all authentication logic - handled by ProtectedDoctorRoute in App.jsx
  
  return (
    <Routes>
      <Route path="/" element={<DoctorLayout />}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="appointments" element={<DoctorAppointments />} />
        <Route path="patients" element={<DoctorPatients />} />
        <Route path="queue" element={<DoctorQueue />} />
        <Route path="prescriptions" element={<DoctorPrescriptions />} />
        <Route path="advanced-bookings" element={<DoctorAdvancedBookings />} />
        <Route path="profile" element={<DoctorProfile />} />
        <Route path="patients-management" element={<PatientsManagement />} /> 
      </Route>
    </Routes>
  );
};

export default DoctorApp;