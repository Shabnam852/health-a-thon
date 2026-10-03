import React from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";

const STATUS_LABELS = {
  CREATED: "Referral Created",
  SENT: "Referral Sent",
  ACKNOWLEDGED: "Facility Acknowledged",
  ARRIVAL_CONFIRMED: "Arrival Confirmed",
  COMPLETED: "Referral Completed",
  FOLLOW_UP_REQUIRED: "Follow-up Required",
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

  const index = JOURNEY_STEPS.indexOf(status);

  return index === -1 ? 0 : index;
};

const getTone = (status) => {
  switch (status) {
    case "FOLLOW_UP_REQUIRED":
      return "warning";

    case "COMPLETED":
      return "success";

    case "SENT":
      return "waiting";

    case "ACKNOWLEDGED":
    case "ARRIVAL_CONFIRMED":
      return "active";

    default:
      return "info";
  }
};

const getNextAction = (status) => {
  switch (status) {
    case "CREATED":
      return {
        eyebrow: "READY TO START",
        title: "Send this referral",
        description:
          "The referral has been created and is ready to be sent to the receiving facility.",
        button: "Send Referral",
        action: "send",
        tone: "info",
      };

    case "SENT":
      return {
        eyebrow: "WAITING",
        title: "Awaiting facility acknowledgement",
        description:
          "The receiving facility has not yet acknowledged this referral.",
        button: "Acknowledge Referral",
        action: "acknowledge",
        tone: "waiting",
        secondary: "Flag for Follow-up",
      };

    case "ACKNOWLEDGED":
      return {
        eyebrow: "NEXT MILESTONE",
        title: "Awaiting patient arrival",
        description:
          "The receiving facility has acknowledged the referral. Arrival can be confirmed when the patient reaches the facility.",
        button: "Confirm Patient Arrival",
        action: "arrival",
        tone: "active",
      };

    case "ARRIVAL_CONFIRMED":
      return {
        eyebrow: "CARE IN PROGRESS",
        title: "Care / service completion pending",
        description:
          "Patient arrival has been confirmed. Complete the referral when the requested service has been finished.",
        button: "Complete Referral",
        action: "complete",
        tone: "active",
      };

    case "FOLLOW_UP_REQUIRED":
      return {
        eyebrow: "ACTION REQUIRED",
        title: "Human follow-up is in progress",
        description:
          "The referral requires operational follow-up by an authorised coordinator or healthcare worker.",
        button: "Mark Follow-up Resolved",
        action: "followup",
        tone: "warning",
      };

    case "COMPLETED":
      return {
        eyebrow: "CLOSED",
        title: "Referral journey completed",
        description:
          "This referral has reached the completed state and the journey is closed.",
        action: "none",
        tone: "success",
      };

    default:
      return {
        eyebrow: "REFERRAL",
        title: "Review referral",
        description: "Please review the current referral record.",
        action: "none",
        tone: "info",
      };
  }
};

const formatDate = (date) => {
  if (!date) return "—";

  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date) => {
  if (!date) return "Pending";

  return new Date(date).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const ReferralDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    getReferralById,
    updateReferralStatus,
    role,
  } = useReferrals();

  const referral = getReferralById(id);

  if (!referral) {
    return (
      <div className="details-page">
        <div className="details-not-found">
          <div className="details-not-found-icon">?</div>

          <div className="details-eyebrow">
            REFERRAL RECORD
          </div>

          <h1>Referral not found</h1>

          <p>
            The referral you are looking for does not exist in
            the current demo data.
          </p>

          <button
            type="button"
            className="details-primary-btn"
            onClick={() => navigate(-1)}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  const currentStepIndex = getCurrentStepIndex(
    referral.status
  );

  const nextAction = getNextAction(referral.status);
  const tone = getTone(referral.status);

  const latestEvent =
    referral.timeline?.[
      referral.timeline.length - 1
    ] || null;

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
    <div className="details-page">

      {/* =====================================================
          TOP BAR
          ===================================================== */}

      <div className="details-topbar">

        <button
          type="button"
          className="details-back-btn"
          onClick={() => navigate(-1)}
        >
          ← Back
        </button>

        <div className="details-view-label">
          {role === "coordinator"
            ? "Coordinator view"
            : "Facility view"}
        </div>

      </div>


      {/* =====================================================
          HERO
          ===================================================== */}

      <section className={`details-hero tone-${tone}`}>

        <div className="details-hero-main">

          <div className="details-eyebrow">
            REFERRAL RECORD
          </div>

          <h1>{referral.id}</h1>

          <p>
            Created {formatDate(referral.createdAt)}
          </p>

        </div>

        <div className="details-status-pill">
          <span />
          {STATUS_LABELS[referral.status] ||
            referral.status}
        </div>

      </section>


      {/* =====================================================
          ROUTE
          ===================================================== */}

      <section className="details-route-card">

        <div className="details-route-facility">

          <div className="details-route-icon source">
            ↗
          </div>

          <div>
            <span>REFERRING FACILITY</span>

            <strong>
              {referral.fromFacility}
            </strong>
          </div>

        </div>


        <div className="details-route-middle">

          <div className="details-route-line" />

          <div className="details-route-arrow">
            →
          </div>

          <div className="details-route-line" />

        </div>


        <div className="details-route-facility">

          <div className="details-route-icon destination">
            ↘
          </div>

          <div>
            <span>RECEIVING FACILITY</span>

            <strong>
              {referral.toFacility}
            </strong>
          </div>

        </div>

      </section>


      <div className="details-content-grid">

        {/* ===================================================
            MAIN COLUMN
            =================================================== */}

        <main>

          {/* PATIENT / REFERRAL INFO */}

          <section className="details-card">

            <div className="details-card-heading">

              <div>
                <div className="details-section-kicker">
                  REFERRAL DETAILS
                </div>

                <h2>Patient & referral information</h2>
              </div>

              <span className="details-priority">
                {referral.priority}
              </span>

            </div>


            <div className="details-info-grid">

              <div className="details-info-item">
                <span>Patient</span>
                <strong>{referral.patientName}</strong>
              </div>

              <div className="details-info-item">
                <span>Patient ID</span>
                <strong>{referral.patientId}</strong>
              </div>

              <div className="details-info-item">
                <span>Referral Type</span>
                <strong>{referral.referralType}</strong>
              </div>

              <div className="details-info-item">
                <span>Priority</span>

                <strong
                  className={
                    referral.priority === "Urgent"
                      ? "details-urgent-text"
                      : ""
                  }
                >
                  {referral.priority}
                </strong>
              </div>

            </div>


            <div className="details-reason">

              <span>REFERRAL INFORMATION</span>

              <p>
                {referral.reason}
              </p>

            </div>

          </section>


          {/* JOURNEY */}

          <section className="details-card">

            <div className="details-card-heading">

              <div>
                <div className="details-section-kicker">
                  JOURNEY
                </div>

                <h2>Referral progress</h2>

                <p>
                  Follow the referral from creation to closure.
                </p>
              </div>

              <div className="details-progress-count">
                {referral.status === "FOLLOW_UP_REQUIRED"
                  ? "1 issue"
                  : `${Math.min(
                      currentStepIndex + 1,
                      JOURNEY_STEPS.length
                    )}/${JOURNEY_STEPS.length}`}
              </div>

            </div>


            <div className="details-timeline">

              {JOURNEY_STEPS.map((step, index) => {

                const event =
                  referral.timeline?.find(
                    (item) => item.status === step
                  );

                const isCompleted =
                  referral.status !==
                    "FOLLOW_UP_REQUIRED" &&
                  index < currentStepIndex;

                const isCurrent =
                  step === referral.status;

                return (
                  <div
                    key={step}
                    className={`details-timeline-item ${
                      isCompleted
                        ? "completed"
                        : ""
                    } ${
                      isCurrent
                        ? "current"
                        : ""
                    }`}
                  >

                    <div className="details-timeline-marker">

                      <div className="details-timeline-circle">

                        {isCompleted
                          ? "✓"
                          : index + 1}

                      </div>

                      {index <
                        JOURNEY_STEPS.length - 1 && (
                        <div
                          className={`details-timeline-connector ${
                            isCompleted
                              ? "filled"
                              : ""
                          }`}
                        />
                      )}

                    </div>


                    <div className="details-timeline-content">

                      <div className="details-timeline-title">

                        <strong>
                          {STATUS_LABELS[step]}
                        </strong>

                        {isCurrent && (
                          <span>
                            CURRENT
                          </span>
                        )}

                      </div>

                      <p>
                        {event
                          ? formatDateTime(
                              event.date
                            )
                          : "Pending"}
                      </p>

                      {event?.notes && (
                        <small>
                          {event.notes}
                        </small>
                      )}

                    </div>

                  </div>
                );
              })}

            </div>


            {referral.status ===
              "FOLLOW_UP_REQUIRED" && (
              <div className="details-exception">

                <div className="details-exception-icon">
                  !
                </div>

                <div>
                  <strong>
                    Follow-up required
                  </strong>

                  <p>
                    This referral is unresolved and requires
                    human operational follow-up.
                  </p>
                </div>

              </div>
            )}

          </section>

        </main>


        {/* =================================================
            SIDEBAR
            ================================================= */}

        <aside className="details-sidebar">

          {/* NEXT ACTION */}

          <section
            className={`details-action-card tone-${nextAction.tone}`}
          >

            <div className="details-action-kicker">
              {nextAction.eyebrow}
            </div>

            <div className="details-action-icon">
              {nextAction.action === "none"
                ? "✓"
                : nextAction.action === "followup"
                ? "!"
                : "→"}
            </div>

            <h2>
              {nextAction.title}
            </h2>

            <p>
              {nextAction.description}
            </p>


            {nextAction.action !== "none" && (
              <div className="details-action-buttons">

                <button
                  type="button"
                  className="details-primary-btn"
                  onClick={performAction}
                >
                  {nextAction.button}
                </button>

                {referral.status === "SENT" && (
                  <button
                    type="button"
                    className="details-secondary-btn"
                    onClick={handleFollowUp}
                  >
                    Flag for Follow-up
                  </button>
                )}

              </div>
            )}

          </section>


          {/* QUICK SUMMARY */}

          <section className="details-mini-card">

            <div className="details-section-kicker">
              QUICK SUMMARY
            </div>

            <div className="details-mini-row">
              <span>Patient</span>
              <strong>
                {referral.patientName}
              </strong>
            </div>

            <div className="details-mini-row">
              <span>Type</span>
              <strong>
                {referral.referralType}
              </strong>
            </div>

            <div className="details-mini-row">
              <span>Priority</span>
              <strong>
                {referral.priority}
              </strong>
            </div>

            <div className="details-mini-row">
              <span>Last updated</span>
              <strong>
                {latestEvent
                  ? formatDate(latestEvent.date)
                  : "—"}
              </strong>
            </div>

          </section>


          {/* NAVIGATION */}

          <section className="details-nav-card">

            <div className="details-section-kicker">
              WORKSPACE
            </div>

            {role === "facility" && (
              <>
                <Link
                  to="/facility"
                  className="details-nav-link"
                >
                  <span>▣</span>
                  Facility Dashboard
                </Link>

                <Link
                  to="/create"
                  className="details-nav-link"
                >
                  <span>＋</span>
                  Create New Referral
                </Link>
              </>
            )}

            {role === "coordinator" && (
              <Link
                to="/coordinator"
                className="details-nav-link"
              >
                <span>◉</span>
                Coordinator Operations
              </Link>
            )}

          </section>

        </aside>

      </div>


      {/* =====================================================
          SCOPE NOTE
          ===================================================== */}

      <div className="details-scope-note">

        <div className="details-scope-icon">
          ✓
        </div>

        <div>
          <strong>
            Human-controlled referral coordination
          </strong>

          <p>
            Navexa tracks referral milestones and supports
            operational follow-up. Clinical assessment,
            treatment and clinical decisions remain with
            authorised healthcare professionals.
          </p>
        </div>

      </div>

    </div>
  );
};

export default ReferralDetails;