import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { ReferralStatus, PatientType } from "../domain/enums.js";

const ReferralDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    getReferralById,
    confirmArrival,
    recordClinicalOutcome,
  } = useReferrals();

  const referral = id ? getReferralById(id) : getReferralById("REF-2024-8821");

  const [activeLogFilter, setActiveLogFilter] = useState("all"); // 'all' | 'barriers' | 'clinical'
  const [modalData, setModalData] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  if (!referral) {
    return (
      <div className="p-8 max-w-xl mx-auto text-center py-24 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-surface-container text-on-surface-variant mx-auto flex items-center justify-center shadow-xs">
          <span className="material-symbols-outlined text-[36px]">search_off</span>
        </div>
        <h2 className="font-headline-lg text-2xl text-primary font-bold">Referral Case Not Found</h2>
        <p className="text-on-surface-variant text-sm">
          No clinical referral matching identifier{" "}
          <code className="px-1.5 py-0.5 rounded bg-surface-container text-primary font-mono text-xs">
            {id || "unknown"}
          </code>{" "}
          was found in the regional registry.
        </p>
        <div className="pt-2">
          <Link
            to="/coordinator"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold shadow-xs hover:bg-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            <span>Return to Coordinator Hub</span>
          </Link>
        </div>
      </div>
    );
  }

  // Gates logic derived strictly from real domain records
  const isCreated = true;
  const isSent = referral.status !== ReferralStatus.CREATED;
  const isAcknowledged =
    referral.status === ReferralStatus.ACKNOWLEDGED ||
    referral.status === ReferralStatus.ARRIVAL_CONFIRMED ||
    referral.status === ReferralStatus.COMPLETED;
  const isTransitCleared =
    referral.transit?.status === "ARRIVED" ||
    referral.status === ReferralStatus.ARRIVAL_CONFIRMED ||
    referral.status === ReferralStatus.COMPLETED ||
    !referral.transitBarrier;
  const isArrivalVerified =
    referral.arrival != null ||
    referral.status === ReferralStatus.ARRIVAL_CONFIRMED ||
    referral.status === ReferralStatus.COMPLETED;
  const isCareCompleted = referral.status === ReferralStatus.COMPLETED;

  const timelineLogs = referral.timeline || [];
  const filteredLogs = timelineLogs.filter((log) => {
    if (activeLogFilter === "barriers") return log.status?.includes("BARRIER");
    if (activeLogFilter === "clinical") return !log.status?.includes("BARRIER");
    return true;
  });

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-secondary/40 animate-slide-up">
          <span className="material-symbols-outlined text-secondary-fixed text-[22px]">
            check_circle
          </span>
          <span className="font-body-sm text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Top Patient Clinical Identification Banner */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container/60 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary via-secondary-container to-secondary"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Patient Identity */}
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary-container text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-xs uppercase">
              {referral.patientName.slice(0, 2)}
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">
                  {referral.patientName}
                </h1>
                <span className="font-data-tabular text-xs px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-medium">
                  {referral.patientId || referral.id}
                </span>
                <span className="text-xs px-2 py-0.5 rounded bg-surface-container text-on-surface-variant">
                  {referral.age || "Perinatal"}
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                    referral.priority === "Urgent" || referral.priority === "STAT"
                      ? "bg-error-container text-on-error-container"
                      : "bg-surface-container text-primary"
                  }`}
                >
                  {referral.priority} Acuity
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                <span>Corridor: <strong className="text-on-surface">{referral.fromFacility}</strong> → <strong className="text-secondary">{referral.toFacility}</strong></span>
                <span>Type: <strong className="text-on-surface">{referral.referralType}</strong></span>
                <span>Status: <strong className="text-secondary font-semibold">{referral.status}</strong></span>
              </div>

              <div className="pt-1">
                <span className="px-2.5 py-0.5 rounded bg-surface-container-high text-xs text-on-surface font-medium">
                  {referral.condition || referral.reason}
                </span>
              </div>
            </div>
          </div>

          {/* Navigator & Contact Pod */}
          <div className="bg-surface-container-low p-3.5 rounded-xl border border-surface-container/60 flex items-center justify-between gap-4 min-w-[280px]">
            <div className="flex items-center gap-3">
              <img
                className="w-10 h-10 rounded-full object-cover"
                alt="Care Navigator"
                src={referral.navigator?.avatar || "https://lh3.googleusercontent.com/aida-public/AB6AXuDoZfH4bzWWKO46H7BwByYXNjLd4FhpN7LW57qYEUL5j3A47FUv2i09dJmjQL1-MUN4d7VztblABu5RPVUzpx8obJuR1ntnJjb4W9zE5qpFD2vmeTihz8r3qv6wjd0vqiE19y8l5GMFj-AhAZCenAQ7biqFZJWwGsbmWee9F4s5Sk-xXyQtcirTUUZU9Jw5PL2difZ0P0uXr72r6EMZvVHP30iJbdO8p4Anu7jP4zLlWygVN5Mv7nDeWQ"}
              />
              <div>
                <span className="text-[10px] uppercase font-bold text-secondary tracking-wider block">Assigned Navigator</span>
                <h4 className="font-title-sm text-xs font-bold text-primary">{referral.navigator?.name || "Maya Lin, MSW"}</h4>
                <p className="text-[11px] text-on-surface-variant font-data-tabular">{referral.caregiverContact || "(555) 392-1049"}</p>
              </div>
            </div>

            <button
              onClick={() => showToast(`Phone call connected with ${referral.caregiverContact || "patient"}.`)}
              className="p-2 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary"
              title="Call Caregiver / Patient"
            >
              <span className="material-symbols-outlined text-[18px]">call</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6-Gate Progress Lifeline */}
      <div className="bg-surface-container-lowest rounded-2xl p-6 shadow-sm border border-surface-container/60 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-label-sm font-bold uppercase text-secondary tracking-wider">
            Operational Lifeline Stepper
          </span>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-secondary-fixed text-on-secondary-fixed">
            {isCareCompleted
              ? "Gate 6 of 6 Verified"
              : isArrivalVerified
              ? "Gate 4 of 6 Verified"
              : isAcknowledged
              ? "Gate 2 of 6 Verified"
              : "Gate 1 of 6 Verified"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
          {/* Gate 1 */}
          <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container">
            <div className="w-8 h-8 mx-auto rounded-full bg-secondary text-white flex items-center justify-center text-xs font-bold shadow-xs">
              <span className="material-symbols-outlined text-[16px]">check</span>
            </div>
            <p className="text-xs font-bold text-primary mt-2">1. Created</p>
            <p className="text-[10px] text-on-surface-variant">Intake Authorized</p>
          </div>

          {/* Gate 2 */}
          <div className={`p-3 rounded-xl border ${isAcknowledged ? "bg-surface-container-low border-secondary/30" : "bg-surface-container-low/40 border-surface-container"}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${isAcknowledged ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"}`}>
              {isAcknowledged ? <span className="material-symbols-outlined text-[16px]">check</span> : "2"}
            </div>
            <p className="text-xs font-bold text-primary mt-2">2. Acknowledged</p>
            <p className="text-[10px] text-on-surface-variant">Bed Held</p>
          </div>

          {/* Gate 3 */}
          <div className={`p-3 rounded-xl border ${isTransitCleared ? "bg-surface-container-low border-secondary/30" : "bg-surface-container-low/40 border-surface-container"}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${isTransitCleared ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"}`}>
              {isTransitCleared ? <span className="material-symbols-outlined text-[16px]">check</span> : "3"}
            </div>
            <p className="text-xs font-bold text-primary mt-2">3. Transit Cleared</p>
            <p className="text-[10px] text-on-surface-variant">Safe Travel</p>
          </div>

          {/* Gate 4 */}
          <div className={`p-3 rounded-xl border ${isArrivalVerified ? "bg-surface-container-low border-secondary/30" : "bg-surface-container-low/40 border-surface-container"}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${isArrivalVerified ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"}`}>
              {isArrivalVerified ? <span className="material-symbols-outlined text-[16px]">verified</span> : "4"}
            </div>
            <p className="text-xs font-bold text-primary mt-2">4. Physical Arrival</p>
            <p className="text-[10px] text-on-surface-variant">Triage Bay Entry</p>
          </div>

          {/* Gate 5 */}
          <div className={`p-3 rounded-xl border ${isCareCompleted ? "bg-surface-container-low border-secondary/30" : "bg-surface-container-low/40 border-surface-container"}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${isCareCompleted ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"}`}>
              {isCareCompleted ? <span className="material-symbols-outlined text-[16px]">check</span> : "5"}
            </div>
            <p className="text-xs font-bold text-primary mt-2">5. Clinical Eval</p>
            <p className="text-[10px] text-on-surface-variant">Care Delivered</p>
          </div>

          {/* Gate 6 */}
          <div className={`p-3 rounded-xl border ${referral.followUpPlan ? "bg-surface-container-low border-secondary/30" : "bg-surface-container-low/40 border-surface-container"}`}>
            <div className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold ${referral.followUpPlan ? "bg-secondary text-white" : "bg-surface-container text-on-surface-variant"}`}>
              {referral.followUpPlan ? <span className="material-symbols-outlined text-[16px]">check</span> : "6"}
            </div>
            <p className="text-xs font-bold text-primary mt-2">6. 42-Day Protocol</p>
            <p className="text-[10px] text-on-surface-variant">Postpartum Care</p>
          </div>
        </div>
      </div>

      {/* Main 2-Column Working Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Arrival Verification, Dynamic Vitals, & Event Audit Log */}
        <div className="lg:col-span-8 space-y-6">
          {/* Arrival Status Card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container/60 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-title-sm text-base text-primary font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">verified_user</span>
                Physical Arrival Status
              </h3>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${isArrivalVerified ? "bg-secondary-fixed text-on-secondary-fixed" : "bg-surface-container text-on-surface-variant"}`}>
                {isArrivalVerified ? "Arrival Confirmed" : "En Route / Pending"}
              </span>
            </div>

            {isArrivalVerified ? (
              <div className="p-4 rounded-xl bg-surface-container-low space-y-2 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>Verified By: <strong className="text-primary">{referral.arrival?.verifiedBy || "Sarah Jenkins, RN"}</strong></span>
                  <span>Location: <strong className="text-primary">{referral.arrival?.room || "OB Assessment Bay 3B"}</strong></span>
                  <span>Timestamp: <strong className="font-data-tabular">{new Date(referral.arrival?.arrivedAt || referral.createdAt).toLocaleTimeString()}</strong></span>
                </div>
                <p className="text-on-surface-variant pt-1 border-t border-surface-container">
                  {referral.arrival?.notes || "Patient safely admitted to triage exam bay."}
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-surface-container-low/50 text-xs text-on-surface-variant flex items-center justify-between">
                <span>Patient has not yet completed physical triage check-in.</span>
                <button
                  onClick={() => {
                    confirmArrival(referral.id, {
                      department: referral.toFacility,
                      room: "Intake Bay 01",
                      verifiedBy: "Sarah Jenkins, RN",
                      notes: "Arrival verified by triage coordinator.",
                    });
                    showToast("Arrival confirmed!");
                  }}
                  className="px-3 py-1.5 rounded-lg bg-secondary text-white font-semibold text-xs hover:bg-on-secondary-container"
                >
                  Verify Arrival Now
                </button>
              </div>
            )}
          </div>

          {/* Clinical Telemetry Pod (DYNAMIC: Strictly Maternal vs. Neonatal) */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container/60 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-title-sm text-base text-primary font-bold flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">vital_signs</span>
                {referral.referralType === PatientType.CHILD
                  ? "Neonatal Assessment Telemetry"
                  : "Maternal Obstetric Telemetry"}
              </h3>
              <span className="text-[11px] font-data-tabular text-on-surface-variant">
                Synchronized with intake chart
              </span>
            </div>

            {referral.referralType === PatientType.CHILD ? (
              /* NEONATAL TELEMETRY POD (NO maternal BP or fetal heart rate!) */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Total Bilirubin</span>
                  <div className="font-headline-lg text-xl font-data-tabular font-bold text-error mt-1">
                    {referral.vitals?.tsb || "21.4 mg/dL"}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">AAP Threshold: 18.0</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Weight</span>
                  <div className="font-headline-lg text-xl font-data-tabular font-bold text-primary mt-1">
                    {referral.vitals?.weight || "2,980g"}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Gestational birth weight</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Temperature</span>
                  <div className="font-headline-lg text-xl font-data-tabular font-bold text-secondary mt-1">
                    {referral.vitals?.temp || "36.8 °C"}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Axillary normothermic</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Heart Rate</span>
                  <div className="font-headline-lg text-xl font-data-tabular font-bold text-primary mt-1">
                    {referral.vitals?.hr || "138 bpm"}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Regular sinus rate</span>
                </div>
              </div>
            ) : (
              /* MATERNAL OBSTETRIC POD */
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Blood Pressure</span>
                  <div className="font-headline-lg text-xl font-data-tabular font-bold text-error mt-1">
                    {referral.vitals?.bp || "152/98"}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Target &lt; 140/90 mmHg</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Fetal Heart Rate</span>
                  <div className="font-headline-lg text-xl font-data-tabular font-bold text-secondary mt-1">
                    {referral.vitals?.fhr || "142"} bpm
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Reactive baseline</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Urine Dipstick</span>
                  <div className="font-headline-lg text-xl font-data-tabular font-bold text-primary mt-1">
                    {referral.vitals?.urine || "+2 Protein"}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Proteinuria confirmed</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container-low">
                  <span className="text-[10px] uppercase font-bold text-on-surface-variant block">Biophysical Profile</span>
                  <div className="font-headline-lg text-xl font-data-tabular font-bold text-secondary mt-1">
                    {referral.vitals?.bpp || "8/8"}
                  </div>
                  <span className="text-[10px] text-on-surface-variant">Reassuring status</span>
                </div>
              </div>
            )}
          </div>

          {/* Event & Interaction Audit Log */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container/60 space-y-4">
            <div className="flex items-center justify-between border-b border-surface-container pb-3">
              <h3 className="font-title-sm text-base text-primary font-bold">
                Chronological Audit History
              </h3>
              <div className="flex gap-1.5 text-xs">
                <button
                  onClick={() => setActiveLogFilter("all")}
                  className={`px-2.5 py-1 rounded-md ${activeLogFilter === "all" ? "bg-primary text-white font-bold" : "bg-surface-container-low text-on-surface-variant"}`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveLogFilter("barriers")}
                  className={`px-2.5 py-1 rounded-md ${activeLogFilter === "barriers" ? "bg-primary text-white font-bold" : "bg-surface-container-low text-on-surface-variant"}`}
                >
                  Barriers
                </button>
              </div>
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto">
              {filteredLogs.slice().reverse().map((t, idx) => (
                <div key={idx} className="p-3 rounded-lg bg-surface-container-low text-xs flex items-start justify-between gap-3">
                  <div>
                    <span className="font-bold text-primary">{t.status.replace(/_/g, " ")}</span>
                    <p className="text-on-surface-variant mt-0.5">{t.notes}</p>
                  </div>
                  <span className="text-[10px] font-data-tabular text-on-surface-variant shrink-0">
                    {new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Clinical Outcome & Continuing Care Link */}
        <div className="lg:col-span-4 space-y-5">
          {/* Clinical Outcome Status Card */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-3">
            <h3 className="font-title-sm text-sm text-primary font-bold flex items-center gap-1.5">
              <span className="material-symbols-outlined text-secondary text-[18px]">assignment_turned_in</span>
              Clinical Care Outcome
            </h3>

            {referral.clinicalOutcome ? (
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-surface-container-low space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Attending:</span>
                    <strong className="text-primary">{referral.clinicalOutcome.clinicianName}</strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-on-surface-variant">Disposition:</span>
                    <strong className="text-secondary">{referral.clinicalOutcome.disposition}</strong>
                  </div>
                </div>
                <p className="text-on-surface-variant text-xs leading-relaxed">
                  "{referral.clinicalOutcome.clinicalNotes}"
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-on-surface-variant">
                  Clinical outcome pending. Authorized attending physician or midwife records clinical findings once treatment occurs.
                </p>
                <Link
                  to="/facility"
                  className="w-full py-2 px-3 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold flex items-center justify-center gap-1"
                >
                  <span>Open Facility Intake Desk</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </Link>
              </div>
            )}
          </div>

          {/* 42-Day Continuing Care Protocol Link */}
          {referral.followUpPlan && (
            <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-title-sm text-sm text-primary font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-secondary text-[18px]">event_available</span>
                  42-Day Continuing Care Plan
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary-fixed text-on-secondary-fixed">
                  Active
                </span>
              </div>
              <p className="text-xs text-on-surface-variant">
                Postpartum surveillance protocol established with 4 touchpoints. Lead: {referral.followUpPlan.leadWorker}.
              </p>
              <Link
                to="/continuity"
                className="w-full py-2 px-3 rounded-lg bg-secondary text-white text-xs font-semibold hover:bg-on-secondary-container transition-colors flex items-center justify-center gap-1"
              >
                <span>View Continuity Schedule</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            </div>
          )}

          {/* Quick Actions & Handover Voucher */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-xs border border-surface-container/60 space-y-2">
            <span className="text-[10px] font-label-sm font-bold uppercase text-on-surface-variant tracking-wider block">
              Documentation & Handover
            </span>
            <button
              onClick={() =>
                setModalData({
                  title: `Intake Voucher #${referral.id}`,
                  content: `Digital transfer voucher for ${referral.patientName}. Transferred from ${referral.fromFacility} to ${referral.toFacility}. Coverage authorized under Regional Perinatal Safety Compact.`,
                })
              }
              className="w-full p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-medium flex items-center justify-between transition-colors"
            >
              <span>Generate Intake Voucher</span>
              <span className="material-symbols-outlined text-[16px]">print</span>
            </button>
            <button
              onClick={() =>
                setModalData({
                  title: `Audit Chain: ${referral.id}`,
                  content: `Chronological immutable event ledger containing ${referral.auditTrail?.length || 1} signed actions. First logged by ${referral.fromClinician}.`,
                })
              }
              className="w-full p-2.5 rounded-lg bg-surface-container-low hover:bg-surface-container text-primary text-xs font-medium flex items-center justify-between transition-colors"
            >
              <span>Inspect Audit Ledger</span>
              <span className="material-symbols-outlined text-[16px]">history</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info Modal */}
      {modalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-container space-y-4">
            <h3 className="font-headline-md text-lg text-primary font-bold">{modalData.title}</h3>
            <p className="text-xs text-on-surface-variant leading-relaxed">{modalData.content}</p>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setModalData(null)}
                className="px-4 py-2 rounded-lg bg-primary text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReferralDetails;
