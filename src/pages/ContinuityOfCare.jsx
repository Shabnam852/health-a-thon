import { useState } from "react";
import { Link } from "react-router-dom";
import { FormDialog } from "../components/Dialog.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FilterTabs,
  Icon,
  Page,
  PageHeader,
  Textarea,
} from "../components/ui/index.js";
import { isRouteAllowedForRole, RoleId } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { getFollowUpState } from "../domain/alarms.js";
import { FollowUpStatus } from "../domain/enums.js";

const STATE_BADGES = {
  [FollowUpStatus.DUE]: { tone: "highlight", label: "Due now" },
  [FollowUpStatus.MISSED]: { tone: "danger", label: "Missed" },
  [FollowUpStatus.ESCALATED]: { tone: "danger", label: "Escalated" },
};

const countDone = (r) => r.followUpPlan.tasks.filter((t) => t.status === FollowUpStatus.COMPLETED).length;

const ContinuityOfCare = () => {
  const { referrals, completeFollowUpTask, role, activeReferralId, now } = useReferrals();
  const isPatient = role === RoleId.PATIENT;

  // Links from a patient's case set them active, so they open on that patient's plan.
  const [selectedPlanId, setSelectedPlanId] = useState(activeReferralId);
  const [completeModalTask, setCompleteModalTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const { toast, showToast } = useToast();

  // A patient sees only their own plan.
  const plans = referrals.filter((r) => r.followUpPlan != null && (!isPatient || r.id === activeReferralId));
  const activeReferral = plans.find((r) => r.id === selectedPlanId) || plans[0] || null;
  const plan = activeReferral?.followUpPlan;

  const closeCompleteModal = () => {
    setCompleteModalTask(null);
    setCompletionNotes("");
  };

  const handleConfirmTaskCompletion = () => {
    if (!completeModalTask || !activeReferral) return;
    const res = completeFollowUpTask(
      activeReferral.id,
      completeModalTask.id,
      completionNotes || "Touchpoint successfully completed and clinical findings documented.",
    );
    if (res.success) showToast(`"${completeModalTask.title}" marked done.`);
    else showToast(`Action failed: ${res.reason}`, "error");
    closeCompleteModal();
  };

  return (
    <Page width="md">
      <Toast toast={toast} />

      <PageHeader title={isPatient ? "My check-ups" : "Follow-ups"} />

      {plans.length > 1 && (
        <FilterTabs
          label="Follow-up plans"
          items={plans.map((r) => ({
            id: r.id,
            label: r.patientName,
            count: `${countDone(r)}/${r.followUpPlan.tasks.length}`,
          }))}
          selected={activeReferral.id}
          onSelect={setSelectedPlanId}
        />
      )}

      {plan ? (
        <Card as="section" className="space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-ink break-words">{activeReferral.patientName}</h2>
              <p className="text-sm text-ink-muted tabular-nums">
                {countDone(activeReferral)} of {plan.tasks.length} done
                {plan.leadWorker ? ` · Lead: ${plan.leadWorker}` : ""}
              </p>
            </div>
            {isRouteAllowedForRole(role, "/referral") && (
              <Button as={Link} to={`/referral/${activeReferral.id}`} variant="link" size="sm">
                Open chart
              </Button>
            )}
          </div>

          <ul className="divide-y divide-line">
            {plan.tasks.map((task, idx) => {
              const isDone = task.status === FollowUpStatus.COMPLETED;
              const badge = STATE_BADGES[getFollowUpState(task, now)];
              return (
                <li key={task.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          isDone ? "bg-accent text-on-fill" : "bg-subtle text-ink"
                        }`}
                      >
                        {isDone ? <Icon name="check" size="sm" /> : idx + 1}
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-ink">{task.title}</h3>
                        <p className="text-sm text-ink-muted tabular-nums">
                          Due {task.dueDate} (day {task.dayOffset})
                        </p>
                        {badge && (
                          <Badge tone={badge.tone} className="mt-1">
                            {badge.label}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="shrink-0">
                      {isDone ? (
                        <Badge tone="accent">Done</Badge>
                      ) : isPatient ? (
                        <span className="text-sm text-ink-muted">Your care team will record this</span>
                      ) : (
                        <Button size="sm" className="w-full sm:w-auto" onClick={() => setCompleteModalTask(task)}>
                          Mark done
                        </Button>
                      )}
                    </div>
                  </div>

                  {(task.clinicalFocus || task.targetRole || (isDone && task.notes)) && (
                    <details className="mt-3 text-sm text-ink-muted">
                      <summary className="cursor-pointer font-semibold text-ink">Details</summary>
                      <div className="mt-2 space-y-1 break-words">
                        {task.clinicalFocus && <p>{task.clinicalFocus}</p>}
                        {task.targetRole && <p>Assigned to: {task.targetRole}</p>}
                        {isDone && task.notes && (
                          <p>
                            <strong className="text-ink">Findings:</strong> {task.notes}
                          </p>
                        )}
                      </div>
                    </details>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <EmptyState>
          {isPatient
            ? "Your check-ups will appear here once hospital care is complete."
            : "No follow-ups yet. They start when a referral is completed."}
        </EmptyState>
      )}

      {completeModalTask && (
        <FormDialog
          title={completeModalTask.title}
          onCancel={closeCompleteModal}
          onSave={handleConfirmTaskCompletion}
          saveLabel="Save"
        >
          <Field label={`What was found at the visit for ${activeReferral.patientName}?`}>
            <Textarea
              rows={4}
              placeholder="e.g., Blood pressure 118/76. Wound clean and dry. Feeding well."
              value={completionNotes}
              onChange={(e) => setCompletionNotes(e.target.value)}
            />
          </Field>
        </FormDialog>
      )}
    </Page>
  );
};

export default ContinuityOfCare;
