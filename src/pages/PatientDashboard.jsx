import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ASSISTANT_PATH } from "../components/assistant/AssistantLauncher.jsx";
import ListenButton from "../components/assistant/ListenButton.jsx";
import { usePatientCase } from "../components/assistant/usePatientCase.js";
import HospitalChoice from "../components/HospitalChoice.jsx";
import HospitalMap from "../components/HospitalMap.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, Card, EmptyState, Field, Icon, Page, PageHeader, Pictogram, Select } from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { BRING_LIST, getScreenSummary } from "../domain/assistant.js";
import { telHref } from "../domain/contact.js";
import { TransportStatus, UrgencyLevel } from "../domain/enums.js";
import { getHospitalMap } from "../domain/hospitalMap.js";
import { getPatientJourney, RIDE_STAGES } from "../domain/patientJourney.js";
import { StorageAdapter } from "../services/storageAdapter.js";

const PATIENT_VIEWS = ["transit", "checklist", "support"];

// Matches BRING_LIST, item by item.
const BRING_PICTOGRAMS = ["id", "health-card", "medicines", "phone"];

// The checklist shows the same items the assistant reads out.
const CHECKLIST_ITEMS = BRING_LIST.map((text, index) => ({ id: index + 1, text, pictogram: BRING_PICTOGRAMS[index] }));

// A contact with no number in it would be a dead link, so show nothing.
const CallLink = ({ phone, children }) => {
  const href = telHref(phone);
  if (!href) return null;
  return (
    <Button as="a" href={href} variant="primary" className="w-full sm:w-auto">
      <Icon name="call" />
      {children}
    </Button>
  );
};

// A driver is only worth calling while the van is theirs for this patient: not after a failed or cancelled ride.
const DRIVER_STATUSES = [TransportStatus.ASSIGNED, TransportStatus.DISPATCHED, TransportStatus.PICKED_UP];

// A standard stepper: one status circle per step and a line joining them. Done is a filled circle
// with a tick, the current step a ring, later steps an empty circle. The words say the same thing.
const StepMarker = ({ done, now }) => (
  <span
    aria-hidden="true"
    className={`relative z-10 w-6 h-6 shrink-0 rounded-full flex items-center justify-center ${
      done
        ? "bg-accent text-on-fill"
        : now
          ? "border-2 border-accent bg-surface"
          : "border-2 border-line-strong bg-surface"
    }`}
  >
    {done ? <Icon name="check" size="sm" /> : now ? <span className="w-2.5 h-2.5 rounded-full bg-accent" /> : null}
  </span>
);

const StepList = ({ steps }) => (
  <ol>
    {steps.map((step, index) => {
      const isLast = index === steps.length - 1;
      return (
        <li
          key={step.label}
          aria-current={step.isNow ? "step" : undefined}
          className={`relative flex items-start gap-3 ${isLast ? "" : "pb-5"}`}
        >
          {!isLast && (
            <span
              aria-hidden="true"
              className={`absolute left-3 -translate-x-1/2 top-6 bottom-0 w-0.5 ${step.done ? "bg-accent" : "bg-line"}`}
            />
          )}
          <StepMarker done={step.done} now={Boolean(step.isNow)} />
          <span className="min-w-0 flex-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-sm leading-6">
            <span className={step.isNow ? "font-semibold text-ink" : step.done ? "text-ink" : "text-ink-muted"}>
              {step.label}
            </span>
            <span className={`text-xs font-semibold ${step.isNow ? "text-accent" : "text-ink-muted"}`}>
              {step.done ? "Done" : step.isNow || "Not yet"}
            </span>
          </span>
        </li>
      );
    })}
  </ol>
);

const DetailList = ({ rows }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
    {rows
      .filter(([, value]) => value)
      .map(([label, value]) => (
        <div key={label} className="p-3 rounded-card bg-muted">
          <dt className="text-xs text-ink-muted">{label}</dt>
          <dd className="font-semibold text-ink mt-0.5 break-words">{value}</dd>
        </div>
      ))}
  </dl>
);

const PatientDashboard = () => {
  const { referrals, setActiveReferralId, recordPatientChoice, recordPatientGoingElsewhere } = useReferrals();
  const { referral, facilities } = usePatientCase();
  const { toast, report } = useToast();
  const [searchParams] = useSearchParams();
  const [savedChecklists, setSavedChecklists] = useState(() => StorageAdapter.getChecklists());

  // Every hook is above, so an empty case list can bail out safely.
  if (!referral) {
    return (
      <Page width="md">
        <EmptyState pictogram="clipboard">There is no case to show yet.</EmptyState>
      </Page>
    );
  }

  const journey = getPatientJourney(referral, facilities);
  const { isChild, who, tr, nav, floating, hospital, hospitalPhone, isRideFailed } = journey;
  const { steps, nextStep, rideStage, rideSummary, showEta } = journey;
  // A newborn's page is read by the parent, so greet the parent and not "Baby".
  const greetedName = isChild ? referral?.caregiverName : referral?.patientName;
  const patientFirstName = greetedName?.split(" ")[0] || "there";

  const viewFromUrl = searchParams.get("view");
  const view = PATIENT_VIEWS.includes(viewFromUrl) ? viewFromUrl : "overview";

  const checklist = CHECKLIST_ITEMS.map((item) => ({
    ...item,
    checked: Boolean(savedChecklists[referral?.id]?.[item.id]),
  }));
  const packedCount = checklist.filter((item) => item.checked).length;

  const toggleChecklistItem = (id) => {
    const key = referral?.id;
    const next = {
      ...savedChecklists,
      [key]: { ...savedChecklists[key], [id]: !savedChecklists[key]?.[id] },
    };
    setSavedChecklists(next);
    StorageAdapter.saveChecklists(next);
  };

  const isArrivalConfirmed = journey.isArrivalConfirmed;
  const hospitalMap = getHospitalMap(referral, facilities);
  const listen = <ListenButton referral={referral} text={getScreenSummary(view, referral, facilities)} />;

  const finishChoice = (res, message) => report(res, message, "Something went wrong");

  const chooser = floating && (
    <Card title="Choose a hospital" className="space-y-4">
      <p className="text-sm text-ink">
        {referral.toFacility} can't take {who} right now. It's your choice where to go next.
      </p>
      <HospitalChoice
        referral={referral}
        onChoose={(name) =>
          finishChoice(recordPatientChoice(referral.id, name), `${name} has been told you're coming.`)
        }
        onElsewhere={(place) =>
          finishChoice(recordPatientGoingElsewhere(referral.id, place), `Saved. Give your case ID at ${place}.`)
        }
      />
    </Card>
  );

  const bring = (
    <>
      <div className="space-y-1">
        {checklist.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 py-3 px-2 rounded-control hover:bg-muted cursor-pointer text-sm text-ink"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={() => toggleChecklistItem(item.id)}
              className="w-5 h-5 rounded accent-control shrink-0"
            />
            <Pictogram name={item.pictogram} tone={item.checked ? "neutral" : "ink"} size="sm" bare />
            <span className={item.checked ? "line-through text-ink-muted" : ""}>{item.text}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        {packedCount} of {checklist.length} packed. At {hospital || "the hospital"}, give case ID{" "}
        <strong className="text-ink">{referral?.id}</strong> at the reception desk.
      </p>
    </>
  );

  return (
    <Page width="md">
      <Toast toast={toast} />
      <PageHeader
        title={`Hello, ${patientFirstName}`}
        actions={
          <Field label="Patient" className="w-full sm:w-auto sm:max-w-xs">
            <Select value={referral?.id} onChange={(e) => setActiveReferralId(e.target.value)}>
              {referrals.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.patientName}
                </option>
              ))}
            </Select>
          </Field>
        }
      />

      <section
        id="emergency"
        className="bg-danger-soft text-danger-strong rounded-card p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <p className="flex items-start gap-3 text-sm font-semibold">
          <Icon name="emergency" className="mt-0.5 shrink-0" />
          <span>
            {floating && referral.priority === UrgencyLevel.STAT
              ? "This is an emergency. Call 108 now, and choose a hospital after."
              : "Severe bleeding, vision changes, intense constant pain, or reduced baby movement? Do not wait."}
          </span>
        </p>
        {/* The label is long: let it wrap on the narrowest phones instead of overflowing. */}
        <Button as="a" href="tel:108" variant="danger" wrap className="shrink-0">
          <Icon name="call" />
          Call 108 (emergency services)
        </Button>
      </section>

      {view === "overview" && (
        <>
          {chooser || (
            <section className="rounded-card bg-brand text-on-fill p-5 sm:p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold">{rideSummary}</h2>
                  {showEta && <p className="text-lg font-semibold tabular-nums mt-1">Arrives in {tr.eta}</p>}
                </div>
                <Pictogram name={isArrivalConfirmed ? "hospital" : "van"} tone="on-fill" size="lg" className="-my-1" />
              </div>
              <p className="text-sm border-t border-on-fill/20 pt-3">
                <span className="font-semibold">Next:</span> {nextStep.next}
              </p>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {listen}
            <Button as={Link} to={ASSISTANT_PATH} size="sm" className="lg:hidden">
              <Icon name="support_agent" size="sm" />
              Ask a question
            </Button>
          </div>

          <Card title="Your journey">
            <StepList
              steps={steps.map((s) => ({
                ...s,
                isNow: s === nextStep && !s.done ? "Next" : "",
              }))}
            />
          </Card>
        </>
      )}

      {view === "transit" && (
        <>
          <section className="rounded-card bg-brand text-on-fill p-5 sm:p-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {showEta ? (
                <>
                  <p className="text-sm text-on-fill-muted">Arrives in</p>
                  <p className="font-display text-4xl font-semibold tabular-nums mt-1">{tr.eta}</p>
                </>
              ) : (
                <h2 className="font-display text-2xl font-bold">{rideSummary}</h2>
              )}
              <p className="text-sm text-on-fill-muted mt-2 break-words">{hospital || "No hospital chosen yet"}</p>
            </div>
            <Pictogram name="van" tone="on-fill" size="lg" />
          </section>

          <div>{listen}</div>

          {isRideFailed && (
            <p role="alert" className="p-4 rounded-card bg-danger-soft text-danger-strong text-sm">
              <strong>Your ride had a problem.</strong> {tr.failedReason} Your care navigator is arranging another one.
            </p>
          )}

          {chooser ||
            (hospitalMap ? (
              <HospitalMap map={hospitalMap} />
            ) : (
              <EmptyState pictogram="route">
                The way to the hospital will appear here once a hospital is confirmed.
              </EmptyState>
            ))}

          {!tr && !isArrivalConfirmed ? (
            <EmptyState pictogram="van">If you need a free ride, your care navigator will arrange it.</EmptyState>
          ) : (
            <Card title="Progress">
              <StepList
                steps={RIDE_STAGES.map((label, index) => ({
                  label,
                  done: index < rideStage,
                  isNow: index === rideStage - 1 && !isRideFailed ? "Now" : "",
                }))}
              />
            </Card>
          )}

          {tr?.driver && DRIVER_STATUSES.includes(tr.status) && !isArrivalConfirmed && (
            <Card title="Your driver" className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="w-12 h-12 shrink-0 rounded-full bg-subtle-strong text-ink flex items-center justify-center text-lg font-bold"
                >
                  {tr.driver[0]}
                </span>
                <div className="min-w-0">
                  <p className="font-bold text-ink break-words">{tr.driver}</p>
                  {tr.vehicle && <p className="text-xs text-ink-muted break-words">{tr.vehicle}</p>}
                </div>
              </div>
              {tr.driverPhone && <CallLink phone={tr.driverPhone}>Call driver</CallLink>}
            </Card>
          )}

          {tr && (
            <Card title="Trip" className="space-y-3">
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Icon name="home" className="text-ink-muted mt-0.5" />
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">From</dt>
                    <dd className="font-semibold text-ink break-words">
                      {tr.pickupAddress || referral?.patientAddress}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="local_hospital" className="text-ink-muted mt-0.5" />
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">To</dt>
                    <dd className="font-semibold text-ink break-words">{hospital || "Not chosen yet"}</dd>
                  </div>
                </div>
              </dl>
              <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Icon name="check_circle" />
                This ride is free
              </p>
            </Card>
          )}
        </>
      )}

      {view === "checklist" && (
        <Card title="What to bring" className="space-y-3">
          {listen}
          {bring}
        </Card>
      )}

      {view === "support" && (
        <>
          <Card title="Ask about your visit" className="space-y-3">
            <p className="text-sm text-ink">
              Type or speak a question in your language, and hear the answer. It knows your ride, hospital and next
              steps. It can't give medical advice.
            </p>
            <p className="flex items-start gap-2 text-sm text-ink">
              <Icon name="forward_to_inbox" className="text-accent shrink-0" />
              <span>
                <strong>Something stopping you from getting to the hospital?</strong> Tell it here, like no money for
                the bus or no one to mind the children. Your care navigator will be told and will call you.
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button as={Link} to={ASSISTANT_PATH} variant="primary">
                <Icon name="support_agent" />
                Ask a question
              </Button>
              {listen}
            </div>
          </Card>
          {nav && (
            <Card title="Your care navigator" className="space-y-3">
              <div className="flex items-center gap-3">
                <img
                  className="w-12 h-12 rounded-full object-cover shrink-0"
                  alt=""
                  src={nav.avatar || "/images/avatar-priya-raman.svg"}
                />
                <div className="min-w-0">
                  <p className="font-bold text-ink">{nav.name}</p>
                  <p className="text-xs text-ink-muted">Here for rides, childcare and language help.</p>
                </div>
              </div>
              {nav.phone && <CallLink phone={nav.phone}>Call {nav.phone}</CallLink>}
            </Card>
          )}
          <Card title="Your hospital">
            <DetailList
              rows={[
                ["Hospital", hospital || "Not chosen yet"],
                ["Hospital phone", hospitalPhone],
                ["Your language", referral?.language],
                ["Interpreter", referral?.interpreterNeeded ? "Requested for your visit" : "Not requested"],
              ]}
            />
          </Card>
        </>
      )}
    </Page>
  );
};

export default PatientDashboard;
