import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Dialog from "../components/Dialog.jsx";
import HospitalChoice from "../components/HospitalChoice.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Badge, Button, Card, EmptyState, FilterTabs, Input, Page, PageHeader } from "../components/ui/index.js";
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
import {
  canDispatchTransport,
  findOpenBarrier,
  getDestination,
  hasArrivedAtFacility,
  isFloating,
} from "../domain/workflow.js";

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

const CoordinatorDashboard = () => {
  const [searchParams] = useSearchParams();
  const {
    referrals,
    facilities,
    navigators,
    alarms,
    setActiveReferralId,
    recordPatientChoice,
    recordPatientGoingElsewhere,
  } = useReferrals();
  const [choosingFor, setChoosingFor] = useState(null);

  const [activeTab, setActiveTab] = useState("all");
  const [filterQuery, setFilterQuery] = useState("");
  const { toast, report } = useToast();

  // The URL decides the screen: the full list, or what needs attention now.
  const isQueueView = searchParams.get("view") === "queue";

  const openReferrals = useMemo(
    () => sortByAcuity(referrals.filter((r) => r.status !== ReferralStatus.COMPLETED)),
    [referrals],
  );

  const filteredReferrals = useMemo(() => {
    const q = filterQuery.trim().toLowerCase();
    return openReferrals.filter((r) => {
      // A mother and baby referred together belong under both.
      if (activeTab === "maternal" && r.referralType === PatientType.CHILD) return false;
      if (activeTab === "neonatal" && r.referralType === PatientType.MATERNAL) return false;
      if (activeTab === "transport" && !(r.transit || r.transitBarrier)) return false;
      if (activeTab === "overdue" && r.status !== ReferralStatus.SENT) return false;
      if (!q) return true;
      return [r.patientName, r.id, r.condition, r.fromFacility, r.toFacility].some((v) =>
        (v || "").toLowerCase().includes(q),
      );
    });
  }, [openReferrals, activeTab, filterQuery]);

  // A case already raised as an alarm is not listed twice.
  const alarmedIds = new Set(alarms.map((a) => a.referral.id));
  const attentionCases = openReferrals.filter(
    (r) => !alarmedIds.has(r.id) && (isFloating(r) || (isHighAcuity(r.priority) && !hasArrivedAtFacility(r))),
  );

  const numbers = [
    { label: "Open referrals", value: openReferrals.length },
    { label: "Waiting to arrive", value: openReferrals.filter((r) => !hasArrivedAtFacility(r)).length },
    { label: "Blocked by a barrier", value: referrals.filter((r) => findOpenBarrier(r)).length },
    { label: "At the hospital", value: referrals.filter((r) => r.status === ReferralStatus.ARRIVAL_CONFIRMED).length },
  ];

  const finishChoice = (res, message) => {
    report(res, message);
    setChoosingFor(null);
  };

  const recordChoiceButton = (r) =>
    isFloating(r) && (
      <Button size="sm" variant="primary" onClick={() => setChoosingFor(r)}>
        Record patient's choice
      </Button>
    );

  const hospitalCallLink = (r) => telHref(facilities.find((f) => f.name === r.toFacility)?.phone);
  const patientCallLink = (r) => telHref(r.caregiverContact) || telHref(r.patientPhone);

  const patientLink = (r) => (
    <Link to={`/referral/${r.id}`} onClick={() => setActiveReferralId(r.id)} className="min-w-0 flex-1 rounded-control">
      <span className="flex flex-wrap items-center gap-2">
        <span className="font-bold text-ink">{r.patientName}</span>
        <Badge tone={isHighAcuity(r.priority) ? "danger" : "neutral"} className="uppercase">
          {r.priority}
        </Badge>
      </span>
      <span className="block text-sm text-ink-muted mt-0.5">{r.condition || r.reason}</span>
    </Link>
  );

  return (
    <Page>
      <Toast toast={toast} />

      <PageHeader title={isQueueView ? "Open referrals" : "Coordinator"} />

      {isQueueView ? (
        <section className="space-y-4">
          <Input
            aria-label="Search referrals"
            placeholder="Search name, ID, condition or hospital"
            type="search"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
          />
          <FilterTabs label="Filter referrals" items={filters} selected={activeTab} onSelect={setActiveTab} />

          {filteredReferrals.length === 0 ? (
            <EmptyState>No referrals match.</EmptyState>
          ) : (
            <ul className="space-y-4">
              {filteredReferrals.map((r) => (
                <Card as="li" key={r.id} className="flex flex-col lg:flex-row lg:items-center gap-3">
                  {patientLink(r)}
                  <span className="text-sm text-ink-muted lg:text-right">
                    {r.fromFacility} → {getDestination(r)}
                    <span className="block font-semibold text-ink">{statusLabel(r.status)}</span>
                  </span>
                  {recordChoiceButton(r)}
                </Card>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <>
          {alarms.length > 0 && (
            <section className="space-y-3">
              <div>
                <h2 className="font-display text-base text-ink font-semibold">Act now ({alarms.length})</h2>
                <p className="text-sm text-ink-muted">{TIME_LIMITS_NOTE}</p>
              </div>
              <ul className="space-y-4">
                {alarms.map((alarm) => {
                  const r = alarm.referral;
                  return (
                    <Card
                      as="li"
                      key={alarm.id}
                      className="flex flex-col lg:flex-row lg:items-center gap-3 border-danger"
                    >
                      {patientLink(r)}
                      <span className="text-sm lg:text-right">
                        <span className="block font-semibold text-danger">{alarm.title}</span>
                        <span className="block text-ink-muted">{alarm.detail}</span>
                      </span>
                      {alarm.kind === AlarmKind.NO_PATIENT_CHOICE && patientCallLink(r) && (
                        <Button as="a" size="sm" href={patientCallLink(r)}>
                          Call patient
                        </Button>
                      )}
                      {recordChoiceButton(r)}
                      {alarm.kind === AlarmKind.NO_HOSPITAL_REPLY && hospitalCallLink(r) && (
                        <Button as="a" size="sm" href={hospitalCallLink(r)}>
                          Call hospital
                        </Button>
                      )}
                      {alarm.kind === AlarmKind.FOLLOW_UP_MISSED && (
                        <Button as={Link} size="sm" to="/continuity" onClick={() => setActiveReferralId(r.id)}>
                          See follow-ups
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-base text-ink font-semibold">Urgent, not yet arrived</h2>
              <Button as={Link} to="/coordinator?view=queue" variant="link" size="sm">
                All open referrals
              </Button>
            </div>

            {attentionCases.length === 0 ? (
              <EmptyState>Nobody urgent is waiting to arrive.</EmptyState>
            ) : (
              <ul className="space-y-4">
                {attentionCases.map((r) => {
                  const barrier = findOpenBarrier(r);
                  const isTransport = barrier?.category === BarrierCategory.TRANSPORT;
                  return (
                    <Card as="li" key={r.id} className="flex flex-col lg:flex-row lg:items-center gap-3">
                      {patientLink(r)}
                      <span className="text-sm font-semibold text-ink">{statusLabel(r.status)}</span>
                      {recordChoiceButton(r)}
                      {barrier && (
                        <Button
                          as={Link}
                          to={isTransport ? "/transport" : "/barriers"}
                          variant="danger-quiet"
                          size="sm"
                        >
                          {!isTransport ? "Fix barrier" : canDispatchTransport(r) ? "Arrange van" : "Track van"}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </ul>
            )}
          </section>

          <section aria-label="Totals" className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {numbers.map((n) => (
              <Card key={n.label}>
                <div className="font-display text-3xl font-semibold text-ink tabular-nums">{n.value}</div>
                <div className="text-sm text-ink-muted">{n.label}</div>
              </Card>
            ))}
          </section>

          <Card as="details">
            <summary className="cursor-pointer text-sm font-semibold text-ink">Team and beds</summary>
            <ul className="mt-3 space-y-1 text-sm">
              {navigators.map((nav) => (
                <li key={nav.id} className="flex justify-between gap-3">
                  <span className="text-ink font-medium">{nav.name}</span>
                  <span className="text-ink-muted">
                    {referrals.filter((r) => r.navigator?.name === nav.name).length} cases
                  </span>
                </li>
              ))}
              <li className="flex justify-between gap-3 pt-2 border-t border-line">
                <span className="text-ink font-medium">Beds free</span>
                <span className="text-ink-muted">
                  {facilities.reduce((sum, f) => sum + f.bedsAvailable, 0)} in {facilities.length} hospitals
                </span>
              </li>
            </ul>
          </Card>
        </>
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
