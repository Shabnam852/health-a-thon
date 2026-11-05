import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import BarrierTables, { getBlocked, getSolved } from "../components/BarrierTables.jsx";
import { FormDialog } from "../components/Dialog.jsx";
import RecordChoiceDialog from "../components/RecordChoiceDialog.jsx";
import {
  actionsColumn,
  caseIdColumn,
  conditionColumn,
  patientColumn,
  priorityColumn,
  serialColumn,
  statusColumn,
} from "../components/referralColumns.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import {
  Button,
  DataTable,
  DetailRow,
  Field,
  FilterTabs,
  Input,
  Page,
  PageHeader,
  Select,
  Textarea,
} from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import {
  BARRIER_CATEGORY_LABELS,
  BarrierCategory,
  BarrierStatus,
  PatientType,
  ReferralStatus,
  sortByAcuity,
} from "../domain/enums.js";
import { findOpenBarrier, getDestination, hasArrivedAtFacility, isFloating } from "../domain/workflow.js";

/**
 * Every open case in one place: the old Queue (all open referrals), Caseload (calls and barriers)
 * and Barriers screens. The tabs filter the same patients; Blocked and Barriers solved show the
 * barrier tables with their own actions.
 */

// ?show= and not ?view=: switching a tab filters this screen, it isn't a new screen.
const CASE_FILTERS = {
  all: () => true,
  // A mother and baby referred together belong under both.
  maternal: (r) => r.referralType !== PatientType.CHILD,
  neonatal: (r) => r.referralType !== PatientType.MATERNAL,
  // A patient who has already arrived no longer needs a van, whatever the transit record says.
  transport: (r) => !hasArrivedAtFacility(r) && Boolean(r.transit || r.transitBarrier),
  overdue: (r) => r.status === ReferralStatus.SENT,
};
const BARRIER_VIEWS = ["blocked", "solved"];

const blankForm = {
  method: "Phone Call",
  outcome: "Successful Contact",
  notes: "",
  category: "TRANSPORT",
  title: "",
  desc: "",
};

const PatientDetail = ({ r, onRaiseBarrier }) => (
  <>
    <DetailRow label="Phone">{r.patientPhone || r.caregiverContact}</DetailRow>
    <DetailRow label="Language">
      {r.language || "English"}
      {r.interpreterNeeded && " (interpreter needed)"}
    </DetailRow>
    <DetailRow label="Route">
      {r.fromFacility} → {getDestination(r)}
    </DetailRow>
    {findOpenBarrier(r) && <DetailRow label="Barrier">{findOpenBarrier(r).title}</DetailRow>}
    <div className="flex flex-wrap items-center gap-3 pt-1">
      <Button aria-label={`Raise barrier for ${r.patientName}`} size="sm" onClick={onRaiseBarrier}>
        Raise barrier
      </Button>
      <Button as={Link} to={`/referral/${r.id}`} variant="link" size="flush">
        Open case
      </Button>
    </div>
  </>
);

// At most two buttons per row, so the table fits; Raise barrier is in the row's details.
const CASE_COLUMNS = [
  serialColumn(),
  caseIdColumn(),
  patientColumn(),
  priorityColumn(),
  conditionColumn(),
  statusColumn(),
  {
    id: "summary",
    header: "Barrier or hospital",
    // An open barrier is what matters most; without one, where the patient is going.
    accessorFn: (r) => findOpenBarrier(r)?.title || getDestination(r),
    meta: { className: "min-w-48 text-ink-muted" },
    cell: ({ row: { original: r }, getValue }) =>
      findOpenBarrier(r) ? <span className="font-semibold text-danger">{getValue()}</span> : getValue(),
  },
  actionsColumn(({ row: { original: r }, table }) => {
    const { open, onChoose } = table.options.meta;
    return (
      <div className="flex justify-end gap-2">
        {isFloating(r) && (
          <Button
            aria-label={`Record choice for ${r.patientName}`}
            size="sm"
            variant="primary"
            onClick={() => onChoose(r)}
          >
            Record choice
          </Button>
        )}
        <Button
          aria-label={`Log contact for ${r.patientName}`}
          size="sm"
          variant={isFloating(r) ? "secondary" : "primary"}
          onClick={() => open("contact", r)}
        >
          Log contact
        </Button>
      </div>
    );
  }),
];

const Patients = () => {
  const { referrals, recordContactAttempt, identifyBarrier } = useReferrals();
  const [searchParams, setSearchParams] = useSearchParams();
  const [dialog, setDialog] = useState(null); // { type: "contact" | "barrier", referral }
  const [choosingFor, setChoosingFor] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [saveError, setSaveError] = useState("");
  const { toast, showToast, report } = useToast();

  const shown = searchParams.get("show");
  const show = CASE_FILTERS[shown] || BARRIER_VIEWS.includes(shown) ? shown : "all";
  const select = (id) => setSearchParams(id === "all" ? {} : { show: id }, { replace: true });

  // A floating patient stays on the list: the coordinator is the one calling them about their choice.
  const open = useMemo(() => sortByAcuity(referrals.filter((r) => r.status !== ReferralStatus.COMPLETED)), [referrals]);
  const rows = CASE_FILTERS[show] ? open.filter(CASE_FILTERS[show]) : [];
  const blockedCount = getBlocked(referrals).length;

  const tabs = [
    { id: "all", label: "All", count: open.length },
    { id: "maternal", label: "Mothers" },
    { id: "neonatal", label: "Newborns" },
    { id: "transport", label: "Needs transport" },
    { id: "overdue", label: "No reply yet" },
    { id: "blocked", label: "Blocked", count: blockedCount },
    { id: "solved", label: "Barriers solved", count: getSolved(referrals).length },
  ];

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const openDialog = (type, referral) => {
    setSaveError("");
    setDialog({ type, referral });
  };
  // Clears the form, so nothing typed for one patient carries over to the next.
  const closeDialog = () => {
    setDialog(null);
    setForm(blankForm);
    setSaveError("");
  };

  const handleSaveContact = () => {
    const { referral } = dialog;
    const res = recordContactAttempt(referral.id, {
      method: form.method,
      outcome: form.outcome,
      notes: form.notes,
    });
    // Nothing was saved: keep the dialog open with the notes. Once the contact is logged the dialog
    // closes even if the barrier fails, so a second Save cannot log the same contact twice.
    if (!res.success) {
      setSaveError(`Not saved: ${res.reason}`);
      return;
    }
    const needsTransit = res.success && form.outcome === "Transit Barrier Identified";
    const barrierRes = needsTransit
      ? identifyBarrier(referral.id, {
          category: BarrierCategory.TRANSPORT,
          title: "Patient unable to travel",
          description: form.notes,
          status: BarrierStatus.IDENTIFIED,
        })
      : res;
    if (barrierRes.success) {
      showToast(
        needsTransit
          ? `Contact logged and transport barrier raised for ${referral.patientName}.`
          : `Contact logged for ${referral.patientName}.`,
      );
    } else {
      showToast(needsTransit ? `Contact logged. ${barrierRes.reason}` : `Action failed: ${barrierRes.reason}`, "error");
    }
    closeDialog();
  };

  const handleSaveBarrier = () => {
    const { referral } = dialog;
    if (!form.title.trim()) return;
    const res = identifyBarrier(referral.id, {
      category: form.category,
      title: form.title.trim(),
      description: form.desc,
      status: BarrierStatus.IDENTIFIED,
    });
    if (!res.success) {
      setSaveError(`Not saved: ${res.reason}`);
      return;
    }
    showToast(`Barrier raised for ${referral.patientName}.`);
    closeDialog();
  };

  const showTabs = <FilterTabs label="Show" items={tabs} selected={show} onSelect={select} />;

  return (
    <Page width="full">
      <Toast toast={toast} />
      <PageHeader title="Patients" subtitle={`${open.length} open · ${blockedCount} blocked by a barrier`} />

      {BARRIER_VIEWS.includes(show) ? (
        <BarrierTables view={show} onResult={report} tabs={showTabs} />
      ) : (
        <DataTable
          key={show}
          label="Open cases"
          tabs={showTabs}
          data={rows}
          columns={CASE_COLUMNS}
          context={{ open: openDialog, onChoose: setChoosingFor }}
          searchPlaceholder="Search name, ID, condition, barrier or hospital"
          emptyText="No open cases in this view."
          noMatchText="No cases match."
          renderDetail={(r) => <PatientDetail r={r} onRaiseBarrier={() => openDialog("barrier", r)} />}
        />
      )}

      {choosingFor && (
        <RecordChoiceDialog referral={choosingFor} onClose={() => setChoosingFor(null)} onResult={report} />
      )}

      {dialog?.type === "contact" && (
        <FormDialog
          title={`Log contact: ${dialog.referral.patientName}`}
          onCancel={closeDialog}
          onSave={handleSaveContact}
          saveLabel="Save"
          error={saveError}
        >
          <Field label="How">
            <Select value={form.method} onChange={set("method")}>
              <option value="Phone Call">Phone call</option>
              <option value="Bilingual Interpreter Call">Interpreter call</option>
              <option value="Home Visit (CHW)">Home visit</option>
              <option value="SMS Reminder">SMS</option>
            </Select>
          </Field>
          <Field label="Result">
            <Select value={form.outcome} onChange={set("outcome")}>
              <option value="Successful Contact">Spoke with family</option>
              <option value="Voicemail Left">No answer</option>
              <option value="Number Disconnected">Number not working</option>
              <option value="Transit Barrier Identified">Cannot travel, needs transport</option>
            </Select>
          </Field>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={set("notes")} />
          </Field>
        </FormDialog>
      )}

      {dialog?.type === "barrier" && (
        <FormDialog
          title={`Raise barrier: ${dialog.referral.patientName}`}
          onCancel={closeDialog}
          onSave={handleSaveBarrier}
          saveLabel="Save"
          saveDisabled={!form.title.trim()}
          error={saveError}
        >
          <Field label="Type">
            <Select value={form.category} onChange={set("category")}>
              {Object.entries(BARRIER_CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="What is the problem?">
            <Input placeholder="e.g. No safe vehicle" value={form.title} onChange={set("title")} />
          </Field>
          <Field label="Notes">
            <Textarea value={form.desc} onChange={set("desc")} />
          </Field>
        </FormDialog>
      )}
    </Page>
  );
};

export default Patients;
