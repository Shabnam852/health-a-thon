import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";

const CoordinatorDashboard = () => {
  const { referrals, updateReferralStatus } = useReferrals();
  const [view, setView] = useState("attention");

  const attentionReferrals = useMemo(
    () =>
      referrals.filter(
        (referral) =>
          referral.status === "SENT" ||
          referral.status === "FOLLOW_UP_REQUIRED"
      ),
    [referrals]
  );

  const monitoringReferrals = useMemo(
    () =>
      referrals.filter(
        (referral) =>
          referral.status === "ACKNOWLEDGED" ||
          referral.status === "ARRIVAL_CONFIRMED"
      ),
    [referrals]
  );

  const completedReferrals = useMemo(
    () =>
      referrals.filter(
        (referral) => referral.status === "COMPLETED"
      ),
    [referrals]
  );

  const handleStartFollowUp = (id) => {
    updateReferralStatus(
      id,
      "FOLLOW_UP_REQUIRED",
      "Coordinator follow-up started because the referral has not received the expected acknowledgement."
    );
  };

  const handleResolveFollowUp = (id) => {
    updateReferralStatus(
      id,
      "ACKNOWLEDGED",
      "Coordinator completed the operational follow-up and the referral can continue."
    );
  };

  const getStatusLabel = (status) => {
    const labels = {
      CREATED: "Created",
      SENT: "Awaiting Acknowledgement",
      ACKNOWLEDGED: "Acknowledged",
      ARRIVAL_CONFIRMED: "Arrival Confirmed",
      FOLLOW_UP_REQUIRED: "Follow-up Required",
      COMPLETED: "Completed",
    };

    return labels[status] || "In Progress";
  };

  const getIssue = (referral) => {
    switch (referral.status) {
      case "SENT":
        return {
          title: "Awaiting acknowledgement",
          text: "The receiving facility has not yet acknowledged the referral.",
          action: "Start follow-up",
          tone: "waiting",
        };

      case "FOLLOW_UP_REQUIRED":
        return {
          title: "Follow-up in progress",
          text: "An operational follow-up has been opened for this referral.",
          action: "Resolve follow-up",
          tone: "warning",
        };

      case "ACKNOWLEDGED":
        return {
          title: "Arrival not yet confirmed",
          text: "The referral is acknowledged and should be monitored until arrival is confirmed.",
          action: "Monitor",
          tone: "active",
        };

      case "ARRIVAL_CONFIRMED":
        return {
          title: "Care completion pending",
          text: "Arrival has been confirmed. Continue monitoring until the required service is completed.",
          action: "Monitor",
          tone: "active",
        };

      case "COMPLETED":
        return {
          title: "Referral journey completed",
          text: "The referral has reached the completed state.",
          action: "Closed",
          tone: "success",
        };

      default:
        return {
          title: "Referral progressing",
          text: "No operational action is currently required.",
          action: "Monitor",
          tone: "active",
        };
    }
  };

  const getProgress = (status) => {
    const values = {
      CREATED: 20,
      SENT: 35,
      FOLLOW_UP_REQUIRED: 35,
      ACKNOWLEDGED: 55,
      ARRIVAL_CONFIRMED: 75,
      COMPLETED: 100,
    };

    return values[status] || 0;
  };

  const getTabCount = (tab) => {
    if (tab === "attention") return attentionReferrals.length;
    if (tab === "monitoring") return monitoringReferrals.length;
    return completedReferrals.length;
  };

  const displayedReferrals =
    view === "attention"
      ? attentionReferrals
      : view === "monitoring"
      ? monitoringReferrals
      : completedReferrals;

  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="coordinator-page">

      {/* =====================================================
          HERO
          ===================================================== */}

      <section className="coordinator-hero">

        <div>
          <div className="coordinator-eyebrow">
            OPERATIONAL COORDINATION
          </div>

          <h1>Referral Operations Center</h1>

          <p>
            Keep referral journeys moving by identifying unresolved
            tasks and coordinating human follow-up.
          </p>
        </div>

        <div className="coordinator-date">
          <span>Today</span>
          <strong>{today}</strong>
        </div>

      </section>


      {/* =====================================================
          KPI STRIP
          ===================================================== */}

      <section className="coordinator-stats">

        <button
          type="button"
          className={`coordinator-stat attention ${
            view === "attention" ? "selected" : ""
          }`}
          onClick={() => setView("attention")}
        >
          <div className="coordinator-stat-icon">!</div>

          <div className="coordinator-stat-content">
            <span>Needs Attention</span>
            <strong>{attentionReferrals.length}</strong>
            <small>Open operational tasks</small>
          </div>
        </button>

        <button
          type="button"
          className={`coordinator-stat monitoring ${
            view === "monitoring" ? "selected" : ""
          }`}
          onClick={() => setView("monitoring")}
        >
          <div className="coordinator-stat-icon">◷</div>

          <div className="coordinator-stat-content">
            <span>Being Monitored</span>
            <strong>{monitoringReferrals.length}</strong>
            <small>Journeys in progress</small>
          </div>
        </button>

        <button
          type="button"
          className={`coordinator-stat completed ${
            view === "completed" ? "selected" : ""
          }`}
          onClick={() => setView("completed")}
        >
          <div className="coordinator-stat-icon">✓</div>

          <div className="coordinator-stat-content">
            <span>Completed</span>
            <strong>{completedReferrals.length}</strong>
            <small>Closed referral journeys</small>
          </div>
        </button>

      </section>


      {/* =====================================================
          OPERATIONS HEADER
          ===================================================== */}

      <section className="coordinator-workspace">

        <div className="coordinator-workspace-header">

          <div>
            <div className="coordinator-section-kicker">
              WORK QUEUE
            </div>

            <h2>
              {view === "attention"
                ? "Needs Attention"
                : view === "monitoring"
                ? "Being Monitored"
                : "Completed Referrals"}
            </h2>

            <p>
              {view === "attention"
                ? "Referral journeys that need an operational action."
                : view === "monitoring"
                ? "Referral journeys progressing through the next milestone."
                : "Referral journeys that have reached completion."}
            </p>
          </div>

          <div className="coordinator-queue-count">
            {displayedReferrals.length}{" "}
            {displayedReferrals.length === 1
              ? "referral"
              : "referrals"}
          </div>

        </div>


        {/* TABS */}

        <div className="coordinator-tabs">

          <button
            type="button"
            className={view === "attention" ? "active" : ""}
            onClick={() => setView("attention")}
          >
            Needs Attention
            <span>{getTabCount("attention")}</span>
          </button>

          <button
            type="button"
            className={view === "monitoring" ? "active" : ""}
            onClick={() => setView("monitoring")}
          >
            Monitoring
            <span>{getTabCount("monitoring")}</span>
          </button>

          <button
            type="button"
            className={view === "completed" ? "active" : ""}
            onClick={() => setView("completed")}
          >
            Completed
            <span>{getTabCount("completed")}</span>
          </button>

        </div>


        {/* =================================================
            REFERRAL LIST
            ================================================= */}

        {displayedReferrals.length === 0 ? (

          <div className="coordinator-empty">

            <div className="coordinator-empty-icon">
              ✓
            </div>

            <h3>
              {view === "attention"
                ? "All clear"
                : view === "monitoring"
                ? "Nothing is being monitored"
                : "No completed referrals yet"}
            </h3>

            <p>
              {view === "attention"
                ? "There are currently no unresolved referral tasks."
                : view === "monitoring"
                ? "Referral journeys requiring monitoring will appear here."
                : "Completed referral journeys will appear here."}
            </p>

          </div>

        ) : (

          <div className="coordinator-list">

            {displayedReferrals.map((referral) => {

              const issue = getIssue(referral);
              const progress = getProgress(referral.status);

              return (
                <article
                  key={referral.id}
                  className={`coordinator-referral-card tone-${issue.tone}`}
                >

                  <div className="coordinator-card-main">

                    {/* Left */}

                    <div className="coordinator-card-identity">

                      <div className="coordinator-referral-id">
                        {referral.id}
                      </div>

                      <h3>
                        {referral.patientName}
                      </h3>

                      <div className="coordinator-patient-meta">
                        {referral.referralType}
                        {referral.priority
                          ? ` • ${referral.priority}`
                          : ""}
                      </div>

                    </div>


                    {/* Status */}

                    <div className="coordinator-status-area">

                      <span
                        className={`coordinator-status status-${issue.tone}`}
                      >
                        <span />
                        {getStatusLabel(
                          referral.status
                        )}
                      </span>

                      <div className="coordinator-progress">
                        <div className="coordinator-progress-head">
                          <span>Journey progress</span>
                          <strong>
                            {progress}%
                          </strong>
                        </div>

                        <div className="coordinator-progress-track">
                          <div
                            className="coordinator-progress-fill"
                            style={{
                              width: `${progress}%`,
                            }}
                          />
                        </div>
                      </div>

                    </div>

                  </div>


                  {/* Route */}

                  <div className="coordinator-route">

                    <div>
                      <span>FROM</span>
                      <strong>
                        {referral.fromFacility}
                      </strong>
                    </div>

                    <div className="coordinator-route-arrow">
                      →
                    </div>

                    <div>
                      <span>TO</span>
                      <strong>
                        {referral.toFacility}
                      </strong>
                    </div>

                  </div>


                  {/* Operational Issue */}

                  <div className="coordinator-operation">

                    <div className="coordinator-operation-icon">
                      {issue.tone === "warning"
                        ? "!"
                        : issue.tone === "waiting"
                        ? "◷"
                        : issue.tone === "success"
                        ? "✓"
                        : "•"}
                    </div>

                    <div>
                      <div className="coordinator-operation-label">
                        OPERATIONAL STATUS
                      </div>

                      <strong>
                        {issue.title}
                      </strong>

                      <p>
                        {issue.text}
                      </p>
                    </div>

                  </div>


                  {/* Footer */}

                  <div className="coordinator-card-footer">

                    <div className="coordinator-owner">

                      <div className="coordinator-avatar">
                        RC
                      </div>

                      <div>
                        <span>FOLLOW-UP OWNER</span>
                        <strong>
                          Referral Coordinator
                        </strong>
                      </div>

                    </div>


                    <div className="coordinator-actions">

                      <Link
                        to={`/referral/${referral.id}`}
                        className="coordinator-view-btn"
                      >
                        View Referral
                      </Link>

                      {referral.status === "SENT" && (
                        <button
                          type="button"
                          className="coordinator-action-btn primary"
                          onClick={() =>
                            handleStartFollowUp(
                              referral.id
                            )
                          }
                        >
                          Start Follow-up
                        </button>
                      )}

                      {referral.status ===
                        "FOLLOW_UP_REQUIRED" && (
                        <button
                          type="button"
                          className="coordinator-action-btn resolve"
                          onClick={() =>
                            handleResolveFollowUp(
                              referral.id
                            )
                          }
                        >
                          Resolve Follow-up
                        </button>
                      )}

                    </div>

                  </div>

                </article>
              );
            })}

          </div>
        )}

      </section>


      {/* =====================================================
          SAFETY / SCOPE
          ===================================================== */}

      <div className="coordinator-scope">

        <div className="coordinator-scope-icon">
          ✓
        </div>

        <div>
          <strong>
            Human-controlled coordination
          </strong>

          <p>
            Navexa identifies unresolved referral tasks and
            supports follow-up. Clinical assessment, treatment,
            and other clinical decisions remain with authorised
            healthcare professionals.
          </p>
        </div>

      </div>

    </div>
  );
};

export default CoordinatorDashboard;