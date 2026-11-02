import { Link, useParams } from "react-router-dom";
import { Badge, Button, Card, Page, PageHeader } from "../components/ui/index.js";
import { getRoleDefinition, isRouteAllowedForRole } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { isHighAcuity, PatientType, Role } from "../domain/enums.js";
import { getJourneyHeadline, getReferralJourney, JourneyState } from "../domain/landing.js";
import { getDestination, hasArrivedAtFacility, isFloating } from "../domain/workflow.js";

const childVitals = [
  ["Bilirubin", "tsb"],
  ["Weight", "weight"],
  ["Temperature", "temp"],
  ["Heart rate", "hr"],
];
const maternalVitals = [
  ["Blood pressure", "bp"],
  ["Fetal heart rate", "fhr"],
  ["Urine protein", "urine"],
  ["Biophysical profile", "bpp"],
];

const formatVital = (key, value) => (key === "fhr" && /^\d+$/.test(value || "") ? `${value} bpm` : value);

const ReferralDetails = () => {
  const { id } = useParams();
  const { getReferralById, role, setActiveReferralId } = useReferrals();

  const referral = getReferralById(id);

  if (!referral) {
    return (
      <Page width="md">
        <PageHeader title="Referral not found" />
        <p className="text-ink-muted text-sm">
          There is no referral with ID{" "}
          <code className="px-1.5 py-0.5 rounded bg-subtle text-ink font-mono text-xs">{id || "unknown"}</code>.
        </p>
        <Button as={Link} to={getRoleDefinition(role).homePath} variant="primary">
          Back to my workspace
        </Button>
      </Page>
    );
  }

  const arrived = hasArrivedAtFacility(referral);
  const vitals = referral.referralType === PatientType.CHILD ? childVitals : maternalVitals;
  const history = (referral.timeline || []).slice().reverse();
  const plan = referral.followUpPlan;
  const outcome = referral.clinicalOutcome;

  return (
    <Page width="md">
      <div className="space-y-2">
        <PageHeader
          title={referral.patientName}
          subtitle={[referral.age, referral.id].filter(Boolean).join(" · ")}
          actions={
            <Badge tone={isHighAcuity(referral.priority) ? "danger" : "neutral"} className="uppercase">
              {referral.priority}
            </Badge>
          }
        />
        <p className="text-sm text-ink">{referral.condition || referral.reason}</p>
        <p className="text-sm text-ink-muted">
          {referral.fromFacility} → <span className="font-semibold text-accent">{getDestination(referral)}</span>
        </p>
      </div>

      <Card as="section" title={getJourneyHeadline(referral)} className="space-y-4">
        <ol className="flex flex-wrap gap-2">
          {getReferralJourney(referral).map((step) => {
            const done = step.state === JourneyState.DONE;
            const atRisk = step.state === JourneyState.AT_RISK;
            return (
              <li key={step.id}>
                <Badge tone={done ? "accent" : atRisk ? "danger" : "neutral"}>
                  {step.label}
                  <span className="sr-only"> ({done ? "done" : atRisk ? "at risk" : "not yet"})</span>
                </Badge>
              </li>
            );
          })}
        </ol>

        {referral.arrival ? (
          <p className="text-sm text-ink-muted">
            Confirmed by {referral.arrival.verifiedBy}
            {referral.arrival.room ? `, ${referral.arrival.room}` : ""}
            {referral.arrival.arrivedAt ? `, ${new Date(referral.arrival.arrivedAt).toLocaleTimeString()}` : ""}.{" "}
            {referral.arrival.notes}
          </p>
        ) : (
          !arrived &&
          (role === Role.FACILITY ? (
            <Button as={Link} to="/facility" variant="primary">
              Go to intake
            </Button>
          ) : (
            <p className="text-sm text-ink-muted">
              {isFloating(referral)
                ? referral.patientChoice?.elsewhere
                  ? `The patient plans to go to ${referral.patientChoice.elsewhere}.`
                  : "Waiting for the patient to choose a hospital."
                : "Only the hospital can confirm arrival."}
            </p>
          ))
        )}
      </Card>

      {outcome && (
        <Card as="section" title="Outcome" className="space-y-1">
          <p className="text-sm text-ink">
            {outcome.clinicianName}: <span className="font-semibold text-accent">{outcome.disposition}</span>
          </p>
          <p className="text-sm text-ink-muted">{outcome.clinicalNotes}</p>
        </Card>
      )}

      {plan && (
        <Card as="section" className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-ink">
            <span className="font-bold text-ink">42-day follow-up:</span> {plan.tasks.length} visits, led by{" "}
            {plan.leadWorker}.
          </p>
          {isRouteAllowedForRole(role, "/continuity") && (
            <Button
              as={Link}
              to="/continuity"
              variant="link"
              size="sm"
              onClick={() => setActiveReferralId(referral.id)}
            >
              See schedule
            </Button>
          )}
        </Card>
      )}

      <Card as="details">
        <summary className="cursor-pointer text-sm font-semibold text-ink">Vitals</summary>
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {vitals.map(([label, key]) => {
            const value = formatVital(key, referral.vitals?.[key]);
            return (
              <div key={key} className="min-w-0">
                <dt className="text-xs text-ink-muted">{label}</dt>
                <dd className="font-semibold text-ink break-words tabular-nums">
                  {value || <span className="text-xs font-medium text-ink-muted">Not recorded</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      </Card>

      <Card as="details">
        <summary className="cursor-pointer text-sm font-semibold text-ink">History</summary>
        <ul className="mt-3 space-y-2">
          {history.map((t) => (
            <li key={`${t.date}-${t.status}-${t.notes}`} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="font-semibold text-ink">{t.status.replace(/_/g, " ")}</span>
                <span className="block text-ink-muted">{t.notes}</span>
              </span>
              <span className="text-xs text-ink-muted shrink-0 tabular-nums">
                {new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-sm text-ink-muted">
        Navigator: {referral.navigator?.name || "Priya Raman, MSW"} · {referral.navigator?.phone || "+91 90000 21049"}
      </p>
    </Page>
  );
};

export default ReferralDetails;
