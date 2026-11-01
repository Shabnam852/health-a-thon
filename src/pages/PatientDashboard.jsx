import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { ReferralStatus, TransportStatus } from "../domain/enums.js";
import { StorageAdapter } from "../services/storageAdapter.js";

const PATIENT_VIEWS = ["transit", "checklist", "support"];

// How far along the ride is, for the stages on the ride screen.
const RIDE_STAGES = ["Ride requested", "Vehicle on the way", "Picked up", "Arrived at hospital"];
const RIDE_STAGE_BY_STATUS = {
  [TransportStatus.REQUESTED]: 1,
  [TransportStatus.ASSIGNED]: 1,
  [TransportStatus.DISPATCHED]: 2,
  [TransportStatus.PICKED_UP]: 3,
  [TransportStatus.ARRIVED]: 4,
};

const CHECKLIST_ITEMS = [
  { id: 1, text: "Photo ID (Aadhaar, Voter ID or Passport)" },
  { id: 2, text: "Ayushman Bharat (PM-JAY) card or ABHA number (if available)" },
  { id: 3, text: "Mother & Child Protection (MCP) card and current prescriptions" },
  { id: 4, text: "Comfortable slippers and extra phone charger" },
];

const PatientDashboard = () => {
  const { referrals, facilities, activeReferralId, setActiveReferralId } = useReferrals();
  const [searchParams] = useSearchParams();

  // Find active referral or default to first
  const referral =
    referrals.find((r) => r.id === activeReferralId) ||
    referrals.find((r) => r.patientName?.includes("Fathima")) ||
    referrals[0];

  const patientFirstName = referral?.patientName?.split(" ")[0] || "Patient";
  const tr = referral?.transit;

  const viewFromUrl = searchParams.get("view");
  const view = PATIENT_VIEWS.includes(viewFromUrl) ? viewFromUrl : "overview";

  // Each view is its own screen, so it opens at the top.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // What to bring checklist state
  const [savedChecklists, setSavedChecklists] = useState(() => StorageAdapter.getChecklists());
  const checklist = CHECKLIST_ITEMS.map((item) => ({
    ...item,
    checked: Boolean(savedChecklists[referral?.id]?.[item.id]),
  }));

  const { toast, showToast } = useToast();

  const toggleChecklistItem = (id) => {
    const key = referral?.id;
    const next = {
      ...savedChecklists,
      [key]: { ...savedChecklists[key], [id]: !savedChecklists[key]?.[id] },
    };
    setSavedChecklists(next);
    StorageAdapter.saveChecklists(next);
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

  const rideStage = isArrivalConfirmed ? RIDE_STAGES.length : RIDE_STAGE_BY_STATUS[tr?.status] || 0;
  const rideSummary = isArrivalConfirmed
    ? "Arrived at hospital"
    : tr?.status === TransportStatus.FAILED
    ? "Disrupted: another ride is being arranged"
    : RIDE_STAGES[rideStage - 1] || "Being arranged";
  const packedCount = checklist.filter((item) => item.checked).length;
  const receivingFacility = facilities.find((f) => f.name === referral?.toFacility);

  return (
    <div className="flex flex-col w-full pb-16">
      {/* Toast Notification */}
      <Toast toast={toast} />

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
            {referrals.map((r) => (
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
              href="tel:108"
              className="w-full md:w-auto px-4 py-2 rounded-lg bg-error text-white font-title-sm text-xs hover:opacity-95 shadow-xs flex items-center justify-center gap-1.5 font-bold shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">call</span>
              <span>Call 108 / Emergency Services</span>
            </a>
          </div>
        </section>

        {view === "overview" && (
          <>
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
                Your dedicated guide <strong className="text-secondary-fixed">{referral?.navigator?.name || "Priya Raman, MSW"}</strong> is monitoring your arrival.
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
                  ? `Driver ${tr?.driver || "Manjunath Gowda"} is on the way (ETA: ${tr?.eta || "12m"})`
                  : isFacilityAccepted
                  ? "Bed pod prepped for your arrival"
                  : "Awaiting facility intake review"}
              </p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
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
                <div className="relative group">
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
                      {tr?.vehicle ? (
                        <>Assigned vehicle: <strong className="text-primary">{tr.vehicle}</strong> (Driver: {tr.driver}, ETA: {tr.eta || "10m"}). Zero fare or copay required.</>
                      ) : tr ? (
                        "Your ride has been requested. Your care navigator will confirm the vehicle and driver soon."
                      ) : (
                        "If you need free transportation or a safe way to carry your newborn, your care navigator will arrange it directly."
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

              {/* Right Column: where to go next */}
              <div className="lg:col-span-5 space-y-4">
                {[
                  {
                    to: "/patient?view=transit",
                    icon: "directions_car",
                    title: "Your Ride",
                    detail: tr ? rideSummary : "No ride booked yet",
                  },
                  {
                    to: "/patient?view=checklist",
                    icon: "checklist",
                    title: "What to Bring",
                    detail: `${packedCount} of ${checklist.length} items packed`,
                  },
                  {
                    to: "/patient?view=support",
                    icon: "support_agent",
                    title: "Your Care Navigator",
                    detail: referral?.navigator?.name || "Priya Raman, MSW",
                  },
                ].map((item) => (
                  <Link
                    key={item.to}
                    to={item.to}
                    className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 flex items-center gap-3 hover:border-secondary/50 transition-colors"
                  >
                    <span className="material-symbols-outlined text-secondary text-[22px] shrink-0">{item.icon}</span>
                    <span className="flex-1 min-w-0">
                      <span className="block font-title-sm text-sm text-primary font-bold">{item.title}</span>
                      <span className="block text-xs text-on-surface-variant mt-0.5">{item.detail}</span>
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant text-[18px] shrink-0">arrow_forward</span>
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}

        {view === "transit" && (
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-5">
            <div>
              <span className="text-[11px] font-label-sm uppercase font-bold text-secondary tracking-wider">Live Transport</span>
              <h1 className="font-headline-md text-xl font-bold text-primary">Your Ride to {referral?.toFacility}</h1>
            </div>

            {tr?.status === TransportStatus.FAILED && !isArrivalConfirmed && (
              <div className="p-3 rounded-xl bg-error-container text-on-error-container text-xs">
                <strong>Your ride was disrupted.</strong> {tr.failedReason} Your care navigator is arranging another one.
              </div>
            )}

            {!tr && !isArrivalConfirmed ? (
              <p className="text-sm text-on-surface-variant">
                No ride is booked yet. If you need free transportation or a safe way to carry your newborn, your care navigator will arrange it.
              </p>
            ) : (
              <>
                <ol className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  {RIDE_STAGES.map((stage, index) => {
                    const isDone = index < rideStage;
                    return (
                      <li
                        key={stage}
                        className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                          isDone ? "bg-secondary/10 text-secondary" : "bg-surface-container-low text-on-surface-variant"
                        }`}
                      >
                        <span className="material-symbols-outlined text-[16px] shrink-0">
                          {isDone ? "check_circle" : "radio_button_unchecked"}
                        </span>
                        <span>{stage}</span>
                      </li>
                    );
                  })}
                </ol>

                {tr && (
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {[
                      ["Vehicle", tr.vehicle || "Being assigned"],
                      ["Driver", tr.driver || "Being assigned"],
                      ["Driver phone", tr.driverPhone],
                      ["Estimated arrival", isArrivalConfirmed ? "Arrived" : tr.eta],
                      ["Pickup", tr.pickupAddress || referral?.patientAddress],
                      ["Destination", referral?.toFacility],
                    ]
                      .filter(([, value]) => value)
                      .map(([label, value]) => (
                        <div key={label} className="p-3 rounded-xl bg-surface-container-low">
                          <dt className="text-on-surface-variant">{label}</dt>
                          <dd className="font-semibold text-primary mt-0.5">{value}</dd>
                        </div>
                      ))}
                  </dl>
                )}

                <p className="text-xs text-on-surface-variant">Zero fare or copay required.</p>
              </>
            )}
          </div>
        )}

        {view === "checklist" && (
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="text-[11px] font-label-sm uppercase font-bold text-secondary tracking-wider">Preparation</span>
                <h1 className="font-headline-md text-xl font-bold text-primary">What to Bring</h1>
              </div>
              <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-secondary-fixed text-on-secondary-fixed">
                {packedCount} of {checklist.length} packed
              </span>
            </div>

            <div className="space-y-2">
              {checklist.map((item) => (
                <label
                  key={item.id}
                  className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-container-low cursor-pointer transition-colors text-xs text-on-surface"
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => toggleChecklistItem(item.id)}
                    className="w-4 h-4 rounded text-secondary focus:ring-secondary/40"
                  />
                  <span className={item.checked ? "line-through text-on-surface-variant" : ""}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>

            <p className="text-xs text-on-surface-variant border-t border-surface-container pt-3">
              At {referral?.toFacility}, show case ID <strong className="text-primary">{referral?.id}</strong> at the triage reception desk.
            </p>
          </div>
        )}

        {view === "support" && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-3">
              <span className="text-[10px] font-label-sm font-bold uppercase text-secondary tracking-wider block">
                Your Dedicated Care Navigator
              </span>

              <div className="flex items-center gap-3">
                <img
                  className="w-12 h-12 rounded-full object-cover ring-2 ring-surface-container"
                  alt="Navigator"
                  src={referral?.navigator?.avatar || "/images/avatar-priya-raman.svg"}
                />
                <div>
                  <h3 className="font-title-sm text-sm text-primary font-bold">
                    {referral?.navigator?.name || "Priya Raman, MSW"}
                  </h3>
                  <p className="text-xs text-on-surface-variant">Lead Care Coordinator</p>
                  <p className="text-[11px] text-secondary font-medium mt-0.5">
                    {referral?.navigator?.phone || "+91 90000 21049"}
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-surface-container-low text-xs text-on-surface-variant italic leading-relaxed">
                "I am here to solve any travel, childcare, or translation barrier so you and baby receive timely care. Call me anytime."
              </div>

              <button
                onClick={() => showToast(`Demo only: no call placed to ${referral?.navigator?.name || "your navigator"}.`)}
                className="w-full py-2 px-3 rounded-lg bg-primary text-white text-xs font-semibold hover:bg-primary-container transition-colors flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">call</span>
                <span>Call Navigator {referral?.navigator?.name?.split(",")[0] || "Directly"}</span>
              </button>
            </div>


            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-3">
              <span className="text-[10px] font-label-sm font-bold uppercase text-secondary tracking-wider block">
                Your Hospital & Language Support
              </span>
              <dl className="space-y-2 text-xs">
                {[
                  ["Receiving hospital", referral?.toFacility],
                  ["Hospital phone", receivingFacility?.phone],
                  ["Your language", referral?.language],
                  ["Interpreter", referral?.interpreterNeeded ? "Requested for your visit" : "Not requested"],
                ]
                  .filter(([, value]) => value)
                  .map(([label, value]) => (
                    <div key={label} className="p-3 rounded-xl bg-surface-container-low">
                      <dt className="text-on-surface-variant">{label}</dt>
                      <dd className="font-semibold text-primary mt-0.5">{value}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;
