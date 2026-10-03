import React from "react";
import {
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

import RoleSelection from "./pages/RoleSelection.jsx";
import CreateReferral from "./pages/CreateReferral.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import FacilityDashboard from "./pages/FacilityDashboard.jsx";
import CoordinatorDashboard from "./pages/CoordinatorDashboard.jsx";
import ReferralDetails from "./pages/ReferralDetails.jsx";

import { useReferrals } from "./context/ReferralContext.jsx";

// --------------------------------------------------
// Protected Route
// --------------------------------------------------

const ProtectedRoute = ({
  allowedRoles,
  children,
}) => {
  const { role } = useReferrals();
  const location = useLocation();

  // No selected role
  if (!role) {
    return (
      <Navigate
        to="/"
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  // Role not allowed
  if (!allowedRoles.includes(role)) {
    const fallbackRoutes = {
      patient: "/patient",
      facility: "/facility",
      coordinator: "/coordinator",
    };

    return (
      <Navigate
        to={fallbackRoutes[role] || "/"}
        replace
      />
    );
  }

  return children;
};

// --------------------------------------------------
// App
// --------------------------------------------------

function App() {
  return (
    <div className="app-container">
      <Navbar />

      <main className="page-container">
        <Routes>

          {/* PUBLIC */}
          <Route
            path="/"
            element={<RoleSelection />}
          />

          {/* PATIENT */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={["patient"]}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />

          {/* FACILITY */}
          <Route
            path="/facility"
            element={
              <ProtectedRoute allowedRoles={["facility"]}>
                <FacilityDashboard />
              </ProtectedRoute>
            }
          />

          {/* COORDINATOR */}
          <Route
            path="/coordinator"
            element={
              <ProtectedRoute
                allowedRoles={["coordinator"]}
              >
                <CoordinatorDashboard />
              </ProtectedRoute>
            }
          />

          {/* CREATE REFERRAL */}
          <Route
            path="/create"
            element={
              <ProtectedRoute
                allowedRoles={["facility"]}
              >
                <CreateReferral />
              </ProtectedRoute>
            }
          />

          {/* INTERNAL REFERRAL DETAILS */}
          <Route
            path="/referral/:id"
            element={
              <ProtectedRoute
                allowedRoles={[
                  "facility",
                  "coordinator",
                ]}
              >
                <ReferralDetails />
              </ProtectedRoute>
            }
          />

          {/* FALLBACK */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Routes>
      </main>
    </div>
  );
}

export default App;