import { useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import LinkRequestsCard from "../components/LinkRequestsCard.jsx";
import RecordChoiceDialog from "../components/RecordChoiceDialog.jsx";
import {
  actionsColumn,
  caseIdColumn,
  conditionColumn,
  patientColumn,
  priorityColumn,
  serialColumn,
  statusLabel,
} from "../components/referralColumns.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, DataTable, Page, PageHeader } from "../components/ui/index.js";
import { TIME_LIMITS_NOTE } from "../config/timeLimits.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { AlarmKind } from "../domain/alarms.js";
import { telHref } from "../domain/contact.js";
import { BarrierCategory, isHighAcuity, ReferralStatus, sortByAcuity } from "../domain/enums.js";
import { familyFlags, hasOpenCallBack } from "../domain/familyRequests.js";
import { getHospitalRow, getNetworkSummary } from "../domain/network.js";
import { canDispatchTransport, findOpenBarrier, hasArrivedAtFacility, isFloating } from "../domain/workflow.js";

const ProblemCell = ({ row }) =>
  row.alarms.length ? (
    <span className="space-y-1 block">
      {row.alarms.map((a) => (
        <span key={a.id} className="block">
          <span className="block truncate font-semibold text-danger" title={a.title}>
            {a.title}
          </span>
          <span className="block truncate text-xs text-ink-muted">{a.detail}</span>
        </span>
      ))}
    </span>
  ) : (
    <span>
      <span className="block font-semibold text-ink">{statusLabel(row.status)}</span>
      {row.barrier && (
        <span className="block truncate text-xs text-danger" title={row.barrier.title}>
          {row.barrier.title}
        </span>
      )}
    </span>
  );

// The coordinator's to-do list: what is wrong with each case, and the one thing to do about it.
const TODO_COLUMNS = [
  serialColumn(),
  caseIdColumn(),
  patientColumn(),
  priorityColumn(),
  conditionColumn(),
  {
    id: "problem",
    header: "What's wrong",
    accessorFn: (row) =>
      [row.alarms.length ? row.alarms.map((a) => a.title).join(" ") : statusLabel(row.status), ...row.flags].join(" "),
    meta: { className: "min-w-56 max-w-80" },
    cell: ({ row: { original: row } }) => (
      <>
        <ProblemCell row={row} />
        {/* What the family told us: a report, never a confirmed fact. */}
        {row.flags.map((flag) => (
          <span key={flag} className="block text-xs font-semibold text-ink">
            {flag}
          </span>
        ))}
      </>
    ),
  },
  actionsColumn(({ row: { original: r }, table }) => {
    const { onChoose, onOpenCase, onCalledBack, hospitalCallLink, patientCallLink } = table.options.meta;
    // One button per kind of alarm, however many alarms of that kind the case has.
    const has = (kind) => r.alarms.some((a) => a.kind === kind);
    const isTransport = r.barrier?.category === BarrierCategory.TRANSPORT;
    return (
      <div className="flex justify-end gap-2">
        {has(AlarmKind.NO_PATIENT_CHOICE) && patientCallLink(r) && (
          <Button aria-label={`Call patient for ${r.patientName}`} as="a" size="sm" href={patientCallLink(r)}>
            Call patient
          </Button>
        )}
        {has(AlarmKind.NO_HOSPITAL_REPLY) && hospitalCallLink(r) && (
          <Button aria-label={`Call hospital for ${r.patientName}`} as="a" size="sm" href={hospitalCallLink(r)}>
            Call hospital
          </Button>
        )}
        {has(AlarmKind.FOLLOW_UP_MISSED) && (
          <Button
            aria-label={`See follow-ups for ${r.patientName}`}
            as={Link}
            size="sm"
            to="/continuity"
            onClick={() => onOpenCase(r.id)}
          >
            See follow-ups
          </Button>
        )}
        {r.alarms.length === 0 && r.barrier && (
          <Button as={Link} to={isTransport ? "/transport" : "/patients?show=blocked"} variant="danger-quiet" size="sm">
            {!isTransport ? "Fix barrier" : canDispatchTransport(r) ? "Arrange van" : "Track van"}
          </Button>
        )}
        {hasOpenCallBack(r) && (
          <>
            {!has(AlarmKind.NO_PATIENT_CHOICE) && patientCallLink(r) && (
              <Button aria-label={`Call family for ${r.patientName}`} as="a" size="sm" href={patientCallLink(r)}>
                Call family
              </Button>
            )}
            <Button aria-label={`Mark called back for ${r.patientName}`} size="sm" onClick={() => onCalledBack(r)}>
              Called back
            </Button>
          </>
        )}
        {isFloating(r) && (
          <Button
            aria-label={`Record choice for ${r.patientName}`}
            size="sm"
            variant="primary"
            onClick={() => onChoose(r)}
          >
            Record choice
          </Button>
        )}
      </div>
    );
  }),
];

const CoordinatorDashboard = () => {
  const [searchParams] = useSearchParams();
  const { referrals, facilities, navigators, alarms, now, setActiveReferralId, recordContactAttempt } = useReferrals();
  const [choosingFor, setChoosingFor] = useState(null);

  const { toast, report } = useToast();

  // Old links to the full list now go to Patients.
  const isQueueView = searchParams.get("view") === "queue";

  const openReferrals = useMemo(
    () => sortByAcuity(referrals.filter((r) => r.status !== ReferralStatus.COMPLETED)),
    [referrals],
  );

  const tableContext = useMemo(
    () => ({ onOpenCase: setActiveReferralId, onChoose: setChoosingFor }),
    [setActiveReferralId],
  );

  // A case already raised as an alarm is not listed twice.
  const alarmedIds = new Set(alarms.map((a) => a.referral.id));
  // A family's call back request is listed even on a finished case: they may ask during the 42-day follow-ups.
  const attentionCases = [
    ...openReferrals,
    ...referrals.filter((r) => r.status === ReferralStatus.COMPLETED && hasOpenCallBack(r)),
  ].filter(
    (r) =>
      !alarmedIds.has(r.id) &&
      (isFloating(r) || (isHighAcuity(r.priority) && !hasArrivedAtFacility(r)) || familyFlags(r).length > 0),
  );

  // Alarmed cases first, then urgent cases still on their way. One row per case: a case with
  // several alarms lists them all in one row.
  const alarmsByCase = new Map();
  for (const alarm of alarms) {
    const id = alarm.referral.id;
    if (!alarmsByCase.has(id)) alarmsByCase.set(id, { referral: alarm.referral, alarms: [] });
    alarmsByCase.get(id).alarms.push(alarm);
  }
  const todo = [
    ...sortByAcuity(
      [...alarmsByCase.values()].map(({ referral, alarms: list }) => ({
        ...referral,
        alarms: list,
        flags: familyFlags(referral),
      })),
    ),
    ...attentionCases.map((r) => ({ ...r, alarms: [], barrier: findOpenBarrier(r), flags: familyFlags(r) })),
  ];

  const summary = [
    `${openReferrals.length} open`,
    `${openReferrals.filter((r) => !hasArrivedAtFacility(r)).length} not arrived`,
    // Finished cases can keep an old barrier on record; it no longer blocks anyone.
    `${openReferrals.filter((r) => findOpenBarrier(r)).length} blocked`,
    `${referrals.filter((r) => r.status === ReferralStatus.ARRIVAL_CONFIRMED).length} at hospital`,
    // Same count as the Hospitals page: beds held for referred patients are not free.
    `${getNetworkSummary(facilities.map((f) => getHospitalRow(f, referrals, now))).bedsFree} beds free`,
  ].join(" · ");

  const todoContext = {
    ...tableContext,
    hospitalCallLink: (r) => telHref(facilities.find((f) => f.name === r.toFacility)?.phone),
    patientCallLink: (r) => telHref(r.caregiverContact) || telHref(r.patientPhone),
    onCalledBack: (r) =>
      report(
        recordContactAttempt(r.id, { method: "Phone Call", outcome: "Successful", notes: "Called the family back." }),
        `Call back to ${r.patientName}'s family recorded.`,
      ),
  };

  if (isQueueView) return <Navigate to="/patients" replace />;

  return (
    <Page width="full">
      <Toast toast={toast} />

      <PageHeader
        title="Coordinator"
        subtitle={summary}
        actions={
          <Button as={Link} to="/patients" variant="link" size="sm">
            All patients
          </Button>
        }
      />
      <LinkRequestsCard />
      <section className="space-y-2">
        <DataTable
          label="To do"
          data={todo}
          columns={TODO_COLUMNS}
          context={todoContext}
          getRowClassName={(row) => (row.alarms.length ? "bg-row-alarm" : "")}
          searchPlaceholder="Search name, ID or problem"
          emptyText="Nothing needs you right now."
          noMatchText="Nothing matches."
        />
        {alarms.length > 0 && <p className="text-xs text-ink-muted">{TIME_LIMITS_NOTE}</p>}
        <p className="text-sm text-ink-muted">
          <span className="font-semibold text-ink">Team: </span>
          {navigators
            .map((nav) => `${nav.name} (${referrals.filter((r) => r.navigator?.name === nav.name).length})`)
            .join(" · ")}
        </p>
      </section>
      {choosingFor && (
        <RecordChoiceDialog referral={choosingFor} onClose={() => setChoosingFor(null)} onResult={report} />
      )}
    </Page>
  );
};

export default CoordinatorDashboard;
