import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { BarrierCategory, BarrierStatus, isHighAcuity } from "../domain/enums.js";

const NavigatorWorkspace = () => {
  const {
    referrals,
    recordContactAttempt,
    identifyBarrier,
  } = useReferrals();

  const [activeTab, setActiveTab] = useState("all");
  const [selectedCaseModal, setSelectedCaseModal] = useState(null);
  const [modalType, setModalType] = useState(null); // 'contact' | 'barrier'

  // Contact attempt state
  const [contactMethod, setContactMethod] = useState("Phone Call");
  const [contactOutcome, setContactOutcome] = useState("Successful Contact");
  const [contactNotes, setContactNotes] = useState("");

  // New barrier state
  const [barrierCategory, setBarrierCategory] = useState("TRANSPORT");
  const [barrierTitle, setBarrierTitle] = useState("");
  const [barrierDesc, setBarrierDesc] = useState("");

  const { toast, showToast } = useToast();


  const activeReferrals = referrals.filter(
    (r) => r.status !== "COMPLETED" && r.status !== "REJECTED"
  );

  // Clears the form, so nothing typed for one patient carries over to the next.
  const closeModal = () => {
    setSelectedCaseModal(null);
    setContactMethod("Phone Call");
    setContactOutcome("Successful Contact");
    setContactNotes("");
    setBarrierCategory("TRANSPORT");
    setBarrierTitle("");
    setBarrierDesc("");
  };

  const handleSaveContact = () => {
    if (!selectedCaseModal) return;
    const res = recordContactAttempt(selectedCaseModal.id, {
      method: contactMethod,
      outcome: contactOutcome,
      notes: contactNotes,
      actor: selectedCaseModal.navigator?.name || "Priya Raman, MSW",
    });
    const needsTransit = res.success && contactOutcome === "Transit Barrier Identified";
    const barrierRes = needsTransit
      ? identifyBarrier(selectedCaseModal.id, {
          category: BarrierCategory.TRANSPORT,
          title: "Patient unable to travel",
          description: contactNotes,
          status: BarrierStatus.IDENTIFIED,
        })
      : res;
    if (barrierRes.success) {
      showToast(
        needsTransit
          ? `Contact logged and transport barrier raised for ${selectedCaseModal.patientName}.`
          : `Contact logged for ${selectedCaseModal.patientName} (${contactOutcome}).`
      );
    } else {
      showToast(needsTransit ? `Contact logged. ${barrierRes.reason}` : `Action failed: ${barrierRes.reason}`, "error");
    }
    closeModal();
  };

  const handleSaveBarrier = () => {
    if (!selectedCaseModal || !barrierTitle.trim()) return;
    const res = identifyBarrier(selectedCaseModal.id, {
      category: barrierCategory,
      title: barrierTitle,
      description: barrierDesc,
      status: BarrierStatus.IDENTIFIED,
    });
    if (res.success) {
      showToast(`New barrier logged for ${selectedCaseModal.patientName}.`);
    } else {
      showToast(`Action failed: ${res.reason}`, "error");
    }
    closeModal();
  };

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      <Toast toast={toast} />

      {/* Header Banner */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container/60 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-secondary font-label-sm text-xs font-semibold uppercase tracking-wider">
            <span className="material-symbols-outlined text-[18px]">support_agent</span>
            <span>Community Care Navigation Desk</span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1">
            Care Navigator Operational Workspace
          </h1>
          <p className="font-body-sm text-sm text-on-surface-variant mt-1">
            Conduct outreach, log communication history, identify social barriers, and coordinate practical support so mothers and infants arrive safely.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-lg bg-surface-container-low text-xs font-data-tabular font-medium text-primary border border-surface-container">
            Assigned Queue: {activeReferrals.length} Cases
          </span>
        </div>
      </div>

      {/* Main Cases Stack */}
      <div className="bg-surface-container-lowest rounded-xl shadow-xs border border-surface-container/60 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-surface-container pb-3">
          <h2 className="font-title-sm text-base text-primary font-bold">Assigned Active Cases</h2>
          <span className="text-xs text-on-surface-variant">Click any action to record outreach or update barriers</span>
        </div>

        <div className="space-y-3">
          {activeReferrals.map((r) => {
            const hasBarriers = (r.barriers || []).some((b) => b.status !== BarrierStatus.RESOLVED);

            return (
              <div
                key={r.id}
                className="p-4 rounded-xl border border-surface-container hover:border-secondary/40 transition-all bg-surface-container-low/20 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-title-sm text-sm text-primary font-bold">{r.patientName}</span>
                    <span className="text-xs font-data-tabular text-on-surface-variant">({r.id})</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-primary">
                      {r.referralType}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary">
                      {r.status}
                    </span>
                    {hasBarriers && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px]">warning</span>
                        Active Barrier
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-on-surface-variant">
                    {r.fromFacility} → <strong className="text-primary">{r.toFacility}</strong> • Priority:{" "}
                    <strong className={isHighAcuity(r.priority) ? "text-error" : "text-primary"}>
                      {r.priority}
                    </strong>
                  </p>

                  <div className="text-xs text-on-surface-variant flex flex-wrap items-center gap-x-4 gap-y-1">
                    <span>Phone: <strong className="text-on-surface">{r.patientPhone || r.caregiverContact}</strong></span>
                    <span>Lang: <strong className="text-on-surface">{r.language || "English"}</strong></span>
                    {r.interpreterNeeded && (
                      <span className="text-secondary font-semibold">Interpreter Required</span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full lg:w-auto justify-end pt-2 lg:pt-0 border-t lg:border-t-0 border-surface-container">
                  <button
                    onClick={() => {
                      setSelectedCaseModal(r);
                      setModalType("contact");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">call</span>
                    <span>Log Outreach</span>
                  </button>

                  <button
                    onClick={() => {
                      setSelectedCaseModal(r);
                      setModalType("barrier");
                    }}
                    className="px-3 py-1.5 rounded-lg bg-secondary text-white font-label-md text-xs font-semibold hover:bg-on-secondary-container transition-colors shadow-xs flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">add_alert</span>
                    <span>Flag Barrier</span>
                  </button>

                  <Link
                    to="/transport"
                    className="px-3 py-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high text-primary font-label-md text-xs font-semibold transition-colors flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[15px]">local_taxi</span>
                    <span>Transit Hub</span>
                  </Link>

                  <Link
                    to={`/referral/${r.id}`}
                    className="p-1.5 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container"
                    title="Open Full Case Chart"
                  >
                    <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Outreach Modal */}
      {selectedCaseModal && modalType === "contact" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-container space-y-4">
            <h3 className="font-headline-md text-lg text-primary font-bold">
              Log Outreach: {selectedCaseModal.patientName}
            </h3>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Contact Method</label>
              <select
                className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value)}
              >
                <option value="Phone Call">Direct Phone Call</option>
                <option value="Bilingual Interpreter Call">Bilingual Interpreter Call</option>
                <option value="Home Visit (CHW)">Home Outreach / Community Health Worker Visit</option>
                <option value="SMS Reminder">SMS Reminder Ping</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Contact Outcome</label>
              <select
                className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                value={contactOutcome}
                onChange={(e) => setContactOutcome(e.target.value)}
              >
                <option value="Successful Contact">Successful Contact (Spoke with patient/family)</option>
                <option value="Voicemail Left">Unanswered / Voicemail Left</option>
                <option value="Number Disconnected">Number Disconnected / Unreachable</option>
                <option value="Transit Barrier Identified">Patient unable to travel / Needs transit</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Conversation Notes</label>
              <textarea
                className="w-full p-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                rows={3}
                placeholder="Document summary of patient discussion, confirmation of arrival readiness, or concerns..."
                value={contactNotes}
                onChange={(e) => setContactNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-surface-container text-xs font-medium text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                className="px-4 py-2 rounded-lg bg-secondary text-white font-semibold text-xs hover:bg-on-secondary-container"
              >
                Save Outreach Event
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Flag Barrier Modal */}
      {selectedCaseModal && modalType === "barrier" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-md w-full shadow-2xl border border-surface-container space-y-4">
            <h3 className="font-headline-md text-lg text-primary font-bold">
              Flag Care Barrier: {selectedCaseModal.patientName}
            </h3>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Barrier Taxonomy</label>
              <select
                className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                value={barrierCategory}
                onChange={(e) => setBarrierCategory(e.target.value)}
              >
                <option value="TRANSPORT">Transportation (Vehicle breakdown, no safe newborn transport)</option>
                <option value="FINANCIAL">Financial (Fear of copays, out-of-pocket costs)</option>
                <option value="DEPENDENT_CARE">Dependent Care (Childcare for other siblings)</option>
                <option value="LINGUISTIC">Linguistic (Medical interpreter needed)</option>
                <option value="WEATHER">Inclement Weather / Impassable route</option>
                <option value="CLINICAL_HESITATION">Hospital Hesitation / Fear</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Barrier Title</label>
              <input
                className="w-full p-2.5 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                placeholder="e.g. Broken transmission on vehicle"
                value={barrierTitle}
                onChange={(e) => setBarrierTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-primary block mb-1">Detailed Description</label>
              <textarea
                className="w-full p-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none"
                rows={3}
                placeholder="Describe practical barrier and proposed resolution pathway..."
                value={barrierDesc}
                onChange={(e) => setBarrierDesc(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={closeModal}
                className="px-4 py-2 rounded-lg bg-surface-container text-xs font-medium text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveBarrier}
                className="px-4 py-2 rounded-lg bg-secondary text-white font-semibold text-xs hover:bg-on-secondary-container"
              >
                Record Barrier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NavigatorWorkspace;

