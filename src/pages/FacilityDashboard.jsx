import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { FormDialog } from "../components/Dialog.jsx";
import {
  actionsColumn,
  caseIdColumn,
  conditionColumn,
  fromColumn,
  patientColumn,
  priorityColumn,
  serialColumn,
  typeColumn,
} from "../components/referralColumns.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  DataTable,
  Disclosure,
  Field,
  FilterTabs,
  Icon,
  Input,
  Page,
  PageHeader,
  Select,
  Textarea,
} from "../components/ui/index.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useReferrals } from "../context/ReferralContext.jsx";
import { formatMinutes, getResponseClock } from "../domain/alarms.js";
import { PatientType, ReferralStatus } from "../domain/enums.js";
import { ARRIVAL_REPORTED_LABEL, isArrivalReportedOnly } from "../domain/familyRequests.js";
import { getOccupancy } from "../domain/network.js";
import { findCaseAtReception, isFloating } from "../domain/workflow.js";

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

const replyColumn = {
  id: "reply",
  header: "Reply by",
  // Minutes left shift by the same amount for every row as time passes, so any fixed clock sorts them right.
  accessorFn: (r) => getResponseClock(r, 0)?.minutesLeft,
  sortUndefined: "last",
  enableGlobalFilter: false,
  meta: { className: "whitespace-nowrap" },
  cell: ({ row: { original: r }, table }) => {
    const clock = getResponseClock(r, table.options.meta.now);
    if (!clock) return null;
    return (
      <Badge tone={clock.isOverdue ? "danger" : "neutral"}>
        {clock.isOverdue ? `${formatMinutes(-clock.minutesLeft)} late` : `${formatMinutes(clock.minutesLeft)} left`}
      </Badge>
    );
  },
};

const intakeActions = actionsColumn(({ row: { original: r }, table }) => {
  const { onAcknowledge, ask } = table.options.meta;
  return (
    <div className="flex justify-end gap-2">
      {/* The workflow only acknowledges or confirms arrival for a referral that has been sent. */}
      {r.status === ReferralStatus.SENT && (
        <>
          <Button
            aria-label={`Acknowledge for ${r.patientName}`}
            size="sm"
            variant="primary"
            onClick={() => onAcknowledge(r)}
          >
            Acknowledge
          </Button>
          <Button aria-label={`Patient is here for ${r.patientName}`} size="sm" onClick={() => ask("arrival", r)}>
            Patient is here
          </Button>
        </>
      )}
      {TABS[0].statuses.includes(r.status) && (
        <Button
          aria-label={`Decline for ${r.patientName}`}
          size="sm"
          variant="danger-quiet"
          onClick={() => ask("reject", r)}
        >
          Decline
        </Button>
      )}
      {r.status === ReferralStatus.ACKNOWLEDGED && (
        <Button
          aria-label={`Confirm arrival for ${r.patientName}`}
          size="sm"
          variant="primary"
          onClick={() => ask("arrival", r)}
        >
          Confirm arrival
        </Button>
      )}
      {r.status === ReferralStatus.ARRIVAL_CONFIRMED && (
        <Button
          aria-label={`Record outcome for ${r.patientName}`}
          size="sm"
          variant="primary"
          onClick={() => ask("outcome", r)}
        >
          Record outcome
        </Button>
      )}
    </div>
  );
});

// The family's own arrival report sits under the name, worded so it can't pass for a confirmed arrival.
const sharedPatientColumn = patientColumn();
const intakePatientColumn = {
  ...sharedPatientColumn,
  cell: (ctx) => (
    <>
      {sharedPatientColumn.cell(ctx)}
      {isArrivalReportedOnly(ctx.row.original) && (
        <Badge tone="neutral" className="mt-1">
          {ARRIVAL_REPORTED_LABEL}
        </Badge>
      )}
    </>
  ),
};

const baseColumns = [serialColumn(), caseIdColumn(), intakePatientColumn, priorityColumn()];
const tailColumns = [typeColumn(), conditionColumn(), fromColumn(), intakeActions];
const QUEUE_COLUMNS = [...baseColumns, ...tailColumns];
const PENDING_COLUMNS = [...baseColumns, replyColumn, ...tailColumns];

// Where an arriving patient is admitted, as an Indian government hospital names it.
const WARDS = {
  [PatientType.MATERNAL]: ["Labour room", "Antenatal ward", "Postnatal ward", "Obstetric HDU", "Casualty"],
  [PatientType.CHILD]: ["SNCU", "NICU", "Paediatric ward", "Casualty"],
  [PatientType.DYAD]: ["Postnatal ward", "Labour room", "SNCU", "Obstetric HDU", "Casualty"],
};
const STAFF_ROLES = ["Staff nurse", "Ward sister", "Duty doctor", "Medical officer", "ANM"];

const BLANK_FORM = {
  rejectReason: "",
  arrivalWard: "",
  arrivalBed: "",
  arrivalIp: "",
  arrivalStaff: "",
  arrivalRole: STAFF_ROLES[0],
  clinicianName: "",
  maternalStatus: "STABLE",
  deliveryType: "SPONTANEOUS_VAGINAL",
  neonatalStatus: "STABLE",
  disposition: "ADMITTED",
  clinicalNotes: "",
};

// Example details for the judges' quick fill. Made up, like every patient in the demo.
const exampleArrival = (ward, staffName) => ({
  arrivalWard: ward,
  arrivalBed: "4",
  arrivalIp: "IP/2026/04512",
  arrivalStaff: staffName || "Kavya Menon",
  // A doctor signed in receives as the duty doctor, anyone else as the staff nurse.
  arrivalRole: /^Dr\b/.test(staffName ?? "") ? "Duty doctor" : STAFF_ROLES[0],
});

const exampleOutcome = (referral) => {
  const isChild = referral.referralType === PatientType.CHILD;
  return {
    clinicianName: "Dr. Rekha Srinivasan",
    maternalStatus: "STABLE",
    deliveryType: "SPONTANEOUS_VAGINAL",
    neonatalStatus: isChild ? "PHOTOTHERAPY_INITIATED" : "STABLE",
    disposition: "DISCHARGED_HOME",
    clinicalNotes: isChild
      ? "Intensive phototherapy for 36 hours. Bilirubin now below threshold. Feeding well. Review at day 7."
      : "Treated and stable. Blood pressure controlled. Discharged home with medicines and a day 7 check.",
  };
};

// A small "Demo only" row at the top of a form, so a judge can fill it in one press.
const QuickFill = ({ onFill }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 rounded-control border border-line bg-subtle px-3 py-2">
    <span className="text-sm text-ink-muted">Demo only: fill this with made-up details.</span>
    <Button size="sm" onClick={onFill}>
      <Icon name="edit_note" size="sm" />
      Example details
    </Button>
  </div>
);

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
  const [form, setForm] = useState(BLANK_FORM);
  const [caseIdQuery, setCaseIdQuery] = useState("");
  const [saveError, setSaveError] = useState("");
  const { toast, showToast, report } = useToast();
  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));
  const fill = (values) => setForm((prev) => ({ ...prev, ...values }));
  const { session } = useAuth();

  // A link can name a hospital. Otherwise this is the hospital chosen last.
  const linkedFacility = facilities.find((f) => f.id === searchParams.get("facility"));
  const currentFacility = linkedFacility || activeFacility;
  const linkedFacilityId = linkedFacility?.id;
  useEffect(() => {
    if (linkedFacilityId) setActiveFacilityId(linkedFacilityId);
  }, [linkedFacilityId, setActiveFacilityId]);

  // An exact match, as on the hospitals board: a partial name must not pull in another hospital's cases.
  const inbound = referrals.filter((r) => r.toFacility === currentFacility.name);
  // The same count as the hospitals board: a bed is held from acceptance until discharge.
  const freeBeds = getOccupancy(currentFacility, referrals).freeAfterArrivals;
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
    setSaveError("");
  };

  // A failed save keeps the dialog open with what was typed and says why inside it.
  const finish = (res, okMessage) => {
    if (!res.success && modal) {
      setSaveError(`Not saved: ${res.reason}`);
      return;
    }
    report(res, okMessage);
    closeModal();
  };

  const handleAcknowledge = (ref) => {
    const res = acknowledgeReferral(ref.id, undefined, "Receiving triage intake prepped and bed held.");
    finish(res, `Acknowledged ${ref.patientName}. Bed reserved.`);
  };

  const arrivalWards = (ref) => WARDS[ref.referralType] || WARDS[PatientType.MATERNAL];
  const handleConfirmArrivalAction = () => {
    const ref = modal.referral;
    const ward = form.arrivalWard || arrivalWards(ref)[0];
    const room = `${ward}, bed ${form.arrivalBed.trim()}`;
    const ip = form.arrivalIp.trim();
    const res = confirmArrival(ref.id, {
      atFacility: currentFacility.name,
      department: ward,
      room,
      verifiedBy: `${form.arrivalStaff.trim()} (${form.arrivalRole})`,
      notes: `Patient physically arrived and was admitted${ip ? `, IP no. ${ip}` : ""}.`,
    });
    finish(res, `${ref.patientName} admitted to ${room}.`);
  };

  const handleConfirmReject = () => {
    const ref = modal.referral;
    finish(
      rejectReferral(ref.id, undefined, form.rejectReason.trim()),
      `Declined ${ref.patientName}. They can now choose another hospital.`,
    );
  };

  // A patient can walk in anywhere, including one who hasn't chosen a hospital yet, so
  // reception finds them by the case ID they were given and confirms they are here.
  const handleFindCase = (e) => {
    e.preventDefault();
    const res = findCaseAtReception(referrals, caseIdQuery);
    if (!res.success) return showToast(res.reason, "error");
    setCaseIdQuery("");
    ask("arrival", res.referral);
  };

  const handleConfirmOutcome = () => {
    const ref = modal.referral;
    const res = recordClinicalOutcome(ref.id, {
      // The record keeps only the fields for this patient type.
      clinicianName: form.clinicianName.trim(),
      clinicianRole: "MD / MS (OBG)",
      maternalStatus: form.maternalStatus,
      deliveryType: form.deliveryType,
      neonatalStatus: form.neonatalStatus,
      disposition: form.disposition,
      clinicalNotes: form.clinicalNotes.trim() || "Clinical assessment completed. Patient stabilized.",
    });
    finish(res, `Outcome recorded for ${ref.patientName}. Follow-ups started.`);
  };

  const ask = (type, referral) => {
    setSaveError("");
    setModal({ type, referral });
  };
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
    <Page width="full">
      <Toast toast={toast} />

      <PageHeader
        title="Intake"
        subtitle={`${freeBeds} of ${currentFacility.totalBeds} beds free after patients on the way`}
        actions={
          <Select
            aria-label="Hospital"
            value={currentFacility.id}
            onChange={(e) => setParam("facility", e.target.value)}
            className="w-full sm:w-auto sm:max-w-xs"
          >
            {facilities.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        }
      />

      <DataTable
        key={activeTab}
        label={TABS.find((t) => t.id === activeTab).label}
        tabs={
          <FilterTabs
            label="Queues"
            items={TABS.map((t) => ({ id: t.id, label: t.label, count: queues[t.id].length }))}
            selected={activeTab}
            onSelect={(id) => setParam("tab", id)}
          />
        }
        data={list}
        columns={activeTab === "pending" ? PENDING_COLUMNS : QUEUE_COLUMNS}
        context={{ now, onAcknowledge: handleAcknowledge, ask }}
        searchPlaceholder="Search name, ID, condition or clinic"
        emptyText={TABS.find((t) => t.id === activeTab).empty}
        noMatchText="No patients match."
        renderDetail={(r) => (
          <>
            <p>
              {r.id} · {r.referralType} · {r.priority} acuity · {r.status}
            </p>
            <p>Referred by: {r.fromClinician || "Clinician on file"}</p>
            <p>
              Contact: {r.caregiverContact || r.patientPhone} · Language: {r.language || "English"}
            </p>
            {isArrivalReportedOnly(r) && (
              <p className="font-semibold text-ink">
                {ARRIVAL_REPORTED_LABEL}
                {r.arrivalReport.place ? ` (said: ${r.arrivalReport.place})` : ""}. Confirm when the patient is at
                reception.
              </p>
            )}
            {r.transit && (
              <p>
                Transit: {r.transit.vehicle || "Assigned"} ({r.transit.status})
              </p>
            )}
            <Button as={Link} to={`/referral/${r.id}`} variant="link" size="flush">
              Open chart
            </Button>
          </>
        )}
      />

      {/* Below the queue, so the search box sits at the same height as on every other screen. */}
      <section className="space-y-3 border-t border-line pt-5">
        <form onSubmit={handleFindCase} className="flex flex-col sm:flex-row sm:items-end gap-2">
          <Field
            label="Patient at reception who isn't on these lists? Enter their case ID"
            className="flex-1 sm:max-w-md"
          >
            <Input
              name="caseId"
              value={caseIdQuery}
              placeholder="e.g. NX-9051"
              autoComplete="off"
              onChange={(e) => setCaseIdQuery(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={!caseIdQuery.trim()}>
            Find case
          </Button>
        </form>
        <Disclosure title="Hospital details" icon="local_hospital" variant="inline">
          <div className="space-y-1 break-words text-sm text-ink-muted">
            <p>
              {currentFacility.type} · {currentFacility.location}
            </p>
            <p>Intake status: {currentFacility.status}</p>
            <p>
              Phone: {currentFacility.phone} · Direct: {currentFacility.directContact}
            </p>
            <p>Can treat: {currentFacility.capabilities.join(", ")}</p>
          </div>
        </Disclosure>
      </section>

      {modal?.type === "arrival" && (
        <FormDialog
          title="Confirm arrival"
          onCancel={closeModal}
          onSave={handleConfirmArrivalAction}
          saveLabel="Confirm arrival"
          saveDisabled={!form.arrivalBed.trim() || !form.arrivalStaff.trim()}
          error={saveError}
        >
          <QuickFill onFill={() => fill(exampleArrival(arrivalWards(modal.referral)[0], session?.name))} />
          <p className="text-sm text-ink-muted">
            {modal.referral.patientName} has reached {currentFacility.name}.
            {modal.referral.toFacility !== currentFacility.name &&
              !isFloating(modal.referral) &&
              ` They were expected at ${modal.referral.toFacility}.`}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Ward">
              <Select
                value={form.arrivalWard || arrivalWards(modal.referral)[0]}
                onChange={(e) => set("arrivalWard", e.target.value)}
              >
                {arrivalWards(modal.referral).map((w) => (
                  <option key={w}>{w}</option>
                ))}
              </Select>
            </Field>
            <Field label="Bed number">
              <Input
                value={form.arrivalBed}
                inputMode="numeric"
                placeholder="e.g. 12"
                onChange={(e) => set("arrivalBed", e.target.value)}
              />
            </Field>
          </div>
          <Field label="IP number" hint="The in-patient number from the admission register, if given yet.">
            <Input
              value={form.arrivalIp}
              placeholder="e.g. IP/2026/04512"
              onChange={(e) => set("arrivalIp", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Received by">
              <Input
                value={form.arrivalStaff}
                placeholder="Name"
                onChange={(e) => set("arrivalStaff", e.target.value)}
              />
            </Field>
            <Field label="Role">
              <Select value={form.arrivalRole} onChange={(e) => set("arrivalRole", e.target.value)}>
                {STAFF_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </Select>
            </Field>
          </div>
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
          error={saveError}
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
          error={saveError}
        >
          <QuickFill onFill={() => fill(exampleOutcome(modal.referral))} />
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
                  ["STABLE", "Stable or treated"],
                  ["ADMITTED_L_D", "Admitted to labour and delivery"],
                  ["CESAREAN_DELIVERY", "Emergency caesarean done"],
                  ["ICU_MONITORING", "Moved to maternal ICU"],
                ])}
              </Field>
              <Field label="Delivery">
                {select("deliveryType", [
                  ["SPONTANEOUS_VAGINAL", "Vaginal delivery"],
                  ["CESAREAN", "Caesarean delivery"],
                  ["NOT_APPLICABLE", "Observed, pregnancy continues"],
                ])}
              </Field>
            </>
          )}
          {modal.referral.referralType !== PatientType.MATERNAL && (
            <Field label="Baby's status">
              {select("neonatalStatus", [
                ["STABLE", "Stable or treated"],
                ["PHOTOTHERAPY_INITIATED", "Phototherapy started (TSB responding)"],
                ["NICU_ADMITTED", "Admitted to a level III NICU bed"],
                ["REHYDRATED_STABLE", "Rehydrated, electrolytes normal"],
                ["STABLE_OUTPATIENT", "Discharged to paediatric outpatients"],
              ])}
            </Field>
          )}
          <Field label="What happens next">
            {select("disposition", [
              ["ADMITTED", "Admitted to an inpatient ward"],
              ["DISCHARGED_HOME", "Discharged home (starts the 42-day follow-ups)"],
              ["TRANSFERRED_QUATERNARY", "Transferred to a level IV centre"],
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
