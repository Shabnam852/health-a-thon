import React from "react";
import { useNavigate } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext";

const roles = [
  {
    id: "patient",
    title: "Patient / Caregiver",
    description:
      "View your referral status, journey and next steps.",
    route: "/patient",
  },
  {
    id: "facility",
    title: "Healthcare Facility",
    description:
      "Receive, acknowledge and manage referrals.",
    route: "/facility",
  },
  {
    id: "coordinator",
    title: "Coordinator",
    description:
      "Monitor unresolved referrals and coordinate follow-up.",
    route: "/coordinator",
  },
];

const RoleSelection = () => {
  const navigate = useNavigate();
  const { setRole } = useReferrals();

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole.id);
    navigate(selectedRole.route);
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "4rem 1rem",
        textAlign: "center",
      }}
    >
      {/* Header */}

      <div style={{ marginBottom: "3rem" }}>
        <p
          style={{
            margin: 0,
            color: "#1769AA",
            fontWeight: "700",
            fontSize: "0.9rem",
            letterSpacing: "0.04em",
          }}
        >
          NAVEXA HEALTH
        </p>

        <h1
          style={{
            margin: "0.5rem 0 0.75rem",
            color: "#123B5D",
            fontSize: "2.5rem",
          }}
        >
          Welcome to Navexa
        </h1>

        <p
          style={{
            maxWidth: "650px",
            margin: "0 auto",
            color: "#667085",
            fontSize: "1.05rem",
            lineHeight: 1.6,
          }}
        >
          Choose your role to access the appropriate
          referral experience.
        </p>
      </div>

      {/* Role cards */}

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "20px",
        }}
      >
        {roles.map((roleOption) => (
          <button
            key={roleOption.id}
            type="button"
            onClick={() =>
              handleRoleSelect(roleOption)
            }
            style={{
              textAlign: "left",
              background: "#FFFFFF",
              border: "1px solid #E4E7EC",
              borderRadius: "16px",
              padding: "24px",
              cursor: "pointer",
              boxShadow:
                "0 3px 12px rgba(16, 24, 40, 0.05)",
              transition:
                "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform =
                "translateY(-3px)";
              e.currentTarget.style.boxShadow =
                "0 8px 20px rgba(16, 24, 40, 0.10)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform =
                "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 3px 12px rgba(16, 24, 40, 0.05)";
            }}
          >
            <h2
              style={{
                margin: "0 0 0.6rem",
                color: "#123B5D",
                fontSize: "1.25rem",
              }}
            >
              {roleOption.title}
            </h2>

            <p
              style={{
                margin: 0,
                color: "#667085",
                lineHeight: 1.5,
                fontSize: "0.92rem",
              }}
            >
              {roleOption.description}
            </p>

            <div
              style={{
                marginTop: "1.25rem",
                color: "#1769AA",
                fontWeight: "700",
                fontSize: "0.9rem",
              }}
            >
              Continue →
            </div>
          </button>
        ))}
      </div>

      {/* Demo note */}

      <p
        style={{
          marginTop: "2rem",
          color: "#98A2B3",
          fontSize: "0.8rem",
        }}
      >
        Prototype mode — role selection is simulated for
        demonstration.
      </p>
    </div>
  );
};

export default RoleSelection;