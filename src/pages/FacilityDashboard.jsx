import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { ReferralStatus, PatientType } from "../domain/enums.js";

const FacilityDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    referrals,
    facilities,
    acknowledgeReferral,
    rejectReferral,
    redirectReferral,
    confirmArrival,
    recordClinicalOutcome,
  } = useReferrals();

  const [activeFacilityId, setActiveFacilityId] = useState("FAC-ST-JUDE");
  
  const tabFromUrl = searchParams.get("tab");
  const [activeTab, setActiveTabState] = useState(() => {
    if (tabFromUrl && ["pending", "intransit", "arrived", "completed", "redirected"].includes(tabFromUrl)) {
      return tabFromUrl;
    }
    return "pending";
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    setSearchParams({ tab });
  };

  useEffect(() => {
    if (tabFromUrl && ["pending", "intransit", "arrived", "completed", "redirected"].includes(tabFromUrl)) {
      setActiveTabState(tabFromUrl);
    }
  }, [tabFromUrl]);

  const [selectedActionModal, setSelectedActionModal] = useState(null); // { type: 'reject' | 'redirect' | 'arrival' | 'outcome', referral }

  // Action modal form states
  const [rejectReason, setRejectReason] = useState("No Level III NICU beds currently available");
  const [redirectToFacility, setRedirectToFacility] = useState("University Medical Center Detroit");
  const [redirectReason, setRedirectReason] = useState("Diverted to quaternary care hub for surgical capacity");
  const [arrivalBay, setArrivalBay] = useState("OB Triage Exam Room 3B");
  const [arrivalStaff, setArrivalStaff] = useState("Sarah Jenkins, RN (ID #STJ-9041)");

  // Structured clinical outcome states
  const [clinicianName, setClinicianName] = useState("Dr. Rachel Sterling, MD, FACOG");
  const [maternalStatus, setMaternalStatus] = useState("STABLE");
  const [deliveryType, setDeliveryType] = useState("SPONTANEOUS_VAGINAL");
  const [neonatalStatus, setNeonatalStatus] = useState("STABLE");
  const [disposition, setDisposition] = useState("ADMITTED");
  const [clinicalNotes, setClinicalNotes] = useState("");

  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const currentFacility = facilities.find((f) => f.id === activeFacilityId) || facilities[0];

  // Inbound referrals addressed to this facility
  const inboundReferrals = referrals.filter(
    (r) =>
      r.toFacility?.toLowerCase().includes(currentFacility.name.toLowerCase()) ||
      r.toFacility?.toLowerCase().includes("st. jude")
  );

  // Categorize inbound queues
  const pendingAcknowledgement = inboundReferrals.filter(
    (r) => r.status === ReferralStatus.SENT || r.status === ReferralStatus.CREATED
  );

  const inTransitArrivals = inboundReferrals.filter(
    (r) => r.status === ReferralStatus.ACKNOWLEDGED
  );

  const arrivedInAssessment = inboundReferrals.filter(
    (r) => r.status === ReferralStatus.ARRIVAL_CONFIRMED
  );

  const completedHandovers = inboundReferrals.filter(
    (r) => r.status === ReferralStatus.COMPLETED
  );

  const rejectedRedirected = inboundReferrals.filter(
    (r) => r.status === ReferralStatus.REJECTED || r.status === ReferralStatus.REDIRECTED
  );

  const displayedList =
    activeTab === "pending"
      ? pendingAcknowledgement
      : activeTab === "intransit"
      ? inTransitArrivals
      : activeTab === "arrived"
      ? arrivedInAssessment
      : activeTab === "completed"
      ? completedHandovers
      : rejectedRedirected;

  const handleAcknowledge = (ref) => {
    const res = acknowledgeReferral(ref.id, arrivalStaff, "Receiving triage intake prepped and bed held.");
    if (res.success) {
      showToast(`Intake acknowledged for ${ref.patientName}! Bed pod reserved.`);
    } else {
      showToast(`Action failed: ${res.reason}`);
    }
  };

  const handleConfirmArrivalAction = () => {
    if (!selectedActionModal) return;
    const ref = selectedActionModal.referral;
    const res = confirmArrival(ref.id, {
      department: currentFacility.name,
      room: arrivalBay,
      verifiedBy: arrivalStaff,
      notes: "Patient physically arrived and checked into triage exam bay.",
    });

    if (res.success) {
      showToast(`Physical arrival confirmed for ${ref.patientName}! Checked into ${arrivalBay}.`);
    }
    setSelectedActionModal(null);
  };

  const handleConfirmReject = () => {
    if (!selectedActionModal) return;
    const ref = selectedActionModal.referral;
    rejectReferral(ref.id, arrivalStaff, rejectReason);
    showToast(`Referral declined for ${ref.patientName}. Returned to coordinator for redirection.`);
    setSelectedActionModal(null);
  };

  const handleConfirmRedirect = () => {
    if (!selectedActionModal) return;
    const ref = selectedActionModal.referral;
    redirectReferral(ref.id, currentFacility.name, redirectToFacility, redirectReason, arrivalStaff);
    showToast(`Referral redirected to ${redirectToFacility}. Records re-routed.`);
    setSelectedActionModal(null);
  };

  const handleConfirmOutcome = () => {
    if (!selectedActionModal) return;
    const ref = selectedActionModal.referral;

    recordClinicalOutcome(ref.id, {
      clinicianName,
      clinicianRole: "MD / CNM",
      referralType: ref.referralType,
      maternalStatus,
      deliveryType: ref.referralType === PatientType.MATERNAL ? deliveryType : null,
      neonatalStatus: ref.referralType === PatientType.CHILD ? neonatalStatus : null,
      disposition,
      clinicalNotes: clinicalNotes || "Clinical assessment completed. Patient stabilized.",
    });

    showToast(`Clinical assessment and outcome recorded for ${ref.patientName}. 42-day care plan active.`);
    setSelectedActionModal(null);
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
            <span className="material-symbols-outlined text-[18px]">domain</span>
            <span>Hospital Receiving Workspace</span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1">
            {currentFacility.name}
          </h1>
          <p className="font-body-sm text-sm text-on-surface-variant mt-1">
            {currentFacility.type} • {currentFacility.location} • Direct Contact: {currentFacility.directContact}
          </p>
        </div>

        {/* Facility Selector */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
          <label className="text-xs font-bold text-primary">Switch Facility View:</label>
          <select
            value={activeFacilityId}
            onChange={(e) => setActiveFacilityId(e.target.value)}
            className="p-2 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none font-medium"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Navigation Tabs Queue */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-surface-container-low rounded-xl text-xs font-semibold">
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "pending"
              ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          <span>Pending Acknowledgement</span>
          <span className="px-1.5 py-0.2 rounded-full bg-error-container text-on-error-container text-[10px]">
            {pendingAcknowledgement.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("intransit")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "intransit"
              ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          <span>Accepted / In-Transit</span>
          <span className="px-1.5 py-0.2 rounded-full bg-secondary-fixed text-on-secondary-fixed text-[10px]">
            {inTransitArrivals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("arrived")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "arrived"
              ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          <span>Arrived / In Assessment</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-primary text-[10px]">
            {arrivedInAssessment.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "completed"
              ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          <span>Completed</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-primary text-[10px]">
            {completedHandovers.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("redirected")}
          className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
            activeTab === "redirected"
              ? "bg-surface-container-lowest text-primary shadow-xs font-bold"
              : "text-on-surface-variant hover:text-primary"
          }`}
        >
          <span>Diverted / Declined</span>
          <span className="px-1.5 py-0.2 rounded-full bg-surface-container text-primary text-[10px]">
            {rejectedRedirected.length}
          </span>
        </button>
      </div>

      {/* Referral Cards Stack */}
      <div className="space-y-3">
        {displayedList.length === 0 ? (
          <div className="bg-surface-container-lowest p-10 rounded-2xl border border-surface-container text-center text-sm text-on-surface-variant">
            No inbound referrals currently in this queue for {currentFacility.name}.
          </div>
        ) : (
          displayedList.map((r) => {
            const isPending = r.status === ReferralStatus.SENT || r.status === ReferralStatus.CREATED;
            const isAccepted = r.status === ReferralStatus.ACKNOWLEDGED;
            const isArrived = r.status === ReferralStatus.ARRIVAL_CONFIRMED;
            const isCompleted = r.status === ReferralStatus.COMPLETED;

            return (
              <div
                key={r.id}
                className="bg-surface-container-lowest p-5 rounded-xl border border-surface-container hover:border-secondary/40 transition-all shadow-xs flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-title-sm text-base text-primary font-bold">{r.patientName}</span>
                    <span className="text-xs font-data-tabular text-on-surface-variant">({r.id})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-primary">
                      {r.referralType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        r.priority === "Urgent" || r.priority === "STAT"
                          ? "bg-error-container text-on-error-container"
                          : "bg-surface-container text-primary"
                      }`}
                    >
                      {r.priority} Acuity
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary">
                      {r.status}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface font-medium">
                    Referring Clinic: <strong className="text-primary">{r.fromFacility}</strong> ({r.fromClinician || "Clinician on file"})
                  </p>

                  <p className="text-xs text-on-surface-variant line-clamp-2">
                    {r.condition || r.reason}
                  </p>

                  <div className="text-[11px] text-on-surface-variant flex flex-wrap items-center gap-x-4 pt-1">
                    <span>Contact: <strong className="text-on-surface">{r.caregiverContact || r.patientPhone}</strong></span>
                    <span>Lang: <strong className="text-on-surface">{r.language || "English"}</strong></span>
                    {r.transit && (
                      <span className="text-secondary font-medium">
                        Transit: {r.transit.vehicle || "Assigned"} ({r.transit.status})
                      </span>
                    )}
                  </div>
                </div>

                {/* Facility Action Deck */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end pt-3 lg:pt-0 border-t lg:border-t-0 border-surface-container">
                  {isPending && (
                    <>
                      <button
                        onClick={() => handleAcknowledge(r)}
                        className="px-3.5 py-1.5 rounded-lg bg-secondary text-white font-label-md text-xs font-semibold hover:bg-on-secondary-container transition-colors shadow-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        <span>Acknowledge Intake</span>
                      </button>

                      <button
                        onClick={() => setSelectedActionModal({ type: "redirect", referral: r })}
                        className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[15px]">alt_route</span>
                        <span>Redirect</span>
                      </button>

                      <button
                        onClick={() => setSelectedActionModal({ type: "reject", referral: r })}
                        className="px-3 py-1.5 rounded-lg bg-surface-container text-error hover:bg-error-container hover:text-on-error-container font-label-md text-xs font-semibold transition-colors"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {isAccepted && (
                    <>
                      <button
                        onClick={() => setSelectedActionModal({ type: "arrival", referral: r })}
                        className="px-3.5 py-1.5 rounded-lg bg-secondary text-white font-label-md text-xs font-semibold hover:bg-on-secondary-container transition-colors shadow-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">verified</span>
                        <span>Confirm Physical Arrival</span>
                      </button>

                      <button
                        onClick={() => setSelectedActionModal({ type: "redirect", referral: r })}
                        className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-xs font-semibold transition-colors"
                      >
                        Re-route
                      </button>
                    </>
                  )}

                  {isArrived && (
                    <button
                      onClick={() => setSelectedActionModal({ type: "outcome", referral: r })}
                      className="px-3.5 py-1.5 rounded-lg bg-primary text-white font-label-md text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">assignment_turned_in</span>
                      <span>Record Clinical Outcome</span>
                    </button>
                  )}

                  {isCompleted && (
                    <span className="inline-flex items-center gap-1 text-xs text-secondary font-bold px-3 py-1 rounded-full bg-secondary-fixed">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      Care Delivered
                    </span>
                  )}

                  <button
                    onClick={() => navigate(`/referral/${r.id}`)}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container"
                    title="Open Full Case Chart"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Arrival Confirmation Modal */}
      {selectedActionModal?.type === "arrival" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-container space-y-4">
            <h3 className="font-headline-md text-lg text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">verified</span>
              Verify Physical Hospital Arrival
            </h3>
            <p className="text-xs text-on-surface-variant">
              Confirm patient #{selectedActionModal.referral.id} ({selectedActionModal.referral.patientName}) has entered facility triage:
            </p>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Receiving Exam Bay / Room</label>
              <input
                className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                value={arrivalBay}
                onChange={(e) => setArrivalBay(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Verified By (Staff Attribution)</label>
              <input
                className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                value={arrivalStaff}
                onChange={(e) => setArrivalStaff(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedActionModal(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-xs font-medium text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmArrivalAction}
                className="px-4 py-2 rounded-lg bg-secondary text-white font-semibold text-xs hover:bg-on-secondary-container"
              >
                Confirm Arrival Check-In
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Redirection Modal */}
      {selectedActionModal?.type === "redirect" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-container space-y-4">
            <h3 className="font-headline-md text-lg text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">alt_route</span>
              Redirect Patient Referral
            </h3>
            <p className="text-xs text-on-surface-variant">
              Re-route case #{selectedActionModal.referral.id} ({selectedActionModal.referral.patientName}) to an alternate regional center:
            </p>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Target Facility</label>
              <select
                className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                value={redirectToFacility}
                onChange={(e) => setRedirectToFacility(e.target.value)}
              >
                {facilities
                  .filter((f) => f.name !== currentFacility.name)
                  .map((f) => (
                    <option key={f.id} value={f.name}>
                      {f.name} ({f.type})
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Clinical Justification</label>
              <textarea
                className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                rows={3}
                value={redirectReason}
                onChange={(e) => setRedirectReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedActionModal(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-xs font-medium text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRedirect}
                className="px-4 py-2 rounded-lg bg-secondary text-white font-semibold text-xs hover:bg-on-secondary-container"
              >
                Confirm Redirection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Decline / Rejection Modal */}
      {selectedActionModal?.type === "reject" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-container space-y-4">
            <h3 className="font-headline-md text-lg text-error font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-error">cancel</span>
              Decline Intake Referral
            </h3>
            <p className="text-xs text-on-surface-variant">
              State formal medical reason for declining referral #{selectedActionModal.referral.id}:
            </p>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Reason Code / Justification</label>
              <textarea
                className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedActionModal(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-xs font-medium text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="px-4 py-2 rounded-lg bg-error text-white font-semibold text-xs hover:opacity-90"
              >
                Decline & Alert Coordinator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Structured Clinical Outcome Modal */}
      {selectedActionModal?.type === "outcome" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-surface-container space-y-4 my-8">
            <h3 className="font-headline-md text-lg text-primary font-bold flex items-center gap-2">
              <span className="material-symbols-outlined text-secondary">stethoscope</span>
              Record Clinical Assessment & Outcome
            </h3>
            <p className="text-xs text-on-surface-variant">
              Authorized clinical signoff for {selectedActionModal.referral.patientName} ({selectedActionModal.referral.referralType}):
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Attending Clinician</label>
                <input
                  className="w-full p-2 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                  value={clinicianName}
                  onChange={(e) => setClinicianName(e.target.value)}
                />
              </div>

              {selectedActionModal.referral.referralType === PatientType.MATERNAL ? (
                <>
                  <div>
                    <label className="text-xs font-semibold text-primary block mb-1">Maternal Status</label>
                    <select
                      className="w-full p-2 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                      value={maternalStatus}
                      onChange={(e) => setMaternalStatus(e.target.value)}
                    >
                      <option value="STABLE">Stable / Treated</option>
                      <option value="ADMITTED_L_D">Admitted to Labor & Delivery</option>
                      <option value="CESAREAN_DELIVERY">Emergency Cesarean Performed</option>
                      <option value="ICU_MONITORING">Maternal ICU Step-up</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-primary block mb-1">Delivery Outcome</label>
                    <select
                      className="w-full p-2 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                      value={deliveryType}
                      onChange={(e) => setDeliveryType(e.target.value)}
                    >
                      <option value="SPONTANEOUS_VAGINAL">Spontaneous Vaginal Delivery</option>
                      <option value="CESAREAN">Cesarean Section Delivery</option>
                      <option value="NOT_APPLICABLE">Antepartum Observation (Pregnancy Continues)</option>
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-semibold text-primary block mb-1">Neonatal Status</label>
                    <select
                      className="w-full p-2 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                      value={neonatalStatus}
                      onChange={(e) => setNeonatalStatus(e.target.value)}
                    >
                      <option value="PHOTOTHERAPY_INITIATED">Phototherapy Initiated (TSB Responding)</option>
                      <option value="NICU_ADMITTED">NICU Level III Bed Admitted</option>
                      <option value="REHYDRATED_STABLE">Rehydrated & Electrolytes Normalized</option>
                      <option value="STABLE_OUTPATIENT">Discharged to Pediatric Outpatient</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Patient Disposition</label>
                <select
                  className="w-full p-2 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                  value={disposition}
                  onChange={(e) => setDisposition(e.target.value)}
                >
                  <option value="ADMITTED">Admitted to Inpatient Ward</option>
                  <option value="DISCHARGED_HOME">Discharged Home (Initiate 42-Day Protocol)</option>
                  <option value="TRANSFERRED_QUATERNARY">Transferred to Level IV Quaternary Center</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-primary block mb-1">Clinical Summary Notes</label>
                <textarea
                  className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                  rows={3}
                  placeholder="Summarize key clinical interventions, procedures, and discharge plan..."
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setSelectedActionModal(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-xs font-medium text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOutcome}
                className="px-4 py-2 rounded-lg bg-secondary text-white font-semibold text-xs hover:bg-on-secondary-container"
              >
                Complete Episode & Activate 42-Day Plan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilityDashboard;
