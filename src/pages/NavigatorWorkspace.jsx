import { useState } from "react";
import CaseCard, { DetailRow } from "../components/CaseCard.jsx";
import { FormDialog } from "../components/Dialog.jsx";
import Toast, { useToast } from "../components/Toast.jsx";
import { Button, EmptyState, Field, Input, Page, PageHeader, Select, Textarea } from "../components/ui/index.js";
import { useReferrals } from "../context/ReferralContext.jsx";
import { BarrierCategory, BarrierStatus, ReferralStatus } from "../domain/enums.js";
import { findOpenBarrier, getDestination } from "../domain/workflow.js";

const blankForm = {
  method: "Phone Call",
  outcome: "Successful Contact",
  notes: "",
  category: "TRANSPORT",
  title: "",
  desc: "",
};

const NavigatorCase = ({ r, onOpen }) => {
  const barrier = findOpenBarrier(r);
  return (
    <CaseCard
      referral={r}
      summary={barrier ? barrier.title : `${r.fromFacility} → ${getDestination(r)}`}
      actions={
        <>
          <Button variant="primary" onClick={() => onOpen("contact", r)}>
            Log contact
          </Button>
          <Button onClick={() => onOpen("barrier", r)}>Raise barrier</Button>
        </>
      }
    >
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
    </CaseCard>
  );
};

const Section = ({ title, cases, onOpen }) =>
  cases.length > 0 && (
    <section className="space-y-4">
      <h2 className="text-sm font-semibold text-ink-muted">
        {title} ({cases.length})
      </h2>
      <ul className="space-y-4">
        {cases.map((r) => (
          <NavigatorCase key={r.id} r={r} onOpen={onOpen} />
        ))}
      </ul>
    </section>
  );

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
  const blocked = active.filter(findOpenBarrier);
  const others = active.filter((r) => !findOpenBarrier(r));

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
    <Page>
      <Toast toast={toast} />
      <PageHeader title="Caseload" />

      <Section title="Blocked by a barrier" cases={blocked} onOpen={open} />
      <Section title="Other active cases" cases={others} onOpen={open} />
      {active.length === 0 && <EmptyState>No active cases.</EmptyState>}

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
              <option value="TRANSPORT">Transport</option>
              <option value="FINANCIAL">Cost</option>
              <option value="DEPENDENT_CARE">Childcare</option>
              <option value="LINGUISTIC">Language</option>
              <option value="WEATHER">Weather or road</option>
              <option value="CLINICAL_HESITATION">Fear of the hospital</option>
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
