import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import RoleSelection from './pages/RoleSelection.jsx'
import CreateReferral from './pages/CreateReferral.jsx'
import PatientDashboard from './pages/PatientDashboard.jsx'
import FacilityDashboard from './pages/FacilityDashboard.jsx'
import CoordinatorDashboard from './pages/CoordinatorDashboard.jsx'
import ReferralDetails from './pages/ReferralDetails.jsx'

function App() {
  return (
    <div className="app-container">
      <Navbar />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<RoleSelection />} />
          <Route path="/create" element={<CreateReferral />} />
          <Route path="/patient" element={<PatientDashboard />} />
          <Route path="/facility" element={<FacilityDashboard />} />
          <Route path="/coordinator" element={<CoordinatorDashboard />} />
          <Route path="/referral/:id" element={<ReferralDetails />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
