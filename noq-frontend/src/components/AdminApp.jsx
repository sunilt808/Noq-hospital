// components/AdminApp.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "../pages/admin/Dashboard";
import HMApprovals from "../pages/admin/HMApprovals";
import Hospitals from "../pages/admin/Hospitals";
import Revenue from "../pages/admin/Revenue";
import Reviews from "../pages/admin/Reviews";
import Profile from "../pages/admin/Profile";
import Settings from "../pages/admin/Settings";
import Notifications from "../pages/admin/Notifications"; // Add this import
import AdminLayout from "./AdminLayout";

const AdminApp = () => {
  return (
    <AdminLayout>
      <Routes>
        <Route path="/" element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="hm-approvals" element={<HMApprovals />} />
        <Route path="hospitals" element={<Hospitals />} />
        <Route path="revenue" element={<Revenue />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="notifications" element={<Notifications />} /> {/* Add this route */}
        <Route path="profile" element={<Profile />} />
        <Route path="settings" element={<Settings />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminApp;