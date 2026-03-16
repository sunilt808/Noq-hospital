// App.jsx - Firebase-only Auth (no localStorage)
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/FirebaseAuthContext.jsx";

import Login from "./pages/Login";
import HmSignup from "./pages/hm/Signup";
import Signup from "./pages/Signup";
import AdminLogin from "./pages/admin/AdminLogin";

import AdminApp from "./components/AdminApp";
import HmApp from "./components/hm/HmApp";
import DoctorApp from "./components/doctor/DoctorApp";
import PatientApp from "./components/pat/PatientApp";

import HmPendingApproval from "./pages/hm/management/PendingApproval.jsx";

import "./App.css";

/* ===================== ROLE-BASED PROTECTED ROUTE COMPONENTS ===================== */

/**
 * Admin Route: Check Firebase auth + admin role + 24-hour session limit
 */
const ProtectedAdminRoute = ({ children }) => {
  const { currentUser, token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Check auth exists
  if (!currentUser || !token) return <Navigate to="/admin/login" replace />;

  // Check admin role
  const role = String(currentUser?.role || "").toLowerCase();
  if (role !== "admin") return <Navigate to="/login" replace />;

  // Check 24-hour session limit
  const loginTime = new Date(currentUser?.loginTime || Date.now());
  const hoursDiff = (new Date() - loginTime) / (1000 * 60 * 60);
  if (hoursDiff >= 24) {
    // Session expired, logout via context will be handled by useEffect in Login
    return <Navigate to="/admin/login" replace />;
  }

  return children;
};

/**
 * HM Route: Check Firebase auth + HM role + approval status
 */
const ProtectedHmRoute = ({ children }) => {
  const { currentUser, token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Check auth exists
  if (!currentUser || !token) return <Navigate to="/login" replace />;

  // Check HM role
  const role = String(currentUser?.role || "").toLowerCase();
  if (role !== "hm") return <Navigate to="/login" replace />;

  // Check approval status
  const status = String(currentUser?.status || "").toLowerCase();
  if (status === "pending" || status === "pending_approval") {
    return <Navigate to="/hm/pending" replace />;
  }
  if (status === "rejected" || status === "blocked" || status === "inactive" || status === "disabled") {
    alert("Hospital Manager account is not approved. Please contact admin.");
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * Doctor Route: Check Firebase auth + doctor role + status
 */
const ProtectedDoctorRoute = ({ children }) => {
  const { currentUser, token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Check auth exists
  if (!currentUser || !token) return <Navigate to="/login" replace />;

  // Check doctor role
  const role = String(currentUser?.role || "").toLowerCase();
  if (role !== "doctor") return <Navigate to="/login" replace />;

  // Check doctor status
  const status = String(currentUser?.status || "").toLowerCase();
  if (status === "disabled" || status === "suspended" || status === "inactive") {
    alert(`Doctor account is ${status}. Please contact the Hospital Manager.`);
    return <Navigate to="/login" replace />;
  }

  return children;
};

/**
 * Patient Route: Check Firebase auth + patient role + status
 */
const ProtectedPatientRoute = ({ children }) => {
  const { currentUser, token, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  // Check auth exists
  if (!currentUser || !token) return <Navigate to="/login" replace />;

  // Check patient role
  const role = String(currentUser?.role || "").toLowerCase();
  if (role !== "patient") return <Navigate to="/login" replace />;

  // Check patient status
  const status = String(currentUser?.status || "").toLowerCase();
  if (status && status !== "active") {
    alert("Patient account is not active.");
    return <Navigate to="/login" replace />;
  }

  return children;
};

/* ===================== APP ROUTER ===================== */
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/signup/hm" element={<HmSignup />} />

        {/* HM Pending Approval Route */}
        <Route path="/hm/pending" element={<HmPendingApproval />} />

        {/* HM Protected Routes */}
        <Route
          path="/hm/*"
          element={
            <ProtectedHmRoute>
              <HmApp />
            </ProtectedHmRoute>
          }
        />

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/*"
          element={
            <ProtectedAdminRoute>
              <AdminApp />
            </ProtectedAdminRoute>
          }
        />

        {/* Doctor Protected Routes */}
        <Route
          path="/doctor/*"
          element={
            <ProtectedDoctorRoute>
              <DoctorApp />
            </ProtectedDoctorRoute>
          }
        />

        {/* Patient Protected Routes */}
        <Route
          path="/patient/*"
          element={
            <ProtectedPatientRoute>
              <PatientApp />
            </ProtectedPatientRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;