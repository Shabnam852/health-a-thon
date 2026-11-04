import { useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Dialog from "../components/Dialog.jsx";
import HandoffCard from "../components/HandoffCard.jsx";
import { Badge, Button, Card, Icon, Page, PageHeader, Pictogram } from "../components/ui/index.js";
import { getRoleDefinition, isRouteAllowedForRole } from "../config/navigationConfig.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { isHighAcuity, PatientType, Role } from "../domain/enums.js";
import { getJourneyHeadline, getReferralJourney, JourneyState } from "../domain/landing.js";
import { getDestination, hasArrivedAtFacility, isFloating } from "../domain/workflow.js";

const childVitals = [
  ["Bilirubin", "tsb", "blood-test"],
  ["Weight", "weight", "weight"],
  ["Temperature", "temp", "temperature"],
  ["Heart rate", "hr", "heart"],
];
const maternalVitals = [
  ["Blood pressure", "bp", "blood-pressure"],
  ["Fetal heart rate", "fhr", "heart"],
  ["Urine protein", "urine", "urine"],
  ["Biophysical profile", "bpp", "scan"],
];

// The patient's picture, by who is being referred.
const PATIENT_PICTOGRAM = {
  [PatientType.MATERNAL]: "pregnant",
  [PatientType.CHILD]: "baby",
  [PatientType.DYAD]: "mother-baby",
};

// One picture per step of the journey, so its progress reads at a glance.
const STEP_PICTOGRAM = {
  sent: "referral",
  acknowledged: "doctor",
  transport: "van",
  arrived: "hospital",
  "follow-up": "calendar",
};
const STEP_STATE = {
  [JourneyState.DONE]: { text: "Done", tone: "accent" },
  [JourneyState.ACTIVE]: { text: "Now", tone: "ink" },
  [JourneyState.AT_RISK]: { text: "Needs help", tone: "danger" },
  [JourneyState.UPCOMING]: { text: "Not yet", tone: "neutral" },
};

// The newest updates shown on the page; the rest open in a dialog, so the page never scrolls.
const HISTORY_SHOWN = 3;

const HistoryList = ({ items }) => (
  <ul className="space-y-2.5">
    {items.map((t) => (
      <li key={`${t.date}-${t.status}-${t.notes}`} className="flex items-start justify-between gap-3 text-sm">
        <span className="min-w-0">
          <span className="font-semibold text-ink">{t.status.replace(/_/g, " ")}</span>
          <span className="block text-ink-muted line-clamp-1">{t.notes}</span>
        </span>
        <span className="text-xs text-ink-muted shrink-0 tabular-nums">
          {new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </li>
    ))}
  </ul>
);

const formatVital = (key, value) => (key === "fhr" && /^\d+$/.test(value || "") ? `${value} bpm` : value);

const ReferralDetails = () => {
  const { id } = useParams();
  // Set by the new-referral form, so the case it opens says the referral went out.
  const sentTo = useLocation().state?.sentTo;
  const { getReferralById, role, setActiveReferralId } = useReferrals();
  const [showAllHistory, setShowAllHistory] = useState(false);

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
  const showHandoff = role !== Role.PATIENT;

  const latest = history.slice(0, HISTORY_SHOWN);

  return (
    // On a desktop the whole case fits one screen: no page scroll. Narrow or short screens still scroll.
    <Page
      width="full"
      className="max-w-7xl lg:h-[calc(100dvh-var(--size-header))] lg:flex lg:flex-col lg:!space-y-4 lg:!py-5"
    >
      {sentTo && (
        <div role="status" className="flex items-start gap-3 rounded-card border-l-4 border-accent bg-accent-soft p-3">
          <Icon name="check_circle" className="text-accent mt-0.5" />
          <p className="text-sm text-ink">
            <strong>Referral sent.</strong> {sentTo} has the referral. Case ID <strong>{referral.id}</strong>.
          </p>
        </div>
      )}
      <div className="flex items-start gap-4">
        <Pictogram
          name={PATIENT_PICTOGRAM[referral.referralType] || "pregnant"}
          size="lg"
          className="hidden sm:inline-flex"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <PageHeader
            title={referral.patientName}
            subtitle={[referral.age, referral.id].filter(Boolean).join(" · ")}
            actions={
              <Badge tone={isHighAcuity(referral.priority) ? "danger" : "neutral"} className="uppercase">
                {referral.priority}
              </Badge>
            }
          />
          <p className="text-sm text-ink">
            {referral.condition || referral.reason}
            <span className="text-ink-muted">
              {" · "}
              {referral.fromFacility} → <span className="font-semibold text-accent">{getDestination(referral)}</span>
            </span>
          </p>
          <p className="text-sm text-ink-muted truncate">
            {plan && (
              <>
                <span className="font-semibold text-ink">42-day follow-up:</span> {plan.tasks.length} visits, led by{" "}
                {plan.leadWorker}
                {isRouteAllowedForRole(role, "/continuity") && (
                  <>
                    {" "}
                    (
                    <Link
                      to="/continuity"
                      onClick={() => setActiveReferralId(referral.id)}
                      className="font-semibold text-accent underline"
                    >
                      see schedule
                    </Link>
                    )
                  </>
                )}
                {" · "}
              </>
            )}
            Navigator: {referral.navigator?.name || "Priya Raman, MSW"} ·{" "}
            {referral.navigator?.phone || "+91 90000 21049"}
          </p>
        </div>
      </div>

      <div
        className={`grid grid-cols-1 gap-4 lg:flex-1 lg:min-h-0 ${showHandoff ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)]" : ""}`}
      >
        <div className="flex flex-col gap-4 min-w-0">
          <Card as="section" className="space-y-3 sm:!p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-semibold text-ink">{getJourneyHeadline(referral)}</h2>
              {!referral.arrival && !arrived && role === Role.FACILITY && (
                <Button as={Link} to="/facility" variant="primary" size="sm">
                  Go to intake
                </Button>
              )}
            </div>
            <ol className="grid grid-cols-5 gap-1.5">
              {getReferralJourney(referral).map((step) => {
                const state = STEP_STATE[step.state] || STEP_STATE[JourneyState.UPCOMING];
                return (
                  <li
                    key={step.id}
                    className={`flex flex-col items-center gap-1 rounded-card border px-1 py-2 text-center ${step.state === JourneyState.ACTIVE ? "border-accent" : step.state === JourneyState.AT_RISK ? "border-danger" : "border-line"}`}
                  >
                    <Pictogram name={STEP_PICTOGRAM[step.id] || "check"} bare size="sm" tone={state.tone} />
                    <span className="min-w-0 w-full">
                      <span className="block text-xs font-semibold leading-tight text-ink hyphens-auto" lang="en">
                        {step.label}
                      </span>
                      <span
                        className={`block text-xs font-semibold ${step.state === JourneyState.AT_RISK ? "text-danger" : step.state === JourneyState.DONE ? "text-accent" : "text-ink-muted"}`}
                      >
                        {state.text}
                      </span>
                    </span>
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
              role !== Role.FACILITY && (
                <p className="text-sm text-ink-muted">
                  {isFloating(referral)
                    ? referral.patientChoice?.elsewhere
                      ? `The patient plans to go to ${referral.patientChoice.elsewhere}.`
                      : "Waiting for the patient to choose a hospital."
                    : "Only the hospital can confirm arrival."}
                </p>
              )
            )}
          </Card>
          <Card as="section" className="sm:!p-4">
            <h2 className="font-display text-lg font-semibold text-ink mb-3">Vitals</h2>
            <dl className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4 gap-3">
              {vitals.map(([label, key, pictogram]) => {
                const value = formatVital(key, referral.vitals?.[key]);
                return (
                  <div key={key} className="flex min-w-0 items-start gap-2">
                    <Pictogram name={pictogram} bare size="sm" tone={value ? "accent" : "neutral"} />
                    <div className="min-w-0">
                      <dt className="text-xs text-ink-muted">{label}</dt>
                      <dd className="font-semibold text-ink tabular-nums">
                        {value || <span className="text-xs font-medium text-ink-muted">Not recorded</span>}
                      </dd>
                    </div>
                  </div>
                );
              })}
            </dl>
          </Card>

          {outcome && (
            <Card as="section" className="space-y-1 sm:!p-5">
              <h2 className="font-display text-lg font-semibold text-ink">Outcome</h2>
              <p className="text-sm text-ink">
                {outcome.clinicianName}: <span className="font-semibold text-accent">{outcome.disposition}</span>
              </p>
              <p className="text-sm text-ink-muted">{outcome.clinicalNotes}</p>
            </Card>
          )}

          {/* Fills the rest of the column, so both columns end at the same line. */}
          <Card as="section" className="sm:!p-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-lg font-semibold text-ink">History</h2>
              {history.length > HISTORY_SHOWN && (
                <Button size="sm" variant="link" onClick={() => setShowAllHistory(true)}>
                  See all {history.length}
                </Button>
              )}
            </div>
            <HistoryList items={latest} />
          </Card>
        </div>

        {/* For staff only: the family has their own screens. */}
        {showHandoff && (
          <div className="min-w-0 flex flex-col lg:min-h-0">
            {/* A long draft scrolls inside its card, never the page. */}
            <HandoffCard referral={referral} className="sm:!p-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto" />
          </div>
        )}
      </div>

      {showAllHistory && (
        <Dialog title="History" onClose={() => setShowAllHistory(false)}>
          <HistoryList items={history} />
          <Button fullWidth onClick={() => setShowAllHistory(false)}>
            Close
          </Button>
        </Dialog>
      )}
    </Page>
  );
};

export default ReferralDetails;
