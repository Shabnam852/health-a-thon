import React from "react";
import { NavLink, Link } from "react-router-dom";

const Navbar = () => {
  const getLinkStyle = ({ isActive }) => ({
    textDecoration: "none",
    color: isActive ? "#1769AA" : "#344054",
    fontWeight: isActive ? "700" : "500",
    transition: "0.2s ease",
  });

  return (
    <header
      style={{
        background: "#ffffff",
        borderBottom: "1px solid #E4E7EC",
        position: "sticky",
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "1rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5rem",
        }}
      >
        {/* Brand */}
        <Link
          to="/"
          style={{
            textDecoration: "none",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "10px",
              background: "linear-gradient(135deg, #1769AA, #1F9D8B)",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.15rem",
              fontWeight: "800",
            }}
          >
            N
          </div>

          <div>
            <div
              style={{
                color: "#123B5D",
                fontSize: "1.35rem",
                fontWeight: "800",
                lineHeight: 1,
              }}
            >
              Navexa
            </div>

            <div
              style={{
                color: "#1F8A8A",
                fontSize: "0.8rem",
                fontWeight: "600",
                marginTop: "2px",
              }}
            >
              Health
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: "1.5rem",
            flexWrap: "wrap",
          }}
        >
          <NavLink to="/patient" style={getLinkStyle}>
            Patient
          </NavLink>

          <NavLink to="/facility" style={getLinkStyle}>
            Facility
          </NavLink>

          <NavLink to="/coordinator" style={getLinkStyle}>
            Coordinator
          </NavLink>

          <Link
            to="/create"
            style={{
              textDecoration: "none",
              background: "#1769AA",
              color: "#ffffff",
              padding: "0.7rem 1.1rem",
              borderRadius: "9px",
              fontWeight: "700",
              fontSize: "0.9rem",
            }}
          >
            + New Referral
          </Link>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;