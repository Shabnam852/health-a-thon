import React from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";

const Navbar = () => {
  const { role, logout } = useReferrals();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinkClass = ({ isActive }) =>
    `nav-link ${isActive ? "nav-link-active" : ""}`;

  return (
    <header className="nav-shell">
      <div className="nav-inner">

        {/* Brand */}
        <Link to="/" className="nav-brand">
          <div className="nav-brand-mark">
            N
          </div>

          <div className="nav-brand-text">
            <div className="nav-brand-title">Navexa</div>
            <div className="nav-brand-subtitle">Health</div>
          </div>
        </Link>

        {/* Navigation */}
        {role && (
          <nav className="nav-links">

            {role === "patient" && (
              <>
                <NavLink to="/patient" className={navLinkClass}>
                  Dashboard
                </NavLink>

                <button
                  className="nav-help-btn"
                  onClick={() =>
                    window.alert(
                      "Human support request created.\nA care coordinator will follow up."
                    )
                  }
                >
                  Need Help?
                </button>
              </>
            )}

            {role === "facility" && (
              <>
                <NavLink to="/facility" className={navLinkClass}>
                  Dashboard
                </NavLink>

                <NavLink to="/create" className="nav-new-referral">
                  + New Referral
                </NavLink>
              </>
            )}

            {role === "coordinator" && (
              <NavLink to="/coordinator" className={navLinkClass}>
                Operations
              </NavLink>
            )}

            <div className="nav-divider" />

            <div className="nav-role-pill">
              <span className="nav-role-dot" />
              {role === "patient" && "Patient"}
              {role === "facility" && "Healthcare Facility"}
              {role === "coordinator" && "Coordinator"}
            </div>

            <button
              className="nav-switch-btn"
              onClick={handleLogout}
            >
              Switch Role
            </button>

          </nav>
        )}

      </div>
    </header>
  );
};

export default Navbar;