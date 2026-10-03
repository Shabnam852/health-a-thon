import React from "react";
import { useReferrals } from "../context/ReferralContext.jsx";

const JOURNEY_STEPS = [
  {
    key: "CREATED",
    label: "Created",
    shortLabel: "Referral created",
  },
  {
    key: "SENT",
    label: "Sent",
    shortLabel: "Referral sent",
  },
  {
    key: "ACKNOWLEDGED",
    label: "Acknowledged",
    shortLabel: "Facility acknowledged",
  },
  {
    key: "ARRIVAL_CONFIRMED",
    label: "Arrival",
    shortLabel: "Arrival confirmed",
  },
  {
    key: "COMPLETED",
    label: "Completed",
    shortLabel: "Care completed",
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

const getStatusMessage = (status) => {
  switch (status) {
    case "CREATED":
      return "Your referral has been created and is being prepared for the receiving facility.";

    case "SENT":
      return "Your referral has been sent. We are waiting for the receiving facility to acknowledge it.";

    case "ACKNOWLEDGED":
      return "The receiving facility has acknowledged your referral. Follow the next instruction from your care team.";

    case "ARRIVAL_CONFIRMED":
      return "Your arrival at the receiving facility has been confirmed. Your referral remains active until the required service is completed.";

    case "FOLLOW_UP_REQUIRED":
      return "Your referral needs operational follow-up. A coordinator can help resolve the issue affecting your journey.";

    case "COMPLETED":
      return "Your referral journey has been completed.";

    default:
      return "Your referral is being processed.";
  }
};

const getNextStep = (status) => {
  switch (status) {
    case "CREATED":
      return {
        icon: "↗",
        title: "Referral is being sent",
        text: "Your care team is preparing the referral for the receiving facility.",
      };

    case "SENT":
      return {
        icon: "◷",
        title: "Waiting for acknowledgement",
        text: "The receiving facility needs to acknowledge the referral before the next step.",
      };

    case "ACKNOWLEDGED":
      return {
        icon: "→",
        title: "Proceed to the receiving facility",
        text: "Your referral has been acknowledged. Follow the instructions provided by your care team.",
      };

    case "ARRIVAL_CONFIRMED":
      return {
        icon: "✓",
        title: "Care is the next step",
        text: "Your arrival has been recorded. The receiving facility can now continue the required service.",
      };

    case "FOLLOW_UP_REQUIRED":
      return {
        icon: "!",
        title: "Human assistance is being coordinated",
        text: "A coordinator can help with the operational issue affecting your referral.",
      };

    case "COMPLETED":
      return {
        icon: "✓",
        title: "Referral journey completed",
        text: "The referral has been marked as completed.",
      };

    default:
      return {
        icon: "→",
        title: "Referral in progress",
        text: "Your care team will provide the next instruction.",
      };
  }
};

const getStatusTone = (status) => {
  switch (status) {
    case "COMPLETED":
      return "success";

    case "FOLLOW_UP_REQUIRED":
      return "warning";

    case "ACKNOWLEDGED":
    case "ARRIVAL_CONFIRMED":
      return "active";

    case "SENT":
      return "waiting";

    default:
      return "info";
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

const formatTime = (date) => {
  if (!date) return "";

  return new Date(date).toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  });
};

const PatientDashboard = () => {
  const { referrals } = useReferrals();

  // Simulated patient for the hardcoded prototype.
  const patientId = "P-1001";

  const myReferrals = referrals.filter(
    (referral) => referral.patientId === patientId
  );

  const activeReferral =
    myReferrals.find(
      (referral) => referral.status !== "COMPLETED"
    ) || myReferrals[0];

  if (!activeReferral) {
    return (
      <div className="patient-page">
        <section className="patient-empty-page">
          <div className="patient-empty-icon">✓</div>

          <div className="patient-eyebrow">
            PATIENT / CAREGIVER
          </div>

          <h1>No active referral</h1>

          <p>
            You currently have no active referral journey to track.
          </p>
        </section>
      </div>
    );
  }

  const currentStepIndex = getStepIndex(
    activeReferral.status
  );

  const latestEvent =
    activeReferral.timeline?.[
      activeReferral.timeline.length - 1
    ] || null;

  const nextStep = getNextStep(activeReferral.status);
  const tone = getStatusTone(activeReferral.status);

  return (
    <div className="patient-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="patient-hero">

        <div className="patient-hero-content">

          <div className="patient-eyebrow">
            PATIENT / CAREGIVER
          </div>

          <h1>
            Your referral journey
          </h1>

          <p>
            Track your referral status and see what happens next.
          </p>

        </div>

        <div className="patient-hero-badge">
          <span className="patient-online-dot" />
          Journey tracking active
        </div>

      </section>


      {/* =====================================================
          MAIN REFERRAL CARD
          ===================================================== */}

      <section className={`patient-status-card tone-${tone}`}>

        <div className="patient-status-top">

          <div>

            <div className="patient-small-label">
              REFERRAL ID
            </div>

            <div className="patient-referral-id">
              {activeReferral.id}
            </div>

            <div className="patient-referral-meta">
              {activeReferral.referralType}
              {activeReferral.priority
                ? ` • ${activeReferral.priority}`
                : ""}
            </div>

          </div>

          <div className="patient-current-status">

            <span className="patient-status-dot" />

            {getStatusLabel(activeReferral.status)}

          </div>

        </div>


        {/* Route */}

        <div className="patient-route">

          <div className="patient-route-facility">
            <span>FROM</span>
            <strong>
              {activeReferral.fromFacility}
            </strong>
          </div>

          <div className="patient-route-line">
            <div className="patient-route-circle">
              →
            </div>
          </div>

          <div className="patient-route-facility">
            <span>TO</span>
            <strong>
              {activeReferral.toFacility}
            </strong>
          </div>

        </div>


        {/* Current message */}

        <div className="patient-current-message">

          <div className="patient-message-icon">
            {activeReferral.status === "COMPLETED"
              ? "✓"
              : activeReferral.status ===
                "FOLLOW_UP_REQUIRED"
              ? "!"
              : "●"}
          </div>

          <div>
            <div className="patient-message-label">
              CURRENT STATUS
            </div>

            <h2>
              {getStatusLabel(activeReferral.status)}
            </h2>

            <p>
              {getStatusMessage(
                activeReferral.status
              )}
            </p>

            {latestEvent && (
              <div className="patient-last-updated">
                Last updated {formatDate(latestEvent.date)}{" "}
                at {formatTime(latestEvent.date)}
              </div>
            )}
          </div>

        </div>

      </section>


      {/* =====================================================
          JOURNEY
          ===================================================== */}

      <section className="patient-section">

        <div className="patient-section-heading">

          <div>
            <div className="patient-section-kicker">
              YOUR JOURNEY
            </div>

            <h2>
              Referral progress
            </h2>

            <p>
              See where your referral is in the care journey.
            </p>
          </div>

          <div className="patient-progress-count">
            {Math.min(currentStepIndex + 1, JOURNEY_STEPS.length)}
            /{JOURNEY_STEPS.length}
          </div>

        </div>


        <div className="patient-journey-card">

          <div className="patient-journey">

            {JOURNEY_STEPS.map((step, index) => {

              const event =
                activeReferral.timeline?.find(
                  (item) =>
                    item.status === step.key
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
                  className={`patient-journey-step ${
                    completed
                      ? "is-completed"
                      : ""
                  } ${
                    current
                      ? "is-current"
                      : ""
                  }`}
                >

                  <div className="patient-step-rail">

                    <div className="patient-step-circle">

                      {completed
                        ? "✓"
                        : index + 1}

                    </div>

                    {index <
                      JOURNEY_STEPS.length - 1 && (
                      <div
                        className={`patient-step-line ${
                          completed
                            ? "is-filled"
                            : ""
                        }`}
                      />
                    )}

                  </div>


                  <div className="patient-step-content">

                    <div className="patient-step-heading">

                      <strong>
                        {step.label}
                      </strong>

                      {current && (
                        <span className="patient-now-badge">
                          NOW
                        </span>
                      )}

                    </div>

                    <span className="patient-step-description">
                      {step.shortLabel}
                    </span>

                    <span
                      className={`patient-step-date ${
                        event
                          ? "has-event"
                          : ""
                      }`}
                    >
                      {event
                        ? `${formatDate(
                            event.date
                          )} • ${formatTime(
                            event.date
                          )}`
                        : "Pending"}
                    </span>

                  </div>

                </div>
              );
            })}

          </div>


          {activeReferral.status ===
            "FOLLOW_UP_REQUIRED" && (
            <div className="patient-followup">

              <div className="patient-followup-icon">
                !
              </div>

              <div>
                <strong>
                  Follow-up is required
                </strong>

                <p>
                  A healthcare coordinator may contact you
                  to help keep the referral moving.
                </p>
              </div>

            </div>
          )}

        </div>

      </section>


      {/* =====================================================
          NEXT STEP
          ===================================================== */}

      <section className="patient-next-card">

        <div className="patient-next-icon">
          {nextStep.icon}
        </div>

        <div className="patient-next-content">

          <div className="patient-section-kicker">
            WHAT HAPPENS NEXT
          </div>

          <h2>
            {nextStep.title}
          </h2>

          <p>
            {nextStep.text}
          </p>

        </div>

      </section>


      {/* =====================================================
          HELP
          ===================================================== */}

      <section className="patient-help-card">

        <div className="patient-help-icon">
          ?
        </div>

        <div className="patient-help-content">

          <div className="patient-section-kicker">
            SUPPORT
          </div>

          <h2>
            Need help with your referral?
          </h2>

          <p>
            You can request human assistance when something
            is blocking your referral journey.
          </p>

          <div className="patient-help-actions">

            <button
              type="button"
              className="patient-primary-btn"
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
              className="patient-secondary-btn"
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

      </section>


      {/* =====================================================
          SAFETY NOTE
          ===================================================== */}

      <div className="patient-safety-note">

        <span>●</span>

        <p>
          Navexa helps you follow your referral journey.
          Clinical care and decisions remain with your
          healthcare team.
        </p>

      </div>

    </div>
  );
};

export default PatientDashboard;