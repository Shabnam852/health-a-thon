import React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext";

const STATUS_LABELS = {
  CREATED: "Referral Created",
  SENT: "Referral Sent",
  ACKNOWLEDGED: "Facility Acknowledged",
  ARRIVAL_CONFIRMED: "Arrival Confirmed",
  COMPLETED: "Referral Completed",
  FOLLOW_UP_REQUIRED: "Follow-up Required",
};

const STATUS_STYLES = {
  CREATED: {
    background: "#E8F4FF",
    color: "#1769AA",
  },
  SENT: {
    background: "#FFF4D6",
    color: "#9A6700",
  },
  ACKNOWLEDGED: {
    background: "#E6F7EF",
    color: "#177245",
  },
  ARRIVAL_CONFIRMED: {
    background: "#E6F7EF",
    color: "#177245",
  },
  COMPLETED: {
    background: "#DFF5E8",
    color: "#146C43",
  },
  FOLLOW_UP_REQUIRED: {
    background: "#FDECEC",
    color: "#B42318",
  },
};

const JOURNEY_STEPS = [
  "CREATED",
  "SENT",
  "ACKNOWLEDGED",
  "ARRIVAL_CONFIRMED",
  "COMPLETED",
];

const getCurrentStepIndex = (status) => {
  if (status === "FOLLOW_UP_REQUIRED") {
    return 1;
  }

  return JOURNEY_STEPS.indexOf(status);
};

const getNextAction = (status) => {
  switch (status) {
    case "CREATED":
      return {
        title: "Send Referral",
        description: "The referral has been created and is ready to be sent.",
        action: "send",
      };

    case "SENT":
      return {
        title: "Awaiting Facility Acknowledgement",
        description:
          "The receiving facility has not yet acknowledged this referral.",
        action: "acknowledge",
      };

    case "ACKNOWLEDGED":
      return {
        title: "Awaiting Patient Arrival",
        description:
          "The receiving facility has acknowledged the referral. Arrival can be confirmed when the patient reaches the facility.",
        action: "arrival",
      };

    case "ARRIVAL_CONFIRMED":
      return {
        title: "Care / Service in Progress",
        description:
          "Arrival has been confirmed. The referral can be completed once the requested service is finished.",
        action: "complete",
      };

    case "FOLLOW_UP_REQUIRED":
      return {
        title: "Human Follow-up Required",
        description:
          "The referral needs operational follow-up by an authorised coordinator or healthcare worker.",
        action: "followup",
      };

    case "COMPLETED":
      return {
        title: "Referral Closed",
        description:
          "The referral journey has been completed and the case is closed.",
        action: "none",
      };

    default:
      return {
        title: "Status Unknown",
        description: "Please review the referral.",
        action: "none",
      };
  }
};

const ReferralDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    getReferralById,
    updateReferralStatus,
  } = useReferrals();

  const referral = getReferralById(id);

  if (!referral) {
    return (
      <div
        style={{
          maxWidth: "700px",
          margin: "4rem auto",
          padding: "2rem",
          textAlign: "center",
        }}
      >
        <h2>Referral Not Found</h2>

        <p
          style={{
            color: "var(--text-muted)",
            marginTop: "0.75rem",
          }}
        >
          The referral you're looking for does not exist in the demo data.
        </p>

        <button
          onClick={() => navigate(-1)}
          className="btn"
          style={{ marginTop: "1.5rem" }}
        >
          ← Go Back
        </button>
      </div>
    );
  }

  const nextAction = getNextAction(referral.status);
  const currentStepIndex = getCurrentStepIndex(referral.status);

  const performAction = () => {
    switch (nextAction.action) {
      case "send":
        updateReferralStatus(
          referral.id,
          "SENT",
          "Referral sent to the receiving facility."
        );
        break;

      case "acknowledge":
        updateReferralStatus(
          referral.id,
          "ACKNOWLEDGED",
          "Receiving facility acknowledged the referral."
        );
        break;

      case "arrival":
        updateReferralStatus(
          referral.id,
          "ARRIVAL_CONFIRMED",
          "Patient arrival confirmed by the receiving facility."
        );
        break;

      case "complete":
        updateReferralStatus(
          referral.id,
          "COMPLETED",
          "Requested service completed and referral closed."
        );
        break;

      case "followup":
        updateReferralStatus(
          referral.id,
          "ACKNOWLEDGED",
          "Coordinator completed the operational follow-up and the receiving facility acknowledged the referral."
        );
        break;

      default:
        break;
    }
  };

  const handleFollowUp = () => {
    updateReferralStatus(
      referral.id,
      "FOLLOW_UP_REQUIRED",
      "Referral requires operational follow-up because acknowledgement has not been received."
    );
  };

  return (
    <div
      style={{
        maxWidth: "950px",
        margin: "0 auto",
      }}
    >
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="btn btn-secondary"
        style={{
          marginBottom: "1.5rem",
        }}
      >
        ← Back
      </button>

      {/* Header */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "1rem",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.9rem",
              }}
            >
              Referral ID
            </p>

            <h1
              style={{
                margin: "0.3rem 0 0.5rem",
                fontSize: "2rem",
              }}
            >
              {referral.id}
            </h1>

            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
              }}
            >
              Created on{" "}
              {new Date(referral.createdAt).toLocaleDateString()}
            </p>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.55rem 0.9rem",
              borderRadius: "999px",
              fontWeight: "700",
              fontSize: "0.9rem",
              background:
                STATUS_STYLES[referral.status]?.background || "#EEF2F6",
              color:
                STATUS_STYLES[referral.status]?.color || "#475467",
            }}
          >
            {STATUS_LABELS[referral.status] || referral.status}
          </div>
        </div>
      </div>

      {/* Referral Information */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginBottom: "1.25rem" }}>
          Referral Information
        </h3>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.25rem",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Patient
            </p>

            <strong>{referral.patientName}</strong>
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Patient ID
            </p>

            <strong>{referral.patientId}</strong>
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Referral Type
            </p>

            <strong>{referral.referralType}</strong>
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Priority
            </p>

            <strong>{referral.priority}</strong>
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Referring Facility
            </p>

            <strong>{referral.fromFacility}</strong>
          </div>

          <div>
            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                fontSize: "0.85rem",
              }}
            >
              Receiving Facility
            </p>

            <strong>{referral.toFacility}</strong>
          </div>
        </div>

        <div
          style={{
            marginTop: "1.5rem",
            padding: "1rem",
            borderRadius: "10px",
            background: "var(--bg-color)",
          }}
        >
          <p
            style={{
              margin: "0 0 0.35rem",
              color: "var(--text-muted)",
              fontSize: "0.85rem",
            }}
          >
            Referral Information
          </p>

          <p style={{ margin: 0 }}>
            {referral.reason}
          </p>
        </div>
      </div>

      {/* Current Next Action */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
          borderLeft:
            referral.status === "FOLLOW_UP_REQUIRED"
              ? "4px solid #B42318"
              : "4px solid var(--primary)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--text-muted)",
            fontSize: "0.85rem",
            fontWeight: "600",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          What Happens Next
        </p>

        <h3 style={{ margin: "0.5rem 0 0.4rem" }}>
          {nextAction.title}
        </h3>

        <p
          style={{
            margin: 0,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          {nextAction.description}
        </p>

        {/* Main action */}
        {nextAction.action !== "none" && (
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              marginTop: "1.25rem",
            }}
          >
            <button
              className="btn"
              onClick={performAction}
            >
              {nextAction.action === "send" &&
                "Send Referral"}

              {nextAction.action === "acknowledge" &&
                "Acknowledge Referral"}

              {nextAction.action === "arrival" &&
                "Confirm Patient Arrival"}

              {nextAction.action === "complete" &&
                "Complete Referral"}

              {nextAction.action === "followup" &&
                "Mark Follow-up Resolved"}
            </button>

            {referral.status === "SENT" && (
              <button
                className="btn btn-secondary"
                onClick={handleFollowUp}
              >
                Flag for Follow-up
              </button>
            )}
          </div>
        )}
      </div>

      {/* Referral Journey */}
      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
        }}
      >
        <h3 style={{ marginBottom: "1.5rem" }}>
          Referral Journey
        </h3>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.9rem",
          }}
        >
          {JOURNEY_STEPS.map((step, index) => {
            const event = referral.timeline.find(
              (item) => item.status === step
            );

            const isCompleted =
              index <= currentStepIndex &&
              referral.status !== "FOLLOW_UP_REQUIRED";

            const isCurrent =
              referral.status === step;

            return (
              <div
                key={step}
                style={{
                  display: "grid",
                  gridTemplateColumns: "35px 1fr",
                  gap: "0.75rem",
                  alignItems: "start",
                }}
              >
                {/* Circle */}
                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    background: isCompleted
                      ? "#DFF5E8"
                      : isCurrent
                      ? "#FFF4D6"
                      : "#EEF2F6",
                    color: isCompleted
                      ? "#146C43"
                      : isCurrent
                      ? "#9A6700"
                      : "#667085",
                  }}
                >
                  {isCompleted ? "✓" : index + 1}
                </div>

                <div
                  style={{
                    paddingBottom:
                      index === JOURNEY_STEPS.length - 1
                        ? 0
                        : "0.8rem",
                    borderBottom:
                      index === JOURNEY_STEPS.length - 1
                        ? "none"
                        : "1px solid #E8EDF2",
                  }}
                >
                  <strong>
                    {STATUS_LABELS[step]}
                  </strong>

                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      color: "var(--text-muted)",
                      fontSize: "0.88rem",
                    }}
                  >
                    {event
                      ? new Date(event.date).toLocaleString()
                      : "Pending"}
                  </p>

                  {event?.notes && (
                    <p
                      style={{
                        margin: "0.35rem 0 0",
                        color: "var(--text-muted)",
                        fontSize: "0.86rem",
                      }}
                    >
                      {event.notes}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Exception message */}
        {referral.status === "FOLLOW_UP_REQUIRED" && (
          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              borderRadius: "10px",
              background: "#FFF4F2",
              border: "1px solid #FECACA",
            }}
          >
            <strong style={{ color: "#B42318" }}>
              Follow-up required
            </strong>

            <p
              style={{
                margin: "0.4rem 0 0",
                color: "#7A271A",
                fontSize: "0.9rem",
              }}
            >
              The referral is unresolved and requires human
              operational follow-up.
            </p>
          </div>
        )}
      </div>

      {/* Quick navigation */}
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
        }}
      >
        <Link to="/patient" className="btn btn-secondary">
          Patient View
        </Link>

        <Link to="/facility" className="btn btn-secondary">
          Facility View
        </Link>

        <Link to="/coordinator" className="btn btn-secondary">
          Coordinator View
        </Link>
      </div>
    </div>
  );
};

export default ReferralDetails;