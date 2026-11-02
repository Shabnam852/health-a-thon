import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FormDialog } from "../components/Dialog.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  FilterTabs,
  Input,
  Page,
  PageHeader,
  Select,
  Textarea,
} from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { formatMinutes, getResponseClock } from "../domain/alarms.js";
import { isHighAcuity, PatientType, ReferralStatus } from "../domain/enums.js";
import { hasArrivedAtFacility, isFloating } from "../domain/workflow.js";

const TABS = [
  {
    id: "pending",
    label: "To acknowledge",
    empty: "Nothing waiting to be acknowledged.",
    statuses: [ReferralStatus.SENT, ReferralStatus.CREATED],
  },
  { id: "intransit", label: "On the way", empty: "No patients on the way.", statuses: [ReferralStatus.ACKNOWLEDGED] },
  {
    id: "arrived",
    label: "Arrived",
    empty: "No patients in assessment.",
    statuses: [ReferralStatus.ARRIVAL_CONFIRMED],
  },
  { id: "completed", label: "Done", empty: "No completed cases yet.", statuses: [ReferralStatus.COMPLETED] },
  { id: "declined", label: "Declined", empty: "None declined.", statuses: [ReferralStatus.REJECTED] },
];

const BLANK_FORM = {
  rejectReason: "",
  arrivalBay: "",
  arrivalStaff: "",
  clinicianName: "",
  maternalStatus: "STABLE",
  deliveryType: "SPONTANEOUS_VAGINAL",
  neonatalStatus: "STABLE",
  disposition: "ADMITTED",
  clinicalNotes: "",
};

const FacilityDashboard = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const {
    referrals,
    facilities,
    activeFacility,
    setActiveFacilityId,
    now,
    acknowledgeReferral,
    rejectReferral,
    confirmArrival,
    recordClinicalOutcome,
  } = useReferrals();

  const [modal, setModal] = useState(null); // { type: 'reject' | 'arrival' | 'outcome', referral }
  const [caseIdQuery, setCaseIdQuery] = useState("");
  const [form, setForm] = useState(BLANK_FORM);
  const { toast, showToast, report } = useToast();
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  // A link can name a hospital. Otherwise this is the hospital chosen last.
  const linkedFacility = facilities.find((f) => f.id === searchParams.get("facility"));
  const currentFacility = linkedFacility || activeFacility;
  const linkedFacilityId = linkedFacility?.id;
  useEffect(() => {
    if (linkedFacilityId) setActiveFacilityId(linkedFacilityId);
  }, [linkedFacilityId, setActiveFacilityId]);

  const inbound = referrals.filter((r) => r.toFacility?.toLowerCase().includes(currentFacility.name.toLowerCase()));
  const queues = Object.fromEntries(TABS.map((t) => [t.id, inbound.filter((r) => t.statuses.includes(r.status))]));

  // No tab in the URL: open the first queue that needs attention.
  const urlTab = searchParams.get("tab");
  const activeTab =
    TABS.find((t) => t.id === urlTab)?.id ||
    ["pending", "intransit", "arrived"].find((id) => queues[id].length > 0) ||
    "pending";
  const list = queues[activeTab];

  const setParam = (key, value) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, value);
    setSearchParams(next);
  };

  // Clears the form, so nothing typed for one patient carries over to the next.
  const closeModal = () => {
    setModal(null);
    setForm(BLANK_FORM);
  };

  const finish = (res, okMessage) => {
    report(res, okMessage);
    closeModal();
  };

  const handleAcknowledge = (ref) => {
    const res = acknowledgeReferral(ref.id, undefined, "Receiving triage intake prepped and bed held.");
    finish(res, `Acknowledged ${ref.patientName}. Bed reserved.`);
  };

  const handleConfirmArrivalAction = () => {
    const ref = modal.referral;
    const res = confirmArrival(ref.id, {
      atFacility: currentFacility.name,
      department: currentFacility.name,
      room: form.arrivalBay,
      verifiedBy: form.arrivalStaff,
      notes: "Patient physically arrived and checked in.",
    });
    finish(res, `${ref.patientName} arrived and checked into ${form.arrivalBay}.`);
    setCaseIdQuery("");
  };

  const handleConfirmReject = () => {
    const ref = modal.referral;
    finish(
      rejectReferral(ref.id, undefined, form.rejectReason),
      `Declined ${ref.patientName}. They can now choose another hospital.`,
    );
  };

  // A patient can walk in anywhere, so reception finds them by the case ID they were given.
  const handleFindCase = (e) => {
    e.preventDefault();
    const wanted = caseIdQuery.trim().toLowerCase();
    const found = referrals.find((r) => r.id.toLowerCase() === wanted);
    if (!found) return showToast(`No case with ID ${caseIdQuery.trim()}.`, "error");
    if (hasArrivedAtFacility(found))
      return showToast(`${found.patientName} has already arrived at ${found.toFacility}.`, "error");
    ask("arrival", found);
  };

  const handleConfirmOutcome = () => {
    const ref = modal.referral;
    const res = recordClinicalOutcome(ref.id, {
      // The record keeps only the fields for this patient type.
      clinicianName: form.clinicianName,
      clinicianRole: "MD / MS (OBG)",
      maternalStatus: form.maternalStatus,
      deliveryType: form.deliveryType,
      neonatalStatus: form.neonatalStatus,
      disposition: form.disposition,
      clinicalNotes: form.clinicalNotes || "Clinical assessment completed. Patient stabilized.",
    });
    finish(res, `Outcome recorded for ${ref.patientName}. Follow-ups started.`);
  };

  const ask = (type, referral) => setModal({ type, referral });
  const select = (key, options) => (
    <Select value={form[key]} onChange={(e) => set(key, e.target.value)}>
      {options.map(([v, label]) => (
        <option key={v} value={v}>
          {label}
        </option>
      ))}
    </Select>
  );

  return (
    <Page>
      <Toast toast={toast} />

      <div className="space-y-3">
        <PageHeader
          title="Intake"
          subtitle={`${currentFacility.bedsAvailable} of ${currentFacility.totalBeds} beds free`}
          actions={
            <Select
              aria-label="Hospital"
              value={currentFacility.id}
              onChange={(e) => setParam("facility", e.target.value)}
              className="sm:w-auto sm:max-w-xs"
            >
              {facilities.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </Select>
          }
        />
        <details className="text-sm text-ink-muted">
          <summary className="cursor-pointer font-semibold text-ink">Hospital details</summary>
          <div className="mt-2 space-y-1 break-words">
            <p>
              {currentFacility.type} · {currentFacility.location}
            </p>
            <p>Intake status: {currentFacility.status}</p>
            <p>
              Phone: {currentFacility.phone} · Direct: {currentFacility.directContact}
            </p>
            <p>Can treat: {currentFacility.capabilities.join(", ")}</p>
          </div>
        </details>
      </div>

      <form onSubmit={handleFindCase} className="flex flex-col sm:flex-row sm:items-end gap-2">
        <Field label="Patient at reception? Enter their case ID" className="flex-1">
          <Input value={caseIdQuery} onChange={(e) => setCaseIdQuery(e.target.value)} />
        </Field>
        <Button type="submit" disabled={!caseIdQuery.trim()}>
          Find case
        </Button>
      </form>

      <FilterTabs
        label="Queues"
        items={TABS.map((t) => ({ id: t.id, label: t.label, count: queues[t.id].length }))}
        selected={activeTab}
        onSelect={(id) => setParam("tab", id)}
      />

      <div className="space-y-4">
        {list.length === 0 ? (
          <EmptyState>{TABS.find((t) => t.id === activeTab).empty}</EmptyState>
        ) : (
          list.map((r) => {
            const isPending = TABS[0].statuses.includes(r.status);
            const isAccepted = r.status === ReferralStatus.ACKNOWLEDGED;
            const isArrived = r.status === ReferralStatus.ARRIVAL_CONFIRMED;
            const clock = isPending ? getResponseClock(r, now) : null;
            return (
              <Card as="article" key={r.id} className="space-y-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-semibold text-ink break-words">{r.patientName}</h2>
                    {isHighAcuity(r.priority) && (
                      <Badge tone="danger" className="uppercase">
                        {r.priority}
                      </Badge>
                    )}
                    {clock && (
                      <Badge tone={clock.isOverdue ? "danger" : "neutral"}>
                        {clock.isOverdue
                          ? `Reply ${formatMinutes(-clock.minutesLeft)} late`
                          : `Reply within ${formatMinutes(clock.minutesLeft)}`}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-ink-muted break-words">{r.condition || r.reason}</p>
                  <p className="text-sm text-ink-muted">From {r.fromFacility}</p>
                </div>

                <details className="text-sm text-ink-muted">
                  <summary className="cursor-pointer font-semibold text-ink">Details</summary>
                  <div className="mt-2 space-y-1 break-words">
                    <p>
                      {r.id} · {r.referralType} · {r.priority} acuity · {r.status}
                    </p>
                    <p>Referred by: {r.fromClinician || "Clinician on file"}</p>
                    <p>
                      Contact: {r.caregiverContact || r.patientPhone} · Language: {r.language || "English"}
                    </p>
                    {r.transit && (
                      <p>
                        Transit: {r.transit.vehicle || "Assigned"} ({r.transit.status})
                      </p>
                    )}
                    <Button as={Link} to={`/referral/${r.id}`} variant="link" size="flush">
                      Open chart
                    </Button>
                  </div>
                </details>

                {(isPending || isAccepted || isArrived) && (
                  <div className="grid grid-cols-2 sm:flex gap-2 pt-3 border-t border-line">
                    {isPending && (
                      <>
                        <Button variant="primary" className="col-span-2" onClick={() => handleAcknowledge(r)}>
                          Acknowledge
                        </Button>
                        <Button onClick={() => ask("arrival", r)}>Patient is here</Button>
                        <Button variant="danger-quiet" onClick={() => ask("reject", r)}>
                          Decline
                        </Button>
                      </>
                    )}
                    {isAccepted && (
                      <Button variant="primary" className="col-span-2" onClick={() => ask("arrival", r)}>
                        Confirm arrival
                      </Button>
                    )}
                    {isArrived && (
                      <Button variant="primary" className="col-span-2" onClick={() => ask("outcome", r)}>
                        Record outcome
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>

      {modal?.type === "arrival" && (
        <FormDialog
          title="Confirm arrival"
          onCancel={closeModal}
          onSave={handleConfirmArrivalAction}
          saveLabel="Confirm arrival"
          saveDisabled={!form.arrivalBay.trim() || !form.arrivalStaff.trim()}
        >
          <p className="text-sm text-ink-muted">
            {modal.referral.patientName} has reached {currentFacility.name}.
            {modal.referral.toFacility !== currentFacility.name &&
              !isFloating(modal.referral) &&
              ` They were expected at ${modal.referral.toFacility}.`}
          </p>
          <Field label="Room or bay">
            <Input value={form.arrivalBay} onChange={(e) => set("arrivalBay", e.target.value)} />
          </Field>
          <Field label="Checked in by">
            <Input value={form.arrivalStaff} onChange={(e) => set("arrivalStaff", e.target.value)} />
          </Field>
        </FormDialog>
      )}

      {modal?.type === "reject" && (
        <FormDialog
          title="Decline referral"
          danger
          onCancel={closeModal}
          onSave={handleConfirmReject}
          saveLabel="Decline"
          saveDisabled={!form.rejectReason.trim()}
        >
          <p className="text-sm text-ink-muted">
            {modal.referral.patientName} will be shown other hospitals to choose from.
          </p>
          <Field label="Reason">
            <Textarea value={form.rejectReason} onChange={(e) => set("rejectReason", e.target.value)} />
          </Field>
        </FormDialog>
      )}

      {modal?.type === "outcome" && (
        <FormDialog
          title="Record outcome"
          onCancel={closeModal}
          onSave={handleConfirmOutcome}
          saveLabel="Save outcome"
          saveDisabled={!form.clinicianName.trim()}
        >
          <p className="text-sm text-ink-muted">
            {modal.referral.patientName} ({modal.referral.referralType}). Saving starts the 42-day follow-ups.
          </p>
          <Field label="Doctor">
            <Input value={form.clinicianName} onChange={(e) => set("clinicianName", e.target.value)} />
          </Field>
          {modal.referral.referralType !== PatientType.CHILD && (
            <>
              <Field label="Mother's status">
                {select("maternalStatus", [
                  ["STABLE", "Stable / Treated"],
                  ["ADMITTED_L_D", "Admitted to Labor & Delivery"],
                  ["CESAREAN_DELIVERY", "Emergency Cesarean Performed"],
                  ["ICU_MONITORING", "Maternal ICU Step-up"],
                ])}
              </Field>
              <Field label="Delivery">
                {select("deliveryType", [
                  ["SPONTANEOUS_VAGINAL", "Spontaneous Vaginal Delivery"],
                  ["CESAREAN", "Cesarean Section Delivery"],
                  ["NOT_APPLICABLE", "Antepartum Observation (Pregnancy Continues)"],
                ])}
              </Field>
            </>
          )}
          {modal.referral.referralType !== PatientType.MATERNAL && (
            <Field label="Baby's status">
              {select("neonatalStatus", [
                ["STABLE", "Stable / Treated"],
                ["PHOTOTHERAPY_INITIATED", "Phototherapy Initiated (TSB Responding)"],
                ["NICU_ADMITTED", "NICU Level III Bed Admitted"],
                ["REHYDRATED_STABLE", "Rehydrated & Electrolytes Normalized"],
                ["STABLE_OUTPATIENT", "Discharged to Pediatric Outpatient"],
              ])}
            </Field>
          )}
          <Field label="What happens next">
            {select("disposition", [
              ["ADMITTED", "Admitted to Inpatient Ward"],
              ["DISCHARGED_HOME", "Discharged Home (Initiate 42-Day Protocol)"],
              ["TRANSFERRED_QUATERNARY", "Transferred to Level IV Quaternary Centre"],
            ])}
          </Field>
          <Field label="Notes">
            <Textarea
              placeholder="Key treatment and discharge plan"
              value={form.clinicalNotes}
              onChange={(e) => set("clinicalNotes", e.target.value)}
            />
          </Field>
        </FormDialog>
      )}
    </Page>
  );
};

export default FacilityDashboard;
