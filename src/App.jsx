import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import AppShell from "./components/AppShell.jsx";
import RoleSelection from "./pages/RoleSelection.jsx";
import CoordinatorDashboard from "./pages/CoordinatorDashboard.jsx";
import ReferralDetails from "./pages/ReferralDetails.jsx";
import BarrierResolution from "./pages/BarrierResolution.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import FacilityDashboard from "./pages/FacilityDashboard.jsx";
import CreateReferral from "./pages/CreateReferral.jsx";
import NetworkView from "./pages/NetworkView.jsx";
import TransportCoordination from "./pages/TransportCoordination.jsx";
import ContinuityOfCare from "./pages/ContinuityOfCare.jsx";
import NavigatorWorkspace from "./pages/NavigatorWorkspace.jsx";
import NotFound from "./pages/NotFound.jsx";
import { useReferrals } from "./context/ReferralContext.jsx";
import { RoleId, getRoleDefinition } from "./config/navigationConfig.js";

// There is no standalone list page, so /referrals opens the role's own queue.
const ReferralsRedirect = () => {
  const { role } = useReferrals();
  const queues = { [RoleId.COORDINATOR]: "/coordinator?view=queue", [RoleId.FACILITY]: "/facility?tab=pending" };
  return <Navigate to={queues[role] || getRoleDefinition(role).homePath} replace />;
};

function App() {
  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface antialiased">
      <Routes>
        {/* PUBLIC ROLE SELECTION */}
        <Route path="/" element={<RoleSelection />} />

        {/* WORKSPACE ROUTES (Wrapped in Stitch AppShell) */}
        <Route
          path="/coordinator"
          element={
            <AppShell>
              <CoordinatorDashboard />
            </AppShell>
          }
        />

        <Route
          path="/navigator"
          element={
            <AppShell>
              <NavigatorWorkspace />
            </AppShell>
          }
        />

        <Route
          path="/referral/:id"
          element={
            <AppShell>
              <ReferralDetails />
            </AppShell>
          }
        />

        <Route
          path="/referrals"
          element={<ReferralsRedirect />}
        />

        <Route
          path="/barriers"
          element={
            <AppShell>
              <BarrierResolution />
            </AppShell>
          }
        />

        <Route
          path="/transport"
          element={
            <AppShell>
              <TransportCoordination />
            </AppShell>
          }
        />

        <Route
          path="/facility"
          element={
            <AppShell>
              <FacilityDashboard />
            </AppShell>
          }
        />

        <Route
          path="/create"
          element={
            <AppShell>
              <CreateReferral />
            </AppShell>
          }
        />

        <Route
          path="/patient"
          element={
            <AppShell>
              <PatientDashboard />
            </AppShell>
          }
        />

        <Route
          path="/continuity"
          element={
            <AppShell>
              <ContinuityOfCare />
            </AppShell>
          }
        />

        <Route
          path="/network"
          element={
            <AppShell>
              <NetworkView />
            </AppShell>
          }
        />

        {/* 404 NOT FOUND ROUTE */}
        <Route
          path="*"
          element={
            <AppShell>
              <NotFound />
            </AppShell>
          }
        />
      </Routes>
    </div>
  );
}

export default App;
