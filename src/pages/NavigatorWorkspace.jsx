import { useState } from "react";
import { Link } from "react-router-dom";
import { FormDialog } from "../components/Dialog.jsx";
import {
  actionsColumn,
  caseIdColumn,
  patientColumn,
  priorityColumn,
  serialColumn,
} from "../components/referralColumns.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import {
  Badge,
  Button,
  DataTable,
  DetailRow,
  Field,
  Input,
  Page,
  PageHeader,
  Select,
  Textarea,
} from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { BARRIER_CATEGORY_LABELS, BarrierCategory, BarrierStatus, ReferralStatus } from "../domain/enums.js";
import { findOpenBarrier, getDestination } from "../domain/workflow.js";

const blankForm = {
  method: "Phone Call",
  outcome: "Successful Contact",
  notes: "",
  category: "TRANSPORT",
  title: "",
  desc: "",
};

const STAGE_BLOCKED = "Blocked by a barrier";
const STAGE_ACTIVE = "Active";

const NavigatorDetail = ({ r }) => (
  <>
    <DetailRow label="Phone">{r.patientPhone || r.caregiverContact}</DetailRow>
    <DetailRow label="Language">
      {r.language || "English"}
      {r.interpreterNeeded && " (interpreter needed)"}
    </DetailRow>
    <DetailRow label="Route">
      {r.fromFacility} → {getDestination(r)}
    </DetailRow>
    <DetailRow label="Case">
      {r.id}, {r.referralType}, {r.status}
    </DetailRow>
    <Button as={Link} to={`/referral/${r.id}`} variant="link" size="flush">
      Open case
    </Button>
  </>
);

const CASELOAD_COLUMNS = [
  serialColumn(),
  caseIdColumn(),
  patientColumn(),
  priorityColumn(),
  {
    id: "stage",
    header: "Stage",
    accessorFn: (r) => (findOpenBarrier(r) ? STAGE_BLOCKED : STAGE_ACTIVE),
    meta: { filter: true, className: "whitespace-nowrap" },
    cell: ({ getValue }) => (getValue() === STAGE_BLOCKED ? <Badge tone="danger">{getValue()}</Badge> : getValue()),
  },
  {
    id: "summary",
    header: "Barrier or route",
    accessorFn: (r) => findOpenBarrier(r)?.title || `${r.fromFacility} → ${getDestination(r)}`,
    meta: { className: "min-w-56 text-ink-muted" },
  },
  {
    id: "language",
    header: "Language",
    accessorFn: (r) => r.language || "English",
    meta: { filter: true },
  },
  actionsColumn(({ row: { original: r }, table }) => (
    <div className="flex justify-end gap-2">
      <Button size="sm" variant="primary" onClick={() => table.options.meta.open("contact", r)}>
        Log contact
      </Button>
      <Button size="sm" onClick={() => table.options.meta.open("barrier", r)}>
        Raise barrier
      </Button>
    </div>
  )),
];

const NavigatorWorkspace = () => {
  const { referrals, recordContactAttempt, identifyBarrier } = useReferrals();
  const [dialog, setDialog] = useState(null); // { type: "contact" | "barrier", referral }
  const [form, setForm] = useState(blankForm);
  const { toast, showToast } = useToast();

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });
  const open = (type, referral) => setDialog({ type, referral });
  // Clears the form, so nothing typed for one patient carries over to the next.
  const closeDialog = () => {
    setDialog(null);
    setForm(blankForm);
  };

  // A floating patient stays on the list: the coordinator is the one calling them about their choice.
  const active = referrals.filter((r) => r.status !== ReferralStatus.COMPLETED);
  // Blocked cases first: they need a call today.
  const rows = [...active.filter(findOpenBarrier), ...active.filter((r) => !findOpenBarrier(r))];

  const handleSaveContact = () => {
    const { referral } = dialog;
    const res = recordContactAttempt(referral.id, {
      method: form.method,
      outcome: form.outcome,
      notes: form.notes,
    });
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
      title: form.title,
      description: form.desc,
      status: BarrierStatus.IDENTIFIED,
    });
    if (res.success) {
      showToast(`Barrier raised for ${referral.patientName}.`);
    } else {
      showToast(`Action failed: ${res.reason}`, "error");
    }
    closeDialog();
  };

  return (
    <Page width="full">
      <Toast toast={toast} />
      <PageHeader title="Caseload" />

      <DataTable
        label="Caseload"
        data={rows}
        columns={CASELOAD_COLUMNS}
        context={{ open }}
        searchPlaceholder="Search name, ID, barrier or hospital"
        emptyText="No active cases."
        noMatchText="No cases match."
        renderDetail={(r) => <NavigatorDetail r={r} />}
      />

      {dialog?.type === "contact" && (
        <FormDialog
          title={`Log contact: ${dialog.referral.patientName}`}
          onCancel={closeDialog}
          onSave={handleSaveContact}
          saveLabel="Save"
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

export default NavigatorWorkspace;
