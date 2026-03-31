// components/hm/HmApp.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import HmLayout from "./HmLayout";

// All imports are from pages/hm/management/
import Management from "../../pages/hm/management/Management";
import PendingApproval from "../../pages/hm/management/PendingApproval";
import Doctors from "../../pages/hm/management/Doctors";
import Departments from "../../pages/hm/management/Departments";
import Rooms from "../../pages/hm/management/Rooms";
import Diseases from "../../pages/hm/management/Diseases";
import Queues from "../../pages/hm/management/Queues";
import Revenue from "../../pages/hm/management/Revenue";
import Feedback from "../../pages/hm/management/Feedback";
import Notifications from "../../pages/hm/management/Notifications";
import Audit from "../../pages/hm/management/Audit";
import AdvancedBookings from "../../pages/hm/management/AdvancedBookings";
import DoctorCredentials from "../../pages/hm/management/DoctorCredentials";
import HospitalProfile from "../../pages/hm/management/HospitalProfile"; // Correct path
import ManageComplaints from "../../pages/hm/ManageComplaints";

// Doctor profile is in pages/hm/doctors/[id]/
import DoctorProfile from "../../pages/hm/doctors/[id]/Profile";

const HmApp = () => {
  return (
    <HmLayout>
      <Routes>
        {/* Redirect hm root to management dashboard */}
        <Route path="/" element={<Navigate to="management" replace />} />
        
        {/* Main Management Dashboard */}
        <Route path="management" element={<Management />} />
        
        {/* Hospital Profile - Note: This is in management folder */}
        <Route path="management/hospital-profile" element={<HospitalProfile />} />
        
        {/* Doctor Profile */}
        <Route path="doctor/:id" element={<DoctorProfile />} />
        
        {/* Management Sub-pages */}
        <Route path="management/doctors" element={<Doctors />} />
        <Route path="management/departments" element={<Departments />} />
        <Route path="management/rooms" element={<Rooms />} />
        <Route path="management/diseases" element={<Diseases />} />
        <Route path="management/queues" element={<Queues />} />
        <Route path="management/advanced-bookings" element={<AdvancedBookings />} />
        <Route path="management/revenue" element={<Revenue />} />
        <Route path="management/feedback" element={<Feedback />} />
        <Route path="management/notifications" element={<Notifications />} />
        <Route path="management/audit" element={<Audit />} />
        <Route path="management/credentials" element={<DoctorCredentials />} />
        <Route path="management/pending-approval" element={<PendingApproval />} />
        <Route path="management/complaints" element={<ManageComplaints />} />
        
        {/* Redirect any unknown route to management */}
        <Route path="*" element={<Navigate to="management" replace />} />
      </Routes>
    </HmLayout>
  );
};

export default HmApp;