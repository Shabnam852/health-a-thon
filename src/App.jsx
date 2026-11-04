import { useEffect, useRef } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";

import AppShell from "./components/AppShell.jsx";
import { ASSISTANT_PATH } from "./components/assistant/AssistantLauncher.jsx";
import { getRoleDefinition, RoleId } from "./config/navigationConfig.js";
import { useReferrals } from "./context/ReferralContext.jsx";
import AssistantScreen from "./pages/AssistantScreen.jsx";
import ContinuityOfCare from "./pages/ContinuityOfCare.jsx";
import CoordinatorDashboard from "./pages/CoordinatorDashboard.jsx";
import CreateReferral from "./pages/CreateReferral.jsx";
import FacilityDashboard from "./pages/FacilityDashboard.jsx";
import NetworkView from "./pages/NetworkView.jsx";
import NotFound from "./pages/NotFound.jsx";
import PatientDashboard from "./pages/PatientDashboard.jsx";
import Patients from "./pages/Patients.jsx";
import ReferralDetails from "./pages/ReferralDetails.jsx";
import RoleSelection from "./pages/RoleSelection.jsx";
import TransportCoordination from "./pages/TransportCoordination.jsx";

// There is no standalone list page, so /referrals opens the role's own queue.
const ReferralsRedirect = () => {
  const { role } = useReferrals();
  const queues = { [RoleId.COORDINATOR]: "/patients", [RoleId.FACILITY]: "/facility?tab=pending" };
  return <Navigate to={queues[role] || getRoleDefinition(role).homePath} replace />;
};

// On a new screen: name it in the tab, start at the top, and move focus to it so
// screen readers announce it. During the guided demo focus stays on the Next button.
const useScreenChange = () => {
  const { pathname, search } = useLocation();
  const { storyStep } = useReferrals();
  // ?view= switches between a workspace's screens. Other parameters only filter the one on show.
  const screen = `${pathname}?${new URLSearchParams(search).get("view") ?? ""}`;
  const lastScreen = useRef(screen);

  // Runs after every render: the heading can change with no change of URL, as on a role switch.
  useEffect(() => {
    // biome-ignore lint/performance/useDomNodeTextContent: innerText leaves out text hidden from the reader.
    const heading = document.querySelector("h1")?.innerText;
    document.title = heading ? `${heading} | Navexa Health` : "Navexa Health";
  });

  useEffect(() => {
    if (lastScreen.current === screen) return;
    lastScreen.current = screen;
    window.scrollTo(0, 0);
    if (storyStep === null) document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [screen, storyStep]);
};

function App() {
  useScreenChange();

  return (
    <div className="min-h-screen bg-canvas  text-ink antialiased">
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
          path="/patients"
          element={
            <AppShell>
              <Patients />
            </AppShell>
          }
        />
        {/* Queue, Caseload and Barriers are now tabs of Patients. */}
        <Route path="/navigator" element={<Navigate to="/patients" replace />} />
        <Route path="/barriers" element={<Navigate to="/patients?show=blocked" replace />} />

        <Route
          path="/referral/:id"
          element={
            <AppShell>
              <ReferralDetails />
            </AppShell>
          }
        />

        <Route path="/referrals" element={<ReferralsRedirect />} />

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
          path={ASSISTANT_PATH}
          element={
            <AppShell>
              <AssistantScreen />
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
