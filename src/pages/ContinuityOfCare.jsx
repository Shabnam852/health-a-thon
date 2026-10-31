import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useReferrals } from "../context/ReferralContext.jsx";
import { FollowUpStatus } from "../domain/enums.js";

const ContinuityOfCare = () => {
  const { referrals, completeFollowUpTask } = useReferrals();

  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [completeModalTask, setCompleteModalTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Find all referrals with active followUpPlans
  const referralsWithCarePlans = referrals.filter((r) => r.followUpPlan != null);

  const activeReferral =
    (selectedPlanId
      ? referralsWithCarePlans.find((r) => r.id === selectedPlanId)
      : referralsWithCarePlans[0]) || referrals[0];

  const plan = activeReferral?.followUpPlan;

  const handleConfirmTaskCompletion = () => {
    if (!completeModalTask || !activeReferral) return;

    completeFollowUpTask(
      activeReferral.id,
      completeModalTask.id,
      completionNotes || "Touchpoint successfully completed and clinical findings documented."
    );

    showToast(`Touchpoint "${completeModalTask.title}" recorded as completed!`);
    setCompleteModalTask(null);
    setCompletionNotes("");
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
            <span className="material-symbols-outlined text-[18px]">event_available</span>
            <span>Continuous Maternal & Neonatal Surveillance</span>
          </div>
          <h1 className="font-headline-lg text-2xl sm:text-3xl font-bold text-primary tracking-tight mt-1">
            42-Day Postpartum & Neonatal Continuity
          </h1>
          <p className="font-body-sm text-sm text-on-surface-variant mt-1">
            Closing a hospital referral must never close the patient's care. Track post-discharge touchpoints, home visits, and early complication screening.
          </p>
        </div>

        <div className="px-3 py-1.5 rounded-lg bg-surface-container-low text-xs font-medium text-primary border border-surface-container">
          Active Surveillance Protocols: {referralsWithCarePlans.length}
        </div>
      </div>

      {/* Main Grid: Left Patient Selector (4 cols) / Right Touchpoint Lifeline (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Active Dyad Care Plans */}
        <div className="lg:col-span-4 space-y-3">
          <h3 className="font-title-sm text-sm font-bold text-primary px-1">Enrolled Patients</h3>

          {referralsWithCarePlans.length === 0 ? (
            <div className="p-5 rounded-xl bg-surface-container-lowest border border-surface-container text-xs text-on-surface-variant text-center">
              No continuous care plans active yet. Complete a referral to automatically establish a 42-day postpartum care plan.
            </div>
          ) : (
            referralsWithCarePlans.map((r) => {
              const isSelected = r.id === activeReferral.id;
              const completedCount = r.followUpPlan.tasks.filter(
                (t) => t.status === FollowUpStatus.COMPLETED
              ).length;
              const totalCount = r.followUpPlan.tasks.length;

              return (
                <div
                  key={r.id}
                  onClick={() => setSelectedPlanId(r.id)}
                  className={`p-4 rounded-xl cursor-pointer transition-all border ${
                    isSelected
                      ? "bg-surface-container-lowest border-secondary shadow-md ring-2 ring-secondary/20"
                      : "bg-surface-container-lowest border-surface-container hover:bg-surface-container-low"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-title-sm text-sm font-bold text-primary">{r.patientName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary-fixed text-on-secondary-fixed">
                      {completedCount} / {totalCount} Done
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant mt-1 truncate">
                    {r.condition || "Postpartum surveillance"}
                  </p>

                  <div className="flex items-center justify-between text-[11px] text-on-surface-variant pt-2 mt-2 border-t border-surface-container/60">
                    <span>Lead: <strong>{r.followUpPlan.leadWorker}</strong></span>
                    <span className="text-secondary font-semibold">{r.referralType}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: 42-Day Protocol Timeline & Tasks */}
        <div className="lg:col-span-8 space-y-4">
          {plan ? (
            <div className="bg-surface-container-lowest p-6 rounded-2xl shadow-sm border border-surface-container/60 space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-surface-container pb-4">
                <div>
                  <span className="text-[11px] font-label-sm font-bold uppercase text-secondary tracking-wider">
                    {activeReferral.referralType} 42-Day Care Plan
                  </span>
                  <h2 className="font-headline-md text-xl font-bold text-primary">
                    {activeReferral.patientName} ({activeReferral.patientId})
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-surface-container-high text-primary">
                    Status: {plan.status}
                  </span>
                  <Link
                    to={`/referral/${activeReferral.id}`}
                    className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
                  >
                    <span>Full Medical Chart</span>
                    <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                  </Link>
                </div>
              </div>

              {/* Tasks List */}
              <div className="space-y-4">
                {plan.tasks.map((task, idx) => {
                  const isDone = task.status === FollowUpStatus.COMPLETED;

                  return (
                    <div
                      key={task.id}
                      className={`p-4 rounded-xl border transition-all ${
                        isDone
                          ? "bg-surface-container-low/50 border-secondary/30"
                          : "bg-surface-container-lowest border-surface-container hover:shadow-xs"
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                              isDone
                                ? "bg-secondary text-white"
                                : "bg-surface-container text-primary"
                            }`}
                          >
                            {isDone ? (
                              <span className="material-symbols-outlined text-[18px]">check</span>
                            ) : (
                              idx + 1
                            )}
                          </div>

                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-title-sm text-sm text-primary font-bold">{task.title}</h4>
                              <span className="text-[11px] font-data-tabular px-2 py-0.5 rounded bg-surface-container-low text-on-surface-variant font-medium">
                                Target: {task.dueDate} (Day {task.dayOffset})
                              </span>
                            </div>
                            <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                              {task.clinicalFocus}
                            </p>
                            <p className="text-[11px] text-secondary font-medium mt-0.5">
                              Assigned: {task.targetRole}
                            </p>
                          </div>
                        </div>

                        {/* Completion Button */}
                        <div className="shrink-0 w-full sm:w-auto text-right">
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 text-xs text-secondary font-bold px-2.5 py-1 rounded-full bg-secondary-fixed">
                              <span className="material-symbols-outlined text-[14px]">check</span>
                              Verified Completed
                            </span>
                          ) : (
                            <button
                              onClick={() => setCompleteModalTask(task)}
                              className="w-full sm:w-auto px-3.5 py-1.5 rounded-lg bg-primary text-white font-label-md text-xs font-semibold hover:bg-primary-container transition-colors shadow-xs"
                            >
                              Document Visit Complete
                            </button>
                          )}
                        </div>
                      </div>

                      {isDone && task.notes && (
                        <div className="mt-3 pt-2.5 border-t border-surface-container text-xs text-on-surface-variant bg-surface-container-low/60 p-2.5 rounded-lg">
                          <strong className="text-primary font-medium">Clinical Visit Findings:</strong> {task.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest p-8 rounded-2xl border border-surface-container text-center text-sm text-on-surface-variant">
              Select an enrolled patient on the left to view and document their 42-day continuous care touchpoints.
            </div>
          )}
        </div>
      </div>

      {/* Complete Task Modal */}
      {completeModalTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-surface-container-lowest rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-surface-container space-y-4">
            <h3 className="font-headline-md text-lg text-primary font-bold">
              Complete Touchpoint: {completeModalTask.title}
            </h3>
            <p className="text-xs text-on-surface-variant">
              Document clinical and practical findings for {activeReferral.patientName}:
            </p>
            <textarea
              className="w-full p-3 rounded-lg bg-surface-container-low text-xs border border-surface-container focus:outline-none focus:ring-2 focus:ring-secondary/40"
              rows={4}
              placeholder="e.g., Blood pressure checked at 118/76 mmHg. Surgical wound clean, dry, intact. Infant latch verified without nipple trauma. EPDS score 4 (low risk)."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCompleteModalTask(null)}
                className="px-4 py-2 rounded-lg bg-surface-container text-xs font-medium text-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTaskCompletion}
                className="px-4 py-2 rounded-lg bg-secondary text-white font-semibold text-xs hover:bg-on-secondary-container"
              >
                Save & Sign Off
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContinuityOfCare;

