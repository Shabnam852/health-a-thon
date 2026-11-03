import { useState } from "react";
import { Link } from "react-router-dom";
import { FormDialog } from "../components/Dialog.jsx";
import { actionsColumn, serialColumn } from "../components/referralColumns.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  Card,
  DataTable,
  EmptyState,
  Field,
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

const STATE_ORDER = [
  FollowUpStatus.ESCALATED,
  FollowUpStatus.MISSED,
  FollowUpStatus.DUE,
  FollowUpStatus.PLANNED,
  FollowUpStatus.SCHEDULED,
  FollowUpStatus.COMPLETED,
];
const STATE_LABELS = {
  [FollowUpStatus.ESCALATED]: "Escalated",
  [FollowUpStatus.MISSED]: "Missed",
  [FollowUpStatus.DUE]: "Due now",
  [FollowUpStatus.PLANNED]: "Upcoming",
  [FollowUpStatus.SCHEDULED]: "Upcoming",
  [FollowUpStatus.COMPLETED]: "Done",
};
const STATE_TONES = {
  [FollowUpStatus.ESCALATED]: "danger-solid",
  [FollowUpStatus.MISSED]: "danger",
  [FollowUpStatus.DUE]: "warning",
  [FollowUpStatus.COMPLETED]: "accent",
};

// Every visit across every patient, one row each.
const VISIT_COLUMNS = [
  serialColumn(),
  {
    id: "caseId",
    header: "Case ID",
    accessorFn: (v) => v.referral.id,
    meta: { className: "whitespace-nowrap tabular-nums text-ink-muted" },
  },
  {
    id: "patient",
    header: "Patient",
    accessorFn: (v) => v.referral.patientName,
    meta: { filter: true, className: "min-w-32" },
    cell: ({ row: { original: v }, table }) => (
      <Link
        to={`/referral/${v.referral.id}`}
        onClick={() => table.options.meta.onOpenCase(v.referral.id)}
        className="font-semibold text-ink hover:underline"
      >
        {v.referral.patientName}
      </Link>
    ),
  },
  { id: "visit", header: "Visit", accessorFn: (v) => v.task.title, meta: { className: "min-w-56 text-ink" } },
  {
    id: "due",
    header: "Due",
    accessorFn: (v) => v.task.dueDate,
    meta: { className: "whitespace-nowrap tabular-nums" },
    cell: ({ row: { original: v } }) => (
      <span>
        {v.task.dueDate.slice(0, 10)}
        <span className="block text-xs text-ink-muted">day {v.task.dayOffset}</span>
      </span>
    ),
  },
  {
    id: "state",
    header: "State",
    accessorFn: (v) => STATE_LABELS[v.state],
    sortingFn: (a, b) => STATE_ORDER.indexOf(a.original.state) - STATE_ORDER.indexOf(b.original.state),
    meta: { filter: true },
    cell: ({ row: { original: v } }) => <Badge tone={STATE_TONES[v.state] || "neutral"}>{STATE_LABELS[v.state]}</Badge>,
  },
  {
    id: "assigned",
    header: "Assigned to",
    accessorFn: (v) => v.task.targetRole || v.referral.followUpPlan.leadWorker || "",
    meta: { filter: true, className: "min-w-40 text-ink-muted" },
  },
  {
    id: "notes",
    header: "Focus or findings",
    accessorFn: (v) => (v.state === FollowUpStatus.COMPLETED ? v.task.notes : v.task.clinicalFocus) || "",
    meta: { className: "min-w-48 text-ink-muted" },
  },
  actionsColumn(
    ({ row: { original: v }, table }) =>
      v.state !== FollowUpStatus.COMPLETED && (
        <Button size="sm" onClick={() => table.options.meta.onMarkDone(v)}>
          Mark done
        </Button>
      ),
  ),
];

const ContinuityOfCare = () => {
  const { referrals, completeFollowUpTask, role, activeReferralId, setActiveReferralId, now } = useReferrals();
  const isPatient = role === RoleId.PATIENT;

  const [completeModalTask, setCompleteModalTask] = useState(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const { toast, showToast } = useToast();

  // A patient sees only their own plan.
  const plans = referrals.filter((r) => r.followUpPlan != null && (!isPatient || r.id === activeReferralId));
  const activeReferral = plans.find((r) => r.id === activeReferralId) || plans[0] || null;
  const plan = activeReferral?.followUpPlan;

  // Missed and escalated visits first, then by due date.
  const visits = plans
    .flatMap((r) =>
      r.followUpPlan.tasks.map((task) => ({
        id: `${r.id}-${task.id}`,
        referral: r,
        task,
        state: getFollowUpState(task, now),
      })),
    )
    .sort(
      (a, b) =>
        STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state) || a.task.dueDate.localeCompare(b.task.dueDate),
    );
  const missedCount = visits.filter((v) => [FollowUpStatus.MISSED, FollowUpStatus.ESCALATED].includes(v.state)).length;
  const dueCount = visits.filter((v) => v.state === FollowUpStatus.DUE).length;

  const closeCompleteModal = () => {
    setCompleteModalTask(null);
    setCompletionNotes("");
  };

  const handleConfirmTaskCompletion = () => {
    // Every path that opens the dialog stores the task's own referral, so there is no fallback
    // that could complete a visit on whichever patient happens to be active.
    const forReferral = completeModalTask?.referral;
    if (!forReferral) return;
    const res = completeFollowUpTask(
      forReferral.id,
      completeModalTask.id,
      completionNotes || "Touchpoint successfully completed and clinical findings documented.",
    );
    if (res.success) showToast(`"${completeModalTask.title}" marked done.`);
    else showToast(`Action failed: ${res.reason}`, "error");
    closeCompleteModal();
  };

  return (
    <Page width={isPatient ? "md" : "full"}>
      <Toast toast={toast} />

      <PageHeader
        title={isPatient ? "My check-ups" : "Follow-ups"}
        subtitle={
          isPatient
            ? undefined
            : [
                `${plans.length} ${plans.length === 1 ? "patient" : "patients"}`,
                missedCount > 0 && `${missedCount} missed`,
                dueCount > 0 && `${dueCount} due now`,
              ]
                .filter(Boolean)
                .join(" · ")
        }
      />

      {!isPatient ? (
        <DataTable
          label="Follow-up visits"
          data={visits}
          columns={VISIT_COLUMNS}
          context={{
            onOpenCase: setActiveReferralId,
            onMarkDone: (v) => setCompleteModalTask({ ...v.task, referral: v.referral }),
          }}
          searchPlaceholder="Search patient, visit or worker"
          emptyText="No follow-ups yet. They start when a referral is completed."
          noMatchText="No visits match."
          pageSize={50}
        />
      ) : plan ? (
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
                        <Button
                          size="sm"
                          className="w-full sm:w-auto"
                          onClick={() => setCompleteModalTask({ ...task, referral: activeReferral })}
                        >
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
          <Field
            label={`What was found at the visit for ${(completeModalTask.referral || activeReferral).patientName}?`}
          >
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
