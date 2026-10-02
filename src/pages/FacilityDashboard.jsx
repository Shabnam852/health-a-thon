import React from "react";
import { Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext";

const FacilityDashboard = () => {
  const {
    referrals,
    updateReferralStatus,
  } = useReferrals();

  // Simulated logged-in facility
  const facilityName = "District Hospital";

  const incomingReferrals = referrals.filter(
    (referral) => referral.toFacility === facilityName
  );

  const outgoingReferrals = referrals.filter(
    (referral) => referral.fromFacility === facilityName
  );

  const handleAcknowledge = (id) => {
    updateReferralStatus(
      id,
      "ACKNOWLEDGED",
      "Receiving facility acknowledged the referral."
    );
  };

  const handleArrival = (id) => {
    updateReferralStatus(
      id,
      "ARRIVAL_CONFIRMED",
      "Patient arrival confirmed by the receiving facility."
    );
  };

  const handleComplete = (id) => {
    updateReferralStatus(
      id,
      "COMPLETED",
      "Requested service completed and referral closed."
    );
  };

  const handleFollowUp = (id) => {
    updateReferralStatus(
      id,
      "FOLLOW_UP_REQUIRED",
      "Referral requires operational follow-up."
    );
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case "CREATED":
        return "Created";
      case "SENT":
        return "Sent";
      case "ACKNOWLEDGED":
        return "Acknowledged";
      case "ARRIVAL_CONFIRMED":
        return "Arrival Confirmed";
      case "COMPLETED":
        return "Completed";
      case "FOLLOW_UP_REQUIRED":
        return "Follow-up Required";
      default:
        return status;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "COMPLETED":
        return "#146C43";
      case "ACKNOWLEDGED":
      case "ARRIVAL_CONFIRMED":
        return "#177245";
      case "FOLLOW_UP_REQUIRED":
        return "#B42318";
      case "SENT":
        return "#946200";
      default:
        return "#1769AA";
    }
  };

  return (
    <div
      style={{
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "20px",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "30px",
          flexWrap: "wrap",
          gap: "15px",
        }}
      >
        <div>
          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "14px",
            }}
          >
            Healthcare Facility
          </p>

          <h1
            style={{
              margin: "6px 0",
              color: "#123B5D",
            }}
          >
            {facilityName}
          </h1>

          <p
            style={{
              margin: 0,
              color: "#667085",
            }}
          >
            Manage incoming and outgoing referrals
          </p>
        </div>

        <Link
          to="/create"
          style={{
            background: "#1769AA",
            color: "#fff",
            textDecoration: "none",
            padding: "12px 18px",
            borderRadius: "8px",
            fontWeight: "600",
          }}
        >
          + New Referral
        </Link>
      </div>

      {/* SUMMARY */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "15px",
          marginBottom: "35px",
        }}
      >
        <div
          style={{
            background: "#fff",
            border: "1px solid #E4E7EC",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "14px",
            }}
          >
            Incoming Referrals
          </p>

          <h2
            style={{
              margin: "8px 0 0",
              color: "#123B5D",
            }}
          >
            {incomingReferrals.length}
          </h2>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #E4E7EC",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "14px",
            }}
          >
            Outgoing Referrals
          </p>

          <h2
            style={{
              margin: "8px 0 0",
              color: "#123B5D",
            }}
          >
            {outgoingReferrals.length}
          </h2>
        </div>

        <div
          style={{
            background: "#fff",
            border: "1px solid #E4E7EC",
            borderRadius: "12px",
            padding: "20px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#667085",
              fontSize: "14px",
            }}
          >
            Needs Attention
          </p>

          <h2
            style={{
              margin: "8px 0 0",
              color: "#B42318",
            }}
          >
            {
              incomingReferrals.filter(
                (referral) =>
                  referral.status === "SENT" ||
                  referral.status === "FOLLOW_UP_REQUIRED"
              ).length
            }
          </h2>
        </div>
      </div>

      {/* INCOMING */}
      <section style={{ marginBottom: "40px" }}>
        <h2
          style={{
            color: "#123B5D",
            marginBottom: "5px",
          }}
        >
          Incoming Referrals
        </h2>

        <p
          style={{
            color: "#667085",
            marginTop: 0,
            marginBottom: "20px",
          }}
        >
          Referrals sent to {facilityName}
        </p>

        {incomingReferrals.length === 0 ? (
          <div
            style={{
              border: "1px dashed #D0D5DD",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              color: "#667085",
            }}
          >
            No incoming referrals.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {incomingReferrals.map((referral) => (
              <div
                key={referral.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E4E7EC",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow:
                    "0 2px 8px rgba(16, 24, 40, 0.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "12px",
                        color: "#667085",
                      }}
                    >
                      Referral ID
                    </p>

                    <h3
                      style={{
                        margin: "4px 0",
                        color: "#123B5D",
                      }}
                    >
                      {referral.id}
                    </h3>
                  </div>

                  <span
                    style={{
                      padding: "6px 10px",
                      borderRadius: "999px",
                      background: "#F2F4F7",
                      color: getStatusColor(
                        referral.status
                      ),
                      fontSize: "12px",
                      fontWeight: "700",
                    }}
                  >
                    {getStatusLabel(referral.status)}
                  </span>
                </div>

                <div
                  style={{
                    marginTop: "18px",
                    lineHeight: "1.7",
                    color: "#344054",
                  }}
                >
                  <p>
                    <strong>Patient:</strong>{" "}
                    {referral.patientName}
                  </p>

                  <p>
                    <strong>Type:</strong>{" "}
                    {referral.referralType}
                  </p>

                  <p>
                    <strong>Priority:</strong>{" "}
                    {referral.priority}
                  </p>

                  <p>
                    <strong>From:</strong>{" "}
                    {referral.fromFacility}
                  </p>

                  <p>
                    <strong>To:</strong>{" "}
                    {referral.toFacility}
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    flexWrap: "wrap",
                    marginTop: "18px",
                  }}
                >
                  <Link
                    to={`/referral/${referral.id}`}
                    style={{
                      padding: "9px 12px",
                      borderRadius: "7px",
                      background: "#EEF6FB",
                      color: "#1769AA",
                      textDecoration: "none",
                      fontSize: "13px",
                      fontWeight: "600",
                    }}
                  >
                    View Details
                  </Link>

                  {referral.status === "SENT" && (
                    <button
                      onClick={() =>
                        handleAcknowledge(referral.id)
                      }
                      style={{
                        border: "none",
                        padding: "9px 12px",
                        borderRadius: "7px",
                        background: "#1769AA",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Acknowledge
                    </button>
                  )}

                  {referral.status ===
                    "ACKNOWLEDGED" && (
                    <button
                      onClick={() =>
                        handleArrival(referral.id)
                      }
                      style={{
                        border: "none",
                        padding: "9px 12px",
                        borderRadius: "7px",
                        background: "#177245",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Confirm Arrival
                    </button>
                  )}

                  {referral.status ===
                    "ARRIVAL_CONFIRMED" && (
                    <button
                      onClick={() =>
                        handleComplete(referral.id)
                      }
                      style={{
                        border: "none",
                        padding: "9px 12px",
                        borderRadius: "7px",
                        background: "#146C43",
                        color: "#fff",
                        cursor: "pointer",
                        fontWeight: "600",
                      }}
                    >
                      Complete Referral
                    </button>
                  )}

                  {referral.status !== "COMPLETED" &&
                    referral.status !==
                      "FOLLOW_UP_REQUIRED" && (
                      <button
                        onClick={() =>
                          handleFollowUp(referral.id)
                        }
                        style={{
                          border:
                            "1px solid #FECACA",
                          padding: "9px 12px",
                          borderRadius: "7px",
                          background: "#FFF4F2",
                          color: "#B42318",
                          cursor: "pointer",
                          fontWeight: "600",
                        }}
                      >
                        Flag
                      </button>
                    )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* OUTGOING */}
      <section>
        <h2
          style={{
            color: "#123B5D",
            marginBottom: "5px",
          }}
        >
          Outgoing Referrals
        </h2>

        <p
          style={{
            color: "#667085",
            marginTop: 0,
            marginBottom: "20px",
          }}
        >
          Referrals sent from {facilityName}
        </p>

        {outgoingReferrals.length === 0 ? (
          <div
            style={{
              border: "1px dashed #D0D5DD",
              borderRadius: "12px",
              padding: "30px",
              textAlign: "center",
              color: "#667085",
            }}
          >
            No outgoing referrals.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(300px, 1fr))",
              gap: "20px",
            }}
          >
            {outgoingReferrals.map((referral) => (
              <div
                key={referral.id}
                style={{
                  background: "#fff",
                  border: "1px solid #E4E7EC",
                  borderRadius: "12px",
                  padding: "20px",
                  boxShadow:
                    "0 2px 8px rgba(16, 24, 40, 0.06)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "12px",
                    color: "#667085",
                  }}
                >
                  Referral ID
                </p>

                <h3
                  style={{
                    margin: "4px 0",
                    color: "#123B5D",
                  }}
                >
                  {referral.id}
                </h3>

                <p>
                  <strong>Patient:</strong>{" "}
                  {referral.patientName}
                </p>

                <p>
                  <strong>To:</strong>{" "}
                  {referral.toFacility}
                </p>

                <p>
                  <strong>Status:</strong>{" "}
                  <span
                    style={{
                      color: getStatusColor(
                        referral.status
                      ),
                      fontWeight: "700",
                    }}
                  >
                    {getStatusLabel(referral.status)}
                  </span>
                </p>

                <Link
                  to={`/referral/${referral.id}`}
                  style={{
                    display: "inline-block",
                    marginTop: "10px",
                    padding: "9px 12px",
                    borderRadius: "7px",
                    background: "#EEF6FB",
                    color: "#1769AA",
                    textDecoration: "none",
                    fontSize: "13px",
                    fontWeight: "600",
                  }}
                >
                  Track Referral
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default FacilityDashboard;