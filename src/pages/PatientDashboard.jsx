import React from "react";
import { useReferrals } from "../context/ReferralContext";

const JOURNEY_STEPS = [
  {
    key: "CREATED",
    label: "Referral Created",
  },
  {
    key: "SENT",
    label: "Referral Sent",
  },
  {
    key: "ACKNOWLEDGED",
    label: "Facility Acknowledged",
  },
  {
    key: "ARRIVAL_CONFIRMED",
    label: "Patient Arrival Confirmed",
  },
  {
    key: "COMPLETED",
    label: "Referral Completed",
  },
];

const getStepIndex = (status) => {
  if (status === "FOLLOW_UP_REQUIRED") {
    return 1;
  }

  const index = JOURNEY_STEPS.findIndex(
    (step) => step.key === status
  );

  return index === -1 ? 0 : index;
};

const getStatusLabel = (status) => {
  switch (status) {
    case "CREATED":
      return "Referral Created";

    case "SENT":
      return "Awaiting Acknowledgement";

    case "ACKNOWLEDGED":
      return "Facility Acknowledged";

    case "ARRIVAL_CONFIRMED":
      return "Arrival Confirmed";

    case "FOLLOW_UP_REQUIRED":
      return "Follow-up Required";

    case "COMPLETED":
      return "Referral Completed";

    default:
      return "Referral In Progress";
  }
};

const getStatusColors = (status) => {
  switch (status) {
    case "FOLLOW_UP_REQUIRED":
      return {
        background: "#FDECEC",
        color: "#B42318",
      };

    case "COMPLETED":
      return {
        background: "#DFF5E8",
        color: "#146C43",
      };

    case "ACKNOWLEDGED":
    case "ARRIVAL_CONFIRMED":
      return {
        background: "#E6F7EF",
        color: "#177245",
      };

    case "SENT":
      return {
        background: "#FFF4D6",
        color: "#9A6700",
      };

    default:
      return {
        background: "#EAF3F8",
        color: "#1769AA",
      };
  }
};

const getStatusMessage = (status) => {
  switch (status) {
    case "CREATED":
      return "Your referral has been created and is being prepared for the receiving facility.";

    case "SENT":
      return "Your referral has been sent. We are waiting for the receiving facility to acknowledge it.";

    case "ACKNOWLEDGED":
      return "The receiving facility has acknowledged your referral. Please follow the next step provided by your care team.";

    case "ARRIVAL_CONFIRMED":
      return "Your arrival at the receiving facility has been confirmed.";

    case "FOLLOW_UP_REQUIRED":
      return "Your referral needs follow-up from a healthcare coordinator. Someone may contact you for assistance.";

    case "COMPLETED":
      return "Your referral journey has been completed.";

    default:
      return "Your referral is being processed.";
  }
};

const PatientDashboard = () => {
  const { referrals } = useReferrals();

  // Simulated logged-in patient for the hardcoded prototype.
  const patientId = "P-1001";

  const myReferrals = referrals.filter(
    (referral) => referral.patientId === patientId
  );

  // Show the most recent active referral.
  const activeReferral =
    myReferrals.find(
      (referral) => referral.status !== "COMPLETED"
    ) || myReferrals[0];

  // Empty state
  if (!activeReferral) {
    return (
      <div
        style={{
          maxWidth: "850px",
          margin: "0 auto",
        }}
      >
        <div style={{ marginBottom: "2rem" }}>
          <p
            style={{
              margin: 0,
              color: "var(--text-muted)",
              fontSize: "0.9rem",
            }}
          >
            Patient / Caregiver
          </p>

          <h2
            style={{
              margin: "0.35rem 0 0.4rem",
            }}
          >
            My Referral
          </h2>

          <p
            style={{
              margin: 0,
              color: "var(--text-muted)",
            }}
          >
            Track your referral journey and see what happens next.
          </p>
        </div>

        <div
          className="card"
          style={{
            textAlign: "center",
            padding: "3rem 2rem",
          }}
        >
          <h3>No Active Referral</h3>

          <p
            style={{
              color: "var(--text-muted)",
              marginTop: "0.75rem",
            }}
          >
            You currently have no active referral.
          </p>
        </div>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(
    activeReferral.status
  );

  const currentStatusColors = getStatusColors(
    activeReferral.status
  );

  const latestEvent =
    activeReferral.timeline &&
    activeReferral.timeline.length > 0
      ? activeReferral.timeline[
          activeReferral.timeline.length - 1
        ]
      : null;

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      {/* ================= HEADER ================= */}

      <div
        style={{
          marginBottom: "2rem",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--text-muted)",
            fontSize: "0.9rem",
          }}
        >
          Patient / Caregiver
        </p>

        <h2
          style={{
            margin: "0.35rem 0 0.4rem",
          }}
        >
          My Referral
        </h2>

        <p
          style={{
            margin: 0,
            color: "var(--text-muted)",
          }}
        >
          Track your referral journey and know what happens next.
        </p>
      </div>

      {/* ================= REFERRAL SUMMARY ================= */}

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
                fontSize: "0.85rem",
              }}
            >
              Referral ID
            </p>

            <h2
              style={{
                margin: "0.3rem 0 0.45rem",
              }}
            >
              {activeReferral.id}
            </h2>

            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
              }}
            >
              {activeReferral.referralType}{" "}
              {activeReferral.priority
                ? `• ${activeReferral.priority}`
                : ""}
            </p>
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              padding: "0.55rem 0.9rem",
              borderRadius: "999px",
              fontWeight: "700",
              fontSize: "0.88rem",
              background: currentStatusColors.background,
              color: currentStatusColors.color,
            }}
          >
            {getStatusLabel(activeReferral.status)}
          </div>
        </div>

        {/* Referral route */}

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
              margin: 0,
              color: "var(--text-muted)",
              fontSize: "0.82rem",
            }}
          >
            Referral Route
          </p>

          <p
            style={{
              margin: "0.35rem 0 0",
              fontWeight: "600",
              lineHeight: 1.5,
            }}
          >
            {activeReferral.fromFacility}
            {" → "}
            {activeReferral.toFacility}
          </p>
        </div>
      </div>

      {/* ================= CURRENT STATUS ================= */}

      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
          borderLeft:
            activeReferral.status === "FOLLOW_UP_REQUIRED"
              ? "4px solid #B42318"
              : "4px solid var(--primary)",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--text-muted)",
            fontSize: "0.82rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontWeight: "700",
          }}
        >
          Current Status
        </p>

        <h3
          style={{
            margin: "0.5rem 0 0.4rem",
          }}
        >
          {getStatusLabel(activeReferral.status)}
        </h3>

        <p
          style={{
            margin: 0,
            color: "var(--text-muted)",
            lineHeight: 1.6,
          }}
        >
          {getStatusMessage(activeReferral.status)}
        </p>

        {latestEvent && (
          <p
            style={{
              marginTop: "0.75rem",
              marginBottom: 0,
              fontSize: "0.82rem",
              color: "var(--text-muted)",
            }}
          >
            Last updated:{" "}
            {new Date(latestEvent.date).toLocaleString()}
          </p>
        )}
      </div>

      {/* ================= REFERRAL JOURNEY ================= */}

      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
        }}
      >
        <h3
          style={{
            marginBottom: "1.5rem",
          }}
        >
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
            const event =
              activeReferral.timeline?.find(
                (item) => item.status === step.key
              );

            const completed =
              activeReferral.status !==
                "FOLLOW_UP_REQUIRED" &&
              index < currentStepIndex;

            const current =
              step.key === activeReferral.status;

            return (
              <div
                key={step.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "35px 1fr",
                  gap: "0.75rem",
                }}
              >
                {/* Step indicator */}

                <div
                  style={{
                    width: "30px",
                    height: "30px",
                    borderRadius: "50%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: completed
                      ? "#DFF5E8"
                      : current
                      ? "#FFF4D6"
                      : "#EEF2F6",
                    color: completed
                      ? "#146C43"
                      : current
                      ? "#9A6700"
                      : "#667085",
                    fontWeight: "700",
                    fontSize: "0.85rem",
                  }}
                >
                  {completed ? "✓" : index + 1}
                </div>

                {/* Step content */}

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
                  <strong>{step.label}</strong>

                  <p
                    style={{
                      margin: "0.25rem 0 0",
                      color: "var(--text-muted)",
                      fontSize: "0.84rem",
                    }}
                  >
                    {event
                      ? new Date(event.date).toLocaleString()
                      : "Pending"}
                  </p>

                  {event?.notes && (
                    <p
                      style={{
                        margin: "0.3rem 0 0",
                        color: "var(--text-muted)",
                        fontSize: "0.82rem",
                        lineHeight: 1.5,
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

        {/* Follow-up notification */}

        {activeReferral.status ===
          "FOLLOW_UP_REQUIRED" && (
          <div
            style={{
              marginTop: "1.25rem",
              padding: "1rem",
              borderRadius: "10px",
              background: "#FFF4F2",
              border: "1px solid #FECACA",
            }}
          >
            <strong
              style={{
                color: "#B42318",
              }}
            >
              Follow-up Required
            </strong>

            <p
              style={{
                margin: "0.4rem 0 0",
                color: "#7A271A",
                fontSize: "0.86rem",
                lineHeight: 1.5,
              }}
            >
              Your referral needs operational assistance.
              A healthcare coordinator may follow up with
              you.
            </p>
          </div>
        )}
      </div>

      {/* ================= NEXT STEP ================= */}

      <div
        className="card"
        style={{
          marginBottom: "1.5rem",
        }}
      >
        <p
          style={{
            margin: 0,
            color: "var(--text-muted)",
            fontSize: "0.82rem",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            fontWeight: "700",
          }}
        >
          What Happens Next?
        </p>

        {activeReferral.status === "SENT" && (
          <>
            <h3 style={{ margin: "0.5rem 0 0.4rem" }}>
              Wait for facility acknowledgement
            </h3>

            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              Your referral has been sent to the receiving
              facility. You will see an update here once it
              is acknowledged.
            </p>
          </>
        )}

        {activeReferral.status === "ACKNOWLEDGED" && (
          <>
            <h3 style={{ margin: "0.5rem 0 0.4rem" }}>
              Proceed to the receiving facility
            </h3>

            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              Your referral has been acknowledged. Follow
              the instructions provided by your care team.
            </p>
          </>
        )}

        {activeReferral.status ===
          "ARRIVAL_CONFIRMED" && (
          <>
            <h3 style={{ margin: "0.5rem 0 0.4rem" }}>
              Your arrival has been recorded
            </h3>

            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              The receiving facility has confirmed your
              arrival. Your referral remains active until
              the required service is completed.
            </p>
          </>
        )}

        {activeReferral.status ===
          "FOLLOW_UP_REQUIRED" && (
          <>
            <h3 style={{ margin: "0.5rem 0 0.4rem" }}>
              Human assistance is being coordinated
            </h3>

            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              A coordinator can help with the operational
              issue affecting your referral.
            </p>
          </>
        )}

        {activeReferral.status === "COMPLETED" && (
          <>
            <h3 style={{ margin: "0.5rem 0 0.4rem" }}>
              Referral journey completed
            </h3>

            <p
              style={{
                margin: 0,
                color: "var(--text-muted)",
                lineHeight: 1.5,
              }}
            >
              The referral has been marked as completed.
            </p>
          </>
        )}
      </div>

      {/* ================= PATIENT HELP ================= */}

      <div
        className="card"
        style={{
          marginBottom: "2rem",
        }}
      >
        <h3>Need Help?</h3>

        <p
          style={{
            color: "var(--text-muted)",
            lineHeight: 1.6,
            marginBottom: "1rem",
          }}
        >
          Get help with referral navigation or request
          human assistance if something is blocking your
          journey.
        </p>

        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
          }}
        >
          <button
            type="button"
            className="btn"
            onClick={() =>
              alert(
                "Human assistance requested. A coordinator can follow up."
              )
            }
          >
            Request Human Help
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              alert(
                `Demo navigation to ${activeReferral.toFacility}`
              )
            }
          >
            Get Directions
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;