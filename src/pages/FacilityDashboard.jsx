import React from "react";
import { useNavigate } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";

const FacilityDashboard = () => {
  const navigate = useNavigate();
  const {
    referrals,
    updateReferralStatus,
  } = useReferrals();

  const facilityName = "District Hospital";

  const incomingReferrals = referrals.filter(
    (referral) => referral.toFacility === facilityName
  );

  const outgoingReferrals = referrals.filter(
    (referral) => referral.fromFacility === facilityName
  );

  const needsAttention = referrals.filter(
    (referral) =>
      referral.status === "SENT" ||
      referral.status === "FOLLOW_UP_REQUIRED"
  );

  const getStatusLabel = (status) => {
    const labels = {
      CREATED: "Created",
      SENT: "Sent",
      ACKNOWLEDGED: "Acknowledged",
      ARRIVAL_CONFIRMED: "Arrival Confirmed",
      COMPLETED: "Completed",
      FOLLOW_UP_REQUIRED: "Follow-up Required",
    };

    return labels[status] || status;
  };

  const getProgress = (status) => {
    const progress = {
      CREATED: 20,
      SENT: 35,
      ACKNOWLEDGED: 55,
      ARRIVAL_CONFIRMED: 75,
      COMPLETED: 100,
      FOLLOW_UP_REQUIRED: 35,
    };

    return progress[status] || 0;
  };

  const handlePrimaryAction = (referral) => {
    if (referral.status === "SENT") {
      updateReferralStatus(
        referral.id,
        "ACKNOWLEDGED",
        "Receiving facility acknowledged the referral."
      );
      return;
    }

    if (referral.status === "ACKNOWLEDGED") {
      updateReferralStatus(
        referral.id,
        "ARRIVAL_CONFIRMED",
        "Patient arrival confirmed at the receiving facility."
      );
      return;
    }

    if (referral.status === "ARRIVAL_CONFIRMED") {
      updateReferralStatus(
        referral.id,
        "COMPLETED",
        "Referral care/service completed and recorded."
      );
      return;
    }

    if (referral.status === "FOLLOW_UP_REQUIRED") {
      updateReferralStatus(
        referral.id,
        "ACKNOWLEDGED",
        "Follow-up action taken and referral acknowledged."
      );
    }
  };

  const getPrimaryActionLabel = (status) => {
    switch (status) {
      case "SENT":
        return "Acknowledge";
      case "ACKNOWLEDGED":
        return "Confirm Arrival";
      case "ARRIVAL_CONFIRMED":
        return "Complete Referral";
      case "FOLLOW_UP_REQUIRED":
        return "Resolve Follow-up";
      case "COMPLETED":
        return "Completed";
      default:
        return "View Referral";
    }
  };

  const formatDate = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const ReferralCard = ({ referral, attention = false }) => {
    const progress = getProgress(referral.status);

    return (
      <article
        className={`facility-referral-card ${
          attention ? "facility-referral-attention" : ""
        }`}
      >
        <div className="facility-card-top">
          <div>
            <div className="facility-card-id">
              {referral.id}
            </div>

            <h3>{referral.patientName}</h3>
          </div>

          <span
            className={`facility-priority ${
              referral.priority === "Urgent"
                ? "priority-urgent"
                : "priority-routine"
            }`}
          >
            {referral.priority}
          </span>
        </div>

        <div className="facility-route">
          <div className="facility-route-point">
            <span className="facility-route-label">FROM</span>
            <strong>{referral.fromFacility}</strong>
          </div>

          <div className="facility-route-arrow">→</div>

          <div className="facility-route-point">
            <span className="facility-route-label">TO</span>
            <strong>{referral.toFacility}</strong>
          </div>
        </div>

        <div className="facility-card-meta">
          <span>
            <strong>Type</strong>
            {referral.referralType}
          </span>

          <span>
            <strong>Created</strong>
            {formatDate(referral.createdAt)}
          </span>
        </div>

        <div className="facility-progress">
          <div className="facility-progress-head">
            <span>Referral journey</span>

            <span
              className={`facility-status facility-status-${referral.status.toLowerCase()}`}
            >
              <span className="facility-status-dot" />
              {getStatusLabel(referral.status)}
            </span>
          </div>

          <div className="facility-progress-track">
            <div
              className="facility-progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>

          <div className="facility-progress-labels">
            <span>Sent</span>
            <span>Acknowledged</span>
            <span>Arrival</span>
            <span>Complete</span>
          </div>
        </div>

        {attention && (
          <div className="facility-attention-box">
            <div className="facility-attention-icon">!</div>

            <div>
              <strong>
                {referral.status === "FOLLOW_UP_REQUIRED"
                  ? "Follow-up required"
                  : "Waiting for acknowledgement"}
              </strong>

              <p>
                This referral needs an operational action to keep the journey
                moving.
              </p>
            </div>
          </div>
        )}

        <div className="facility-card-actions">
          <button
            className="facility-secondary-btn"
            onClick={() =>
              navigate(`/referral/${referral.id}`)
            }
          >
            View Details
          </button>

          {referral.status !== "COMPLETED" && (
            <button
              className="facility-primary-btn"
              onClick={() =>
                handlePrimaryAction(referral)
              }
            >
              {getPrimaryActionLabel(referral.status)}
            </button>
          )}
        </div>
      </article>
    );
  };

  return (
    <div className="facility-page">

      {/* HERO */}
      <section className="facility-hero">
        <div>
          <div className="facility-eyebrow">
            HEALTHCARE FACILITY
          </div>

          <h1>{facilityName}</h1>

          <p>
            Manage referrals, track patient movement and keep care journeys
            connected.
          </p>
        </div>

        <button
          className="facility-hero-btn"
          onClick={() => navigate("/create")}
        >
          <span>＋</span>
          New Referral
        </button>
      </section>

      {/* OVERVIEW */}
      <section className="facility-stats">

        <div className="facility-stat-card">
          <div className="facility-stat-icon incoming">
            ↘
          </div>

          <div>
            <span>Incoming Referrals</span>
            <strong>{incomingReferrals.length}</strong>
            <small>Referred to this facility</small>
          </div>
        </div>

        <div className="facility-stat-card">
          <div className="facility-stat-icon outgoing">
            ↗
          </div>

          <div>
            <span>Outgoing Referrals</span>
            <strong>{outgoingReferrals.length}</strong>
            <small>Sent to other facilities</small>
          </div>
        </div>

        <div className="facility-stat-card attention-stat">
          <div className="facility-stat-icon attention">
            !
          </div>

          <div>
            <span>Needs Attention</span>
            <strong>{needsAttention.length}</strong>
            <small>Operational action required</small>
          </div>
        </div>

      </section>

      {/* NEEDS ATTENTION */}
      {needsAttention.length > 0 && (
        <section className="facility-section">

          <div className="facility-section-heading">
            <div>
              <div className="facility-section-kicker">
                ACTION QUEUE
              </div>

              <h2>Needs Attention</h2>

              <p>
                Referrals that need an operational action to continue.
              </p>
            </div>

            <div className="facility-count-badge">
              {needsAttention.length} open
            </div>
          </div>

          <div className="facility-referral-grid">
            {needsAttention.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
                attention
              />
            ))}
          </div>

        </section>
      )}

      {/* INCOMING */}
      <section className="facility-section">

        <div className="facility-section-heading">
          <div>
            <div className="facility-section-kicker">
              RECEIVING
            </div>

            <h2>Incoming Referrals</h2>

            <p>
              Referrals currently routed to {facilityName}.
            </p>
          </div>

          <div className="facility-count-badge">
            {incomingReferrals.length} referrals
          </div>
        </div>

        {incomingReferrals.length > 0 ? (
          <div className="facility-referral-grid">
            {incomingReferrals.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
              />
            ))}
          </div>
        ) : (
          <div className="facility-empty">
            <div className="facility-empty-icon">✓</div>

            <h3>No incoming referrals</h3>

            <p>
              New referrals sent to this facility will appear here.
            </p>
          </div>
        )}

      </section>

      {/* OUTGOING */}
      <section className="facility-section">

        <div className="facility-section-heading">
          <div>
            <div className="facility-section-kicker">
              SENDING
            </div>

            <h2>Outgoing Referrals</h2>

            <p>
              Referrals sent from {facilityName} to another facility.
            </p>
          </div>

          <div className="facility-count-badge">
            {outgoingReferrals.length} referrals
          </div>
        </div>

        {outgoingReferrals.length > 0 ? (
          <div className="facility-referral-grid">
            {outgoingReferrals.map((referral) => (
              <ReferralCard
                key={referral.id}
                referral={referral}
              />
            ))}
          </div>
        ) : (
          <div className="facility-empty">
            <div className="facility-empty-icon">↗</div>

            <h3>No outgoing referrals</h3>

            <p>
              Referrals created by this facility will appear here.
            </p>
          </div>
        )}

      </section>

      {/* FOOTER NOTE */}
      <div className="facility-safety-note">
        <span>●</span>

        <p>
          Navexa supports referral coordination and follow-up.
          Clinical decisions remain with authorized healthcare professionals.
        </p>
      </div>

    </div>
  );
};

export default FacilityDashboard;