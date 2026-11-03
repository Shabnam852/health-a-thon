import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Dialog from "../components/Dialog.jsx";
import HospitalChoice from "../components/HospitalChoice.jsx";
import {
  actionsColumn,
  caseIdColumn,
  conditionColumn,
  fromColumn,
  patientColumn,
  priorityColumn,
  serialColumn,
  toColumn,
  typeColumn,
} from "../components/referralColumns.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, DataTable, FilterTabs, Page, PageHeader } from "../components/ui/index.js";
import { TIME_LIMITS_NOTE } from "../config/timeLimits.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { AlarmKind } from "../domain/alarms.js";
import { telHref } from "../domain/contact.js";
import {
  BarrierCategory,
  isHighAcuity,
  PatientType,
  ReferralStatus,
  sortByAcuity,
  UrgencyLevel,
} from "../domain/enums.js";
import { getHospitalRow, getNetworkSummary } from "../domain/network.js";
import { canDispatchTransport, findOpenBarrier, hasArrivedAtFacility, isFloating } from "../domain/workflow.js";

const filters = [
  { id: "all", label: "All" },
  { id: "maternal", label: "Mothers" },
  { id: "neonatal", label: "Newborns" },
  { id: "transport", label: "Needs transport" },
  { id: "overdue", label: "No reply yet" },
];

const statusLabels = {
  [ReferralStatus.SENT]: "Sent",
  [ReferralStatus.ACKNOWLEDGED]: "Accepted",
  [ReferralStatus.ARRIVAL_CONFIRMED]: "Arrived",
  [ReferralStatus.REJECTED]: "Floating: patient choosing",
};
const statusLabel = (status) =>
  statusLabels[status] || status.charAt(0) + status.slice(1).toLowerCase().replace(/_/g, " ");

const QUEUE_COLUMNS = [
  serialColumn(),
  caseIdColumn(),
  patientColumn(),
  priorityColumn(),
  typeColumn(),
  conditionColumn(),
  fromColumn(),
  toColumn(),
  {
    id: "status",
    header: "Status",
    accessorFn: (r) => statusLabel(r.status),
    meta: { filter: true, className: "font-semibold text-ink min-w-28" },
  },
  actionsColumn(
    ({ row: { original: r }, table }) =>
      isFloating(r) && (
        <Button size="sm" variant="primary" onClick={() => table.options.meta.onChoose(r)}>
          Record choice
        </Button>
      ),
  ),
];

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
    accessorFn: (row) => (row.alarms.length ? row.alarms.map((a) => a.title).join(" ") : statusLabel(row.status)),
    meta: { className: "min-w-56" },
    cell: ({ row: { original: row } }) =>
      row.alarms.length ? (
        <span className="space-y-1 block">
          {row.alarms.map((a) => (
            <span key={a.id} className="block">
              <span className="block font-semibold text-danger">{a.title}</span>
              <span className="block text-xs text-ink-muted">{a.detail}</span>
            </span>
          ))}
        </span>
      ) : (
        <span>
          <span className="block font-semibold text-ink">{statusLabel(row.status)}</span>
          {row.barrier && <span className="block text-xs text-danger">{row.barrier.title}</span>}
        </span>
      ),
  },
  actionsColumn(({ row: { original: r }, table }) => {
    const { onChoose, onOpenCase, hospitalCallLink, patientCallLink } = table.options.meta;
    // One button per kind of alarm, however many alarms of that kind the case has.
    const has = (kind) => r.alarms.some((a) => a.kind === kind);
    const isTransport = r.barrier?.category === BarrierCategory.TRANSPORT;
    return (
      <div className="flex justify-end gap-2">
        {has(AlarmKind.NO_PATIENT_CHOICE) && patientCallLink(r) && (
          <Button as="a" size="sm" href={patientCallLink(r)}>
            Call patient
          </Button>
        )}
        {has(AlarmKind.NO_HOSPITAL_REPLY) && hospitalCallLink(r) && (
          <Button as="a" size="sm" href={hospitalCallLink(r)}>
            Call hospital
          </Button>
        )}
        {has(AlarmKind.FOLLOW_UP_MISSED) && (
          <Button as={Link} size="sm" to="/continuity" onClick={() => onOpenCase(r.id)}>
            See follow-ups
          </Button>
        )}
        {r.alarms.length === 0 && r.barrier && (
          <Button as={Link} to={isTransport ? "/transport" : "/barriers"} variant="danger-quiet" size="sm">
            {!isTransport ? "Fix barrier" : canDispatchTransport(r) ? "Arrange van" : "Track van"}
          </Button>
        )}
        {isFloating(r) && (
          <Button size="sm" variant="primary" onClick={() => onChoose(r)}>
            Record choice
          </Button>
        )}
      </div>
    );
  }),
];

const CoordinatorDashboard = () => {
  const [searchParams] = useSearchParams();
  const {
    referrals,
    facilities,
    navigators,
    alarms,
    now,
    setActiveReferralId,
    recordPatientChoice,
    recordPatientGoingElsewhere,
  } = useReferrals();
  const [choosingFor, setChoosingFor] = useState(null);

  const [activeTab, setActiveTab] = useState("all");
  const { toast, report } = useToast();

  // The URL decides the screen: the full list, or what needs attention now.
  const isQueueView = searchParams.get("view") === "queue";

  const openReferrals = useMemo(
    () => sortByAcuity(referrals.filter((r) => r.status !== ReferralStatus.COMPLETED)),
    [referrals],
  );

  const filteredReferrals = useMemo(
    () =>
      openReferrals.filter((r) => {
        // A mother and baby referred together belong under both.
        if (activeTab === "maternal" && r.referralType === PatientType.CHILD) return false;
        if (activeTab === "neonatal" && r.referralType === PatientType.MATERNAL) return false;
        if (activeTab === "transport" && !(r.transit || r.transitBarrier)) return false;
        if (activeTab === "overdue" && r.status !== ReferralStatus.SENT) return false;
        return true;
      }),
    [openReferrals, activeTab],
  );

  const tableContext = useMemo(
    () => ({ onOpenCase: setActiveReferralId, onChoose: setChoosingFor }),
    [setActiveReferralId],
  );

  // A case already raised as an alarm is not listed twice.
  const alarmedIds = new Set(alarms.map((a) => a.referral.id));
  const attentionCases = openReferrals.filter(
    (r) => !alarmedIds.has(r.id) && (isFloating(r) || (isHighAcuity(r.priority) && !hasArrivedAtFacility(r))),
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
    ...[...alarmsByCase.values()].map(({ referral, alarms: list }) => ({ ...referral, alarms: list })),
    ...attentionCases.map((r) => ({ ...r, alarms: [], barrier: findOpenBarrier(r) })),
  ];

  const summary = [
    `${openReferrals.length} open`,
    `${openReferrals.filter((r) => !hasArrivedAtFacility(r)).length} not arrived`,
    `${referrals.filter((r) => findOpenBarrier(r)).length} blocked`,
    `${referrals.filter((r) => r.status === ReferralStatus.ARRIVAL_CONFIRMED).length} at hospital`,
    // Same count as the Hospitals page: beds held for referred patients are not free.
    `${getNetworkSummary(facilities.map((f) => getHospitalRow(f, referrals, now))).bedsFree} beds free`,
  ].join(" · ");

  const todoContext = {
    ...tableContext,
    hospitalCallLink: (r) => telHref(facilities.find((f) => f.name === r.toFacility)?.phone),
    patientCallLink: (r) => telHref(r.caregiverContact) || telHref(r.patientPhone),
  };

  const finishChoice = (res, message) => {
    report(res, message);
    setChoosingFor(null);
  };

  return (
    <Page width="full">
      <Toast toast={toast} />

      <PageHeader
        title={isQueueView ? "Open referrals" : "Coordinator"}
        subtitle={isQueueView ? undefined : summary}
        actions={
          !isQueueView && (
            <Button as={Link} to="/coordinator?view=queue" variant="link" size="sm">
              All open referrals
            </Button>
          )
        }
      />

      {isQueueView ? (
        <section className="space-y-4">
          <FilterTabs label="Filter referrals" items={filters} selected={activeTab} onSelect={setActiveTab} />
          <DataTable
            label="Open referrals"
            data={filteredReferrals}
            columns={QUEUE_COLUMNS}
            context={tableContext}
            searchPlaceholder="Search name, ID, condition or hospital"
            emptyText="No referrals in this view."
            noMatchText="No referrals match."
          />
        </section>
      ) : (
        <section className="space-y-2">
          <DataTable
            label="To do"
            data={todo}
            columns={TODO_COLUMNS}
            context={todoContext}
            getRowClassName={(row) => (row.alarms.length ? "bg-danger-soft/40" : "")}
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
      )}

      {choosingFor && (
        <Dialog title={`Record what ${choosingFor.patientName} chose`} onClose={() => setChoosingFor(null)}>
          <p className="text-sm text-ink-muted">
            Call the family first. The choice is theirs.
            {choosingFor.priority === UrgencyLevel.STAT && (
              <strong className="block text-danger">This is an emergency: tell them to call 108 now.</strong>
            )}
          </p>
          <HospitalChoice
            referral={choosingFor}
            noOptionsText="No suitable hospital has a free bed right now. Ask the family where they want to go."
            onChoose={(hospital) =>
              finishChoice(recordPatientChoice(choosingFor.id, hospital), `Referral sent to ${hospital}.`)
            }
            onElsewhere={(place) =>
              finishChoice(recordPatientGoingElsewhere(choosingFor.id, place), `Plan saved: going to ${place}.`)
            }
          />
        </Dialog>
      )}
    </Page>
  );
};

export default CoordinatorDashboard;
