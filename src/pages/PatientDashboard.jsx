import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { ReferralStatus, TransportStatus } from "../domain/enums.js";

const PatientDashboard = () => {
  const { referrals, activeReferralId, setActiveReferralId } = useReferrals();
  const [searchParams] = useSearchParams();

  // Find active referral or default to first
  const referral =
    referrals.find((r) => r.id === activeReferralId) ||
    referrals.find((r) => r.patientName?.includes("Fatima")) ||
    referrals[0];

  const patientFirstName = referral?.patientName?.split(" ")[0] || "Patient";
  const tr = referral?.transit;

  const viewFromUrl = searchParams.get("view");
  useEffect(() => {
    if (viewFromUrl) {
      const el = document.getElementById(viewFromUrl);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [viewFromUrl]);

  // What to bring checklist state
  const [checklist, setChecklist] = useState([
    { id: 1, text: "Photo ID (Driver License or Passport)", checked: true },
    { id: 2, text: "Health Insurance card or Medicaid number (if available)", checked: true },
    { id: 3, text: "Current prenatal vitamins or prescription bottles", checked: false },
    { id: 4, text: "Comfortable slippers and extra phone charger", checked: false },
  ]);

  const [toastMessage, setToastMessage] = useState(null);

  const toggleChecklistItem = (id) => {
    setChecklist((prev) =>
      prev.map((item) => (item.id === id ? { ...item, checked: !item.checked } : item))
    );
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Determine stage progress from actual domain status
  const isDoctorSent = referral?.status !== ReferralStatus.CREATED;
  const isFacilityAccepted =
    referral?.status === ReferralStatus.ACKNOWLEDGED ||
    referral?.status === ReferralStatus.ARRIVAL_CONFIRMED ||
    referral?.status === ReferralStatus.COMPLETED;
  const isTransitActive =
    tr?.status === TransportStatus.DISPATCHED || tr?.status === TransportStatus.PICKED_UP;
  const isTransitArrived =
    tr?.status === TransportStatus.ARRIVED ||
    referral?.status === ReferralStatus.ARRIVAL_CONFIRMED ||
    referral?.status === ReferralStatus.COMPLETED;
  const isArrivalConfirmed =
    referral?.status === ReferralStatus.ARRIVAL_CONFIRMED ||
    referral?.status === ReferralStatus.COMPLETED;
  const isCareCompleted = referral?.status === ReferralStatus.COMPLETED;

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-secondary/40 animate-slide-up">
          <span className="material-symbols-outlined text-secondary-fixed text-[22px]">
            check_circle
          </span>
          <span className="font-body-sm text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Patient Case Selector for Demo Reviewers */}
        <div className="bg-surface-container-lowest p-4 rounded-xl border border-surface-container flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">
              switch_account
            </span>
            <span className="font-title-sm text-xs font-bold text-primary">
              Demo Patient View Selector:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
            {referrals.slice(0, 5).map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveReferralId(r.id)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  r.id === referral?.id
                    ? "bg-secondary text-white font-semibold shadow-xs"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {r.patientName.split(" ")[0]} ({r.referralType})
              </button>
            ))}
          </div>
        </div>

        {/* Urgent Emergency Advisory Banner */}
        <section id="emergency" className="bg-error-container text-on-error-container rounded-xl p-4 shadow-xs">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span
                className="material-symbols-outlined text-error text-[26px] shrink-0"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                emergency
              </span>
              <div>
                <p className="font-title-sm text-sm text-on-error-container font-bold">
                  Immediate Maternal & Baby Safety Warning
                </p>
                <p className="font-body-sm text-xs text-on-error-container opacity-90">
                  If you experience sudden severe bleeding, vision changes, intense constant pain, or reduced baby movement right now:
                </p>
              </div>
            </div>

            <a
              href="tel:911"
              className="w-full md:w-auto px-4 py-2 rounded-lg bg-error text-white font-title-sm text-xs hover:opacity-95 shadow-xs flex items-center justify-center gap-1.5 font-bold shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              <span>Call 911 / Emergency Services</span>
            </a>
          </div>
        </section>

        {/* Reassuring Hero Banner */}
        <header className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary-container via-primary to-primary-container text-on-primary p-6 md:p-8 shadow-md">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-secondary-fixed text-xs font-label-md">
                <span className="w-2 h-2 rounded-full bg-secondary-fixed animate-pulse"></span>
                Active Care Transition • {referral?.referralType || "Perinatal"}
              </div>

              <h1 className="font-headline-xl text-2xl sm:text-3xl font-bold text-white tracking-tight">
                Hello {patientFirstName}, we’re with you every step of the way.
              </h1>

              <p className="font-body-md text-sm text-surface-container-high">
                Your transfer to <strong className="text-white">{referral?.toFacility}</strong> is coordinated and confirmed.
                Your dedicated guide <strong className="text-secondary-fixed">{referral?.navigator?.name || "Maya Lin, MSW"}</strong> is monitoring your arrival.
              </p>
            </div>

            {/* Next Immediate Status Pod */}
            <div className="bg-surface-container-lowest/10 backdrop-blur-md rounded-xl p-4 min-w-[260px] lg:max-w-xs shadow-sm space-y-1.5 text-white border border-white/10">
              <div className="flex items-center justify-between text-secondary-fixed text-xs font-semibold uppercase tracking-wider">
                <span>Immediate Status</span>
                <span className="material-symbols-outlined text-[16px]">near_me</span>
              </div>
              <p className="font-title-sm text-sm font-bold">
                {isCareCompleted
                  ? "Care Episode Completed"
                  : isArrivalConfirmed
                  ? "Checked In at Hospital"
                  : isTransitActive
                  ? `${tr?.vehicle || "MediRide Van"}`
                  : isFacilityAccepted
                  ? "Hospital Prepped & Ready"
                  : "Referral Transmitted"}
              </p>
              <p className="text-xs text-surface-container-high">
                {isCareCompleted
                  ? "Continuous 42-day postpartum follow-up active"
                  : isArrivalConfirmed
                  ? `Admitted to ${referral?.toFacility}`
                  : isTransitActive
                  ? `Driver ${tr?.driver || "Marcus Ross"} is on the way (ETA: ${tr?.eta || "12m"})`
                  : isFacilityAccepted
                  ? "Bed pod prepped for your arrival"
                  : "Awaiting facility intake review"}
              </p>
            </div>
          </div>
        </header>

        {/* 2-Column Main Workspace */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Reactive Care Roadmap Timeline (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-xs border border-surface-container/60 space-y-6">
              <div className="flex items-center justify-between border-b border-surface-container pb-3">
                <div>
                  <span className="text-[11px] font-label-sm uppercase font-bold text-secondary tracking-wider">
                    Your Step-by-Step Roadmap
                  </span>
                  <h2 className="font-headline-md text-xl font-bold text-primary">
                    Today’s Care Progress
                  </h2>
                </div>
                <span className="text-xs font-data-tabular text-on-surface-variant font-medium">
                  Case ID: {referral?.id}
                </span>
              </div>

              {/* Dynamic Lifeline Steps */}
              <div className="space-y-6 relative pl-6 border-l-2 border-surface-container ml-3">
                {/* Step 1: Doctor Referral Sent */}
                <div className="relative group">
                  <div className={`absolute -left-[31px] top-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isDoctorSent ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"
                  }`}>
                    {isDoctorSent ? <span className="material-symbols-outlined text-[16px]">check</span> : "1"}
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-secondary uppercase block">Step 1 • Completed</span>
                    <h3 className="font-title-sm text-sm text-primary font-bold mt-0.5">Doctor Referral Created</h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {referral?.fromFacility} sent clinical transfer notes to {referral?.toFacility} to ensure seamless intake.
                    </p>
                  </div>
                </div>

                {/* Step 2: Receiving Facility Accepted */}
                <div className="relative group">
                  <div className={`absolute -left-[31px] top-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isFacilityAccepted ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"
                  }`}>
                    {isFacilityAccepted ? <span className="material-symbols-outlined text-[16px]">check</span> : "2"}
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-secondary uppercase block">Step 2 • {isFacilityAccepted ? "Completed" : "In Review"}</span>
                    <h3 className="font-title-sm text-sm text-primary font-bold mt-0.5">Hospital Confirmed Ready</h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {referral?.toFacility} acknowledged the transfer and reserved appropriate care bay capacity.
                    </p>
                  </div>
                </div>

                {/* Step 3: Transport & Travel Support */}
                <div id="transit" className="relative group scroll-mt-24">
                  <div className={`absolute -left-[31px] top-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isTransitArrived
                      ? "bg-secondary text-white"
                      : isTransitActive
                      ? "bg-primary text-white ring-4 ring-secondary/20 animate-pulse"
                      : "bg-surface-container text-on-surface-variant"
                  }`}>
                    {isTransitArrived ? (
                      <span className="material-symbols-outlined text-[16px]">check</span>
                    ) : (
                      <span className="material-symbols-outlined text-[15px]">local_taxi</span>
                    )}
                  </div>
                  <div className={`p-4 rounded-xl ${isTransitActive ? "bg-secondary/10 border border-secondary/30" : "bg-surface-container-low"}`}>
                    <span className="text-[10px] font-bold text-secondary uppercase block">
                      Step 3 • {isTransitArrived ? "Completed" : isTransitActive ? "Active • En Route" : "Travel Assistance"}
                    </span>
                    <h3 className="font-title-sm text-sm text-primary font-bold mt-0.5">
                      {isTransitActive ? "MediRide Travel Support En Route" : isTransitArrived ? "Safe Transit Completed" : "Travel Assistance Available"}
                    </h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {tr ? (
                        <>Assigned vehicle: <strong className="text-primary">{tr.vehicle}</strong> (Driver: {tr.driver}, ETA: {tr.eta || "10m"}). Zero fare or copay required.</>
                      ) : (
                        "If you need free transportation or an infant car seat, your care navigator will arrange it directly."
                      )}
                    </p>
                  </div>
                </div>

                {/* Step 4: Physical Hospital Arrival */}
                <div className="relative group">
                  <div className={`absolute -left-[31px] top-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isArrivalConfirmed ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"
                  }`}>
                    {isArrivalConfirmed ? <span className="material-symbols-outlined text-[16px]">check</span> : "4"}
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-secondary uppercase block">Step 4 • {isArrivalConfirmed ? "Completed" : "Upcoming"}</span>
                    <h3 className="font-title-sm text-sm text-primary font-bold mt-0.5">Arrive & Effortless Check-In</h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {isArrivalConfirmed ? (
                        <>Intake confirmed at <strong className="text-primary">{referral?.arrival?.department || referral?.toFacility}</strong>.</>
                      ) : (
                        `Walk through Entrance B. Simply mention ${patientFirstName} or show your referral ID to the triage reception desk.`
                      )}
                    </p>
                  </div>
                </div>

                {/* Step 5: Clinical Care & 42-Day Continuity */}
                <div className="relative group">
                  <div className={`absolute -left-[31px] top-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCareCompleted ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"
                  }`}>
                    {isCareCompleted ? <span className="material-symbols-outlined text-[16px]">check</span> : "5"}
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-xl">
                    <span className="text-[10px] font-bold text-secondary uppercase block">Step 5 • {isCareCompleted ? "Completed" : "Care & Follow-Up"}</span>
                    <h3 className="font-title-sm text-sm text-primary font-bold mt-0.5">Clinical Care & Continuing Support</h3>
                    <p className="text-xs text-on-surface-variant mt-1">
                      {isCareCompleted ? (
                        <>Hospital care completed. Active 42-day continuous postpartum and baby follow-up schedule established.</>
                      ) : (
                        "Clinical team conducts evaluation and treatment. Follow-up visits are scheduled before discharge."
                      )}
                    </p>
                    {isCareCompleted && (
                      <Link
                        to="/continuity"
                        className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-secondary hover:underline"
                      >
                        <span>View 42-Day Postpartum Visit Roadmap</span>
                        <span className="material-symbols-outlined text-[13px]">arrow_forward</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Check-in Pass, Guide Card & Checklist (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Dedicated Navigator Guide Card */}
            <div id="support" className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-3 scroll-mt-24">
              <span className="text-[10px] font-label-sm font-bold uppercase text-secondary tracking-wider block">
                Your Dedicated Care Navigator
              </span>

              <div className="flex items-center gap-3">
                <img
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-surface-container"
                  alt="Navigator"
                  src={referral?.navigator?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDoZfH4bzWWKO46H7BwByYXNjLd4FhpN7LW57qYEUL5j3A47FUv2i09dJmjQL1-MUN4d7VztblABu5RPVUzpx8obJuR1ntnJjb4W9zE5qpFD2vmeTihz8r3qv6wjd0vqiE19y8l5GMFj-AhAZCenAQ7biqFZJWwGsbmWee9F4s5Sk-xXyQtcirTUUZU9Jw5PL2difZ0P0uXr72r6EMZvVHP30iJbdO8p4Anu7jP4zLlWygVN5Mv7nDeWQ"}
                />
                <div>
                  <h3 className="font-title-sm text-sm text-primary font-bold">
                    {referral?.navigator?.name || "Maya Lin, MSW"}
                  </h3>
                  <p className="text-xs text-on-surface-variant">Lead Care Coordinator</p>
                  <p className="text-[11px] text-secondary font-medium mt-0.5">
                    {referral?.navigator?.phone || "(555) 392-1049"}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant italic leading-relaxed">
                "I am here to solve any travel, childcare, or translation barrier so you and baby receive timely care. Call me anytime."
              </div>

              <button
                onClick={() => showToast(`Calling your navigator ${referral?.navigator?.name || "Maya Lin"}...`)}
                className="w-full py-2 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>Call Navigator Maya Directly</span>
              </button>
            </div>

            {/* What to Bring Checklist */}
            <div id="checklist" className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-3 scroll-mt-24">
              <h3 className="font-title-sm text-sm text-primary font-bold flex items-center gap-1.5">
                <span className="material-symbols-outlined text-secondary text-[18px]">checklist</span>
                What to Bring Checklist
              </h3>

              <div className="space-y-2">
                {checklist.map((item) => (
                  <label
                    key={item.id}
                    onClick={() => toggleChecklistItem(item.id)}
                    className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors text-xs text-on-surface"
                  >
                    <input
                      type="checkbox"
                      checked={item.checked}
                      onChange={() => {}}
                      className="w-4 h-4 rounded text-secondary focus:ring-secondary/40"
                    />
                    <span className={item.checked ? "line-through text-on-surface-variant" : ""}>
                      {item.text}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
