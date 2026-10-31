import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { BarrierStatus, TransportStatus } from "../domain/enums.js";

const BarrierResolution = () => {
  const {
    referrals,
    dispatchTransport,
    updateBarrierStatus,
    confirmArrival,
  } = useReferrals();

  // Find all referrals with barriers
  const barrierCases = referrals.filter(
    (r) => (r.barriers && r.barriers.length > 0) || r.transitBarrier || r.transit != null
  );

  const [selectedCaseId, setSelectedCaseId] = useState(
    () => barrierCases[0]?.id || "NX-9042"
  );
  const [activeFilter, setActiveFilter] = useState("all");
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const activeCase =
    barrierCases.find((c) => c.id === selectedCaseId) || barrierCases[0] || referrals[0];

  const primaryBarrier =
    activeCase?.barriers?.find((b) => b.status !== BarrierStatus.RESOLVED) ||
    activeCase?.barriers?.[0] || {
      id: "BAR-GENERIC",
      title: "Active Transit & Equipment Barrier",
      category: "TRANSPORT",
      description: "Family vehicle disabled; specialized clinical transit required.",
      status: BarrierStatus.IN_PROGRESS,
    };

  const handleDispatchVan = () => {
    if (!activeCase) return;

    dispatchTransport(activeCase.id, {
      vehicle: "MediVan #04 (Silver Transit • Plate 7TX-489)",
      driver: "Marcus Ross",
      driverPhone: "(555) 481-9921",
      eta: "12 mins",
      requiresInfantCarSeat: activeCase.referralType === "Child",
      pickupAddress: activeCase.patientAddress || "318 Elm Street, Apt 2C",
      destinationFacility: activeCase.toFacility,
    });

    if (primaryBarrier.id) {
      updateBarrierStatus(
        activeCase.id,
        primaryBarrier.id,
        BarrierStatus.RESOLVED,
        "MediVan #04 dispatched with certified infant car seat."
      );
    }

    showToast(`MediVan #04 dispatched for ${activeCase.patientName}! Driver Marcus Ross en route (ETA 12m).`);
  };

  const handleConfirmIntake = () => {
    if (!activeCase) return;

    confirmArrival(activeCase.id, {
      department: activeCase.department || "St. Jude OB / Neonatal Triage",
      room: "Intake Bay 02",
      verifiedBy: "Sarah Jenkins, RN (Lead Coordinator)",
      notes: "Physical arrival confirmed at hospital intake. Transit and admission barrier successfully resolved.",
    });

    showToast(`Care received! Case #${activeCase.id} successfully checked in at ${activeCase.toFacility}.`);
  };

  // Filtered cases
  const filteredCases = barrierCases.filter((c) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "transit") return c.barriers?.some((b) => b.category === "TRANSPORT") || c.transitBarrier;
    if (activeFilter === "financial") return c.barriers?.some((b) => b.category === "FINANCIAL");
    if (activeFilter === "social") return c.barriers?.some((b) => b.category === "DEPENDENT_CARE" || b.category === "LINGUISTIC");
    return true;
  });

  return (
    <div className="flex flex-col w-full pb-16 px-4 sm:px-6 lg:px-8 max-w-[1600px] mx-auto space-y-6 pt-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-primary text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-secondary/40 animate-slide-up">
          <span className="material-symbols-outlined text-secondary-fixed text-[22px]">
            check_circle
          </span>
          <span className="font-body-sm text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Operational Alert Banner */}
      <div className="bg-primary text-white p-5 rounded-2xl shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="p-2.5 bg-white/10 rounded-xl shrink-0">
            <span className="material-symbols-outlined text-secondary-fixed text-[26px]">
              warning_amber
            </span>
          </div>
          <div className="space-y-0.5">
            <span className="font-label-sm text-[10px] uppercase tracking-wider text-secondary-fixed font-bold">
              Core Operational Principle
            </span>
            <p className="font-body-sm text-xs sm:text-sm text-white/90">
              <strong className="text-white font-semibold">"A referral sent is not care received."</strong>{" "}
              Overdue arrivals and socioeconomic transit disruptions must be resolved by care coordinators before a patient is lost to care.
            </p>
          </div>
        </div>

        <span className="text-[11px] font-label-sm text-secondary-fixed bg-primary-container px-3 py-1 rounded-full border border-secondary/30 shrink-0">
          Connected Domain Store Active
        </span>
      </div>

      {/* Main Split Layout: Left Cases List (4 cols) / Right Resolution Console (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Overdue Cases Stack */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-title-sm text-sm font-bold text-primary">Overdue Cases with Barriers</h3>
            <span className="text-xs text-on-surface-variant font-medium">({filteredCases.length})</span>
          </div>

          {/* Quick Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5 pb-1">
            {[
              { id: "all", label: "All" },
              { id: "transit", label: "Transit" },
              { id: "financial", label: "Financial" },
              { id: "social", label: "Social/Childcare" },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setActiveFilter(f.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  activeFilter === f.id
                    ? "bg-primary text-white font-semibold"
                    : "bg-surface-container-low text-on-surface-variant hover:bg-surface-container"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="space-y-2.5">
            {filteredCases.map((c) => {
              const isSelected = c.id === activeCase?.id;
              const isUrgent = c.priority === "Urgent" || c.priority === "STAT";
              const barrier = c.barriers?.[0];

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCaseId(c.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-surface-container-lowest border-secondary shadow-md ring-2 ring-secondary/20"
                      : "bg-surface-container-lowest border-surface-container hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-title-sm text-sm font-bold text-primary">{c.patientName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isUrgent ? "bg-error-container text-on-error-container" : "bg-surface-container text-primary"
                      }`}
                    >
                      {c.priority}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant mt-1 line-clamp-2">
                    {c.condition || c.reason}
                  </p>

                  <div className="mt-2.5 pt-2 border-t border-surface-container/60 flex items-center justify-between text-[11px]">
                    <span className="text-secondary font-semibold flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">warning</span>
                      {barrier ? barrier.category : "Transit Deficit"}
                    </span>
                    <span className="font-data-tabular text-on-surface-variant">{c.id}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Case Deep-Dive & Playbook Actions */}
        <div className="lg:col-span-8 space-y-5">
          {activeCase ? (
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container/60 space-y-6">
              {/* Case Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-container pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-headline-md text-xl font-bold text-primary">
                      {activeCase.patientName}
                    </span>
                    <span className="text-xs font-data-tabular text-on-surface-variant">
                      ({activeCase.patientId || activeCase.id})
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-container text-primary">
                      {activeCase.age || "Perinatal"}
                    </span>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Route: <strong className="text-on-surface">{activeCase.fromFacility}</strong> →{" "}
                    <strong className="text-secondary">{activeCase.toFacility}</strong>
                  </p>
                </div>

                <Link
                  to={`/referral/${activeCase.id}`}
                  className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary text-xs font-semibold flex items-center gap-1"
                >
                  <span>Open Full Chart</span>
                  <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                </Link>
              </div>

              {/* Identified Barrier Card */}
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-label-sm text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px]">report</span>
                    Active Barrier: {primaryBarrier.category}
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 text-amber-900">
                    {primaryBarrier.status}
                  </span>
                </div>
                <h4 className="font-title-sm text-sm text-primary font-bold">{primaryBarrier.title}</h4>
                <p className="text-xs text-on-surface leading-relaxed">
                  {primaryBarrier.description || activeCase.reason}
                </p>
              </div>

              {/* Action Playbook */}
              <div className="space-y-3">
                <h4 className="font-title-sm text-sm text-primary font-bold">
                  Care Coordinator Action Playbook
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    onClick={handleDispatchVan}
                    className="p-3.5 rounded-xl bg-secondary text-white font-label-md text-xs font-semibold hover:bg-on-secondary-container transition-all shadow-xs flex items-center gap-2 text-left"
                  >
                    <span className="material-symbols-outlined text-[22px]">local_taxi</span>
                    <div>
                      <div className="font-bold">Dispatch MediVan #04</div>
                      <div className="text-[10px] text-white/80 font-normal">
                        Certified vehicle with infant restraint
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      showToast("Receiving facility notified: Bed hold extended 45 mins.");
                    }}
                    className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-xs font-semibold transition-all border border-surface-container flex items-center gap-2 text-left"
                  >
                    <span className="material-symbols-outlined text-[22px] text-secondary">
                      notification_important
                    </span>
                    <div>
                      <div className="font-bold">Extend Bed Hold</div>
                      <div className="text-[10px] text-on-surface-variant font-normal">
                        Notify receiving charge nurse of delay
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      showToast("On-call pediatrician / MFM requested for emergency acuity review.");
                    }}
                    className="p-3.5 rounded-xl bg-surface-container-low hover:bg-surface-container text-primary font-label-md text-xs font-semibold transition-all border border-surface-container flex items-center gap-2 text-left"
                  >
                    <span className="material-symbols-outlined text-[22px] text-error">
                      stethoscope
                    </span>
                    <div>
                      <div className="font-bold">Physician Re-triage</div>
                      <div className="text-[10px] text-on-surface-variant font-normal">
                        Request on-call clinician trajectory review
                      </div>
                    </div>
                  </button>

                  <button
                    onClick={handleConfirmIntake}
                    className="p-3.5 rounded-xl bg-primary text-white font-label-md text-xs font-semibold hover:bg-primary-container transition-all shadow-xs flex items-center gap-2 text-left"
                  >
                    <span className="material-symbols-outlined text-[22px]">verified</span>
                    <div>
                      <div className="font-bold">Confirm Physical Arrival</div>
                      <div className="text-[10px] text-white/80 font-normal">
                        Patient arrived at intake bay • Sign off
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Case Chronological Audit Trail */}
              <div className="space-y-3 pt-4 border-t border-surface-container">
                <h4 className="font-title-sm text-sm text-primary font-bold">
                  Chronological Event Audit Trail
                </h4>

                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {(activeCase.timeline || []).slice().reverse().map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-surface-container-low text-xs flex items-start justify-between gap-3"
                    >
                      <div>
                        <span className="font-semibold text-primary">{t.status.replace(/_/g, " ")}</span>
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
          ) : (
            <div className="bg-surface-container-lowest p-10 rounded-2xl border border-surface-container text-center text-sm text-on-surface-variant">
              No active barrier case selected.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BarrierResolution;
