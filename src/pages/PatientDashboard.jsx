import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import HospitalChoice from "../components/HospitalChoice.jsx";
import HospitalMap from "../components/HospitalMap.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Badge, Button, Card, EmptyState, Field, Icon, Page, PageHeader, Select } from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { telHref } from "../domain/contact.js";
import { PatientType, ReferralStatus, TransportStatus, UrgencyLevel } from "../domain/enums.js";
import { getHospitalMap } from "../domain/hospitalMap.js";
import { hasArrivedAtFacility, isFloating, isRideMoving } from "../domain/workflow.js";
import { StorageAdapter } from "../services/storageAdapter.js";

const PATIENT_VIEWS = ["transit", "checklist", "support"];

// How far along the ride is, for the stages on the ride screen.
const RIDE_STAGES = ["Ride requested", "Ride on the way", "Picked up", "Arrived at hospital"];
const RIDE_STAGE_BY_STATUS = {
  [TransportStatus.REQUESTED]: 1,
  [TransportStatus.ASSIGNED]: 1,
  [TransportStatus.DISPATCHED]: 2,
  [TransportStatus.PICKED_UP]: 3,
  [TransportStatus.ARRIVED]: 4,
};

const CHECKLIST_ITEMS = [
  { id: 1, text: "Photo ID (Aadhaar, Voter ID or Passport)" },
  { id: 2, text: "Health card (Ayushman Bharat or ABHA), if you have one" },
  { id: 3, text: "Mother and baby (MCP) card, and any medicines" },
  { id: 4, text: "Slippers and a phone charger" },
];

const CallLink = ({ phone, children }) => (
  <Button as="a" href={telHref(phone)} variant="primary" className="w-full sm:w-auto">
    <Icon name="call" />
    {children}
  </Button>
);

const StepList = ({ steps }) => (
  <ol>
    {steps.map((step, index) => {
      const isLast = index === steps.length - 1;
      const nextIsDone = steps[index + 1]?.done;
      return (
        <li
          key={step.label}
          aria-current={step.isNow ? "step" : undefined}
          className={`relative flex items-center gap-3 ${isLast ? "" : "pb-5"}`}
        >
          {!isLast && (
            <span
              aria-hidden="true"
              className={`absolute left-3.5 -translate-x-1/2 top-7 bottom-0 w-0.5 ${nextIsDone ? "bg-accent" : "bg-subtle"}`}
            />
          )}
          <span
            className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${step.done ? "bg-accent text-on-fill" : "bg-subtle"}`}
          >
            <Icon name={step.done ? "check" : ""} size="sm" />
          </span>
          <span
            className={`text-sm ${step.isNow ? "font-semibold text-ink" : step.done ? "text-ink" : "text-ink-muted"}`}
          >
            {step.label}
            <span className="sr-only">{step.done ? " (done)" : " (not yet)"}</span>
          </span>
          {step.isNow && (
            <Badge tone="highlight" className="ml-auto">
              {step.isNow}
            </Badge>
          )}
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
  const {
    referrals,
    facilities,
    activeReferralId,
    setActiveReferralId,
    recordPatientChoice,
    recordPatientGoingElsewhere,
  } = useReferrals();
  const { toast, report } = useToast();
  const [searchParams] = useSearchParams();

  const referral =
    referrals.find((r) => r.id === activeReferralId) ||
    referrals.find((r) => r.patientName?.includes("Fathima")) ||
    referrals[0];

  // A newborn's page is read by the parent, so greet the parent and not "Baby".
  const isChild = referral?.referralType === PatientType.CHILD;
  const greetedName = isChild ? referral?.caregiverName : referral?.patientName;
  const patientFirstName = greetedName?.split(" ")[0] || "there";
  const tr = referral?.transit;
  const nav = referral?.navigator;
  const floating = referral ? isFloating(referral) : false;
  // A hospital that declined is not where the patient is going.
  const hospital = floating ? null : referral?.toFacility;
  const hospitalPhone = facilities.find((f) => f.name === hospital)?.phone;

  const viewFromUrl = searchParams.get("view");
  const view = PATIENT_VIEWS.includes(viewFromUrl) ? viewFromUrl : "overview";

  const [savedChecklists, setSavedChecklists] = useState(() => StorageAdapter.getChecklists());
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

  // Progress comes from the real referral and ride status.
  const status = referral?.status;
  const isArrivalConfirmed = referral ? hasArrivedAtFacility(referral) : false;
  const isTransitActive = isRideMoving(tr);
  const hasOwnTransport = !tr && !referral?.transitBarrier;
  const isRideFailed = tr?.status === TransportStatus.FAILED && !isArrivalConfirmed;
  const hospitalMap = getHospitalMap(referral, facilities);
  const who = isChild ? "your baby" : "you";

  const steps = [
    {
      label: "Doctor sent the referral",
      done: status !== ReferralStatus.CREATED,
      next: "The doctor is sending your referral.",
    },
    {
      label: "Hospital is ready for you",
      done: status === ReferralStatus.ACKNOWLEDGED || isArrivalConfirmed,
      next: floating ? "Choose a hospital to go to." : "The hospital is checking your referral.",
    },
    {
      label: "Ride to the hospital",
      done: tr?.status === TransportStatus.ARRIVED || isArrivalConfirmed,
      next: isTransitActive
        ? "Be ready at the door and keep your phone with you."
        : isRideFailed
          ? `${nav?.name?.split(",")[0] || "Your care navigator"} is arranging another ride.`
          : hasOwnTransport
            ? "Travel with your own transport. Tell your care navigator if that changes."
            : "Your ride is being arranged.",
    },
    {
      label: "Check in at the hospital",
      done: isArrivalConfirmed,
      next: `At the hospital, give case ID ${referral?.id} at the reception desk.`,
    },
    {
      label: "Care and follow-up",
      done: status === ReferralStatus.COMPLETED,
      next: `The care team will look after ${who}. Follow-up visits are planned before you go home.`,
    },
  ];
  const nextStep = steps.find((s) => !s.done) || steps[steps.length - 1];

  const rideStage = isArrivalConfirmed ? RIDE_STAGES.length : RIDE_STAGE_BY_STATUS[tr?.status] || 0;
  const rideSummary =
    !tr && !isArrivalConfirmed
      ? "No ride booked yet"
      : isRideFailed
        ? "Your ride had a problem"
        : RIDE_STAGES[rideStage - 1] || "Your ride is being arranged";
  const showEta = tr?.eta && !isArrivalConfirmed && !isRideFailed;

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
        <p className="text-sm font-semibold">
          {floating && referral.priority === UrgencyLevel.STAT
            ? "This is an emergency. Call 108 now, and choose a hospital after."
            : "Severe bleeding, vision changes, intense constant pain, or reduced baby movement? Do not wait."}
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
              <h2 className="font-display text-xl sm:text-2xl font-bold">{rideSummary}</h2>
              {showEta && <p className="text-lg font-semibold tabular-nums">Arrives in {tr.eta}</p>}
              <p className="text-sm border-t border-on-fill/20 pt-3">
                <span className="font-semibold">Next:</span> {nextStep.next}
              </p>
            </section>
          )}

          <Card title="Your journey">
            <StepList steps={steps.map((s) => ({ ...s, isNow: s === nextStep && !s.done ? "Next" : "" }))} />
          </Card>
        </>
      )}

      {view === "transit" && (
        <>
          <section className="rounded-card bg-brand text-on-fill p-5 sm:p-6">
            {showEta ? (
              <>
                <p className="text-sm text-on-fill-muted">Arrives in</p>
                <p className="font-display text-5xl font-extrabold tabular-nums mt-1">{tr.eta}</p>
              </>
            ) : (
              <h2 className="font-display text-2xl font-bold">{rideSummary}</h2>
            )}
            <p className="text-sm text-on-fill-muted mt-2 break-words">{hospital || "No hospital chosen yet"}</p>
          </section>

          {isRideFailed && (
            <p role="alert" className="p-4 rounded-card bg-danger-soft text-danger-strong text-sm">
              <strong>Your ride had a problem.</strong> {tr.failedReason} Your care navigator is arranging another one.
            </p>
          )}

          {chooser ||
            (hospitalMap ? (
              <HospitalMap map={hospitalMap} />
            ) : (
              <EmptyState>The way to the hospital will appear here once a hospital is confirmed.</EmptyState>
            ))}

          {!tr && !isArrivalConfirmed ? (
            <EmptyState>If you need a free ride, your care navigator will arrange it.</EmptyState>
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

          {tr?.driver && !isArrivalConfirmed && (
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
                <div>
                  <dt className="text-xs text-ink-muted">From</dt>
                  <dd className="font-semibold text-ink break-words">{tr.pickupAddress || referral?.patientAddress}</dd>
                </div>
                <div>
                  <dt className="text-xs text-ink-muted">To</dt>
                  <dd className="font-semibold text-ink break-words">{hospital || "Not chosen yet"}</dd>
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
          {bring}
        </Card>
      )}

      {view === "support" && (
        <>
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
