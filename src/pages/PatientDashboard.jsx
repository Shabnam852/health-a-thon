import { useState } from "react";
import { Link, useSearchParams } from "react-router";
import { ASSISTANT_PATH } from "../components/assistant/AssistantLauncher.jsx";
import ListenButton from "../components/assistant/ListenButton.jsx";
import { useFamilyLanguage } from "../components/assistant/useFamilyLanguage.js";
import { usePatientCase } from "../components/assistant/usePatientCase.js";
import { fill, fillParts } from "../components/familyStrings.js";
import HospitalChoice from "../components/HospitalChoice.jsx";
import HospitalMap from "../components/HospitalMap.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, Card, EmptyState, Field, Icon, Page, PageHeader, Pictogram, Select } from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { getScreenSummary } from "../domain/assistant.js";
import { telHref } from "../domain/contact.js";
import { TransportStatus, UrgencyLevel } from "../domain/enums.js";
import { getHospitalMap } from "../domain/hospitalMap.js";
import { getPatientJourney } from "../domain/patientJourney.js";
import { StorageAdapter } from "../services/storageAdapter.js";

const PATIENT_VIEWS = ["transit", "checklist", "support"];

// Matches BRING_LIST (and the family strings' bring list), item by item.
const BRING_PICTOGRAMS = ["id", "health-card", "medicines", "phone"];

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

const StepList = ({ steps, t }) => (
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
              {step.done ? t.done : step.isNow || t.notYet}
            </span>
          </span>
        </li>
      );
    })}
  </ol>
);

// "Priya Raman, MSW" -> "PR": the first letters of the name before any title.
const initials = (name = "") =>
  name
    .split(",")[0]
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

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
  const { t, lang } = useFamilyLanguage();

  // Every hook is above, so an empty case list can bail out safely.
  if (!referral) {
    return (
      <Page width="md" lang={lang}>
        <PageHeader title={t.yourCare} />
        <EmptyState pictogram="clipboard">{t.noCase}</EmptyState>
      </Page>
    );
  }

  const journey = getPatientJourney(referral, facilities);
  const { isChild, tr, nav, floating, hospital, hospitalPhone, isRideFailed } = journey;
  const { steps, nextStep, rideStage, rideSummaryKey, showEta } = journey;
  // The journey's words come from the domain in English; the screen shows them in the family's language.
  const rideSummary = rideSummaryKey ? t[rideSummaryKey] : t.rideStages[rideStage - 1];
  const nextText = fill(t[nextStep.nextKey], {
    ...nextStep.nextVars,
    name: nextStep.nextVars?.name || t.yourCareNavigator,
  });
  // A newborn's page is read by the parent, so greet the parent and not "Baby".
  const greetedName = isChild ? referral?.caregiverName : referral?.patientName;
  const patientFirstName = greetedName?.split(" ")[0];

  // A number the family can tap to call; plain text if the field holds no number.
  const hospitalTel = telHref(hospitalPhone);
  const hospitalPhoneLink = hospitalTel ? (
    <a
      href={hospitalTel}
      aria-label={fill(t.callHospitalAria, { hospital: hospital || t.theHospital, phone: hospitalPhone })}
      className="inline-flex min-h-control-sm items-center text-accent underline"
    >
      {hospitalPhone}
    </a>
  ) : (
    hospitalPhone
  );

  const viewFromUrl = searchParams.get("view");
  const view = PATIENT_VIEWS.includes(viewFromUrl) ? viewFromUrl : "overview";

  // The checklist shows the same items the assistant reads out, in the family's language.
  const checklist = t.bring.map((text, index) => ({
    id: index + 1,
    text,
    pictogram: BRING_PICTOGRAMS[index],
    checked: Boolean(savedChecklists[referral?.id]?.[index + 1]),
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

  const finishChoice = (res, message) => report(res, message, t.somethingWrong);

  const chooser = floating && (
    <Card title={t.chooseHospital} className="space-y-4">
      <p className="text-sm text-ink">
        {fill(isChild ? t.cantTakeBaby : t.cantTakeYou, { hospital: referral.toFacility })}
      </p>
      <HospitalChoice
        referral={referral}
        strings={t}
        noOptionsText={t.noOptions}
        onChoose={(name) =>
          finishChoice(recordPatientChoice(referral.id, name), fill(t.toldComing, { hospital: name }))
        }
        onElsewhere={(place) =>
          finishChoice(recordPatientGoingElsewhere(referral.id, place), fill(t.savedElsewhere, { place }))
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
              className="w-5 h-5 rounded-sm accent-control shrink-0"
            />
            <Pictogram name={item.pictogram} tone={item.checked ? "neutral" : "ink"} size="sm" bare />
            <span className={item.checked ? "line-through text-ink-muted" : ""}>{item.text}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-ink-muted">
        {fillParts(t.packed, {
          packed: packedCount,
          total: checklist.length,
          hospital: hospital || t.theHospital,
          id: (
            <strong key="id" className="text-ink">
              {referral?.id}
            </strong>
          ),
        })}
      </p>
    </>
  );

  return (
    <Page width="md" lang={lang}>
      <Toast toast={toast} />
      <PageHeader
        title={patientFirstName ? fill(t.hello, { name: patientFirstName }) : t.helloNoName}
        actions={
          <Field label={t.patient} className="w-full sm:w-auto sm:max-w-xs">
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
          <span>{floating && referral.priority === UrgencyLevel.STAT ? t.emergencyStat : t.emergencySigns}</span>
        </p>
        {/* The label is long: let it wrap on the narrowest phones instead of overflowing. */}
        <Button as="a" href="tel:108" variant="danger" wrap className="shrink-0">
          <Icon name="call" />
          {t.call108}
        </Button>
      </section>

      {view === "overview" && (
        <>
          {chooser || (
            <section className="rounded-card bg-brand text-on-fill p-4 sm:p-6 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="font-display text-xl sm:text-2xl font-semibold break-words">{rideSummary}</h2>
                  {showEta && (
                    <p className="text-lg font-semibold tabular-nums mt-1">{fill(t.arrivesInEta, { eta: tr.eta })}</p>
                  )}
                </div>
                <Pictogram name={isArrivalConfirmed ? "hospital" : "van"} tone="on-fill" size="lg" className="-my-1" />
              </div>
              <p className="text-sm border-t border-on-fill/20 pt-3">
                <span className="font-semibold">{t.next}</span> {nextText}
              </p>
            </section>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {listen}
            <Button as={Link} to={ASSISTANT_PATH} size="sm" className="lg:hidden">
              <Icon name="support_agent" size="sm" />
              {t.askQuestion}
            </Button>
          </div>

          <Card title={t.yourJourney}>
            <StepList
              t={t}
              steps={steps.map((s, index) => ({
                ...s,
                label: t.steps[index] ?? s.label,
                isNow: s === nextStep && !s.done ? t.nextLabel : "",
              }))}
            />
          </Card>
        </>
      )}

      {view === "transit" && (
        <>
          <section className="rounded-card bg-brand text-on-fill p-4 sm:p-6 flex items-start justify-between gap-4">
            <div className="min-w-0">
              {showEta ? (
                <>
                  <p className="text-sm text-on-fill-muted">{t.arrivesIn}</p>
                  <p className="font-display text-4xl font-semibold tabular-nums mt-1">{tr.eta}</p>
                </>
              ) : (
                <h2 className="font-display text-2xl font-semibold">{rideSummary}</h2>
              )}
              <p className="text-sm text-on-fill-muted mt-2 break-words">{hospital || t.noHospitalYet}</p>
            </div>
            <Pictogram name="van" tone="on-fill" size="lg" />
          </section>

          <div>{listen}</div>

          {isRideFailed && (
            <p role="alert" className="p-4 rounded-card bg-danger-soft text-danger-strong text-sm">
              <strong>{t.rideFailed}</strong> {tr.failedReason} {t.rideFailedAfter}
            </p>
          )}

          {chooser ||
            (hospitalMap ? (
              <HospitalMap map={hospitalMap} title={t.gettingThere} />
            ) : (
              <EmptyState pictogram="route">{t.mapLater}</EmptyState>
            ))}

          {!tr && !isArrivalConfirmed ? (
            <EmptyState pictogram="van">{t.freeRideOffer}</EmptyState>
          ) : (
            <Card title={t.progress}>
              <StepList
                t={t}
                steps={t.rideStages.map((label, index) => {
                  // The stage reached last is still happening, until the patient has arrived.
                  const isNow = index === rideStage - 1 && !isRideFailed && rideStage < t.rideStages.length;
                  return { label, done: index < rideStage && !isNow, isNow: isNow ? t.nowLabel : "" };
                })}
              />
            </Card>
          )}

          {tr?.driver && DRIVER_STATUSES.includes(tr.status) && !isArrivalConfirmed && (
            <Card title={t.yourDriver} className="space-y-3">
              <div className="flex items-center gap-3">
                <span
                  aria-hidden="true"
                  className="w-12 h-12 shrink-0 rounded-full bg-subtle-strong text-ink flex items-center justify-center text-lg font-semibold"
                >
                  {tr.driver[0]}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink break-words">{tr.driver}</p>
                  {tr.vehicle && <p className="text-xs text-ink-muted break-words">{tr.vehicle}</p>}
                </div>
              </div>
              {tr.driverPhone && <CallLink phone={tr.driverPhone}>{t.callDriver}</CallLink>}
            </Card>
          )}

          {tr && (
            <Card title={t.trip} className="space-y-3">
              <dl className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <Icon name="home" className="text-ink-muted mt-0.5" />
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">{t.from}</dt>
                    <dd className="font-semibold text-ink break-words">
                      {tr.pickupAddress || referral?.patientAddress}
                    </dd>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Icon name="local_hospital" className="text-ink-muted mt-0.5" />
                  <div className="min-w-0">
                    <dt className="text-xs text-ink-muted">{t.to}</dt>
                    <dd className="font-semibold text-ink break-words">{hospital || t.notChosen}</dd>
                  </div>
                </div>
              </dl>
              <p className="flex items-center gap-2 text-sm font-semibold text-accent">
                <Icon name="check_circle" />
                {t.rideFree}
              </p>
            </Card>
          )}
        </>
      )}

      {view === "checklist" && (
        <Card title={t.whatToBring} className="space-y-3">
          {listen}
          {bring}
        </Card>
      )}

      {view === "support" && (
        <>
          <Card title={t.askTitle} className="space-y-3">
            <p className="text-sm text-ink">{t.askBody}</p>
            <p className="flex items-start gap-2 text-sm text-ink">
              <Icon name="forward_to_inbox" className="text-accent shrink-0" />
              <span>
                <strong>{t.stoppingTitle}</strong> {t.stoppingBody}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button as={Link} to={ASSISTANT_PATH} variant="primary">
                <Icon name="support_agent" />
                {t.askQuestion}
              </Button>
              {listen}
            </div>
          </Card>
          {nav && (
            <Card title={t.yourCareNavigator} className="space-y-3">
              <div className="flex items-center gap-3">
                {/* Initials in theme colours, so they keep their contrast in both themes. */}
                <span
                  aria-hidden="true"
                  className="w-12 h-12 rounded-full bg-brand text-on-fill font-semibold inline-flex items-center justify-center shrink-0"
                >
                  {initials(nav.name)}
                </span>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{nav.name}</p>
                  <p className="text-xs text-ink-muted">{t.navigatorRole}</p>
                </div>
              </div>
              {nav.phone && <CallLink phone={nav.phone}>{fill(t.callNumber, { phone: nav.phone })}</CallLink>}
            </Card>
          )}
          <Card title={t.yourHospital}>
            <DetailList
              rows={[
                [t.hospitalLabel, hospital || t.notChosen],
                [t.hospitalPhone, hospitalPhoneLink],
                [t.yourLanguage, referral?.language],
                [t.interpreter, referral?.interpreterNeeded ? t.interpreterRequested : t.interpreterNot],
              ]}
            />
          </Card>
        </>
      )}
    </Page>
  );
};

export default PatientDashboard;
