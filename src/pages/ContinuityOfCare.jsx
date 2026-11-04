import { useState } from "react";
import { Link } from "react-router";
import ListenButton from "../components/assistant/ListenButton.jsx";
import { FormDialog } from "../components/Dialog.jsx";
import { actionsColumn, serialColumn } from "../components/referralColumns.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  Card,
  DataTable,
  Disclosure,
  EmptyState,
  Field,
  Icon,
  Page,
  PageHeader,
  Pictogram,
  Textarea,
} from "../components/ui/index.js";
import { isRouteAllowedForRole, RoleId } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { getFollowUpState } from "../domain/alarms.js";
import { telHref } from "../domain/contact.js";
import { FollowUpStatus } from "../domain/enums.js";
import { describeVisitForFamily, getCheckUpsSummary } from "../domain/familyVisits.js";

// One picture per kind of visit, so a family can tell the visits apart without reading the title.
const VISIT_PICTOGRAMS = [
  [/bilirubin|weight|newborn|neonatal|baby/i, "baby"],
  [/emotional|mental/i, "wellbeing"],
  [/lactation|maternal/i, "mother-baby"],
  [/bp|surgical|wound/i, "nurse"],
  [/exam|comprehensive/i, "doctor"],
];
const visitPictogram = (title = "") => VISIT_PICTOGRAMS.find(([re]) => re.test(title))?.[1] || "calendar";

// "Saturday, 31 October": a date a family reads at a glance, not 2026-10-31.
const friendlyDate = (dueDate) =>
  new Date(`${dueDate.slice(0, 10)}T00:00:00`).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

const PATIENT_STATE = {
  [FollowUpStatus.COMPLETED]: { tone: "accent", label: "Done", icon: "check_circle" },
  [FollowUpStatus.DUE]: { tone: "highlight", label: "Due today", icon: "today" },
  [FollowUpStatus.MISSED]: { tone: "danger", label: "Missed", icon: "error" },
  [FollowUpStatus.ESCALATED]: { tone: "danger", label: "Missed", icon: "error" },
  [FollowUpStatus.PLANNED]: { tone: "neutral", label: "Coming up", icon: "event" },
};
const isLate = (state) => state === FollowUpStatus.MISSED || state === FollowUpStatus.ESCALATED;

const CheckUps = ({ referral, now, role }) => {
  const plan = referral.followUpPlan;
  const nav = referral.navigator;
  const navHref = telHref(nav?.phone);
  const done = countDone(referral);
  const next = plan.tasks.find((t) => t.status !== FollowUpStatus.COMPLETED);
  const nextState = next && getFollowUpState(next, now);
  // This screen is only for the family: visits are named in plain words, never the clinical title.
  const nextVisit = next && describeVisitForFamily(next);
  const listenText = getCheckUpsSummary({
    next,
    nextLabel: isLate(nextState) ? "Missed check-up" : "Next check-up",
    nextDate: next && friendlyDate(next.dueDate),
    missed: isLate(nextState),
    navigatorName: nav?.name?.split(",")[0],
    total: plan.tasks.length,
    done,
  });

  return (
    <>
      <ListenButton referral={referral} text={listenText} />
      {next ? (
        <section className="rounded-card bg-brand text-on-fill p-5 sm:p-6 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm text-on-fill-muted">{isLate(nextState) ? "Missed check-up" : "Next check-up"}</p>
              <h2 className="font-display text-xl sm:text-2xl font-semibold mt-1 break-words">
                {friendlyDate(next.dueDate)}
              </h2>
              <p className="text-sm mt-1 break-words">
                Day {next.dayOffset}: {nextVisit.name}
              </p>
            </div>
            <Pictogram name="calendar" tone="on-fill" size="lg" />
          </div>
          <p className="text-sm border-t border-on-fill/20 pt-3">
            {isLate(nextState)
              ? `${nav?.name?.split(",")[0] || "Your care navigator"} will call you to set a new time.`
              : "Your care team will come to you or tell you where to go."}
          </p>
        </section>
      ) : (
        <section
          role="status"
          className="flex items-start gap-3 rounded-card border-l-4 border-accent bg-accent-soft p-4"
        >
          <Icon name="check_circle" className="text-accent mt-0.5" />
          <p className="text-sm text-ink">
            <strong>All check-ups are done.</strong> Well done looking after {referral.patientName.split(" ")[0]}.
          </p>
        </section>
      )}

      <Card as="section" title={`${referral.patientName}'s check-ups`} className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 -mt-2">
          <p className="text-sm text-ink-muted tabular-nums">
            {done} of {plan.tasks.length} done
          </p>
          {isRouteAllowedForRole(role, "/referral") && (
            <Button as={Link} to={`/referral/${referral.id}`} variant="link" size="sm">
              Open chart
            </Button>
          )}
        </div>

        <ol className="space-y-3">
          {plan.tasks.map((task) => {
            const state = getFollowUpState(task, now);
            const meta = PATIENT_STATE[state] || PATIENT_STATE[FollowUpStatus.PLANNED];
            const isDone = state === FollowUpStatus.COMPLETED;
            const visit = describeVisitForFamily(task);
            return (
              <li
                key={task.id}
                aria-current={task === next ? "step" : undefined}
                className={`rounded-card border p-4 space-y-3 ${isLate(state) ? "border-danger" : task === next ? "border-accent" : "border-line"}`}
              >
                <div className="flex items-start gap-3">
                  <Pictogram
                    name={visitPictogram(task.title)}
                    tone={isDone ? "neutral" : "ink"}
                    size="sm"
                    bare
                    className="mt-1"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-muted">
                      Day {task.dayOffset}
                      <Badge tone={meta.tone}>{meta.label}</Badge>
                    </p>
                    <h3 className="font-semibold text-ink break-words">{visit.name}</h3>
                    <p className="flex items-center gap-1.5 text-sm text-ink mt-1">
                      <Icon name="calendar_today" size="sm" className="text-ink-muted" />
                      {friendlyDate(task.dueDate)}
                    </p>
                  </div>
                </div>

                {isLate(state) && (
                  <p className="flex items-start gap-2 text-sm text-danger-strong">
                    <Icon name="call" size="sm" className="mt-0.5" />
                    This visit was missed. Your care navigator will call you to set a new time.
                  </p>
                )}

                <Disclosure title="What happens at this visit" variant="inline">
                  <dl className="space-y-2 break-words text-sm">
                    <div>
                      <dt className="text-xs text-ink-muted">They will check</dt>
                      <dd className="text-ink">{visit.checks}</dd>
                    </div>
                    {visit.who && (
                      <div>
                        <dt className="text-xs text-ink-muted">Who you will see</dt>
                        <dd className="text-ink">{visit.who}</dd>
                      </div>
                    )}
                    {isDone && task.notes && (
                      <div>
                        <dt className="text-xs text-ink-muted">What they found</dt>
                        <dd className="text-ink">{task.notes}</dd>
                      </div>
                    )}
                  </dl>
                </Disclosure>
              </li>
            );
          })}
        </ol>
      </Card>

      {nav && (
        <Card as="section" title="Questions about a check-up?" className="space-y-3">
          <p className="text-sm text-ink">{nav.name} can change a time, arrange a ride, or help with language.</p>
          {navHref && (
            <Button as="a" href={navHref} variant="primary" className="w-full sm:w-auto">
              <Icon name="call" />
              Call {nav.phone}
            </Button>
          )}
        </Card>
      )}
    </>
  );
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
    sortFn: (a, b) => STATE_ORDER.indexOf(a.original.state) - STATE_ORDER.indexOf(b.original.state),
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
        <Button
          aria-label={`Mark done for ${v.referral.patientName}`}
          size="sm"
          onClick={() => table.options.meta.onMarkDone(v)}
        >
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
      completionNotes.trim() || "Touchpoint successfully completed and clinical findings documented.",
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
        <CheckUps referral={activeReferral} now={now} role={role} />
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
