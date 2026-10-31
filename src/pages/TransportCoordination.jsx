import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { TransportStatus } from "../domain/enums.js";

const TransportCoordination = () => {
  const {
    referrals,
    fleet,
    dispatchTransport,
    recordTransportPickup,
    recordTransportFailure,
    confirmArrival,
  } = useReferrals();

  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'active' | 'completed' | 'fleet'
  const [selectedFailureModal, setSelectedFailureModal] = useState(null);
  const [failureReason, setFailureReason] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Referrals with transport requests or active transit
  const transitReferrals = referrals.filter(
    (r) => r.transit != null || r.transitBarrier || r.status === "FOLLOW_UP_REQUIRED"
  );

  const filteredReferrals = transitReferrals.filter((r) => {
    if (activeTab === "active") {
      return (
        r.transit?.status === TransportStatus.REQUESTED ||
        r.transit?.status === TransportStatus.ASSIGNED ||
        r.transit?.status === TransportStatus.DISPATCHED ||
        r.transit?.status === TransportStatus.PICKED_UP
      );
    }
    if (activeTab === "completed") {
      return r.transit?.status === TransportStatus.ARRIVED;
    }
    return true;
  });

  const handleQuickDispatch = (ref, vehicle) => {
    dispatchTransport(ref.id, {
      vehicle: `${vehicle.name} (${vehicle.driver})`,
      driver: vehicle.driver,
      driverPhone: vehicle.driverPhone,
      eta: "12 mins",
      requiresInfantCarSeat: ref.referralType === "Child",
      pickupAddress: ref.patientAddress || "Patient Residence",
      destinationFacility: ref.toFacility,
    });
    showToast(`${vehicle.name} dispatched for ${ref.patientName}! Driver: ${vehicle.driver}.`);
  };

  const handlePickup = (ref) => {
    recordTransportPickup(ref.id);
    showToast(`Patient pickup confirmed for ${ref.patientName}. En route to ${ref.toFacility}.`);
  };

  const handleArrival = (ref) => {
    confirmArrival(ref.id, {
      department: ref.department || "Emergency Intake Bay",
      room: "Triage Receiving 01",
      verifiedBy: "Intake Transport Coordinator",
      notes: "Patient safely delivered by MediRide transport.",
    });
    showToast(`Safe arrival confirmed for ${ref.patientName} at ${ref.toFacility}!`);
  };

  const handleConfirmFailure = () => {
    if (!selectedFailureModal) return;
    recordTransportFailure(selectedFailureModal.id, failureReason || "Mechanical breakdown / patient unable to travel");
    showToast(`Transit disruption recorded for ${selectedFailureModal.patientName}. Escalated to coordinator.`);
    setSelectedFailureModal(null);
    setFailureReason("");
  };

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

      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-secondary font-label-sm text-xs font-semibold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">local_taxi</span>
            <span>Simulated Transit Coordination Hub</span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1">
            Maternal & Neonatal Transport Operations
          </h1>
          <p className="font-body-sm text-sm text-on-surface-variant mt-1">
            Dispatch specialized medical transit, track vehicle milestones, and ensure zero care interruptions due to transit deficits.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          <span className="px-3 py-1.5 rounded-lg bg-surface-container-low text-xs font-data-tabular font-medium text-primary border border-surface-container">
            Fleet: 3 Units Active
          </span>
        </div>
      </div>

      {/* Fleet Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {fleet.map((veh) => (
          <div
            key={veh.id}
            className="bg-surface-container-lowest p-5 rounded-xl shadow-xs border border-surface-container/60 flex flex-col justify-between space-y-3"
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="font-label-sm text-[10px] uppercase font-bold text-secondary tracking-wider block">
                  {veh.plate}
                </span>
                <h3 className="font-title-sm text-base text-primary font-bold">{veh.name}</h3>
                <p className="font-body-sm text-xs text-on-surface-variant">{veh.vehicleType}</p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  veh.status === "DISPATCHED" || veh.status === "EN_ROUTE"
                    ? "bg-secondary-fixed text-on-secondary-fixed"
                    : "bg-surface-container text-on-surface-variant"
                }`}
              >
                {veh.status}
              </span>
            </div>

            <div className="space-y-1.5 text-xs text-on-surface-variant bg-surface-container-low p-3 rounded-lg">
              <div className="flex items-center justify-between">
                <span>Driver:</span>
                <strong className="text-primary">{veh.driver}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Phone:</span>
                <span className="font-data-tabular">{veh.driverPhone}</span>
              </div>
              <div className="pt-1 border-t border-surface-container text-[11px] text-secondary font-medium">
                {veh.equippedWith}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Transport Queue Section */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container/60 overflow-hidden space-y-4 p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-surface-container/60 pb-4">
          <div>
            <h2 className="font-title-sm text-lg text-primary font-bold">Transit Requests & Dispatches</h2>
            <p className="text-xs text-on-surface-variant">Real-time status of patients requiring specialized transportation</p>
          </div>

          <div className="inline-flex p-1 bg-surface-container-low rounded-lg text-xs font-medium">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "all" ? "bg-surface-container-lowest text-primary shadow-xs font-semibold" : "text-on-surface-variant"
              }`}
            >
              All Cases ({transitReferrals.length})
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "active" ? "bg-surface-container-lowest text-primary shadow-xs font-semibold" : "text-on-surface-variant"
              }`}
            >
              In Flight
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-3 py-1 rounded-md transition-colors ${
                activeTab === "completed" ? "bg-surface-container-lowest text-primary shadow-xs font-semibold" : "text-on-surface-variant"
              }`}
            >
              Arrived Safely
            </button>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-3">
          {filteredReferrals.length === 0 ? (
            <div className="text-center py-10 text-on-surface-variant text-sm">
              No transport cases match the selected filter.
            </div>
          ) : (
            filteredReferrals.map((r) => {
              const tr = r.transit;
              const isDispatched = tr?.status === TransportStatus.DISPATCHED;
              const isPickedUp = tr?.status === TransportStatus.PICKED_UP;
              const isArrived = tr?.status === TransportStatus.ARRIVED || r.status === "ARRIVAL_CONFIRMED";
              const isFailed = tr?.status === TransportStatus.FAILED;
              const isNeedsDispatch = !tr || tr.status === TransportStatus.REQUESTED;

              return (
                <div
                  key={r.id}
                  className="p-4 rounded-xl border border-surface-container hover:border-secondary/50 transition-all bg-surface-container-low/30 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-title-sm text-sm text-primary font-bold">{r.patientName}</span>
                      <span className="text-xs font-data-tabular text-on-surface-variant">({r.id})</span>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-primary">
                        {r.referralType}
                      </span>
                      {r.priority === "Urgent" || r.priority === "STAT" ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-container text-on-error-container">
                          {r.priority}
                        </span>
                      ) : null}
                    </div>

                    <div className="text-xs text-on-surface-variant flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Pickup: <strong className="text-on-surface">{r.patientAddress || "Residence on file"}</strong></span>
                      <span>→ Destination: <strong className="text-on-surface">{r.toFacility}</strong></span>
                      <span>Contact: <strong className="text-on-surface">{r.caregiverContact || r.patientPhone}</strong></span>
                    </div>

                    {tr && (
                      <div className="text-xs text-secondary flex items-center gap-2 pt-1 font-medium">
                        <span className="material-symbols-outlined text-[16px]">directions_car</span>
                        <span>Vehicle: {tr.vehicle || "Assigned Unit"}</span>
                        <span>• Driver: {tr.driver || "Marcus Ross"}</span>
                        {tr.eta && <span>• ETA: <strong>{tr.eta}</strong></span>}
                      </div>
                    )}
                  </div>

                  {/* Actions Deck */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-surface-container">
                    {isNeedsDispatch && (
                      <button
                        onClick={() => handleQuickDispatch(r, fleet[0])}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-white font-label-md text-xs font-semibold hover:bg-on-secondary-container transition-colors shadow-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">local_taxi</span>
                        <span>Dispatch MediVan #04</span>
                      </button>
                    )}

                    {isDispatched && (
                      <button
                        onClick={() => handlePickup(r)}
                        className="px-3 py-1.5 rounded-lg bg-primary text-white font-label-md text-xs font-semibold hover:bg-primary-container transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">front_hand</span>
                        <span>Confirm Patient Pickup</span>
                      </button>
                    )}

                    {isPickedUp && (
                      <button
                        onClick={() => handleArrival(r)}
                        className="px-3 py-1.5 rounded-lg bg-secondary text-white font-label-md text-xs font-semibold hover:bg-on-secondary-container transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Confirm Hospital Arrival</span>
                      </button>
                    )}

                    {!isArrived && !isFailed && (
                      <button
                        onClick={() => setSelectedFailureModal(r)}
                        className="px-2.5 py-1.5 rounded-lg bg-surface-container text-error font-label-md text-xs hover:bg-error-container hover:text-on-error-container transition-colors"
                      >
                        Report Disruption
                      </button>
                    )}

                    {isArrived && (
                      <span className="inline-flex items-center gap-1 text-xs text-secondary font-bold px-2.5 py-1 rounded-full bg-secondary-fixed">
                        <span className="material-symbols-outlined text-[14px]">check</span>
                        Arrived Safely
                      </span>
                    )}

                    {isFailed && (
                      <span className="inline-flex items-center gap-1 text-xs text-error font-bold px-2.5 py-1 rounded-full bg-error-container">
                        <span className="material-symbols-outlined text-[14px]">warning</span>
                        Transit Disrupted
                      </span>
                    )}

                    <Link
                      to={`/referral/${r.id}`}
                      className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container"
                      title="View Case Chart"
                    >
                      <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Disruption Modal */}
      {selectedFailureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-container space-y-4">
            <h3 className="font-headline-md text-lg text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-error">warning</span>
              Report Transit Disruption
            </h3>
            <p className="text-xs text-on-surface-variant">
              Case #{selectedFailureModal.id} ({selectedFailureModal.patientName}). Document reason for delay or transit failure:
            </p>
            <textarea
              className="w-full p-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none focus:ring-2 focus:ring-secondary/40"
              rows={3}
              placeholder="e.g., Road impassable due to snow squall, vehicle flat tire, patient unable to board..."
              value={failureReason}
              onChange={(e) => setFailureReason(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedFailureModal(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-xs font-medium text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFailure}
                className="px-4 py-2 rounded-lg bg-error text-white font-semibold text-xs hover:opacity-90"
              >
                Log Disruption & Escalate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TransportCoordination;

