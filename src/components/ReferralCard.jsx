import React from "react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";

const ReferralCard = ({ referral }) => {
  if (!referral) {
    return null;
  }

  return (
    <div
      className="card"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        height: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              fontSize: "0.78rem",
              color: "var(--text-muted)",
            }}
          >
            Referral ID
          </p>

          <h3
            style={{
              margin: "0.2rem 0 0.25rem",
            }}
          >
            {referral.id}
          </h3>

          <p
            style={{
              margin: 0,
              fontSize: "0.9rem",
              color: "var(--text-muted)",
            }}
          >
            {referral.patientName}
          </p>
        </div>

        <StatusBadge status={referral.status} />
      </div>

      {/* Referral information */}
      <div
        style={{
          display: "grid",
          gap: "0.55rem",
          fontSize: "0.9rem",
        }}
      >
        <div>
          <span style={{ color: "var(--text-muted)" }}>
            Patient ID
          </span>
          <div style={{ fontWeight: "600" }}>
            {referral.patientId}
          </div>
        </div>

        <div>
          <span style={{ color: "var(--text-muted)" }}>
            Referral Type
          </span>
          <div style={{ fontWeight: "600" }}>
            {referral.referralType || "Maternal & Child Health"}
          </div>
        </div>

        <div>
          <span style={{ color: "var(--text-muted)" }}>
            Priority
          </span>
          <div style={{ fontWeight: "600" }}>
            {referral.priority || "Routine"}
          </div>
        </div>

        <div>
          <span style={{ color: "var(--text-muted)" }}>
            From
          </span>
          <div style={{ fontWeight: "600" }}>
            {referral.fromFacility}
          </div>
        </div>

        <div>
          <span style={{ color: "var(--text-muted)" }}>
            To
          </span>
          <div style={{ fontWeight: "600" }}>
            {referral.toFacility}
          </div>
        </div>
      </div>

      {/* Referral information */}
      <div
        style={{
          padding: "0.85rem",
          borderRadius: "10px",
          background: "var(--bg-color)",
          fontSize: "0.88rem",
          lineHeight: "1.5",
          color: "var(--text-muted)",
        }}
      >
        {referral.reason ||
          "Referral created for further care at the receiving facility."}
      </div>

      {/* Footer */}
      <div
        style={{
          marginTop: "auto",
          paddingTop: "0.75rem",
          borderTop: "1px solid #E4E7EC",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            fontSize: "0.78rem",
            color: "var(--text-muted)",
          }}
        >
          Created{" "}
          {referral.createdAt
            ? new Date(referral.createdAt).toLocaleDateString()
            : "—"}
        </span>

        <Link
          to={`/referral/${referral.id}`}
          className="btn"
          style={{
            padding: "0.45rem 0.85rem",
            fontSize: "0.84rem",
          }}
        >
          View Referral
        </Link>
      </div>
    </div>
  );
};

export default ReferralCard;