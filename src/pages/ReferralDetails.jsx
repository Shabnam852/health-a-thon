import { useState } from "react";
import { Link, useLocation, useParams } from "react-router";
import PastRecordsCard from "../components/abdm/PastRecordsCard.jsx";
import Dialog from "../components/Dialog.jsx";
import HandoffCard from "../components/HandoffCard.jsx";
import ReferralSlipDialog from "../components/ReferralSlip.jsx";
import { enumLabel, priorityLabel } from "../components/referralColumns.jsx";
import { Badge, Button, Card, Icon, Page, PageHeader, Pictogram } from "../components/ui/index.js";
import { getRoleDefinition, isRouteAllowedForRole } from "../config/navigationConfig.js";
import { useAbdm } from "../context/AbdmContext.jsx";
import { useReferrals } from "../context/ReferralContext.jsx";
import { isHighAcuity, PatientType, Role } from "../domain/enums.js";
import {
  ARRIVAL_REPORTED_LABEL,
  CALL_BACK_LABEL,
  hasOpenCallBack,
  isArrivalReportedOnly,
} from "../domain/familyRequests.js";
import { buildReferralBundle, fhirExportFileName } from "../domain/fhirExport.js";
import { getJourneyHeadline, getReferralJourney, JourneyState } from "../domain/landing.js";
import { messagesForReferral, SMS_EVENT_LABELS } from "../domain/smsTemplates.js";
import { getDestination, hasArrivedAtFacility, isFloating } from "../domain/workflow.js";

// The vitals each patient is expected to have. Shown even when missing, so a gap reads as "Not recorded".
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
// Other vitals a referral can carry. Anything recorded is shown, so nothing measured is hidden.
const extraVitals = {
  membranes: ["Membranes", "pregnant", "mother"],
  infantWeight: ["Baby's weight", "weight", "baby"],
  infantTemp: ["Baby's temperature", "temperature", "baby"],
  infantHr: ["Baby's heart rate", "heart", "baby"],
};
const babyKeys = new Set(childVitals.map(([, key]) => key));
const motherKeys = new Set(maternalVitals.map(([, key]) => key));

// "infantWeight" -> "Infant weight", for a vital this screen has no name for yet.
const keyLabel = (key) => {
  const words = key.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Every vital to show, grouped by mother and baby. Status flags (bpStatus) are not vitals. */
const getVitalGroups = (referral) => {
  const recorded = referral.vitals || {};
  const type = referral.referralType;
  const mother = type === PatientType.CHILD ? [] : [...maternalVitals];
  const baby = type === PatientType.MATERNAL ? [] : [...childVitals];
  const known = new Set([...mother, ...baby].map(([, key]) => key));
  for (const [key, value] of Object.entries(recorded)) {
    if (known.has(key) || key.endsWith("Status") || value == null || value === "") continue;
    const extra = extraVitals[key];
    const group =
      extra?.[2] ??
      (babyKeys.has(key) || /^(infant|baby|newborn)/i.test(key)
        ? "baby"
        : motherKeys.has(key) || type !== PatientType.CHILD
          ? "mother"
          : "baby");
    const row = [extra?.[0] ?? keyLabel(key), key, extra?.[1] ?? "clipboard"];
    (group === "baby" ? baby : mother).push(row);
  }
  return [
    { id: "mother", title: "Mother", vitals: mother },
    { id: "baby", title: "Baby", vitals: baby },
  ].filter((g) => g.vitals.length > 0);
};

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
// The phone stepper's circle: filled with a tick when done, a ring for now, empty for later.
const STEP_DOT = {
  [JourneyState.DONE]: "bg-accent text-on-fill",
  [JourneyState.ACTIVE]: "border-2 border-accent bg-surface",
  [JourneyState.AT_RISK]: "border-2 border-danger bg-surface text-danger",
  [JourneyState.UPCOMING]: "border-2 border-line-strong bg-surface",
};
const STEP_STATE = {
  [JourneyState.DONE]: { text: "Done", tone: "accent" },
  [JourneyState.ACTIVE]: { text: "Now", tone: "ink" },
  [JourneyState.AT_RISK]: { text: "Needs help", tone: "danger" },
  [JourneyState.UPCOMING]: { text: "Not yet", tone: "neutral" },
};

// The newest updates shown on the page; the rest open in a dialog, so the page never scrolls.
const HISTORY_SHOWN = 3;

// Long notes are cut to one line on the page; "full" shows every word (the History dialog).
const NOTE_CLAMP = 40;
const isClamped = (t) => (t.notes || "").length > NOTE_CLAMP;

const HistoryList = ({ items, full = false }) => (
  <ul className="space-y-2.5">
    {items.map((t) => (
      <li key={`${t.date}-${t.status}-${t.notes}`} className="flex items-start justify-between gap-3 text-sm">
        <span className="min-w-0">
          <span className="font-semibold text-ink">{enumLabel(t.status)}</span>
          <span className={`block text-ink-muted break-words ${full ? "" : "line-clamp-1"}`}>{t.notes}</span>
        </span>
        <span className="text-xs text-ink-muted shrink-0 tabular-nums">
          {new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </li>
    ))}
  </ul>
);

// The newest texts to the family shown on the page; the rest open in a dialog.
const MESSAGES_SHOWN = 2;

const MessageList = ({ items }) => (
  <ul className="space-y-3">
    {items.map((m) => (
      <li key={m.id} className="space-y-1 text-sm">
        <span className="flex items-start justify-between gap-3">
          <span className="font-semibold text-ink">{SMS_EVENT_LABELS[m.event] || "Status update"}</span>
          <span className="text-xs text-ink-muted shrink-0 tabular-nums">
            {new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </span>
        <span className="block text-ink-muted break-words">{m.body}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
          <Badge>{m.templateId}</Badge>
          <span>Simulated, not sent</span>
          <span>To {m.to}</span>
        </span>
      </li>
    ))}
  </ul>
);

// Saves the referral as a FHIR R4 file, built here in the browser. Nothing is sent anywhere.
const downloadFhir = (referral, { facilities, abhaLink }) => {
  const bundle = buildReferralBundle(referral, { facilities, abhaLink, now: new Date().toISOString() });
  const url = URL.createObjectURL(new Blob([JSON.stringify(bundle, null, 2)], { type: "application/fhir+json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fhirExportFileName(referral);
  document.body.append(link);
  link.click();
  link.remove();
  // After the click has handed the file to the browser; Safari can drop it if revoked in the same task.
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

const clockTime = (iso) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// What the family told the team that is still open. Kept apart from confirmed facts, and labelled as such.
const FamilyNote = ({ icon, children }) => (
  <p className="flex items-start gap-2 rounded-card border-l-4 border-line-strong bg-muted p-3 text-sm text-ink break-words">
    <Icon name={icon} className="text-ink-muted mt-0.5 shrink-0" />
    <span className="min-w-0">{children}</span>
  </p>
);

const formatVital = (key, value) => (key === "fhr" && /^\d+$/.test(value || "") ? `${value} bpm` : value);

const ReferralDetails = () => {
  const { id } = useParams();
  // Set by the new-referral form, so the case it opens says the referral went out.
  const sentTo = useLocation().state?.sentTo;
  const { facilities, getReferralById, messages, role, setActiveReferralId } = useReferrals();
  const { abhaFor } = useAbdm();
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [showAllMessages, setShowAllMessages] = useState(false);
  const [showSlip, setShowSlip] = useState(false);

  const referral = getReferralById(id);

  if (!referral) {
    return (
      <Page width="md">
        <PageHeader title="Referral not found" />
        <p className="text-ink-muted text-sm">
          There is no referral with ID{" "}
          <code className="px-1.5 py-0.5 rounded-sm bg-subtle text-ink font-mono text-xs">{id || "unknown"}</code>.
        </p>
        <Button as={Link} to={getRoleDefinition(role).homePath} variant="primary">
          Back to my workspace
        </Button>
      </Page>
    );
  }

  const arrived = hasArrivedAtFacility(referral);
  const vitalGroups = getVitalGroups(referral);
  const journey = getReferralJourney(referral);
  const history = (referral.timeline || []).slice().reverse();
  const plan = referral.followUpPlan;
  const outcome = referral.clinicalOutcome;
  const showHandoff = role !== Role.PATIENT;

  const latest = history.slice(0, HISTORY_SHOWN);
  const canExpandHistory = history.length > HISTORY_SHOWN || latest.some(isClamped);
  const texts = messagesForReferral(messages, referral.id);

  return (
    // On a desktop the whole case fits one screen: no page scroll. Narrow or short screens still scroll.
    <Page width="full" className="lg:h-[calc(100dvh-var(--size-header))] lg:flex lg:flex-col">
      {sentTo && (
        <div role="status" className="flex items-start gap-3 rounded-card border-l-4 border-accent bg-accent-soft p-3">
          <Icon name="check_circle" className="text-accent mt-0.5" />
          <p className="text-sm text-ink break-words">
            <strong>Referral sent.</strong> {sentTo} has the referral. Case ID <strong>{referral.id}</strong>.
          </p>
        </div>
      )}
      <div className="flex items-start gap-4">
        {/* On the right, so the title starts where every other screen's title starts. */}
        <Pictogram
          name={PATIENT_PICTOGRAM[referral.referralType] || "pregnant"}
          size="lg"
          className="max-sm:hidden order-last"
        />
        <div className="min-w-0 flex-1 space-y-1">
          <PageHeader
            title={referral.patientName}
            subtitle={[referral.age, referral.id].filter(Boolean).join(" · ")}
            actions={
              <>
                <Badge tone={isHighAcuity(referral.priority) ? "danger" : "neutral"}>
                  {priorityLabel(referral.priority)}
                </Badge>
                {/* Staff hand the slip to the family; the family has their own screens. */}
                {/* On phones only the icon shows, so the patient's name keeps the room. */}
                {showHandoff && (
                  <Button size="sm" onClick={() => setShowSlip(true)} className="max-sm:px-2.5">
                    <Icon name="qr_code_2" />
                    <span className="max-sm:sr-only">Referral slip</span>
                  </Button>
                )}
                {/* Staff only: the file holds the full clinical handover. */}
                {showHandoff && (
                  <Button
                    size="sm"
                    aria-label="Download FHIR file"
                    title="Download this referral as a FHIR R4 file"
                    onClick={() => downloadFhir(referral, { facilities, abhaLink: abhaFor(referral.id) })}
                    className="max-sm:px-2.5"
                  >
                    <Icon name="download" size="sm" />
                    <span className="max-sm:hidden">Download FHIR</span>
                  </Button>
                )}
              </>
            }
          />
          <p className="text-sm text-ink break-words">
            {referral.condition || referral.reason}
            <span className="text-ink-muted">
              {" · "}
              {referral.fromFacility} → <span className="font-semibold text-accent">{getDestination(referral)}</span>
            </span>
          </p>
          <p className="text-sm text-ink-muted break-words">
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
            {/* Phones: the standard vertical stepper, so each step's words get the full width. */}
            <ol className="sm:hidden">
              {journey.map((step, i) => {
                const state = STEP_STATE[step.state] || STEP_STATE[JourneyState.UPCOMING];
                const last = i === journey.length - 1;
                return (
                  <li key={step.id} className="flex gap-3">
                    <div className="flex flex-col items-center" aria-hidden="true">
                      <span
                        className={`w-6 h-6 shrink-0 rounded-full inline-flex items-center justify-center ${STEP_DOT[step.state] || STEP_DOT[JourneyState.UPCOMING]}`}
                      >
                        {step.state === JourneyState.DONE && <Icon name="check" size="sm" />}
                        {step.state === JourneyState.AT_RISK && <Icon name="priority_high" size="sm" />}
                      </span>
                      {!last && <span className="w-px flex-1 min-h-4 bg-line-strong" />}
                    </div>
                    <p className={`min-w-0 text-sm ${last ? "" : "pb-3"}`}>
                      <span className="font-semibold text-ink">{step.label}</span>
                      <span
                        className={`block text-xs font-semibold ${step.state === JourneyState.AT_RISK ? "text-danger" : step.state === JourneyState.DONE ? "text-accent" : "text-ink-muted"}`}
                      >
                        {state.text}
                      </span>
                    </p>
                  </li>
                );
              })}
            </ol>
            <ol className="max-sm:hidden grid grid-cols-5 gap-1.5">
              {journey.map((step) => {
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

            {isArrivalReportedOnly(referral) && (
              <FamilyNote icon="where_to_vote">
                <strong>{ARRIVAL_REPORTED_LABEL}.</strong> Reported at {clockTime(referral.arrivalReport.reportedAt)}
                {referral.arrivalReport.place ? `, at ${referral.arrivalReport.place}` : ""}.
                {role === Role.FACILITY && " Confirm arrival at intake once the patient is at reception."}
              </FamilyNote>
            )}
            {hasOpenCallBack(referral) && (
              <FamilyNote icon="phone_callback">
                <strong>{CALL_BACK_LABEL}.</strong> Asked at {clockTime(referral.callBackRequest.requestedAt)}
                {referral.callBackRequest.reason ? `: "${referral.callBackRequest.reason}"` : "."}
              </FamilyNote>
            )}
            {referral.arrival ? (
              <p className="text-sm text-ink-muted break-words">
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
            <div className="space-y-4">
              {vitalGroups.map((group) => (
                <div key={group.id}>
                  {/* Headings only when both mother and baby have vitals, so each value is clearly whose. */}
                  {vitalGroups.length > 1 && <h3 className="text-sm font-semibold text-ink mb-2">{group.title}</h3>}
                  <dl className="grid grid-cols-1 sm:grid-cols-4 lg:grid-cols-2 2xl:grid-cols-4 gap-3">
                    {group.vitals.map(([label, key, pictogram]) => {
                      const value = formatVital(key, referral.vitals?.[key]);
                      return (
                        <div key={key} className="flex min-w-0 items-start gap-2">
                          <Pictogram name={pictogram} bare size="sm" tone={value ? "accent" : "neutral"} />
                          <div className="min-w-0">
                            <dt className="text-xs text-ink-muted">{label}</dt>
                            <dd className="font-semibold text-ink tabular-nums break-words">
                              {value || <span className="text-xs font-medium text-ink-muted">Not recorded</span>}
                            </dd>
                          </div>
                        </div>
                      );
                    })}
                  </dl>
                </div>
              ))}
            </div>
          </Card>

          {outcome && (
            <Card as="section" className="space-y-1 sm:!p-5">
              <h2 className="font-display text-lg font-semibold text-ink">Outcome</h2>
              <p className="text-sm text-ink break-words">
                {outcome.clinicianName}: <span className="font-semibold text-accent">{outcome.disposition}</span>
              </p>
              <p className="text-sm text-ink-muted break-words">{outcome.clinicalNotes}</p>
            </Card>
          )}

          <Card as="section" className="sm:!p-4">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-lg font-semibold text-ink">Messages</h2>
              {texts.length > MESSAGES_SHOWN && (
                <Button size="sm" variant="link" onClick={() => setShowAllMessages(true)}>
                  See all {texts.length}
                </Button>
              )}
            </div>
            {texts.length > 0 ? (
              <MessageList items={texts.slice(0, MESSAGES_SHOWN)} />
            ) : (
              <p className="text-sm text-ink-muted">No texts yet. The family gets a text when the status changes.</p>
            )}
          </Card>

          {/* Fills the rest of the column, so both columns end at the same line. */}
          <Card as="section" className="sm:!p-4 lg:flex-1 lg:min-h-0 lg:overflow-hidden">
            <div className="flex items-center justify-between gap-2 mb-3">
              <h2 className="font-display text-lg font-semibold text-ink">History</h2>
              {canExpandHistory && (
                <Button size="sm" variant="link" onClick={() => setShowAllHistory(true)}>
                  {history.length > HISTORY_SHOWN ? `See all ${history.length}` : "See full notes"}
                </Button>
              )}
            </div>
            <HistoryList items={latest} />
          </Card>
        </div>

        {/* For staff only: the family has their own screens. */}
        {showHandoff && (
          <div className="min-w-0 flex flex-col gap-5 lg:min-h-0">
            <PastRecordsCard referral={referral} className="lg:max-h-[45%] lg:overflow-y-auto" />
            {/* A long draft scrolls inside its card, never the page. */}
            <HandoffCard referral={referral} className="sm:!p-4 lg:flex-1 lg:min-h-0 lg:overflow-y-auto" />
          </div>
        )}
      </div>

      {showSlip && <ReferralSlipDialog referral={referral} onClose={() => setShowSlip(false)} />}

      {showAllHistory && (
        <Dialog title="History" onClose={() => setShowAllHistory(false)}>
          <HistoryList items={history} full />
          <Button fullWidth onClick={() => setShowAllHistory(false)}>
            Close
          </Button>
        </Dialog>
      )}

      {showAllMessages && (
        <Dialog title="Messages" onClose={() => setShowAllMessages(false)}>
          <MessageList items={texts} />
          <Button fullWidth onClick={() => setShowAllMessages(false)}>
            Close
          </Button>
        </Dialog>
      )}
    </Page>
  );
};

export default ReferralDetails;
