import React from "react";

const STATUS_CONFIG = {
  CREATED: {
    label: "Created",
    background: "#EAF3F8",
    color: "#1769AA",
  },

  SENT: {
    label: "Sent",
    background: "#FFF4D6",
    color: "#946200",
  },

  ACKNOWLEDGED: {
    label: "Acknowledged",
    background: "#E6F7EF",
    color: "#177245",
  },

  ARRIVAL_CONFIRMED: {
    label: "Arrival Confirmed",
    background: "#E7F3FF",
    color: "#1769AA",
  },

  COMPLETED: {
    label: "Completed",
    background: "#DFF5E8",
    color: "#146C43",
  },

  FOLLOW_UP_REQUIRED: {
    label: "Follow-up Required",
    background: "#FDECEC",
    color: "#B42318",
  },
};

const StatusBadge = ({ status }) => {
  const config = STATUS_CONFIG[status] || {
    label: status || "Unknown",
    background: "#EEF2F6",
    color: "#475467",
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0.4rem 0.75rem",
        borderRadius: "999px",
        backgroundColor: config.background,
        color: config.color,
        fontSize: "0.78rem",
        fontWeight: "700",
        lineHeight: 1.2,
        whiteSpace: "nowrap",
      }}
    >
      {config.label}
    </span>
  );
};

export default StatusBadge;